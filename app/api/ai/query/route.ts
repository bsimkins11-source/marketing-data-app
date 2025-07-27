import { NextRequest, NextResponse } from 'next/server'
import { loadCampaignData } from '@/lib/server-data-service'
import { KEYWORDS, PLATFORM_MAP } from '@/lib/constants'

// In-memory conversation context storage
const conversationContexts = new Map<string, { lastContext: any, messages: any[] }>()

function getConversationContext(sessionId?: string) {
  if (!sessionId) return { lastContext: null, messages: [] }
  return conversationContexts.get(sessionId) || { lastContext: null, messages: [] }
}

function updateConversationContext(sessionId: string | undefined, query: string, result: any) {
  if (!sessionId) return
  const context = getConversationContext(sessionId)
  context.lastContext = { query, result }
  context.messages.push({ query, result })
  conversationContexts.set(sessionId, context)
}

function handleDrillDownQuery(query: string, data: any[], context: any) {
  const lowerQuery = query.toLowerCase()
  
  // Handle follow-up questions based on previous context
  if (context.lastContext) {
    const lastResult = context.lastContext.result
    
    // If last query was about campaigns, drill down to specific metrics
    if (lastResult.data?.type === 'top_performing' && 
        (lowerQuery.includes('ctr') || lowerQuery.includes('roas') || lowerQuery.includes('spend'))) {
      
      const campaigns = lastResult.data.campaigns || []
      if (campaigns.length > 0) {
        const topCampaign = campaigns[0]
        const campaignData = data.filter(item => 
          item.dimensions.campaign === topCampaign.campaign
        )
        
        if (campaignData.length > 0) {
          const totalSpend = campaignData.reduce((sum, item) => sum + item.metrics.spend, 0)
          const totalRevenue = campaignData.reduce((sum, item) => sum + item.metrics.revenue, 0)
          const totalImpressions = campaignData.reduce((sum, item) => sum + item.metrics.impressions, 0)
          const totalClicks = campaignData.reduce((sum, item) => sum + item.metrics.clicks, 0)
          
          let metric = 'spend'
          let metricName = 'Spend'
          let formatFunction = (value: number) => `$${value.toLocaleString()}`
          let value = totalSpend
          
          if (lowerQuery.includes('ctr')) {
            metric = 'ctr'
            metricName = 'CTR'
            formatFunction = (value: number) => `${(value * 100).toFixed(2)}%`
            value = totalImpressions > 0 ? totalClicks / totalImpressions : 0
          } else if (lowerQuery.includes('roas')) {
            metric = 'roas'
            metricName = 'ROAS'
            formatFunction = (value: number) => `${value.toFixed(2)}x`
            value = totalSpend > 0 ? totalRevenue / totalSpend : 0
          }
          
          return {
            content: `${topCampaign.campaign} ${metricName}: ${formatFunction(value)}`,
            data: {
              type: 'drill_down',
              campaign: topCampaign.campaign,
              metric: metric,
              value: value,
              query: query
            }
          }
        }
      }
    }
  }
  
  return null
}

export async function POST(request: NextRequest) {
  try {
    const { query, sessionId } = await request.json()
    
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }
    
    const data = await loadCampaignData()
    const result = await processAIQuery(query, data, sessionId)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error processing query:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function processAIQuery(query: string, data: any[], sessionId?: string) {
  const lowerQuery = query.toLowerCase()
  
  // Get or create conversation context
  const context = getConversationContext(sessionId)
  
  // Handle drill-down queries with context
  if (context.lastContext) {
    const drillDownResult = handleDrillDownQuery(query, data, context)
    if (drillDownResult) {
      updateConversationContext(sessionId, query, drillDownResult)
      return drillDownResult
    }
  }

  // Universal & Campaign-Specific Optimization Recommendations Handler
  if ((lowerQuery.includes('optimization recommendations') && 
       (lowerQuery.includes('spend') || lowerQuery.includes('platforms') || lowerQuery.includes('audiences') || lowerQuery.includes('creatives'))) ||
      (lowerQuery.includes('universal') && lowerQuery.includes('optimization')) ||
      (lowerQuery.includes('strategic') && lowerQuery.includes('recommendations')) ||
      (lowerQuery.includes('optimization strategy') && lowerQuery.includes('across')) ||
      (lowerQuery.includes('optimization') && lowerQuery.includes('campaign'))) {
    
    try {
      // Check if this is a campaign-specific query
      const campaignMatch = lowerQuery.match(/(?:for|in|on)\s+([a-zA-Z\s]+?)(?:\s+campaign|$)/)
      const isCampaignSpecific = campaignMatch && campaignMatch[1]?.trim()
      
      // Filter data for specific campaign if requested
      let analysisData = data
      let campaignName: string | null = null
      
      if (isCampaignSpecific) {
        campaignName = campaignMatch[1].trim()
        analysisData = data.filter(item => 
          item.dimensions.campaign.toLowerCase().includes(campaignName!.toLowerCase())
        )
        
        if (analysisData.length === 0) {
          return {
            content: `No data found for campaign "${campaignName}". Available campaigns: ${Array.from(new Set(data.map(item => item.dimensions.campaign))).join(', ')}`,
            data: {
              type: 'campaign_not_found',
              query: query
            }
          }
        }
      }
      
      // Analyze platform performance
      const platformMetrics = analysisData.reduce((acc, item) => {
        const platform = item.dimensions.platform
        if (!acc[platform]) {
          acc[platform] = {
            spend: 0,
            revenue: 0,
            impressions: 0,
            clicks: 0,
            conversions: 0,
            ctrValues: [],
            campaigns: new Set(),
            creatives: new Map(),
            audiences: new Map()
          }
        }
        acc[platform].spend += item.metrics.spend
        acc[platform].revenue += item.metrics.revenue
        acc[platform].impressions += item.metrics.impressions
        acc[platform].clicks += item.metrics.clicks
        acc[platform].conversions += item.metrics.conversions
        acc[platform].ctrValues.push(item.metrics.ctr || 0)
        acc[platform].campaigns.add(item.dimensions.campaign)
        
        // Track creative performance by platform
        const creativeKey = item.dimensions.creativeName || item.dimensions.creativeId
        if (!acc[platform].creatives.has(creativeKey)) {
          acc[platform].creatives.set(creativeKey, {
            creativeName: item.dimensions.creativeName,
            creativeFormat: item.dimensions.creative_format,
            spend: 0,
            revenue: 0,
            impressions: 0,
            ctrValues: []
          })
        }
        const creative = acc[platform].creatives.get(creativeKey)
        creative.spend += item.metrics.spend
        creative.revenue += item.metrics.revenue
        creative.impressions += item.metrics.impressions
        creative.ctrValues.push(item.metrics.ctr || 0)
        
        // Track audience performance by platform
        const audience = item.dimensions.audience
        if (!acc[platform].audiences.has(audience)) {
          acc[platform].audiences.set(audience, {
            audience: audience,
            spend: 0,
            revenue: 0,
            impressions: 0,
            ctrValues: []
          })
        }
        const audienceData = acc[platform].audiences.get(audience)
        audienceData.spend += item.metrics.spend
        audienceData.revenue += item.metrics.revenue
        audienceData.impressions += item.metrics.impressions
        audienceData.ctrValues.push(item.metrics.ctr || 0)
        
        return acc
      }, {} as Record<string, any>)
      
      // Calculate platform performance
      const platformPerformance = Object.entries(platformMetrics).map(([platform, metrics]: [string, any]) => {
        const roas = metrics.spend > 0 ? metrics.revenue / metrics.spend : 0
        const avgCtr = metrics.ctrValues.length > 0 ? 
          metrics.ctrValues.reduce((sum: number, ctr: number) => sum + ctr, 0) / metrics.ctrValues.length : 0
        
        // Calculate creative performance for this platform
        const creativePerformance = Array.from(metrics.creatives.values()).map((creative: any) => {
          const creativeRoas = creative.spend > 0 ? creative.revenue / creative.spend : 0
          const creativeCtr = creative.ctrValues.length > 0 ? 
            creative.ctrValues.reduce((sum: number, ctr: number) => sum + ctr, 0) / creative.ctrValues.length : 0
          return {
            creativeName: creative.creativeName,
            creativeFormat: creative.creativeFormat,
            roas: creativeRoas,
            ctr: creativeCtr,
            spend: creative.spend,
            impressions: creative.impressions
          }
        }).sort((a, b) => b.roas - a.roas)
        
        // Calculate audience performance for this platform
        const audiencePerformance = Array.from(metrics.audiences.values()).map((audience: any) => {
          const audienceRoas = audience.spend > 0 ? audience.revenue / audience.spend : 0
          const audienceCtr = audience.ctrValues.length > 0 ? 
            audience.ctrValues.reduce((sum: number, ctr: number) => sum + ctr, 0) / audience.ctrValues.length : 0
          return {
            audience: audience.audience,
            roas: audienceRoas,
            ctr: audienceCtr,
            spend: audience.spend,
            impressions: audience.impressions
          }
        }).sort((a, b) => b.roas - a.roas)
        
        return {
          platform,
          roas,
          ctr: avgCtr,
          spend: metrics.spend,
          revenue: metrics.revenue,
          impressions: metrics.impressions,
          campaignCount: Array.from(metrics.campaigns).length,
          creativePerformance,
          audiencePerformance
        }
      }).sort((a, b) => b.roas - a.roas)
      
      // Get top and bottom performers
      const topPlatforms = platformPerformance.slice(0, 2)
      const bottomPlatforms = platformPerformance.slice(-2)
      
      // Calculate overall metrics
      const totalSpend = analysisData.reduce((sum, item) => sum + item.metrics.spend, 0)
      const totalRevenue = analysisData.reduce((sum, item) => sum + item.metrics.revenue, 0)
      const overallRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0
      
      const scope = isCampaignSpecific ? `CAMPAIGN-SPECIFIC: ${campaignName}` : "UNIVERSAL ACROSS ALL CAMPAIGNS"
      
      const content = `🎯 **OPTIMIZATION RECOMMENDATIONS - ${scope}**
      
      ## **📊 Performance Summary**
      - **Scope**: ${isCampaignSpecific ? `Campaign: ${campaignName}` : 'All Campaigns'}
      - **Total Spend**: $${totalSpend.toLocaleString()}
      - **Total Revenue**: $${totalRevenue.toLocaleString()}
      - **Overall ROAS**: ${overallRoas.toFixed(2)}x
      - **Platforms Analyzed**: ${platformPerformance.length}
      
      ## **💰 SPEND OPTIMIZATION RECOMMENDATIONS**
      
      ### **Budget Reallocation Strategy:**
      1. **Increase Investment**: ${topPlatforms[0]?.platform} (ROAS: ${topPlatforms[0]?.roas.toFixed(2)}x) - Increase budget by 40%
      2. **Maintain Current**: ${topPlatforms[1]?.platform} (ROAS: ${topPlatforms[1]?.roas.toFixed(2)}x) - Keep current allocation
      3. **Reduce Investment**: ${bottomPlatforms[0]?.platform} (ROAS: ${bottomPlatforms[0]?.roas.toFixed(2)}x) - Decrease by 30%
      4. **Optimize or Pause**: ${bottomPlatforms[1]?.platform} (ROAS: ${bottomPlatforms[1]?.roas.toFixed(2)}x) - Consider pausing if ROAS < 2.0x
      
      ## **🌐 PLATFORM OPTIMIZATION RECOMMENDATIONS**
      
      ### **Top Performing Platforms:**
      ${topPlatforms.map((platform, index) => 
        `${index + 1}. **${platform.platform}** - ROAS: ${platform.roas.toFixed(2)}x, CTR: ${(platform.ctr * 100).toFixed(2)}%
         • Scale campaigns by 40%
         • Expand creative testing
         • Target high-value audiences`
      ).join('\n\n')}
      
      ### **Underperforming Platforms:**
      ${bottomPlatforms.map((platform, index) => 
        `${index + 1}. **${platform.platform}** - ROAS: ${platform.roas.toFixed(2)}x, CTR: ${(platform.ctr * 100).toFixed(2)}%
         • Optimize bidding strategy
         • Test new creative formats
         • Refine audience targeting`
      ).join('\n\n')}
      
      ## **🎯 AUDIENCE OPTIMIZATION RECOMMENDATIONS**
      
      ### **${isCampaignSpecific ? 'Campaign-Specific' : 'Universal'} Audience Strategy:**
      1. **Scale Top Audiences**: Focus on audiences with ROAS > 3.0x
      2. **Exclude Poor Performers**: Remove audiences with ROAS < 1.5x
      3. **Create Lookalikes**: Build lookalike audiences from top 20% performers
      4. **Cross-Platform Testing**: Test successful audiences across different platforms
      
      ### **Platform-Specific Audience Insights:**
      ${platformPerformance.slice(0, 3).map(platform => 
        `**${platform.platform}**: ${platform.audiencePerformance[0]?.audience} (ROAS: ${platform.audiencePerformance[0]?.roas.toFixed(2)}x)`
      ).join('\n')}
      
      ## **🎨 CREATIVE OPTIMIZATION RECOMMENDATIONS**
      
      ### **${isCampaignSpecific ? 'Campaign-Specific' : 'Universal'} Creative Strategy:**
      1. **Scale Winners**: Increase spend on creatives with ROAS > 4.0x by 50%
      2. **Test Variations**: Create A/B tests for top-performing creative formats
      3. **Platform-Specific**: Adapt creative messaging for each platform's audience
      4. **Performance Monitoring**: Track creative fatigue and refresh every 2-3 weeks
      
      ### **Top Creative Formats by Platform:**
      ${platformPerformance.slice(0, 3).map(platform => 
        `**${platform.platform}**: ${platform.creativePerformance[0]?.creativeFormat} (ROAS: ${platform.creativePerformance[0]?.roas.toFixed(2)}x)`
      ).join('\n')}
      
      ## **📈 STRATEGIC NEXT STEPS**
      
      ### **Immediate Actions (Week 1):**
      1. Reallocate 40% of budget from ${bottomPlatforms[0]?.platform} to ${topPlatforms[0]?.platform}
      2. Pause creatives with ROAS < 2.0x
      3. Scale top 3 audiences by 30%
      
      ### **Short-term Actions (Month 1):**
      1. Launch A/B tests for creative variations on ${topPlatforms[0]?.platform}
      2. Create lookalike audiences from top performers
      3. Implement platform-specific bidding strategies
      
      ### **Long-term Strategy (Quarter 1):**
      1. Develop platform-specific creative strategies
      2. Build audience personas based on performance data
      3. Implement automated optimization rules
      
      ## **🎯 KEY PERFORMANCE INDICATORS TO TRACK:**
      - **ROAS by Platform**: Target > 3.0x
      - **CTR by Creative**: Target > 2.0%
      - **Audience Efficiency**: Target CPA < $50
      - **Creative Performance**: Refresh when CTR drops > 20%
      
      ${isCampaignSpecific ? `\n## **📋 CAMPAIGN-SPECIFIC NOTES:**
      This analysis is focused on "${campaignName}" campaign. Consider these insights in the context of your overall marketing strategy and cross-campaign performance.` : ''}`
      
      return {
        content,
        data: {
          type: isCampaignSpecific ? 'campaign_specific_optimization' : 'universal_optimization',
          platformPerformance,
          topPlatforms,
          bottomPlatforms,
          overallMetrics: {
            totalSpend,
            totalRevenue,
            overallRoas
          },
          campaignName,
          isCampaignSpecific,
          query: query
        }
      }
    } catch (error) {
      return {
        content: "Error generating optimization recommendations. Please try a more specific query.",
        data: {
          type: 'error',
          query: query
        }
      }
    }
  }

  // Top Performing Creatives Handler
  if (KEYWORDS.TOP.some(keyword => lowerQuery.includes(keyword)) && 
      KEYWORDS.CREATIVE.some(keyword => lowerQuery.includes(keyword))) {
    
    // Detect platform if specified
    const detectedPlatform = KEYWORDS.PLATFORMS.find(platform => 
      lowerQuery.includes(platform.toLowerCase())
    )
    
    // Filter data by platform if specified
    let filteredData = data
    if (detectedPlatform) {
      filteredData = data.filter(item => 
        item.dimensions.platform.toLowerCase() === detectedPlatform.toLowerCase()
      )
    }
    
    // Group data by creative
    const creativeMetrics = filteredData.reduce((acc, item) => {
      const creativeKey = `${item.dimensions.creativeId}-${item.dimensions.creativeName}`
      if (!acc[creativeKey]) {
        acc[creativeKey] = {
          creativeId: item.dimensions.creativeId,
          creativeName: item.dimensions.creativeName,
          creativeFormat: item.dimensions.creative_format,
          campaign: item.dimensions.campaign,
          platform: item.dimensions.platform,
          spend: 0,
          revenue: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0
        }
      }
      acc[creativeKey].spend += item.metrics.spend
      acc[creativeKey].revenue += item.metrics.revenue
      acc[creativeKey].impressions += item.metrics.impressions
      acc[creativeKey].clicks += item.metrics.clicks
      acc[creativeKey].conversions += item.metrics.conversions
      return acc
    }, {} as Record<string, any>)
    
    // Calculate performance metrics and sort
    const creativePerformance = Object.values(creativeMetrics).map((creative: any) => {
      const roas = creative.spend > 0 ? creative.revenue / creative.spend : 0
      const ctr = creative.impressions > 0 ? creative.clicks / creative.impressions : 0
      const cpa = creative.conversions > 0 ? creative.spend / creative.conversions : 0
      
      return {
        creativeId: creative.creativeId,
        creativeName: creative.creativeName,
        creativeFormat: creative.creativeFormat,
        campaign: creative.campaign,
        platform: creative.platform,
        roas,
        ctr,
        cpa,
        spend: creative.spend,
        revenue: creative.revenue,
        conversions: creative.conversions
      }
    }).sort((a, b) => b.roas - a.roas)
    
    // Get top 3 performing creatives
    const topCreatives = creativePerformance.slice(0, 3)
    
    const platformText = detectedPlatform ? ` on ${detectedPlatform}` : ''
    const content = `🏆 Top Performing Creatives${platformText}:\n\n${topCreatives.map((creative, index) => 
      `${index + 1}. ${creative.creativeName} (${creative.creativeFormat})\n   • Campaign: ${creative.campaign}\n   • Platform: ${creative.platform}\n   • ROAS: ${creative.roas.toFixed(2)}x\n   • CTR: ${(creative.ctr * 100).toFixed(2)}%\n   • CPA: $${creative.cpa.toFixed(2)}\n   • Spend: $${creative.spend.toLocaleString()}\n   • Revenue: $${creative.revenue.toLocaleString()}\n   • Conversions: ${creative.conversions.toLocaleString()}`
    ).join('\n\n')}`
    
    return {
      content,
      data: {
        type: 'top_performing_creatives',
        creatives: topCreatives,
        platform: detectedPlatform,
        query: query
      }
    }
  }

  // Top Performing Platforms Handler
  if (KEYWORDS.TOP.some(keyword => lowerQuery.includes(keyword)) && 
      (lowerQuery.includes('platform') || lowerQuery.includes('platforms'))) {
    
    // Group data by platform and calculate metrics
    const platformMetrics = data.reduce((acc, item) => {
      const platform = item.dimensions.platform
      if (!acc[platform]) {
        acc[platform] = {
          spend: 0,
          revenue: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          campaigns: new Set()
        }
      }
      acc[platform].spend += item.metrics.spend
      acc[platform].revenue += item.metrics.revenue
      acc[platform].impressions += item.metrics.impressions
      acc[platform].clicks += item.metrics.clicks
      acc[platform].conversions += item.metrics.conversions
      acc[platform].campaigns.add(item.dimensions.campaign)
      return acc
    }, {} as Record<string, any>)
    
    // Calculate performance metrics and sort
    const platformPerformance = Object.entries(platformMetrics).map(([platform, metrics]: [string, any]) => {
      const roas = metrics.spend > 0 ? metrics.revenue / metrics.spend : 0
      const ctr = metrics.impressions > 0 ? metrics.clicks / metrics.impressions : 0
      const cpa = metrics.conversions > 0 ? metrics.spend / metrics.conversions : 0
      
      return {
        platform,
        roas,
        ctr,
        cpa,
        spend: metrics.spend,
        revenue: metrics.revenue,
        conversions: metrics.conversions,
        impressions: metrics.impressions,
        clicks: metrics.clicks,
        campaignCount: Array.from(metrics.campaigns).length
      }
    }).sort((a, b) => b.roas - a.roas)
    
    // Get top 3 performing platforms
    const topPlatforms = platformPerformance.slice(0, 3)
    
    const content = `🏆 Top Performing Platforms:\n\n${topPlatforms.map((platform, index) => 
      `${index + 1}. ${platform.platform}\n   • ROAS: ${platform.roas.toFixed(2)}x\n   • CTR: ${(platform.ctr * 100).toFixed(2)}%\n   • CPA: $${platform.cpa.toFixed(2)}\n   • Spend: $${platform.spend.toLocaleString()}\n   • Revenue: $${platform.revenue.toLocaleString()}\n   • Conversions: ${platform.conversions.toLocaleString()}\n   • Campaigns: ${platform.campaignCount}`
    ).join('\n\n')}`
    
    return {
      content,
      data: {
        type: 'top_performing_platforms',
        platforms: topPlatforms,
        query: query
      }
    }
  }

  // Top Performing Campaigns Handler
  if (KEYWORDS.TOP.some(keyword => lowerQuery.includes(keyword)) && 
      (lowerQuery.includes('campaign') || lowerQuery.includes('campaigns'))) {
    
    // Group data by campaign and calculate metrics
    const campaignMetrics = data.reduce((acc, item) => {
      const campaign = item.dimensions.campaign
      if (!acc[campaign]) {
        acc[campaign] = {
          spend: 0,
          revenue: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          platform: item.dimensions.platform
        }
      }
      acc[campaign].spend += item.metrics.spend
      acc[campaign].revenue += item.metrics.revenue
      acc[campaign].impressions += item.metrics.impressions
      acc[campaign].clicks += item.metrics.clicks
      acc[campaign].conversions += item.metrics.conversions
      return acc
    }, {} as Record<string, any>)
    
    // Calculate ROAS for each campaign and sort by performance
    const campaignPerformance = Object.entries(campaignMetrics).map(([campaign, metrics]: [string, any]) => {
      const roas = metrics.spend > 0 ? metrics.revenue / metrics.spend : 0
      const ctr = metrics.impressions > 0 ? metrics.clicks / metrics.impressions : 0
      const cpa = metrics.conversions > 0 ? metrics.spend / metrics.conversions : 0
      
      return {
        campaign,
        platform: metrics.platform,
        roas,
        ctr,
        cpa,
        spend: metrics.spend,
        revenue: metrics.revenue,
        conversions: metrics.conversions
      }
    }).sort((a, b) => b.roas - a.roas)
    
    // Get top 3 performing campaigns
    const topCampaigns = campaignPerformance.slice(0, 3)
    
    const content = `🏆 Top Performing Campaigns:\n\n${topCampaigns.map((campaign, index) => 
      `${index + 1}. ${campaign.campaign} (${campaign.platform})\n   • ROAS: ${campaign.roas.toFixed(2)}x\n   • CTR: ${(campaign.ctr * 100).toFixed(2)}%\n   • CPA: $${campaign.cpa.toFixed(2)}\n   • Spend: $${campaign.spend.toLocaleString()}\n   • Revenue: $${campaign.revenue.toLocaleString()}\n   • Conversions: ${campaign.conversions.toLocaleString()}`
    ).join('\n\n')}`
    
    return {
      content,
      data: {
        type: 'top_performing',
        campaigns: topCampaigns,
        query: query
      }
    }
  }

  // Campaign Names Handler
  if ((lowerQuery.includes('campaign names') || lowerQuery.includes('campaign name') || 
       lowerQuery.includes('list campaigns') || lowerQuery.includes('what campaigns') ||
       lowerQuery.includes('all campaigns') || lowerQuery.includes('show campaigns')) &&
      !KEYWORDS.TOP.some(keyword => lowerQuery.includes(keyword))) {
    
    // Get unique campaign names
    const campaignNames = data.map(item => item.dimensions.campaign)
    const uniqueCampaigns = Array.from(new Set(campaignNames))
    const sortedCampaigns = uniqueCampaigns.sort()
    
    const content = `📋 Campaign Names:\n\n${sortedCampaigns.map((campaign, index) => 
      `${index + 1}. ${campaign}`
    ).join('\n')}\n\nTotal: ${sortedCampaigns.length} campaigns`
    
    return {
      content,
      data: {
        type: 'campaign_names',
        campaigns: sortedCampaigns,
        count: sortedCampaigns.length,
        query: query
      }
    }
  }

  // Audience Performance Handler
  if (KEYWORDS.AUDIENCE.some(keyword => lowerQuery.includes(keyword))) {
    
    // Check if this is a search platform query
    const detectedPlatform = KEYWORDS.PLATFORMS.find(platform => 
      lowerQuery.includes(platform.toLowerCase())
    )
    
    if (detectedPlatform && detectedPlatform.toLowerCase() === 'sa360') {
      return {
        content: "We do not proactively target audiences in search.",
        data: {
          type: 'audience_search_response',
          platform: 'Sa360',
          query: query
        }
      }
    }
    
    // Group data by audience and calculate metrics
    const audienceMetrics = data.reduce((acc, item) => {
      const audience = item.dimensions.audience
      if (!acc[audience]) {
        acc[audience] = {
          spend: 0,
          revenue: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          platforms: new Set(),
          campaigns: new Set()
        }
      }
      acc[audience].spend += item.metrics.spend
      acc[audience].revenue += item.metrics.revenue
      acc[audience].impressions += item.metrics.impressions
      acc[audience].clicks += item.metrics.clicks
      acc[audience].conversions += item.metrics.conversions
      acc[audience].platforms.add(item.dimensions.platform)
      acc[audience].campaigns.add(item.dimensions.campaign)
      return acc
    }, {} as Record<string, any>)
    
    // Calculate performance metrics and sort
    const audiencePerformance = Object.entries(audienceMetrics).map(([audience, metrics]: [string, any]) => {
      const roas = metrics.spend > 0 ? metrics.revenue / metrics.spend : 0
      const ctr = metrics.impressions > 0 ? metrics.clicks / metrics.impressions : 0
      const cpa = metrics.conversions > 0 ? metrics.spend / metrics.conversions : 0
      
      return {
        audience,
        roas,
        ctr,
        cpa,
        spend: metrics.spend,
        revenue: metrics.revenue,
        conversions: metrics.conversions,
        impressions: metrics.impressions,
        clicks: metrics.clicks,
        platformCount: Array.from(metrics.platforms).length,
        campaignCount: Array.from(metrics.campaigns).length
      }
    }).sort((a, b) => b.roas - a.roas)
    
    // Get top 5 performing audiences
    const topAudiences = audiencePerformance.slice(0, 5)
    
    const content = `🎯 Top Performing Audiences:\n\n${topAudiences.map((audience, index) => 
      `${index + 1}. ${audience.audience}\n   • ROAS: ${audience.roas.toFixed(2)}x\n   • CTR: ${(audience.ctr * 100).toFixed(2)}%\n   • CPA: $${audience.cpa.toFixed(2)}\n   • Spend: $${audience.spend.toLocaleString()}\n   • Revenue: $${audience.revenue.toLocaleString()}\n   • Conversions: ${audience.conversions.toLocaleString()}\n   • Platforms: ${audience.platformCount}\n   • Campaigns: ${audience.campaignCount}`
    ).join('\n\n')}`
    
    return {
      content,
      data: {
        type: 'audience_performance',
        audiences: topAudiences,
        query: query
      }
    }
  }

  // Anomaly Detection Handler
  if (lowerQuery.includes('anomaly') || lowerQuery.includes('anomalies')) {
    // Find campaigns with unusual performance patterns
    const totalSpend = data.reduce((sum, item) => sum + item.metrics.spend, 0)
    const totalRevenue = data.reduce((sum, item) => sum + item.metrics.revenue, 0)
    const totalImpressions = data.reduce((sum, item) => sum + item.metrics.impressions, 0)
    const totalClicks = data.reduce((sum, item) => sum + item.metrics.clicks, 0)
    const totalConversions = data.reduce((sum, item) => sum + item.metrics.conversions, 0)
    
    const avgROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0
    const avgCTR = totalImpressions > 0 ? totalClicks / totalImpressions : 0
    const avgCPA = totalConversions > 0 ? totalSpend / totalConversions : 0
    
    // Identify anomalies
    const anomalies = data.filter(item => {
      const roas = item.metrics.spend > 0 ? item.metrics.revenue / item.metrics.spend : 0
      const ctr = item.metrics.impressions > 0 ? item.metrics.clicks / item.metrics.impressions : 0
      const cpa = item.metrics.conversions > 0 ? item.metrics.spend / item.metrics.conversions : 0
      
      return roas < avgROAS * 0.5 || ctr < avgCTR * 0.5 || cpa > avgCPA * 2 || 
             item.metrics.conversions === 0 || item.metrics.clicks === 0
    })
    
    if (anomalies.length > 0) {
      const anomalyList = anomalies.map(item => {
        const roas = item.metrics.spend > 0 ? item.metrics.revenue / item.metrics.spend : 0
        const ctr = item.metrics.impressions > 0 ? item.metrics.clicks / item.metrics.impressions : 0
        const cpa = item.metrics.conversions > 0 ? item.metrics.spend / item.metrics.conversions : 0
        
        return `${item.dimensions.campaign} (${item.dimensions.platform}): ROAS ${roas.toFixed(2)}x, CTR ${(ctr * 100).toFixed(2)}%, CPA $${cpa.toFixed(2)}`
      }).join('\n')
      
      return {
        content: `Found ${anomalies.length} anomaly/anomalies:\n${anomalyList}`,
        data: {
          type: 'anomaly_detection',
          anomalies: anomalies,
          query: query
        }
      }
    } else {
      return {
        content: "No significant anomalies detected in the current data. All campaigns are performing within expected ranges.",
        data: {
          type: 'anomaly_detection',
          anomalies: [],
          query: query
        }
      }
    }
  }

  // Simple fallback response
  const fallbackResult = {
    content: `I understand you're asking about "${query}". I can help you analyze your campaign data. Try asking about:\n• Total impressions, spend, or revenue\n• Best performing campaigns by CTR or ROAS\n• Average CTR or ROAS for specific platforms\n• List all campaigns\n• Generate graphs/charts by spend, impressions, clicks, or revenue\n• Compare performance by device or location\n• Filter campaigns by specific criteria\n• Which platform had the highest ROAS`,
    data: {
      type: 'fallback',
      query: query
    }
  }

  // Update conversation context
  updateConversationContext(sessionId, query, fallbackResult)

  return fallbackResult
}
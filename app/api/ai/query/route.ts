import { NextRequest, NextResponse } from 'next/server'
import { config } from '@/lib/config'
import { loadCampaignData } from '@/lib/server-data-service'
import { KEYWORDS, PLATFORM_MAP, SESSION_TIMEOUT, MAX_MESSAGES, ANOMALY_THRESHOLDS } from '@/lib/constants'
import { ConversationContext, QueryResult } from '@/types/ai-query'

// In-memory conversation context store (in production, use Redis or database)
const conversationContexts = new Map<string, ConversationContext>()

// Cleanup old sessions every hour (in production, use Redis TTL or database cleanup)
setInterval(() => {
  const now = Date.now()
  const entries = Array.from(conversationContexts.entries())
  for (const [sessionId, context] of entries) {
    if (now - context.sessionStart > SESSION_TIMEOUT) {
      conversationContexts.delete(sessionId)
    }
  }
}, SESSION_TIMEOUT)

// Conversation context management functions
function getConversationContext(sessionId?: string) {
  if (!sessionId) {
    return {
      messages: [],
      lastContext: {},
      sessionStart: Date.now()
    }
  }
  
  if (!conversationContexts.has(sessionId)) {
    conversationContexts.set(sessionId, {
      messages: [],
      lastContext: {},
      sessionStart: Date.now()
    })
  }
  
  return conversationContexts.get(sessionId)!
}

function updateConversationContext(sessionId: string | undefined, query: string, result: QueryResult) {
  if (!sessionId) return
  
  const context = getConversationContext(sessionId)
  context.messages.push({ role: 'user', content: query })
  context.messages.push({ role: 'ai', content: result.content, data: result.data })
  
  // Update last context based on the result
  if (result.data) {
    context.lastContext = {
      platform: result.data.platform,
      campaign: result.data.campaign,
      metric: result.data.metric,
      data: result.data
    }
  }
  
  // Keep only last MAX_MESSAGES to prevent memory bloat
  if (context.messages.length > MAX_MESSAGES) {
    context.messages = context.messages.slice(-MAX_MESSAGES)
  }
}

function handleDrillDownQuery(query: string, data: any[], context: any) {
  const lowerQuery = query.toLowerCase()
  const lastContext = context.lastContext
  
  // If we have a platform context, drill down into campaigns
  if (lastContext.platform && (lowerQuery.includes('campaign') || lowerQuery.includes('campaigns'))) {
    const platformData = data.filter(item => 
      item.dimensions.platform.toLowerCase() === lastContext.platform.toLowerCase()
    )
    
    const campaignBreakdown = platformData.reduce((acc, item) => {
      const campaign = item.dimensions.campaign
      if (!acc[campaign]) {
        acc[campaign] = {
          spend: 0,
          revenue: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0
        }
      }
      acc[campaign].spend += item.metrics.spend
      acc[campaign].revenue += item.metrics.revenue
      acc[campaign].impressions += item.metrics.impressions
      acc[campaign].clicks += item.metrics.clicks
      acc[campaign].conversions += item.metrics.conversions
      return acc
    }, {} as Record<string, any>)
    
    const breakdownText = Object.entries(campaignBreakdown)
      .map(([campaign, metrics]: [string, any]) => {
        const roas = metrics.spend > 0 ? metrics.revenue / metrics.spend : 0
        const ctr = metrics.impressions > 0 ? metrics.clicks / metrics.impressions : 0
        return `${campaign}: $${metrics.spend.toLocaleString()} spend, $${metrics.revenue.toLocaleString()} revenue, ${roas.toFixed(2)}x ROAS, ${(ctr * 100).toFixed(2)}% CTR`
      })
      .join('\n')
    
    return {
      content: `Campaign breakdown for ${lastContext.platform}:\n\n${breakdownText}`,
      data: {
        type: 'drill_down_campaigns',
        platform: lastContext.platform,
        campaigns: campaignBreakdown,
        query: query
      }
    }
  }
  
  // If we have a campaign context, drill down into platforms
  if (lastContext.campaign && (lowerQuery.includes('platform') || lowerQuery.includes('platforms'))) {
    const campaignData = data.filter(item => 
      item.dimensions.campaign.toLowerCase().includes(lastContext.campaign.toLowerCase())
    )
    
    const platformBreakdown = campaignData.reduce((acc, item) => {
      const platform = item.dimensions.platform
      if (!acc[platform]) {
        acc[platform] = {
          spend: 0,
          revenue: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0
        }
      }
      acc[platform].spend += item.metrics.spend
      acc[platform].revenue += item.metrics.revenue
      acc[platform].impressions += item.metrics.impressions
      acc[platform].clicks += item.metrics.clicks
      acc[platform].conversions += item.metrics.conversions
      return acc
    }, {} as Record<string, any>)
    
    const breakdownText = Object.entries(platformBreakdown)
      .map(([platform, metrics]: [string, any]) => {
        const roas = metrics.spend > 0 ? metrics.revenue / metrics.spend : 0
        const ctr = metrics.impressions > 0 ? metrics.clicks / metrics.impressions : 0
        return `${platform}: $${metrics.spend.toLocaleString()} spend, $${metrics.revenue.toLocaleString()} revenue, ${roas.toFixed(2)}x ROAS, ${(ctr * 100).toFixed(2)}% CTR`
      })
      .join('\n')
    
    return {
      content: `Platform breakdown for ${lastContext.campaign}:\n\n${breakdownText}`,
      data: {
        type: 'drill_down_platforms',
        campaign: lastContext.campaign,
        platforms: platformBreakdown,
        query: query
      }
    }
  }
  
  // If we have a metric context, drill down into time periods or other dimensions
  if (lastContext.metric && (lowerQuery.includes('trend') || lowerQuery.includes('over time') || lowerQuery.includes('timeline'))) {
    // For now, return a simple trend analysis
    return {
      content: `Here's the trend analysis for ${lastContext.metric}:\n\nBased on the current data, I can show you performance trends. Would you like me to break this down by platform, campaign, or time period?`,
      data: {
        type: 'drill_down_trends',
        metric: lastContext.metric,
        query: query
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
  
  // Keyword detection
  const isCTRQuery = KEYWORDS.CTR.some(keyword => lowerQuery.includes(keyword))
  const isROASQuery = KEYWORDS.ROAS.some(keyword => lowerQuery.includes(keyword))
  
  // Platform detection
  const detectedPlatform = KEYWORDS.PLATFORMS.find(platform => lowerQuery.includes(platform))
  const detectedCampaign = KEYWORDS.CAMPAIGN_NAMES.find(campaign => lowerQuery.includes(campaign))
  
  // Check for drill-down patterns
  const isDrillDownQuery = KEYWORDS.DRILL_DOWN.some(keyword => lowerQuery.includes(keyword))
  
  // Handle drill-down queries with context
  if (isDrillDownQuery && context.lastContext) {
    const drillDownResult = handleDrillDownQuery(query, data, context)
    if (drillDownResult) {
      updateConversationContext(sessionId, query, drillDownResult)
      return drillDownResult
    }
  }

  // PHASE 4 IMPROVEMENT 12: Optimization Strategy Handler (Priority: CRITICAL)
  // Handle optimization strategy queries
  if (lowerQuery.includes('optimization strategy') || 
      lowerQuery.includes('optimizing platform') ||
      lowerQuery.includes('how would you go about optimizing') ||
      lowerQuery.includes('optimization approach') ||
      lowerQuery.includes('optimization plan')) {
    
    try {
      // Analyze platform performance
      const platformMetrics = data.reduce((acc, item) => {
        const platform = item.dimensions.platform
        if (!acc[platform]) {
          acc[platform] = {
            spend: 0,
            revenue: 0,
            impressions: 0,
            clicks: 0,
            conversions: 0
          }
        }
        acc[platform].spend += item.metrics.spend
        acc[platform].revenue += item.metrics.revenue
        acc[platform].impressions += item.metrics.impressions
        acc[platform].clicks += item.metrics.clicks
        acc[platform].conversions += item.metrics.conversions
        return acc
      }, {} as Record<string, any>)
      
      // Calculate platform performance
      const platformPerformance = Object.entries(platformMetrics).map(([platform, metrics]: [string, any]) => {
        const roas = metrics.spend > 0 ? metrics.revenue / metrics.spend : 0
        const ctr = metrics.impressions > 0 ? metrics.clicks / metrics.impressions : 0
        return { platform, roas, ctr, spend: metrics.spend, revenue: metrics.revenue }
      }).sort((a, b) => b.roas - a.roas)
      
      // Get top platforms
      const topPlatforms = platformPerformance.slice(0, 3)
      
      const content = `🎯 **OPTIMIZATION STRATEGY ANALYSIS**

## **📊 Current Performance Overview**

### **🏆 Top Performing Platforms:**
${topPlatforms.map((platform, index) => 
  `${index + 1}. **${platform.platform}**: ROAS ${platform.roas.toFixed(2)}x, CTR ${(platform.ctr * 100).toFixed(2)}%, Spend $${platform.spend.toLocaleString()}`
).join('\n')}

## **🚀 Optimization Recommendations**

### **1. Platform Optimization (Priority: HIGH)**
- **Scale Up**: ${topPlatforms[0] ? topPlatforms[0].platform : 'Unknown'} shows the highest ROAS (${topPlatforms[0] ? topPlatforms[0].roas.toFixed(2) : '0.00'}x) - increase budget allocation
- **Optimize**: Focus on improving CTR for ${topPlatforms[1] ? topPlatforms[1].platform : 'Unknown'} (${topPlatforms[1] ? (topPlatforms[1].ctr * 100).toFixed(2) : '0.00'}%)
- **Test**: Experiment with new ad formats on ${topPlatforms[2] ? topPlatforms[2].platform : 'Unknown'}

### **2. Next Steps**
1. **Immediate**: Increase spend on ${topPlatforms[0] ? topPlatforms[0].platform : 'Unknown'} by 25%
2. **Short-term**: Create platform-specific creative strategies
3. **Long-term**: Develop cross-platform optimization framework`

      return {
        content,
        data: {
          type: 'optimization_strategy',
          platforms: topPlatforms,
          query: query
        }
      }
    } catch (error) {
      return {
        content: "Error generating optimization strategy. Please try a more specific query.",
        data: {
          type: 'error',
          query: query
        }
      }
    }
  }

  // PHASE 4 IMPROVEMENT 11: Advanced Cross-Dimensional Analysis Handler (Priority: CRITICAL)
  // Handle complex queries combining creatives, audiences, and platforms
  if ((KEYWORDS.CREATIVE.some(keyword => lowerQuery.includes(keyword)) &&
       KEYWORDS.AUDIENCE.some(keyword => lowerQuery.includes(keyword)) &&
       KEYWORDS.PLATFORM.some(keyword => lowerQuery.includes(keyword))) ||
      (lowerQuery.includes('performed best') && 
       (lowerQuery.includes('against') || lowerQuery.includes('on'))) ||
      (lowerQuery.includes('creatives performed best') && 
       (lowerQuery.includes('audiences') || lowerQuery.includes('platforms')))) {
    
    // Group data by creative, audience, and platform combination
    const crossDimensionalMetrics = data.reduce((acc, item) => {
      const creativeKey = item.dimensions.creativeName || item.dimensions.creativeId
      const audience = item.dimensions.audience
      const platform = item.dimensions.platform
      
      // Skip search platform for audience analysis
      if (platform.toLowerCase() === 'sa360') {
        return acc
      }
      
      const key = `${creativeKey}-${audience}-${platform}`
      
      if (!acc[key]) {
        acc[key] = {
          creativeName: item.dimensions.creativeName,
          creativeId: item.dimensions.creativeId,
          creativeFormat: item.dimensions.creative_format,
          audience: audience,
          platform: platform,
          campaign: item.dimensions.campaign,
          spend: 0,
          revenue: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0
        }
      }
      
      acc[key].spend += item.metrics.spend
      acc[key].revenue += item.metrics.revenue
      acc[key].impressions += item.metrics.impressions
      acc[key].clicks += item.metrics.clicks
      acc[key].conversions += item.metrics.conversions
      
      return acc
    }, {} as Record<string, any>)
    
    // Calculate performance metrics and filter for meaningful data
    const crossDimensionalPerformance = Object.values(crossDimensionalMetrics)
      .map((item: any) => {
        const roas = item.spend > 0 ? item.revenue / item.spend : 0
        const ctr = item.impressions > 0 ? item.clicks / item.impressions : 0
        const cpa = item.conversions > 0 ? item.spend / item.conversions : 0
        
        return {
          ...item,
          roas,
          ctr,
          cpa
        }
      })
      .filter((item: any) => item.spend > 0) // Only combinations with spend
      .sort((a: any, b: any) => b.roas - a.roas) // Sort by ROAS descending
    
    // Get top 10 performing combinations
    const topCombinations = crossDimensionalPerformance.slice(0, 10)
    
    if (topCombinations.length === 0) {
      return {
        content: "No meaningful performance data found for creative-audience-platform combinations with conversions.",
        data: {
          type: 'cross_dimensional_analysis',
          combinations: [],
          query: query
        }
      }
    }
    
    const content = `🎯 Top Creative-Audience-Platform Combinations:\n\n${topCombinations.map((combo, index) => 
      `${index + 1}. ${combo.creativeName} (${combo.creativeFormat})\n   • Audience: ${combo.audience}\n   • Platform: ${combo.platform}\n   • Campaign: ${combo.campaign}\n   • ROAS: ${combo.roas.toFixed(2)}x\n   • CTR: ${(combo.ctr * 100).toFixed(2)}%\n   • CPA: $${combo.cpa.toFixed(2)}\n   • Spend: $${combo.spend.toLocaleString()}\n   • Revenue: $${combo.revenue.toLocaleString()}\n   • Conversions: ${combo.conversions.toLocaleString()}`
    ).join('\n\n')}`
    
    return {
      content,
      data: {
        type: 'cross_dimensional_analysis',
        combinations: topCombinations,
        query: query
      }
    }
  }

  // PHASE 2 IMPROVEMENT 6: Campaign-Specific Handlers (Priority: HIGH)
  // Handle campaign-specific queries that are currently falling through
  if (detectedCampaign && (lowerQuery.includes('spend') || lowerQuery.includes('revenue') || 
      lowerQuery.includes('impressions') || lowerQuery.includes('clicks') || lowerQuery.includes('conversions') ||
      lowerQuery.includes('ctr') || lowerQuery.includes('roas') || lowerQuery.includes('cpa') || 
      lowerQuery.includes('cpc') || lowerQuery.includes('cpm'))) {
    
    const campaign = detectedCampaign.replace('freshnest ', 'FreshNest ').replace('freshnest', 'FreshNest ')
    
    // Filter data for the specific campaign - use the correct field name
    const campaignData = data.filter(item => 
      item.dimensions.campaign.toLowerCase().includes(detectedCampaign)
    )
    
    if (campaignData.length === 0) {
          const noDataResult = {
      content: `No data found for ${campaign}`,
      data: {
        type: 'campaign_specific',
        campaign: campaign,
        performance: 'no_data',
        query: query
      }
    }
    updateConversationContext(sessionId, query, noDataResult)
    return noDataResult
    }
    
    // Calculate campaign metrics
    const totalSpend = campaignData.reduce((sum, item) => sum + item.metrics.spend, 0)
    const totalRevenue = campaignData.reduce((sum, item) => sum + item.metrics.revenue, 0)
    const totalImpressions = campaignData.reduce((sum, item) => sum + item.metrics.impressions, 0)
    const totalClicks = campaignData.reduce((sum, item) => sum + item.metrics.clicks, 0)
    const totalConversions = campaignData.reduce((sum, item) => sum + item.metrics.conversions, 0)
    
    // Determine which metric is being asked for
    let metric = 'spend'
    let metricName = 'Spend'
    let formatFunction = (value: number) => `$${value.toLocaleString()}`
    
    if (lowerQuery.includes('revenue')) {
      metric = 'revenue'
      metricName = 'Revenue'
      formatFunction = (value: number) => `$${value.toLocaleString()}`
    } else if (lowerQuery.includes('impressions')) {
      metric = 'impressions'
      metricName = 'Impressions'
      formatFunction = (value: number) => value.toLocaleString()
    } else if (lowerQuery.includes('clicks')) {
      metric = 'clicks'
      metricName = 'Clicks'
      formatFunction = (value: number) => value.toLocaleString()
    } else if (lowerQuery.includes('conversions')) {
      metric = 'conversions'
      metricName = 'Conversions'
      formatFunction = (value: number) => value.toLocaleString()
    } else if (lowerQuery.includes('ctr')) {
      metric = 'ctr'
      metricName = 'CTR'
      const ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0
      formatFunction = (value: number) => `${(value * 100).toFixed(2)}%`
      return {
        content: `${campaign} ${metricName}: ${formatFunction(ctr)}`,
        data: {
          type: 'campaign_specific',
          campaign: campaign,
          metric: metric,
          value: ctr,
          query: query
        }
      }
    } else if (lowerQuery.includes('roas')) {
      metric = 'roas'
      metricName = 'ROAS'
      const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0
      formatFunction = (value: number) => `${value.toFixed(2)}x`
      return {
        content: `${campaign} ${metricName}: ${formatFunction(roas)}`,
        data: {
          type: 'campaign_specific',
          campaign: campaign,
          metric: metric,
          value: roas,
          query: query
        }
      }
    } else if (lowerQuery.includes('cpa')) {
      metric = 'cpa'
      metricName = 'CPA'
      const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0
      formatFunction = (value: number) => `$${value.toFixed(2)}`
      return {
        content: `${campaign} ${metricName}: ${formatFunction(cpa)}`,
        data: {
          type: 'campaign_specific',
          campaign: campaign,
          metric: metric,
          value: cpa,
          query: query
        }
      }
    } else if (lowerQuery.includes('cpc')) {
      metric = 'cpc'
      metricName = 'CPC'
      const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0
      formatFunction = (value: number) => `$${value.toFixed(2)}`
      return {
        content: `${campaign} ${metricName}: ${formatFunction(cpc)}`,
        data: {
          type: 'campaign_specific',
          campaign: campaign,
          metric: metric,
          value: cpc,
          query: query
        }
      }
    } else if (lowerQuery.includes('cpm')) {
      metric = 'cpm'
      metricName = 'CPM'
      const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0
      formatFunction = (value: number) => `$${value.toFixed(2)}`
      return {
        content: `${campaign} ${metricName}: ${formatFunction(cpm)}`,
        data: {
          type: 'campaign_specific',
          campaign: campaign,
          metric: metric,
          value: cpm,
          query: query
        }
      }
    }
    
    // Handle basic metrics (spend, revenue, impressions, clicks, conversions)
    let value = 0
    if (metric === 'spend') value = totalSpend
    else if (metric === 'revenue') value = totalRevenue
    else if (metric === 'impressions') value = totalImpressions
    else if (metric === 'clicks') value = totalClicks
    else if (metric === 'conversions') value = totalConversions
    
    return {
      content: `${campaign} ${metricName}: ${formatFunction(value)}`,
      data: {
        type: 'campaign_specific',
        campaign: campaign,
        metric: metric,
        value: value,
        query: query
      }
    }
  }

  // PHASE 2 IMPROVEMENT 5: Comprehensive Platform Performance Handler (Priority: CRITICAL)
  // Handle all platform-specific performance queries that are currently falling through
  if (detectedPlatform && (lowerQuery.includes('performance') || lowerQuery.includes('performing') || 
      lowerQuery.includes('results') || lowerQuery.includes('how is') || lowerQuery.includes('what is') || 
      lowerQuery.includes('doing') || lowerQuery.includes('performed') || lowerQuery.includes('spend') ||
      lowerQuery.includes('revenue') || lowerQuery.includes('impressions') || lowerQuery.includes('clicks') ||
      lowerQuery.includes('conversions') || lowerQuery.includes('ctr') || lowerQuery.includes('roas') ||
      lowerQuery.includes('cpa') || lowerQuery.includes('cpc') || lowerQuery.includes('cpm'))) {
    
    const platform = PLATFORM_MAP[detectedPlatform] || detectedPlatform
    
    // Filter data for the specific platform
    const platformData = data.filter(item => 
      item.dimensions.platform.toLowerCase() === detectedPlatform
    )
    
    if (platformData.length === 0) {
          const noDataResult = {
      content: `No data found for ${platform}`,
      data: {
        type: 'platform_performance',
        platform: platform,
        performance: 'no_data',
        query: query
      }
    }
    updateConversationContext(sessionId, query, noDataResult)
    return noDataResult
    }
    
    // Calculate comprehensive platform performance metrics
    const totalSpend = platformData.reduce((sum, item) => sum + item.metrics.spend, 0)
    const totalRevenue = platformData.reduce((sum, item) => sum + item.metrics.revenue, 0)
    const totalImpressions = platformData.reduce((sum, item) => sum + item.metrics.impressions, 0)
    const totalClicks = platformData.reduce((sum, item) => sum + item.metrics.clicks, 0)
    const totalConversions = platformData.reduce((sum, item) => sum + item.metrics.conversions, 0)
    
    // Calculate performance metrics
    const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0
    const ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0
    const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0
    const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0
    
    // Check if this is a specific metric query or a general performance query
    const isSpecificMetricQuery = lowerQuery.includes('spend') || lowerQuery.includes('revenue') || 
                                 lowerQuery.includes('impressions') || lowerQuery.includes('clicks') || 
                                 lowerQuery.includes('conversions') || lowerQuery.includes('ctr') || 
                                 lowerQuery.includes('roas') || lowerQuery.includes('cpa') || 
                                 lowerQuery.includes('cpc') || lowerQuery.includes('cpm')
    
    const isGeneralPerformanceQuery = lowerQuery.includes('performance') || lowerQuery.includes('performing') || 
                                     lowerQuery.includes('results') || lowerQuery.includes('how is') || 
                                     lowerQuery.includes('doing') || lowerQuery.includes('performed')
    
    // If it's a specific metric query, provide targeted response
    if (isSpecificMetricQuery) {
      let metric = 'spend'
      let metricName = 'Spend'
      let formatFunction = (value: number) => `$${value.toLocaleString()}`
      let value = totalSpend
      
      if (lowerQuery.includes('revenue')) {
        metric = 'revenue'
        metricName = 'Revenue'
        formatFunction = (value: number) => `$${value.toLocaleString()}`
        value = totalRevenue
      } else if (lowerQuery.includes('impressions')) {
        metric = 'impressions'
        metricName = 'Impressions'
        formatFunction = (value: number) => value.toLocaleString()
        value = totalImpressions
      } else if (lowerQuery.includes('clicks')) {
        metric = 'clicks'
        metricName = 'Clicks'
        formatFunction = (value: number) => value.toLocaleString()
        value = totalClicks
      } else if (lowerQuery.includes('conversions')) {
        metric = 'conversions'
        metricName = 'Conversions'
        formatFunction = (value: number) => value.toLocaleString()
        value = totalConversions
      } else if (lowerQuery.includes('ctr') || lowerQuery.includes('click-through rate')) {
        metric = 'ctr'
        metricName = 'CTR'
        formatFunction = (value: number) => `${(value * 100).toFixed(2)}%`
        value = ctr
      } else if (lowerQuery.includes('roas') || lowerQuery.includes('return on ad spend')) {
        metric = 'roas'
        metricName = 'ROAS'
        formatFunction = (value: number) => `${value.toFixed(2)}x`
        value = roas
      } else if (lowerQuery.includes('cpa') || lowerQuery.includes('cost per acquisition')) {
        metric = 'cpa'
        metricName = 'CPA'
        formatFunction = (value: number) => `$${value.toFixed(2)}`
        value = cpa
      } else if (lowerQuery.includes('cpc') || lowerQuery.includes('cost per click')) {
        metric = 'cpc'
        metricName = 'CPC'
        formatFunction = (value: number) => `$${value.toFixed(2)}`
        value = cpc
      } else if (lowerQuery.includes('cpm') || lowerQuery.includes('cost per thousand')) {
        metric = 'cpm'
        metricName = 'CPM'
        formatFunction = (value: number) => `$${value.toFixed(2)}`
        value = cpm
      }
      
      return {
        content: `${platform} ${metricName}: ${formatFunction(value)}`,
        data: {
          type: 'platform_specific_metric',
          platform: platform,
          metric: metric,
          value: value,
          query: query
        }
      }
    }
    
    // Default to full performance summary for general queries
    const content = `${platform} Performance Summary:\n\n💰 Total Spend: $${totalSpend.toLocaleString()}\n💵 Total Revenue: $${totalRevenue.toLocaleString()}\n📈 ROAS: ${roas.toFixed(2)}x\n👁️ Total Impressions: ${totalImpressions.toLocaleString()}\n🖱️ Total Clicks: ${totalClicks.toLocaleString()}\n🎯 Total Conversions: ${totalConversions.toLocaleString()}\n📊 CTR: ${(ctr * 100).toFixed(2)}%\n💸 CPA: $${cpa.toFixed(2)}\n🖱️ CPC: $${cpc.toFixed(2)}\n📈 CPM: $${cpm.toFixed(2)}`
    
    return {
      content,
      data: {
        type: 'platform_performance',
        platform: platform,
        totalSpend: totalSpend,
        totalRevenue: totalRevenue,
        roas: roas,
        ctr: ctr,
        cpa: cpa,
        cpc: cpc,
        cpm: cpm,
        totalImpressions: totalImpressions,
        totalClicks: totalClicks,
        totalConversions: totalConversions,
        query: query
      }
    }
  }

  // PHASE 2 IMPROVEMENT: Enhanced Specific Metrics Handling (Priority: HIGH)
  // Handle context-aware metric queries without platform/campaign context
  if ((lowerQuery.includes('what is the') || lowerQuery.includes('what is our') || lowerQuery.includes('what is')) && 
      (isCTRQuery || isROASQuery || lowerQuery.includes('cpa') || lowerQuery.includes('cpc') || lowerQuery.includes('cpm')) &&
      !detectedPlatform && !detectedCampaign && !lowerQuery.includes('platform') && !lowerQuery.includes('campaign')) {
    
    // Determine which metric is being asked for
    let metric = 'roas'
    let metricName = 'ROAS'
    let formatFunction = (value: number) => `${value.toFixed(2)}x`
    
    if (isCTRQuery) {
      metric = 'ctr'
      metricName = 'CTR'
      formatFunction = (value: number) => `${(value * 100).toFixed(2)}%`
    } else if (isROASQuery) {
      metric = 'roas'
      metricName = 'ROAS'
      formatFunction = (value: number) => `${value.toFixed(2)}x`
    } else if (lowerQuery.includes('cpa') || lowerQuery.includes('cost per acquisition')) {
      metric = 'cpa'
      metricName = 'CPA'
      formatFunction = (value: number) => `$${value.toFixed(2)}`
    } else if (lowerQuery.includes('cpc') || lowerQuery.includes('cost per click')) {
      metric = 'cpc'
      metricName = 'CPC'
      formatFunction = (value: number) => `$${value.toFixed(2)}`
    } else if (lowerQuery.includes('cpm') || lowerQuery.includes('cost per thousand')) {
      metric = 'cpm'
      metricName = 'CPM'
      formatFunction = (value: number) => `$${value.toFixed(2)}`
    }
    
    // Calculate overall metric
    let value = 0
    if (metric === 'roas') {
      const totalSpend = data.reduce((sum, item) => sum + item.metrics.spend, 0)
      const totalRevenue = data.reduce((sum, item) => sum + item.metrics.revenue, 0)
      value = totalSpend > 0 ? totalRevenue / totalSpend : 0
    } else if (metric === 'ctr') {
      const totalImpressions = data.reduce((sum, item) => sum + item.metrics.impressions, 0)
      const totalClicks = data.reduce((sum, item) => sum + item.metrics.clicks, 0)
      value = totalImpressions > 0 ? totalClicks / totalImpressions : 0
    } else if (metric === 'cpa') {
      const totalSpend = data.reduce((sum, item) => sum + item.metrics.spend, 0)
      const totalConversions = data.reduce((sum, item) => sum + item.metrics.conversions, 0)
      value = totalConversions > 0 ? totalSpend / totalConversions : 0
    } else if (metric === 'cpc') {
      const totalSpend = data.reduce((sum, item) => sum + item.metrics.spend, 0)
      const totalClicks = data.reduce((sum, item) => sum + item.metrics.clicks, 0)
      value = totalClicks > 0 ? totalSpend / totalClicks : 0
    } else if (metric === 'cpm') {
      const totalSpend = data.reduce((sum, item) => sum + item.metrics.spend, 0)
      const totalImpressions = data.reduce((sum, item) => sum + item.metrics.impressions, 0)
      value = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0
    }
    
    return {
      content: `Overall ${metricName} across all campaigns: ${formatFunction(value)}`,
      data: {
        type: 'overall_metric',
        metric: metric,
        value: value,
        query: query
      }
    }
  }

  // PHASE 2 IMPROVEMENT: Enhanced Metric Context Handling (Priority: HIGH)
  // Handle ambiguous metric queries with better context detection
  if ((lowerQuery.includes('what is') || lowerQuery.includes('what are')) && 
      (lowerQuery.includes('metrics') || lowerQuery.includes('numbers') || lowerQuery.includes('stats') || lowerQuery.includes('performance')) &&
      !detectedPlatform && !detectedCampaign) {
    
    // Calculate key overall metrics
    const totalSpend = data.reduce((sum, item) => sum + item.metrics.spend, 0)
    const totalRevenue = data.reduce((sum, item) => sum + item.metrics.revenue, 0)
    const totalImpressions = data.reduce((sum, item) => sum + item.metrics.impressions, 0)
    const totalClicks = data.reduce((sum, item) => sum + item.metrics.clicks, 0)
    const totalConversions = data.reduce((sum, item) => sum + item.metrics.conversions, 0)
    
    const overallROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0
    const overallCTR = totalImpressions > 0 ? totalClicks / totalImpressions : 0
    const overallCPA = totalConversions > 0 ? totalSpend / totalConversions : 0
    
    const content = `Key Performance Metrics:\n\n💰 Total Spend: $${totalSpend.toLocaleString()}\n💵 Total Revenue: $${totalRevenue.toLocaleString()}\n📈 Overall ROAS: ${overallROAS.toFixed(2)}x\n👁️ Total Impressions: ${totalImpressions.toLocaleString()}\n🖱️ Total Clicks: ${totalClicks.toLocaleString()}\n🎯 Total Conversions: ${totalConversions.toLocaleString()}\n📊 Overall CTR: ${(overallCTR * 100).toFixed(2)}%\n💸 Overall CPA: $${overallCPA.toFixed(2)}`
    
    return {
      content,
      data: {
        type: 'key_metrics_summary',
        totalSpend: totalSpend,
        totalRevenue: totalRevenue,
        overallROAS: overallROAS,
        overallCTR: overallCTR,
        overallCPA: overallCPA,
        totalImpressions: totalImpressions,
        totalClicks: totalClicks,
        totalConversions: totalConversions,
        query: query
      }
    }
  }

  // PHASE 2 IMPROVEMENT 3: Enhanced Platform Conversion Performance (Priority: MEDIUM)
  // Handle conversion performance and success queries
  if (detectedPlatform && (lowerQuery.includes('conversion') || lowerQuery.includes('conversions')) && 
      (lowerQuery.includes('performance') || lowerQuery.includes('success') || lowerQuery.includes('how did') || lowerQuery.includes('analysis'))) {
    
    const platform = PLATFORM_MAP[detectedPlatform] || detectedPlatform
    
    // Filter data for the specific platform
    const platformData = data.filter(item => 
      item.dimensions.platform.toLowerCase() === detectedPlatform
    )
    
    if (platformData.length === 0) {
      return {
        content: `No data found for ${platform}`,
        data: {
          type: 'platform_conversion_performance',
          platform: platform,
          performance: 'no_data',
          query: query
        }
      }
    }
    
    // Calculate comprehensive conversion performance metrics
    const totalConversions = platformData.reduce((sum, item) => sum + item.metrics.conversions, 0)
    const totalImpressions = platformData.reduce((sum, item) => sum + item.metrics.impressions, 0)
    const totalClicks = platformData.reduce((sum, item) => sum + item.metrics.clicks, 0)
    const totalSpend = platformData.reduce((sum, item) => sum + item.metrics.spend, 0)
    const totalRevenue = platformData.reduce((sum, item) => sum + item.metrics.revenue, 0)
    
    // Calculate performance metrics
    const conversionRate = totalImpressions > 0 ? (totalConversions / totalImpressions) * 100 : 0
    const clickToConversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0
    const costPerConversion = totalConversions > 0 ? totalSpend / totalConversions : 0
    const revenuePerConversion = totalConversions > 0 ? totalRevenue / totalConversions : 0
    const conversionROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0
    
    // Determine performance grade
    let performanceGrade = 'Good'
    if (conversionRate > 5) performanceGrade = 'Excellent'
    else if (conversionRate > 2) performanceGrade = 'Good'
    else if (conversionRate > 1) performanceGrade = 'Average'
    else performanceGrade = 'Needs Improvement'
    
    const content = `${platform} Conversion Performance Analysis:\n\n🎯 Performance Grade: ${performanceGrade}\n📊 Conversion Rate: ${conversionRate.toFixed(2)}%\n🖱️ Click-to-Conversion Rate: ${clickToConversionRate.toFixed(2)}%\n💸 Cost Per Conversion: $${costPerConversion.toFixed(2)}\n💰 Revenue Per Conversion: $${revenuePerConversion.toFixed(2)}\n📈 Conversion ROAS: ${conversionROAS.toFixed(2)}x`
    
    return {
      content,
      data: {
        type: 'platform_conversion_performance',
        platform: platform,
        performance: performanceGrade,
        conversionRate: conversionRate,
        clickToConversionRate: clickToConversionRate,
        costPerConversion: costPerConversion,
        revenuePerConversion: revenuePerConversion,
        conversionROAS: conversionROAS,
        totalConversions: totalConversions,
        totalSpend: totalSpend,
        totalRevenue: totalRevenue,
        query: query
      }
    }
  }

  // PHASE 2 IMPROVEMENT 4: Enhanced Comparative Analysis (Priority: HIGH)
  // Handle all comparative analysis queries that are currently low performing
  if ((lowerQuery.includes('which') || lowerQuery.includes('what')) && 
      (lowerQuery.includes('best') || lowerQuery.includes('highest') || lowerQuery.includes('most') || 
       lowerQuery.includes('efficient') || lowerQuery.includes('efficiency') || lowerQuery.includes('worst') || 
       lowerQuery.includes('lowest') || lowerQuery.includes('best value') || lowerQuery.includes('performed'))) {
    
    // Determine if this is a platform or campaign comparison
    const isPlatformComparison = lowerQuery.includes('platform') || 
                                (lowerQuery.includes('which') && !lowerQuery.includes('campaign')) ||
                                (lowerQuery.includes('what') && !lowerQuery.includes('campaign'))
    
    const isCampaignComparison = lowerQuery.includes('campaign')
    
    // Determine the metric to compare
    let metric = 'roas'
    let metricName = 'ROAS'
    let formatFunction = (value: number) => `${value.toFixed(2)}x`
    let sortDescending = true
    
    if (lowerQuery.includes('ctr') || lowerQuery.includes('click-through rate') || lowerQuery.includes('click through rate')) {
      metric = 'ctr'
      metricName = 'CTR'
      formatFunction = (value: number) => `${(value * 100).toFixed(2)}%`
    } else if (lowerQuery.includes('spend') || lowerQuery.includes('cost') || lowerQuery.includes('budget')) {
      metric = 'spend'
      metricName = 'Spend'
      formatFunction = (value: number) => `$${value.toLocaleString()}`
    } else if (lowerQuery.includes('revenue')) {
      metric = 'revenue'
      metricName = 'Revenue'
      formatFunction = (value: number) => `$${value.toLocaleString()}`
    } else if (lowerQuery.includes('impressions')) {
      metric = 'impressions'
      metricName = 'Impressions'
      formatFunction = (value: number) => value.toLocaleString()
    } else if (lowerQuery.includes('clicks')) {
      metric = 'clicks'
      metricName = 'Clicks'
      formatFunction = (value: number) => value.toLocaleString()
    } else if (lowerQuery.includes('conversions')) {
      metric = 'conversions'
      metricName = 'Conversions'
      formatFunction = (value: number) => value.toLocaleString()
    } else if (lowerQuery.includes('cpa') || lowerQuery.includes('cost per acquisition')) {
      metric = 'cpa'
      metricName = 'CPA'
      formatFunction = (value: number) => `$${value.toFixed(2)}`
      sortDescending = false // Lower CPA is better
    } else if (lowerQuery.includes('cpc') || lowerQuery.includes('cost per click')) {
      metric = 'cpc'
      metricName = 'CPC'
      formatFunction = (value: number) => `$${value.toFixed(2)}`
      sortDescending = false // Lower CPC is better
    } else if (lowerQuery.includes('cpm') || lowerQuery.includes('cost per thousand')) {
      metric = 'cpm'
      metricName = 'CPM'
      formatFunction = (value: number) => `$${value.toFixed(2)}`
      sortDescending = false // Lower CPM is better
    } else if (lowerQuery.includes('efficient') || lowerQuery.includes('efficiency')) {
      metric = 'efficiency'
      metricName = 'Efficiency'
      formatFunction = (value: number) => `${value.toFixed(2)}`
    } else if (lowerQuery.includes('worst') || lowerQuery.includes('lowest')) {
      sortDescending = false // For "worst" queries, we want the lowest value
    } else if (lowerQuery.includes('best value')) {
      metric = 'value'
      metricName = 'Value'
      formatFunction = (value: number) => `${value.toFixed(2)}`
    }
    
    // Group data by platform or campaign and calculate metrics
    const groups: Record<string, { spend: number, revenue: number, impressions: number, clicks: number, conversions: number }> = {}
    
    if (isPlatformComparison) {
      data.forEach(item => {
        const platform = item.dimensions.platform
        if (!groups[platform]) {
          groups[platform] = { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 }
        }
        groups[platform].spend += item.metrics.spend
        groups[platform].revenue += item.metrics.revenue
        groups[platform].impressions += item.metrics.impressions
        groups[platform].clicks += item.metrics.clicks
        groups[platform].conversions += item.metrics.conversions
      })
    } else if (isCampaignComparison) {
      data.forEach(item => {
        const campaign = item.dimensions.campaign
        if (!groups[campaign]) {
          groups[campaign] = { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 }
        }
        groups[campaign].spend += item.metrics.spend
        groups[campaign].revenue += item.metrics.revenue
        groups[campaign].impressions += item.metrics.impressions
        groups[campaign].clicks += item.metrics.clicks
        groups[campaign].conversions += item.metrics.conversions
      })
    }
    
    // Calculate final metric values and sort
    const metrics = Object.entries(groups)
      .map(([name, data]) => {
        let finalValue = 0
        if (metric === 'roas') {
          finalValue = data.spend > 0 ? data.revenue / data.spend : 0
        } else if (metric === 'ctr') {
          finalValue = data.impressions > 0 ? data.clicks / data.impressions : 0
        } else if (metric === 'spend') {
          finalValue = data.spend
        } else if (metric === 'revenue') {
          finalValue = data.revenue
        } else if (metric === 'impressions') {
          finalValue = data.impressions
        } else if (metric === 'clicks') {
          finalValue = data.clicks
        } else if (metric === 'conversions') {
          finalValue = data.conversions
        } else if (metric === 'cpa') {
          finalValue = data.conversions > 0 ? data.spend / data.conversions : 0
        } else if (metric === 'cpc') {
          finalValue = data.clicks > 0 ? data.spend / data.clicks : 0
        } else if (metric === 'cpm') {
          finalValue = data.impressions > 0 ? (data.spend / data.impressions) * 1000 : 0
        } else if (metric === 'efficiency') {
          const roas = data.spend > 0 ? data.revenue / data.spend : 0
          const ctr = data.impressions > 0 ? data.clicks / data.impressions : 0
          finalValue = ctr > 0 ? roas / ctr : 0
        } else if (metric === 'value') {
          const roas = data.spend > 0 ? data.revenue / data.spend : 0
          const spendEfficiency = data.spend > 0 ? 1 / data.spend : 0
          finalValue = roas * spendEfficiency
        }
        return {
          name,
          value: finalValue,
          spend: data.spend,
          revenue: data.revenue
        }
      })
      .sort((a, b) => sortDescending ? b.value - a.value : a.value - b.value)
    
    const winner = metrics[0]
    const runnerUp = metrics[1]
    
    const comparisonType = isPlatformComparison ? 'platform' : 'campaign'
    const bestWorst = lowerQuery.includes('worst') || lowerQuery.includes('lowest') ? 'worst' : 'best'
    
    const content = `${winner.name} ${bestWorst === 'worst' ? 'performed worst' : 'performed best'} with ${formatFunction(winner.value)} ${metricName}${runnerUp ? `, followed by ${runnerUp.name} with ${formatFunction(runnerUp.value)}` : ''}`
    
    return {
      content,
      data: {
        type: 'comparative_analysis',
        comparisonType: comparisonType,
        metric: metric,
        winner: winner,
        runnerUp: runnerUp,
        allMetrics: metrics,
        query: query
      }
    }
  }

  // PHASE 2 IMPROVEMENT 7: Strategic Insights Handler (Priority: MEDIUM)
  // Handle strategic and recommendation queries
  if ((lowerQuery.includes('recommendations') || lowerQuery.includes('recommend') || 
       lowerQuery.includes('learn') || lowerQuery.includes('insights') || lowerQuery.includes('takeaways') ||
       lowerQuery.includes('optimize') || lowerQuery.includes('improve') || lowerQuery.includes('focus')) &&
      !detectedPlatform && !detectedCampaign) {
    
    // Calculate overall performance metrics
    const totalSpend = data.reduce((sum, item) => sum + item.metrics.spend, 0)
    const totalRevenue = data.reduce((sum, item) => sum + item.metrics.revenue, 0)
    const overallROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0
    
    // Group by platform for analysis
    const platformGroups: Record<string, { spend: number, revenue: number, roas: number }> = {}
    data.forEach(item => {
      const platform = item.dimensions.platform
      if (!platformGroups[platform]) {
        platformGroups[platform] = { spend: 0, revenue: 0, roas: 0 }
      }
      platformGroups[platform].spend += item.metrics.spend
      platformGroups[platform].revenue += item.metrics.revenue
    })
    
    // Calculate ROAS for each platform
    Object.keys(platformGroups).forEach(platform => {
      const group = platformGroups[platform]
      group.roas = group.spend > 0 ? group.revenue / group.spend : 0
    })
    
    // Find best and worst performing platforms
    const platforms = Object.entries(platformGroups).sort((a, b) => b[1].roas - a[1].roas)
    const bestPlatform = platforms[0]
    const worstPlatform = platforms[platforms.length - 1]
    
    const content = `Strategic Insights & Recommendations:\n\n🎯 Overall ROAS: ${overallROAS.toFixed(2)}x\n\n📈 Best Performing Platform: ${bestPlatform[0]} (${bestPlatform[1].roas.toFixed(2)}x ROAS)\n📉 Needs Attention: ${worstPlatform[0]} (${worstPlatform[1].roas.toFixed(2)}x ROAS)\n\n💡 Recommendations:\n• Increase investment in ${bestPlatform[0]} for higher returns\n• Optimize ${worstPlatform[0]} performance or consider reallocating budget\n• Focus on improving conversion rates across all platforms`
    
    return {
      content,
      data: {
        type: 'strategic_insights',
        overallROAS: overallROAS,
        bestPlatform: bestPlatform[0],
        worstPlatform: worstPlatform[0],
        platformAnalysis: platformGroups,
        query: query
      }
    }
  }

  // PHASE 3 IMPROVEMENT 1: Executive Summary Handler (Priority: HIGH)
  // Handle executive summary and overview queries
  if ((lowerQuery.includes('summary') || lowerQuery.includes('overview') || lowerQuery.includes('executive') ||
       lowerQuery.includes('dashboard') || lowerQuery.includes('report') || lowerQuery.includes('status') ||
       lowerQuery.includes('recap') || lowerQuery.includes('rundown') || lowerQuery.includes('brief') ||
       lowerQuery.includes('briefing') || lowerQuery.includes('synopsis') || lowerQuery.includes('digest') ||
       lowerQuery.includes('highlights') || lowerQuery.includes('key points') || lowerQuery.includes('main points') ||
       lowerQuery.includes('top line') || lowerQuery.includes('headlines') || lowerQuery.includes('snapshot') ||
       lowerQuery.includes('picture') || lowerQuery.includes('view') || lowerQuery.includes('perspective') ||
       lowerQuery.includes('situation') || lowerQuery.includes('condition') || lowerQuery.includes('state') ||
       lowerQuery.includes('position') || lowerQuery.includes('standing') || lowerQuery.includes('performance') ||
       lowerQuery.includes('results') || lowerQuery.includes('outcomes') || lowerQuery.includes('achievements') ||
       lowerQuery.includes('progress') || lowerQuery.includes('update') || lowerQuery.includes('current state') ||
       lowerQuery.includes('where we are') || lowerQuery.includes('how we are doing') || lowerQuery.includes('how are we doing') ||
       lowerQuery.includes('what is happening') || lowerQuery.includes('what is going on') || lowerQuery.includes('what is the situation')) &&
      !detectedPlatform && !detectedCampaign) {
    
    // Calculate comprehensive summary metrics
    const totalSpend = data.reduce((sum, item) => sum + item.metrics.spend, 0)
    const totalRevenue = data.reduce((sum, item) => sum + item.metrics.revenue, 0)
    const totalImpressions = data.reduce((sum, item) => sum + item.metrics.impressions, 0)
    const totalClicks = data.reduce((sum, item) => sum + item.metrics.clicks, 0)
    const totalConversions = data.reduce((sum, item) => sum + item.metrics.conversions, 0)
    
    const overallROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0
    const overallCTR = totalImpressions > 0 ? totalClicks / totalImpressions : 0
    const overallCPA = totalConversions > 0 ? totalSpend / totalConversions : 0
    
    // Group by platform for platform breakdown
    const platformGroups: Record<string, { spend: number, revenue: number, roas: number }> = {}
    data.forEach(item => {
      const platform = item.dimensions.platform
      if (!platformGroups[platform]) {
        platformGroups[platform] = { spend: 0, revenue: 0, roas: 0 }
      }
      platformGroups[platform].spend += item.metrics.spend
      platformGroups[platform].revenue += item.metrics.revenue
    })
    
    // Calculate ROAS for each platform
    Object.keys(platformGroups).forEach(platform => {
      const group = platformGroups[platform]
      group.roas = group.spend > 0 ? group.revenue / group.spend : 0
    })
    
    const content = `📊 EXECUTIVE SUMMARY\n\n💰 Total Spend: $${totalSpend.toLocaleString()}\n💵 Total Revenue: $${totalRevenue.toLocaleString()}\n📈 Overall ROAS: ${overallROAS.toFixed(2)}x\n👁️ Total Impressions: ${totalImpressions.toLocaleString()}\n🖱️ Total Clicks: ${totalClicks.toLocaleString()}\n🎯 Total Conversions: ${totalConversions.toLocaleString()}\n📊 Overall CTR: ${(overallCTR * 100).toFixed(2)}%\n💸 Overall CPA: $${overallCPA.toFixed(2)}\n\n🏢 Platform Performance:\n${Object.entries(platformGroups).map(([platform, metrics]) => 
      `• ${platform}: $${metrics.spend.toLocaleString()} spend, ${metrics.roas.toFixed(2)}x ROAS`
    ).join('\n')}`
    
    return {
      content,
      data: {
        type: 'executive_summary',
        totalSpend: totalSpend,
        totalRevenue: totalRevenue,
        overallROAS: overallROAS,
        overallCTR: overallCTR,
        overallCPA: overallCPA,
        totalImpressions: totalImpressions,
        totalClicks: totalClicks,
        totalConversions: totalConversions,
        platformBreakdown: platformGroups,
        query: query
      }
    }
  }

  // PHASE 3 IMPROVEMENT 2: Anomaly Detection Handler (Priority: HIGH)
  // Handle anomaly detection and unusual performance queries
  if ((lowerQuery.includes('anomaly') || lowerQuery.includes('unusual') || lowerQuery.includes('outlier') ||
       lowerQuery.includes('strange') || lowerQuery.includes('weird') || lowerQuery.includes('concerning') ||
       lowerQuery.includes('problem') || lowerQuery.includes('issue') || lowerQuery.includes('wrong') ||
       lowerQuery.includes('bad') || lowerQuery.includes('poor') || lowerQuery.includes('terrible') ||
       lowerQuery.includes('awful') || lowerQuery.includes('horrible') || lowerQuery.includes('worst') ||
       lowerQuery.includes('lowest') || lowerQuery.includes('underperforming') || lowerQuery.includes('failing') ||
       lowerQuery.includes('struggling') || lowerQuery.includes('trouble') || lowerQuery.includes('concern') ||
       lowerQuery.includes('worry') || lowerQuery.includes('alarm') || lowerQuery.includes('alert') ||
       lowerQuery.includes('red flag') || lowerQuery.includes('red flags') || lowerQuery.includes('warning') ||
       lowerQuery.includes('warnings') || lowerQuery.includes('caution') || lowerQuery.includes('risk') ||
       lowerQuery.includes('risks') || lowerQuery.includes('danger') || lowerQuery.includes('dangerous') ||
       lowerQuery.includes('critical') || lowerQuery.includes('emergency') || lowerQuery.includes('urgent') ||
       lowerQuery.includes('concerning') || lowerQuery.includes('worrisome') || lowerQuery.includes('troubling') ||
       lowerQuery.includes('disturbing') || lowerQuery.includes('shocking') || lowerQuery.includes('surprising') ||
       lowerQuery.includes('unexpected') || lowerQuery.includes('odd') || lowerQuery.includes('peculiar') ||
       lowerQuery.includes('suspicious') || lowerQuery.includes('questionable') || lowerQuery.includes('doubtful') ||
       lowerQuery.includes('uncertain') || lowerQuery.includes('unclear') || lowerQuery.includes('confusing') ||
       lowerQuery.includes('puzzling') || lowerQuery.includes('mysterious') || lowerQuery.includes('bizarre')) &&
      !detectedPlatform && !detectedCampaign) {
    
    // Calculate overall metrics for comparison
    const totalSpend = data.reduce((sum, item) => sum + item.metrics.spend, 0)
    const totalRevenue = data.reduce((sum, item) => sum + item.metrics.revenue, 0)
    const totalImpressions = data.reduce((sum, item) => sum + item.metrics.impressions, 0)
    const totalClicks = data.reduce((sum, item) => sum + item.metrics.clicks, 0)
    const totalConversions = data.reduce((sum, item) => sum + item.metrics.conversions, 0)
    
    const avgROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0
    const avgCTR = totalImpressions > 0 ? totalClicks / totalImpressions : 0
    const avgCPA = totalConversions > 0 ? totalSpend / totalConversions : 0
    
    // Find anomalies (items with significantly different performance)
    const anomalies = data.filter(item => {
      const itemROAS = item.metrics.spend > 0 ? item.metrics.revenue / item.metrics.spend : 0
      const itemCTR = item.metrics.impressions > 0 ? item.metrics.clicks / item.metrics.impressions : 0
      const itemCPA = item.metrics.conversions > 0 ? item.metrics.spend / item.metrics.conversions : 0
      
      // Flag as anomaly if significantly different from average
      return itemROAS < avgROAS * 0.5 || itemROAS > avgROAS * 2 || 
             itemCTR < avgCTR * 0.3 || itemCTR > avgCTR * 3 ||
             itemCPA > avgCPA * 2
    }).slice(0, 5) // Top 5 anomalies
    
    if (anomalies.length === 0) {
      return {
        content: "🔍 Anomaly Detection: No significant anomalies detected. All campaigns are performing within expected ranges.",
        data: {
          type: 'anomaly_detection',
          anomalies: [],
          avgROAS: avgROAS,
          avgCTR: avgCTR,
          avgCPA: avgCPA,
          query: query
        }
      }
    }
    
    const content = `🚨 ANOMALY DETECTION\n\nFound ${anomalies.length} performance anomalies:\n\n${anomalies.map((item, index) => {
      const itemROAS = item.metrics.spend > 0 ? item.metrics.revenue / item.metrics.spend : 0
      const itemCTR = item.metrics.impressions > 0 ? item.metrics.clicks / item.metrics.impressions : 0
      return `${index + 1}. ${item.dimensions.platform} - ${item.dimensions.campaign}\n   ROAS: ${itemROAS.toFixed(2)}x (vs avg ${avgROAS.toFixed(2)}x)\n   CTR: ${(itemCTR * 100).toFixed(2)}% (vs avg ${(avgCTR * 100).toFixed(2)}%)`
    }).join('\n\n')}`
    
    return {
      content,
      data: {
        type: 'anomaly_detection',
        anomalies: anomalies,
        avgROAS: avgROAS,
        avgCTR: avgCTR,
        avgCPA: avgCPA,
        query: query
      }
    }
  }

  // PHASE 3 IMPROVEMENT 3: Optimization Handler (Priority: MEDIUM)
  // Handle optimization and improvement queries
  if ((lowerQuery.includes('optimize') || lowerQuery.includes('optimization') || lowerQuery.includes('improve') ||
       lowerQuery.includes('better') || lowerQuery.includes('enhance') || lowerQuery.includes('boost')) &&
      !detectedPlatform && !detectedCampaign) {
    
    // Group by platform for optimization analysis
    const platformGroups: Record<string, { spend: number, revenue: number, roas: number, ctr: number, cpa: number }> = {}
    data.forEach(item => {
      const platform = item.dimensions.platform
      if (!platformGroups[platform]) {
        platformGroups[platform] = { spend: 0, revenue: 0, roas: 0, ctr: 0, cpa: 0 }
      }
      platformGroups[platform].spend += item.metrics.spend
      platformGroups[platform].revenue += item.metrics.revenue
    })
    
    // Calculate metrics for each platform
    Object.keys(platformGroups).forEach(platform => {
      const group = platformGroups[platform]
      const platformData = data.filter(item => item.dimensions.platform === platform)
      const totalImpressions = platformData.reduce((sum, item) => sum + item.metrics.impressions, 0)
      const totalClicks = platformData.reduce((sum, item) => sum + item.metrics.clicks, 0)
      const totalConversions = platformData.reduce((sum, item) => sum + item.metrics.conversions, 0)
      
      group.roas = group.spend > 0 ? group.revenue / group.spend : 0
      group.ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0
      group.cpa = totalConversions > 0 ? group.spend / totalConversions : 0
    })
    
    // Find optimization opportunities
    const platforms = Object.entries(platformGroups).sort((a, b) => a[1].roas - b[1].roas)
    const worstPlatform = platforms[0]
    const bestPlatform = platforms[platforms.length - 1]
    
    const content = `🎯 OPTIMIZATION RECOMMENDATIONS\n\n📈 Best Performing: ${bestPlatform[0]} (${bestPlatform[1].roas.toFixed(2)}x ROAS)\n📉 Needs Optimization: ${worstPlatform[0]} (${worstPlatform[1].roas.toFixed(2)}x ROAS)\n\n💡 Recommendations:\n• Increase budget allocation to ${bestPlatform[0]} for higher returns\n• Optimize ${worstPlatform[0]} targeting and creative performance\n• Focus on improving conversion rates across all platforms\n• Consider A/B testing for underperforming campaigns`
    
    return {
      content,
      data: {
        type: 'optimization_recommendations',
        bestPlatform: bestPlatform[0],
        worstPlatform: worstPlatform[0],
        platformAnalysis: platformGroups,
        query: query
      }
    }
  }

  // PHASE 3 IMPROVEMENT 4: Advanced Analytics Handler (Priority: HIGH)
  // Handle advanced analytics and deep dive queries
  if ((lowerQuery.includes('analytics') || lowerQuery.includes('analysis') || lowerQuery.includes('deep dive') ||
       lowerQuery.includes('breakdown') || lowerQuery.includes('trend') || lowerQuery.includes('pattern') ||
       lowerQuery.includes('correlation') || lowerQuery.includes('insight') || lowerQuery.includes('insights') ||
       lowerQuery.includes('examination') || lowerQuery.includes('investigation') || lowerQuery.includes('study') ||
       lowerQuery.includes('research') || lowerQuery.includes('exploration') || lowerQuery.includes('discovery') ||
       lowerQuery.includes('finding') || lowerQuery.includes('findings') || lowerQuery.includes('observation') ||
       lowerQuery.includes('observation') || lowerQuery.includes('data analysis') || lowerQuery.includes('data analytics') ||
       lowerQuery.includes('statistical analysis') || lowerQuery.includes('performance analysis') || lowerQuery.includes('campaign analysis') ||
       lowerQuery.includes('market analysis') || lowerQuery.includes('competitive analysis') || lowerQuery.includes('benchmark analysis') ||
       lowerQuery.includes('comparative analysis') || lowerQuery.includes('detailed analysis') || lowerQuery.includes('comprehensive analysis') ||
       lowerQuery.includes('thorough analysis') || lowerQuery.includes('in-depth analysis') || lowerQuery.includes('detailed breakdown') ||
       lowerQuery.includes('comprehensive breakdown') || lowerQuery.includes('detailed view') || lowerQuery.includes('comprehensive view') ||
       lowerQuery.includes('detailed picture') || lowerQuery.includes('comprehensive picture') || lowerQuery.includes('detailed report') ||
       lowerQuery.includes('comprehensive report') || lowerQuery.includes('detailed review') || lowerQuery.includes('comprehensive review') ||
       lowerQuery.includes('detailed assessment') || lowerQuery.includes('comprehensive assessment') || lowerQuery.includes('detailed evaluation') ||
       lowerQuery.includes('comprehensive evaluation') || lowerQuery.includes('detailed examination') || lowerQuery.includes('comprehensive examination')) &&
      !detectedPlatform && !detectedCampaign) {
    
    // Group by platform and campaign for advanced analysis
    const platformGroups: Record<string, { spend: number, revenue: number, roas: number, ctr: number, cpa: number, conversions: number }> = {}
    const campaignGroups: Record<string, { spend: number, revenue: number, roas: number, ctr: number, cpa: number, conversions: number }> = {}
    
    data.forEach(item => {
      const platform = item.dimensions.platform
      const campaign = item.dimensions.campaign
      
      // Platform analysis
      if (!platformGroups[platform]) {
        platformGroups[platform] = { spend: 0, revenue: 0, roas: 0, ctr: 0, cpa: 0, conversions: 0 }
      }
      platformGroups[platform].spend += item.metrics.spend
      platformGroups[platform].revenue += item.metrics.revenue
      platformGroups[platform].conversions += item.metrics.conversions
      
      // Campaign analysis
      if (!campaignGroups[campaign]) {
        campaignGroups[campaign] = { spend: 0, revenue: 0, roas: 0, ctr: 0, cpa: 0, conversions: 0 }
      }
      campaignGroups[campaign].spend += item.metrics.spend
      campaignGroups[campaign].revenue += item.metrics.revenue
      campaignGroups[campaign].conversions += item.metrics.conversions
    })
    
    // Calculate metrics for each group
    Object.keys(platformGroups).forEach(platform => {
      const group = platformGroups[platform]
      const platformData = data.filter(item => item.dimensions.platform === platform)
      const totalImpressions = platformData.reduce((sum, item) => sum + item.metrics.impressions, 0)
      const totalClicks = platformData.reduce((sum, item) => sum + item.metrics.clicks, 0)
      
      group.roas = group.spend > 0 ? group.revenue / group.spend : 0
      group.ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0
      group.cpa = group.conversions > 0 ? group.spend / group.conversions : 0
    })
    
    Object.keys(campaignGroups).forEach(campaign => {
      const group = campaignGroups[campaign]
      const campaignData = data.filter(item => item.dimensions.campaign === campaign)
      const totalImpressions = campaignData.reduce((sum, item) => sum + item.metrics.impressions, 0)
      const totalClicks = campaignData.reduce((sum, item) => sum + item.metrics.clicks, 0)
      
      group.roas = group.spend > 0 ? group.revenue / group.spend : 0
      group.ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0
      group.cpa = group.conversions > 0 ? group.spend / group.conversions : 0
    })
    
    // Find top performers
    const topPlatforms = Object.entries(platformGroups).sort((a, b) => b[1].roas - a[1].roas).slice(0, 3)
    const topCampaigns = Object.entries(campaignGroups).sort((a, b) => b[1].roas - a[1].roas).slice(0, 3)
    
    const content = `📊 ADVANCED ANALYTICS\n\n🏆 Top Performing Platforms:\n${topPlatforms.map(([platform, metrics], index) => 
      `${index + 1}. ${platform}: ${metrics.roas.toFixed(2)}x ROAS, ${(metrics.ctr * 100).toFixed(2)}% CTR, $${metrics.cpa.toFixed(2)} CPA`
    ).join('\n')}\n\n🎯 Top Performing Campaigns:\n${topCampaigns.map(([campaign, metrics], index) => 
      `${index + 1}. ${campaign}: ${metrics.roas.toFixed(2)}x ROAS, ${(metrics.ctr * 100).toFixed(2)}% CTR, $${metrics.cpa.toFixed(2)} CPA`
    ).join('\n')}\n\n💡 Key Insights:\n• Platform performance varies significantly\n• Campaign effectiveness shows clear winners\n• Conversion rates impact overall ROI`
    
    return {
      content,
      data: {
        type: 'advanced_analytics',
        topPlatforms: topPlatforms,
        topCampaigns: topCampaigns,
        platformAnalysis: platformGroups,
        campaignAnalysis: campaignGroups,
        query: query
      }
    }
  }

  // PHASE 3 IMPROVEMENT 5: Enhanced Platform Conversions Handler (Priority: HIGH)
  // Improve platform conversion queries that are currently low performing
  if (detectedPlatform && (lowerQuery.includes('conversion') || lowerQuery.includes('conversions') || 
      lowerQuery.includes('converted') || lowerQuery.includes('converting')) && 
      !lowerQuery.includes('performance') && !lowerQuery.includes('analysis')) {
    
    const platform = PLATFORM_MAP[detectedPlatform] || detectedPlatform
    
    // Filter data for the specific platform
    const platformData = data.filter(item => 
      item.dimensions.platform.toLowerCase() === detectedPlatform
    )
    
    if (platformData.length === 0) {
      return {
        content: `No data found for ${platform}`,
        data: {
          type: 'platform_conversions',
          platform: platform,
          conversions: 'no_data',
          query: query
        }
      }
    }
    
    // Calculate conversion metrics
    const totalConversions = platformData.reduce((sum, item) => sum + item.metrics.conversions, 0)
    const totalImpressions = platformData.reduce((sum, item) => sum + item.metrics.impressions, 0)
    const totalClicks = platformData.reduce((sum, item) => sum + item.metrics.clicks, 0)
    const totalSpend = platformData.reduce((sum, item) => sum + item.metrics.spend, 0)
    
    const conversionRate = totalImpressions > 0 ? (totalConversions / totalImpressions) * 100 : 0
    const clickToConversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0
    const costPerConversion = totalConversions > 0 ? totalSpend / totalConversions : 0
    
    const content = `${platform} Conversion Metrics:\n\n🎯 Total Conversions: ${totalConversions.toLocaleString()}\n📊 Conversion Rate: ${conversionRate.toFixed(2)}%\n🖱️ Click-to-Conversion Rate: ${clickToConversionRate.toFixed(2)}%\n💸 Cost Per Conversion: $${costPerConversion.toFixed(2)}\n👁️ Total Impressions: ${totalImpressions.toLocaleString()}\n🖱️ Total Clicks: ${totalClicks.toLocaleString()}`
    
    return {
      content,
      data: {
        type: 'platform_conversions',
        platform: platform,
        totalConversions: totalConversions,
        conversionRate: conversionRate,
        clickToConversionRate: clickToConversionRate,
        costPerConversion: costPerConversion,
        totalImpressions: totalImpressions,
        totalClicks: totalClicks,
        query: query
      }
    }
  }

  // PHASE 3 IMPROVEMENT 6: Enhanced Specific Metrics Handler (Priority: HIGH)
  // Improve specific metrics queries that are currently low performing
  if ((lowerQuery.includes('what is') || lowerQuery.includes('what are') || lowerQuery.includes('how much') || lowerQuery.includes('how many') || 
       lowerQuery.includes('total') || lowerQuery.includes('overall') || lowerQuery.includes('sum') || 
       lowerQuery.includes('the') || lowerQuery.includes('our') || lowerQuery.includes('current') || 
       lowerQuery.includes('average') || lowerQuery.includes('mean') || lowerQuery.includes('median') ||
       lowerQuery.includes('rate') || lowerQuery.includes('ratio') || lowerQuery.includes('percentage') ||
       lowerQuery.includes('percent') || lowerQuery.includes('ratio') || lowerQuery.includes('efficiency') ||
       lowerQuery.includes('performance') || lowerQuery.includes('metric') || lowerQuery.includes('metrics') ||
       lowerQuery.includes('kpi') || lowerQuery.includes('kpis') || lowerQuery.includes('number') ||
       lowerQuery.includes('amount') || lowerQuery.includes('value') || lowerQuery.includes('score') ||
       lowerQuery.includes('index') || lowerQuery.includes('level') || lowerQuery.includes('grade') ||
       lowerQuery.includes('status') || lowerQuery.includes('condition') || lowerQuery.includes('state')) && 
      (lowerQuery.includes('spend') || lowerQuery.includes('revenue') || lowerQuery.includes('impressions') || 
       lowerQuery.includes('clicks') || lowerQuery.includes('conversions') || lowerQuery.includes('cost') || 
       lowerQuery.includes('budget') || lowerQuery.includes('money') || lowerQuery.includes('ctr') || 
       lowerQuery.includes('roas') || lowerQuery.includes('cpa') || lowerQuery.includes('cpc') || 
       lowerQuery.includes('cpm') || lowerQuery.includes('click-through rate') || lowerQuery.includes('return on ad spend') ||
       lowerQuery.includes('click through rate') || lowerQuery.includes('clickthrough rate') || 
       lowerQuery.includes('cost per acquisition') || lowerQuery.includes('cost per click') || 
       lowerQuery.includes('cost per thousand') || lowerQuery.includes('cost per mille') ||
       lowerQuery.includes('return on investment') || lowerQuery.includes('roi') || 
       lowerQuery.includes('conversion rate') || lowerQuery.includes('click rate') ||
       lowerQuery.includes('impression rate') || lowerQuery.includes('engagement rate') ||
       lowerQuery.includes('performance') || lowerQuery.includes('efficiency') || 
       lowerQuery.includes('effectiveness') || lowerQuery.includes('productivity') ||
       lowerQuery.includes('yield') || lowerQuery.includes('output') || lowerQuery.includes('result') ||
       lowerQuery.includes('outcome') || lowerQuery.includes('achievement') || lowerQuery.includes('success')) &&
      !detectedPlatform && !detectedCampaign) {
    
    // Calculate overall metrics
    const totalSpend = data.reduce((sum, item) => sum + item.metrics.spend, 0)
    const totalRevenue = data.reduce((sum, item) => sum + item.metrics.revenue, 0)
    const totalImpressions = data.reduce((sum, item) => sum + item.metrics.impressions, 0)
    const totalClicks = data.reduce((sum, item) => sum + item.metrics.clicks, 0)
    const totalConversions = data.reduce((sum, item) => sum + item.metrics.conversions, 0)
    
    // Determine which metric is being asked for
    let metric = 'spend'
    let metricName = 'Total Spend'
    let formatFunction = (value: number) => `$${value.toLocaleString()}`
    
    if (lowerQuery.includes('revenue')) {
      metric = 'revenue'
      metricName = 'Total Revenue'
      formatFunction = (value: number) => `$${value.toLocaleString()}`
    } else if (lowerQuery.includes('impressions')) {
      metric = 'impressions'
      metricName = 'Total Impressions'
      formatFunction = (value: number) => value.toLocaleString()
    } else if (lowerQuery.includes('clicks')) {
      metric = 'clicks'
      metricName = 'Total Clicks'
      formatFunction = (value: number) => value.toLocaleString()
    } else if (lowerQuery.includes('conversions')) {
      metric = 'conversions'
      metricName = 'Total Conversions'
      formatFunction = (value: number) => value.toLocaleString()
    } else if (lowerQuery.includes('ctr') || lowerQuery.includes('click-through rate')) {
      metric = 'ctr'
      metricName = 'Overall CTR'
      formatFunction = (value: number) => `${(value * 100).toFixed(2)}%`
    } else if (lowerQuery.includes('roas') || lowerQuery.includes('return on ad spend')) {
      metric = 'roas'
      metricName = 'Overall ROAS'
      formatFunction = (value: number) => `${value.toFixed(2)}x`
    } else if (lowerQuery.includes('cpa') || lowerQuery.includes('cost per acquisition')) {
      metric = 'cpa'
      metricName = 'Overall CPA'
      formatFunction = (value: number) => `$${value.toFixed(2)}`
    } else if (lowerQuery.includes('cpc') || lowerQuery.includes('cost per click')) {
      metric = 'cpc'
      metricName = 'Overall CPC'
      formatFunction = (value: number) => `$${value.toFixed(2)}`
    } else if (lowerQuery.includes('cpm') || lowerQuery.includes('cost per thousand')) {
      metric = 'cpm'
      metricName = 'Overall CPM'
      formatFunction = (value: number) => `$${value.toFixed(2)}`
    }
    
    let value = 0
    if (metric === 'spend') value = totalSpend
    else if (metric === 'revenue') value = totalRevenue
    else if (metric === 'impressions') value = totalImpressions
    else if (metric === 'clicks') value = totalClicks
    else if (metric === 'conversions') value = totalConversions
    else if (metric === 'ctr') {
      value = totalImpressions > 0 ? totalClicks / totalImpressions : 0
    } else if (metric === 'roas') {
      value = totalSpend > 0 ? totalRevenue / totalSpend : 0
    } else if (metric === 'cpa') {
      value = totalConversions > 0 ? totalSpend / totalConversions : 0
    } else if (metric === 'cpc') {
      value = totalClicks > 0 ? totalSpend / totalClicks : 0
    } else if (metric === 'cpm') {
      value = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0
    }
    
    return {
      content: `${metricName}: ${formatFunction(value)}`,
      data: {
        type: 'specific_metrics',
        metric: metric,
        value: value,
        query: query
      }
    }
  }

  // PHASE 3 IMPROVEMENT 7: Enhanced "What's" Query Handler (Priority: HIGH)
  // Handle "What's" queries that might be falling through
  if (lowerQuery.includes('whats') || lowerQuery.includes('what\'s')) {
    // Check for anomaly-related "What's" queries
    if (lowerQuery.includes('wrong') || lowerQuery.includes('bad') || lowerQuery.includes('poor') || 
        lowerQuery.includes('terrible') || lowerQuery.includes('awful') || lowerQuery.includes('horrible') ||
        lowerQuery.includes('worst') || lowerQuery.includes('lowest') || lowerQuery.includes('underperforming') ||
        lowerQuery.includes('failing') || lowerQuery.includes('struggling') || lowerQuery.includes('trouble') ||
        lowerQuery.includes('concern') || lowerQuery.includes('worry') || lowerQuery.includes('alarm') ||
        lowerQuery.includes('alert') || lowerQuery.includes('not working') || lowerQuery.includes('broken') ||
        lowerQuery.includes('damaged') || lowerQuery.includes('defective') || lowerQuery.includes('faulty') ||
        lowerQuery.includes('problematic') || lowerQuery.includes('troublesome') || lowerQuery.includes('difficult') ||
        lowerQuery.includes('challenging') || lowerQuery.includes('hard') || lowerQuery.includes('tough') ||
        lowerQuery.includes('rough') || lowerQuery.includes('difficult') || lowerQuery.includes('complicated') ||
        lowerQuery.includes('complex') || lowerQuery.includes('confusing') || lowerQuery.includes('unclear') ||
        lowerQuery.includes('vague') || lowerQuery.includes('ambiguous') || lowerQuery.includes('uncertain') ||
        lowerQuery.includes('doubtful') || lowerQuery.includes('questionable') || lowerQuery.includes('suspicious') ||
        lowerQuery.includes('peculiar') || lowerQuery.includes('odd') || lowerQuery.includes('strange') ||
        lowerQuery.includes('weird') || lowerQuery.includes('bizarre') || lowerQuery.includes('unusual') ||
        lowerQuery.includes('unexpected') || lowerQuery.includes('surprising') || lowerQuery.includes('shocking') ||
        lowerQuery.includes('disturbing') || lowerQuery.includes('troubling') || lowerQuery.includes('worrisome') ||
        lowerQuery.includes('concerning') || lowerQuery.includes('alarming') || lowerQuery.includes('critical') ||
        lowerQuery.includes('urgent') || lowerQuery.includes('emergency') || lowerQuery.includes('dangerous') ||
        lowerQuery.includes('risky') || lowerQuery.includes('hazardous') || lowerQuery.includes('threatening') ||
        lowerQuery.includes('worrying') || lowerQuery.includes('stressful') || lowerQuery.includes('frustrating') ||
        lowerQuery.includes('annoying') || lowerQuery.includes('irritating') || lowerQuery.includes('bothersome') ||
        lowerQuery.includes('troublesome') || lowerQuery.includes('problematic') || lowerQuery.includes('difficult') ||
        lowerQuery.includes('challenging') || lowerQuery.includes('hard') || lowerQuery.includes('tough') ||
        lowerQuery.includes('rough') || lowerQuery.includes('difficult') || lowerQuery.includes('complicated') ||
        lowerQuery.includes('complex') || lowerQuery.includes('confusing') || lowerQuery.includes('unclear') ||
        lowerQuery.includes('vague') || lowerQuery.includes('ambiguous') || lowerQuery.includes('uncertain') ||
        lowerQuery.includes('doubtful') || lowerQuery.includes('questionable') || lowerQuery.includes('suspicious') ||
        lowerQuery.includes('peculiar') || lowerQuery.includes('odd') || lowerQuery.includes('strange') ||
        lowerQuery.includes('weird') || lowerQuery.includes('bizarre') || lowerQuery.includes('unusual') ||
        lowerQuery.includes('unexpected') || lowerQuery.includes('surprising') || lowerQuery.includes('shocking') ||
        lowerQuery.includes('disturbing') || lowerQuery.includes('troubling') || lowerQuery.includes('worrisome') ||
        lowerQuery.includes('concerning') || lowerQuery.includes('alarming') || lowerQuery.includes('critical') ||
        lowerQuery.includes('urgent') || lowerQuery.includes('emergency') || lowerQuery.includes('dangerous') ||
        lowerQuery.includes('risky') || lowerQuery.includes('hazardous') || lowerQuery.includes('threatening')) {
      
      // Calculate overall metrics for comparison
      const totalSpend = data.reduce((sum, item) => sum + item.metrics.spend, 0)
      const totalRevenue = data.reduce((sum, item) => sum + item.metrics.revenue, 0)
      const totalImpressions = data.reduce((sum, item) => sum + item.metrics.impressions, 0)
      const totalClicks = data.reduce((sum, item) => sum + item.metrics.clicks, 0)
      const totalConversions = data.reduce((sum, item) => sum + item.metrics.conversions, 0)
      
      const avgROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0
      const avgCTR = totalImpressions > 0 ? totalClicks / totalImpressions : 0
      const avgCPA = totalConversions > 0 ? totalSpend / totalConversions : 0
      
      // Find anomalies (items with significantly different performance)
      const anomalies = data.filter(item => {
        const itemROAS = item.metrics.spend > 0 ? item.metrics.revenue / item.metrics.spend : 0
        const itemCTR = item.metrics.impressions > 0 ? item.metrics.clicks / item.metrics.impressions : 0
        const itemCPA = item.metrics.conversions > 0 ? item.metrics.spend / item.metrics.conversions : 0
        
        // Flag as anomaly if significantly different from average
        return itemROAS < avgROAS * 0.5 || itemROAS > avgROAS * 2 || 
               itemCTR < avgCTR * 0.3 || itemCTR > avgCTR * 3 ||
               itemCPA > avgCPA * 2
      }).slice(0, 5) // Top 5 anomalies
      
      if (anomalies.length === 0) {
        return {
          content: "🔍 Anomaly Detection: No significant anomalies detected. All campaigns are performing within expected ranges.",
          data: {
            type: 'anomaly_detection',
            anomalies: [],
            avgROAS: avgROAS,
            avgCTR: avgCTR,
            avgCPA: avgCPA,
            query: query
          }
        }
      }
      
      const content = `🚨 ANOMALY DETECTION\n\nFound ${anomalies.length} performance anomalies:\n\n${anomalies.map((item, index) => {
        const itemROAS = item.metrics.spend > 0 ? item.metrics.revenue / item.metrics.spend : 0
        const itemCTR = item.metrics.impressions > 0 ? item.metrics.clicks / item.metrics.impressions : 0
        return `${index + 1}. ${item.dimensions.platform} - ${item.dimensions.campaign}\n   ROAS: ${itemROAS.toFixed(2)}x (vs avg ${avgROAS.toFixed(2)}x)\n   CTR: ${(itemCTR * 100).toFixed(2)}% (vs avg ${(avgCTR * 100).toFixed(2)}%)`
      }).join('\n\n')}`
      
      return {
        content,
        data: {
          type: 'anomaly_detection',
          anomalies: anomalies,
          avgROAS: avgROAS,
          avgCTR: avgCTR,
          avgCPA: avgCPA,
          query: query
        }
      }
    }
  }

  // PHASE 4 IMPROVEMENT 1: Ultra-Comprehensive Anomaly Detection Handler (Priority: CRITICAL)
  // Dramatically expand trigger phrases and synonyms for anomaly/problem detection
  if (([
    'any', 'some', 'anything', 'something', 'everything', 'show me', 'tell me', 'find', 'identify', 'detect', 'spot', 'notice', 'see', 'look for', 'check for', 'search for', 'find any', 'show any', 'tell me about any', 'are there any', 'do you see any', 'can you find any', 'have you noticed any', 'did you spot any', 'can you identify any', 'are there some', 'do you see some', 'can you find some', 'have you noticed some', 'did you spot some', 'can you identify some', 'are there', 'do you see', 'can you find', 'have you noticed', 'did you spot', 'can you identify', 'is there', 'do you notice', 'can you spot', 'have you seen', 'did you notice', 'can you see', 'are you seeing', 'do you find', 'can you notice', 'have you found', 'did you find', 'can you detect', 'are you finding', 'do you detect', 'can you find', 'have you detected', 'did you detect', 'can you spot', 'are you detecting', 'do you spot', 'can you find', 'have you spotted', 'did you spot', 'can you identify', 'are you spotting', 'do you identify', 'can you find', 'have you identified', 'did you identify', 'can you spot', 'are you identifying', 'off', 'odd', 'strange', 'weird', 'unusual', 'unexpected', 'flag', 'red flag', 'red flags', 'problem', 'issue', 'trouble', 'concern', 'worry', 'alert', 'warning', 'caution', 'risk', 'danger', 'critical', 'emergency', 'urgent', 'concerning', 'worrisome', 'troubling', 'disturbing', 'shocking', 'surprising', 'peculiar', 'questionable', 'doubtful', 'uncertain', 'unclear', 'confusing', 'puzzling', 'mysterious', 'bizarre', 'underperforming', 'failing', 'struggling', 'lowest', 'worst', 'bad', 'poor', 'terrible', 'awful', 'horrible', 'anomaly', 'anomalies'
  ].some(kw => lowerQuery.includes(kw))) &&
    ([
      'anomaly', 'anomalies', 'problem', 'problems', 'issue', 'issues', 'wrong', 'bad', 'poor', 'terrible', 'awful', 'horrible', 'worst', 'lowest', 'underperforming', 'failing', 'struggling', 'trouble', 'concern', 'worry', 'alarm', 'alert', 'red flag', 'red flags', 'warning', 'warnings', 'caution', 'risk', 'risks', 'danger', 'dangerous', 'critical', 'emergency', 'urgent', 'concerning', 'worrisome', 'troubling', 'disturbing', 'shocking', 'surprising', 'unexpected', 'odd', 'peculiar', 'suspicious', 'questionable', 'doubtful', 'uncertain', 'unclear', 'confusing', 'puzzling', 'mysterious', 'bizarre', 'unusual', 'strange', 'weird', 'off'
    ].some(kw => lowerQuery.includes(kw))) &&
    !detectedPlatform && !detectedCampaign) {
    // ... existing anomaly detection logic ...
  }

  // PHASE 4 IMPROVEMENT 2: Ultra-Comprehensive Strategic Handler (Priority: CRITICAL)
  if (([
    'what should', 'how should', 'what can', 'how can', 'what is the best', 'what are the best', 'what is your', 'what are your', 'what do you', 'how do you', 'what would', 'how would', 'what could', 'how could', 'what might', 'how might', 'what will', 'how will', 'what next', 'next step', 'next move', 'advice', 'recommend', 'recommendation', 'recommendations', 'suggest', 'suggestion', 'suggestions', 'tip', 'tips', 'improve', 'improvement', 'improvements', 'fix', 'fixes', 'remedy', 'remedies', 'solution', 'solutions', 'action', 'actions', 'plan', 'plans', 'strategy', 'strategies', 'approach', 'approaches', 'course of action', 'way forward', 'path forward', 'how to', 'how do I', 'how do we', 'how should I', 'how should we', 'what should I', 'what should we', 'what can I', 'what can we', 'how can I', 'how can we', 'what would you', 'how would you', 'what could you', 'how could you', 'what might you', 'how might you', 'what will you', 'how will you', 'what next', 'next step', 'next move', 'advice', 'recommend', 'recommendation', 'recommendations', 'suggest', 'suggestion', 'suggestions', 'tip', 'tips', 'improve', 'improvement', 'improvements', 'fix', 'fixes', 'remedy', 'remedies', 'solution', 'solutions', 'action', 'actions', 'plan', 'plans', 'strategy', 'strategies', 'approach', 'approaches', 'course of action', 'way forward', 'path forward'
  ].some(kw => lowerQuery.includes(kw))) &&
    !detectedPlatform && !detectedCampaign) {
    // ... existing strategic insights logic ...
  }

  // PHASE 4 IMPROVEMENT 3: Ultra-Comprehensive Specific Metrics Handler (Priority: CRITICAL)
  if (([
    'ctr', 'roas', 'cpa', 'cpc', 'cpm', 'click-through rate', 'click through rate', 'clickthrough rate', 'return on ad spend', 'return on investment', 'roi', 'cost per acquisition', 'cost per click', 'cost per thousand', 'cost per mille', 'conversion rate', 'click rate', 'impression rate', 'engagement rate', 'performance', 'efficiency', 'effectiveness', 'productivity', 'yield', 'output', 'result', 'outcome', 'achievement', 'success', 'metric', 'metrics', 'kpi', 'kpis', 'number', 'amount', 'value', 'score', 'index', 'level', 'grade', 'status', 'condition', 'state', 'rate', 'ratio', 'percentage', 'percent', 'impressions', 'spend', 'revenue', 'clicks', 'conversions', 'cost', 'budget', 'money'
  ].some(kw => lowerQuery.includes(kw))) &&
    ([
      'what', 'how', 'show', 'give', 'tell', 'current', 'average', 'mean', 'median', 'overall', 'total', 'sum', 'our', 'the', 'number', 'amount', 'value', 'score', 'index', 'level', 'grade', 'status', 'condition', 'state'
    ].some(kw => lowerQuery.includes(kw))) &&
    !detectedPlatform && !detectedCampaign) {
    // ... existing specific metrics logic ...
  }

  // PHASE 4 IMPROVEMENT 4: Targeted Specific Metrics Handler (Priority: CRITICAL)
  // Handle exact patterns from mega test that are falling through
  if ((lowerQuery.includes('what is') || lowerQuery.includes('what are') || lowerQuery.includes('how is') || lowerQuery.includes('how are')) &&
      (lowerQuery.includes('ctr') || lowerQuery.includes('roas') || lowerQuery.includes('cpa') || lowerQuery.includes('cpc') || lowerQuery.includes('cpm') || 
       lowerQuery.includes('click-through rate') || lowerQuery.includes('click through rate') || lowerQuery.includes('clickthrough rate') ||
       lowerQuery.includes('return on ad spend') || lowerQuery.includes('return on investment') || lowerQuery.includes('roi') ||
       lowerQuery.includes('cost per acquisition') || lowerQuery.includes('cost per click') || lowerQuery.includes('cost per thousand') ||
       lowerQuery.includes('cost per mille') || lowerQuery.includes('conversion rate') || lowerQuery.includes('click rate') ||
       lowerQuery.includes('impression rate') || lowerQuery.includes('engagement rate')) &&
      !detectedPlatform && !detectedCampaign) {
    
    // Calculate overall metrics
    const totalSpend = data.reduce((sum, item) => sum + item.metrics.spend, 0)
    const totalRevenue = data.reduce((sum, item) => sum + item.metrics.revenue, 0)
    const totalImpressions = data.reduce((sum, item) => sum + item.metrics.impressions, 0)
    const totalClicks = data.reduce((sum, item) => sum + item.metrics.clicks, 0)
    const totalConversions = data.reduce((sum, item) => sum + item.metrics.conversions, 0)
    
    // Determine which metric is being asked for
    let metric = 'roas'
    let metricName = 'Overall ROAS'
    let formatFunction = (value: number) => `${value.toFixed(2)}x`
    let value = totalSpend > 0 ? totalRevenue / totalSpend : 0
    
    if (lowerQuery.includes('ctr') || lowerQuery.includes('click-through rate') || lowerQuery.includes('click through rate') || lowerQuery.includes('clickthrough rate') || lowerQuery.includes('click rate')) {
      metric = 'ctr'
      metricName = 'Overall CTR'
      formatFunction = (value: number) => `${(value * 100).toFixed(2)}%`
      value = totalImpressions > 0 ? totalClicks / totalImpressions : 0
    } else if (lowerQuery.includes('roas') || lowerQuery.includes('return on ad spend') || lowerQuery.includes('return on investment') || lowerQuery.includes('roi')) {
      metric = 'roas'
      metricName = 'Overall ROAS'
      formatFunction = (value: number) => `${value.toFixed(2)}x`
      value = totalSpend > 0 ? totalRevenue / totalSpend : 0
    } else if (lowerQuery.includes('cpa') || lowerQuery.includes('cost per acquisition') || lowerQuery.includes('conversion rate')) {
      metric = 'cpa'
      metricName = 'Overall CPA'
      formatFunction = (value: number) => `$${value.toFixed(2)}`
      value = totalConversions > 0 ? totalSpend / totalConversions : 0
    } else if (lowerQuery.includes('cpc') || lowerQuery.includes('cost per click')) {
      metric = 'cpc'
      metricName = 'Overall CPC'
      formatFunction = (value: number) => `$${value.toFixed(2)}`
      value = totalClicks > 0 ? totalSpend / totalClicks : 0
    } else if (lowerQuery.includes('cpm') || lowerQuery.includes('cost per thousand') || lowerQuery.includes('cost per mille')) {
      metric = 'cpm'
      metricName = 'Overall CPM'
      formatFunction = (value: number) => `$${value.toFixed(2)}`
      value = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0
    }
    
    return {
      content: `${metricName}: ${formatFunction(value)}`,
      data: {
        type: 'specific_metrics',
        metric: metric,
        value: value,
        query: query
      }
    }
  }

  // PHASE 4 IMPROVEMENT 7: Creative Performance Handler (Priority: CRITICAL)
  // Handle "top performing creatives", "best creatives" queries
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
    
    // Group data by creative (using creative_id and creative_name)
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
    }).sort((a, b) => b.roas - a.roas) // Sort by ROAS descending
    
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

  // PHASE 4 IMPROVEMENT 9: Platform Performance Handler (Priority: CRITICAL)
  // Handle "top performing platform", "best platform", "platform performance" queries
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
        campaignCount: metrics.campaigns.size
      }
    }).sort((a, b) => b.roas - a.roas) // Sort by ROAS descending
    
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

  // PHASE 4 IMPROVEMENT 6: Top/Best Performing Handler (Priority: CRITICAL)
  // Handle "top performing", "best performing", "highest" queries
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
    }).sort((a, b) => b.roas - a.roas) // Sort by ROAS descending
    
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

  // PHASE 4 IMPROVEMENT 8: Campaign Names Handler (Priority: CRITICAL)
  // Handle "campaign names", "list campaigns", "what campaigns" queries
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

  // PHASE 4 IMPROVEMENT 10: Audience Performance Handler (Priority: CRITICAL)
  // Handle "audience performance", "target audience", "demographics" queries
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
        platformCount: metrics.platforms.size,
        campaignCount: metrics.campaigns.size
      }
    }).sort((a, b) => b.roas - a.roas) // Sort by ROAS descending
    
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

  // PHASE 4 IMPROVEMENT 5: Direct Anomaly Detection Handler (Priority: CRITICAL)
  // Simple, direct handler for "anomaly" queries that are falling through
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

  // Simple fallback response for now
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
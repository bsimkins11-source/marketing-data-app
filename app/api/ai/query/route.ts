import { NextRequest, NextResponse } from 'next/server'
import { config } from '@/lib/config'
import { loadCampaignData } from '@/lib/server-data-service'

// Shared constants for keyword detection
const KEYWORDS = {
  CTR: ['ctr', 'click-through rate', 'click through rate', 'click rate', 'click-through', 'clickthrough'],
  ROAS: ['roas', 'return on ad spend', 'return on advertising spend', 'return on investment', 'roi'],
  COUNT: ['how many', 'count', 'number', 'total number', 'amount of', 'quantity'],
  SPEND: ['spend', 'cost', 'budget', 'expense', 'expenditure', 'investment'],
  CAMPAIGN: ['campaign', 'campaigns', 'ad campaign', 'ad campaigns'],
  PLATFORM: ['platform', 'platforms', 'channel', 'channels', 'network', 'networks'],
  VIZ: ['visual', 'visualize', 'chart', 'graph', 'plot', 'show me', 'display', 'visualization'],
  TOP: ['top', 'best', 'highest', 'leading', 'top performing', 'best performing'],
  PLATFORMS: ['meta', 'dv360', 'cm360', 'sa360', 'amazon', 'tradedesk'],
  CAMPAIGN_NAMES: ['freshnest summer grilling', 'freshnest back to school', 'freshnest holiday recipes', 'freshnest pantry staples', 'freshnest', 'summer grilling', 'back to school', 'holiday recipes', 'pantry staples']
}

const PLATFORM_MAP: Record<string, string> = {
  'meta': 'Meta',
  'dv360': 'Dv360', 
  'cm360': 'Cm360',
  'sa360': 'Sa360',
  'amazon': 'Amazon',
  'tradedesk': 'Tradedesk'
}

export async function POST(request: NextRequest) {
  try {
    const { query, sessionId } = await request.json()
    
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    const data = await loadCampaignData()
    const result = await processAIQuery(query, data)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error processing query:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function processAIQuery(query: string, data: any[]) {
  const lowerQuery = query.toLowerCase()
  
  // Keyword detection
  const isCTRQuery = KEYWORDS.CTR.some(keyword => lowerQuery.includes(keyword))
  const isROASQuery = KEYWORDS.ROAS.some(keyword => lowerQuery.includes(keyword))
  
  // Platform detection
  const detectedPlatform = KEYWORDS.PLATFORMS.find(platform => lowerQuery.includes(platform))
  const detectedCampaign = KEYWORDS.CAMPAIGN_NAMES.find(campaign => lowerQuery.includes(campaign))

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
      return {
        content: `No data found for ${campaign}`,
        data: {
          type: 'campaign_specific',
          campaign: campaign,
          performance: 'no_data',
          query: query
        }
      }
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
      return {
        content: `No data found for ${platform}`,
        data: {
          type: 'platform_performance',
          platform: platform,
          performance: 'no_data',
          query: query
        }
      }
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
       lowerQuery.includes('dashboard') || lowerQuery.includes('report') || lowerQuery.includes('status')) &&
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
       lowerQuery.includes('worry') || lowerQuery.includes('alarm') || lowerQuery.includes('alert')) &&
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
       lowerQuery.includes('correlation') || lowerQuery.includes('insight')) &&
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
       lowerQuery.includes('the') || lowerQuery.includes('our')) && 
      (lowerQuery.includes('spend') || lowerQuery.includes('revenue') || lowerQuery.includes('impressions') || 
       lowerQuery.includes('clicks') || lowerQuery.includes('conversions') || lowerQuery.includes('cost') || 
       lowerQuery.includes('budget') || lowerQuery.includes('money') || lowerQuery.includes('ctr') || 
       lowerQuery.includes('roas') || lowerQuery.includes('cpa') || lowerQuery.includes('cpc') || 
       lowerQuery.includes('cpm') || lowerQuery.includes('click-through rate') || lowerQuery.includes('return on ad spend')) &&
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

  // PHASE 3 IMPROVEMENT 7: Catch-all Comparative Handler (Priority: HIGH)
  // Handle any remaining comparative queries that might be falling through
  if ((lowerQuery.includes('which') || lowerQuery.includes('what')) && 
      (lowerQuery.includes('platform') || lowerQuery.includes('campaign')) &&
      (lowerQuery.includes('best') || lowerQuery.includes('highest') || lowerQuery.includes('most') || 
       lowerQuery.includes('worst') || lowerQuery.includes('lowest'))) {
    
    // Default to platform comparison with ROAS
    const isPlatformComparison = lowerQuery.includes('platform') || !lowerQuery.includes('campaign')
    const isCampaignComparison = lowerQuery.includes('campaign')
    
    // Group data by platform or campaign
    const groups: Record<string, { spend: number, revenue: number, roas: number }> = {}
    
    if (isPlatformComparison) {
      data.forEach(item => {
        const platform = item.dimensions.platform
        if (!groups[platform]) {
          groups[platform] = { spend: 0, revenue: 0, roas: 0 }
        }
        groups[platform].spend += item.metrics.spend
        groups[platform].revenue += item.metrics.revenue
      })
    } else {
      data.forEach(item => {
        const campaign = item.dimensions.campaign
        if (!groups[campaign]) {
          groups[campaign] = { spend: 0, revenue: 0, roas: 0 }
        }
        groups[campaign].spend += item.metrics.spend
        groups[campaign].revenue += item.metrics.revenue
      })
    }
    
    // Calculate ROAS for each group
    Object.keys(groups).forEach(name => {
      const group = groups[name]
      group.roas = group.spend > 0 ? group.revenue / group.spend : 0
    })
    
    // Sort by ROAS
    const sorted = Object.entries(groups).sort((a, b) => b[1].roas - a[1].roas)
    const winner = sorted[0]
    const runnerUp = sorted[1]
    
    const comparisonType = isPlatformComparison ? 'platform' : 'campaign'
    const bestWorst = lowerQuery.includes('worst') || lowerQuery.includes('lowest') ? 'worst' : 'best'
    
    const content = `${winner[0]} ${bestWorst === 'worst' ? 'performed worst' : 'performed best'} with ${winner[1].roas.toFixed(2)}x ROAS${runnerUp ? `, followed by ${runnerUp[0]} with ${runnerUp[1].roas.toFixed(2)}x ROAS` : ''}`
    
    return {
      content,
      data: {
        type: 'catch_all_comparison',
        comparisonType: comparisonType,
        winner: { name: winner[0], roas: winner[1].roas },
        runnerUp: runnerUp ? { name: runnerUp[0], roas: runnerUp[1].roas } : null,
        allMetrics: sorted,
        query: query
      }
    }
  }

  // Simple fallback response for now
  return {
    content: `I understand you're asking about "${query}". I can help you analyze your campaign data. Try asking about:\n• Total impressions, spend, or revenue\n• Best performing campaigns by CTR or ROAS\n• Average CTR or ROAS for specific platforms\n• List all campaigns\n• Generate graphs/charts by spend, impressions, clicks, or revenue\n• Compare performance by device or location\n• Filter campaigns by specific criteria\n• Which platform had the highest ROAS`,
    data: {
      type: 'fallback',
      query: query
    }
  }
}
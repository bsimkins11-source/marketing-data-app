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
  CAMPAIGN_NAMES: ['freshnest summer grilling', 'freshnest back to school', 'freshnest holiday recipes', 'freshnest pantry staples']
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
  // Handle efficiency and performance comparison queries
  if ((lowerQuery.includes('which') || lowerQuery.includes('what')) && 
      (lowerQuery.includes('efficient') || lowerQuery.includes('efficiency') || lowerQuery.includes('worst') || lowerQuery.includes('lowest') || lowerQuery.includes('best value'))) {
    
    // Determine the metric to compare
    let metric = 'roas'
    let metricName = 'ROAS'
    let formatFunction = (value: number) => `${value.toFixed(2)}x`
    let sortDescending = true
    
    if (lowerQuery.includes('efficient') || lowerQuery.includes('efficiency')) {
      // Efficiency = ROAS / CTR (higher is better)
      metric = 'efficiency'
      metricName = 'Efficiency'
      formatFunction = (value: number) => `${value.toFixed(2)}`
    } else if (lowerQuery.includes('worst') || lowerQuery.includes('lowest')) {
      // For "worst" queries, we'll find the lowest ROAS
      metric = 'roas'
      metricName = 'ROAS'
      sortDescending = false
    } else if (lowerQuery.includes('best value')) {
      // Best value = highest ROAS with reasonable spend
      metric = 'value'
      metricName = 'Value'
      formatFunction = (value: number) => `${value.toFixed(2)}`
    }
    
    // Group data by platform and calculate metrics
    const platformGroups: Record<string, { spend: number, revenue: number, impressions: number, clicks: number, conversions: number }> = {}
    data.forEach(item => {
      const platform = item.dimensions.platform
      if (!platformGroups[platform]) {
        platformGroups[platform] = { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 }
      }
      platformGroups[platform].spend += item.metrics.spend
      platformGroups[platform].revenue += item.metrics.revenue
      platformGroups[platform].impressions += item.metrics.impressions
      platformGroups[platform].clicks += item.metrics.clicks
      platformGroups[platform].conversions += item.metrics.conversions
    })
    
    // Calculate final metric values and sort
    const platformMetrics = Object.entries(platformGroups)
      .map(([platform, data]) => {
        let finalValue = 0
        if (metric === 'efficiency') {
          const roas = data.spend > 0 ? data.revenue / data.spend : 0
          const ctr = data.impressions > 0 ? data.clicks / data.impressions : 0
          finalValue = ctr > 0 ? roas / ctr : 0
        } else if (metric === 'value') {
          const roas = data.spend > 0 ? data.revenue / data.spend : 0
          const spendEfficiency = data.spend > 0 ? 1 / data.spend : 0
          finalValue = roas * spendEfficiency
        } else {
          finalValue = data.spend > 0 ? data.revenue / data.spend : 0
        }
        return {
          platform,
          value: finalValue,
          spend: data.spend,
          revenue: data.revenue
        }
      })
      .sort((a, b) => sortDescending ? b.value - a.value : a.value - b.value)
    
    const winner = platformMetrics[0]
    const runnerUp = platformMetrics[1]
    
    const content = `${winner.platform} is ${lowerQuery.includes('worst') || lowerQuery.includes('lowest') ? 'performing worst' : 'most efficient'} with ${formatFunction(winner.value)} ${metricName}${runnerUp ? `, followed by ${runnerUp.platform} with ${formatFunction(runnerUp.value)}` : ''}`
    
    return {
      content,
      data: {
        type: 'platform_efficiency_comparison',
        metric: metric,
        winner: winner,
        runnerUp: runnerUp,
        allPlatforms: platformMetrics,
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
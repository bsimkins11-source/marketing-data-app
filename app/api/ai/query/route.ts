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

  // Simple fallback response for now
  return {
    content: `I understand you're asking about "${query}". I can help you analyze your campaign data. Try asking about:\n• Total impressions, spend, or revenue\n• Best performing campaigns by CTR or ROAS\n• Average CTR or ROAS for specific platforms\n• List all campaigns\n• Generate graphs/charts by spend, impressions, clicks, or revenue\n• Compare performance by device or location\n• Filter campaigns by specific criteria\n• Which platform had the highest ROAS`,
    data: {
      type: 'fallback',
      query: query
    }
  }
}
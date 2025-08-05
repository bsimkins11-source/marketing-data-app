import { NextRequest, NextResponse } from 'next/server'
import { loadCampaignData } from '@/lib/server-data-service'
import { KEYWORDS, PLATFORM_MAP } from '@/lib/constants'

// ============================================================================
// HELPER FUNCTIONS - Clean, reusable data processing utilities
// ============================================================================

interface Metrics {
  spend: number
  revenue: number
  impressions: number
  clicks: number
  conversions: number
}

interface CalculatedMetrics extends Metrics {
  roas: number
  ctr: number
  cpa: number
  cpc: number
  cpm: number
  roi: number
  profitMargin: number
}

interface AnalysisItem {
  name: string
  metrics: CalculatedMetrics
}

// Calculate all metrics from raw data
function calculateMetrics(metrics: Metrics): CalculatedMetrics {
  const { spend, revenue, impressions, clicks, conversions } = metrics
  
  const roas = spend > 0 ? revenue / spend : 0
  const ctr = impressions > 0 ? clicks / impressions : 0
  const cpa = conversions > 0 ? spend / conversions : 0
  const cpc = clicks > 0 ? spend / clicks : 0
  const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0
  const roi = spend > 0 ? ((revenue - spend) / spend) * 100 : 0
  const profitMargin = revenue > 0 ? ((revenue - spend) / revenue) * 100 : 0
  
  return { spend, revenue, impressions, clicks, conversions, roas, ctr, cpa, cpc, cpm, roi, profitMargin }
}

// Aggregate data by dimension (platform, campaign, audience, etc.)
function aggregateByDimension(data: any[], dimensionKey: string): Map<string, Metrics> {
  const aggregated = new Map<string, Metrics>()
  
  for (const row of data) {
    const dimensionValue = row.dimensions[dimensionKey] || 'Unknown'
    const existing = aggregated.get(dimensionValue) || { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 }
    
    aggregated.set(dimensionValue, {
      spend: existing.spend + row.metrics.spend,
      revenue: existing.revenue + row.metrics.revenue,
      impressions: existing.impressions + row.metrics.impressions,
      clicks: existing.clicks + row.metrics.clicks,
      conversions: existing.conversions + row.metrics.conversions
    })
  }
  
  return aggregated
}

// Convert aggregated data to analysis items with calculated metrics
function createAnalysisItems(aggregated: Map<string, Metrics>): AnalysisItem[] {
  return Array.from(aggregated.entries())
    .map(([name, metrics]) => ({
      name: name || 'Unknown',
      metrics: calculateMetrics(metrics)
    }))
    .sort((a, b) => b.metrics.roas - a.metrics.roas)
}

// Format currency with proper locale
function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString()}`
}

// Format percentage with 2 decimal places
function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

// Format ROAS with 2 decimal places
function formatROAS(value: number): string {
  return `${value.toFixed(2)}x`
}

// Create consistent response structure
function createResponse(content: string, data: any, query: string) {
  return {
    content,
    data: {
      ...data,
      query,
      timestamp: new Date().toISOString()
    }
  }
}

// ============================================================================
// CONVERSATION CONTEXT MANAGEMENT
// ============================================================================

// Define proper types for conversation context
interface ConversationContext {
  lastContext: any
  messages: any[]
  lastAccess: number
}

// In-memory conversation context storage with cleanup
const conversationContexts = new Map<string, ConversationContext>()
const sessionCleanup = new Map<string, NodeJS.Timeout>()
const SESSION_TIMEOUT = 60 * 60 * 1000 // 1 hour

function cleanupSession(sessionId: string) {
  conversationContexts.delete(sessionId)
  sessionCleanup.delete(sessionId)
}

function getConversationContext(sessionId?: string): ConversationContext {
  if (!sessionId) return { lastContext: null, messages: [], lastAccess: Date.now() }
  
  const context = conversationContexts.get(sessionId)
  if (context) {
    context.lastAccess = Date.now()
    conversationContexts.set(sessionId, context)
  }
  
  return context || { lastContext: null, messages: [], lastAccess: Date.now() }
}

function updateConversationContext(sessionId: string | undefined, query: string, result: any) {
  if (!sessionId) return
  
  if (sessionCleanup.has(sessionId)) {
    clearTimeout(sessionCleanup.get(sessionId)!)
  }
  
  const timeout = setTimeout(() => cleanupSession(sessionId), SESSION_TIMEOUT)
  sessionCleanup.set(sessionId, timeout)
  
  const context = getConversationContext(sessionId)
  context.lastContext = { query, result }
  context.messages.push({ query, result })
  context.lastAccess = Date.now()
  conversationContexts.set(sessionId, context)
}

// Periodic cleanup of expired sessions
setInterval(() => {
  const now = Date.now()
  const expiredSessions = Array.from(conversationContexts.entries())
    .filter(([_, context]) => now - context.lastAccess > SESSION_TIMEOUT)
    .map(([sessionId, _]) => sessionId)
  
  expiredSessions.forEach(sessionId => cleanupSession(sessionId))
}, 5 * 60 * 1000)

function handleDrillDownQuery(query: string, data: any[], context: any) {
  const lowerQuery = query.toLowerCase()
  
  if (context.lastContext) {
    const lastResult = context.lastContext.result
    
    const chartKeywords = [
      'chart', 'graph', 'visualization', 'visualize', 'visual', 'plot', 'diagram', 'figure',
      'download', 'export', 'save', 'get', 'show', 'display', 'present', 'create', 'generate',
      'make', 'build', 'render', 'draw', 'illustrate', 'depict', 'represent'
    ]
    
    const contextKeywords = [
      'this', 'that', 'it', 'these', 'those', 'the data', 'the results', 'the information',
      'what you showed', 'what you found', 'the analysis', 'the performance', 'the metrics'
    ]
    
    const hasChartKeyword = chartKeywords.some(keyword => lowerQuery.includes(keyword))
    const hasContextKeyword = contextKeywords.some(keyword => lowerQuery.includes(keyword))
    
    const additionalPatterns = [
      'can you show me', 'could you show me', 'would you show me',
      'can you create', 'could you create', 'would you create',
      'can you make', 'could you make', 'would you make',
      'i would like', 'i want', 'i need',
      'please show', 'please create', 'please make',
      'show me a', 'create a', 'make a',
      'turn this into', 'convert this to', 'transform this into',
      'give me a', 'provide me with', 'send me a',
      'i need a', 'i want a', 'i would like a',
      'can i get', 'could i get', 'would i get',
      'is there a', 'do you have a', 'can you provide a'
    ]
    
    const hasAdditionalPattern = additionalPatterns.some(pattern => lowerQuery.includes(pattern))
    
    if ((hasChartKeyword && hasContextKeyword) || hasAdditionalPattern) {
      const lastDataType = lastResult.data?.type
      
      if (lastDataType === 'platform_performance' || lastDataType === 'platform_comparison') {
        const platformData = lastResult.data.platform
        const metrics = lastResult.data.metrics
        
        const chartData = {
          type: 'bar',
          data: {
            labels: ['Spend', 'Revenue', 'Impressions', 'Clicks', 'Conversions'],
            datasets: [{
              label: platformData,
              data: [
                metrics.spend,
                metrics.revenue,
                metrics.impressions,
                metrics.clicks,
                metrics.conversions
              ],
              backgroundColor: 'rgba(54, 162, 235, 0.8)',
              borderColor: 'rgba(54, 162, 235, 1)',
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            plugins: {
              title: {
                display: true,
                text: `${platformData} Performance Metrics`
              }
            }
          }
        }
        
        return {
          content: `📊 Here's a chart showing ${platformData}'s performance metrics:\n\n**Chart Data:**\n• Spend: $${metrics.spend.toLocaleString()}\n• Revenue: $${metrics.revenue.toLocaleString()}\n• Impressions: ${metrics.impressions.toLocaleString()}\n• Clicks: ${metrics.clicks.toLocaleString()}\n• Conversions: ${metrics.conversions.toLocaleString()}\n• CTR: ${(metrics.ctr * 100).toFixed(2)}%\n• ROAS: ${metrics.roas.toFixed(2)}x\n• CPA: $${metrics.cpa.toFixed(2)}`,
          data: {
            type: 'chart_response',
            chartData,
            platform: platformData,
            metrics,
            query: query
          }
        }
      }
      
      if (lastDataType === 'campaign_summary' || lastDataType === 'campaign_performance') {
        const campaigns = lastResult.data.campaigns || []
        const platforms = lastResult.data.platforms || []
        
        if (campaigns.length > 0) {
          const chartData = {
            type: 'bar',
            data: {
              labels: campaigns.map((c: any) => c.campaign),
              datasets: [{
                label: 'ROAS',
                data: campaigns.map((c: any) => c.roas),
                backgroundColor: 'rgba(75, 192, 192, 0.8)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
              }]
            },
            options: {
              responsive: true,
              plugins: {
                title: {
                  display: true,
                  text: 'Campaign ROAS Comparison'
                }
              }
            }
          }
          
          return {
            content: `📊 Here's a chart comparing campaign ROAS performance:\n\n**Top Campaigns by ROAS:**\n${campaigns.slice(0, 3).map((c: any, i: number) => 
              `${i + 1}. ${c.campaign}: ${c.roas.toFixed(2)}x ROAS`
            ).join('\n')}`,
            data: {
              type: 'chart_response',
              chartData,
              campaigns,
              query: query
            }
          }
        }
      }
    }
  }
  
  return null
}

async function processAIQuery(query: string, data: any[], sessionId?: string) {
  const lowerQuery = query.toLowerCase()
  const context = getConversationContext(sessionId)

  // ============================================================================
  // TIME CONTEXT HANDLERS (HIGHEST PRIORITY)
  // ============================================================================
  
  // Handle time-related queries
  const timeHandlers = {
    explicitTime: [
      'when was this data collected', 'what time period', 'what timeframe', 'what dates',
      'what month is this', 'what year is this', 'tell me about the time period',
      'what period is this', 'how long is this data'
    ],
    otherMonths: ['january', 'february', 'march', 'april', 'may', 'july', 'august', 'september', 'october', 'november', 'december'],
    otherYears: ['2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016', '2015']
  }

  // Check for explicit time queries
  if (timeHandlers.explicitTime.some(timeQuery => lowerQuery.includes(timeQuery))) {
    const content = `📅 **Data Timeframe**:\n\n` +
      `• **Period**: June 1-30, 2024\n` +
      `• **Duration**: 30 days of campaign data\n` +
      `• **Data Granularity**: Daily performance metrics\n\n` +
      `📊 **Available Time Dimensions**:\n` +
      `• Week 1: June 1-7, 2024\n` +
      `• Week 2: June 8-14, 2024\n` +
      `• Week 3: June 15-21, 2024\n` +
      `• Week 4: June 22-30, 2024\n\n` +
      `💡 **Note**: All data in this application is from June 2024. You can ask about weekly performance or specific dates within this period.`
    
    const result = createResponse(content, {
      type: 'time_context',
      timeframe: {
        startDate: '2024-06-01',
        endDate: '2024-06-30',
        period: 'June 2024',
        duration: '30 days'
      },
      weeks: [
        { week: 1, start: '2024-06-01', end: '2024-06-07' },
        { week: 2, start: '2024-06-08', end: '2024-06-14' },
        { week: 3, start: '2024-06-15', end: '2024-06-21' },
        { week: 4, start: '2024-06-22', end: '2024-06-30' }
      ]
    }, query)
    
    updateConversationContext(sessionId, query, result)
    return result
  }

  // Check for other months/years
  const mentionsOtherMonth = timeHandlers.otherMonths.some(month => {
    const monthPattern = new RegExp(`\\b${month}\\b`, 'i')
    return monthPattern.test(query)
  })
  const mentionsOtherYear = timeHandlers.otherYears.some(year => query.includes(year))
  
  if (mentionsOtherMonth || mentionsOtherYear) {
    const content = 'This demo is built on campaigns that ran in June 2024. No data is available for other months.'
    const result = createResponse(content, {
      type: 'time_context',
      timeframe: {
        startDate: '2024-06-01',
        endDate: '2024-06-30',
        period: 'June 2024',
        duration: '30 days'
      }
    }, query)
    
    updateConversationContext(sessionId, query, result)
    return result
  }

  // Handle drill-down queries with context
  if (context.lastContext) {
    const drillDownResult = handleDrillDownQuery(query, data, context)
    if (drillDownResult) {
      updateConversationContext(sessionId, query, drillDownResult)
      return drillDownResult
    }
  }
  
  // ============================================================================
  // PLATFORM ANALYSIS HANDLERS (HIGH PRIORITY)
  // ============================================================================
  
  // Platform-specific performance queries
  const platformPerfPatterns = [
    /what is (meta|dv360|amazon|cm360|sa360|tradedesk)'s performance\?/i,
    /how is (meta|dv360|amazon|cm360|sa360|tradedesk) performing\?/i,
    /show me (meta|dv360|amazon|cm360|sa360|tradedesk)'s metrics/i,
    /what are (meta|dv360|amazon|cm360|sa360|tradedesk)'s results\?/i
  ]

  // Check for platform-specific queries
  for (const pattern of platformPerfPatterns) {
    const match = query.match(pattern)
    if (match) {
      const platformName = match[1].toUpperCase()
      const platformData = data.filter(row => row.dimensions.platform === platformName)
      
      if (platformData.length > 0) {
        const aggregated = aggregateByDimension(platformData, 'platform')
        const analysis = createAnalysisItems(aggregated)
        const platform = analysis[0]
        
        const content = `${platformName} Performance:\n\n` +
          `💰 Spend: ${formatCurrency(platform.metrics.spend)}\n` +
          `💵 Revenue: ${formatCurrency(platform.metrics.revenue)}\n` +
          `📊 Impressions: ${platform.metrics.impressions.toLocaleString()}\n` +
          `🖱️ Clicks: ${platform.metrics.clicks.toLocaleString()}\n` +
          `🎯 Conversions: ${platform.metrics.conversions.toLocaleString()}\n` +
          `📈 CTR: ${formatPercentage(platform.metrics.ctr)}\n` +
          `💎 ROAS: ${formatROAS(platform.metrics.roas)}\n` +
          `💸 CPA: ${formatCurrency(platform.metrics.cpa)}`
        
        const result = createResponse(content, {
          type: 'platform_performance',
          platform: platformName,
          metrics: platform.metrics
        }, query)
        
        updateConversationContext(sessionId, query, result)
        return result
      }
    }
  }

  // Platform comparison queries
  const platformComparisonKeywords = [
    'platform comparison', 'compare platform', 'which platform', 'platform should i focus on',
    'show me platform comparison', 'top performing platform', 'platform rankings',
    'compare platform performance'
  ]
  
  if (platformComparisonKeywords.some(keyword => lowerQuery.includes(keyword))) {
    const aggregated = aggregateByDimension(data, 'platform')
    const analysis = createAnalysisItems(aggregated)
    
    const topPlatform = analysis[0]
    const bottomPlatform = analysis[analysis.length - 1]
    
    let content = `🏆 PLATFORM COMPARISON:\n\n` +
      `🥇 Top Platform: ${topPlatform.name}\n` +
      `• ROAS: ${formatROAS(topPlatform.metrics.roas)}\n` +
      `• Spend: ${formatCurrency(topPlatform.metrics.spend)}\n` +
      `• Revenue: ${formatCurrency(topPlatform.metrics.revenue)}\n\n` +
      `📊 All Platforms by ROAS:\n`
    
    analysis.forEach((platform, index) => {
      content += `${index + 1}. ${platform.name}: ${formatROAS(platform.metrics.roas)} ROAS\n`
    })
    
    const result = createResponse(content, {
      type: 'platform_comparison',
      platforms: analysis,
      top: topPlatform.name,
      bottom: bottomPlatform.name,
      chartData: analysis.map(platform => ({
        platform: platform.name,
        spend: platform.metrics.spend,
        revenue: platform.metrics.revenue,
        roas: platform.metrics.roas
      }))
    }, query)
    
    updateConversationContext(sessionId, query, result)
    return result
  }

  // Additional platform-specific queries (catch-all for platform performance)
  const platformNames = ['meta', 'dv360', 'amazon', 'cm360', 'sa360', 'tradedesk']
  const platformQueryKeywords = ['performing', 'performance', 'metrics', 'results', 'how is', 'what is']
  
  for (const platformName of platformNames) {
    if (lowerQuery.includes(platformName) && platformQueryKeywords.some(keyword => lowerQuery.includes(keyword))) {
      const platformData = data.filter(row => row.dimensions.platform.toLowerCase() === platformName.toLowerCase())
      
      if (platformData.length > 0) {
        const aggregated = aggregateByDimension(platformData, 'platform')
        const analysis = createAnalysisItems(aggregated)
        const platform = analysis[0]
        
        const content = `${platformName.charAt(0).toUpperCase() + platformName.slice(1)} Performance:\n\n` +
          `💰 Spend: ${formatCurrency(platform.metrics.spend)}\n` +
          `💵 Revenue: ${formatCurrency(platform.metrics.revenue)}\n` +
          `📊 Impressions: ${platform.metrics.impressions.toLocaleString()}\n` +
          `🖱️ Clicks: ${platform.metrics.clicks.toLocaleString()}\n` +
          `🎯 Conversions: ${platform.metrics.conversions.toLocaleString()}\n` +
          `📈 CTR: ${formatPercentage(platform.metrics.ctr)}\n` +
          `💎 ROAS: ${formatROAS(platform.metrics.roas)}\n` +
          `💸 CPA: ${formatCurrency(platform.metrics.cpa)}`
        
        const result = createResponse(content, {
          type: 'platform_performance',
          platform: platformName.charAt(0).toUpperCase() + platformName.slice(1),
          metrics: platform.metrics
        }, query)
        
        updateConversationContext(sessionId, query, result)
        return result
      }
    }
  }

  // ============================================================================
  // CAMPAIGN ANALYSIS HANDLERS (HIGH PRIORITY)
  // ============================================================================
  
  // Campaign-specific queries
  const campaignKeywords = [
    'campaign', 'campaigns', 'best campaign', 'top campaign', 'worst campaign',
    'campaign rankings', 'campaign performance', 'campaigns doing well',
    'campaigns performing', 'performance of each campaign',
    'compare campaign performance', 'performance of each campaign'
  ]
  
  if (campaignKeywords.some(keyword => lowerQuery.includes(keyword))) {
    const aggregated = aggregateByDimension(data, 'campaign')
    const analysis = createAnalysisItems(aggregated)
    
    const bestCampaign = analysis[0]
    const worstCampaign = analysis[analysis.length - 1]
    
    let content = `🎯 CAMPAIGN ANALYSIS:\n\n` +
      `🏆 Best Performing Campaign: ${bestCampaign.name}\n` +
      `• ROAS: ${formatROAS(bestCampaign.metrics.roas)}\n` +
      `• Spend: ${formatCurrency(bestCampaign.metrics.spend)}\n` +
      `• Revenue: ${formatCurrency(bestCampaign.metrics.revenue)}\n\n` +
      `📉 Worst Performing Campaign: ${worstCampaign.name}\n` +
      `• ROAS: ${formatROAS(worstCampaign.metrics.roas)}\n` +
      `• Spend: ${formatCurrency(worstCampaign.metrics.spend)}\n` +
      `• Revenue: ${formatCurrency(worstCampaign.metrics.revenue)}\n\n` +
      `📊 Campaign Rankings by ROAS:\n`
    
    analysis.forEach((campaign, index) => {
      content += `${index + 1}. ${campaign.name}: ${formatROAS(campaign.metrics.roas)} ROAS\n`
    })
    
    const result = createResponse(content, {
      type: 'campaign_analysis',
      campaigns: analysis,
      best: bestCampaign.name,
      worst: worstCampaign.name,
      chartData: analysis.map(campaign => ({
        campaign: campaign.name,
        spend: campaign.metrics.spend,
        revenue: campaign.metrics.revenue,
        roas: campaign.metrics.roas
      }))
    }, query)
    
    updateConversationContext(sessionId, query, result)
    return result
  }

  // Specific campaign performance queries (e.g., "FreshNest Summer Grilling performance")
  const specificCampaignNames = [
    'freshnest summer grilling', 'freshnest back to school', 'freshnest holiday recipes', 
    'freshnest pantry staples'
  ]
  
  for (const campaignName of specificCampaignNames) {
    if (lowerQuery.includes(campaignName.toLowerCase())) {
      const campaignData = data.filter(row => 
        row.dimensions.campaign && 
        row.dimensions.campaign.toLowerCase().includes(campaignName.toLowerCase())
      )
      
      if (campaignData.length > 0) {
        const aggregated = aggregateByDimension(campaignData, 'campaign')
        const analysis = createAnalysisItems(aggregated)
        const campaign = analysis[0]
        
        const content = `${campaign.name} Performance:\n\n` +
          `💰 Spend: ${formatCurrency(campaign.metrics.spend)}\n` +
          `💵 Revenue: ${formatCurrency(campaign.metrics.revenue)}\n` +
          `📊 Impressions: ${campaign.metrics.impressions.toLocaleString()}\n` +
          `🖱️ Clicks: ${campaign.metrics.clicks.toLocaleString()}\n` +
          `🎯 Conversions: ${campaign.metrics.conversions.toLocaleString()}\n` +
          `📈 CTR: ${formatPercentage(campaign.metrics.ctr)}\n` +
          `💎 ROAS: ${formatROAS(campaign.metrics.roas)}\n` +
          `💸 CPA: ${formatCurrency(campaign.metrics.cpa)}`
        
        const result = createResponse(content, {
          type: 'specific_campaign_performance',
          campaign: campaign.name,
          metrics: campaign.metrics
        }, query)
        
        updateConversationContext(sessionId, query, result)
        return result
      }
    }
  }

  // ============================================================================
  // AUDIENCE ANALYSIS HANDLERS (HIGH PRIORITY)
  // ============================================================================
  
  // Audience-specific queries
  const audienceKeywords = [
    'audience', 'audiences', 'audience performance', 'audience breakdown',
    'audience segments', 'audience targeting', 'audience insights',
    'segments', 'targeting', 'audience recommendations',
    'audience segments performed best', 'audience targeting worked best',
    'audience segments', 'audience targeting'
  ]
  
  if (audienceKeywords.some(keyword => lowerQuery.includes(keyword))) {
    const aggregated = aggregateByDimension(data, 'audience')
    const analysis = createAnalysisItems(aggregated)
    
    const topAudience = analysis[0]
    
    let content = `👥 AUDIENCE PERFORMANCE:\n\n` +
      `🏆 Top Performing Audience: ${topAudience.name}\n` +
      `• ROAS: ${formatROAS(topAudience.metrics.roas)}\n` +
      `• Spend: ${formatCurrency(topAudience.metrics.spend)}\n` +
      `• Revenue: ${formatCurrency(topAudience.metrics.revenue)}\n` +
      `• Conversions: ${topAudience.metrics.conversions.toLocaleString()}\n\n` +
      `📊 All Audiences by ROAS:\n`
    
    analysis.forEach((audience, index) => {
      content += `${index + 1}. ${audience.name}: ${formatROAS(audience.metrics.roas)} ROAS\n`
    })
    
    const result = createResponse(content, {
      type: 'audience_performance',
      audiences: analysis,
      top: topAudience.name,
      chartData: analysis.map(audience => ({
        audience: audience.name,
        spend: audience.metrics.spend,
        revenue: audience.metrics.revenue,
        roas: audience.metrics.roas
      }))
    }, query)
    
    updateConversationContext(sessionId, query, result)
    return result
  }

  // ============================================================================
  // CREATIVE ANALYSIS HANDLERS (HIGH PRIORITY)
  // ============================================================================
  
  // Creative-specific queries
  const creativeKeywords = [
    'creative', 'creatives', 'creative performance', 'creative formats',
    'creative elements', 'creative optimization', 'creative recommendations',
    'creative by platform', 'creative breakdown', 'creative insights',
    'creative formats worked best', 'creative elements drove', 'creative recommendations do you have',
    'creative formats', 'creative elements', 'creative recommendations'
  ]
  
  if (creativeKeywords.some(keyword => lowerQuery.includes(keyword))) {
    // Calculate overall creative metrics
    const totalMetrics = data.reduce((acc, row) => ({
      spend: acc.spend + row.metrics.spend,
      revenue: acc.revenue + row.metrics.revenue,
      impressions: acc.impressions + row.metrics.impressions,
      clicks: acc.clicks + row.metrics.clicks,
      conversions: acc.conversions + row.metrics.conversions
    }), { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 })
    
    const metrics = calculateMetrics(totalMetrics)
    
    const content = `🎨 CREATIVE PERFORMANCE:\n\n` +
      `📊 Overall Metrics:\n` +
      `• Impressions: ${metrics.impressions.toLocaleString()}\n` +
      `• Clicks: ${metrics.clicks.toLocaleString()}\n` +
      `• Conversions: ${metrics.conversions.toLocaleString()}\n` +
      `• CTR: ${formatPercentage(metrics.ctr)}\n` +
      `• ROAS: ${formatROAS(metrics.roas)}\n` +
      `• CPA: ${formatCurrency(metrics.cpa)}\n\n` +
      `💡 Creative Performance Insights:\n` +
      `• Your creatives are generating ${metrics.conversions.toLocaleString()} conversions\n` +
      `• Average cost per conversion is ${formatCurrency(metrics.cpa)}\n` +
      `• Overall ROAS of ${formatROAS(metrics.roas)} indicates ${metrics.roas > 2 ? 'strong' : 'moderate'} performance`
    
    const result = createResponse(content, {
      type: 'creative_performance',
      metrics
    }, query)
    
    updateConversationContext(sessionId, query, result)
    return result
  }

  // ============================================================================
  // OPTIMIZATION & OPPORTUNITIES HANDLERS (HIGH PRIORITY)
  // ============================================================================
  
  // Optimization-specific queries
  const optimizationKeywords = [
    'optimize', 'optimization', 'opportunities', 'recommendations',
    'where should we put more money', 'focus on improving', 'biggest opportunities',
    'what should we optimize', 'optimization opportunities', 'strategic recommendations',
    'what are our opportunities', 'how can we improve performance', 'what optimization opportunities exist',
    'what should i focus on improving', 'what are the biggest opportunities', 'improve', 'improvement',
    'opportunities', 'biggest opportunities', 'focus on improving', 'improve performance', 'put more money'
  ]
  
  if (optimizationKeywords.some(keyword => lowerQuery.includes(keyword))) {
    const platformAggregated = aggregateByDimension(data, 'platform')
    const platformAnalysis = createAnalysisItems(platformAggregated)
    
    const bestPlatform = platformAnalysis[0]
    const worstPlatform = platformAnalysis[platformAnalysis.length - 1]
    
    const content = `💡 OPTIMIZATION OPPORTUNITIES:\n\n` +
      `🚀 **Scale Up**: ${bestPlatform.name}\n` +
      `• Current ROAS: ${formatROAS(bestPlatform.metrics.roas)}\n` +
      `• Current Spend: ${formatCurrency(bestPlatform.metrics.spend)}\n` +
      `• Opportunity: Increase budget allocation\n\n` +
      `🔧 **Optimize**: ${worstPlatform.name}\n` +
      `• Current ROAS: ${formatROAS(worstPlatform.metrics.roas)}\n` +
      `• Current Spend: ${formatCurrency(worstPlatform.metrics.spend)}\n` +
      `• Action: Review targeting and creative strategy\n\n` +
      `📊 **Platform Rankings by ROAS**:\n` +
      platformAnalysis.map((p, i) => `${i + 1}. ${p.name}: ${formatROAS(p.metrics.roas)}`).join('\n')
    
    const result = createResponse(content, {
      type: 'optimization_opportunities',
      platforms: platformAnalysis,
      best: bestPlatform.name,
      worst: worstPlatform.name
    }, query)
    
    updateConversationContext(sessionId, query, result)
    return result
  }

  // ============================================================================
  // FINANCIAL METRICS HANDLERS (HIGH PRIORITY)
  // ============================================================================
  
  // CPA queries
  if (lowerQuery.includes('cpa') || lowerQuery.includes('cost per acquisition')) {
    const totalSpend = data.reduce((sum, row) => sum + row.metrics.spend, 0)
    const totalConversions = data.reduce((sum, row) => sum + row.metrics.conversions, 0)
    const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0
    
    const content = `💸 Overall CPA: ${formatCurrency(cpa)}\n` +
      `💰 Total Spend: ${formatCurrency(totalSpend)}\n` +
      `🎯 Total Conversions: ${totalConversions.toLocaleString()}`
    
    const result = createResponse(content, {
      type: 'cpa_summary',
      metrics: { spend: totalSpend, conversions: totalConversions, cpa }
    }, query)
    
    updateConversationContext(sessionId, query, result)
    return result
  }

  // CPC queries
  if (lowerQuery.includes('cpc') || lowerQuery.includes('cost per click')) {
    const totalSpend = data.reduce((sum, row) => sum + row.metrics.spend, 0)
    const totalClicks = data.reduce((sum, row) => sum + row.metrics.clicks, 0)
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0
    
    const content = `🖱️ Overall CPC: ${formatCurrency(cpc)}\n` +
      `💰 Total Spend: ${formatCurrency(totalSpend)}\n` +
      `🖱️ Total Clicks: ${totalClicks.toLocaleString()}`
    
    const result = createResponse(content, {
      type: 'cpc_summary',
      metrics: { spend: totalSpend, clicks: totalClicks, cpc }
    }, query)
    
    updateConversationContext(sessionId, query, result)
    return result
  }

  // ROI queries
  if (lowerQuery.includes('roi') || lowerQuery.includes('return on investment')) {
    const totalSpend = data.reduce((sum, row) => sum + row.metrics.spend, 0)
    const totalRevenue = data.reduce((sum, row) => sum + row.metrics.revenue, 0)
    const roi = totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0
    const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalSpend) / totalRevenue) * 100 : 0
    
    const content = `💎 ROI: ${formatPercentage(roi / 100)}\n` +
      `💰 Total Spend: ${formatCurrency(totalSpend)}\n` +
      `💵 Total Revenue: ${formatCurrency(totalRevenue)}\n` +
      `📈 Profit Margin: ${formatPercentage(profitMargin / 100)}`
    
    const result = createResponse(content, {
      type: 'roi_summary',
      metrics: { spend: totalSpend, revenue: totalRevenue, roi, profitMargin }
    }, query)
    
    updateConversationContext(sessionId, query, result)
    return result
  }

  // CTR queries
  if (lowerQuery.includes('ctr') || lowerQuery.includes('click-through rate') || lowerQuery.includes('click through rate')) {
    const totalImpressions = data.reduce((sum, row) => sum + row.metrics.impressions, 0)
    const totalClicks = data.reduce((sum, row) => sum + row.metrics.clicks, 0)
    const ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0
    
    const content = `🖱️ Overall CTR: ${formatPercentage(ctr)}\n` +
      `👁️ Total Impressions: ${totalImpressions.toLocaleString()}\n` +
      `🖱️ Total Clicks: ${totalClicks.toLocaleString()}`
    
    const result = createResponse(content, {
      type: 'ctr_summary',
      metrics: { impressions: totalImpressions, clicks: totalClicks, ctr }
    }, query)
    
    updateConversationContext(sessionId, query, result)
    return result
  }

  // SPEND HANDLER (HIGH PRIORITY)
  if (lowerQuery.includes('spend') || lowerQuery.includes('how much did we spend') || lowerQuery.includes('total spend')) {
    const totalSpend = data.reduce((sum, row) => sum + row.metrics.spend, 0)
    const totalRevenue = data.reduce((sum, row) => sum + row.metrics.revenue, 0)
    const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0
    
    const content = `💰 Total Spend: $${totalSpend.toLocaleString()}\n` +
      `💵 Total Revenue: $${totalRevenue.toLocaleString()}\n` +
      `💎 Overall ROAS: ${roas.toFixed(2)}x`
    
    const result = {
      content,
      data: {
        type: 'spend_summary',
        metrics: { spend: totalSpend, revenue: totalRevenue, roas },
        query: query
      }
    }
    
    updateConversationContext(sessionId, query, result)
    return result
  }

  // REVENUE HANDLER (HIGH PRIORITY)
  if (lowerQuery.includes('revenue') || lowerQuery.includes('how much revenue') || lowerQuery.includes('total revenue')) {
    const totalSpend = data.reduce((sum, row) => sum + row.metrics.spend, 0)
    const totalRevenue = data.reduce((sum, row) => sum + row.metrics.revenue, 0)
    const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0
    
    const content = `💵 Total Revenue: $${totalRevenue.toLocaleString()}\n` +
      `💰 Total Spend: $${totalSpend.toLocaleString()}\n` +
      `💎 Overall ROAS: ${roas.toFixed(2)}x`
    
    const result = {
      content,
      data: {
        type: 'revenue_summary',
        metrics: { spend: totalSpend, revenue: totalRevenue, roas },
        query: query
      }
    }
    
    updateConversationContext(sessionId, query, result)
    return result
  }

  // CAMPAIGN ANALYSIS HANDLERS (HIGH PRIORITY)
  if (lowerQuery.includes('campaign') && (
    lowerQuery.includes('best') || lowerQuery.includes('top') || lowerQuery.includes('worst') ||
    lowerQuery.includes('doing well') || lowerQuery.includes('performing') || lowerQuery.includes('rankings') ||
    lowerQuery.includes('efficient') || lowerQuery.includes('pause')
  )) {
    // Analyze all campaigns
    const campaignMetrics = data.reduce((acc, row) => {
      const campaign = row.dimensions.campaign
      if (!acc[campaign]) {
        acc[campaign] = { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 }
      }
      acc[campaign].spend += row.metrics.spend
      acc[campaign].revenue += row.metrics.revenue
      acc[campaign].impressions += row.metrics.impressions
      acc[campaign].clicks += row.metrics.clicks
      acc[campaign].conversions += row.metrics.conversions
      return acc
    }, {} as any)
    
    const campaignAnalysis = Object.entries(campaignMetrics)
      .map(([campaign, metrics]: [string, any]) => {
        const roas = metrics.spend > 0 ? metrics.revenue / metrics.spend : 0
        const ctr = metrics.impressions > 0 ? metrics.clicks / metrics.impressions : 0
        const cpa = metrics.conversions > 0 ? metrics.spend / metrics.conversions : 0
        return { campaign, metrics: { ...metrics, roas, ctr, cpa } }
      })
      .sort((a, b) => b.metrics.roas - a.metrics.roas)
    
    const bestCampaign = campaignAnalysis[0]
    const worstCampaign = campaignAnalysis[campaignAnalysis.length - 1]
    
    let content = `🎯 CAMPAIGN ANALYSIS:\n\n`
    
    if (lowerQuery.includes('best') || lowerQuery.includes('top')) {
      content += `🏆 Best Performing Campaign: ${bestCampaign.campaign}\n` +
        `• ROAS: ${bestCampaign.metrics.roas.toFixed(2)}x\n` +
        `• Spend: $${bestCampaign.metrics.spend.toLocaleString()}\n` +
        `• Revenue: $${bestCampaign.metrics.revenue.toLocaleString()}\n` +
        `• Conversions: ${bestCampaign.metrics.conversions.toLocaleString()}\n\n`
    }
    
    if (lowerQuery.includes('worst')) {
      content += `📉 Worst Performing Campaign: ${worstCampaign.campaign}\n` +
        `• ROAS: ${worstCampaign.metrics.roas.toFixed(2)}x\n` +
        `• Spend: $${worstCampaign.metrics.spend.toLocaleString()}\n` +
        `• Revenue: $${worstCampaign.metrics.revenue.toLocaleString()}\n` +
        `• Conversions: ${worstCampaign.metrics.conversions.toLocaleString()}\n\n`
    }
    
    if (lowerQuery.includes('pause')) {
      content += `⏸️ Campaigns to Consider Pausing:\n` +
        `• ${worstCampaign.campaign} (${worstCampaign.metrics.roas.toFixed(2)}x ROAS)\n\n`
    }
    
    if (lowerQuery.includes('rankings') || lowerQuery.includes('efficient')) {
      content += `📊 Campaign Rankings by ROAS:\n`
      campaignAnalysis.forEach((campaign, index) => {
        content += `${index + 1}. ${campaign.campaign}: ${campaign.metrics.roas.toFixed(2)}x ROAS\n`
      })
      content += `\n`
    }
    
    const result = {
      content,
      data: {
        type: 'campaign_analysis',
        campaigns: campaignAnalysis,
        best: bestCampaign.campaign,
        worst: worstCampaign.campaign,
        query: query
      }
    }
    
    updateConversationContext(sessionId, query, result)
    return result
  }

  // FINANCIAL METRICS HANDLERS (HIGH PRIORITY)
  if (lowerQuery.includes('cost per click') || lowerQuery.includes('cpc')) {
    const totalSpend = data.reduce((sum, row) => sum + row.metrics.spend, 0)
    const totalClicks = data.reduce((sum, row) => sum + row.metrics.clicks, 0)
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0
    
    const content = `🖱️ Overall CPC: $${cpc.toFixed(2)}\n` +
      `💰 Total Spend: $${totalSpend.toLocaleString()}\n` +
      `🖱️ Total Clicks: ${totalClicks.toLocaleString()}`
    
    const result = {
      content,
      data: {
        type: 'cpc_summary',
        metrics: { spend: totalSpend, clicks: totalClicks, cpc },
        query: query
      }
    }
    
    updateConversationContext(sessionId, query, result)
    return result
  }

  if (lowerQuery.includes('cpm') || lowerQuery.includes('cost per thousand')) {
    const totalSpend = data.reduce((sum, row) => sum + row.metrics.spend, 0)
    const totalImpressions = data.reduce((sum, row) => sum + row.metrics.impressions, 0)
    const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0
    
    const content = `👁️ Overall CPM: $${cpm.toFixed(2)}\n` +
      `💰 Total Spend: $${totalSpend.toLocaleString()}\n` +
      `👁️ Total Impressions: ${totalImpressions.toLocaleString()}`
    
    const result = {
      content,
      data: {
        type: 'cpm_summary',
        metrics: { spend: totalSpend, impressions: totalImpressions, cpm },
        query: query
      }
    }
    
    updateConversationContext(sessionId, query, result)
    return result
  }

  if (lowerQuery.includes('return on investment') || lowerQuery.includes('roi') || lowerQuery.includes('profit margin') || lowerQuery.includes('profitable')) {
    const totalSpend = data.reduce((sum, row) => sum + row.metrics.spend, 0)
    const totalRevenue = data.reduce((sum, row) => sum + row.metrics.revenue, 0)
    const roi = totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0
    const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalSpend) / totalRevenue) * 100 : 0
    
    const content = `💎 ROI: ${roi.toFixed(2)}%\n` +
      `💰 Total Spend: $${totalSpend.toLocaleString()}\n` +
      `💵 Total Revenue: $${totalRevenue.toLocaleString()}\n` +
      `📈 Profit Margin: ${profitMargin.toFixed(2)}%`
    
    const result = {
      content,
      data: {
        type: 'roi_summary',
        metrics: { spend: totalSpend, revenue: totalRevenue, roi, profitMargin },
        query: query
      }
    }
    
    updateConversationContext(sessionId, query, result)
    return result
  }

  // CTR HANDLER (HIGH PRIORITY)
  if (lowerQuery.includes('click-through rate') || lowerQuery.includes('ctr')) {
    const totalImpressions = data.reduce((sum, row) => sum + row.metrics.impressions, 0)
    const totalClicks = data.reduce((sum, row) => sum + row.metrics.clicks, 0)
    const ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0
    
    const content = `🖱️ Overall CTR: ${(ctr * 100).toFixed(2)}%\n` +
      `👁️ Total Impressions: ${totalImpressions.toLocaleString()}\n` +
      `🖱️ Total Clicks: ${totalClicks.toLocaleString()}`
    
    const result = {
      content,
      data: {
        type: 'ctr_summary',
        metrics: { impressions: totalImpressions, clicks: totalClicks, ctr },
        query: query
      }
    }
    
    updateConversationContext(sessionId, query, result)
    return result
  }

  // CONVERSIONS HANDLER (HIGH PRIORITY)
  if (lowerQuery.includes('conversions') || lowerQuery.includes('how many conversions')) {
    const totalConversions = data.reduce((sum, row) => sum + row.metrics.conversions, 0)
    const totalSpend = data.reduce((sum, row) => sum + row.metrics.spend, 0)
    const totalRevenue = data.reduce((sum, row) => sum + row.metrics.revenue, 0)
    const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0
    
    const content = `🎯 Total Conversions: ${totalConversions.toLocaleString()}\n` +
      `💰 Total Spend: $${totalSpend.toLocaleString()}\n` +
      `💵 Total Revenue: $${totalRevenue.toLocaleString()}\n` +
      `💸 Average CPA: $${cpa.toFixed(2)}`
    
    const result = {
      content,
      data: {
        type: 'conversions_summary',
        metrics: { conversions: totalConversions, spend: totalSpend, revenue: totalRevenue, cpa },
        query: query
      }
    }
    
    updateConversationContext(sessionId, query, result)
    return result
  }

  // CONVERSION RATE HANDLER (HIGH PRIORITY)
  if (lowerQuery.includes('conversion rate')) {
    const totalConversions = data.reduce((sum, row) => sum + row.metrics.conversions, 0)
    const totalClicks = data.reduce((sum, row) => sum + row.metrics.clicks, 0)
    const conversionRate = totalClicks > 0 ? totalConversions / totalClicks : 0
    
    const content = `📈 CONVERSION RATE:\n\n` +
      `🎯 Overall Conversion Rate: ${(conversionRate * 100).toFixed(2)}%\n` +
      `📊 Total Conversions: ${totalConversions.toLocaleString()}\n` +
      `🖱️ Total Clicks: ${totalClicks.toLocaleString()}`
    
    const result = {
      content,
      data: {
        type: 'conversion_rate',
        metrics: { conversionRate, conversions: totalConversions, clicks: totalClicks },
        query: query
      }
    }
    
    updateConversationContext(sessionId, query, result)
    return result
  }

  // AUDIENCE PERFORMANCE HANDLER (HIGH PRIORITY)
  if (lowerQuery.includes('audience performance') || lowerQuery.includes('audience')) {
    const audienceMetrics = data.reduce((acc, row) => {
      const audience = row.dimensions.audience
      if (!acc[audience]) {
        acc[audience] = { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 }
      }
      acc[audience].spend += row.metrics.spend
      acc[audience].revenue += row.metrics.revenue
      acc[audience].impressions += row.metrics.impressions
      acc[audience].clicks += row.metrics.clicks
      acc[audience].conversions += row.metrics.conversions
      return acc
    }, {} as any)
    
    const audienceAnalysis = Object.entries(audienceMetrics)
      .map(([audience, metrics]: [string, any]) => {
        const roas = metrics.spend > 0 ? metrics.revenue / metrics.spend : 0
        const ctr = metrics.impressions > 0 ? metrics.clicks / metrics.impressions : 0
        const cpa = metrics.conversions > 0 ? metrics.spend / metrics.conversions : 0
        return { audience, metrics: { ...metrics, roas, ctr, cpa } }
      })
      .sort((a, b) => b.metrics.roas - a.metrics.roas)
    
    const topAudience = audienceAnalysis[0]
    
    let content = `👥 AUDIENCE PERFORMANCE:\n\n` +
      `🏆 Top Performing Audience: ${topAudience.audience}\n` +
      `• ROAS: ${topAudience.metrics.roas.toFixed(2)}x\n` +
      `• Spend: $${topAudience.metrics.spend.toLocaleString()}\n` +
      `• Revenue: $${topAudience.metrics.revenue.toLocaleString()}\n` +
      `• Conversions: ${topAudience.metrics.conversions.toLocaleString()}\n\n` +
      `📊 All Audiences by ROAS:\n`
    
    audienceAnalysis.forEach((audience, index) => {
      content += `${index + 1}. ${audience.audience}: ${audience.metrics.roas.toFixed(2)}x ROAS\n`
    })
    
    const result = {
      content,
      data: {
        type: 'audience_performance',
        audiences: audienceAnalysis,
        top: topAudience.audience,
        query: query
      }
    }
    
    updateConversationContext(sessionId, query, result)
    return result
  }

  // EXECUTIVE SUMMARY ALTERNATIVE HANDLERS (HIGH PRIORITY)
  if (lowerQuery.includes('how are we doing overall') || lowerQuery.includes('big picture') || lowerQuery.includes('high-level overview')) {
    // Use the same logic as executive summary but with different triggers
    const totalSpend = data.reduce((sum, row) => sum + row.metrics.spend, 0)
    const totalRevenue = data.reduce((sum, row) => sum + row.metrics.revenue, 0)
    const totalImpressions = data.reduce((sum, row) => sum + row.metrics.impressions, 0)
    const totalClicks = data.reduce((sum, row) => sum + row.metrics.clicks, 0)
    const totalConversions = data.reduce((sum, row) => sum + row.metrics.conversions, 0)
    
    const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0
    const ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0
    const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0
    
    const content = `📊 OVERALL PERFORMANCE SUMMARY:\n\n` +
      `💰 Total Spend: $${totalSpend.toLocaleString()}\n` +
      `💵 Total Revenue: $${totalRevenue.toLocaleString()}\n` +
      `💎 Overall ROAS: ${roas.toFixed(2)}x\n` +
      `🎯 Total Conversions: ${totalConversions.toLocaleString()}\n` +
      `💸 Overall CPA: $${cpa.toFixed(2)}\n` +
      `📈 Overall CTR: ${(ctr * 100).toFixed(2)}%`
    
    const result = {
      content,
      data: {
        type: 'overall_summary',
        metrics: { spend: totalSpend, revenue: totalRevenue, roas, conversions: totalConversions, cpa, ctr },
        query: query
      }
    }
    
    updateConversationContext(sessionId, query, result)
    return result
  }

  // FINANCIAL PERFORMANCE HANDLER (HIGH PRIORITY)
  if (lowerQuery.includes('financial performance') || lowerQuery.includes('show me our financial')) {
    const totalSpend = data.reduce((sum, row) => sum + row.metrics.spend, 0)
    const totalRevenue = data.reduce((sum, row) => sum + row.metrics.revenue, 0)
    const totalConversions = data.reduce((sum, row) => sum + row.metrics.conversions, 0)
    const totalClicks = data.reduce((sum, row) => sum + row.metrics.clicks, 0)
    const totalImpressions = data.reduce((sum, row) => sum + row.metrics.impressions, 0)
    
    const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0
    const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0
    const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0
    const roi = totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0
    const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalSpend) / totalRevenue) * 100 : 0
    
    const content = `💰 FINANCIAL PERFORMANCE SUMMARY:\n\n` +
      `💵 Total Revenue: $${totalRevenue.toLocaleString()}\n` +
      `💰 Total Spend: $${totalSpend.toLocaleString()}\n` +
      `💎 Overall ROAS: ${roas.toFixed(2)}x\n` +
      `💸 Overall CPA: $${cpa.toFixed(2)}\n` +
      `🖱️ Overall CPC: $${cpc.toFixed(2)}\n` +
      `👁️ Overall CPM: $${cpm.toFixed(2)}\n` +
      `📈 ROI: ${roi.toFixed(2)}%\n` +
      `📊 Profit Margin: ${profitMargin.toFixed(2)}%`
    
    const result = {
      content,
      data: {
        type: 'financial_performance_summary',
        metrics: { spend: totalSpend, revenue: totalRevenue, roas, cpa, cpc, cpm, roi, profitMargin },
        query: query
      }
    }
    
    updateConversationContext(sessionId, query, result)
    return result
  }

  // PLATFORM ALTERNATIVE HANDLERS (HIGH PRIORITY)
  if (lowerQuery.includes('cm360') || lowerQuery.includes('how did cm360')) {
    const cm360Data = data.filter(row => row.dimensions.platform === 'CM360')
    
    if (cm360Data.length > 0) {
      const totalSpend = cm360Data.reduce((sum, row) => sum + row.metrics.spend, 0)
      const totalRevenue = cm360Data.reduce((sum, row) => sum + row.metrics.revenue, 0)
      const totalImpressions = cm360Data.reduce((sum, row) => sum + row.metrics.impressions, 0)
      const totalClicks = cm360Data.reduce((sum, row) => sum + row.metrics.clicks, 0)
      const totalConversions = cm360Data.reduce((sum, row) => sum + row.metrics.conversions, 0)
      
      const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0
      const ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0
      const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0
      
      const content = `📊 CM360 Performance:\n\n` +
        `💰 Spend: $${totalSpend.toLocaleString()}\n` +
        `💵 Revenue: $${totalRevenue.toLocaleString()}\n` +
        `📊 Impressions: ${totalImpressions.toLocaleString()}\n` +
        `🖱️ Clicks: ${totalClicks.toLocaleString()}\n` +
        `🎯 Conversions: ${totalConversions.toLocaleString()}\n` +
        `📈 CTR: ${(ctr * 100).toFixed(2)}%\n` +
        `💎 ROAS: ${roas.toFixed(2)}x\n` +
        `💸 CPA: $${cpa.toFixed(2)}`
      
      const result = {
        content,
        data: {
          type: 'platform_performance',
          platform: 'CM360',
          metrics: { spend: totalSpend, revenue: totalRevenue, impressions: totalImpressions, clicks: totalClicks, conversions: totalConversions, roas, ctr, cpa },
          query: query
        }
      }
      
      updateConversationContext(sessionId, query, result)
      return result
    }
  }

  if (lowerQuery.includes('platform should i focus on') || lowerQuery.includes('platform comparison') || lowerQuery.includes('show me platform comparison')) {
    // Use the same logic as platform comparison
    const platformMetrics = data.reduce((acc, row) => {
      const platform = row.dimensions.platform
      if (!acc[platform]) {
        acc[platform] = { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 }
      }
      acc[platform].spend += row.metrics.spend
      acc[platform].revenue += row.metrics.revenue
      acc[platform].impressions += row.metrics.impressions
      acc[platform].clicks += row.metrics.clicks
      acc[platform].conversions += row.metrics.conversions
      return acc
    }, {} as any)
    
    const platformAnalysis = Object.entries(platformMetrics)
      .map(([platform, metrics]: [string, any]) => {
        const roas = metrics.spend > 0 ? metrics.revenue / metrics.spend : 0
        const ctr = metrics.impressions > 0 ? metrics.clicks / metrics.impressions : 0
        const cpa = metrics.conversions > 0 ? metrics.spend / metrics.conversions : 0
        return { platform, metrics: { ...metrics, roas, ctr, cpa } }
      })
      .sort((a, b) => b.metrics.roas - a.metrics.roas)
    
    const topPlatform = platformAnalysis[0]
    const bottomPlatform = platformAnalysis[platformAnalysis.length - 1]
    
    let content = `🏆 PLATFORM COMPARISON:\n\n` +
      `🥇 Top Platform: ${topPlatform.platform}\n` +
      `• ROAS: ${topPlatform.metrics.roas.toFixed(2)}x\n` +
      `• Spend: $${topPlatform.metrics.spend.toLocaleString()}\n` +
      `• Revenue: $${topPlatform.metrics.revenue.toLocaleString()}\n\n` +
      `📊 All Platforms by ROAS:\n`
    
    platformAnalysis.forEach((platform, index) => {
      content += `${index + 1}. ${platform.platform}: ${platform.metrics.roas.toFixed(2)}x ROAS\n`
    })
    
    const result = {
      content,
      data: {
        type: 'platform_comparison',
        platforms: platformAnalysis,
        top: topPlatform.platform,
        bottom: bottomPlatform.platform,
        query: query
      }
    }
    
    updateConversationContext(sessionId, query, result)
    return result
  }

  // CAMPAIGN ALTERNATIVE HANDLERS (HIGH PRIORITY)
  if (lowerQuery.includes('campaigns are doing well') || lowerQuery.includes('campaigns performing') || lowerQuery.includes('performance of each campaign')) {
    // Use the same logic as campaign analysis
    const campaignMetrics = data.reduce((acc, row) => {
      const campaign = row.dimensions.campaign
      if (!acc[campaign]) {
        acc[campaign] = { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 }
      }
      acc[campaign].spend += row.metrics.spend
      acc[campaign].revenue += row.metrics.revenue
      acc[campaign].impressions += row.metrics.impressions
      acc[campaign].clicks += row.metrics.clicks
      acc[campaign].conversions += row.metrics.conversions
      return acc
    }, {} as any)
    
    const campaignAnalysis = Object.entries(campaignMetrics)
      .map(([campaign, metrics]: [string, any]) => {
        const roas = metrics.spend > 0 ? metrics.revenue / metrics.spend : 0
        const ctr = metrics.impressions > 0 ? metrics.clicks / metrics.impressions : 0
        const cpa = metrics.conversions > 0 ? metrics.spend / metrics.conversions : 0
        return { campaign, metrics: { ...metrics, roas, ctr, cpa } }
      })
      .sort((a, b) => b.metrics.roas - a.metrics.roas)
    
    const bestCampaign = campaignAnalysis[0]
    
    let content = `🎯 CAMPAIGN PERFORMANCE:\n\n` +
      `🏆 Best Campaign: ${bestCampaign.campaign}\n` +
      `• ROAS: ${bestCampaign.metrics.roas.toFixed(2)}x\n` +
      `• Spend: $${bestCampaign.metrics.spend.toLocaleString()}\n` +
      `• Revenue: $${bestCampaign.metrics.revenue.toLocaleString()}\n\n` +
      `📊 All Campaigns by ROAS:\n`
    
    campaignAnalysis.forEach((campaign, index) => {
      content += `${index + 1}. ${campaign.campaign}: ${campaign.metrics.roas.toFixed(2)}x ROAS\n`
    })
    
    const result = {
      content,
      data: {
        type: 'campaign_performance',
        campaigns: campaignAnalysis,
        best: bestCampaign.campaign,
        query: query
      }
    }
    
    updateConversationContext(sessionId, query, result)
    return result
  }

  // CREATIVE PERFORMANCE HANDLER (HIGH PRIORITY)
  if (lowerQuery.includes('creative') || lowerQuery.includes('creatives')) {
    const totalImpressions = data.reduce((sum, row) => sum + row.metrics.impressions, 0)
    const totalClicks = data.reduce((sum, row) => sum + row.metrics.clicks, 0)
    const totalConversions = data.reduce((sum, row) => sum + row.metrics.conversions, 0)
    const totalSpend = data.reduce((sum, row) => sum + row.metrics.spend, 0)
    const totalRevenue = data.reduce((sum, row) => sum + row.metrics.revenue, 0)
    
    const ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0
    const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0
    const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0
    
    const content = `🎨 CREATIVE PERFORMANCE:\n\n` +
      `📊 Overall Metrics:\n` +
      `• Impressions: ${totalImpressions.toLocaleString()}\n` +
      `• Clicks: ${totalClicks.toLocaleString()}\n` +
      `• Conversions: ${totalConversions.toLocaleString()}\n` +
      `• CTR: ${(ctr * 100).toFixed(2)}%\n` +
      `• ROAS: ${roas.toFixed(2)}x\n` +
      `• CPA: $${cpa.toFixed(2)}\n\n` +
      `💡 Creative Performance Insights:\n` +
      `• Your creatives are generating ${totalConversions.toLocaleString()} conversions\n` +
      `• Average cost per conversion is $${cpa.toFixed(2)}\n` +
      `• Overall ROAS of ${roas.toFixed(2)}x indicates ${roas > 2 ? 'strong' : 'moderate'} performance`
    
    const result = {
      content,
      data: {
        type: 'creative_performance',
        metrics: { impressions: totalImpressions, clicks: totalClicks, conversions: totalConversions, spend: totalSpend, revenue: totalRevenue, ctr, roas, cpa },
        query: query
      }
    }
    
    updateConversationContext(sessionId, query, result)
    return result
  }



  // OPPORTUNITIES & OPTIMIZATION HANDLERS (HIGH PRIORITY)
  if (lowerQuery.includes('opportunities') || lowerQuery.includes('biggest opportunities') || 
      lowerQuery.includes('where should we put more money') || lowerQuery.includes('focus on improving')) {
    
    // Analyze platform performance for opportunities
    const platformMetrics = data.reduce((acc, row) => {
      const platform = row.dimensions.platform
      if (!acc[platform]) {
        acc[platform] = { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 }
      }
      acc[platform].spend += row.metrics.spend
      acc[platform].revenue += row.metrics.revenue
      acc[platform].impressions += row.metrics.impressions
      acc[platform].clicks += row.metrics.clicks
      acc[platform].conversions += row.metrics.conversions
      return acc
    }, {} as any)
    
    const platformAnalysis = Object.entries(platformMetrics)
      .map(([platform, metrics]: [string, any]) => {
        const roas = metrics.spend > 0 ? metrics.revenue / metrics.spend : 0
        const ctr = metrics.impressions > 0 ? metrics.clicks / metrics.impressions : 0
        const cpa = metrics.conversions > 0 ? metrics.spend / metrics.conversions : 0
        return { platform, metrics: { ...metrics, roas, ctr, cpa } }
      })
      .sort((a, b) => b.metrics.roas - a.metrics.roas)
    
    const bestPlatform = platformAnalysis[0]
    const worstPlatform = platformAnalysis[platformAnalysis.length - 1]
    
    const content = `💡 OPTIMIZATION OPPORTUNITIES:\n\n` +
      `🚀 **Scale Up**: ${bestPlatform.platform}\n` +
      `• Current ROAS: ${bestPlatform.metrics.roas.toFixed(2)}x\n` +
      `• Current Spend: $${bestPlatform.metrics.spend.toLocaleString()}\n` +
      `• Opportunity: Increase budget allocation\n\n` +
      `🔧 **Optimize**: ${worstPlatform.platform}\n` +
      `• Current ROAS: ${worstPlatform.metrics.roas.toFixed(2)}x\n` +
      `• Current Spend: $${worstPlatform.metrics.spend.toLocaleString()}\n` +
      `• Action: Review targeting and creative strategy\n\n` +
      `📊 **Platform Rankings by ROAS**:\n` +
      platformAnalysis.map((p, i) => `${i + 1}. ${p.platform}: ${p.metrics.roas.toFixed(2)}x`).join('\n')
    
    const result = {
      content,
      data: {
        type: 'optimization_opportunities',
        platforms: platformAnalysis,
        best: bestPlatform.platform,
        worst: worstPlatform.platform,
        query: query
      }
    }
    
    updateConversationContext(sessionId, query, result)
    return result
  }

  // SPEND & FINANCIAL METRICS HANDLERS
  if (lowerQuery.includes('spend') || lowerQuery.includes('roas') || lowerQuery.includes('cpm') || lowerQuery.includes('cpc')) {
    if (lowerQuery.includes('spend') && (lowerQuery.includes('achieve') || lowerQuery.includes('numbers') || lowerQuery.includes('total'))) {
      const totalSpend = data.reduce((sum, row) => sum + row.metrics.spend, 0)
      const totalRevenue = data.reduce((sum, row) => sum + row.metrics.revenue, 0)
      const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0
      
      const content = `💰 Total Spend: $${totalSpend.toLocaleString()}\n` +
        `💵 Total Revenue: $${totalRevenue.toLocaleString()}\n` +
        `💎 Overall ROAS: ${roas.toFixed(2)}x`
      
      const result = {
        content,
        data: {
          type: 'financial_summary',
          metrics: { spend: totalSpend, revenue: totalRevenue, roas },
          query: query
        }
      }
      
      updateConversationContext(sessionId, query, result)
      return result
    }
    
    if (lowerQuery.includes('roas') || lowerQuery.includes('return on ad spend')) {
      const totalSpend = data.reduce((sum, row) => sum + row.metrics.spend, 0)
      const totalRevenue = data.reduce((sum, row) => sum + row.metrics.revenue, 0)
      const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0
      
      const content = `💎 Overall ROAS: ${roas.toFixed(2)}x\n` +
        `💰 Total Spend: $${totalSpend.toLocaleString()}\n` +
        `💵 Total Revenue: $${totalRevenue.toLocaleString()}`
      
      const result = {
        content,
        data: {
          type: 'roas_summary',
          metrics: { spend: totalSpend, revenue: totalRevenue, roas },
          query: query
        }
      }
      
      updateConversationContext(sessionId, query, result)
      return result
    }
  }

  // CAMPAIGN PERFORMANCE HANDLERS
  if (lowerQuery.includes('campaign') && lowerQuery.includes('performance')) {
    const campaigns = ['FreshNest Summer Grilling', 'FreshNest Back to School', 'FreshNest Holiday Recipes', 'FreshNest Pantry Staples']
    
    for (const campaign of campaigns) {
      if (lowerQuery.includes(campaign.toLowerCase())) {
        const campaignData = data.filter(row => row.dimensions.campaign === campaign)
        
        if (campaignData.length > 0) {
          const totalSpend = campaignData.reduce((sum, row) => sum + row.metrics.spend, 0)
          const totalRevenue = campaignData.reduce((sum, row) => sum + row.metrics.revenue, 0)
          const totalImpressions = campaignData.reduce((sum, row) => sum + row.metrics.impressions, 0)
          const totalClicks = campaignData.reduce((sum, row) => sum + row.metrics.clicks, 0)
          const totalConversions = campaignData.reduce((sum, row) => sum + row.metrics.conversions, 0)
          
          const ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0
          const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0
          const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0
          
          const content = `${campaign} Performance:\n\n` +
            `💰 Spend: $${totalSpend.toLocaleString()}\n` +
            `💵 Revenue: $${totalRevenue.toLocaleString()}\n` +
            `📊 Impressions: ${totalImpressions.toLocaleString()}\n` +
            `🖱️ Clicks: ${totalClicks.toLocaleString()}\n` +
            `🎯 Conversions: ${totalConversions.toLocaleString()}\n` +
            `📈 CTR: ${(ctr * 100).toFixed(2)}%\n` +
            `💎 ROAS: ${roas.toFixed(2)}x\n` +
            `💸 CPA: $${cpa.toFixed(2)}`
          
          const result = {
            content,
            data: {
              type: 'campaign_performance',
              campaign,
              metrics: {
                spend: totalSpend,
                revenue: totalRevenue,
                impressions: totalImpressions,
                clicks: totalClicks,
                conversions: totalConversions,
                ctr,
                roas,
                cpa
              },
              query: query
            }
          }
          
          updateConversationContext(sessionId, query, result)
          return result
        }
      }
    }
  }

  // SPECIFIC CAMPAIGN HANDLER (HIGHEST PRIORITY)
  if (lowerQuery.includes('freshnest summer grilling performance')) {
    const campaignData = data.filter(row => row.dimensions.campaign === 'FreshNest Summer Grilling')
    
    if (campaignData.length > 0) {
      const totalSpend = campaignData.reduce((sum, row) => sum + row.metrics.spend, 0)
      const totalRevenue = campaignData.reduce((sum, row) => sum + row.metrics.revenue, 0)
      const totalImpressions = campaignData.reduce((sum, row) => sum + row.metrics.impressions, 0)
      const totalClicks = campaignData.reduce((sum, row) => sum + row.metrics.clicks, 0)
      const totalConversions = campaignData.reduce((sum, row) => sum + row.metrics.conversions, 0)
      
      const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0
      const ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0
      const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0
      
      const content = `🎯 FreshNest Summer Grilling Performance:\n\n` +
        `💰 Spend: $${totalSpend.toLocaleString()}\n` +
        `💵 Revenue: $${totalRevenue.toLocaleString()}\n` +
        `📊 Impressions: ${totalImpressions.toLocaleString()}\n` +
        `🖱️ Clicks: ${totalClicks.toLocaleString()}\n` +
        `🎯 Conversions: ${totalConversions.toLocaleString()}\n` +
        `📈 CTR: ${(ctr * 100).toFixed(2)}%\n` +
        `💎 ROAS: ${roas.toFixed(2)}x\n` +
        `💸 CPA: $${cpa.toFixed(2)}`
      
      const result = {
        content,
        data: {
          type: 'specific_campaign_performance',
          campaign: 'FreshNest Summer Grilling',
          metrics: { spend: totalSpend, revenue: totalRevenue, impressions: totalImpressions, clicks: totalClicks, conversions: totalConversions, roas, ctr, cpa },
          query: query
        }
      }
      
      updateConversationContext(sessionId, query, result)
      return result
    }
  }

  // EXECUTIVE SUMMARY HANDLERS (HIGH PRIORITY - BEFORE TIME HANDLERS)
  if (lowerQuery.includes('executive summary') || lowerQuery.includes('comprehensive summary') || lowerQuery.includes('overall performance') || lowerQuery.includes('key metrics') || lowerQuery.includes('summary of our campaigns') || lowerQuery.includes('performance overview')) {
    
    // Data context analysis
    const uniqueBrands = Array.from(new Set(data.map(row => row.dimensions.brand)))
    const uniqueCampaigns = Array.from(new Set(data.map(row => row.dimensions.campaign)))
    const uniquePlatforms = Array.from(new Set(data.map(row => row.dimensions.platform)))
    const uniqueAudiences = Array.from(new Set(data.map(row => row.dimensions.audience)))
    
    // Date range analysis
    const dates = data.map(row => new Date(row.date)).sort((a, b) => a.getTime() - b.getTime())
    const startDate = dates[0]
    const endDate = dates[dates.length - 1]
    const dateRange = `${startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
    
    // Core metrics calculation
    const totalSpend = data.reduce((sum, row) => sum + row.metrics.spend, 0)
    const totalRevenue = data.reduce((sum, row) => sum + row.metrics.revenue, 0)
    const totalImpressions = data.reduce((sum, row) => sum + row.metrics.impressions, 0)
    const totalClicks = data.reduce((sum, row) => sum + row.metrics.clicks, 0)
    const totalConversions = data.reduce((sum, row) => sum + row.metrics.conversions, 0)
    
    const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0
    const ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0
    const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0
    
    // Platform breakdown
    const platformMetrics = data.reduce((acc, row) => {
      const platform = row.dimensions.platform
      if (!acc[platform]) {
        acc[platform] = { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 }
      }
      acc[platform].spend += row.metrics.spend
      acc[platform].revenue += row.metrics.revenue
      acc[platform].impressions += row.metrics.impressions
      acc[platform].clicks += row.metrics.clicks
      acc[platform].conversions += row.metrics.conversions
      return acc
    }, {} as any)
    
    const platformAnalysis = Object.entries(platformMetrics)
      .map(([platform, metrics]: [string, any]) => {
        const platformRoas = metrics.spend > 0 ? metrics.revenue / metrics.spend : 0
        const platformCtr = metrics.impressions > 0 ? metrics.clicks / metrics.impressions : 0
        return { platform, metrics: { ...metrics, roas: platformRoas, ctr: platformCtr } }
      })
      .sort((a, b) => b.metrics.roas - a.metrics.roas)
    
    const topPlatform = platformAnalysis[0]
    const bottomPlatform = platformAnalysis[platformAnalysis.length - 1]
    
    // Campaign breakdown
    const campaignMetrics = data.reduce((acc, row) => {
      const campaign = row.dimensions.campaign
      if (!acc[campaign]) {
        acc[campaign] = { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 }
      }
      acc[campaign].spend += row.metrics.spend
      acc[campaign].revenue += row.metrics.revenue
      acc[campaign].impressions += row.metrics.impressions
      acc[campaign].clicks += row.metrics.clicks
      acc[campaign].conversions += row.metrics.conversions
      return acc
    }, {} as any)
    
    const campaignAnalysis = Object.entries(campaignMetrics)
      .map(([campaign, metrics]: [string, any]) => {
        const campaignRoas = metrics.spend > 0 ? metrics.revenue / metrics.spend : 0
        const campaignCtr = metrics.impressions > 0 ? metrics.clicks / metrics.impressions : 0
        return { campaign, metrics: { ...metrics, roas: campaignRoas, ctr: campaignCtr } }
      })
      .sort((a, b) => b.metrics.roas - a.metrics.roas)
    
    const topCampaign = campaignAnalysis[0]
    const bottomCampaign = campaignAnalysis[campaignAnalysis.length - 1]
    
    const content = `📊 EXECUTIVE SUMMARY\n\n` +
      `📅 **Data Context**:\n` +
      `• Time Period: ${dateRange}\n` +
      `• Brands: ${uniqueBrands.join(', ')}\n` +
      `• Campaigns: ${uniqueCampaigns.length} campaigns across ${uniquePlatforms.length} platforms\n` +
      `• Audiences: ${uniqueAudiences.length} target segments\n\n` +
      `💰 **Financial Performance**:\n` +
      `• Total Spend: $${totalSpend.toLocaleString()}\n` +
      `• Total Revenue: $${totalRevenue.toLocaleString()}\n` +
      `• Overall ROAS: ${roas.toFixed(2)}x\n` +
      `• Overall CPA: $${cpa.toFixed(2)}\n\n` +
      `📈 **Engagement Metrics**:\n` +
      `• Total Impressions: ${totalImpressions.toLocaleString()}\n` +
      `• Total Clicks: ${totalClicks.toLocaleString()}\n` +
      `• Total Conversions: ${totalConversions.toLocaleString()}\n` +
      `• Overall CTR: ${(ctr * 100).toFixed(2)}%\n\n` +
      `🏆 **Top Performers**:\n` +
      `• Best Platform: ${topPlatform.platform} (${topPlatform.metrics.roas.toFixed(2)}x ROAS)\n` +
      `• Best Campaign: ${topCampaign.campaign} (${topCampaign.metrics.roas.toFixed(2)}x ROAS)\n\n` +
      `📉 **Opportunities**:\n` +
      `• Platform to Optimize: ${bottomPlatform.platform} (${bottomPlatform.metrics.roas.toFixed(2)}x ROAS)\n` +
      `• Campaign to Review: ${bottomCampaign.campaign} (${bottomCampaign.metrics.roas.toFixed(2)}x ROAS)\n\n` +
      `🌐 **Platform Breakdown**:\n` +
      platformAnalysis.map((p, i) => 
        `${i + 1}. ${p.platform}: $${p.metrics.spend.toLocaleString()} spend, ${p.metrics.roas.toFixed(2)}x ROAS, ${(p.metrics.ctr * 100).toFixed(2)}% CTR`
      ).join('\n')
    
    const result = {
      content,
      data: {
        type: 'executive_summary',
        context: {
          dateRange,
          brands: uniqueBrands,
          campaigns: uniqueCampaigns,
          platforms: uniquePlatforms,
          audiences: uniqueAudiences
        },
        metrics: {
          spend: totalSpend,
          revenue: totalRevenue,
          impressions: totalImpressions,
          clicks: totalClicks,
          conversions: totalConversions,
          roas,
          ctr,
          cpa
        },
        platforms: platformAnalysis,
        campaigns: campaignAnalysis,
        topPerformers: {
          platform: topPlatform.platform,
          campaign: topCampaign.campaign
        },
        opportunities: {
          platform: bottomPlatform.platform,
          campaign: bottomCampaign.campaign
        },
        query: query
      }
    }
    
    updateConversationContext(sessionId, query, result)
    return result
  }

  // COMPARATIVE ANALYSIS HANDLERS
  if (lowerQuery.includes('compare') || lowerQuery.includes('which') && lowerQuery.includes('best') || 
      lowerQuery.includes('top performing') || lowerQuery.includes('doing the best')) {
    
    // Platform comparison
    if (lowerQuery.includes('platform')) {
      const platformMetrics = data.reduce((acc, row) => {
        const platform = row.dimensions.platform
        if (!acc[platform]) {
          acc[platform] = { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 }
        }
        acc[platform].spend += row.metrics.spend
        acc[platform].revenue += row.metrics.revenue
        acc[platform].impressions += row.metrics.impressions
        acc[platform].clicks += row.metrics.clicks
        acc[platform].conversions += row.metrics.conversions
        return acc
      }, {} as any)
      
      const platformComparison = Object.entries(platformMetrics)
        .map(([platform, metrics]: [string, any]) => {
          const roas = metrics.spend > 0 ? metrics.revenue / metrics.spend : 0
          const ctr = metrics.impressions > 0 ? metrics.clicks / metrics.impressions : 0
          const cpa = metrics.conversions > 0 ? metrics.spend / metrics.conversions : 0
          return { platform, metrics: { ...metrics, roas, ctr, cpa } }
        })
        .sort((a, b) => b.metrics.roas - a.metrics.roas)
      
      const topPlatform = platformComparison[0]
      const content = `🏆 PLATFORM COMPARISON (Ranked by ROAS):\n\n` +
        platformComparison.map((p, i) => 
          `${i + 1}. ${p.platform}: ${p.metrics.roas.toFixed(2)}x ROAS, $${p.metrics.spend.toLocaleString()} spend`
        ).join('\n') +
        `\n\n🎯 **Top Performer**: ${topPlatform.platform} with ${topPlatform.metrics.roas.toFixed(2)}x ROAS`
      
      const result = {
        content,
        data: {
          type: 'platform_comparison',
          platforms: platformComparison,
          topPlatform: topPlatform.platform,
          query: query
        }
      }
      
      updateConversationContext(sessionId, query, result)
      return result
    }
    
    // Campaign comparison
    if (lowerQuery.includes('campaign')) {
      const campaignMetrics = data.reduce((acc, row) => {
        const campaign = row.dimensions.campaign
        if (!acc[campaign]) {
          acc[campaign] = { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 }
        }
        acc[campaign].spend += row.metrics.spend
        acc[campaign].revenue += row.metrics.revenue
        acc[campaign].impressions += row.metrics.impressions
        acc[campaign].clicks += row.metrics.clicks
        acc[campaign].conversions += row.metrics.conversions
        return acc
      }, {} as any)
      
      const campaignComparison = Object.entries(campaignMetrics)
        .map(([campaign, metrics]: [string, any]) => {
          const roas = metrics.spend > 0 ? metrics.revenue / metrics.spend : 0
          const ctr = metrics.impressions > 0 ? metrics.clicks / metrics.impressions : 0
          const cpa = metrics.conversions > 0 ? metrics.spend / metrics.conversions : 0
          return { campaign, metrics: { ...metrics, roas, ctr, cpa } }
        })
        .sort((a, b) => b.metrics.roas - a.metrics.roas)
      
      const topCampaign = campaignComparison[0]
      const content = `🏆 CAMPAIGN COMPARISON (Ranked by ROAS):\n\n` +
        campaignComparison.map((c, i) => 
          `${i + 1}. ${c.campaign}: ${c.metrics.roas.toFixed(2)}x ROAS, $${c.metrics.spend.toLocaleString()} spend`
        ).join('\n') +
        `\n\n🎯 **Top Performer**: ${topCampaign.campaign} with ${topCampaign.metrics.roas.toFixed(2)}x ROAS`
      
      const result = {
        content,
        data: {
          type: 'campaign_comparison',
          campaigns: campaignComparison,
          topCampaign: topCampaign.campaign,
          query: query
        }
      }
      
      updateConversationContext(sessionId, query, result)
      return result
    }
  }

  // SPECIFIC METRICS HANDLERS
  if (lowerQuery.includes('impressions') || lowerQuery.includes('clicks') || lowerQuery.includes('conversions') || 
      lowerQuery.includes('ctr') || lowerQuery.includes('click-through rate')) {
    
    const totalImpressions = data.reduce((sum, row) => sum + row.metrics.impressions, 0)
    const totalClicks = data.reduce((sum, row) => sum + row.metrics.clicks, 0)
    const totalConversions = data.reduce((sum, row) => sum + row.metrics.conversions, 0)
    const ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0
    
    const content = `📊 ENGAGEMENT METRICS:\n\n` +
      `📈 Total Impressions: ${totalImpressions.toLocaleString()}\n` +
      `🖱️ Total Clicks: ${totalClicks.toLocaleString()}\n` +
      `🎯 Total Conversions: ${totalConversions.toLocaleString()}\n` +
      `📊 Overall CTR: ${(ctr * 100).toFixed(2)}%`
    
    const result = {
      content,
      data: {
        type: 'engagement_metrics',
        metrics: {
          impressions: totalImpressions,
          clicks: totalClicks,
          conversions: totalConversions,
          ctr
        },
        query: query
      }
    }
    
    updateConversationContext(sessionId, query, result)
    return result
  }

  // WEEKLY PERFORMANCE HANDLERS
  if (lowerQuery.includes('week') || lowerQuery.includes('weekly') || lowerQuery.includes('week 1') || 
      lowerQuery.includes('week 2') || lowerQuery.includes('week 3') || lowerQuery.includes('week 4')) {
    
    // Extract week number if specified
    let targetWeek = null
    if (lowerQuery.includes('week 1')) targetWeek = 1
    else if (lowerQuery.includes('week 2')) targetWeek = 2
    else if (lowerQuery.includes('week 3')) targetWeek = 3
    else if (lowerQuery.includes('week 4')) targetWeek = 4
    
    const weekRanges: Record<number, { start: string; end: string }> = {
      1: { start: '2024-06-01', end: '2024-06-07' },
      2: { start: '2024-06-08', end: '2024-06-14' },
      3: { start: '2024-06-15', end: '2024-06-21' },
      4: { start: '2024-06-22', end: '2024-06-30' }
    }
    
    if (targetWeek) {
      const range = weekRanges[targetWeek]
      const weekData = data.filter(row => {
        const rowDate = new Date(row.date)
        const startDate = new Date(range.start)
        const endDate = new Date(range.end)
        return rowDate >= startDate && rowDate <= endDate
      })
      
      if (weekData.length > 0) {
        const totalSpend = weekData.reduce((sum, row) => sum + row.metrics.spend, 0)
        const totalRevenue = weekData.reduce((sum, row) => sum + row.metrics.revenue, 0)
        const totalImpressions = weekData.reduce((sum, row) => sum + row.metrics.impressions, 0)
        const totalClicks = weekData.reduce((sum, row) => sum + row.metrics.clicks, 0)
        const totalConversions = weekData.reduce((sum, row) => sum + row.metrics.conversions, 0)
        
        const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0
        const ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0
        const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0
        
        const content = `📅 **Week ${targetWeek} Performance (${range.start} to ${range.end})**:\n\n` +
          `💰 **Financial Metrics**:\n` +
          `• Total Spend: $${totalSpend.toLocaleString()}\n` +
          `• Total Revenue: $${totalRevenue.toLocaleString()}\n` +
          `• ROAS: ${roas.toFixed(2)}x\n` +
          `• CPA: $${cpa.toFixed(2)}\n\n` +
          `📈 **Engagement Metrics**:\n` +
          `• Impressions: ${totalImpressions.toLocaleString()}\n` +
          `• Clicks: ${totalClicks.toLocaleString()}\n` +
          `• Conversions: ${totalConversions.toLocaleString()}\n` +
          `• CTR: ${(ctr * 100).toFixed(2)}%\n\n` +
          `📊 **Data Points**: ${weekData.length} daily records`
        
        const result = {
          content,
          data: {
            type: 'weekly_performance',
            week: targetWeek,
            dateRange: range,
            metrics: {
              spend: totalSpend,
              revenue: totalRevenue,
              impressions: totalImpressions,
              clicks: totalClicks,
              conversions: totalConversions,
              roas,
              ctr,
              cpa
            },
            dataPoints: weekData.length,
            query: query
          }
        }
        
        updateConversationContext(sessionId, query, result)
        return result
      }
    } else {
      // Show all weeks comparison
      const weeklyData: Record<number, { spend: number; revenue: number; roas: number; dataPoints: number }> = {}
      for (let week = 1; week <= 4; week++) {
        const range = weekRanges[week]
        const weekData = data.filter(row => {
          const rowDate = new Date(row.date)
          const startDate = new Date(range.start)
          const endDate = new Date(range.end)
          return rowDate >= startDate && rowDate <= endDate
        })
        
        const totalSpend = weekData.reduce((sum, row) => sum + row.metrics.spend, 0)
        const totalRevenue = weekData.reduce((sum, row) => sum + row.metrics.revenue, 0)
        const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0
        
        weeklyData[week] = { spend: totalSpend, revenue: totalRevenue, roas, dataPoints: weekData.length }
      }
      
      const content = `📅 **Weekly Performance Comparison (June 2024)**:\n\n` +
        Object.entries(weeklyData).map(([week, metrics]: [string, any]) => 
          `**Week ${week}** (${weekRanges[parseInt(week)].start} to ${weekRanges[parseInt(week)].end}):\n` +
          `• Spend: $${metrics.spend.toLocaleString()}\n` +
          `• Revenue: $${metrics.revenue.toLocaleString()}\n` +
          `• ROAS: ${metrics.roas.toFixed(2)}x\n` +
          `• Data Points: ${metrics.dataPoints}\n`
        ).join('\n')
      
      const result = {
        content,
        data: {
          type: 'weekly_comparison',
          weeklyData,
          query: query,
          chartData: Object.entries(weeklyData).map(([week, metrics]: [string, any]) => ({
            week: `Week ${week}`,
            spend: metrics.spend,
            revenue: metrics.revenue,
            roas: metrics.roas
          }))
        }
      }
      
      updateConversationContext(sessionId, query, result)
      return result
    }
  }

  // OPTIMIZATION & INSIGHTS HANDLERS
  if (lowerQuery.includes('optimize') || lowerQuery.includes('improve') || lowerQuery.includes('recommendations') ||
      lowerQuery.includes('insights') || lowerQuery.includes('trends') || lowerQuery.includes('patterns')) {
    
    const platformMetrics = data.reduce((acc, row) => {
      const platform = row.dimensions.platform
      if (!acc[platform]) {
        acc[platform] = { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 }
      }
      acc[platform].spend += row.metrics.spend
      acc[platform].revenue += row.metrics.revenue
      acc[platform].impressions += row.metrics.impressions
      acc[platform].clicks += row.metrics.clicks
      acc[platform].conversions += row.metrics.conversions
      return acc
    }, {} as any)
    
    const platformAnalysis = Object.entries(platformMetrics)
      .map(([platform, metrics]: [string, any]) => {
        const roas = metrics.spend > 0 ? metrics.revenue / metrics.spend : 0
        const ctr = metrics.impressions > 0 ? metrics.clicks / metrics.impressions : 0
        const cpa = metrics.conversions > 0 ? metrics.spend / metrics.conversions : 0
        return { platform, metrics: { ...metrics, roas, ctr, cpa } }
      })
      .sort((a, b) => b.metrics.roas - a.metrics.roas)
    
    const topPlatform = platformAnalysis[0]
    const bottomPlatform = platformAnalysis[platformAnalysis.length - 1]
    
    const content = `🎯 OPTIMIZATION INSIGHTS:\n\n` +
      `🏆 **Best Performing Platform**: ${topPlatform.platform}\n` +
      `• ROAS: ${topPlatform.metrics.roas.toFixed(2)}x\n` +
      `• CTR: ${(topPlatform.metrics.ctr * 100).toFixed(2)}%\n` +
      `• CPA: $${topPlatform.metrics.cpa.toFixed(2)}\n\n` +
      `📉 **Opportunity for Improvement**: ${bottomPlatform.platform}\n` +
      `• ROAS: ${bottomPlatform.metrics.roas.toFixed(2)}x\n` +
      `• CTR: ${(bottomPlatform.metrics.ctr * 100).toFixed(2)}%\n` +
      `• CPA: $${bottomPlatform.metrics.cpa.toFixed(2)}\n\n` +
      `💡 **Recommendations**:\n` +
      `1. Increase budget allocation to ${topPlatform.platform}\n` +
      `2. Review and optimize ${bottomPlatform.platform} strategy\n` +
      `3. Apply successful tactics from ${topPlatform.platform} to other platforms`
    
    const result = {
      content,
      data: {
        type: 'optimization_insights',
        platforms: platformAnalysis,
        topPlatform: topPlatform.platform,
        bottomPlatform: bottomPlatform.platform,
        query: query
      }
    }
    
    updateConversationContext(sessionId, query, result)
    return result
  }

  // CREATIVE OPTIMIZATION HANDLER (HIGH PRIORITY)
  if (lowerQuery.includes('creative optimization') || lowerQuery.includes('creative optimizations')) {
    const creativeMetrics = data.reduce((acc, row) => {
      const format = row.dimensions.creative_format
      if (!acc[format]) {
        acc[format] = { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 }
      }
      acc[format].spend += row.metrics.spend
      acc[format].revenue += row.metrics.revenue
      acc[format].impressions += row.metrics.impressions
      acc[format].clicks += row.metrics.clicks
      acc[format].conversions += row.metrics.conversions
      return acc
    }, {} as any)
    
    const creativeAnalysis = Object.entries(creativeMetrics)
      .map(([format, metrics]: [string, any]) => {
        const roas = metrics.spend > 0 ? metrics.revenue / metrics.spend : 0
        const ctr = metrics.impressions > 0 ? metrics.clicks / metrics.impressions : 0
        const cpa = metrics.conversions > 0 ? metrics.spend / metrics.conversions : 0
        return { format, metrics: { ...metrics, roas, ctr, cpa } }
      })
      .sort((a, b) => b.metrics.roas - a.metrics.roas)
    
    const bestFormat = creativeAnalysis[0]
    const worstFormat = creativeAnalysis[creativeAnalysis.length - 1]
    
    const content = `🎨 CREATIVE OPTIMIZATION RECOMMENDATIONS:\n\n` +
      `🏆 Best Performing Format: ${bestFormat.format}\n` +
      `• ROAS: ${bestFormat.metrics.roas.toFixed(2)}x\n` +
      `• CTR: ${(bestFormat.metrics.ctr * 100).toFixed(2)}%\n` +
      `• CPA: $${bestFormat.metrics.cpa.toFixed(2)}\n\n` +
      `📉 Format Needing Improvement: ${worstFormat.format}\n` +
      `• ROAS: ${worstFormat.metrics.roas.toFixed(2)}x\n` +
      `• CTR: ${(worstFormat.metrics.ctr * 100).toFixed(2)}%\n` +
      `• CPA: $${worstFormat.metrics.cpa.toFixed(2)}\n\n` +
      `💡 RECOMMENDATIONS:\n` +
      `• Scale up ${bestFormat.format} formats\n` +
      `• Optimize ${worstFormat.format} for better performance\n` +
      `• Test new creative variations in underperforming formats`
    
    const result = {
      content,
      data: {
        type: 'creative_optimization',
        creatives: creativeAnalysis,
        best: bestFormat.format,
        worst: worstFormat.format,
        query: query
      }
    }
    
    updateConversationContext(sessionId, query, result)
    return result
  }

  // CREATIVE CONVERSION ELEMENTS HANDLER (HIGH PRIORITY)
  if (lowerQuery.includes('creative elements') || lowerQuery.includes('drove the most conversions')) {
    const creativeMetrics = data.reduce((acc, row) => {
      const format = row.dimensions.creative_format
      if (!acc[format]) {
        acc[format] = { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 }
      }
      acc[format].spend += row.metrics.spend
      acc[format].revenue += row.metrics.revenue
      acc[format].impressions += row.metrics.impressions
      acc[format].clicks += row.metrics.clicks
      acc[format].conversions += row.metrics.conversions
      return acc
    }, {} as any)
    
    const conversionAnalysis = Object.entries(creativeMetrics)
      .map(([format, metrics]: [string, any]) => {
        const roas = metrics.spend > 0 ? metrics.revenue / metrics.spend : 0
        const ctr = metrics.impressions > 0 ? metrics.clicks / metrics.impressions : 0
        const cpa = metrics.conversions > 0 ? metrics.spend / metrics.conversions : 0
        const conversionRate = metrics.clicks > 0 ? metrics.conversions / metrics.clicks : 0
        return { format, metrics: { ...metrics, roas, ctr, cpa, conversionRate } }
      })
      .sort((a, b) => b.metrics.conversions - a.metrics.conversions)
    
    const topConverter = conversionAnalysis[0]
    
    let content = `🎯 CREATIVE ELEMENTS CONVERSION ANALYSIS:\n\n` +
      `🥇 Top Converting Format: ${topConverter.format}\n` +
      `• Total Conversions: ${topConverter.metrics.conversions.toLocaleString()}\n` +
      `• Conversion Rate: ${(topConverter.metrics.conversionRate * 100).toFixed(2)}%\n` +
      `• CPA: $${topConverter.metrics.cpa.toFixed(2)}\n` +
      `• ROAS: ${topConverter.metrics.roas.toFixed(2)}x\n\n` +
      `📊 All Formats by Conversions:\n`
    
    conversionAnalysis.forEach((format, index) => {
      content += `${index + 1}. ${format.format}: ${format.metrics.conversions.toLocaleString()} conversions\n`
    })
    
    const result = {
      content,
      data: {
        type: 'creative_conversion_elements',
        creatives: conversionAnalysis,
        top_converter: topConverter.format,
        query: query
      }
    }
    
    updateConversationContext(sessionId, query, result)
    return result
  }

  // CREATIVE PERFORMANCE BY PLATFORM HANDLER (HIGH PRIORITY)
  if (lowerQuery.includes('creative performance by platform') || lowerQuery.includes('creative by platform')) {
    const platformCreativeMetrics = data.reduce((acc, row) => {
      const platform = row.dimensions.platform
      const format = row.dimensions.creative_format
      const key = `${platform}-${format}`
      
      if (!acc[key]) {
        acc[key] = { platform, format, spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 }
      }
      acc[key].spend += row.metrics.spend
      acc[key].revenue += row.metrics.revenue
      acc[key].impressions += row.metrics.impressions
      acc[key].clicks += row.metrics.clicks
      acc[key].conversions += row.metrics.conversions
      return acc
    }, {} as any)
    
    const platformCreativeAnalysis = Object.entries(platformCreativeMetrics)
      .map(([key, metrics]: [string, any]) => {
        const roas = metrics.spend > 0 ? metrics.revenue / metrics.spend : 0
        const ctr = metrics.impressions > 0 ? metrics.clicks / metrics.impressions : 0
        const cpa = metrics.conversions > 0 ? metrics.spend / metrics.conversions : 0
        return { ...metrics, roas, ctr, cpa }
      })
      .sort((a, b) => b.roas - a.roas)
    
    let content = `🎨 CREATIVE PERFORMANCE BY PLATFORM:\n\n`
    
    // Group by platform
    const platformGroups = platformCreativeAnalysis.reduce((acc, item) => {
      if (!acc[item.platform]) {
        acc[item.platform] = []
      }
      acc[item.platform].push(item)
      return acc
    }, {} as any)
    
    Object.entries(platformGroups).forEach(([platform, items]: [string, any]) => {
      content += `📱 ${platform}:\n`
      items.forEach((item: any) => {
        content += `  • ${item.format}: ${item.roas.toFixed(2)}x ROAS, ${(item.ctr * 100).toFixed(2)}% CTR\n`
      })
      content += '\n'
    })
    
    const result = {
      content,
      data: {
        type: 'creative_platform_performance',
        platform_creatives: platformCreativeAnalysis,
        query: query
      }
    }
    
    updateConversationContext(sessionId, query, result)
    return result
  }

  // CREATIVE RECOMMENDATIONS HANDLER (HIGH PRIORITY)
  if (lowerQuery.includes('creative recommendations')) {
    const creativeMetrics = data.reduce((acc, row) => {
      const format = row.dimensions.creative_format
      if (!acc[format]) {
        acc[format] = { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 }
      }
      acc[format].spend += row.metrics.spend
      acc[format].revenue += row.metrics.revenue
      acc[format].impressions += row.metrics.impressions
      acc[format].clicks += row.metrics.clicks
      acc[format].conversions += row.metrics.conversions
      return acc
    }, {} as any)
    
    const creativeAnalysis = Object.entries(creativeMetrics)
      .map(([format, metrics]: [string, any]) => {
        const roas = metrics.spend > 0 ? metrics.revenue / metrics.spend : 0
        const ctr = metrics.impressions > 0 ? metrics.clicks / metrics.impressions : 0
        const cpa = metrics.conversions > 0 ? metrics.spend / metrics.conversions : 0
        return { format, metrics: { ...metrics, roas, ctr, cpa } }
      })
      .sort((a, b) => b.metrics.roas - a.metrics.roas)
    
    const bestFormat = creativeAnalysis[0]
    const worstFormat = creativeAnalysis[creativeAnalysis.length - 1]
    
    const content = `💡 CREATIVE RECOMMENDATIONS:\n\n` +
      `🎯 STRATEGIC RECOMMENDATIONS:\n` +
      `• Double down on ${bestFormat.format} - it's your best performer\n` +
      `• A/B test new ${worstFormat.format} variations to improve performance\n` +
      `• Consider seasonal creative refreshes for all formats\n` +
      `• Test video vs static formats if not already doing so\n\n` +
      `📊 PERFORMANCE INSIGHTS:\n` +
      `• Best Format: ${bestFormat.format} (${bestFormat.metrics.roas.toFixed(2)}x ROAS)\n` +
      `• Needs Work: ${worstFormat.format} (${worstFormat.metrics.roas.toFixed(2)}x ROAS)\n` +
      `• Opportunity: Focus on improving ${worstFormat.format} performance`
    
    const result = {
      content,
      data: {
        type: 'creative_recommendations',
        creatives: creativeAnalysis,
        best: bestFormat.format,
        worst: worstFormat.format,
        query: query
      }
    }
    
    updateConversationContext(sessionId, query, result)
    return result
  }

  // AUDIENCE TARGETING HANDLER (HIGH PRIORITY)
  if (lowerQuery.includes('audience targeting') || lowerQuery.includes('targeting worked best')) {
    const audienceMetrics = data.reduce((acc, row) => {
      const audience = row.dimensions.audience
      if (!acc[audience]) {
        acc[audience] = { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 }
      }
      acc[audience].spend += row.metrics.spend
      acc[audience].revenue += row.metrics.revenue
      acc[audience].impressions += row.metrics.impressions
      acc[audience].clicks += row.metrics.clicks
      acc[audience].conversions += row.metrics.conversions
      return acc
    }, {} as any)
    
    const audienceAnalysis = Object.entries(audienceMetrics)
      .map(([audience, metrics]: [string, any]) => {
        const roas = metrics.spend > 0 ? metrics.revenue / metrics.spend : 0
        const ctr = metrics.impressions > 0 ? metrics.clicks / metrics.impressions : 0
        const cpa = metrics.conversions > 0 ? metrics.spend / metrics.conversions : 0
        return { audience, metrics: { ...metrics, roas, ctr, cpa } }
      })
      .sort((a, b) => b.metrics.roas - a.metrics.roas)
    
    const bestAudience = audienceAnalysis[0]
    
    let content = `🎯 AUDIENCE TARGETING ANALYSIS:\n\n` +
      `🏆 Best Performing Audience: ${bestAudience.audience}\n` +
      `• ROAS: ${bestAudience.metrics.roas.toFixed(2)}x\n` +
      `• CTR: ${(bestAudience.metrics.ctr * 100).toFixed(2)}%\n` +
      `• CPA: $${bestAudience.metrics.cpa.toFixed(2)}\n` +
      `• Spend: $${bestAudience.metrics.spend.toLocaleString()}\n\n` +
      `📊 All Audiences by ROAS:\n`
    
    audienceAnalysis.forEach((audience, index) => {
      content += `${index + 1}. ${audience.audience}: ${audience.metrics.roas.toFixed(2)}x ROAS\n`
    })
    
    const result = {
      content,
      data: {
        type: 'audience_targeting',
        audiences: audienceAnalysis,
        best: bestAudience.audience,
        query: query
      }
    }
    
    updateConversationContext(sessionId, query, result)
    return result
  }

  // CREATIVE & AUDIENCE HANDLERS
  if (lowerQuery.includes('creative') || lowerQuery.includes('audience') || lowerQuery.includes('placement') || 
      lowerQuery.includes('ad group')) {
    
    // Creative format analysis
    if (lowerQuery.includes('creative')) {
      const creativeMetrics = data.reduce((acc, row) => {
        const format = row.dimensions.creative_format
        if (!acc[format]) {
          acc[format] = { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 }
        }
        acc[format].spend += row.metrics.spend
        acc[format].revenue += row.metrics.revenue
        acc[format].impressions += row.metrics.impressions
        acc[format].clicks += row.metrics.clicks
        acc[format].conversions += row.metrics.conversions
        return acc
      }, {} as any)
      
      const creativeAnalysis = Object.entries(creativeMetrics)
        .map(([format, metrics]: [string, any]) => {
          const roas = metrics.spend > 0 ? metrics.revenue / metrics.spend : 0
          const ctr = metrics.impressions > 0 ? metrics.clicks / metrics.impressions : 0
          return { format, metrics: { ...metrics, roas, ctr } }
        })
        .sort((a, b) => b.metrics.roas - a.metrics.roas)
      
      const content = `🎨 CREATIVE FORMAT PERFORMANCE:\n\n` +
        creativeAnalysis.map((c, i) => 
          `${i + 1}. ${c.format}: ${c.metrics.roas.toFixed(2)}x ROAS, ${(c.metrics.ctr * 100).toFixed(2)}% CTR`
        ).join('\n')
      
      const result = {
        content,
        data: {
          type: 'creative_analysis',
          creatives: creativeAnalysis,
          query: query
        }
      }
      
      updateConversationContext(sessionId, query, result)
      return result
    }
    
    // Audience analysis
    if (lowerQuery.includes('audience')) {
      const audienceMetrics = data.reduce((acc, row) => {
        const audience = row.dimensions.audience
        if (!acc[audience]) {
          acc[audience] = { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 }
        }
        acc[audience].spend += row.metrics.spend
        acc[audience].revenue += row.metrics.revenue
        acc[audience].impressions += row.metrics.impressions
        acc[audience].clicks += row.metrics.clicks
        acc[audience].conversions += row.metrics.conversions
        return acc
      }, {} as any)
      
      const audienceAnalysis = Object.entries(audienceMetrics)
        .map(([audience, metrics]: [string, any]) => {
          const roas = metrics.spend > 0 ? metrics.revenue / metrics.spend : 0
          const ctr = metrics.impressions > 0 ? metrics.clicks / metrics.impressions : 0
          return { audience, metrics: { ...metrics, roas, ctr } }
        })
        .sort((a, b) => b.metrics.roas - a.metrics.roas)
      
      const content = `👥 AUDIENCE PERFORMANCE:\n\n` +
        audienceAnalysis.map((a, i) => 
          `${i + 1}. ${a.audience}: ${a.metrics.roas.toFixed(2)}x ROAS, ${(a.metrics.ctr * 100).toFixed(2)}% CTR`
        ).join('\n')
      
      const result = {
        content,
        data: {
          type: 'audience_analysis',
          audiences: audienceAnalysis,
          query: query
        }
      }
      
      updateConversationContext(sessionId, query, result)
      return result
    }
  }

  // ANOMALY DETECTION HANDLERS
  if (lowerQuery.includes('anomaly') || lowerQuery.includes('issue') || lowerQuery.includes('problem') ||
      lowerQuery.includes('red flag') || lowerQuery.includes('concerning') || lowerQuery.includes('health')) {
    
    const platformMetrics = data.reduce((acc, row) => {
      const platform = row.dimensions.platform
      if (!acc[platform]) {
        acc[platform] = { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 }
      }
      acc[platform].spend += row.metrics.spend
      acc[platform].revenue += row.metrics.revenue
      acc[platform].impressions += row.metrics.impressions
      acc[platform].clicks += row.metrics.clicks
      acc[platform].conversions += row.metrics.conversions
      return acc
    }, {} as any)
    
    const platformAnalysis = Object.entries(platformMetrics)
      .map(([platform, metrics]: [string, any]) => {
        const roas = metrics.spend > 0 ? metrics.revenue / metrics.spend : 0
        const ctr = metrics.impressions > 0 ? metrics.clicks / metrics.impressions : 0
        const cpa = metrics.conversions > 0 ? metrics.spend / metrics.conversions : 0
        return { platform, metrics: { ...metrics, roas, ctr, cpa } }
      })
      .sort((a, b) => a.metrics.roas - b.metrics.roas)
    
    const lowestRoas = platformAnalysis[0]
    const highestCpa = platformAnalysis.sort((a, b) => b.metrics.cpa - a.metrics.cpa)[0]
    
    const content = `🚨 CAMPAIGN HEALTH ANALYSIS:\n\n` +
      `⚠️ **Areas of Concern**:\n` +
      `• Lowest ROAS: ${lowestRoas.platform} (${lowestRoas.metrics.roas.toFixed(2)}x)\n` +
      `• Highest CPA: ${highestCpa.platform} ($${highestCpa.metrics.cpa.toFixed(2)})\n\n` +
      `💡 **Recommendations**:\n` +
      `1. Review ${lowestRoas.platform} strategy and creative assets\n` +
      `2. Optimize targeting and bidding for ${highestCpa.platform}\n` +
      `3. Consider pausing underperforming campaigns temporarily`
    
    const result = {
      content,
      data: {
        type: 'anomaly_detection',
        platforms: platformAnalysis,
        concerns: {
          lowestRoas: lowestRoas.platform,
          highestCpa: highestCpa.platform
        },
        query: query
      }
    }
    
    updateConversationContext(sessionId, query, result)
    return result
  }

  // ============================================================================
  // CHART REQUEST HANDLERS (HIGH PRIORITY - BEFORE GENERIC FALLBACK)
  // ============================================================================
  
  // Chart request queries
  const chartRequestKeywords = [
    'show me a graph', 'create a chart', 'visualize this data', 'put this in a chart',
    'show me a bar chart', 'make this into a graph', 'chart this data', 'graph this',
    'show me a chart', 'visualize', 'graph', 'chart', 'plot this data'
  ]
  
  const isChartRequest = chartRequestKeywords.some(keyword => lowerQuery.includes(keyword))
  
  if (isChartRequest) {
    // Get the previous response context to understand what data to chart
    const context = getConversationContext(sessionId)
    const lastResponse = context.lastContext
    
    console.log('Chart request - Session ID:', sessionId)
    console.log('Chart request - Context:', context)
    console.log('Chart request - Last response:', lastResponse)
    
    // If no last context, try to create a default chart from the data
    if (!lastResponse || !lastResponse.type) {
      // Create a default platform comparison chart
      const platformData = data.reduce((acc, row) => {
        const platform = row.dimensions.platform
        if (!acc[platform]) {
          acc[platform] = { platform, spend: 0, revenue: 0, roas: 0 }
        }
        acc[platform].spend += row.metrics.spend
        acc[platform].revenue += row.metrics.revenue
        acc[platform].roas = acc[platform].spend > 0 ? acc[platform].revenue / acc[platform].spend : 0
        return acc
      }, {})
      
      const content = `📊 **Platform Performance Overview**\n\nI've generated a chart showing platform performance across all your campaigns. The chart displays spend, revenue, and ROAS for each platform.`
      
      const result = createResponse(content, {
        type: 'chart_response',
        chartData: Object.values(platformData),
        chartType: 'bar',
        chartTitle: 'Platform Performance Overview',
        originalQuery: query
      }, query)
      
      updateConversationContext(sessionId, query, result)
      return result
    }
    
    if (lastResponse && lastResponse.type) {
      let chartData = null
      let chartType = 'bar'
      let chartTitle = 'Data Visualization'
      
      // Generate appropriate chart data based on the last response type
      switch (lastResponse.type) {
        case 'platform_comparison':
          chartData = data.reduce((acc, row) => {
            const platform = row.dimensions.platform
            if (!acc[platform]) {
              acc[platform] = { platform, spend: 0, revenue: 0, roas: 0 }
            }
            acc[platform].spend += row.metrics.spend
            acc[platform].revenue += row.metrics.revenue
            acc[platform].roas = acc[platform].spend > 0 ? acc[platform].revenue / acc[platform].spend : 0
            return acc
          }, {})
          chartType = 'bar'
          chartTitle = 'Platform Performance Comparison'
          break
          
        case 'campaign_analysis':
          chartData = data.reduce((acc, row) => {
            const campaign = row.dimensions.campaign
            if (!acc[campaign]) {
              acc[campaign] = { campaign, spend: 0, revenue: 0, roas: 0 }
            }
            acc[campaign].spend += row.metrics.spend
            acc[campaign].revenue += row.metrics.revenue
            acc[campaign].roas = acc[campaign].spend > 0 ? acc[campaign].revenue / acc[campaign].spend : 0
            return acc
          }, {})
          chartType = 'bar'
          chartTitle = 'Campaign Performance Analysis'
          break
          
        case 'weekly_performance':
          chartData = data.reduce((acc, row) => {
            const week = row.dimensions.week
            if (!acc[week]) {
              acc[week] = { week, spend: 0, revenue: 0, roas: 0 }
            }
            acc[week].spend += row.metrics.spend
            acc[week].revenue += row.metrics.revenue
            acc[week].roas = acc[week].spend > 0 ? acc[week].revenue / acc[week].spend : 0
            return acc
          }, {})
          chartType = 'line'
          chartTitle = 'Weekly Performance Trends'
          break
          
        case 'audience_performance':
          chartData = data.reduce((acc, row) => {
            const audience = row.dimensions.audience
            if (!acc[audience]) {
              acc[audience] = { audience, spend: 0, revenue: 0, roas: 0 }
            }
            acc[audience].spend += row.metrics.spend
            acc[audience].revenue += row.metrics.revenue
            acc[audience].roas = acc[audience].spend > 0 ? acc[audience].revenue / acc[audience].spend : 0
            return acc
          }, {})
          chartType = 'bar'
          chartTitle = 'Audience Performance Analysis'
          break
          
        default:
          // Default to overall metrics
          const totalSpend = data.reduce((sum, row) => sum + row.metrics.spend, 0)
          const totalRevenue = data.reduce((sum, row) => sum + row.metrics.revenue, 0)
          const totalImpressions = data.reduce((sum, row) => sum + row.metrics.impressions, 0)
          const totalClicks = data.reduce((sum, row) => sum + row.metrics.clicks, 0)
          const totalConversions = data.reduce((sum, row) => sum + row.metrics.conversions, 0)
          
          chartData = [
            { metric: 'Spend', value: totalSpend },
            { metric: 'Revenue', value: totalRevenue },
            { metric: 'Impressions', value: totalImpressions },
            { metric: 'Clicks', value: totalClicks },
            { metric: 'Conversions', value: totalConversions }
          ]
          chartType = 'bar'
          chartTitle = 'Overall Performance Metrics'
      }
      
      const content = `📊 **${chartTitle}**\n\nI've generated a chart for you based on the previous analysis. The chart will display below with interactive features including hover tooltips and zoom capabilities.`
      
      const result = createResponse(content, {
        type: 'chart_response',
        chartData: Array.isArray(chartData) ? chartData : Object.values(chartData),
        chartType,
        chartTitle,
        originalQuery: query
      }, query)
      
      updateConversationContext(sessionId, query, result)
      return result
    } else {
      // No previous context, provide a generic chart response
      const content = `📊 **Data Visualization**\n\nI'd be happy to create a chart for you! Please ask me a specific question about your data first (like "How is Meta performing?" or "What is our best campaign?"), and then I can generate a chart based on that analysis.`
      
      const result = createResponse(content, {
        type: 'chart_request_no_context',
        message: 'No previous context available for charting'
      }, query)
      
      updateConversationContext(sessionId, query, result)
      return result
    }
  }

  // ============================================================================
  // GENERIC FALLBACK HANDLER (LOWEST PRIORITY - AFTER ALL OTHER HANDLERS)
  // ============================================================================
  
  // Generic response for unrecognized queries
  const content = `I understand you're asking about "${query}". I can help you analyze your campaign data. Try asking about:\n\n` +
    `• Platform performance (e.g., "What is Meta's performance?")\n` +
    `• Campaign metrics (e.g., "How is FreshNest Summer Grilling performing?")\n` +
    `• Financial metrics (e.g., "What's our ROAS?")\n` +
    `• Comparative analysis (e.g., "Which platform is doing the best?")\n` +
    `• Executive summary (e.g., "Give me an executive summary")\n` +
    `• Optimization insights (e.g., "What should I optimize?")`
  
  return {
    content,
    data: {
      type: 'generic_response',
      query: query
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query, sessionId } = await request.json()
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      )
    }
    
    const data = await loadCampaignData()
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'No campaign data available' },
        { status: 500 }
      )
    }
    
    const result = await processAIQuery(query, data, sessionId)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error processing AI query:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
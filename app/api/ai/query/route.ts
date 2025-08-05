import { NextRequest, NextResponse } from 'next/server'
import { loadCampaignData } from '@/lib/server-data-service'
import { KEYWORDS, PLATFORM_MAP } from '@/lib/constants'

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

  // TARGETED TIME CONTEXT HANDLER (only for specific time queries)
  // Only trigger for queries that are explicitly about time/date/period, not for queries containing "mar" or "week"
  const explicitTimeQueries = [
    'when was this data collected',
    'what time period',
    'what timeframe',
    'what dates',
    'what month is this',
    'what year is this',
    'tell me about the time period',
    'what period is this',
    'how long is this data'
  ]
  
  if (explicitTimeQueries.some(timeQuery => lowerQuery.includes(timeQuery))) {
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
    const result = {
      content,
      data: {
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
        ],
        query: query
      }
    }
    updateConversationContext(sessionId, query, result)
    return result
  }

  // OTHER MONTH/YEAR HANDLER (for queries about other months/years)
  const otherMonths = ['january', 'february', 'march', 'april', 'may', 'july', 'august', 'september', 'october', 'november', 'december']
  const otherYears = ['2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016', '2015']
  
  // Only trigger if the query explicitly mentions other months/years (not just contains "mar")
  const mentionsOtherMonth = otherMonths.some(month => {
    const monthPattern = new RegExp(`\\b${month}\\b`, 'i')
    return monthPattern.test(query)
  })
  const mentionsOtherYear = otherYears.some(year => query.includes(year))
  
  if (mentionsOtherMonth || mentionsOtherYear) {
    const content = 'This demo is built on campaigns that ran in June 2024. No data is available for other months.'
    const result = {
      content,
      data: {
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
        ],
        query: query
      }
    }
    updateConversationContext(sessionId, query, result)
    return result
  }

  const context = getConversationContext(sessionId)
  
  // Handle drill-down queries with context
  if (context.lastContext) {
    const drillDownResult = handleDrillDownQuery(query, data, context)
    if (drillDownResult) {
      updateConversationContext(sessionId, query, drillDownResult)
      return drillDownResult
    }
  }

  // PLATFORM PERFORMANCE & CONVERSIONS HANDLERS (HIGHEST PRIORITY)
  // Platform-specific performance queries
  const platformPerfPatterns = [
    /what is (meta|dv360|amazon|cm360|sa360|tradedesk)'s performance\?/i,
    /how is (meta|dv360|amazon|cm360|sa360|tradedesk) performing\?/i,
    /what are (meta|dv360|amazon|cm360|sa360|tradedesk)'s results\?/i,
    /show me (meta|dv360|amazon|cm360|sa360|tradedesk)'s metrics/i,
    /what is (meta|dv360|amazon|cm360|sa360|tradedesk)'s conversion rate\?/i,
    /how much did we spend on (meta|dv360|amazon|cm360|sa360|tradedesk)\?/i,
    /what are (meta|dv360|amazon|cm360|sa360|tradedesk)'s impressions\?/i,
    /what are (meta|dv360|amazon|cm360|sa360|tradedesk)'s clicks\?/i
  ]
  
  for (const pattern of platformPerfPatterns) {
    const match = query.match(pattern)
    if (match) {
      const platform = match[1]
      const platformData = data.filter(row => row.dimensions.platform.toLowerCase() === platform.toLowerCase())
      
      if (platformData.length > 0) {
        const totalSpend = platformData.reduce((sum, row) => sum + row.metrics.spend, 0)
        const totalRevenue = platformData.reduce((sum, row) => sum + row.metrics.revenue, 0)
        const totalImpressions = platformData.reduce((sum, row) => sum + row.metrics.impressions, 0)
        const totalClicks = platformData.reduce((sum, row) => sum + row.metrics.clicks, 0)
        const totalConversions = platformData.reduce((sum, row) => sum + row.metrics.conversions, 0)
        
        const ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0
        const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0
        const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0
        const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0
        const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0
        
        const content = `${platform} Performance:\n\n` +
          `💰 Spend: $${totalSpend.toLocaleString()}\n` +
          `💵 Revenue: $${totalRevenue.toLocaleString()}\n` +
          `📊 Impressions: ${totalImpressions.toLocaleString()}\n` +
          `🖱️ Clicks: ${totalClicks.toLocaleString()}\n` +
          `🎯 Conversions: ${totalConversions.toLocaleString()}\n` +
          `📈 CTR: ${(ctr * 100).toFixed(2)}%\n` +
          `💎 ROAS: ${roas.toFixed(2)}x\n` +
          `💸 CPA: $${cpa.toFixed(2)}\n` +
          `🖱️ CPC: $${cpc.toFixed(2)}\n` +
          `📊 CPM: $${cpm.toFixed(2)}`
        
        const result = {
          content,
          data: {
            type: 'platform_performance',
            platform,
            metrics: {
              spend: totalSpend,
              revenue: totalRevenue,
              impressions: totalImpressions,
              clicks: totalClicks,
              conversions: totalConversions,
              ctr,
              roas,
              cpa,
              cpc,
              cpm
            },
            query: query
          }
        }
        
        updateConversationContext(sessionId, query, result)
        return result
      }
    }
  }

  // CPA HANDLER (HIGH PRIORITY)
  if (lowerQuery.includes('cpa') || lowerQuery.includes('cost per acquisition')) {
    const totalSpend = data.reduce((sum, row) => sum + row.metrics.spend, 0)
    const totalConversions = data.reduce((sum, row) => sum + row.metrics.conversions, 0)
    const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0
    
    const content = `💸 Overall CPA: $${cpa.toFixed(2)}\n` +
      `💰 Total Spend: $${totalSpend.toLocaleString()}\n` +
      `🎯 Total Conversions: ${totalConversions.toLocaleString()}`
    
    const result = {
      content,
      data: {
        type: 'cpa_summary',
        metrics: { spend: totalSpend, conversions: totalConversions, cpa },
        query: query
      }
    }
    
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
      const campaign = row.dimensions.campaign_name
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
      const campaign = row.dimensions.campaign_name
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
        const campaignData = data.filter(row => row.dimensions.campaign_name === campaign)
        
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

  // EXECUTIVE SUMMARY HANDLERS (HIGH PRIORITY - BEFORE TIME HANDLERS)
  if (lowerQuery.includes('executive summary') || lowerQuery.includes('overall performance') || 
      lowerQuery.includes('summarize') || lowerQuery.includes('key metrics') || 
      lowerQuery.includes('key findings') || lowerQuery.includes('main insights') ||
      lowerQuery.includes('performance overview')) {
    
    // Data context analysis
    const uniqueBrands = Array.from(new Set(data.map(row => row.dimensions.brand)))
    const uniqueCampaigns = Array.from(new Set(data.map(row => row.dimensions.campaign_name)))
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
      const campaign = row.dimensions.campaign_name
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
        const campaign = row.dimensions.campaign_name
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
          query: query
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
import { NextRequest, NextResponse } from 'next/server'
import { MarketingData, QueryOptions } from '@/types'
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
    const { query, sessionId, data } = await request.json()

    // Validate input
    if (!query) {
      return NextResponse.json(
        { error: 'Missing required field: query' },
        { status: 400 }
      )
    }

    // Load CSV data if not provided
    let campaignData = data || []
    if (campaignData.length === 0) {
      try {
        campaignData = await loadCampaignData()
      } catch (dataError) {
        return NextResponse.json(
          { error: 'Failed to load campaign data' },
          { status: 500 }
        )
      }
    }
    
    if (campaignData.length === 0) {
      return NextResponse.json(
        { error: 'No campaign data available' },
        { status: 404 }
      )
    }
    
    // Process the query with AI
    const result = await processAIQuery(query, campaignData)

    return NextResponse.json({
      success: true,
      content: result.content,
      data: result.data,
      sessionId: sessionId || 'default',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('OpenAI API error: 401')) {
        return NextResponse.json(
          { 
            error: 'OpenAI API authentication failed. Please check your API key.',
            fallback: 'Using keyword-based processing instead.'
          },
          { status: 401 }
        )
      }
      if (error.message.includes('toLocaleString')) {
        return NextResponse.json(
          { 
            error: 'Data formatting error. Please try a different query.',
            fallback: 'Using simplified processing.'
          },
          { status: 422 }
        )
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function processAIQuery(query: string, data: MarketingData[]) {
  try {
    const lowerQuery = query.toLowerCase()
    
    console.log('DEBUG: Starting processAIQuery for query:', query)
    
    // CRITICAL COMPARATIVE HANDLERS - ABSOLUTE HIGHEST PRIORITY (BEFORE ANY OTHER LOGIC)
    
    // "Which platform performed best" - based on ROAS
    if (lowerQuery.includes('platform') && (lowerQuery.includes('performed best') || lowerQuery.includes('was the best') || lowerQuery.includes('had the best performance'))) {
      console.log('DEBUG: Platform performed best handler triggered!')
      
      const platformGroups: Record<string, { totalSpend: number, totalRevenue: number }> = {}
      
      data.forEach(item => {
        const platform = item.dimensions.platform
        if (!platformGroups[platform]) {
          platformGroups[platform] = { totalSpend: 0, totalRevenue: 0 }
        }
        platformGroups[platform].totalSpend += item.metrics.spend
        platformGroups[platform].totalRevenue += (item.metrics.revenue || 0)
      })
      
      const platformROAS = Object.entries(platformGroups)
        .map(([platform, data]) => ({
          platform,
          roas: data.totalSpend > 0 ? data.totalRevenue / data.totalSpend : 0
        }))
        .sort((a, b) => b.roas - a.roas)
      
      const topPlatform = platformROAS[0]
      const content = `Platform with the best performance (highest ROAS):\n1. ${topPlatform.platform}: ${topPlatform.roas.toFixed(2)}x\n\nAll platforms by ROAS:\n${platformROAS.map((item, index) => 
        `${index + 1}. ${item.platform}: ${item.roas.toFixed(2)}x`
      ).join('\n')}`
      
      return {
        content,
        data: {
          type: 'platform_performance_ranking',
          platforms: platformROAS,
          topPlatform: topPlatform,
          query: query
        }
      }
    }
    
    // Simple test handler to see if the issue is with complex handlers
    if (lowerQuery.includes('learn') && lowerQuery.includes('campaign')) {
      console.log('DEBUG: Learn campaign handler triggered!')
      return {
        content: "Test: Strategic insights handler is working!",
        data: {
          type: 'test_strategic_insights',
          query: query
        }
      }
    }
    
    // CRITICAL PATTERN HANDLERS - HIGH PRIORITY (AFTER COMPARATIVE HANDLERS)
    
    // Check for "how much revenue did we generate" pattern
    if (lowerQuery.includes('how much revenue') && lowerQuery.includes('generate')) {
      const totalRevenue = data.reduce((sum, item) => sum + (item.metrics.revenue || 0), 0)
      return {
        content: `Total revenue across all campaigns: $${totalRevenue.toLocaleString()}`,
        data: {
          type: 'total_revenue',
          value: totalRevenue,
          query: query
        }
      }
    }
    
    // Check for "how many impressions did we get" pattern
    if (lowerQuery.includes('how many impressions') && lowerQuery.includes('get')) {
      const totalImpressions = data.reduce((sum, item) => sum + item.metrics.impressions, 0)
      return {
        content: `Total impressions across all campaigns: ${totalImpressions.toLocaleString()}`,
        data: {
          type: 'total_impressions',
          value: totalImpressions,
          query: query
        }
      }
    }
    
    // Check for "how many clicks did we get" pattern
    if (lowerQuery.includes('how many clicks') && lowerQuery.includes('get')) {
      const totalClicks = data.reduce((sum, item) => sum + item.metrics.clicks, 0)
      return {
        content: `Total clicks across all campaigns: ${totalClicks.toLocaleString()}`,
        data: {
          type: 'total_clicks',
          value: totalClicks,
          query: query
        }
      }
    }
    
    // Check for "overall CTR" pattern
    if (lowerQuery.includes('overall ctr') || lowerQuery.includes('overall click-through rate') || lowerQuery.includes('overall click through rate')) {
      const totalClicks = data.reduce((sum, item) => sum + item.metrics.clicks, 0)
      const totalImpressions = data.reduce((sum, item) => sum + item.metrics.impressions, 0)
      const overallCTR = totalImpressions > 0 ? totalClicks / totalImpressions : 0
      
      return {
        content: `Overall CTR across all campaigns: ${(overallCTR * 100).toFixed(2)}%`,
        data: {
          type: 'overall_ctr',
          value: overallCTR,
          totalClicks,
          totalImpressions,
          query: query
        }
      }
    }
    
    // Check for "average ROAS" pattern
    if (lowerQuery.includes('average roas') || lowerQuery.includes('avg roas') || lowerQuery.includes('average return on ad spend')) {
      const totalSpend = data.reduce((sum, item) => sum + item.metrics.spend, 0)
      const totalRevenue = data.reduce((sum, item) => sum + (item.metrics.revenue || 0), 0)
      const averageROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0
      
      return {
        content: `Average ROAS across all campaigns: ${averageROAS.toFixed(2)}x`,
        data: {
          type: 'average_roas',
          value: averageROAS,
          totalSpend,
          totalRevenue,
          query: query
        }
      }
    }
    
    // Check for "CTR for each platform" pattern
    if (lowerQuery.includes('ctr for each platform') || lowerQuery.includes('click-through rate for each platform')) {
      const platformGroups: Record<string, { totalCTR: number, count: number }> = {}
      
      data.forEach(item => {
        const platform = item.dimensions.platform
        if (!platformGroups[platform]) {
          platformGroups[platform] = { totalCTR: 0, count: 0 }
        }
        platformGroups[platform].totalCTR += item.metrics.ctr
        platformGroups[platform].count++
      })
      
      const platformCTRs = Object.entries(platformGroups)
        .map(([platform, data]) => ({
          platform,
          avgCTR: data.count > 0 ? data.totalCTR / data.count : 0
        }))
        .sort((a, b) => b.avgCTR - a.avgCTR)
      
      const content = `CTR for each platform:\n${platformCTRs.map((item, index) => 
        `${index + 1}. ${item.platform}: ${(item.avgCTR * 100).toFixed(2)}%`
      ).join('\n')}`
      
      return {
        content,
        data: {
          type: 'platform_ctr_breakdown',
          platforms: platformCTRs,
          query: query
        }
      }
    }
    
    // Check for "ROAS for each platform" pattern
    if (lowerQuery.includes('roas for each platform') || lowerQuery.includes('return on ad spend for each platform')) {
      const platformGroups: Record<string, { totalSpend: number, totalRevenue: number }> = {}
      
      data.forEach(item => {
        const platform = item.dimensions.platform
        if (!platformGroups[platform]) {
          platformGroups[platform] = { totalSpend: 0, totalRevenue: 0 }
        }
        platformGroups[platform].totalSpend += item.metrics.spend
        platformGroups[platform].totalRevenue += (item.metrics.revenue || 0)
      })
      
      const platformROAS = Object.entries(platformGroups)
        .map(([platform, data]) => ({
          platform,
          roas: data.totalSpend > 0 ? data.totalRevenue / data.totalSpend : 0
        }))
        .sort((a, b) => b.roas - a.roas)
      
      const content = `ROAS for each platform:\n${platformROAS.map((item, index) => 
        `${index + 1}. ${item.platform}: ${item.roas.toFixed(2)}x`
      ).join('\n')}`
      
      return {
        content,
        data: {
          type: 'platform_roas_breakdown',
          platforms: platformROAS,
          query: query
        }
      }
    }
    
    // Check for platform count pattern
    if (lowerQuery.includes('how many platforms') || lowerQuery.includes('number of platforms') || lowerQuery.includes('count of platforms')) {
      const uniquePlatforms = Array.from(new Set(data.map(item => item.dimensions.platform)))
      const platformCount = uniquePlatforms.length
      
      return {
        content: `Found ${platformCount} platforms: ${uniquePlatforms.join(', ')}`,
        data: {
          type: 'platform_count',
          platforms: uniquePlatforms,
          count: platformCount,
          query: query
        }
      }
    }

    // Check for "which platform spent the most" pattern (HIGHEST PRIORITY)
    if (lowerQuery.includes('platform') && (lowerQuery.includes('spent the most') || lowerQuery.includes('spend the most') || lowerQuery.includes('highest spend') || lowerQuery.includes('cost the most') || lowerQuery.includes('spend most'))) {
      const platformGroups: Record<string, { totalSpend: number }> = {}
      
      data.forEach(item => {
        const platform = item.dimensions.platform
        if (!platformGroups[platform]) {
          platformGroups[platform] = { totalSpend: 0 }
        }
        platformGroups[platform].totalSpend += item.metrics.spend
      })
      
      const platformSpends = Object.entries(platformGroups)
        .map(([platform, data]) => ({
          platform,
          totalSpend: data.totalSpend
        }))
        .sort((a, b) => b.totalSpend - a.totalSpend)
      
      const topPlatform = platformSpends[0]
      const content = `Platform with the highest spend:\n1. ${topPlatform.platform}: $${topPlatform.totalSpend.toLocaleString()}\n\nAll platforms by spend:\n${platformSpends.map((item, index) => 
        `${index + 1}. ${item.platform}: $${item.totalSpend.toLocaleString()}`
      ).join('\n')}`
      
      return {
        content,
        data: {
          type: 'platform_spend_ranking',
          platforms: platformSpends,
          topPlatform: topPlatform,
          query: query
        }
      }
    }
    
    // Handle comparative queries (HIGHEST PRIORITY)
    
    // "Which platform performed best" - based on ROAS
    if (lowerQuery.includes('platform') && (lowerQuery.includes('performed best') || lowerQuery.includes('was the best') || lowerQuery.includes('had the best performance'))) {
      const platformGroups: Record<string, { totalSpend: number, totalRevenue: number }> = {}
      
      data.forEach(item => {
        const platform = item.dimensions.platform
        if (!platformGroups[platform]) {
          platformGroups[platform] = { totalSpend: 0, totalRevenue: 0 }
        }
        platformGroups[platform].totalSpend += item.metrics.spend
        platformGroups[platform].totalRevenue += (item.metrics.revenue || 0)
      })
      
      const platformROAS = Object.entries(platformGroups)
        .map(([platform, data]) => ({
          platform,
          roas: data.totalSpend > 0 ? data.totalRevenue / data.totalSpend : 0
        }))
        .sort((a, b) => b.roas - a.roas)
      
      const topPlatform = platformROAS[0]
      const content = `Platform with the best performance (highest ROAS):\n1. ${topPlatform.platform}: ${topPlatform.roas.toFixed(2)}x\n\nAll platforms by ROAS:\n${platformROAS.map((item, index) => 
        `${index + 1}. ${item.platform}: ${item.roas.toFixed(2)}x`
      ).join('\n')}`
      
      return {
        content,
        data: {
          type: 'platform_performance_ranking',
          platforms: platformROAS,
          topPlatform: topPlatform,
          query: query
        }
      }
    }
    
    // "Which platform had the highest revenue"
    if (lowerQuery.includes('platform') && (lowerQuery.includes('highest revenue') || lowerQuery.includes('generated the most revenue') || lowerQuery.includes('most revenue'))) {
      const platformGroups: Record<string, { totalRevenue: number }> = {}
      
      data.forEach(item => {
        const platform = item.dimensions.platform
        if (!platformGroups[platform]) {
          platformGroups[platform] = { totalRevenue: 0 }
        }
        platformGroups[platform].totalRevenue += (item.metrics.revenue || 0)
      })
      
      const platformRevenues = Object.entries(platformGroups)
        .map(([platform, data]) => ({
          platform,
          totalRevenue: data.totalRevenue
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
      
      const topPlatform = platformRevenues[0]
      const content = `Platform with the highest revenue:\n1. ${topPlatform.platform}: $${topPlatform.totalRevenue.toLocaleString()}\n\nAll platforms by revenue:\n${platformRevenues.map((item, index) => 
        `${index + 1}. ${item.platform}: $${item.totalRevenue.toLocaleString()}`
      ).join('\n')}`
      
      return {
        content,
        data: {
          type: 'platform_revenue_ranking',
          platforms: platformRevenues,
          topPlatform: topPlatform,
          query: query
        }
      }
    }
    
    // "Which platform had the most impressions"
    if (lowerQuery.includes('platform') && (lowerQuery.includes('most impressions') || lowerQuery.includes('got the most impressions') || lowerQuery.includes('most traffic'))) {
      const platformGroups: Record<string, { totalImpressions: number }> = {}
      
      data.forEach(item => {
        const platform = item.dimensions.platform
        if (!platformGroups[platform]) {
          platformGroups[platform] = { totalImpressions: 0 }
        }
        platformGroups[platform].totalImpressions += item.metrics.impressions
      })
      
      const platformImpressions = Object.entries(platformGroups)
        .map(([platform, data]) => ({
          platform,
          totalImpressions: data.totalImpressions
        }))
        .sort((a, b) => b.totalImpressions - a.totalImpressions)
      
      const topPlatform = platformImpressions[0]
      const content = `Platform with the most impressions:\n1. ${topPlatform.platform}: ${topPlatform.totalImpressions.toLocaleString()}\n\nAll platforms by impressions:\n${platformImpressions.map((item, index) => 
        `${index + 1}. ${item.platform}: ${item.totalImpressions.toLocaleString()}`
      ).join('\n')}`
      
      return {
        content,
        data: {
          type: 'platform_impressions_ranking',
          platforms: platformImpressions,
          topPlatform: topPlatform,
          query: query
        }
      }
    }
    
    // "Which platform had the most clicks"
    if (lowerQuery.includes('platform') && (lowerQuery.includes('most clicks') || lowerQuery.includes('got the most clicks') || lowerQuery.includes('most engagement'))) {
      const platformGroups: Record<string, { totalClicks: number }> = {}
      
      data.forEach(item => {
        const platform = item.dimensions.platform
        if (!platformGroups[platform]) {
          platformGroups[platform] = { totalClicks: 0 }
        }
        platformGroups[platform].totalClicks += item.metrics.clicks
      })
      
      const platformClicks = Object.entries(platformGroups)
        .map(([platform, data]) => ({
          platform,
          totalClicks: data.totalClicks
        }))
        .sort((a, b) => b.totalClicks - a.totalClicks)
      
      const topPlatform = platformClicks[0]
      const content = `Platform with the most clicks:\n1. ${topPlatform.platform}: ${topPlatform.totalClicks.toLocaleString()}\n\nAll platforms by clicks:\n${platformClicks.map((item, index) => 
        `${index + 1}. ${item.platform}: ${item.totalClicks.toLocaleString()}`
      ).join('\n')}`
      
      return {
        content,
        data: {
          type: 'platform_clicks_ranking',
          platforms: platformClicks,
          topPlatform: topPlatform,
          query: query
        }
      }
    }
    
    // "Which platform is the most expensive" - based on CPC
    if (lowerQuery.includes('platform') && (lowerQuery.includes('most expensive') || lowerQuery.includes('costs the most'))) {
      const platformGroups: Record<string, { totalSpend: number, totalClicks: number }> = {}
      
      data.forEach(item => {
        const platform = item.dimensions.platform
        if (!platformGroups[platform]) {
          platformGroups[platform] = { totalSpend: 0, totalClicks: 0 }
        }
        platformGroups[platform].totalSpend += item.metrics.spend
        platformGroups[platform].totalClicks += item.metrics.clicks
      })
      
      const platformCPC = Object.entries(platformGroups)
        .map(([platform, data]) => ({
          platform,
          cpc: data.totalClicks > 0 ? data.totalSpend / data.totalClicks : 0
        }))
        .sort((a, b) => b.cpc - a.cpc)
      
      const topPlatform = platformCPC[0]
      const content = `Platform with the highest cost per click (most expensive):\n1. ${topPlatform.platform}: $${topPlatform.cpc.toFixed(2)}\n\nAll platforms by CPC:\n${platformCPC.map((item, index) => 
        `${index + 1}. ${item.platform}: $${item.cpc.toFixed(2)}`
      ).join('\n')}`
      
      return {
        content,
        data: {
          type: 'platform_cpc_ranking',
          platforms: platformCPC,
          topPlatform: topPlatform,
          query: query
        }
      }
    }
    
    // "Which platform is the most profitable" - based on ROAS
    if (lowerQuery.includes('platform') && (lowerQuery.includes('most profitable') || lowerQuery.includes('makes the most money'))) {
      const platformGroups: Record<string, { totalSpend: number, totalRevenue: number }> = {}
      
      data.forEach(item => {
        const platform = item.dimensions.platform
        if (!platformGroups[platform]) {
          platformGroups[platform] = { totalSpend: 0, totalRevenue: 0 }
        }
        platformGroups[platform].totalSpend += item.metrics.spend
        platformGroups[platform].totalRevenue += (item.metrics.revenue || 0)
      })
      
      const platformROAS = Object.entries(platformGroups)
        .map(([platform, data]) => ({
          platform,
          roas: data.totalSpend > 0 ? data.totalRevenue / data.totalSpend : 0
        }))
        .sort((a, b) => b.roas - a.roas)
      
      const topPlatform = platformROAS[0]
      const content = `Platform with the highest ROAS (most profitable):\n1. ${topPlatform.platform}: ${topPlatform.roas.toFixed(2)}x\n\nAll platforms by ROAS:\n${platformROAS.map((item, index) => 
        `${index + 1}. ${item.platform}: ${item.roas.toFixed(2)}x`
      ).join('\n')}`
      
      return {
        content,
        data: {
          type: 'platform_profitability_ranking',
          platforms: platformROAS,
          topPlatform: topPlatform,
          query: query
        }
      }
    }
    
    // Handle campaign comparative queries (HIGHEST PRIORITY)
    
    // "Which campaign performed best" - based on ROAS
    if (lowerQuery.includes('campaign') && (lowerQuery.includes('performed best') || lowerQuery.includes('was the best') || lowerQuery.includes('had the best performance'))) {
      const campaignGroups: Record<string, { totalSpend: number, totalRevenue: number }> = {}
      
      data.forEach(item => {
        const campaign = item.dimensions.campaign
        if (!campaignGroups[campaign]) {
          campaignGroups[campaign] = { totalSpend: 0, totalRevenue: 0 }
        }
        campaignGroups[campaign].totalSpend += item.metrics.spend
        campaignGroups[campaign].totalRevenue += (item.metrics.revenue || 0)
      })
      
      const campaignROAS = Object.entries(campaignGroups)
        .map(([campaign, data]) => ({
          campaign,
          roas: data.totalSpend > 0 ? data.totalRevenue / data.totalSpend : 0
        }))
        .sort((a, b) => b.roas - a.roas)
      
      const topCampaign = campaignROAS[0]
      const content = `Campaign with the best performance (highest ROAS):\n1. ${topCampaign.campaign}: ${topCampaign.roas.toFixed(2)}x\n\nAll campaigns by ROAS:\n${campaignROAS.map((item, index) => 
        `${index + 1}. ${item.campaign}: ${item.roas.toFixed(2)}x`
      ).join('\n')}`
      
      return {
        content,
        data: {
          type: 'campaign_performance_ranking',
          campaigns: campaignROAS,
          topCampaign: topCampaign,
          query: query
        }
      }
    }
    
    // "Which campaign had the highest revenue"
    if (lowerQuery.includes('campaign') && (lowerQuery.includes('highest revenue') || lowerQuery.includes('generated the most revenue') || lowerQuery.includes('most revenue'))) {
      const campaignGroups: Record<string, { totalRevenue: number }> = {}
      
      data.forEach(item => {
        const campaign = item.dimensions.campaign
        if (!campaignGroups[campaign]) {
          campaignGroups[campaign] = { totalRevenue: 0 }
        }
        campaignGroups[campaign].totalRevenue += (item.metrics.revenue || 0)
      })
      
      const campaignRevenues = Object.entries(campaignGroups)
        .map(([campaign, data]) => ({
          campaign,
          totalRevenue: data.totalRevenue
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
      
      const topCampaign = campaignRevenues[0]
      const content = `Campaign with the highest revenue:\n1. ${topCampaign.campaign}: $${topCampaign.totalRevenue.toLocaleString()}\n\nAll campaigns by revenue:\n${campaignRevenues.map((item, index) => 
        `${index + 1}. ${item.campaign}: $${item.totalRevenue.toLocaleString()}`
      ).join('\n')}`
      
      return {
        content,
        data: {
          type: 'campaign_revenue_ranking',
          campaigns: campaignRevenues,
          topCampaign: topCampaign,
          query: query
        }
      }
    }
    
    // "Which campaign had the most impressions"
    if (lowerQuery.includes('campaign') && (lowerQuery.includes('most impressions') || lowerQuery.includes('got the most impressions') || lowerQuery.includes('most traffic'))) {
      const campaignGroups: Record<string, { totalImpressions: number }> = {}
      
      data.forEach(item => {
        const campaign = item.dimensions.campaign
        if (!campaignGroups[campaign]) {
          campaignGroups[campaign] = { totalImpressions: 0 }
        }
        campaignGroups[campaign].totalImpressions += item.metrics.impressions
      })
      
      const campaignImpressions = Object.entries(campaignGroups)
        .map(([campaign, data]) => ({
          campaign,
          totalImpressions: data.totalImpressions
        }))
        .sort((a, b) => b.totalImpressions - a.totalImpressions)
      
      const topCampaign = campaignImpressions[0]
      const content = `Campaign with the most impressions:\n1. ${topCampaign.campaign}: ${topCampaign.totalImpressions.toLocaleString()}\n\nAll campaigns by impressions:\n${campaignImpressions.map((item, index) => 
        `${index + 1}. ${item.campaign}: ${item.totalImpressions.toLocaleString()}`
      ).join('\n')}`
      
      return {
        content,
        data: {
          type: 'campaign_impressions_ranking',
          campaigns: campaignImpressions,
          topCampaign: topCampaign,
          query: query
        }
      }
    }
    
    // "Which campaign had the most clicks"
    if (lowerQuery.includes('campaign') && (lowerQuery.includes('most clicks') || lowerQuery.includes('got the most clicks') || lowerQuery.includes('most engagement'))) {
      const campaignGroups: Record<string, { totalClicks: number }> = {}
      
      data.forEach(item => {
        const campaign = item.dimensions.campaign
        if (!campaignGroups[campaign]) {
          campaignGroups[campaign] = { totalClicks: 0 }
        }
        campaignGroups[campaign].totalClicks += item.metrics.clicks
      })
      
      const campaignClicks = Object.entries(campaignGroups)
        .map(([campaign, data]) => ({
          campaign,
          totalClicks: data.totalClicks
        }))
        .sort((a, b) => b.totalClicks - a.totalClicks)
      
      const topCampaign = campaignClicks[0]
      const content = `Campaign with the most clicks:\n1. ${topCampaign.campaign}: ${topCampaign.totalClicks.toLocaleString()}\n\nAll campaigns by clicks:\n${campaignClicks.map((item, index) => 
        `${index + 1}. ${item.campaign}: ${item.totalClicks.toLocaleString()}`
      ).join('\n')}`
      
      return {
        content,
        data: {
          type: 'campaign_clicks_ranking',
          campaigns: campaignClicks,
          topCampaign: topCampaign,
          query: query
        }
      }
    }
    
    // "Which campaign is the most expensive" - based on CPC
    if (lowerQuery.includes('campaign') && (lowerQuery.includes('most expensive') || lowerQuery.includes('costs the most'))) {
      const campaignGroups: Record<string, { totalSpend: number, totalClicks: number }> = {}
      
      data.forEach(item => {
        const campaign = item.dimensions.campaign
        if (!campaignGroups[campaign]) {
          campaignGroups[campaign] = { totalSpend: 0, totalClicks: 0 }
        }
        campaignGroups[campaign].totalSpend += item.metrics.spend
        campaignGroups[campaign].totalClicks += item.metrics.clicks
      })
      
      const campaignCPC = Object.entries(campaignGroups)
        .map(([campaign, data]) => ({
          campaign,
          cpc: data.totalClicks > 0 ? data.totalSpend / data.totalClicks : 0
        }))
        .sort((a, b) => b.cpc - a.cpc)
      
      const topCampaign = campaignCPC[0]
      const content = `Campaign with the highest cost per click (most expensive):\n1. ${topCampaign.campaign}: $${topCampaign.cpc.toFixed(2)}\n\nAll campaigns by CPC:\n${campaignCPC.map((item, index) => 
        `${index + 1}. ${item.campaign}: $${item.cpc.toFixed(2)}`
      ).join('\n')}`
      
      return {
        content,
        data: {
          type: 'campaign_cpc_ranking',
          campaigns: campaignCPC,
          topCampaign: topCampaign,
          query: query
        }
      }
    }
    
    // "Which campaign is the most profitable" - based on ROAS
    if (lowerQuery.includes('campaign') && (lowerQuery.includes('most profitable') || lowerQuery.includes('makes the most money'))) {
      const campaignGroups: Record<string, { totalSpend: number, totalRevenue: number }> = {}
      
      data.forEach(item => {
        const campaign = item.dimensions.campaign
        if (!campaignGroups[campaign]) {
          campaignGroups[campaign] = { totalSpend: 0, totalRevenue: 0 }
        }
        campaignGroups[campaign].totalSpend += item.metrics.spend
        campaignGroups[campaign].totalRevenue += (item.metrics.revenue || 0)
      })
      
      const campaignROAS = Object.entries(campaignGroups)
        .map(([campaign, data]) => ({
          campaign,
          roas: data.totalSpend > 0 ? data.totalRevenue / data.totalSpend : 0
        }))
        .sort((a, b) => b.roas - a.roas)
      
      const topCampaign = campaignROAS[0]
      const content = `Campaign with the highest ROAS (most profitable):\n1. ${topCampaign.campaign}: ${topCampaign.roas.toFixed(2)}x\n\nAll campaigns by ROAS:\n${campaignROAS.map((item, index) => 
        `${index + 1}. ${item.campaign}: ${item.roas.toFixed(2)}x`
      ).join('\n')}`
      
      return {
        content,
        data: {
          type: 'campaign_profitability_ranking',
          campaigns: campaignROAS,
          topCampaign: topCampaign,
          query: query
        }
      }
    }
    
    // Handle strategic insights and recommendations (HIGHEST PRIORITY)
    
    // "What did we learn from this campaign" - provide actionable insights
    if (lowerQuery.includes('learn') && (lowerQuery.includes('campaign') || lowerQuery.includes('this'))) {
      // Calculate key insights
      const platformGroups: Record<string, { totalSpend: number, totalRevenue: number, totalClicks: number, totalImpressions: number }> = {}
      
      data.forEach(item => {
        const platform = item.dimensions.platform
        if (!platformGroups[platform]) {
          platformGroups[platform] = { totalSpend: 0, totalRevenue: 0, totalClicks: 0, totalImpressions: 0 }
        }
        platformGroups[platform].totalSpend += item.metrics.spend
        platformGroups[platform].totalRevenue += (item.metrics.revenue || 0)
        platformGroups[platform].totalClicks += item.metrics.clicks
        platformGroups[platform].totalImpressions += item.metrics.impressions
      })
      
      const platformInsights = Object.entries(platformGroups)
        .map(([platform, data]) => ({
          platform,
          roas: data.totalSpend > 0 ? data.totalRevenue / data.totalSpend : 0,
          ctr: data.totalImpressions > 0 ? data.totalClicks / data.totalImpressions : 0,
          spend: data.totalSpend,
          revenue: data.totalRevenue
        }))
        .sort((a, b) => b.roas - a.roas)
      
      const bestPlatform = platformInsights[0]
      const worstPlatform = platformInsights[platformInsights.length - 1]
      const totalSpend = data.reduce((sum, item) => sum + item.metrics.spend, 0)
      const totalRevenue = data.reduce((sum, item) => sum + (item.metrics.revenue || 0), 0)
      const overallROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0
      
      const content = `**Key Learnings from Your Campaign Data:**

**🏆 Best Performing Platform:** ${bestPlatform.platform}
- ROAS: ${bestPlatform.roas.toFixed(2)}x
- Revenue: $${bestPlatform.revenue.toLocaleString()}
- Spend: $${bestPlatform.spend.toLocaleString()}

**📉 Platform Needing Improvement:** ${worstPlatform.platform}
- ROAS: ${worstPlatform.roas.toFixed(2)}x
- Opportunity: Focus on optimization or consider reallocating budget

**📊 Overall Performance:**
- Total ROAS: ${overallROAS.toFixed(2)}x
- Total Revenue: $${totalRevenue.toLocaleString()}
- Total Spend: $${totalSpend.toLocaleString()}

**💡 Strategic Recommendations:**
1. **Increase investment in ${bestPlatform.platform}** - it's delivering the best returns
2. **Optimize ${worstPlatform.platform}** - focus on improving performance or consider budget reallocation
3. **Scale successful campaigns** - replicate what's working on ${bestPlatform.platform}
4. **Monitor CTR trends** - best CTR: ${(Math.max(...platformInsights.map(p => p.ctr)) * 100).toFixed(2)}% (${platformInsights.find(p => p.ctr === Math.max(...platformInsights.map(p => p.ctr)))?.platform})`
      
      return {
        content,
        data: {
          type: 'strategic_insights',
          bestPlatform: bestPlatform,
          worstPlatform: worstPlatform,
          overallROAS: overallROAS,
          platformInsights: platformInsights,
          query: query
        }
      }
    }
    
    // "What should I do next" or "recommendations" - provide actionable advice
    if (lowerQuery.includes('should i do') || lowerQuery.includes('recommendations') || lowerQuery.includes('what next') || lowerQuery.includes('apply to next')) {
      const platformGroups: Record<string, { totalSpend: number, totalRevenue: number, totalClicks: number, totalImpressions: number }> = {}
      
      data.forEach(item => {
        const platform = item.dimensions.platform
        if (!platformGroups[platform]) {
          platformGroups[platform] = { totalSpend: 0, totalRevenue: 0, totalClicks: 0, totalImpressions: 0 }
        }
        platformGroups[platform].totalSpend += item.metrics.spend
        platformGroups[platform].totalRevenue += (item.metrics.revenue || 0)
        platformGroups[platform].totalClicks += item.metrics.clicks
        platformGroups[platform].totalImpressions += item.metrics.impressions
      })
      
      const platformPerformance = Object.entries(platformGroups)
        .map(([platform, data]) => ({
          platform,
          roas: data.totalSpend > 0 ? data.totalRevenue / data.totalSpend : 0,
          ctr: data.totalImpressions > 0 ? data.totalClicks / data.totalImpressions : 0,
          spend: data.totalSpend,
          revenue: data.totalRevenue
        }))
        .sort((a, b) => b.roas - a.roas)
      
      const bestPlatform = platformPerformance[0]
      const worstPlatform = platformPerformance[platformPerformance.length - 1]
      
      const content = `**🎯 Actionable Recommendations for Your Next Campaign:**

**💰 Budget Allocation Strategy:**
- **INCREASE** budget for ${bestPlatform.platform} by 20-30% (ROAS: ${bestPlatform.roas.toFixed(2)}x)
- **OPTIMIZE** ${worstPlatform.platform} before increasing spend (ROAS: ${worstPlatform.roas.toFixed(2)}x)

**📈 Performance Optimization:**
- Best CTR: ${(Math.max(...platformPerformance.map(p => p.ctr)) * 100).toFixed(2)}% on ${platformPerformance.find(p => p.ctr === Math.max(...platformPerformance.map(p => p.ctr)))?.platform}
- Focus on improving creative performance on lower-performing platforms

**🚀 Growth Opportunities:**
- Scale successful campaigns from ${bestPlatform.platform}
- Test new creative formats on ${worstPlatform.platform}
- Consider expanding to similar audiences across platforms

**📊 Key Metrics to Monitor:**
- ROAS trends by platform
- CTR improvements
- Cost per acquisition optimization
- Revenue growth vs. spend increase`
      
      return {
        content,
        data: {
          type: 'actionable_recommendations',
          bestPlatform: bestPlatform,
          worstPlatform: worstPlatform,
          platformPerformance: platformPerformance,
          query: query
        }
      }
    }


    
    // CRITICAL FIXES - HIGHEST PRIORITY HANDLERS (MOVED TO VERY TOP)
    
    // Handle platform-specific queries (HIGHEST PRIORITY)
    const detectedPlatform = KEYWORDS.PLATFORMS.find(platform => lowerQuery.includes(platform))
    
    if (detectedPlatform) {
      const actualPlatform = PLATFORM_MAP[detectedPlatform]
      const filteredData = data.filter(item => item.dimensions.platform === actualPlatform)
      
      if (filteredData.length > 0) {
        // Handle platform-specific revenue queries
        if (lowerQuery.includes('revenue') || lowerQuery.includes('earnings')) {
          const totalRevenue = filteredData.reduce((sum, item) => sum + (item.metrics.revenue || 0), 0)
          return {
            content: `Total revenue from ${actualPlatform}: $${totalRevenue.toLocaleString()}`,
            data: {
              type: 'platform_revenue',
              platform: actualPlatform,
              value: totalRevenue,
              count: filteredData.length,
              query: query
            }
          }
        }
        
        // Handle platform-specific ROAS queries
        if (lowerQuery.includes('return on ad spend') || lowerQuery.includes('roas')) {
          const totalSpend = filteredData.reduce((sum, item) => sum + item.metrics.spend, 0)
          const totalRevenue = filteredData.reduce((sum, item) => sum + (item.metrics.revenue || 0), 0)
          const platformROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0
          
          return {
            content: `Average ROAS for ${actualPlatform}: ${platformROAS.toFixed(2)}x`,
            data: {
              type: 'platform_roas',
              platform: actualPlatform,
              value: platformROAS,
              totalSpend,
              totalRevenue,
              count: filteredData.length,
              query: query
            }
          }
        }
        
        // Handle platform-specific CTR queries
        if (lowerQuery.includes('ctr') || lowerQuery.includes('click-through rate') || lowerQuery.includes('click through rate')) {
          const totalCTR = filteredData.reduce((sum, item) => sum + item.metrics.ctr, 0)
          const averageCTR = totalCTR / filteredData.length
          
          return {
            content: `Average CTR for ${actualPlatform}: ${(averageCTR * 100).toFixed(2)}%`,
            data: {
              type: 'platform_ctr',
              platform: actualPlatform,
              value: averageCTR,
              count: filteredData.length,
              query: query
            }
          }
        }
        
        // Handle platform-specific spend queries
        if (lowerQuery.includes('spend') || lowerQuery.includes('cost') || lowerQuery.includes('budget')) {
          const totalSpend = filteredData.reduce((sum, item) => sum + item.metrics.spend, 0)
          return {
            content: `Total spend on ${actualPlatform}: $${totalSpend.toLocaleString()}`,
            data: {
              type: 'platform_spend',
              platform: actualPlatform,
              value: totalSpend,
              count: filteredData.length,
              query: query
            }
          }
        }
        
        // Handle platform-specific impressions queries
        if (lowerQuery.includes('impressions') || lowerQuery.includes('views')) {
          const totalImpressions = filteredData.reduce((sum, item) => sum + item.metrics.impressions, 0)
          return {
            content: `Total impressions from ${actualPlatform}: ${totalImpressions.toLocaleString()}`,
            data: {
              type: 'platform_impressions',
              platform: actualPlatform,
              value: totalImpressions,
              count: filteredData.length,
              query: query
            }
          }
        }
        
        // Handle platform-specific clicks queries
        if (lowerQuery.includes('clicks') || lowerQuery.includes('interactions')) {
          const totalClicks = filteredData.reduce((sum, item) => sum + item.metrics.clicks, 0)
          return {
            content: `Total clicks from ${actualPlatform}: ${totalClicks.toLocaleString()}`,
            data: {
              type: 'platform_clicks',
              platform: actualPlatform,
              value: totalClicks,
              count: filteredData.length,
              query: query
            }
          }
        }
      }
    }

    // Now add keyword detection for the rest of the function
    const isCTRQuery = KEYWORDS.CTR.some(keyword => lowerQuery.includes(keyword))
    const isROASQuery = KEYWORDS.ROAS.some(keyword => lowerQuery.includes(keyword))
    const isCountQuery = KEYWORDS.COUNT.some(keyword => lowerQuery.includes(keyword))
    const isSpendQuery = KEYWORDS.SPEND.some(keyword => lowerQuery.includes(keyword))
    const isCampaignQuery = KEYWORDS.CAMPAIGN.some(keyword => lowerQuery.includes(keyword)) || 
                           KEYWORDS.CAMPAIGN_NAMES.some(campaign => lowerQuery.includes(campaign))
    const isPlatformQuery = KEYWORDS.PLATFORM.some(keyword => lowerQuery.includes(keyword))
    const isVizQuery = KEYWORDS.VIZ.some(keyword => lowerQuery.includes(keyword))
    const isTopQuery = KEYWORDS.TOP.some(keyword => lowerQuery.includes(keyword))

    // Handle platform count queries (HIGHEST PRIORITY)
    if (lowerQuery.includes('how many platforms') || lowerQuery.includes('number of platforms') || lowerQuery.includes('count of platforms')) {
      const uniquePlatforms = Array.from(new Set(data.map(item => item.dimensions.platform)))
      const platformCount = uniquePlatforms.length
      
      return {
        content: `Found ${platformCount} platforms: ${uniquePlatforms.join(', ')}`,
        data: {
          type: 'platform_count',
          platforms: uniquePlatforms,
          count: platformCount,
          query: query
        }
      }
    }

    // Handle "how much revenue did we generate" queries (HIGHEST PRIORITY)
    if (lowerQuery.includes('how much revenue') || lowerQuery.includes('revenue did we generate') || lowerQuery.includes('revenue did we get')) {
      const totalRevenue = data.reduce((sum, item) => sum + (item.metrics.revenue || 0), 0)
      return {
        content: `Total revenue across all campaigns: $${totalRevenue.toLocaleString()}`,
        data: {
          type: 'total_revenue',
          value: totalRevenue,
          query: query
        }
      }
    }

    // Handle "how many impressions did we get" queries (HIGHEST PRIORITY)
    if (lowerQuery.includes('how many impressions') || lowerQuery.includes('impressions did we get') || lowerQuery.includes('impressions did we receive')) {
      const totalImpressions = data.reduce((sum, item) => sum + item.metrics.impressions, 0)
      return {
        content: `Total impressions across all campaigns: ${totalImpressions.toLocaleString()}`,
        data: {
          type: 'total_impressions',
          value: totalImpressions,
          query: query
        }
      }
    }

    // Handle "how many clicks did we get" queries (HIGHEST PRIORITY)
    if (lowerQuery.includes('how many clicks') || lowerQuery.includes('clicks did we get') || lowerQuery.includes('clicks did we receive')) {
      const totalClicks = data.reduce((sum, item) => sum + item.metrics.clicks, 0)
      return {
        content: `Total clicks across all campaigns: ${totalClicks.toLocaleString()}`,
        data: {
          type: 'total_clicks',
          value: totalClicks,
          query: query
        }
      }
    }

    // Handle "overall CTR" queries (HIGHEST PRIORITY)
    if (lowerQuery.includes('overall ctr') || lowerQuery.includes('overall click-through rate') || lowerQuery.includes('overall click through rate')) {
      const totalClicks = data.reduce((sum, item) => sum + item.metrics.clicks, 0)
      const totalImpressions = data.reduce((sum, item) => sum + item.metrics.impressions, 0)
      const overallCTR = totalImpressions > 0 ? totalClicks / totalImpressions : 0
      
      return {
        content: `Overall CTR across all campaigns: ${(overallCTR * 100).toFixed(2)}%`,
        data: {
          type: 'overall_ctr',
          value: overallCTR,
          totalClicks,
          totalImpressions,
          query: query
        }
      }
    }

    // Handle "average ROAS" queries (HIGHEST PRIORITY)
    if (lowerQuery.includes('average roas') || lowerQuery.includes('avg roas') || lowerQuery.includes('average return on ad spend')) {
      const totalSpend = data.reduce((sum, item) => sum + item.metrics.spend, 0)
      const totalRevenue = data.reduce((sum, item) => sum + (item.metrics.revenue || 0), 0)
      const averageROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0
      
      return {
        content: `Average ROAS across all campaigns: ${averageROAS.toFixed(2)}x`,
        data: {
          type: 'average_roas',
          value: averageROAS,
          totalSpend,
          totalRevenue,
          query: query
        }
      }
    }

    // Handle "average CTR" queries (HIGHEST PRIORITY) - use overall CTR calculation
    if (lowerQuery.includes('average ctr') || lowerQuery.includes('avg ctr') || lowerQuery.includes('average click-through rate')) {
      const totalClicks = data.reduce((sum, item) => sum + item.metrics.clicks, 0)
      const totalImpressions = data.reduce((sum, item) => sum + item.metrics.impressions, 0)
      const overallCTR = totalImpressions > 0 ? totalClicks / totalImpressions : 0
      
      return {
        content: `Average CTR across all campaigns: ${(overallCTR * 100).toFixed(2)}%`,
        data: {
          type: 'average_ctr',
          value: overallCTR,
          totalClicks,
          totalImpressions,
          query: query
        }
      }
    }
    
    // Handle "average CPA" queries (HIGHEST PRIORITY) - using actual conversions
    if (lowerQuery.includes('average cpa') || lowerQuery.includes('avg cpa') || lowerQuery.includes('average cost per acquisition') || lowerQuery.includes('overall cpa')) {
      const totalSpend = data.reduce((sum, item) => sum + item.metrics.spend, 0)
      const totalConversions = data.reduce((sum, item) => sum + (item.metrics.conversions || 0), 0)
      const averageCPA = totalConversions > 0 ? totalSpend / totalConversions : 0
      
      return {
        content: `Average CPA across all campaigns: $${averageCPA.toFixed(2)}`,
        data: {
          type: 'average_cpa',
          value: averageCPA,
          totalSpend,
          totalConversions,
          query: query
        }
      }
    }

    // Handle "CTR for each platform" queries (HIGHEST PRIORITY)
    if (lowerQuery.includes('ctr for each platform') || lowerQuery.includes('click-through rate for each platform') || lowerQuery.includes('click through rate for each platform')) {
      const platformGroups: Record<string, { totalCTR: number, count: number }> = {}
      
      data.forEach(item => {
        const platform = item.dimensions.platform
        if (!platformGroups[platform]) {
          platformGroups[platform] = { totalCTR: 0, count: 0 }
        }
        platformGroups[platform].totalCTR += item.metrics.ctr
        platformGroups[platform].count++
      })
      
      const platformCTRs = Object.entries(platformGroups)
        .map(([platform, data]) => ({
          platform,
          avgCTR: data.count > 0 ? data.totalCTR / data.count : 0
        }))
        .sort((a, b) => b.avgCTR - a.avgCTR)
      
      const content = `CTR for each platform:\n${platformCTRs.map((item, index) => 
        `${index + 1}. ${item.platform}: ${(item.avgCTR * 100).toFixed(2)}%`
      ).join('\n')}`
      
      return {
        content,
        data: {
          type: 'platform_ctr_breakdown',
          platforms: platformCTRs,
          query: query
        }
      }
    }

    // Handle "ROAS for each platform" queries (HIGHEST PRIORITY)
    if (lowerQuery.includes('roas for each platform') || lowerQuery.includes('return on ad spend for each platform')) {
      const platformGroups: Record<string, { totalSpend: number, totalRevenue: number }> = {}
      
      data.forEach(item => {
        const platform = item.dimensions.platform
        if (!platformGroups[platform]) {
          platformGroups[platform] = { totalSpend: 0, totalRevenue: 0 }
        }
        platformGroups[platform].totalSpend += item.metrics.spend
        platformGroups[platform].totalRevenue += (item.metrics.revenue || 0)
      })
      
      const platformROAS = Object.entries(platformGroups)
        .map(([platform, data]) => ({
          platform,
          roas: data.totalSpend > 0 ? data.totalRevenue / data.totalSpend : 0
        }))
        .sort((a, b) => b.roas - a.roas)
      
      const content = `ROAS for each platform:\n${platformROAS.map((item, index) => 
        `${index + 1}. ${item.platform}: ${item.roas.toFixed(2)}x`
      ).join('\n')}`
      
      return {
        content,
        data: {
          type: 'platform_roas_breakdown',
          platforms: platformROAS,
          query: query
        }
      }
    }
    
    // Handle campaign-specific CTR queries (HIGHEST PRIORITY - moved to very top)
    if (isCTRQuery && isCampaignQuery && !lowerQuery.includes('each') && !lowerQuery.includes('individual')) {
      // Check for specific campaign names
      const campaignNames = ['freshnest summer grilling', 'freshnest back to school', 'freshnest holiday recipes', 'freshnest pantry staples']
      const detectedCampaign = campaignNames.find(campaign => lowerQuery.includes(campaign))
      
      if (detectedCampaign) {
        // Normalize campaign name to match CSV data
        const normalizedCampaignName = detectedCampaign.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ')
        
        const campaignData = data.filter(item => 
          item.dimensions.campaign.toLowerCase().includes(detectedCampaign)
        )
        
        if (campaignData.length > 0) {
          const totalCTR = campaignData.reduce((sum, item) => sum + item.metrics.ctr, 0)
          const averageCTR = totalCTR / campaignData.length
          
          return {
            content: `Average CTR for ${normalizedCampaignName}: ${(averageCTR * 100).toFixed(2)}%`,
            data: {
              type: 'campaign_ctr',
              campaign: normalizedCampaignName,
              value: averageCTR,
              count: campaignData.length,
              query: query
            }
          }
        }
      }
    }

    // Handle campaign-specific ROAS queries (HIGHEST PRIORITY - moved to very top)
    if (isROASQuery && isCampaignQuery && !lowerQuery.includes('each') && !lowerQuery.includes('individual')) {
      // Check for specific campaign names
      const campaignNames = ['freshnest summer grilling', 'freshnest back to school', 'freshnest holiday recipes', 'freshnest pantry staples']
      const detectedCampaign = campaignNames.find(campaign => lowerQuery.includes(campaign))
      
      if (detectedCampaign) {
        // Normalize campaign name to match CSV data
        const normalizedCampaignName = detectedCampaign.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ')
        
        const campaignData = data.filter(item => 
          item.dimensions.campaign.toLowerCase().includes(detectedCampaign)
        )
        
        if (campaignData.length > 0) {
          const totalROAS = campaignData.reduce((sum, item) => sum + item.metrics.roas, 0)
          const averageROAS = totalROAS / campaignData.length
          
          return {
            content: `Average ROAS for ${normalizedCampaignName}: ${averageROAS.toFixed(2)}x`,
            data: {
              type: 'campaign_roas',
              campaign: normalizedCampaignName,
              value: averageROAS,
              count: campaignData.length,
              query: query
            }
          }
        }
      }
    }
    
    // Handle campaign-specific revenue queries (HIGHEST PRIORITY)
    if ((lowerQuery.includes('revenue') || lowerQuery.includes('earnings')) && isCampaignQuery && !lowerQuery.includes('each') && !lowerQuery.includes('individual')) {
      const campaignNames = ['freshnest summer grilling', 'freshnest back to school', 'freshnest holiday recipes', 'freshnest pantry staples']
      const detectedCampaign = campaignNames.find(campaign => lowerQuery.includes(campaign))
      
      if (detectedCampaign) {
        const normalizedCampaignName = detectedCampaign.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ')
        
        const campaignData = data.filter(item => 
          item.dimensions.campaign.toLowerCase().includes(detectedCampaign)
        )
        
        if (campaignData.length > 0) {
          const totalRevenue = campaignData.reduce((sum, item) => sum + (item.metrics.revenue || 0), 0)
          
          return {
            content: `Total revenue from ${normalizedCampaignName}: $${totalRevenue.toLocaleString()}`,
            data: {
              type: 'campaign_revenue',
              campaign: normalizedCampaignName,
              value: totalRevenue,
              count: campaignData.length,
              query: query
            }
          }
        }
      }
    }
    
    // Handle campaign-specific spend queries (HIGHEST PRIORITY)
    if ((lowerQuery.includes('spend') || lowerQuery.includes('cost') || lowerQuery.includes('budget')) && isCampaignQuery && !lowerQuery.includes('each') && !lowerQuery.includes('individual')) {
      const campaignNames = ['freshnest summer grilling', 'freshnest back to school', 'freshnest holiday recipes', 'freshnest pantry staples']
      const detectedCampaign = campaignNames.find(campaign => lowerQuery.includes(campaign))
      
      if (detectedCampaign) {
        const normalizedCampaignName = detectedCampaign.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ')
        
        const campaignData = data.filter(item => 
          item.dimensions.campaign.toLowerCase().includes(detectedCampaign)
        )
        
        if (campaignData.length > 0) {
          const totalSpend = campaignData.reduce((sum, item) => sum + item.metrics.spend, 0)
          
          return {
            content: `Total spend on ${normalizedCampaignName}: $${totalSpend.toLocaleString()}`,
            data: {
              type: 'campaign_spend',
              campaign: normalizedCampaignName,
              value: totalSpend,
              count: campaignData.length,
              query: query
            }
          }
        }
      }
    }
    
    // Handle campaign-specific impressions queries (HIGHEST PRIORITY)
    if ((lowerQuery.includes('impressions') || lowerQuery.includes('views')) && isCampaignQuery && !lowerQuery.includes('each') && !lowerQuery.includes('individual')) {
      const campaignNames = ['freshnest summer grilling', 'freshnest back to school', 'freshnest holiday recipes', 'freshnest pantry staples']
      const detectedCampaign = campaignNames.find(campaign => lowerQuery.includes(campaign))
      
      if (detectedCampaign) {
        const normalizedCampaignName = detectedCampaign.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ')
        
        const campaignData = data.filter(item => 
          item.dimensions.campaign.toLowerCase().includes(detectedCampaign)
        )
        
        if (campaignData.length > 0) {
          const totalImpressions = campaignData.reduce((sum, item) => sum + item.metrics.impressions, 0)
          
          return {
            content: `Total impressions from ${normalizedCampaignName}: ${totalImpressions.toLocaleString()}`,
            data: {
              type: 'campaign_impressions',
              campaign: normalizedCampaignName,
              value: totalImpressions,
              count: campaignData.length,
              query: query
            }
          }
        }
      }
    }
    
    // Handle campaign-specific clicks queries (HIGHEST PRIORITY)
    if ((lowerQuery.includes('clicks') || lowerQuery.includes('interactions')) && isCampaignQuery && !lowerQuery.includes('each') && !lowerQuery.includes('individual')) {
      const campaignNames = ['freshnest summer grilling', 'freshnest back to school', 'freshnest holiday recipes', 'freshnest pantry staples']
      const detectedCampaign = campaignNames.find(campaign => lowerQuery.includes(campaign))
      
      if (detectedCampaign) {
        const normalizedCampaignName = detectedCampaign.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ')
        
        const campaignData = data.filter(item => 
          item.dimensions.campaign.toLowerCase().includes(detectedCampaign)
        )
        
        if (campaignData.length > 0) {
          const totalClicks = campaignData.reduce((sum, item) => sum + item.metrics.clicks, 0)
          
          return {
            content: `Total clicks from ${normalizedCampaignName}: ${totalClicks.toLocaleString()}`,
            data: {
              type: 'campaign_clicks',
              campaign: normalizedCampaignName,
              value: totalClicks,
              count: campaignData.length,
              query: query
            }
          }
        }
      }
    }
    
    // Handle "metric for each campaign" queries (HIGH PRIORITY - moved to top)
    if (isCampaignQuery && (lowerQuery.includes('each') || lowerQuery.includes('individual') || lowerQuery.includes('for each'))) {
      // Determine which metric is being asked for
      let metricType = 'ctr'
      let metricName = 'CTR'
      let formatFunction = (value: number) => `${(value * 100).toFixed(2)}%`
      
      if (isCTRQuery) {
        metricType = 'ctr'
        metricName = 'CTR'
        formatFunction = (value: number) => `${(value * 100).toFixed(2)}%`
      } else if (isROASQuery) {
        metricType = 'roas'
        metricName = 'ROAS'
        formatFunction = (value: number) => `${value.toFixed(2)}x`
      } else if (lowerQuery.includes('cpc') || lowerQuery.includes('cost per click')) {
        metricType = 'cpc'
        metricName = 'CPC'
        formatFunction = (value: number) => `$${value.toFixed(2)}`
      } else if (lowerQuery.includes('cpa') || lowerQuery.includes('cost per acquisition')) {
        metricType = 'cpa'
        metricName = 'CPA'
        formatFunction = (value: number) => `$${value.toFixed(2)}`
      }
      
      // Normalize campaign names
      const normalizedData = data.map(item => ({
        ...item,
        dimensions: {
          ...item.dimensions,
          campaign: item.dimensions.campaign.trim()
        }
      }))
      
      // Group data by campaign and calculate average metric per campaign
      const campaignGroups: Record<string, { totalMetric: number, count: number }> = {}
      normalizedData.forEach(item => {
        const campaignName = item.dimensions.campaign
        if (!campaignGroups[campaignName]) {
          campaignGroups[campaignName] = { totalMetric: 0, count: 0 }
        }
        campaignGroups[campaignName].totalMetric += item.metrics[metricType as keyof typeof item.metrics] as number
        campaignGroups[campaignName].count++
      })
      
      // Calculate average metric for each campaign
      const campaignMetrics = Object.entries(campaignGroups)
        .map(([campaign, data]) => ({
          campaign,
          avgMetric: data.count > 0 ? data.totalMetric / data.count : 0
        }))
        .sort((a, b) => b.avgMetric - a.avgMetric) // Sort by metric descending
      
      const content = `${metricName} for each campaign:\n${campaignMetrics.map((item, index) => 
        `${index + 1}. ${item.campaign}: ${formatFunction(item.avgMetric)}`
      ).join('\n')}`
      
      return {
        content,
        data: {
          type: 'campaign_metric_breakdown',
          metric: metricType,
          campaigns: campaignMetrics,
          query: query
        }
      }
    }


    
    // Handle platform spend queries (NEW: Critical missing functionality)
    if (detectedPlatform && isSpendQuery) {
      const actualPlatform = PLATFORM_MAP[detectedPlatform]
      const filteredData = data.filter(item => item.dimensions.platform === actualPlatform)
      
      if (filteredData.length > 0) {
        const totalSpend = filteredData.reduce((sum, item) => sum + item.metrics.spend, 0)
        return {
          content: `Total spend for ${actualPlatform}: $${totalSpend.toLocaleString()}`,
          data: {
            type: 'platform_spend',
            platform: actualPlatform,
            value: totalSpend,
            count: filteredData.length,
            query: query
          }
        }
      }
    }
    
    // Check for other platform-specific queries and handle them with keyword processing
    // BUT ONLY if they haven't been caught by our critical handlers above
    const hasPlatform = KEYWORDS.PLATFORMS.some(platform => lowerQuery.includes(platform))
    
    if (hasPlatform && !lowerQuery.includes('revenue') && !lowerQuery.includes('roas') && !lowerQuery.includes('return on ad spend')) {
      return processWithKeywords(query, data)
    }
    
    // TEMPORARILY DISABLED: Check for platform queries with "platform" keyword (IMPROVED: Better detection)
    // if (lowerQuery.includes('platform') && (lowerQuery.includes('highest') || lowerQuery.includes('best') || lowerQuery.includes('top') || lowerQuery.includes('which')) &&
    //     !lowerQuery.includes('performed best') && 
    //     !lowerQuery.includes('was the best') && 
    //     !lowerQuery.includes('had the best performance') &&
    //     !lowerQuery.includes('highest revenue') &&
    //     !lowerQuery.includes('generated the most revenue') &&
    //     !lowerQuery.includes('most revenue') &&
    //     !lowerQuery.includes('most impressions') &&
    //     !lowerQuery.includes('got the most impressions') &&
    //     !lowerQuery.includes('most traffic') &&
    //     !lowerQuery.includes('most clicks') &&
    //     !lowerQuery.includes('got the most clicks') &&
    //     !lowerQuery.includes('most engagement') &&
    //     !lowerQuery.includes('most expensive') &&
    //     !lowerQuery.includes('costs the most') &&
    //     !lowerQuery.includes('most profitable') &&
    //     !lowerQuery.includes('makes the most money')) {
    //   return processWithKeywords(query, data)
    // }
    
    // Check for "which platform" queries specifically (BUT NOT comparative queries)
    if (lowerQuery.includes('which platform') && 
        !lowerQuery.includes('performed best') && 
        !lowerQuery.includes('was the best') && 
        !lowerQuery.includes('had the best performance') &&
        !lowerQuery.includes('highest revenue') &&
        !lowerQuery.includes('generated the most revenue') &&
        !lowerQuery.includes('most revenue') &&
        !lowerQuery.includes('most impressions') &&
        !lowerQuery.includes('got the most impressions') &&
        !lowerQuery.includes('most traffic') &&
        !lowerQuery.includes('most clicks') &&
        !lowerQuery.includes('got the most clicks') &&
        !lowerQuery.includes('most engagement') &&
        !lowerQuery.includes('most expensive') &&
        !lowerQuery.includes('costs the most') &&
        !lowerQuery.includes('most profitable') &&
        !lowerQuery.includes('makes the most money')) {
      return processWithKeywords(query, data)
    }
    
    // Check for visualization requests for platform data
    if (lowerQuery.includes('visual') || lowerQuery.includes('chart') || lowerQuery.includes('graph') || lowerQuery.includes('plot')) {
      if (lowerQuery.includes('platform') || lowerQuery.includes('roas')) {
        return processWithKeywords(query, data)
      }
    }
    
    // If no handler was triggered, use OpenAI or fallback
    console.log('DEBUG: No handler triggered, using OpenAI or fallback')
    if (config.openai.apiKey) {
      try {
        return await processWithOpenAI(query, data)
      } catch (openaiError) {
        return processWithKeywords(query, data)
      }
    } else {
      // Fallback to enhanced keyword processing
      return processWithKeywords(query, data)
    }
  } catch (error) {
    // Final fallback - return a basic response
    return {
      content: `I encountered an error processing your query: "${query}". Please try rephrasing your question or ask about specific metrics like CTR, ROAS, or spend.`,
      data: {
        type: 'error',
        query: query,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

async function processWithOpenAI(query: string, data: MarketingData[]) {
  const systemPrompt = `You are a marketing data analyst assistant. You help users understand their campaign data by translating natural language queries into data operations.

Available data fields:
- Metrics: impressions, clicks, conversions, spend, revenue, ctr, cpc, cpa, roas
- Dimensions: campaign, adGroup, keyword, device, location, audience
- Date: campaign date

Available operations:
- SUM: Calculate totals
- AVERAGE: Calculate averages
- FILTER: Filter by specific criteria
- SORT: Sort by metrics (group by campaign name)
- COMPARE: Compare campaigns or time periods
- TOP: Find top performers
- COUNT_CAMPAIGNS: Count unique campaigns (use this for "how many campaigns" queries)
- GRAPH: Generate chart data (group by campaign name)
- PLATFORM: Analyze performance by platform (device field contains platform data)

IMPORTANT: When counting campaigns or generating graphs, group by unique campaign names, not individual data rows. Each campaign may have multiple rows across different platforms, ad groups, etc.

Respond with a JSON object containing:
{
  "operation": "SUM|AVERAGE|FILTER|SORT|COMPARE|TOP|COUNT_CAMPAIGNS|GRAPH|PLATFORM",
  "metric": "metric_name",
  "filters": {"dimension": "value"},
  "sortBy": "metric_name",
  "limit": number,
  "explanation": "natural language explanation of what you're doing"
}`

  const userPrompt = `User query: "${query}"

      Available data: campaign performance metrics

Please analyze this query and return the appropriate operation.`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.openai.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.openai.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 500
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const result = await response.json()
    const aiResponse = result.choices[0]?.message?.content

    if (!aiResponse) {
      throw new Error('No response from OpenAI')
    }

    // Parse the AI response
    const operation = parseAIResponse(aiResponse)
    
    // Execute the operation on the data
    return executeOperation(operation, data, query)

  } catch (error) {
    throw error
  }
}

function parseAIResponse(response: string) {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    
    // Fallback parsing based on common patterns
    const lowerResponse = response.toLowerCase()
    
    if (lowerResponse.includes('sum') || lowerResponse.includes('total')) {
      return { operation: 'SUM', explanation: 'Calculating total' }
    }
    if (lowerResponse.includes('average') || lowerResponse.includes('avg')) {
      return { operation: 'AVERAGE', explanation: 'Calculating average' }
    }
    if (lowerResponse.includes('top') || lowerResponse.includes('best')) {
      return { operation: 'TOP', explanation: 'Finding top performers' }
    }
    if (lowerResponse.includes('filter') || lowerResponse.includes('where')) {
      return { operation: 'FILTER', explanation: 'Filtering data' }
    }
    
    return { operation: 'HELP', explanation: 'Need clarification' }
  } catch (error) {
    return { operation: 'HELP', explanation: 'Could not parse response' }
  }
}

function executeOperation(operation: any, data: MarketingData[], originalQuery: string) {
  const { operation: op, metric, filters, sortBy, limit, explanation } = operation

  switch (op) {
    case 'SUM':
      return executeSum(data, metric, filters, originalQuery)
    case 'AVERAGE':
      return executeAverage(data, metric, filters, originalQuery)
    case 'TOP':
      return executeTop(data, metric, limit || 5, filters, originalQuery)
    case 'FILTER':
      return executeFilter(data, filters, originalQuery)
    case 'SORT':
      return executeSort(data, sortBy, limit, originalQuery)
    case 'COMPARE':
      return executeCompare(data, metric, filters, originalQuery)
    case 'COUNT_CAMPAIGNS':
      return executeCountCampaigns(data, originalQuery)
    case 'GRAPH':
      return executeGraph(data, metric || 'spend', filters, originalQuery)
    case 'PLATFORM':
      return executeTop(data, 'platform', limit || 5, filters, originalQuery)
    default:
      return {
        content: `I understand you're asking about "${originalQuery}". I can help you analyze your campaign data. Try asking about totals, averages, top performers, or specific campaigns.`,
        data: { type: 'help', query: originalQuery }
      }
  }
}

function executeSum(data: MarketingData[], metric: string, filters: any, query: string) {
  let filteredData = applyFilters(data, filters)
  
  const total = filteredData.reduce((sum, item) => {
    const value = item.metrics[metric as keyof typeof item.metrics]
    return sum + (typeof value === 'number' ? value : 0)
  }, 0)

  const metricName = metric || 'value'
  const formattedValue = formatValue(total, metricName)
  
  return {
            content: `Total ${metricName}: ${formattedValue}`,
    data: {
      type: 'sum',
      metric: metricName,
      value: total,
      count: filteredData.length,
      query: query
    }
  }
}

function executeAverage(data: MarketingData[], metric: string, filters: any, query: string) {
  let filteredData = applyFilters(data, filters)
  
  const total = filteredData.reduce((sum, item) => {
    const value = item.metrics[metric as keyof typeof item.metrics]
    return sum + (typeof value === 'number' ? value : 0)
  }, 0)
  
  const average = filteredData.length > 0 ? total / filteredData.length : 0
  const metricName = metric || 'value'
  const formattedValue = formatValue(average, metricName)

  return {
            content: `Average ${metricName}: ${formattedValue}`,
    data: {
      type: 'average',
      metric: metricName,
      value: average,
      count: filteredData.length,
      query: query
    }
  }
}

function executeTop(data: MarketingData[], metric: string, limit: number, filters: any, query: string) {
  let filteredData = applyFilters(data, filters)
  
  // Handle platform queries by grouping by platform
  if (metric === 'platform' || metric === 'device') {
    const platformGroups: Record<string, { totalSpend: number, totalRevenue: number, count: number }> = {}
    
    filteredData.forEach(item => {
      const platform = item.dimensions.platform
      if (!platformGroups[platform]) {
        platformGroups[platform] = { totalSpend: 0, totalRevenue: 0, count: 0 }
      }
      platformGroups[platform].totalSpend += item.metrics.spend || 0
      platformGroups[platform].totalRevenue += item.metrics.revenue || 0
      platformGroups[platform].count++
    })
    
    // Calculate ROAS for each platform and sort by ROAS
    const sortedPlatforms = Object.entries(platformGroups)
      .map(([platform, data]) => ({
        platform,
        roas: data.totalSpend > 0 ? data.totalRevenue / data.totalSpend : 0,
        spend: data.totalSpend,
        revenue: data.totalRevenue,
        count: data.count
      }))
      .sort((a, b) => b.roas - a.roas)
      .slice(0, limit || 5)
      .map((item) => ({
        platform: item.platform,
        value: item.roas,
        count: item.count,
        formattedValue: `${item.roas.toFixed(2)}x ROAS ($${item.spend.toLocaleString()} spend, $${item.revenue.toLocaleString()} revenue)`
      }))
    
    const content = `Top ${limit || 5} platforms by ROAS:\n${sortedPlatforms.map((item, index) => 
      `${index + 1}. ${item.platform}: ${item.formattedValue}`
    ).join('\n')}`
    
    return {
      content,
      data: {
        type: 'top_platforms',
        platforms: sortedPlatforms,
        query: query
      }
    }
  }
  
  // Handle regular metric queries
  const sorted = filteredData.sort((a, b) => {
    const aValue = a.metrics[metric as keyof typeof a.metrics] as number || 0
    const bValue = b.metrics[metric as keyof typeof b.metrics] as number || 0
    return bValue - aValue
  }).slice(0, limit)

  const metricName = metric || 'performance'
  const topCampaigns = sorted.map(item => {
    const value = item.metrics[metric as keyof typeof item.metrics] as number || 0
    return {
      campaign: item.dimensions.campaign,
      value: value,
      formattedValue: formatValue(value, metricName)
    }
  })

  const content = `Top ${limit} campaigns by ${metricName}:\n${topCampaigns.map((item, index) => 
    `${index + 1}. ${item.campaign}: ${item.formattedValue}`
  ).join('\n')}`

  return {
    content,
    data: {
      type: 'top',
      metric: metricName,
      campaigns: topCampaigns,
      query: query
    }
  }
}

function executeFilter(data: MarketingData[], filters: any, query: string) {
  const filteredData = applyFilters(data, filters)
  
      const content = `Found campaigns matching your criteria:\n${filteredData.map(item => 
            `• ${item.dimensions.campaign} (${item.dimensions.platform}) - ${formatValue(item.metrics.revenue, 'revenue')}`
  ).join('\n')}`

  return {
    content,
    data: {
      type: 'filter',
      results: filteredData,
      count: filteredData.length,
      query: query
    }
  }
}

function executeSort(data: MarketingData[], sortBy: string, limit: number, query: string) {
  // Group data by campaign name and calculate totals or averages
  const campaignGroups: Record<string, { total: number, count: number }> = {}
  data.forEach(item => {
    const campaignName = item.dimensions.campaign
    const value = item.metrics[sortBy as keyof typeof item.metrics] as number || 0
    
    if (!campaignGroups[campaignName]) {
      campaignGroups[campaignName] = { total: 0, count: 0 }
    }
    
    // For CTR, average the values; for other metrics, sum them
    if (sortBy === 'ctr') {
      campaignGroups[campaignName].total += value
      campaignGroups[campaignName].count += 1
    } else {
      campaignGroups[campaignName].total += value
      campaignGroups[campaignName].count += 1
    }
  })
  
  // Calculate final values (average for CTR, sum for others)
  const campaignValues: Record<string, number> = {}
  Object.entries(campaignGroups).forEach(([campaign, data]) => {
    if (sortBy === 'ctr') {
      campaignValues[campaign] = data.count > 0 ? data.total / data.count : 0
    } else {
      campaignValues[campaign] = data.total
    }
  })
  
  // Sort campaigns by the metric value
  const sortedCampaigns = Object.entries(campaignValues)
    .sort(([,a], [,b]) => b - a)
    .slice(0, limit || 10)
    .map(([campaign, value]) => ({
      campaign,
      value,
      formattedValue: formatValue(value, sortBy)
    }))

  const content = `Campaigns sorted by ${sortBy}:\n${sortedCampaigns.map((item, index) => 
    `${index + 1}. ${item.campaign}: ${item.formattedValue}`
  ).join('\n')}`

  return {
    content,
    data: {
      type: 'sort',
      metric: sortBy,
      results: sortedCampaigns,
      query: query
    }
  }
}

function executeCompare(data: MarketingData[], metric: string, filters: any, query: string) {
  // Compare by platform
  const platformGroups = data.reduce((groups, item) => {
    const platform = item.dimensions.platform
    if (!groups[platform]) groups[platform] = []
    groups[platform].push(item)
    return groups
  }, {} as Record<string, MarketingData[]>)

  const comparisons = Object.entries(platformGroups).map(([platform, items]) => {
    const total = (items as MarketingData[]).reduce((sum, item) => {
      const value = item.metrics[metric as keyof typeof item.metrics]
      return sum + (typeof value === 'number' && value !== null && value !== undefined ? value : 0)
    }, 0)
    return { platform, total, count: (items as MarketingData[]).length }
  })

  const content = `Comparison by platform for ${metric}:\n${comparisons.map(comp => 
    `• ${comp.platform}: ${formatValue(comp.total, metric)}`
  ).join('\n')}`

  return {
    content,
    data: {
      type: 'compare',
      metric,
      comparisons,
      query: query
    }
  }
}

function executeCountCampaigns(data: MarketingData[], query: string) {
  // Normalize campaign names to handle trailing spaces and duplicates
  const normalizedData = data.map(item => ({
    ...item,
    dimensions: {
      ...item.dimensions,
      campaign: item.dimensions.campaign.trim() // Remove trailing spaces
    }
  }))
  
  const uniqueCampaigns = Array.from(new Set(normalizedData.map(item => item.dimensions.campaign)))
  const campaignCount = uniqueCampaigns.length
  
  // Group data by normalized campaign name and calculate total spend per campaign
  const campaignGroups: Record<string, { spend: number, impressions: number, clicks: number }> = {}
  normalizedData.forEach(item => {
    const campaignName = item.dimensions.campaign
    if (!campaignGroups[campaignName]) {
      campaignGroups[campaignName] = { spend: 0, impressions: 0, clicks: 0 }
    }
    campaignGroups[campaignName].spend += item.metrics.spend
    campaignGroups[campaignName].impressions += item.metrics.impressions
    campaignGroups[campaignName].clicks += item.metrics.clicks
  })
  
  // Create formatted list of campaigns with their total spend
  const campaignList = uniqueCampaigns.map(campaignName => {
    const totals = campaignGroups[campaignName]
    return `• ${campaignName} - $${totals.spend.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`
  }).join('\n')
  
  return {
    content: `Found ${campaignCount} campaigns:\n${campaignList}`,
    data: { 
      uniqueCampaigns,
      campaignCount,
      campaignGroups,
      type: 'campaign_count',
      query: query
    }
  }
}

function executeGraph(data: MarketingData[], metric: string, filters: any, query: string) {
  let filteredData = applyFilters(data, filters)
  
  // Group data by campaign name and calculate totals
  const campaignGroups: Record<string, number> = {}
  filteredData.forEach(item => {
    const campaignName = item.dimensions.campaign
    const value = item.metrics[metric as keyof typeof item.metrics] as number
    campaignGroups[campaignName] = (campaignGroups[campaignName] || 0) + (value || 0)
  })
  
  // Sort campaigns by the metric value
  const sortedCampaigns = Object.entries(campaignGroups)
    .sort(([,a], [,b]) => b - a)
    .map(([campaign, value]) => ({
      campaign,
      value,
      formattedValue: formatValue(value, metric)
    }))
  
  const content = `Campaigns by ${metric}:\n${sortedCampaigns.map((item, index) => 
    `${index + 1}. ${item.campaign}: ${item.formattedValue}`
  ).join('\n')}`
  
  return {
    content,
    data: {
      type: 'graph',
      metric,
      campaigns: sortedCampaigns,
      chartData: sortedCampaigns.map(item => ({
        name: item.campaign,
        value: item.value
      })),
      query: query
    }
  }
}

function applyFilters(data: MarketingData[], filters: any): MarketingData[] {
  if (!filters) return data
  
  return data.filter(item => {
    return Object.entries(filters).every(([key, value]) => {
      if (key in item.dimensions) {
        return item.dimensions[key as keyof typeof item.dimensions] === value
      }
      return true
    })
  })
}

function formatValue(value: number | undefined, metric: string): string {
  if (value === undefined || value === null || isNaN(value)) {
    return 'N/A'
  }
  
  try {
    switch (metric) {
      case 'spend':
      case 'revenue':
        return `$${value.toLocaleString()}`
      case 'ctr':
        return `${(value * 100).toFixed(2)}%`
      case 'cpc':
      case 'cpa':
        return `$${value.toFixed(2)}`
      case 'roas':
        return `${value.toFixed(2)}x`
      default:
        return value.toLocaleString()
    }
  } catch (error) {
    return 'N/A'
  }
}

function processWithKeywords(query: string, data: MarketingData[]) {
  const lowerQuery = query.toLowerCase()
  
  // Keyword detection using shared constants
  const isCTRQuery = KEYWORDS.CTR.some(keyword => lowerQuery.includes(keyword))
  const isROASQuery = KEYWORDS.ROAS.some(keyword => lowerQuery.includes(keyword))
  const isCountQuery = KEYWORDS.COUNT.some(keyword => lowerQuery.includes(keyword))
  const isSpendQuery = KEYWORDS.SPEND.some(keyword => lowerQuery.includes(keyword))
  const isCampaignQuery = KEYWORDS.CAMPAIGN.some(keyword => lowerQuery.includes(keyword))
  const isPlatformQuery = KEYWORDS.PLATFORM.some(keyword => lowerQuery.includes(keyword))
  const isVizQuery = KEYWORDS.VIZ.some(keyword => lowerQuery.includes(keyword))
  const isTopQuery = KEYWORDS.TOP.some(keyword => lowerQuery.includes(keyword))
  
  // Platform detection for specific platform queries
  const detectedPlatform = KEYWORDS.PLATFORMS.find(platform => lowerQuery.includes(platform))





  // Handle campaign-specific CTR queries (HIGHEST PRIORITY - moved to very top)
  const campaignNames = KEYWORDS.CAMPAIGN_NAMES
  const detectedCampaign = campaignNames.find(campaign => lowerQuery.includes(campaign))
  
  // Handle "metric for each campaign" queries (HIGH PRIORITY)
  if (isCampaignQuery && (lowerQuery.includes('each') || lowerQuery.includes('individual') || lowerQuery.includes('for each'))) {
    // Determine which metric is being asked for
    let metricType = 'ctr'
    let metricName = 'CTR'
    let formatFunction = (value: number) => `${(value * 100).toFixed(2)}%`
    
    if (isCTRQuery) {
      metricType = 'ctr'
      metricName = 'CTR'
      formatFunction = (value: number) => `${(value * 100).toFixed(2)}%`
    } else if (isROASQuery) {
      metricType = 'roas'
      metricName = 'ROAS'
      formatFunction = (value: number) => `${value.toFixed(2)}x`
    } else if (lowerQuery.includes('cpc') || lowerQuery.includes('cost per click')) {
      metricType = 'cpc'
      metricName = 'CPC'
      formatFunction = (value: number) => `$${value.toFixed(2)}`
    } else if (lowerQuery.includes('cpa') || lowerQuery.includes('cost per acquisition')) {
      metricType = 'cpa'
      metricName = 'CPA'
      formatFunction = (value: number) => `$${value.toFixed(2)}`
    }
    
    // Normalize campaign names
    const normalizedData = data.map(item => ({
      ...item,
      dimensions: {
        ...item.dimensions,
        campaign: item.dimensions.campaign.trim()
      }
    }))
    
    // Group data by campaign and calculate average metric per campaign
    const campaignGroups: Record<string, { totalMetric: number, count: number }> = {}
    normalizedData.forEach(item => {
      const campaignName = item.dimensions.campaign
      if (!campaignGroups[campaignName]) {
        campaignGroups[campaignName] = { totalMetric: 0, count: 0 }
      }
      campaignGroups[campaignName].totalMetric += item.metrics[metricType as keyof typeof item.metrics] as number
      campaignGroups[campaignName].count++
    })
    
    // Calculate average metric for each campaign
    const campaignMetrics = Object.entries(campaignGroups)
      .map(([campaign, data]) => ({
        campaign,
        avgMetric: data.count > 0 ? data.totalMetric / data.count : 0
      }))
      .sort((a, b) => b.avgMetric - a.avgMetric) // Sort by metric descending
    
    const content = `${metricName} for each campaign:\n${campaignMetrics.map((item, index) => 
      `${index + 1}. ${item.campaign}: ${formatFunction(item.avgMetric)}`
    ).join('\n')}`
    
    return {
      content,
      data: {
        type: 'campaign_metric_breakdown',
        metric: metricType,
        campaigns: campaignMetrics,
        query: query
      }
    }
  }



  // Handle overall ROAS calculation (IMPROVED: Better detection)
  if (lowerQuery.includes('overall roas') || lowerQuery.includes('total roas') || lowerQuery.includes('return on ad spend') || (isROASQuery && (lowerQuery.includes('overall') || lowerQuery.includes('total') || lowerQuery.includes('across all')))) {
    const totalSpend = data.reduce((sum, item) => sum + item.metrics.spend, 0)
    const totalRevenue = data.reduce((sum, item) => sum + item.metrics.revenue, 0)
    const overallROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0
    
    return {
      content: `Overall ROAS across all campaigns: ${overallROAS.toFixed(2)}x`,
      data: {
        type: 'overall_roas',
        value: overallROAS,
        totalSpend,
        totalRevenue,
        query: query
      }
    }
  }

  // Handle overall CPC calculation (IMPROVED: Better detection)
  if (lowerQuery.includes('average cpc') || lowerQuery.includes('cost per click') || lowerQuery.includes('cpc') || (lowerQuery.includes('cost') && lowerQuery.includes('click'))) {
    const totalSpend = data.reduce((sum, item) => sum + item.metrics.spend, 0)
    const totalClicks = data.reduce((sum, item) => sum + item.metrics.clicks, 0)
    const averageCPC = totalClicks > 0 ? totalSpend / totalClicks : 0
    
    return {
      content: `Average CPC across all campaigns: $${averageCPC.toFixed(2)}`,
      data: {
        type: 'average_cpc',
        value: averageCPC,
        totalSpend,
        totalClicks,
        query: query
      }
    }
  }

  // Handle overall CPM calculation (IMPROVED: Better detection)
  if (lowerQuery.includes('average cpm') || lowerQuery.includes('cost per thousand') || lowerQuery.includes('cpm') || (lowerQuery.includes('cost') && lowerQuery.includes('thousand'))) {
    const totalSpend = data.reduce((sum, item) => sum + item.metrics.spend, 0)
    const totalImpressions = data.reduce((sum, item) => sum + item.metrics.impressions, 0)
    const averageCPM = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0
    
    return {
      content: `Average CPM across all campaigns: $${averageCPM.toFixed(2)}`,
      data: {
        type: 'average_cpm',
        value: averageCPM,
        totalSpend,
        totalImpressions,
        query: query
      }
    }
  }

  // Handle overall CPA calculation (IMPROVED: Better detection)
  if (lowerQuery.includes('average cpa') || lowerQuery.includes('cost per acquisition') || lowerQuery.includes('cpa') || (lowerQuery.includes('cost') && lowerQuery.includes('acquisition'))) {
    const totalSpend = data.reduce((sum, item) => sum + item.metrics.spend, 0)
    const totalConversions = data.reduce((sum, item) => sum + item.metrics.conversions, 0)
    const averageCPA = totalConversions > 0 ? totalSpend / totalConversions : 0
    
    return {
      content: `Average CPA across all campaigns: $${averageCPA.toFixed(2)}`,
      data: {
        type: 'average_cpa',
        value: averageCPA,
        totalSpend,
        totalConversions,
        query: query
      }
    }
  }

  // Handle total clicks queries (NEW: Missing metric)
  if (lowerQuery.includes('total clicks') || (lowerQuery.includes('clicks') && lowerQuery.includes('total'))) {
    const totalClicks = data.reduce((sum, item) => sum + item.metrics.clicks, 0)
    return {
      content: `Total clicks across all campaigns: ${totalClicks.toLocaleString()}`,
      data: {
        type: 'total_clicks',
        value: totalClicks,
        query: query
      }
    }
  }

  // Handle total conversions queries (NEW: Missing metric)
  if (lowerQuery.includes('total conversions') || (lowerQuery.includes('conversions') && lowerQuery.includes('total'))) {
    const totalConversions = data.reduce((sum, item) => sum + item.metrics.conversions, 0)
    return {
      content: `Total conversions across all campaigns: ${totalConversions.toLocaleString()}`,
      data: {
        type: 'total_conversions',
        value: totalConversions,
        query: query
      }
    }
  }


  

  
  // Handle CTR ranking queries (FIXED: was returning ROAS)
  if (isTopQuery && isCTRQuery && isCampaignQuery) {
    // Normalize campaign names to handle trailing spaces and duplicates
    const normalizedData = data.map(item => ({
      ...item,
      dimensions: {
        ...item.dimensions,
        campaign: item.dimensions.campaign.trim() // Remove trailing spaces
      }
    }))
    
    // Group data by normalized campaign name and calculate average CTR per campaign
    const campaignGroups: Record<string, { totalCTR: number, count: number }> = {}
    normalizedData.forEach(item => {
      const campaignName = item.dimensions.campaign
      if (!campaignGroups[campaignName]) {
        campaignGroups[campaignName] = { totalCTR: 0, count: 0 }
      }
      campaignGroups[campaignName].totalCTR += item.metrics.ctr
      campaignGroups[campaignName].count++
    })
    
    // Calculate average CTR for each campaign and sort
    const campaignCTR = Object.entries(campaignGroups)
      .map(([campaign, data]) => ({
        campaign,
        avgCTR: data.count > 0 ? data.totalCTR / data.count : 0
      }))
      .sort((a, b) => b.avgCTR - a.avgCTR)
      .slice(0, 3) // Top 3
    
    const content = `Top 3 campaigns by CTR:\n${campaignCTR.map((item, index) => 
      `${index + 1}. ${item.campaign}: ${(item.avgCTR * 100).toFixed(2)}% CTR`
    ).join('\n')}`
    
    return {
      content,
      data: {
        type: 'top_ctr',
        campaigns: campaignCTR,
        query: query
      }
    }
  }
  
  // Handle ROAS ranking queries
  if (isTopQuery && isROASQuery && isCampaignQuery) {
    // Group data by campaign name and calculate average ROAS per campaign
    const campaignGroups: Record<string, { totalROAS: number, count: number }> = {}
    data.forEach(item => {
      const campaignName = item.dimensions.campaign
      if (!campaignGroups[campaignName]) {
        campaignGroups[campaignName] = { totalROAS: 0, count: 0 }
      }
      campaignGroups[campaignName].totalROAS += item.metrics.roas
      campaignGroups[campaignName].count++
    })
    
    // Calculate average ROAS for each campaign and sort
    const campaignROAS = Object.entries(campaignGroups)
      .map(([campaign, data]) => ({
        campaign,
        avgROAS: data.count > 0 ? data.totalROAS / data.count : 0
      }))
      .sort((a, b) => b.avgROAS - a.avgROAS)
      .slice(0, 3) // Top 3
    
    const content = `Top 3 campaigns by ROAS:\n${campaignROAS.map((item, index) => 
      `${index + 1}. ${item.campaign}: ${item.avgROAS.toFixed(2)}x ROAS`
    ).join('\n')}`
    
    return {
      content,
      data: {
        type: 'top_roas',
        campaigns: campaignROAS,
        query: query
      }
    }
  }
  
  // Handle "how many campaigns" queries with proper grouping (IMPROVED)
  if (isCountQuery && isCampaignQuery) {
    // Normalize campaign names to handle trailing spaces and duplicates
    const normalizedData = data.map(item => ({
      ...item,
      dimensions: {
        ...item.dimensions,
        campaign: item.dimensions.campaign.trim() // Remove trailing spaces
      }
    }))
    
    const uniqueCampaigns = Array.from(new Set(normalizedData.map(item => item.dimensions.campaign)))
    const campaignCount = uniqueCampaigns.length
    
    // Group data by normalized campaign name and calculate total spend per campaign
    const campaignGroups: Record<string, { spend: number, impressions: number, clicks: number }> = {}
    normalizedData.forEach(item => {
      const campaignName = item.dimensions.campaign
      if (!campaignGroups[campaignName]) {
        campaignGroups[campaignName] = { spend: 0, impressions: 0, clicks: 0 }
      }
      campaignGroups[campaignName].spend += item.metrics.spend
      campaignGroups[campaignName].impressions += item.metrics.impressions
      campaignGroups[campaignName].clicks += item.metrics.clicks
    })
    
    // Create formatted list of campaigns with their total spend
    const campaignList = uniqueCampaigns.map(campaignName => {
      const totals = campaignGroups[campaignName]
      return `• ${campaignName} - $${totals.spend.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`
    }).join('\n')
    
    return {
      content: `Found ${campaignCount} campaigns:\n${campaignList}`,
      data: { 
        uniqueCampaigns,
        campaignCount,
        campaignGroups,
        type: 'campaign_count',
        query: query
      }
    }
  }
  
  // Handle visualization requests for platform data
  if (isVizQuery && (isPlatformQuery || isROASQuery)) {
    
    // Group data by platform and calculate ROAS
    const platformGroups: Record<string, { totalSpend: number, totalRevenue: number, count: number }> = {}
    
    data.forEach(item => {
      const platform = item.dimensions.platform
      if (!platformGroups[platform]) {
        platformGroups[platform] = { totalSpend: 0, totalRevenue: 0, count: 0 }
      }
      platformGroups[platform].totalSpend += item.metrics.spend || 0
      platformGroups[platform].totalRevenue += item.metrics.revenue || 0
      platformGroups[platform].count++
    })
    
    // Calculate ROAS for each platform and sort by ROAS
    const platformROAS = Object.entries(platformGroups)
      .map(([platform, data]) => ({
        platform,
        roas: data.totalSpend > 0 ? data.totalRevenue / data.totalSpend : 0,
        spend: data.totalSpend,
        revenue: data.totalRevenue,
        count: data.count
      }))
      .sort((a, b) => b.roas - a.roas)
    
    const content = `Platform ROAS Visualization Data:\n${platformROAS.map((item, index) => 
      `${index + 1}. ${item.platform}: ${item.roas.toFixed(2)}x ROAS ($${item.spend.toLocaleString()} spend, $${item.revenue.toLocaleString()} revenue)`
    ).join('\n')}`
    
    return {
      content,
      data: {
        type: 'platform_visualization',
        platforms: platformROAS,
        chartData: {
          labels: platformROAS.map(p => p.platform),
          datasets: [
            {
              label: 'ROAS',
              data: platformROAS.map(p => p.roas),
              backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'],
              borderColor: ['#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED', '#0891B2'],
              borderWidth: 2
            }
          ]
        },
        query: query
      }
    }
  }
  
  // Enhanced keyword processing with more sophisticated matching (IMPROVED)
  if (lowerQuery.includes('total') && (lowerQuery.includes('impression') || lowerQuery.includes('impressions'))) {
    const total = data.reduce((sum, item) => sum + item.metrics.impressions, 0)
    return {
      content: `Total impressions across all campaigns: ${total.toLocaleString()}`,
      data: { 
        metric: 'impressions', 
        value: total, 
        type: 'total',
        query: query
      }
    }
  }
  
  if (isSpendQuery && (lowerQuery.includes('total') || lowerQuery.includes('sum') || lowerQuery.includes('overall'))) {
    const total = data.reduce((sum, item) => sum + item.metrics.spend, 0)
    return {
      content: `Total spend across all campaigns: $${total.toLocaleString()}`,
      data: { 
            metric: 'spend',
        value: total, 
        type: 'total',
        query: query
      }
    }
  }

  if (lowerQuery.includes('total') && (lowerQuery.includes('revenue') || lowerQuery.includes('earnings'))) {
    const total = data.reduce((sum, item) => sum + item.metrics.revenue, 0)
    return {
      content: `Total revenue across all campaigns: $${total.toLocaleString()}`,
      data: { 
        metric: 'revenue', 
        value: total, 
        type: 'total',
        query: query
      }
    }
  }
  
  // Handle best performing campaign queries (IMPROVED: distinguish between CTR and ROAS)
  if (isTopQuery && isCampaignQuery) {
    if (isCTRQuery) {
      // Find campaign with highest average CTR
      const campaignGroups: Record<string, { totalCTR: number, count: number }> = {}
      data.forEach(item => {
        const campaignName = item.dimensions.campaign
        if (!campaignGroups[campaignName]) {
          campaignGroups[campaignName] = { totalCTR: 0, count: 0 }
        }
        campaignGroups[campaignName].totalCTR += item.metrics.ctr
        campaignGroups[campaignName].count++
      })
      
      const bestCampaign = Object.entries(campaignGroups)
        .map(([campaign, data]) => ({
          campaign,
          avgCTR: data.count > 0 ? data.totalCTR / data.count : 0
        }))
        .reduce((best, current) => current.avgCTR > best.avgCTR ? current : best)
      
      return {
        content: `The best performing campaign by CTR is "${bestCampaign.campaign}" with an average CTR of ${(bestCampaign.avgCTR * 100).toFixed(2)}%`,
        data: { 
          campaign: bestCampaign, 
          type: 'best_ctr_performer',
          query: query
        }
      }
    } else if (isROASQuery) {
      // Find campaign with highest average ROAS
      const campaignGroups: Record<string, { totalROAS: number, count: number }> = {}
      data.forEach(item => {
        const campaignName = item.dimensions.campaign
        if (!campaignGroups[campaignName]) {
          campaignGroups[campaignName] = { totalROAS: 0, count: 0 }
        }
        campaignGroups[campaignName].totalROAS += item.metrics.roas
        campaignGroups[campaignName].count++
      })
      
      const bestCampaign = Object.entries(campaignGroups)
        .map(([campaign, data]) => ({
          campaign,
          avgROAS: data.count > 0 ? data.totalROAS / data.count : 0
        }))
        .reduce((best, current) => current.avgROAS > best.avgROAS ? current : best)
      
      return {
        content: `The best performing campaign by ROAS is "${bestCampaign.campaign}" with an average ROAS of ${bestCampaign.avgROAS.toFixed(2)}x`,
        data: { 
          campaign: bestCampaign, 
          type: 'best_roas_performer',
          query: query
        }
      }
    } else {
      // Default to ROAS if no specific metric mentioned
      const bestCampaign = data.reduce((best, current) => 
        current.metrics.roas > best.metrics.roas ? current : best
      )
      return {
        content: `The best performing campaign by ROAS is "${bestCampaign.dimensions.campaign}" with a ROAS of ${bestCampaign.metrics.roas.toFixed(2)}x`,
        data: { 
          campaign: bestCampaign, 
          type: 'best_performer',
          query: query
        }
      }
    }
  }
  
  if (lowerQuery.includes('average') && isCTRQuery) {
    const avgCTR = data.reduce((sum, item) => sum + item.metrics.ctr, 0) / data.length
    return {
      content: `Average CTR across all campaigns: ${(avgCTR * 100).toFixed(2)}%`,
      data: { 
        metric: 'ctr', 
        value: avgCTR, 
        type: 'average',
        query: query
      }
    }
  }
  
  if (isCampaignQuery && (lowerQuery.includes('list') || lowerQuery.includes('all'))) {
    const campaigns = Array.from(new Set(data.map(item => item.dimensions.campaign)))
    return {
      content: `Here are all the campaigns in your data:\n${campaigns.map(c => `• ${c}`).join('\n')}`,
      data: { 
        campaigns, 
        type: 'list',
        query: query
      }
    }
  }
  
  // Handle platform ranking queries (IMPROVED: Added CTR ranking and better detection)
  if (isPlatformQuery && isTopQuery) {
    if (isCTRQuery) {
      // Group data by platform and calculate average CTR
      const platformGroups: Record<string, { totalCTR: number, count: number }> = {}
      
      data.forEach(item => {
        const platform = item.dimensions.platform
        if (!platformGroups[platform]) {
          platformGroups[platform] = { totalCTR: 0, count: 0 }
        }
        platformGroups[platform].totalCTR += item.metrics.ctr
        platformGroups[platform].count++
      })
      
      // Calculate average CTR for each platform
      const platformCTR = Object.entries(platformGroups)
        .map(([platform, data]) => ({
          platform,
          avgCTR: data.count > 0 ? data.totalCTR / data.count : 0,
          count: data.count
        }))
        .sort((a, b) => b.avgCTR - a.avgCTR)
      
      const bestPlatform = platformCTR[0]
      
      const content = `Platform with the highest CTR:\n${platformCTR.map((item, index) => 
        `${index + 1}. ${item.platform}: ${(item.avgCTR * 100).toFixed(2)}% CTR`
      ).join('\n')}`
      
      return {
        content,
        data: {
          type: 'platform_ctr',
          platforms: platformCTR,
          bestPlatform,
          query: query
        }
      }
    } else if (isROASQuery) {
      // Group data by platform and calculate ROAS
      const platformGroups: Record<string, { totalSpend: number, totalRevenue: number, count: number }> = {}
      
      data.forEach(item => {
        const platform = item.dimensions.platform
        if (!platformGroups[platform]) {
          platformGroups[platform] = { totalSpend: 0, totalRevenue: 0, count: 0 }
        }
        platformGroups[platform].totalSpend += item.metrics.spend || 0
        platformGroups[platform].totalRevenue += item.metrics.revenue || 0
        platformGroups[platform].count++
      })
      
      // Calculate ROAS for each platform
      const platformROAS = Object.entries(platformGroups)
        .map(([platform, data]) => ({
          platform,
          roas: data.totalSpend > 0 ? data.totalRevenue / data.totalSpend : 0,
          spend: data.totalSpend,
          revenue: data.totalRevenue,
          count: data.count
        }))
        .sort((a, b) => b.roas - a.roas)
      
      const bestPlatform = platformROAS[0]
      
      const content = `Platform with the highest ROAS:\n${platformROAS.map((item, index) => 
        `${index + 1}. ${item.platform}: ${item.roas.toFixed(2)}x ROAS ($${item.spend.toLocaleString()} spend, $${item.revenue.toLocaleString()} revenue)`
      ).join('\n')}`
      
      return {
        content,
        data: {
          type: 'platform_roas',
          platforms: platformROAS,
          bestPlatform,
          query: query
        }
      }
    }
  }
  
  // Handle "which platform" queries (NEW: More comprehensive detection)
  if (lowerQuery.includes('which platform') && (isCTRQuery || isROASQuery)) {
    if (isCTRQuery) {
      // Group data by platform and calculate average CTR
      const platformGroups: Record<string, { totalCTR: number, count: number }> = {}
      
      data.forEach(item => {
        const platform = item.dimensions.platform
        if (!platformGroups[platform]) {
          platformGroups[platform] = { totalCTR: 0, count: 0 }
        }
        platformGroups[platform].totalCTR += item.metrics.ctr
        platformGroups[platform].count++
      })
      
      // Calculate average CTR for each platform
      const platformCTR = Object.entries(platformGroups)
        .map(([platform, data]) => ({
          platform,
          avgCTR: data.count > 0 ? data.totalCTR / data.count : 0,
          count: data.count
        }))
        .sort((a, b) => b.avgCTR - a.avgCTR)
      
      const bestPlatform = platformCTR[0]
      
      const content = `Platform with the highest CTR:\n${platformCTR.map((item, index) => 
        `${index + 1}. ${item.platform}: ${(item.avgCTR * 100).toFixed(2)}% CTR`
      ).join('\n')}`
      
      return {
        content,
        data: {
          type: 'platform_ctr',
          platforms: platformCTR,
          bestPlatform,
          query: query
        }
      }
    } else if (isROASQuery) {
      // Group data by platform and calculate ROAS
      const platformGroups: Record<string, { totalSpend: number, totalRevenue: number, count: number }> = {}
      
      data.forEach(item => {
        const platform = item.dimensions.platform
        if (!platformGroups[platform]) {
          platformGroups[platform] = { totalSpend: 0, totalRevenue: 0, count: 0 }
        }
        platformGroups[platform].totalSpend += item.metrics.spend || 0
        platformGroups[platform].totalRevenue += item.metrics.revenue || 0
        platformGroups[platform].count++
      })
      
      // Calculate ROAS for each platform
      const platformROAS = Object.entries(platformGroups)
        .map(([platform, data]) => ({
          platform,
          roas: data.totalSpend > 0 ? data.totalRevenue / data.totalSpend : 0,
          spend: data.totalSpend,
          revenue: data.totalRevenue,
          count: data.count
        }))
        .sort((a, b) => b.roas - a.roas)
      
      const bestPlatform = platformROAS[0]
      
      const content = `Platform with the highest ROAS:\n${platformROAS.map((item, index) => 
        `${index + 1}. ${item.platform}: ${item.roas.toFixed(2)}x ROAS ($${item.spend.toLocaleString()} spend, $${item.revenue.toLocaleString()} revenue)`
      ).join('\n')}`
      
      return {
        content,
        data: {
          type: 'platform_roas',
          platforms: platformROAS,
          bestPlatform,
          query: query
        }
      }
    }
  }
  
  // Handle graph/chart requests (IMPROVED)
  if (isVizQuery) {
    let metric = 'spend' // default to spend
    if (lowerQuery.includes('impression')) metric = 'impressions'
    if (lowerQuery.includes('click')) metric = 'clicks'
    if (lowerQuery.includes('revenue')) metric = 'revenue'
    if (isROASQuery) metric = 'roas'
    if (isCTRQuery) metric = 'ctr'
    
    // Group data by campaign name and calculate totals
    const campaignGroups: Record<string, number> = {}
    data.forEach(item => {
      const campaignName = item.dimensions.campaign
      const value = item.metrics[metric as keyof typeof item.metrics] as number || 0
      campaignGroups[campaignName] = (campaignGroups[campaignName] || 0) + value
    })
    
    // Sort campaigns by the metric value
    const sortedCampaigns = Object.entries(campaignGroups)
      .sort(([,a], [,b]) => b - a)
      .map(([campaign, value]) => ({
        campaign,
        value,
        formattedValue: formatValue(value, metric)
      }))
    
    const content = `Campaigns by ${metric}:\n${sortedCampaigns.map((item, index) => 
      `${index + 1}. ${item.campaign}: ${item.formattedValue}`
    ).join('\n')}`
    
    return {
      content,
      data: {
        type: 'graph',
        metric,
        campaigns: sortedCampaigns,
        chartData: sortedCampaigns.map(item => ({
          name: item.campaign,
          value: item.value
        })),
        query: query
      }
    }
  }

  // Handle "CTR for each campaign" queries (IMPROVED: Better detection)
  if (isCTRQuery && isCampaignQuery && (lowerQuery.includes('each') || lowerQuery.includes('individual') || lowerQuery.includes('for each'))) {
    // Normalize campaign names to handle trailing spaces and duplicates
    const normalizedData = data.map(item => ({
      ...item,
      dimensions: {
        ...item.dimensions,
        campaign: item.dimensions.campaign.trim() // Remove trailing spaces
      }
    }))
    
    // Group data by normalized campaign name and calculate average CTR per campaign
    const campaignGroups: Record<string, { totalCTR: number, count: number }> = {}
    normalizedData.forEach(item => {
      const campaignName = item.dimensions.campaign
      if (!campaignGroups[campaignName]) {
        campaignGroups[campaignName] = { totalCTR: 0, count: 0 }
      }
      campaignGroups[campaignName].totalCTR += item.metrics.ctr
      campaignGroups[campaignName].count++
    })
    
    // Calculate average CTR for each campaign and format response
    const campaignCTR = Object.entries(campaignGroups)
      .map(([campaign, data]) => ({
        campaign,
        avgCTR: data.count > 0 ? data.totalCTR / data.count : 0
      }))
      .sort((a, b) => b.avgCTR - a.avgCTR) // Sort by CTR descending
    
    const content = `CTR for each campaign:\n${campaignCTR.map((item, index) => 
      `${index + 1}. ${item.campaign}: ${(item.avgCTR * 100).toFixed(2)}% CTR`
    ).join('\n')}`
    
    return {
      content,
      data: {
        type: 'campaign_ctr_breakdown',
        campaigns: campaignCTR,
        query: query
      }
    }
  }

  // Handle platform-specific revenue queries (FIXED: Higher priority)
  if (detectedPlatform && (lowerQuery.includes('revenue') || lowerQuery.includes('earnings'))) {
    const actualPlatform = PLATFORM_MAP[detectedPlatform]
    const filteredData = data.filter(item => item.dimensions.platform === actualPlatform)
    const totalRevenue = filteredData.reduce((sum, item) => sum + (item.metrics.revenue || 0), 0)
    
    return {
      content: `Total revenue from ${actualPlatform}: $${totalRevenue.toLocaleString()}`,
      data: {
        type: 'platform_revenue',
            platform: actualPlatform,
        value: totalRevenue,
        count: filteredData.length,
            query: query
          }
        }
      }

  // Handle platform count queries (FIXED: Improved detection)
  if ((isCountQuery && isPlatformQuery) || lowerQuery.includes('how many platforms') || lowerQuery.includes('number of platforms') || lowerQuery.includes('count of platforms')) {
    const uniquePlatforms = Array.from(new Set(data.map(item => item.dimensions.platform)))
    const platformCount = uniquePlatforms.length
    
        return {
      content: `Found ${platformCount} platforms: ${uniquePlatforms.join(', ')}`,
          data: {
        type: 'platform_count',
        platforms: uniquePlatforms,
        count: platformCount,
        query: query
      }
    }
  }

  // Handle "CTR for each platform" queries (FIXED: Higher priority)
  if ((isCTRQuery && isPlatformQuery && (lowerQuery.includes('each') || lowerQuery.includes('individual') || lowerQuery.includes('for each'))) || 
      lowerQuery.includes('ctr for each platform') || lowerQuery.includes('click-through rate for each platform')) {
    const platformGroups: Record<string, { totalCTR: number, count: number }> = {}
    
    data.forEach(item => {
      const platform = item.dimensions.platform
      if (!platformGroups[platform]) {
        platformGroups[platform] = { totalCTR: 0, count: 0 }
      }
      platformGroups[platform].totalCTR += item.metrics.ctr
      platformGroups[platform].count++
    })
    
    const platformCTR = Object.entries(platformGroups)
      .map(([platform, data]) => ({
        platform,
        avgCTR: data.count > 0 ? data.totalCTR / data.count : 0
      }))
      .sort((a, b) => b.avgCTR - a.avgCTR)
    
    const content = `CTR for each platform:\n${platformCTR.map((item, index) => 
      `${index + 1}. ${item.platform}: ${(item.avgCTR * 100).toFixed(2)}% CTR`
    ).join('\n')}`
    
    return {
      content,
      data: {
        type: 'platform_ctr_breakdown',
        platforms: platformCTR,
        query: query
      }
    }
  }

  // Handle "ROAS for each platform" queries (FIXED: Higher priority)
  if ((isROASQuery && isPlatformQuery && (lowerQuery.includes('each') || lowerQuery.includes('individual') || lowerQuery.includes('for each'))) ||
      lowerQuery.includes('roas for each platform') || lowerQuery.includes('return on ad spend for each platform')) {
    const platformGroups: Record<string, { totalSpend: number, totalRevenue: number, count: number }> = {}
    
    data.forEach(item => {
      const platform = item.dimensions.platform
      if (!platformGroups[platform]) {
        platformGroups[platform] = { totalSpend: 0, totalRevenue: 0, count: 0 }
      }
      platformGroups[platform].totalSpend += item.metrics.spend || 0
      platformGroups[platform].totalRevenue += item.metrics.revenue || 0
      platformGroups[platform].count++
    })
    
    const platformROAS = Object.entries(platformGroups)
      .map(([platform, data]) => ({
        platform,
        roas: data.totalSpend > 0 ? data.totalRevenue / data.totalSpend : 0
      }))
      .sort((a, b) => b.roas - a.roas)
    
    const content = `ROAS for each platform:\n${platformROAS.map((item, index) => 
      `${index + 1}. ${item.platform}: ${item.roas.toFixed(2)}x ROAS`
    ).join('\n')}`
    
    return {
      content,
      data: {
        type: 'platform_roas_breakdown',
        platforms: platformROAS,
        query: query
      }
    }
  }

  // Handle "how much revenue did we generate" queries (FIXED: Improved detection)
  if (lowerQuery.includes('how much revenue') || lowerQuery.includes('revenue did we generate') || lowerQuery.includes('revenue did we get')) {
    const totalRevenue = data.reduce((sum, item) => sum + (item.metrics.revenue || 0), 0)
    return {
      content: `Total revenue across all campaigns: $${totalRevenue.toLocaleString()}`,
      data: {
        type: 'total_revenue',
        value: totalRevenue,
        query: query
      }
    }
  }

  // Handle "how many impressions did we get" queries (FIXED: Improved detection)
  if (lowerQuery.includes('how many impressions') || lowerQuery.includes('impressions did we get') || lowerQuery.includes('impressions did we receive')) {
    const totalImpressions = data.reduce((sum, item) => sum + item.metrics.impressions, 0)
    return {
      content: `Total impressions across all campaigns: ${totalImpressions.toLocaleString()}`,
      data: {
        type: 'total_impressions',
            value: totalImpressions,
            query: query
          }
        }
  }

  // Handle "how many clicks did we get" queries (FIXED: Improved detection)
  if (lowerQuery.includes('how many clicks') || lowerQuery.includes('clicks did we get') || lowerQuery.includes('clicks did we receive')) {
    const totalClicks = data.reduce((sum, item) => sum + item.metrics.clicks, 0)
    return {
      content: `Total clicks across all campaigns: ${totalClicks.toLocaleString()}`,
      data: {
        type: 'total_clicks',
        value: totalClicks,
        query: query
      }
    }
  }

  // Handle "overall CTR" queries (FIXED: Correct calculation)
  if (lowerQuery.includes('overall ctr') || lowerQuery.includes('overall click-through rate') || lowerQuery.includes('overall click through rate')) {
    const totalClicks = data.reduce((sum, item) => sum + item.metrics.clicks, 0)
    const totalImpressions = data.reduce((sum, item) => sum + item.metrics.impressions, 0)
    const overallCTR = totalImpressions > 0 ? totalClicks / totalImpressions : 0
    
    return {
      content: `Overall CTR across all campaigns: ${(overallCTR * 100).toFixed(2)}%`,
      data: {
        type: 'overall_ctr',
        value: overallCTR,
        totalClicks,
        totalImpressions,
        query: query
      }
    }
  }

  // Handle "average ROAS" queries (FIXED: Improved detection)
  if (lowerQuery.includes('average roas') || lowerQuery.includes('avg roas') || lowerQuery.includes('average return on ad spend')) {
    const totalSpend = data.reduce((sum, item) => sum + item.metrics.spend, 0)
    const totalRevenue = data.reduce((sum, item) => sum + (item.metrics.revenue || 0), 0)
    const averageROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0
    
    return {
      content: `Average ROAS across all campaigns: ${averageROAS.toFixed(2)}x`,
      data: {
        type: 'average_roas',
        value: averageROAS,
        totalSpend,
        totalRevenue,
        query: query
      }
    }
  }

  // Handle "how many campaigns" queries with proper grouping (RESTORED)
  if (isCountQuery && isCampaignQuery) {
    // Normalize campaign names to handle trailing spaces and duplicates
    const normalizedData = data.map(item => ({
      ...item,
      dimensions: {
        ...item.dimensions,
        campaign: item.dimensions.campaign.trim() // Remove trailing spaces
      }
    }))
    
    const uniqueCampaigns = Array.from(new Set(normalizedData.map(item => item.dimensions.campaign)))
    const campaignCount = uniqueCampaigns.length
    
    // Group data by normalized campaign name and calculate total spend per campaign
    const campaignGroups: Record<string, { spend: number, impressions: number, clicks: number }> = {}
    normalizedData.forEach(item => {
      const campaignName = item.dimensions.campaign
      if (!campaignGroups[campaignName]) {
        campaignGroups[campaignName] = { spend: 0, impressions: 0, clicks: 0 }
      }
      campaignGroups[campaignName].spend += item.metrics.spend
      campaignGroups[campaignName].impressions += item.metrics.impressions
      campaignGroups[campaignName].clicks += item.metrics.clicks
    })
    
    // Create formatted list of campaigns with their total spend
    const campaignList = uniqueCampaigns.map(campaignName => {
      const totals = campaignGroups[campaignName]
      return `• ${campaignName} - $${totals.spend.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`
    }).join('\n')
    
    return {
      content: `Found ${campaignCount} campaigns:\n${campaignList}`,
      data: { 
        uniqueCampaigns,
        campaignCount,
        campaignGroups,
        type: 'campaign_count',
        query: query
      }
    }
  }
  
  // Handle visualization requests for platform data (RESTORED)
  if (isVizQuery && (isPlatformQuery || isROASQuery)) {
    
    // Group data by platform and calculate ROAS
    const platformGroups: Record<string, { totalSpend: number, totalRevenue: number, count: number }> = {}
    
    data.forEach(item => {
      const platform = item.dimensions.platform
      if (!platformGroups[platform]) {
        platformGroups[platform] = { totalSpend: 0, totalRevenue: 0, count: 0 }
      }
      platformGroups[platform].totalSpend += item.metrics.spend || 0
      platformGroups[platform].totalRevenue += item.metrics.revenue || 0
      platformGroups[platform].count++
    })
    
    // Calculate ROAS for each platform and sort by ROAS
    const platformROAS = Object.entries(platformGroups)
      .map(([platform, data]) => ({
        platform,
        roas: data.totalSpend > 0 ? data.totalRevenue / data.totalSpend : 0,
        spend: data.totalSpend,
        revenue: data.totalRevenue,
        count: data.count
      }))
      .sort((a, b) => b.roas - a.roas)
    
    const content = `Platform ROAS Visualization Data:\n${platformROAS.map((item, index) => 
      `${index + 1}. ${item.platform}: ${item.roas.toFixed(2)}x ROAS ($${item.spend.toLocaleString()} spend, $${item.revenue.toLocaleString()} revenue)`
    ).join('\n')}`
    
    return {
      content,
      data: {
        type: 'platform_visualization',
        platforms: platformROAS,
        chartData: {
          labels: platformROAS.map(p => p.platform),
          datasets: [
            {
              label: 'ROAS',
              data: platformROAS.map(p => p.roas),
              backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'],
              borderColor: ['#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED', '#0891B2'],
              borderWidth: 2
            }
          ]
        },
        query: query
      }
    }
  }
  
  // Enhanced keyword processing with more sophisticated matching (RESTORED)
  if (lowerQuery.includes('total') && (lowerQuery.includes('impression') || lowerQuery.includes('impressions'))) {
    const total = data.reduce((sum, item) => sum + item.metrics.impressions, 0)
    return {
      content: `Total impressions across all campaigns: ${total.toLocaleString()}`,
      data: { 
        metric: 'impressions', 
        value: total, 
        type: 'total',
        query: query
      }
    }
  }
  
  if (isSpendQuery && (lowerQuery.includes('total') || lowerQuery.includes('sum') || lowerQuery.includes('overall'))) {
    const total = data.reduce((sum, item) => sum + item.metrics.spend, 0)
    return {
      content: `Total spend across all campaigns: $${total.toLocaleString()}`,
      data: { 
        metric: 'spend', 
        value: total, 
        type: 'total',
        query: query
      }
    }
  }

  if (lowerQuery.includes('total') && (lowerQuery.includes('revenue') || lowerQuery.includes('earnings'))) {
    const total = data.reduce((sum, item) => sum + item.metrics.revenue, 0)
    return {
      content: `Total revenue across all campaigns: $${total.toLocaleString()}`,
      data: { 
        metric: 'revenue', 
        value: total, 
        type: 'total',
        query: query
      }
    }
  }
  
  // Handle best performing campaign queries (RESTORED)
  if (isTopQuery && isCampaignQuery) {
    if (isCTRQuery) {
      // Find campaign with highest average CTR
      const campaignGroups: Record<string, { totalCTR: number, count: number }> = {}
      data.forEach(item => {
        const campaignName = item.dimensions.campaign
        if (!campaignGroups[campaignName]) {
          campaignGroups[campaignName] = { totalCTR: 0, count: 0 }
        }
        campaignGroups[campaignName].totalCTR += item.metrics.ctr
        campaignGroups[campaignName].count++
      })
      
      const bestCampaign = Object.entries(campaignGroups)
        .map(([campaign, data]) => ({
          campaign,
          avgCTR: data.count > 0 ? data.totalCTR / data.count : 0
        }))
        .reduce((best, current) => current.avgCTR > best.avgCTR ? current : best)
      
      return {
        content: `The best performing campaign by CTR is "${bestCampaign.campaign}" with an average CTR of ${(bestCampaign.avgCTR * 100).toFixed(2)}%`,
        data: { 
          campaign: bestCampaign, 
          type: 'best_ctr_performer',
          query: query
        }
      }
    } else if (isROASQuery) {
      // Find campaign with highest average ROAS
      const campaignGroups: Record<string, { totalROAS: number, count: number }> = {}
      data.forEach(item => {
        const campaignName = item.dimensions.campaign
        if (!campaignGroups[campaignName]) {
          campaignGroups[campaignName] = { totalROAS: 0, count: 0 }
        }
        campaignGroups[campaignName].totalROAS += item.metrics.roas
        campaignGroups[campaignName].count++
      })
      
      const bestCampaign = Object.entries(campaignGroups)
        .map(([campaign, data]) => ({
          campaign,
          avgROAS: data.count > 0 ? data.totalROAS / data.count : 0
        }))
        .reduce((best, current) => current.avgROAS > best.avgROAS ? current : best)
      
      return {
        content: `The best performing campaign by ROAS is "${bestCampaign.campaign}" with an average ROAS of ${bestCampaign.avgROAS.toFixed(2)}x`,
        data: { 
          campaign: bestCampaign, 
          type: 'best_roas_performer',
          query: query
        }
      }
    } else {
      // Default to ROAS if no specific metric mentioned
    const bestCampaign = data.reduce((best, current) => 
      current.metrics.roas > best.metrics.roas ? current : best
    )
    return {
      content: `The best performing campaign by ROAS is "${bestCampaign.dimensions.campaign}" with a ROAS of ${bestCampaign.metrics.roas.toFixed(2)}x`,
      data: { 
        campaign: bestCampaign, 
        type: 'best_performer',
        query: query
        }
      }
    }
  }
  
  if (lowerQuery.includes('average') && isCTRQuery) {
    const avgCTR = data.reduce((sum, item) => sum + item.metrics.ctr, 0) / data.length
    return {
      content: `Average CTR across all campaigns: ${(avgCTR * 100).toFixed(2)}%`,
      data: { 
        metric: 'ctr', 
        value: avgCTR, 
        type: 'average',
        query: query
      }
    }
  }
  
  if (isCampaignQuery && (lowerQuery.includes('list') || lowerQuery.includes('all'))) {
    const campaigns = Array.from(new Set(data.map(item => item.dimensions.campaign)))
    return {
      content: `Here are all the campaigns in your data:\n${campaigns.map(c => `• ${c}`).join('\n')}`,
      data: { 
        campaigns, 
        type: 'list',
        query: query
      }
    }
  }
  
  // Handle platform ranking queries (RESTORED)
  if (isPlatformQuery && isTopQuery) {
    if (isCTRQuery) {
      // Group data by platform and calculate average CTR
      const platformGroups: Record<string, { totalCTR: number, count: number }> = {}
      
      data.forEach(item => {
        const platform = item.dimensions.platform
        if (!platformGroups[platform]) {
          platformGroups[platform] = { totalCTR: 0, count: 0 }
        }
        platformGroups[platform].totalCTR += item.metrics.ctr
        platformGroups[platform].count++
      })
      
      // Calculate average CTR for each platform
      const platformCTR = Object.entries(platformGroups)
        .map(([platform, data]) => ({
          platform,
          avgCTR: data.count > 0 ? data.totalCTR / data.count : 0,
          count: data.count
        }))
        .sort((a, b) => b.avgCTR - a.avgCTR)
      
      const bestPlatform = platformCTR[0]
      
      const content = `Platform with the highest CTR:\n${platformCTR.map((item, index) => 
        `${index + 1}. ${item.platform}: ${(item.avgCTR * 100).toFixed(2)}% CTR`
      ).join('\n')}`
      
      return {
        content,
        data: {
          type: 'platform_ctr',
          platforms: platformCTR,
          bestPlatform,
          query: query
        }
      }
    } else if (isROASQuery) {
    // Group data by platform and calculate ROAS
    const platformGroups: Record<string, { totalSpend: number, totalRevenue: number, count: number }> = {}
    
    data.forEach(item => {
      const platform = item.dimensions.platform
      if (!platformGroups[platform]) {
        platformGroups[platform] = { totalSpend: 0, totalRevenue: 0, count: 0 }
      }
      platformGroups[platform].totalSpend += item.metrics.spend || 0
      platformGroups[platform].totalRevenue += item.metrics.revenue || 0
      platformGroups[platform].count++
    })
    
    // Calculate ROAS for each platform
    const platformROAS = Object.entries(platformGroups)
      .map(([platform, data]) => ({
        platform,
        roas: data.totalSpend > 0 ? data.totalRevenue / data.totalSpend : 0,
        spend: data.totalSpend,
        revenue: data.totalRevenue,
        count: data.count
      }))
      .sort((a, b) => b.roas - a.roas)
    
    const bestPlatform = platformROAS[0]
    
    const content = `Platform with the highest ROAS:\n${platformROAS.map((item, index) => 
      `${index + 1}. ${item.platform}: ${item.roas.toFixed(2)}x ROAS ($${item.spend.toLocaleString()} spend, $${item.revenue.toLocaleString()} revenue)`
    ).join('\n')}`
    
    return {
      content,
      data: {
        type: 'platform_roas',
        platforms: platformROAS,
        bestPlatform,
        query: query
        }
      }
    }
  }
  
  // Handle "which platform" queries (RESTORED)
  if (lowerQuery.includes('which platform') && (isCTRQuery || isROASQuery)) {
    if (isCTRQuery) {
      // Group data by platform and calculate average CTR
      const platformGroups: Record<string, { totalCTR: number, count: number }> = {}
      
      data.forEach(item => {
        const platform = item.dimensions.platform
        if (!platformGroups[platform]) {
          platformGroups[platform] = { totalCTR: 0, count: 0 }
        }
        platformGroups[platform].totalCTR += item.metrics.ctr
        platformGroups[platform].count++
      })
      
      // Calculate average CTR for each platform
      const platformCTR = Object.entries(platformGroups)
        .map(([platform, data]) => ({
          platform,
          avgCTR: data.count > 0 ? data.totalCTR / data.count : 0,
          count: data.count
        }))
        .sort((a, b) => b.avgCTR - a.avgCTR)
      
      const bestPlatform = platformCTR[0]
      
      const content = `Platform with the highest CTR:\n${platformCTR.map((item, index) => 
        `${index + 1}. ${item.platform}: ${(item.avgCTR * 100).toFixed(2)}% CTR`
      ).join('\n')}`
      
      return {
        content,
        data: {
          type: 'platform_ctr',
          platforms: platformCTR,
          bestPlatform,
          query: query
        }
      }
    } else if (isROASQuery) {
      // Group data by platform and calculate ROAS
      const platformGroups: Record<string, { totalSpend: number, totalRevenue: number, count: number }> = {}
      
      data.forEach(item => {
        const platform = item.dimensions.platform
        if (!platformGroups[platform]) {
          platformGroups[platform] = { totalSpend: 0, totalRevenue: 0, count: 0 }
        }
        platformGroups[platform].totalSpend += item.metrics.spend || 0
        platformGroups[platform].totalRevenue += item.metrics.revenue || 0
        platformGroups[platform].count++
      })
      
      // Calculate ROAS for each platform
      const platformROAS = Object.entries(platformGroups)
        .map(([platform, data]) => ({
          platform,
          roas: data.totalSpend > 0 ? data.totalRevenue / data.totalSpend : 0,
          spend: data.totalSpend,
          revenue: data.totalRevenue,
          count: data.count
        }))
        .sort((a, b) => b.roas - a.roas)
      
      const bestPlatform = platformROAS[0]
      
      const content = `Platform with the highest ROAS:\n${platformROAS.map((item, index) => 
        `${index + 1}. ${item.platform}: ${item.roas.toFixed(2)}x ROAS ($${item.spend.toLocaleString()} spend, $${item.revenue.toLocaleString()} revenue)`
      ).join('\n')}`
      
      return {
        content,
        data: {
          type: 'platform_roas',
          platforms: platformROAS,
          bestPlatform,
          query: query
        }
      }
    }
  }
  
  // Handle graph/chart requests (RESTORED)
  if (isVizQuery) {
    let metric = 'spend' // default to spend
    if (lowerQuery.includes('impression')) metric = 'impressions'
    if (lowerQuery.includes('click')) metric = 'clicks'
    if (lowerQuery.includes('revenue')) metric = 'revenue'
    if (isROASQuery) metric = 'roas'
    if (isCTRQuery) metric = 'ctr'
    
    // Group data by campaign name and calculate totals
    const campaignGroups: Record<string, number> = {}
    data.forEach(item => {
      const campaignName = item.dimensions.campaign
      const value = item.metrics[metric as keyof typeof item.metrics] as number || 0
      campaignGroups[campaignName] = (campaignGroups[campaignName] || 0) + value
    })
    
    // Sort campaigns by the metric value
    const sortedCampaigns = Object.entries(campaignGroups)
      .sort(([,a], [,b]) => b - a)
      .map(([campaign, value]) => ({
        campaign,
        value,
        formattedValue: formatValue(value, metric)
      }))
    
    const content = `Campaigns by ${metric}:\n${sortedCampaigns.map((item, index) => 
      `${index + 1}. ${item.campaign}: ${item.formattedValue}`
    ).join('\n')}`
    
    return {
      content,
      data: {
        type: 'graph',
        metric,
        campaigns: sortedCampaigns,
        chartData: sortedCampaigns.map(item => ({
          name: item.campaign,
          value: item.value
        })),
        query: query
      }
    }
  }

  // Handle "CTR for each campaign" queries (RESTORED)
  if (isCTRQuery && isCampaignQuery && (lowerQuery.includes('each') || lowerQuery.includes('individual') || lowerQuery.includes('for each'))) {
    // Normalize campaign names to handle trailing spaces and duplicates
    const normalizedData = data.map(item => ({
      ...item,
      dimensions: {
        ...item.dimensions,
        campaign: item.dimensions.campaign.trim() // Remove trailing spaces
      }
    }))
    
    // Group data by normalized campaign name and calculate average CTR per campaign
    const campaignGroups: Record<string, { totalCTR: number, count: number }> = {}
    normalizedData.forEach(item => {
      const campaignName = item.dimensions.campaign
      if (!campaignGroups[campaignName]) {
        campaignGroups[campaignName] = { totalCTR: 0, count: 0 }
      }
      campaignGroups[campaignName].totalCTR += item.metrics.ctr
      campaignGroups[campaignName].count++
    })
    
    // Calculate average CTR for each campaign and format response
    const campaignCTR = Object.entries(campaignGroups)
      .map(([campaign, data]) => ({
        campaign,
        avgCTR: data.count > 0 ? data.totalCTR / data.count : 0
      }))
      .sort((a, b) => b.avgCTR - a.avgCTR) // Sort by CTR descending
    
    const content = `CTR for each campaign:\n${campaignCTR.map((item, index) => 
      `${index + 1}. ${item.campaign}: ${(item.avgCTR * 100).toFixed(2)}% CTR`
    ).join('\n')}`
    
    return {
      content,
      data: {
        type: 'campaign_ctr_breakdown',
        campaigns: campaignCTR,
        query: query
      }
    }
  }

  // Default response with more helpful suggestions
  return {
    content: `I understand you're asking about "${query}". I can help you analyze your campaign data. Try asking about:
• Total impressions, spend, or revenue
• Best performing campaigns by CTR or ROAS
• Average CTR or ROAS for specific platforms
• List all campaigns
• Generate graphs/charts by spend, impressions, clicks, or revenue
• Compare performance by device or location
• Filter campaigns by specific criteria
• Which platform had the highest ROAS`,
    data: { 
      type: 'help',
      query: query
    }
  }
} 
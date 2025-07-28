import { MarketingData } from '@/types'
import fs from 'fs'
import path from 'path'

// Extract brand from campaign name
function extractBrandFromCampaign(campaignName: string): string {
  if (campaignName.startsWith('TasteBuds')) {
    return 'TasteBuds'
  }
  if (campaignName.startsWith('FreshNest')) {
    return 'FreshNest'
  }
  // Default to FreshNest for any other campaigns
  return 'FreshNest'
}

// Load CSV data from the backend
export async function loadCampaignData(): Promise<MarketingData[]> {
  try {
    const csvPath = path.join(process.cwd(), 'sample-campaign-data.csv')
    const csvContent = fs.readFileSync(csvPath, 'utf-8')
    
    const lines = csvContent.split('\n').filter(line => line.trim())
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    
    const data: MarketingData[] = lines.slice(1).map((line, index) => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
      const row: any = {}
      headers.forEach((header, i) => {
        row[header] = values[i] || ''
      })
      
      // Map the new CSV structure to our expected format
      return {
        id: `row-${index}`,
        source: 'csv_backend' as any,
        date: row.date || new Date().toISOString().split('T')[0],
        metrics: {
          impressions: parseInt(row.impressions || '0'),
          clicks: parseInt(row.clicks || '0'),
          conversions: parseInt(row.conversions || '0'),
          spend: parseFloat(row.spend || '0'),
          revenue: parseFloat(row.spend || '0') * parseFloat(row.roas || '0'), // Calculate revenue from spend * ROAS
          ctr: parseFloat(row.ctr || '0'), // Use CTR from CSV
          cpc: parseFloat(row.cpc || '0'),
          cpm: parseFloat(row.cpm || '0'),
          cpa: parseFloat(row.spend || '0') / Math.max(parseInt(row.conversions || '1'), 1), // Calculate CPA
          roas: parseFloat(row.roas || '0')
        },
        dimensions: {
          brand: row.brand || extractBrandFromCampaign(row.campaign_name || row.canonical_campaign || 'Unknown Campaign'),
          campaign: row.campaign_name || row.canonical_campaign || 'Unknown Campaign',
          campaignId: row.campaign_id || '',
          adGroup: row.ad_group_name || 'Unknown Ad Group',
          adGroupId: row.ad_group_id || '',
          ad_group_name: row.ad_group_name || 'Unknown Ad Group',
          placement_name: row.placement_name || 'Unknown Placement',
          keyword: row.placement_name || '',
          platform: row.platform || 'Unknown',
          location: 'Unknown', // Not in your CSV
          audience: row.audience || 'General', // Use audience from CSV
          creativeId: row.creative_id || '',
          creativeName: row.creative_name || '',
          creative_name: row.creative_name || '',
          creative_format: row.creative_format || 'Unknown Format'
        }
      }
    }).filter(item => item.metrics.impressions > 0)
    
    return data
    
  } catch (error) {
    // Return empty array if CSV loading fails
    return []
  }
}

// Get data summary for dashboard
export function getDataSummary(data: MarketingData[]) {
  // Group by campaign name
  const campaignGroups: Record<string, MarketingData[]> = {}
  data.forEach(item => {
    const name = item.dimensions.campaign
    if (!campaignGroups[name]) campaignGroups[name] = []
    campaignGroups[name].push(item)
  })
  const uniqueCampaigns = Object.keys(campaignGroups)

  // Aggregate metrics per campaign
  const campaignAggregates = uniqueCampaigns.map(name => {
    const group = campaignGroups[name]
    const impressions = group.reduce((sum, item) => sum + item.metrics.impressions, 0)
    const clicks = group.reduce((sum, item) => sum + item.metrics.clicks, 0)
    const conversions = group.reduce((sum, item) => sum + item.metrics.conversions, 0)
    const spend = group.reduce((sum, item) => sum + item.metrics.spend, 0)
    const revenue = group.reduce((sum, item) => sum + item.metrics.revenue, 0)
    
    // CORRECTED: Average CTR, CPC, CPA from individual values; calculate ROAS from totals
    const ctr = group.reduce((sum, item) => sum + item.metrics.ctr, 0) / group.length
    const cpc = group.reduce((sum, item) => sum + item.metrics.cpc, 0) / group.length
    const cpa = group.reduce((sum, item) => sum + item.metrics.cpa, 0) / group.length
    const roas = spend > 0 ? revenue / spend : 0 // Calculate from totals
    
    return {
      campaign: name,
      impressions,
      clicks,
      conversions,
      spend,
      revenue,
      ctr,
      cpc,
      cpa,
      roas
    }
  })

  // Aggregate overall metrics from campaign aggregates
  const totalImpressions = campaignAggregates.reduce((sum, c) => sum + c.impressions, 0)
  const totalClicks = campaignAggregates.reduce((sum, c) => sum + c.clicks, 0)
  const totalConversions = campaignAggregates.reduce((sum, c) => sum + c.conversions, 0)
  const totalSpend = campaignAggregates.reduce((sum, c) => sum + c.spend, 0)
  const totalRevenue = campaignAggregates.reduce((sum, c) => sum + c.revenue, 0)
  
  // Calculate overall averages correctly
  const averageCTR = campaignAggregates.reduce((sum, c) => sum + c.ctr, 0) / campaignAggregates.length
  const averageROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0
  
  return {
    totalRecords: data.length, // Internal use only
    totalCampaigns: uniqueCampaigns.length,
    totalImpressions,
    totalClicks,
    totalConversions,
    totalSpend,
    totalRevenue,
    averageCTR,
    averageROAS,
    campaignAggregates
  }
}

// Helper: Get unique campaign names for a date range
export function getUniqueCampaignNamesInDateRange(data: MarketingData[], startDate: string, endDate: string): string[] {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const campaigns = new Set<string>()
  data.forEach(item => {
    const d = new Date(item.date)
    if (d >= start && d <= end) {
      campaigns.add(item.dimensions.campaign)
    }
  })
  return Array.from(campaigns)
}

// Helper: Get count of unique campaigns in a date range
export function getUniqueCampaignCountInDateRange(data: MarketingData[], startDate: string, endDate: string): number {
  return getUniqueCampaignNamesInDateRange(data, startDate, endDate).length
} 
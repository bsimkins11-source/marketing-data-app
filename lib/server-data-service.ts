import { MarketingData } from '@/types'
import fs from 'fs'
import path from 'path'

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
          campaign: row.campaign_name || row.canonical_campaign || 'Unknown Campaign',
          campaignId: row.campaign_id || '',
          adGroup: row.ad_group_name || 'Unknown Ad Group',
          adGroupId: row.ad_group_id || '',
          keyword: row.placement_name || '',
          platform: row.platform || 'Unknown',
          location: 'Unknown', // Not in your CSV
          audience: row.creative_format || 'Unknown',
          creativeId: row.creative_id || '',
          creativeName: row.creative_name || ''
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
    return {
      campaign: name,
      impressions: group.reduce((sum, item) => sum + item.metrics.impressions, 0),
      clicks: group.reduce((sum, item) => sum + item.metrics.clicks, 0),
      conversions: group.reduce((sum, item) => sum + item.metrics.conversions, 0),
      spend: group.reduce((sum, item) => sum + item.metrics.spend, 0),
      revenue: group.reduce((sum, item) => sum + item.metrics.revenue, 0),
      ctr: group.reduce((sum, item) => sum + item.metrics.ctr, 0) / group.length, // Average CTR from CSV values
      cpc: group.reduce((sum, item) => sum + item.metrics.cpc, 0) / group.length,
      cpa: group.reduce((sum, item) => sum + item.metrics.cpa, 0) / group.length,
      roas: group.reduce((sum, item) => sum + item.metrics.roas, 0) / group.length
    }
  })

  // Aggregate overall metrics from campaign aggregates
  return {
    totalRecords: data.length, // Internal use only
    totalCampaigns: uniqueCampaigns.length,
    totalImpressions: campaignAggregates.reduce((sum, c) => sum + c.impressions, 0),
    totalClicks: campaignAggregates.reduce((sum, c) => sum + c.clicks, 0),
    totalSpend: campaignAggregates.reduce((sum, c) => sum + c.spend, 0),
    totalRevenue: campaignAggregates.reduce((sum, c) => sum + c.revenue, 0),
    averageCTR: campaignAggregates.reduce((sum, c) => sum + c.ctr, 0) / campaignAggregates.length,
    averageROAS: campaignAggregates.reduce((sum, c) => sum + c.roas, 0) / campaignAggregates.length,
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
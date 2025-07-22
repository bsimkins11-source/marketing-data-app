import { NextRequest, NextResponse } from 'next/server'
import { loadCampaignData, getDataSummary, getUniqueCampaignNamesInDateRange } from '@/lib/server-data-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeSummary = searchParams.get('summary') === 'true'
    const q1Campaigns = searchParams.get('q1_campaigns') === 'true'
    const juneCampaigns = searchParams.get('june_campaigns') === 'true'
    
    const data = await loadCampaignData()
    
    if (juneCampaigns) {
      // June 2024: Jun 1 - Jun 30
      const names = getUniqueCampaignNamesInDateRange(data, '2024-06-01', '2024-06-30')
      return NextResponse.json({
        juneCampaigns: names,
        juneCount: names.length,
        timestamp: new Date().toISOString()
      })
    }
    
    if (q1Campaigns) {
      // Q1 2024: Jan 1 - Mar 31
      const names = getUniqueCampaignNamesInDateRange(data, '2024-01-01', '2024-03-31')
      return NextResponse.json({
        q1Campaigns: names,
        q1Count: names.length,
        timestamp: new Date().toISOString()
      })
    }
    
    if (includeSummary) {
      const summary = getDataSummary(data)
      return NextResponse.json({
        success: true,
        data,
        summary,
        timestamp: new Date().toISOString()
      })
    }
    
    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load campaign data' },
      { status: 500 }
    )
  }
} 
import { NextResponse } from 'next/server'
import { loadCampaignData, getDataSummary } from '@/lib/server-data-service'

export async function GET() {
  try {
    const data = await loadCampaignData()
    const summary = getDataSummary(data)
    
    // Extract unique brands and campaigns for filters
    const uniqueBrands = Array.from(new Set(data.map(item => item.dimensions.brand)))
    const uniqueCampaigns = Array.from(new Set(data.map(item => item.dimensions.campaign)))
    
    return NextResponse.json({
      success: true,
      summary,
      filters: {
        brands: uniqueBrands,
        campaigns: uniqueCampaigns
      },
      allData: data // Include full data for client-side filtering
    })
  } catch (error) {
    console.error('Summary API Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to load summary data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 
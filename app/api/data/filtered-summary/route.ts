import { NextRequest, NextResponse } from 'next/server'
import { loadCampaignData, getDataSummary } from '@/lib/server-data-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { brand, campaign } = body
    
    const allData = await loadCampaignData()
    let filteredData = allData

    // Apply brand filter
    if (brand && brand !== 'all') {
      filteredData = filteredData.filter(item => item.dimensions.brand === brand)
    }

    // Apply campaign filter
    if (campaign && campaign !== 'all') {
      filteredData = filteredData.filter(item => item.dimensions.campaign === campaign)
    }

    // Get summary for filtered data
    const summary = getDataSummary(filteredData)
    
    return NextResponse.json({
      success: true,
      summary
    })
  } catch (error) {
    console.error('Filtered Summary API Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to load filtered summary data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 
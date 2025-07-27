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
  // Simple fallback response for now
  return {
    content: `I understand you're asking about "${query}". I can help you analyze your campaign data. Try asking about:\n• Total impressions, spend, or revenue\n• Best performing campaigns by CTR or ROAS\n• Average CTR or ROAS for specific platforms\n• List all campaigns\n• Generate graphs/charts by spend, impressions, clicks, or revenue\n• Compare performance by device or location\n• Filter campaigns by specific criteria\n• Which platform had the highest ROAS`,
    data: {
      type: 'fallback',
      query: query
    }
  }
}
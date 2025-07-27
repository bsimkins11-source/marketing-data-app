import { KeywordGroups, PlatformMapping } from '@/types/ai-query'

// Shared constants for keyword detection
export const KEYWORDS: KeywordGroups = {
  CTR: ['ctr', 'click-through rate', 'click through rate', 'click rate', 'click-through', 'clickthrough'],
  ROAS: ['roas', 'return on ad spend', 'return on advertising spend', 'return on investment', 'roi'],
  COUNT: ['how many', 'count', 'number', 'total number', 'amount of', 'quantity'],
  SPEND: ['spend', 'cost', 'budget', 'expense', 'expenditure', 'investment'],
  CAMPAIGN: ['campaign', 'campaigns', 'ad campaign', 'ad campaigns'],
  CREATIVE: ['creative', 'creatives', 'creative units', 'create units', 'ad creative', 'ad creatives', 'advertisement', 'advertisements', 'ad', 'ads'],
  AUDIENCE: ['audience', 'audiences', 'target audience', 'target audiences', 'demographic', 'demographics', 'segment', 'segments', 'targeting', 'targets', 'against'],
  BRAND: ['brand', 'brands', 'company', 'companies', 'organization', 'organizations'],
  PLATFORM: ['platform', 'platforms', 'channel', 'channels', 'network', 'networks'],
  VIZ: ['visual', 'visualize', 'chart', 'graph', 'plot', 'show me', 'display', 'visualization'],
  TOP: ['top', 'best', 'highest', 'leading', 'top performing', 'best performing'],
  PLATFORMS: ['meta', 'dv360', 'cm360', 'sa360', 'amazon', 'tradedesk'],
  CAMPAIGN_NAMES: [
    'freshnest summer grilling', 
    'freshnest back to school', 
    'freshnest holiday recipes', 
    'freshnest pantry staples', 
    'freshnest', 
    'summer grilling', 
    'back to school', 
    'holiday recipes', 
    'pantry staples',
    'ecofresh organic produce',
    'ecofresh sustainable packaging',
    'ecofresh farm to table',
    'ecofresh zero waste',
    'ecofresh',
    'organic produce',
    'sustainable packaging',
    'farm to table',
    'zero waste'
  ],
  DRILL_DOWN: [
    'drill down', 'drilldown', 'break down', 'breakdown', 'detail', 'details', 
    'more', 'deeper', 'deeper dive', 'deep dive', 'specific', 'specifically', 
    'in detail', 'show me more', 'tell me more', 'expand', 'elaborate', 
    'further', 'furthermore', 'additionally', 'also', 'what about', 
    'how about', 'what else', 'what other', 'which other', 'show me the', 
    'tell me about the', 'give me the', 'provide the', 'show the', 
    'tell the', 'give the', 'provide the', 'show me', 'tell me', 
    'give me', 'provide me', 'show', 'tell', 'give', 'provide', 
    'what is the', 'what are the', 'how is the', 'how are the', 
    'which is the', 'which are the', 'where is the', 'where are the', 
    'when is the', 'when are the', 'why is the', 'why are the', 
    'who is the', 'who are the'
  ]
}

export const PLATFORM_MAP: PlatformMapping = {
  'meta': 'Meta',
  'dv360': 'Dv360', 
  'cm360': 'Cm360',
  'sa360': 'Sa360',
  'amazon': 'Amazon',
  'tradedesk': 'Tradedesk'
}

// Session management constants
export const SESSION_TIMEOUT = 60 * 60 * 1000 // 1 hour
export const MAX_MESSAGES = 10 // Keep only last 10 messages

// Performance thresholds for anomaly detection
export const ANOMALY_THRESHOLDS = {
  LOW_CTR: 0.5, // Below 0.5% CTR
  LOW_ROAS: 2.0, // Below 2.0x ROAS
  HIGH_CPA: 50, // Above $50 CPA
  HIGH_CPC: 2.0, // Above $2 CPC
  HIGH_CPM: 20 // Above $20 CPM
} 
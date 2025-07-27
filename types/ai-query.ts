// AI Query System Types

export interface ConversationContext {
  messages: Array<{
    role: 'user' | 'ai'
    content: string
    data?: any
  }>
  lastContext: {
    platform?: string
    campaign?: string
    metric?: string
    data?: any
  }
  sessionStart: number
}

export interface QueryResult {
  content: string
  data?: {
    platform?: string
    campaign?: string
    metric?: string
    value?: number
    format?: string
    breakdown?: Record<string, any>
    insights?: string[]
    recommendations?: string[]
    type?: string
    query?: string
    [key: string]: any // Allow additional properties
  }
  type?: 'performance' | 'comparison' | 'anomaly' | 'strategic' | 'summary' | 'metrics'
}

export interface PlatformData {
  platform: string
  spend: number
  revenue: number
  impressions: number
  clicks: number
  conversions: number
  ctr: number
  roas: number
  cpa: number
  cpm: number
  cpc: number
}

export interface CampaignData {
  campaign: string
  platform: string
  spend: number
  revenue: number
  impressions: number
  clicks: number
  conversions: number
  ctr: number
  roas: number
  cpa: number
  cpm: number
  cpc: number
}

export interface KeywordGroups {
  CTR: string[]
  ROAS: string[]
  COUNT: string[]
  SPEND: string[]
  CAMPAIGN: string[]
  CREATIVE: string[]
  PLATFORM: string[]
  VIZ: string[]
  TOP: string[]
  PLATFORMS: string[]
  CAMPAIGN_NAMES: string[]
  DRILL_DOWN: string[]
}

export interface PlatformMapping {
  [key: string]: string
} 
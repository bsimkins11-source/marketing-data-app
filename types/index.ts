// Marketing Data Types
export interface MarketingData {
  id: string
  source: DataSource
  date: string
  metrics: MarketingMetrics
  dimensions: MarketingDimensions
}

export interface MarketingMetrics {
  impressions: number
  clicks: number
  conversions: number
  spend: number
  revenue: number
  ctr: number
  cpc: number
  cpm: number
  cpa: number
  roas: number
}

export interface MarketingDimensions {
  brand: string
  campaign: string
  campaignId: string
  adGroup: string
  adGroupId: string
  ad_group_name?: string
  placement_name?: string
  keyword?: string
  platform: string
  location: string
  audience: string
  creativeId: string
  creativeName: string
  creative_name?: string
  creative_format?: string
}

export type DataSource = 'google_analytics' | 'facebook_ads' | 'twitter_ads' | 'linkedin_ads' | 'tiktok_ads' | 'csv_backend' | 'firebase' | 'sample'

// Query Types
export interface QueryFilter {
  field: string
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between'
  value: string | number | [number, number]
}

export interface QueryOptions {
  filters: QueryFilter[]
  dateRange: {
    start: string
    end: string
  }
  groupBy: string[]
  orderBy: {
    field: string
    direction: 'asc' | 'desc'
  }
  limit?: number
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Component Props Types
export interface ChartProps {
  data: MarketingData[]
  title: string
  type: 'line' | 'bar' | 'pie' | 'area'
  height?: number
  width?: number
}

export interface DataTableProps {
  data: MarketingData[]
  columns: string[]
  sortable?: boolean
  pagination?: boolean
} 
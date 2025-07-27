import { NextRequest, NextResponse } from 'next/server'
import { loadCampaignData } from '@/lib/server-data-service'

interface QueryFilter {
  field: string
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than'
  value: string | number
}

interface QueryRequest {
  metrics?: string[]
  dimensions?: string[]
  filters?: QueryFilter[]
  date_range?: {
    start: string
    end: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: QueryRequest = await request.json()
    const { metrics = [], dimensions = [], filters = [], date_range } = body
    
    // Load all campaign data
    const allData = await loadCampaignData()
    
    // Apply date range filter
    let filteredData = applyDateRange(allData, date_range)
    
    // Apply custom filters
    filteredData = applyFilters(filteredData, filters)
    
    // Group data by selected dimensions
    let groupedData = groupData(filteredData, dimensions)
    
    // Select only the requested metrics and dimensions
    const selectedFields = [...dimensions, ...metrics]
    groupedData = groupedData.map((item: any) => {
      const filteredItem: any = {}
      selectedFields.forEach(field => {
        if (item[field] !== undefined) {
          filteredItem[field] = item[field]
        }
      })
      return filteredItem
    })
    
    return NextResponse.json({
      success: true,
      data: groupedData,
      totalRows: groupedData.length,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Query API Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process query',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function applyDateRange(data: any[], dateRange?: { start: string, end: string }) {
  if (!dateRange || (!dateRange.start && !dateRange.end)) {
    return data
  }
  
  return data.filter(item => {
    const itemDate = new Date(item.date)
    const startDate = dateRange.start ? new Date(dateRange.start) : null
    const endDate = dateRange.end ? new Date(dateRange.end) : null
    
    if (startDate && endDate) {
      return itemDate >= startDate && itemDate <= endDate
    } else if (startDate) {
      return itemDate >= startDate
    } else if (endDate) {
      return itemDate <= endDate
    }
    
    return true
  })
}

function applyFilters(data: any[], filters: QueryFilter[]) {
  return data.filter(item => {
    return filters.every(filter => {
      if (!filter.field || filter.value === undefined || filter.value === '') {
        return true
      }
      
      const fieldValue = getNestedValue(item, filter.field)
      const filterValue = filter.value
      
      switch (filter.operator) {
        case 'equals':
          return String(fieldValue).toLowerCase() === String(filterValue).toLowerCase()
        case 'contains':
          return String(fieldValue).toLowerCase().includes(String(filterValue).toLowerCase())
        case 'greater_than':
          return Number(fieldValue) > Number(filterValue)
        case 'less_than':
          return Number(fieldValue) < Number(filterValue)
        default:
          return true
      }
    })
  })
}

function getNestedValue(obj: any, path: string) {
  // Handle nested properties like 'dimensions.campaign_name'
  if (path.includes('.')) {
    const parts = path.split('.')
    let value = obj
    for (const part of parts) {
      value = value?.[part]
    }
    return value
  }
  
  // Handle direct properties
  if (obj.dimensions && obj.dimensions[path] !== undefined) {
    return obj.dimensions[path]
  }
  
  if (obj.metrics && obj.metrics[path] !== undefined) {
    return obj.metrics[path]
  }
  
  return obj[path]
}

function groupData(data: any[], dimensions: string[]) {
  if (dimensions.length === 0) {
    return data
  }
  
  const groups = new Map()
  
  data.forEach((item: any) => {
    const groupKey = dimensions.map(dim => getNestedValue(item, dim)).join('|')
    
    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        ...dimensions.reduce((acc, dim) => ({ 
          ...acc, 
          [dim]: getNestedValue(item, dim) 
        }), {}),
        count: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        spend: 0,
        revenue: 0
      })
    }
    
    const group = groups.get(groupKey)
    group.count++
    
    // Aggregate metrics
    if (item.metrics) {
      group.impressions += Number(item.metrics.impressions) || 0
      group.clicks += Number(item.metrics.clicks) || 0
      group.conversions += Number(item.metrics.conversions) || 0
      group.spend += Number(item.metrics.spend) || 0
      group.revenue += Number(item.metrics.revenue) || 0
    }
  })
  
  // Calculate derived metrics
  return Array.from(groups.values()).map(group => ({
    ...group,
    ctr: group.impressions > 0 ? group.clicks / group.impressions : 0,
    cpc: group.clicks > 0 ? group.spend / group.clicks : 0,
    cpa: group.conversions > 0 ? group.spend / group.conversions : 0,
    roas: group.spend > 0 ? group.revenue / group.spend : 0
  }))
} 
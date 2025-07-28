'use client'

import { useState, useEffect } from 'react'
import { 
  Search, 
  Filter, 
  Calendar, 
  BarChart3, 
  Play,
  Save,
  Plus,
  X,
  Download,
  RefreshCw
} from 'lucide-react'
import { QueryFilter, QueryOptions, MarketingData } from '@/types'

interface QueryResult {
  data: any[]
  totalRows: number
  executionTime: number
  query: string
}

export default function QueryBuilder() {
  const [queryName, setQueryName] = useState('')
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['impressions', 'clicks'])
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>(['brand', 'campaign_name'])
  const [filters, setFilters] = useState<QueryFilter[]>([])
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Helper function to ensure date format is YYYY-MM-DD
  const formatDateForInput = (dateString: string): string => {
    if (!dateString) return ''
    
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString
    }
    
    // Try to parse various date formats and convert to YYYY-MM-DD
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return ''
    }
    
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    
    return `${year}-${month}-${day}`
  }

  // Handle date input changes with format conversion
  const handleDateChange = (field: 'start' | 'end', value: string) => {
    const formattedDate = formatDateForInput(value)
    setDateRange(prev => ({ ...prev, [field]: formattedDate }))
  }

  const availableMetrics = [
    { id: 'impressions', name: 'Impressions', category: 'Reach' },
    { id: 'clicks', name: 'Clicks', category: 'Engagement' },
    { id: 'conversions', name: 'Conversions', category: 'Actions' },
    { id: 'spend', name: 'Spend', category: 'Cost' },
    { id: 'revenue', name: 'Revenue', category: 'Revenue' },
    { id: 'ctr', name: 'CTR', category: 'Performance' },
    { id: 'cpc', name: 'CPC', category: 'Cost' },
    { id: 'cpa', name: 'CPA', category: 'Cost' },
    { id: 'roas', name: 'ROAS', category: 'Performance' }
  ]

  const availableDimensions = [
    { id: 'brand', name: 'Brand', category: 'Organization' },
    { id: 'campaign_name', name: 'Campaign Name', category: 'Campaign' },
    { id: 'platform', name: 'Platform', category: 'Campaign' },
    { id: 'audience', name: 'Audience', category: 'Targeting' },
    { id: 'ad_group_name', name: 'Ad Group', category: 'Campaign' },
    { id: 'creative_name', name: 'Creative', category: 'Creative' },
    { id: 'date', name: 'Date', category: 'Time' }
  ]

  const addFilter = () => {
    const newFilter: QueryFilter = {
      field: '',
      operator: 'equals',
      value: ''
    }
    setFilters([...filters, newFilter])
  }

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index))
  }

  const updateFilter = (index: number, field: keyof QueryFilter, value: any) => {
    const updatedFilters = [...filters]
    updatedFilters[index] = { ...updatedFilters[index], [field]: value }
    setFilters(updatedFilters)
  }

  const toggleMetric = (metricId: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metricId) 
        ? prev.filter(id => id !== metricId)
        : [...prev, metricId]
    )
  }

  const toggleDimension = (dimensionId: string) => {
    setSelectedDimensions(prev => 
      prev.includes(dimensionId) 
        ? prev.filter(id => id !== dimensionId)
        : [...prev, dimensionId]
    )
  }

  const applyFilters = (data: any[], filters: QueryFilter[]) => {
    return data.filter(item => {
      return filters.every(filter => {
        if (!filter.field || !filter.value) return true
        
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

  const applyDateRange = (data: any[], dateRange: { start: string, end: string }) => {
    if (!dateRange.start && !dateRange.end) return data
    
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

  // Helper function to get nested values (same as API)
  const getNestedValue = (obj: any, path: string) => {
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

  const groupData = (data: any[], dimensions: string[]) => {
    if (dimensions.length === 0) return data
    
    const groups = new Map()
    
    data.forEach((item: any) => {
      const groupKey = dimensions.map(dim => getNestedValue(item, dim)).join('|')
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          ...dimensions.reduce((acc, dim) => ({ ...acc, [dim]: getNestedValue(item, dim) }), {}),
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
      
      // Aggregate metrics from nested structure
      if (item.metrics) {
        group.impressions += Number(item.metrics.impressions) || 0
        group.clicks += Number(item.metrics.clicks) || 0
        group.conversions += Number(item.metrics.conversions) || 0
        group.spend += Number(item.metrics.spend) || 0
        group.revenue += Number(item.metrics.revenue) || 0
      } else {
        // Fallback for flattened data
        group.impressions += Number(item.impressions) || 0
        group.clicks += Number(item.clicks) || 0
        group.conversions += Number(item.conversions) || 0
        group.spend += Number(item.spend) || 0
        group.revenue += Number(item.revenue) || 0
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

  const formatValue = (value: any, metric: string) => {
    if (value === null || value === undefined || isNaN(value)) return 'N/A'
    
    switch (metric) {
      case 'spend':
      case 'revenue':
        return `$${Number(value).toLocaleString()}`
      case 'ctr':
        return `${(Number(value) * 100).toFixed(2)}%`
      case 'cpc':
      case 'cpa':
        return `$${Number(value).toFixed(2)}`
      case 'roas':
        return `${Number(value).toFixed(2)}x`
      default:
        return Number(value).toLocaleString()
    }
  }

  const runQuery = async () => {
    setIsLoading(true)
    setError(null)
    setQueryResult(null)
    
    try {
      const startTime = Date.now()
      
      // Fetch data from API
      const response = await fetch('/api/data/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metrics: selectedMetrics,
          dimensions: selectedDimensions,
          filters: filters,
          date_range: dateRange
        })
      })
      const result = await response.json()
      
      if (!result.success) {
        throw new Error('Failed to fetch data')
      }
      
      let data = result.data || []
      
      // Apply date range filter
      data = applyDateRange(data, dateRange)
      
      // Apply custom filters
      data = applyFilters(data, filters)
      
      // Group data by selected dimensions
      data = groupData(data, selectedDimensions)
      
      // Select only the requested metrics and dimensions
      const selectedFields = [...selectedDimensions, ...selectedMetrics]
      data = data.map((item: any) => {
        const filteredItem: any = {}
        selectedFields.forEach(field => {
          if (item[field] !== undefined) {
            filteredItem[field] = item[field]
          }
        })
        return filteredItem
      })
      
      const executionTime = Date.now() - startTime
      
      setQueryResult({
        data,
        totalRows: data.length,
        executionTime,
        query: `Query executed in ${executionTime}ms`
      })
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const saveQuery = () => {
    // Save functionality - to be implemented in future iteration
    // This would save the current query configuration to user's saved queries
  }

  const exportResults = () => {
    if (!queryResult) return
    
    const csvContent = [
      // Headers
      Object.keys(queryResult.data[0] || {}).join(','),
      // Data rows
      ...queryResult.data.map(row => 
        Object.values(row).map(value => 
          typeof value === 'string' && value.includes(',') ? `"${value}"` : value
        ).join(',')
      )
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${queryName || 'query_results'}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Query Builder</h3>
        <div className="flex items-center space-x-2">
          <button 
            onClick={saveQuery}
            className="btn-secondary flex items-center space-x-2"
            disabled={!queryName}
          >
            <Save className="w-4 h-4" />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Query Name */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Query Name
        </label>
        <input
          type="text"
          value={queryName}
          onChange={(e) => setQueryName(e.target.value)}
          placeholder="Enter query name..."
          className="input-field"
        />
      </div>

      {/* Date Range */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Date Range
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => handleDateChange('start', e.target.value)}
              className="input-field"
              placeholder="Start date"
            />
            <p className="text-xs text-gray-500 mt-1">Or type: MM/DD/YYYY, YYYY-MM-DD</p>
          </div>
          <div>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => handleDateChange('end', e.target.value)}
              className="input-field"
              placeholder="End date"
            />
            <p className="text-xs text-gray-500 mt-1">Or type: MM/DD/YYYY, YYYY-MM-DD</p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-500">
              Date picker or type in any format - we&apos;ll convert it automatically
            </p>
          <button
            type="button"
            onClick={() => setDateRange({ start: '2024-06-01', end: '2024-06-30' })}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            Set June 2024
          </button>
        </div>
      </div>

      {/* Dimensions Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Dimensions
        </label>
        <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
          {availableDimensions.map((dimension) => (
            <label key={dimension.id} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedDimensions.includes(dimension.id)}
                onChange={() => toggleDimension(dimension.id)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">{dimension.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Metrics Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Metrics
        </label>
        <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
          {availableMetrics.map((metric) => (
            <label key={metric.id} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedMetrics.includes(metric.id)}
                onChange={() => toggleMetric(metric.id)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">{metric.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-4 flex items-center space-x-3">
        <button 
          onClick={runQuery}
          className="btn-primary flex items-center space-x-2"
          disabled={isLoading}
        >
          {isLoading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          <span>{isLoading ? 'Running...' : 'Run Query'}</span>
        </button>
        {queryResult && (
          <button
            onClick={exportResults}
            className="btn-secondary flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Filters
          </label>
          <button
            onClick={addFilter}
            className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center space-x-1"
          >
            <Plus className="w-4 h-4" />
            <span>Add Filter</span>
          </button>
        </div>
        
        <div className="space-y-2">
          {filters.map((filter, index) => (
            <div key={index} className="flex items-center space-x-2">
              <select
                value={filter.field}
                onChange={(e) => updateFilter(index, 'field', e.target.value)}
                className="flex-1 input-field"
              >
                <option value="">Select field</option>
                {availableDimensions.map(dim => (
                  <option key={dim.id} value={dim.id}>{dim.name}</option>
                ))}
              </select>
              
              <select
                value={filter.operator}
                onChange={(e) => updateFilter(index, 'operator', e.target.value)}
                className="w-24 input-field"
              >
                <option value="equals">=</option>
                <option value="contains">contains</option>
                <option value="greater_than">&gt;</option>
                <option value="less_than">&lt;</option>
              </select>
              
              <input
                type="text"
                value={Array.isArray(filter.value) ? filter.value.join(', ') : String(filter.value)}
                onChange={(e) => updateFilter(index, 'value', e.target.value)}
                placeholder="Value"
                className="flex-1 input-field"
              />
              
              <button
                onClick={() => removeFilter(index)}
                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Query Results */}
      {queryResult && (
        <div className="mt-6">
          <div className="mb-4">
            <h4 className="text-lg font-semibold text-gray-900">Query Results</h4>
            <p className="text-sm text-gray-600">
              {queryResult.totalRows} rows • {queryResult.executionTime}ms
            </p>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.keys(queryResult.data[0] || {}).map((header) => (
                      <th
                        key={header}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {header.replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {queryResult.data.slice(0, 50).map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      {Object.entries(row).map(([key, value]) => (
                        <td
                          key={key}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        >
                          {formatValue(value, key)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {queryResult.data.length > 50 && (
              <div className="px-6 py-3 bg-gray-50 text-sm text-gray-600">
                Showing first 50 of {queryResult.data.length} results
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 
'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Eye, MousePointer, DollarSign, Users, Filter } from 'lucide-react'
import { formatNumber, formatCurrency, formatPercentage } from '@/lib/utils'

interface MetricCardProps {
  title: string
  value: string | number
  change: number
  icon: React.ReactNode
  format?: 'number' | 'currency' | 'percentage' | 'roas'
}

function MetricCard({ title, value, change, icon, format = 'number' }: MetricCardProps) {
  const isPositive = change >= 0
  const formattedValue = format === 'currency' 
    ? formatCurrency(Number(value))
    : format === 'percentage'
    ? formatPercentage(Number(value))
    : format === 'roas'
    ? Number(value).toFixed(2)
    : formatNumber(Number(value))

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formattedValue}</p>
          <div className="flex items-center mt-2">
            {isPositive ? (
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
            )}
            <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? '+' : ''}{change}%
            </span>
            <span className="text-sm text-gray-500 ml-1">vs last period</span>
          </div>
        </div>
        <div className="p-3 bg-primary-50 rounded-lg">
          {icon}
        </div>
      </div>
    </div>
  )
}

interface MetricsOverviewProps {
  summary: any
}

export default function MetricsOverview({ summary }: MetricsOverviewProps) {
  const [selectedBrand, setSelectedBrand] = useState<string>('all')
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all')
  const [filteredSummary, setFilteredSummary] = useState(summary)
  const [uniqueBrands, setUniqueBrands] = useState<string[]>([])
  const [uniqueCampaigns, setUniqueCampaigns] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // Load initial data and filters
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const response = await fetch('/api/data/summary')
        const data = await response.json()
        
        if (data.success) {
          setFilteredSummary(data.summary)
          setUniqueBrands(data.filters.brands)
          setUniqueCampaigns(data.filters.campaigns)
        }
      } catch (error) {
        console.error('Failed to load initial data:', error)
      }
    }
    
    loadInitialData()
  }, [])

  // Apply filters and fetch filtered data
  useEffect(() => {
    const applyFilters = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/data/filtered-summary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            brand: selectedBrand,
            campaign: selectedCampaign
          })
        })
        
        const data = await response.json()
        if (data.success) {
          setFilteredSummary(data.summary)
        }
      } catch (error) {
        console.error('Failed to apply filters:', error)
      } finally {
        setLoading(false)
      }
    }

    applyFilters()
  }, [selectedBrand, selectedCampaign])

  // Update available campaigns when brand changes
  useEffect(() => {
    const updateCampaigns = async () => {
      if (selectedBrand !== 'all') {
        try {
          const response = await fetch('/api/data/filtered-summary', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              brand: selectedBrand,
              campaign: 'all'
            })
          })
          
          const data = await response.json()
          if (data.success) {
            // Get campaigns for this brand from the full data
            const brandResponse = await fetch('/api/data/summary')
            const brandData = await brandResponse.json()
            
                         if (brandData.success) {
               const allData = brandData.allData || []
               const brandCampaigns = Array.from(new Set(
                 allData
                   .filter((item: any) => item.dimensions.brand === selectedBrand)
                   .map((item: any) => item.dimensions.campaign)
               )) as string[]
               setUniqueCampaigns(brandCampaigns)
              
              // Reset campaign selection if current campaign is not available for selected brand
              if (!brandCampaigns.includes(selectedCampaign)) {
                setSelectedCampaign('all')
              }
            }
          }
        } catch (error) {
          console.error('Failed to update campaigns:', error)
        }
      } else {
        // Reset to all campaigns when brand is 'all'
        const loadAllCampaigns = async () => {
          try {
            const response = await fetch('/api/data/summary')
            const data = await response.json()
            if (data.success) {
              setUniqueCampaigns(data.filters.campaigns)
            }
          } catch (error) {
            console.error('Failed to load all campaigns:', error)
          }
        }
        loadAllCampaigns()
      }
    }

    updateCampaigns()
  }, [selectedBrand, selectedCampaign])
  
  const metrics = [
    {
      title: 'Total Impressions',
      value: filteredSummary.totalImpressions || 0,
      change: 12.5, // Mock change for now
      icon: <Eye className="w-6 h-6 text-primary-600" />,
      format: 'number' as const
    },
    {
      title: 'Total Clicks',
      value: filteredSummary.totalClicks || 0,
      change: 8.2, // Mock change for now
      icon: <MousePointer className="w-6 h-6 text-primary-600" />,
      format: 'number' as const
    },
    {
      title: 'Click-Through Rate',
      value: filteredSummary.averageCTR || 0,
      change: -2.1, // Mock change for now
      icon: <TrendingUp className="w-6 h-6 text-primary-600" />,
      format: 'percentage' as const
    },
    {
      title: 'Total Spend',
      value: filteredSummary.totalSpend || 0,
      change: 15.3, // Mock change for now
      icon: <DollarSign className="w-6 h-6 text-primary-600" />,
      format: 'currency' as const
    },
    {
      title: 'Total Revenue',
      value: filteredSummary.totalRevenue || 0,
      change: 22.7, // Mock change for now
      icon: <DollarSign className="w-6 h-6 text-primary-600" />,
      format: 'currency' as const
    },
    {
      title: 'ROAS',
      value: filteredSummary.averageROAS || 0,
      change: 18.9, // Mock change for now
      icon: <DollarSign className="w-6 h-6 text-primary-600" />,
      format: 'roas' as const
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Performance Overview</h2>
        <p className="text-sm text-gray-500">Last updated: {new Date().toLocaleString()}</p>
      </div>
      
      {/* Filters */}
      <div className="flex items-center space-x-4 p-4 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters:</span>
        </div>
        
        {/* Brand Filter */}
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-600">Brand:</label>
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Brands</option>
            {uniqueBrands.map((brand) => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
          </select>
        </div>
        
        {/* Campaign Filter */}
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-600">Campaign:</label>
          <select
            value={selectedCampaign}
            onChange={(e) => setSelectedCampaign(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Campaigns</option>
            {uniqueCampaigns.map((campaign) => (
              <option key={campaign} value={campaign}>{campaign}</option>
            ))}
          </select>
        </div>
        
        {/* Clear Filters Button */}
        {(selectedBrand !== 'all' || selectedCampaign !== 'all') && (
          <button
            onClick={() => {
              setSelectedBrand('all')
              setSelectedCampaign('all')
            }}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Clear Filters
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>
    </div>
  )
} 
'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Eye, MousePointer, DollarSign, Users, Filter } from 'lucide-react'
import { formatNumber, formatCurrency, formatPercentage } from '@/lib/utils'
import { loadCampaignData, getDataSummary } from '@/lib/server-data-service'

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
  const [allData, setAllData] = useState<any[]>([])
  const [uniqueBrands, setUniqueBrands] = useState<string[]>([])
  const [uniqueCampaigns, setUniqueCampaigns] = useState<string[]>([])

  // Load data and extract unique brands/campaigns
  useEffect(() => {
    const loadData = async () => {
      const data = await loadCampaignData()
      setAllData(data)
      
      // Extract unique brands and campaigns
      const brands = Array.from(new Set(data.map(item => item.dimensions.brand)))
      const campaigns = Array.from(new Set(data.map(item => item.dimensions.campaign)))
      
      setUniqueBrands(brands)
      setUniqueCampaigns(campaigns)
    }
    
    loadData()
  }, [])

  // Apply filters and recalculate summary
  useEffect(() => {
    const applyFilters = () => {
      let filteredData = allData

      // Apply brand filter
      if (selectedBrand !== 'all') {
        filteredData = filteredData.filter(item => item.dimensions.brand === selectedBrand)
      }

      // Apply campaign filter
      if (selectedCampaign !== 'all') {
        filteredData = filteredData.filter(item => item.dimensions.campaign === selectedCampaign)
      }

      // Recalculate summary with filtered data
      const newSummary = getDataSummary(filteredData)
      setFilteredSummary(newSummary)
    }

    if (allData.length > 0) {
      applyFilters()
    }
  }, [selectedBrand, selectedCampaign, allData])

  // Update available campaigns when brand changes
  useEffect(() => {
    if (selectedBrand !== 'all') {
      const brandCampaigns = Array.from(new Set(
        allData
          .filter(item => item.dimensions.brand === selectedBrand)
          .map(item => item.dimensions.campaign)
      ))
      setUniqueCampaigns(brandCampaigns)
      
      // Reset campaign selection if current campaign is not available for selected brand
      if (!brandCampaigns.includes(selectedCampaign)) {
        setSelectedCampaign('all')
      }
    } else {
      // Reset to all campaigns when brand is 'all'
      const allCampaigns = Array.from(new Set(allData.map(item => item.dimensions.campaign)))
      setUniqueCampaigns(allCampaigns)
    }
  }, [selectedBrand, allData, selectedCampaign])
  
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
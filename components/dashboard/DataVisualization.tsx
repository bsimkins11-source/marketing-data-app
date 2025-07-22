'use client'

import { useState, useEffect } from 'react'
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Table,
  Download,
  RefreshCw,
  Settings
} from 'lucide-react'
import { formatNumber, formatCurrency, formatPercentage } from '@/lib/utils'
import { loadCampaignData, getDataSummary } from '@/lib/server-data-service'

type ChartType = 'bar' | 'line' | 'pie' | 'table'

interface ChartData {
  name: string
  impressions: number
  clicks: number
  conversions: number
  spend: number
  revenue: number
  ctr: number
  cpc: number
  roas: number
}

interface DataVisualizationProps {
  chartType?: ChartType
  summary: any
}

function ChartDisplay({ chartData, chartType }: { chartData: ChartData[], chartType: ChartType }) {
  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No data available
      </div>
    )
  }

  switch (chartType) {
    case 'bar':
      return (
        <div className="space-y-4">
          {chartData.map((item, index) => (
            <div key={index} className="bg-white p-4 rounded-lg border">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-gray-900">{item.name}</h3>
                <span className="text-sm text-gray-500">
                  {formatCurrency(item.spend)} spend
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Impressions:</span>
                  <span className="font-medium">{formatNumber(item.impressions)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Clicks:</span>
                  <span className="font-medium">{formatNumber(item.clicks)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>CTR:</span>
                  <span className="font-medium">{formatPercentage(item.ctr)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>ROAS:</span>
                  <span className="font-medium">{item.roas.toFixed(2)}x</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Revenue:</span>
                  <span className="font-medium">{formatCurrency(item.revenue)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    
    case 'table':
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Campaign
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Impressions
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clicks
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CTR
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Spend
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ROAS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {chartData.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {item.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {formatNumber(item.impressions)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {formatNumber(item.clicks)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {formatPercentage(item.ctr)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {formatCurrency(item.spend)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {item.roas.toFixed(2)}x
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    
    default:
      return (
        <div className="flex items-center justify-center h-64 text-gray-500">
          Chart type not implemented
        </div>
      )
  }
}

export default function DataVisualization({ chartType = 'bar', summary }: DataVisualizationProps) {
  
  // Transform campaign aggregates into chart data
  const chartData: ChartData[] = summary.campaignAggregates.map((campaign: any) => ({
    name: campaign.campaign,
    impressions: campaign.impressions,
    clicks: campaign.clicks,
    conversions: campaign.conversions,
    spend: campaign.spend,
    revenue: campaign.revenue,
    ctr: campaign.ctr,
    cpc: campaign.cpc,
    roas: campaign.roas
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Campaign Performance</h2>
        <div className="flex items-center space-x-2">
          <div className="px-3 py-1 rounded-md text-sm font-medium bg-primary-100 text-primary-700">
            <BarChart3 className="w-4 h-4 inline mr-1" />
            {chartType === 'bar' ? 'Bar' : chartType === 'table' ? 'Table' : 'Chart'}
          </div>
        </div>
      </div>
      
      <ChartDisplay chartData={chartData} chartType={chartType} />
    </div>
  )
} 
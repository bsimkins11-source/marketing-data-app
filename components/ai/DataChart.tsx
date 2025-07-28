'use client'

import { useState, useRef } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import html2canvas from 'html2canvas'
import { saveAs } from 'file-saver'

interface ChartData {
  type: string
  campaigns?: Array<{
    campaign: string
    platform: string
    roas: number
    ctr: number
    cpa: number
    spend: number
    revenue: number
    conversions: number
  }>
  chartType?: string
  query: string
}

interface DataChartProps {
  data: ChartData
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export default function DataChart({ data }: DataChartProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const chartRef = useRef<HTMLDivElement>(null)
  
  console.log('DataChart component rendered with data:', data)
  
  if (!data || !data.campaigns) {
    console.log('DataChart: No data or campaigns found')
    return null
  }

  // Handle different data types
  const isChartData = data.type === 'chart_data' || data.type === 'top_performing'
  if (!isChartData) {
    console.log('DataChart: Not chart data type:', data.type)
    return null
  }

  console.log('DataChart: Rendering chart with', data.campaigns.length, 'campaigns')

  // Download chart as PNG
  const downloadChartAsPNG = async () => {
    if (!chartRef.current) return
    
    setIsDownloading(true)
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true
      })
      
      canvas.toBlob((blob) => {
        if (blob) {
          const fileName = `chart_${data.chartType || 'bar'}_${new Date().toISOString().split('T')[0]}.png`
          saveAs(blob, fileName)
        }
      })
    } catch (error) {
      console.error('Error downloading chart:', error)
    } finally {
      setIsDownloading(false)
    }
  }

  // Download data as CSV
  const downloadDataAsCSV = () => {
    const headers = ['Campaign', 'Platform', 'Revenue', 'Spend', 'ROAS', 'CTR', 'Conversions']
    const csvContent = [
      headers.join(','),
      ...(data.campaigns || []).map(campaign => [
        `"${campaign.campaign}"`,
        `"${campaign.platform}"`,
        campaign.revenue.toFixed(2),
        campaign.spend.toFixed(2),
        campaign.roas.toFixed(2),
        (campaign.ctr * 100).toFixed(2),
        campaign.conversions.toFixed(2)
      ].join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const fileName = `chart_data_${data.chartType || 'bar'}_${new Date().toISOString().split('T')[0]}.csv`
    saveAs(blob, fileName)
  }

  // Prepare data for different chart types
  const barChartData = data.campaigns.map(campaign => ({
    name: campaign.campaign,
    Revenue: Math.round(campaign.revenue),
    Spend: Math.round(campaign.spend),
    ROAS: campaign.roas,
    CTR: (campaign.ctr * 100).toFixed(2),
    Conversions: Math.round(campaign.conversions)
  }))

  const pieChartData = data.campaigns.map(campaign => ({
    name: campaign.campaign,
    value: Math.round(campaign.revenue)
  }))

  const lineChartData = data.campaigns.map(campaign => ({
    name: campaign.campaign,
    Revenue: Math.round(campaign.revenue),
    Spend: Math.round(campaign.spend)
  }))

  // Determine chart type based on query or data
  const query = data.query.toLowerCase()
  let chartType = data.chartType || 'bar'
  
  if (!data.chartType) {
    if (query.includes('pie') || query.includes('distribution')) {
      chartType = 'pie'
    } else if (query.includes('line') || query.includes('trend')) {
      chartType = 'line'
    } else if (query.includes('bar') || query.includes('chart')) {
      chartType = 'bar'
    }
  }

  const renderChart = () => {
    switch (chartType) {
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={lineChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Amount']} />
              <Legend />
              <Line type="monotone" dataKey="Revenue" stroke="#8884d8" strokeWidth={2} />
              <Line type="monotone" dataKey="Spend" stroke="#82ca9d" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )

      default: // bar chart
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip formatter={(value, name) => {
                if (name === 'Revenue' || name === 'Spend') {
                  return [`$${value.toLocaleString()}`, name]
                }
                if (name === 'CTR') {
                  return [`${value}%`, name]
                }
                if (name === 'ROAS') {
                  return [`${value}x`, name]
                }
                return [value, name]
              }} />
              <Legend />
              <Bar dataKey="Revenue" fill="#8884d8" />
              <Bar dataKey="Spend" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        )
    }
  }

  return (
    <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          📊 {chartType.toUpperCase()} Chart Visualization
        </h3>
        
        {/* Download Buttons */}
        <div className="flex space-x-2">
          <button
            onClick={downloadChartAsPNG}
            disabled={isDownloading}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
            title="Download chart as PNG image"
          >
            {isDownloading ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>📷</span>
                <span>PNG</span>
              </>
            )}
          </button>
          
          <button
            onClick={downloadDataAsCSV}
            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center space-x-1"
            title="Download data as CSV file"
          >
            <span>📊</span>
            <span>CSV</span>
          </button>
        </div>
      </div>
      
      {/* Chart Container */}
      <div ref={chartRef} className="mb-4" style={{ height: '300px' }}>
        {renderChart()}
      </div>
      
      {/* Fallback simple chart if Recharts fails */}
      <div className="mt-4 p-4 bg-blue-50 rounded border border-blue-200">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-md font-medium text-blue-800">📊 Simple Chart View</h4>
          <button
            onClick={downloadDataAsCSV}
            className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
            title="Download data as CSV"
          >
            📊 CSV
          </button>
        </div>
        <div className="space-y-2">
          {data.campaigns?.map((campaign, index) => {
            const revenuePercent = (campaign.revenue / (data.campaigns?.reduce((sum, c) => sum + c.revenue, 0) || 1)) * 100
            return (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-32 text-sm font-medium truncate">{campaign.campaign}</div>
                <div className="flex-1 bg-gray-200 rounded-full h-4">
                  <div 
                    className="bg-blue-500 h-4 rounded-full" 
                    style={{ width: `${revenuePercent}%` }}
                  ></div>
                </div>
                <div className="w-24 text-sm text-right">${campaign.revenue.toLocaleString()}</div>
              </div>
            )
          })}
        </div>
      </div>
      
      {/* Simple metrics summary */}
      <div className="mt-4 p-3 bg-gray-50 rounded">
        <h4 className="text-md font-medium text-gray-700 mb-2">📈 Performance Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-medium">Total Revenue:</span>
            <div className="text-green-600 font-bold">
              ${data.campaigns.reduce((sum, c) => sum + c.revenue, 0).toLocaleString()}
            </div>
          </div>
          <div>
            <span className="font-medium">Total Spend:</span>
            <div className="text-blue-600 font-bold">
              ${data.campaigns.reduce((sum, c) => sum + c.spend, 0).toLocaleString()}
            </div>
          </div>
          <div>
            <span className="font-medium">Avg ROAS:</span>
            <div className="text-purple-600 font-bold">
              {(data.campaigns.reduce((sum, c) => sum + c.roas, 0) / data.campaigns.length).toFixed(2)}x
            </div>
          </div>
          <div>
            <span className="font-medium">Top Campaign:</span>
            <div className="text-orange-600 font-bold">
              {data.campaigns[0]?.campaign}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 
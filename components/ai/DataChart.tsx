'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'

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
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        📊 {chartType.toUpperCase()} Chart Visualization
      </h3>
      
      {/* Chart Container */}
      <div className="mb-4" style={{ height: '300px' }}>
        {renderChart()}
      </div>
      
      {/* Fallback simple chart if Recharts fails */}
      <div className="mt-4 p-4 bg-blue-50 rounded border border-blue-200">
        <h4 className="text-md font-medium text-blue-800 mb-3">📊 Simple Chart View</h4>
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
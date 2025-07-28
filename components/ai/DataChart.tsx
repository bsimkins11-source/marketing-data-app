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
  if (!data || !data.campaigns) {
    return null
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
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        📊 Data Visualization
      </h3>
      {renderChart()}
      
      {/* Additional metrics table */}
      <div className="mt-4">
        <h4 className="text-md font-medium text-gray-700 mb-2">Detailed Metrics</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left">Campaign</th>
                <th className="px-3 py-2 text-right">Revenue</th>
                <th className="px-3 py-2 text-right">Spend</th>
                <th className="px-3 py-2 text-right">ROAS</th>
                <th className="px-3 py-2 text-right">CTR</th>
                <th className="px-3 py-2 text-right">Conversions</th>
              </tr>
            </thead>
            <tbody>
              {data.campaigns.map((campaign, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="px-3 py-2 font-medium">{campaign.campaign}</td>
                  <td className="px-3 py-2 text-right">${campaign.revenue.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">${campaign.spend.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">{campaign.roas.toFixed(2)}x</td>
                  <td className="px-3 py-2 text-right">{(campaign.ctr * 100).toFixed(2)}%</td>
                  <td className="px-3 py-2 text-right">{campaign.conversions.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
} 
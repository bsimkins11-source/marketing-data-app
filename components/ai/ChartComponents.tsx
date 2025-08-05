'use client'

import React from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'

interface ChartData {
  [key: string]: any
}

interface ChartComponentProps {
  chartData: ChartData[]
  chartType: string
  chartTitle: string
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export const ChartComponent: React.FC<ChartComponentProps> = ({
  chartData,
  chartType,
  chartTitle
}) => {
  if (!chartData || chartData.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center">
        <p className="text-gray-500">No chart data available</p>
      </div>
    )
  }

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="platform" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [
                  typeof value === 'number' ? `$${value.toLocaleString()}` : value,
                  name
                ]}
              />
              <Legend />
              <Bar dataKey="spend" fill="#8884d8" name="Spend" />
              <Bar dataKey="revenue" fill="#82ca9d" name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        )

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [
                  typeof value === 'number' ? `$${value.toLocaleString()}` : value,
                  name
                ]}
              />
              <Legend />
              <Line type="monotone" dataKey="spend" stroke="#8884d8" name="Spend" />
              <Line type="monotone" dataKey="revenue" stroke="#82ca9d" name="Revenue" />
            </LineChart>
          </ResponsiveContainer>
        )

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [
                  typeof value === 'number' ? `$${value.toLocaleString()}` : value,
                  name
                ]}
              />
              <Legend />
              <Area type="monotone" dataKey="spend" stackId="1" stroke="#8884d8" fill="#8884d8" name="Spend" />
              <Area type="monotone" dataKey="revenue" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="Revenue" />
            </AreaChart>
          </ResponsiveContainer>
        )

      default:
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="metric" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [
                  typeof value === 'number' ? `$${value.toLocaleString()}` : value,
                  name
                ]}
              />
              <Legend />
              <Bar dataKey="value" fill="#8884d8" name="Value" />
            </BarChart>
          </ResponsiveContainer>
        )
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{chartTitle}</h3>
      {renderChart()}
      <div className="mt-4 text-sm text-gray-500 text-center">
        💡 Hover over the chart for detailed information
      </div>
    </div>
  )
}

export default ChartComponent 
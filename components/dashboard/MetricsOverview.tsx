import { TrendingUp, TrendingDown, Eye, MousePointer, DollarSign, Users } from 'lucide-react'
import { formatNumber, formatCurrency, formatPercentage } from '@/lib/utils'
import { loadCampaignData, getDataSummary } from '@/lib/server-data-service'

interface MetricCardProps {
  title: string
  value: string | number
  change: number
  icon: React.ReactNode
  format?: 'number' | 'currency' | 'percentage'
}

function MetricCard({ title, value, change, icon, format = 'number' }: MetricCardProps) {
  const isPositive = change >= 0
  const formattedValue = format === 'currency' 
    ? formatCurrency(Number(value))
    : format === 'percentage'
    ? formatPercentage(Number(value))
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
  
  const metrics = [
    {
      title: 'Total Impressions',
      value: summary.totalImpressions || 0,
      change: 12.5, // Mock change for now
      icon: <Eye className="w-6 h-6 text-primary-600" />,
      format: 'number' as const
    },
    {
      title: 'Total Clicks',
      value: summary.totalClicks || 0,
      change: 8.2, // Mock change for now
      icon: <MousePointer className="w-6 h-6 text-primary-600" />,
      format: 'number' as const
    },
    {
      title: 'Click-Through Rate',
      value: summary.averageCTR || 0,
      change: -2.1, // Mock change for now
      icon: <TrendingUp className="w-6 h-6 text-primary-600" />,
      format: 'percentage' as const
    },
    {
      title: 'Total Spend',
      value: summary.totalSpend || 0,
      change: 15.3, // Mock change for now
      icon: <DollarSign className="w-6 h-6 text-primary-600" />,
      format: 'currency' as const
    },
    {
      title: 'Total Revenue',
      value: summary.totalRevenue || 0,
      change: 22.7, // Mock change for now
      icon: <DollarSign className="w-6 h-6 text-primary-600" />,
      format: 'currency' as const
    },
    {
      title: 'ROAS',
      value: summary.averageROAS || 0,
      change: 18.9, // Mock change for now
      icon: <DollarSign className="w-6 h-6 text-primary-600" />,
      format: 'number' as const
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Performance Overview</h2>
        <p className="text-sm text-gray-500">Last updated: {new Date().toLocaleString()}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>
    </div>
  )
} 
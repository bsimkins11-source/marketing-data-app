import { Suspense } from 'react'
import SharedHeader from '@/components/SharedHeader'
import DataSourceConnections from '@/components/dashboard/DataSourceConnections'
import QueryBuilder from '@/components/dashboard/QueryBuilder'
import DataVisualization from '@/components/dashboard/DataVisualization'
import MetricsOverview from '@/components/dashboard/MetricsOverview'
import { loadCampaignData, getDataSummary } from '@/lib/server-data-service'

function LoadingCard() {
  return (
    <div className="card animate-pulse">
      <div className="h-24 bg-gray-200 rounded"></div>
    </div>
  )
}

export default async function Dashboard() {
  // Load CSV data directly at the page level
  const campaignData = await loadCampaignData()
  const summary = getDataSummary(campaignData)
  
  return (
    <div className="min-h-screen bg-gray-50">
      <SharedHeader showNavigation={true} currentPage="dashboard" />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Marketing Dashboard</h1>
          <p className="text-gray-600">Monitor and analyze your campaign performance</p>
        </div>

        {/* Metrics Overview */}
        <div className="mb-8">
          <MetricsOverview summary={summary} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Data Visualization */}
          <div className="card">
            <DataVisualization chartType="bar" summary={summary} />
          </div>

          {/* Query Builder */}
          <div className="card">
            <QueryBuilder />
          </div>
        </div>

        {/* Data Source Connections */}
        <div className="mt-8">
          <div className="card">
            <DataSourceConnections />
          </div>
        </div>
      </main>
    </div>
  )
} 
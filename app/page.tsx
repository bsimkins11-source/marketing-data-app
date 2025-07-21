import Link from 'next/link'
import { BarChart3, Database, TrendingUp, Users } from 'lucide-react'

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Marketing Data Query App
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Query, analyze, and visualize marketing data from multiple sources in one powerful dashboard.
        </p>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="card">
          <div className="flex items-center mb-4">
            <Database className="w-8 h-8 text-primary-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Data Sources</h3>
          </div>
          <p className="text-gray-600">
            Connect to Google Analytics, Facebook Ads, Twitter, LinkedIn, and more.
          </p>
        </div>

        <div className="card">
          <div className="flex items-center mb-4">
            <BarChart3 className="w-8 h-8 text-primary-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Analytics</h3>
          </div>
          <p className="text-gray-600">
            Advanced analytics and reporting with customizable dashboards.
          </p>
        </div>

        <div className="card">
          <div className="flex items-center mb-4">
            <TrendingUp className="w-8 h-8 text-primary-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Performance</h3>
          </div>
          <p className="text-gray-600">
            Track campaign performance and ROI across all channels.
          </p>
        </div>

        <div className="card">
          <div className="flex items-center mb-4">
            <Users className="w-8 h-8 text-primary-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Audience</h3>
          </div>
          <p className="text-gray-600">
            Understand your audience with detailed demographic insights.
          </p>
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-center">
        <Link href="/dashboard" className="btn-primary inline-block">
          Get Started
        </Link>
      </div>
    </div>
  )
} 
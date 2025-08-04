import Link from 'next/link'
import { Database, TrendingUp, Users } from 'lucide-react'
import SharedHeader from '@/components/SharedHeader'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <SharedHeader />

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

        {/* Time Context Disclaimer */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8 max-w-4xl mx-auto">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Data Timeframe
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>All campaign data in this application is from <strong>June 2024</strong>. The sample dataset includes:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>2 brands: FreshNest and TasteBuds</li>
                  <li>10 campaigns across 6 platforms (Meta, DV360, Amazon, CM360, SA360, TradeDesk)</li>
                  <li>Daily data from June 1-30, 2024</li>
                  <li>Multiple audience segments and creative formats</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section - Moved above feature cards */}
        <div className="text-center space-y-4 mb-12">
          <div className="flex items-center justify-center space-x-4">
            <Link href="/dashboard" className="btn-primary inline-block">
              View Dashboard
            </Link>
            <Link href="/ai-analysis" className="btn-secondary inline-block">
              Try AI Analysis
            </Link>
          </div>
          <p className="text-sm text-gray-600">
            Ask questions about your campaign data in natural language
          </p>
        </div>

      {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            <Database className="w-8 h-8 text-primary-600 mr-3" />
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
      </div>
    </div>
  )
} 
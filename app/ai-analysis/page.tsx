'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Bot, Database, TrendingUp, Users, DollarSign } from 'lucide-react'
import AIConversation from '@/components/ai/AIConversation'
import SharedHeader from '@/components/SharedHeader'
import { MarketingData } from '@/types'

export default function AIAnalysisPage() {
  const [campaignData, setCampaignData] = useState<MarketingData[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionActive, setSessionActive] = useState(false)

  // Load campaign data on component mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/data/campaigns?summary=true')
      if (!response.ok) {
        throw new Error('Failed to load campaign data')
      }
      
      const result = await response.json()
      setCampaignData(result.data || result.campaigns || [])
      setSummary(result.summary || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSessionStart = () => {
    setSessionActive(true)
  }

  const handleSessionEnd = () => {
    setSessionActive(false)
  }

  const handleRefresh = () => {
    loadData()
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <SharedHeader showNavigation={true} currentPage="ai-analysis" />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            AI-Powered Campaign Analysis
          </h1>
          <p className="text-lg text-gray-600">
            Ask questions about your campaign data in natural language
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800">
              <strong>Loading...</strong> Please wait while we load your campaign data.
            </p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">
              <strong>Error:</strong> {error}
            </p>
            <button
              onClick={handleRefresh}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}



        {/* AI Conversation */}
        {!isLoading && !error && (
          <AIConversation
            campaignData={campaignData}
            onSessionStart={handleSessionStart}
            onSessionEnd={handleSessionEnd}
          />
        )}
      </div>
    </div>
  )
} 
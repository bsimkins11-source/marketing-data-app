'use client'

import { useState } from 'react'
import { 
  Plus, 
  Settings, 
  Wifi, 
  WifiOff,
  ExternalLink,
  RefreshCw
} from 'lucide-react'
import { DataSource } from '@/types'

interface DataSourceConnection {
  id: string
  name: string
  type: DataSource
  status: 'connected' | 'disconnected' | 'error'
  lastSync: string
  accountName: string
}

export default function DataSourceConnections() {
  const [connections, setConnections] = useState<DataSourceConnection[]>([
    {
      id: '1',
      name: 'Google Analytics',
      type: 'google_analytics',
      status: 'connected',
      lastSync: '2 minutes ago',
      accountName: 'My Website'
    },
    {
      id: '2',
      name: 'Facebook Ads',
      type: 'facebook_ads',
      status: 'connected',
      lastSync: '5 minutes ago',
      accountName: 'My Business'
    },
    {
      id: '3',
      name: 'Twitter Ads',
      type: 'twitter_ads',
      status: 'disconnected',
      lastSync: 'Never',
      accountName: ''
    },
    {
      id: '4',
      name: 'LinkedIn Ads',
      type: 'linkedin_ads',
      status: 'error',
      lastSync: '1 hour ago',
      accountName: 'Company Page'
    }
  ])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-600 bg-green-50'
      case 'disconnected':
        return 'text-gray-600 bg-gray-50'
      case 'error':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <Wifi className="w-4 h-4" />
      case 'disconnected':
        return <WifiOff className="w-4 h-4" />
      case 'error':
        return <WifiOff className="w-4 h-4" />
      default:
        return <WifiOff className="w-4 h-4" />
    }
  }

  const getPlatformIcon = (type: DataSource) => {
    const icons: Record<string, string> = {
      google_analytics: '🔍',
      facebook_ads: '📘',
      twitter_ads: '🐦',
      linkedin_ads: '💼',
      tiktok_ads: '🎵',
      csv_backend: '📊',
      firebase: '🔥',
      sample: '📊'
    }
    return icons[type] || '📊'
  }

  const handleRefresh = (id: string) => {
    // Simulate refresh
    setConnections(prev => 
      prev.map(conn => 
        conn.id === id 
          ? { ...conn, lastSync: 'Just now' }
          : conn
      )
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Data Sources</h3>
        <button className="btn-primary flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Add Source</span>
        </button>
      </div>

      <div className="space-y-3">
        {connections.map((connection) => (
          <div key={connection.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">
                {getPlatformIcon(connection.type)}
              </div>
              <div>
                <p className="font-medium text-gray-900">{connection.name}</p>
                {connection.accountName && (
                  <p className="text-sm text-gray-600">{connection.accountName}</p>
                )}
                <p className="text-xs text-gray-500">Last sync: {connection.lastSync}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(connection.status)}`}>
                {getStatusIcon(connection.status)}
                <span className="capitalize">{connection.status}</span>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleRefresh(connection.id)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Refresh connection"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                
                <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors" title="Settings">
                  <Settings className="w-4 h-4" />
                </button>
                
                {connection.status === 'connected' && (
                  <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors" title="View in platform">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> Connect your marketing platforms to start analyzing data across all channels.
        </p>
      </div>
    </div>
  )
} 
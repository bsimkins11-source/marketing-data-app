'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  BarChart3, 
  Settings, 
  Bell, 
  User, 
  Search,
  Calendar,
  Download
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function DashboardHeader() {
  const [dateRange, setDateRange] = useState('last_30_days')

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <BarChart3 className="w-8 h-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">
                Marketing Data Query
              </span>
            </Link>
            
            {/* Transparent Partners Logo */}
            <div className="flex items-center space-x-2 border-l border-gray-300 pl-6">
              <Image 
                src="/images/transparent-partners-logo.png" 
                alt="Transparent Partners" 
                width={120}
                height={32}
                className="h-8 w-auto object-contain"
                priority
              />
              <span className="text-sm text-gray-500 font-medium">
                Powered by Transparent Partners
              </span>
            </div>
            
            <nav className="hidden md:flex space-x-6">
              <Link 
                href="/dashboard" 
                className="text-primary-600 font-medium border-b-2 border-primary-600 pb-1"
              >
                Dashboard
              </Link>
              <Link 
                href="/ai-analysis" 
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                AI Analysis
              </Link>
              <Link 
                href="/queries" 
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Queries
              </Link>
              <Link 
                href="/reports" 
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Reports
              </Link>
              <Link 
                href="/settings" 
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Settings
              </Link>
            </nav>
          </div>

          {/* Search and Controls */}
          <div className="flex items-center space-x-4">
            {/* Date Range Selector */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-sm"
              >
                <option value="last_7_days">Last 7 days</option>
                <option value="last_30_days">Last 30 days</option>
                <option value="last_90_days">Last 90 days</option>
                <option value="last_year">Last year</option>
                <option value="custom">Custom range</option>
              </select>
            </div>

            {/* Search */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search queries, reports..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-64 text-sm"
              />
            </div>

            {/* Action Buttons */}
            <button className="btn-secondary flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>

            {/* User Menu */}
            <div className="flex items-center space-x-3">
              <button className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              
              <button className="flex items-center space-x-2 p-2 text-gray-600 hover:text-gray-900 transition-colors">
                <User className="w-5 h-5" />
                <span className="hidden md:block text-sm font-medium">Account</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
} 
'use client'

import Link from 'next/link'
import { BarChart3 } from 'lucide-react'

interface SharedHeaderProps {
  showNavigation?: boolean
  currentPage?: string
}

export default function SharedHeader({ showNavigation = false, currentPage }: SharedHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Left Side - Marketing Data Query (Home Link) */}
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <BarChart3 className="w-8 h-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">
                Marketing Data Query
              </span>
            </Link>
            
            {/* Navigation Menu (only show if enabled) */}
            {showNavigation && (
              <nav className="hidden md:flex space-x-6">
                <Link 
                  href="/dashboard" 
                  className={`font-medium pb-1 border-b-2 transition-colors ${
                    currentPage === 'dashboard' 
                      ? 'text-primary-600 border-primary-600' 
                      : 'text-gray-600 hover:text-gray-900 border-transparent'
                  }`}
                >
                  Dashboard
                </Link>
                <Link 
                  href="/ai-analysis" 
                  className={`font-medium pb-1 border-b-2 transition-colors ${
                    currentPage === 'ai-analysis' 
                      ? 'text-primary-600 border-primary-600' 
                      : 'text-gray-600 hover:text-gray-900 border-transparent'
                  }`}
                >
                  AI Analysis
                </Link>
              </nav>
            )}
          </div>

          {/* Right Side - Empty for now */}
          <div className="flex items-center space-x-2">
            {/* Logo and branding removed */}
          </div>
        </div>
      </div>
    </header>
  )
} 
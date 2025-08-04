'use client'

import Link from 'next/link'
import { ArrowLeft, BookOpen, TrendingUp, DollarSign, Target, Calendar, BarChart3, Lightbulb } from 'lucide-react'
import SharedHeader from '@/components/SharedHeader'

export default function AIGuide() {
  const categories = [
    {
      title: "📈 Executive Summary & Overview",
      description: "Get a comprehensive overview of your marketing performance",
      icon: <BarChart3 className="w-6 h-6 text-blue-600" />,
      examples: [
        "Give me an executive summary",
        "What's our overall performance?",
        "Show me a summary of our campaigns",
        "How are we doing overall?",
        "What are the key metrics?",
        "Summarize our marketing performance"
      ]
    },
    {
      title: "💰 Financial Performance",
      description: "Dive into spend, revenue, and ROI metrics",
      icon: <DollarSign className="w-6 h-6 text-green-600" />,
      examples: [
        "How much did we spend?",
        "What's our total revenue?",
        "What's our overall ROAS?",
        "How much revenue did we generate?",
        "What's our cost per acquisition?",
        "What's our CPA?",
        "What's our cost per click?",
        "What's our CPM?"
      ]
    },
    {
      title: "🏆 Platform Performance",
      description: "Analyze performance by advertising platform",
      icon: <Target className="w-6 h-6 text-purple-600" />,
      examples: [
        "How is Meta performing?",
        "What's DV360's performance?",
        "Show me Amazon's metrics",
        "How did CM360 do?",
        "What are SA360's results?",
        "How is TradeDesk performing?",
        "Which platform is doing the best?",
        "Compare platform performance"
      ]
    },
    {
      title: "📅 Weekly Performance",
      description: "Break down performance by week within June 2024",
      icon: <Calendar className="w-6 h-6 text-orange-600" />,
      examples: [
        "How did we perform in week 1?",
        "Show me week 2 results",
        "What happened in week 3?",
        "How was week 4?",
        "Compare all weeks",
        "Which week performed best?",
        "What's our weekly trend?"
      ]
    },
    {
      title: "🎯 Campaign Analysis",
      description: "Analyze specific campaigns and their performance",
      icon: <TrendingUp className="w-6 h-6 text-red-600" />,
      examples: [
        "What's our best performing campaign?",
        "Show me campaign performance",
        "Which campaigns are doing well?",
        "What's our top campaign?",
        "How are our campaigns performing?",
        "Which campaign has the highest ROAS?"
      ]
    },
    {
      title: "🔍 Optimization Insights",
      description: "Get recommendations and insights for improvement",
      icon: <Lightbulb className="w-6 h-6 text-yellow-600" />,
      examples: [
        "What should we optimize?",
        "Give me optimization recommendations",
        "What can we improve?",
        "What are our opportunities?",
        "How can we improve performance?",
        "Where should we put more money?",
        "What optimization opportunities exist?"
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <SharedHeader />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Home
          </Link>
        </div>

        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-purple-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">
              🤖 AI Query Guide
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Learn how to ask the right questions to get the most insightful responses from your marketing data.
          </p>
        </div>

        {/* Data Context */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 max-w-4xl mx-auto">
          <h2 className="text-lg font-semibold text-blue-800 mb-3">📊 Available Data</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
            <div>
              <p><strong>Time Period:</strong> June 1-30, 2024 (30 days)</p>
              <p><strong>Brands:</strong> FreshNest, TasteBuds</p>
              <p><strong>Platforms:</strong> Meta, DV360, Amazon, CM360, SA360, TradeDesk</p>
            </div>
            <div>
              <p><strong>Data Granularity:</strong> Daily performance metrics</p>
              <p><strong>Time Dimensions:</strong> Week 1-4 breakdowns</p>
              <p><strong>Metrics:</strong> Spend, Revenue, ROAS, CTR, CPA, CPC, CPM</p>
            </div>
          </div>
        </div>

        {/* Pro Tips */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6 mb-8 max-w-4xl mx-auto">
          <h2 className="text-lg font-semibold text-purple-800 mb-4">💡 Pro Tips for Better Queries</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-purple-800 mb-2">✅ Do This:</h3>
              <ul className="space-y-1 text-purple-700 text-sm">
                <li>• Be specific: &ldquo;How is Meta performing?&rdquo; vs &ldquo;How are we doing?&rdquo;</li>
                <li>• Use natural language: &ldquo;What&apos;s our best campaign?&rdquo; works perfectly</li>
                <li>• Ask follow-up questions: Build on previous responses</li>
                <li>• Use platform names: Meta, DV360, Amazon, CM360, SA360, TradeDesk</li>
                <li>• Reference time periods: &ldquo;Week 1&rdquo;, &ldquo;June 2024&rdquo;</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-purple-800 mb-2">❌ Avoid This:</h3>
              <ul className="space-y-1 text-purple-700 text-sm">
                <li>• Asking about other months: All data is from June 2024</li>
                <li>• Asking about other years: Only 2024 data is available</li>
                <li>• Overly complex queries: Keep it simple and natural</li>
                <li>• Technical jargon: Use everyday language</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Query Categories */}
        <div className="space-y-8">
          {categories.map((category, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
              <div className="flex items-center mb-4">
                {category.icon}
                <h2 className="text-xl font-semibold text-gray-900 ml-3">{category.title}</h2>
              </div>
              <p className="text-gray-600 mb-4">{category.description}</p>
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-3">Example Queries:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {category.examples.map((example, exampleIndex) => (
                    <div key={exampleIndex} className="bg-white rounded border border-gray-200 p-3 text-sm">
                      <span className="text-gray-700">&ldquo;{example}&rdquo;</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Conversation Flow */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mt-8 max-w-4xl mx-auto">
          <h2 className="text-lg font-semibold text-green-800 mb-4">🔄 Conversation Flow</h2>
          <p className="text-green-700 mb-4">
            The AI remembers your conversation context, so you can build on previous responses:
          </p>
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium text-green-800">You:</span> 
                <span className="text-gray-700 ml-2">&ldquo;Give me an executive summary&rdquo;</span>
              </div>
              <div>
                <span className="font-medium text-green-800">AI:</span> 
                <span className="text-gray-700 ml-2">[Provides comprehensive overview]</span>
              </div>
              <div>
                <span className="font-medium text-green-800">You:</span> 
                <span className="text-gray-700 ml-2">&ldquo;How did we do in week 1?&rdquo;</span>
              </div>
              <div>
                <span className="font-medium text-green-800">AI:</span> 
                <span className="text-gray-700 ml-2">[Shows week 1 performance]</span>
              </div>
              <div>
                <span className="font-medium text-green-800">You:</span> 
                <span className="text-gray-700 ml-2">&ldquo;Which platform performed best that week?&rdquo;</span>
              </div>
              <div>
                <span className="font-medium text-green-800">AI:</span> 
                <span className="text-gray-700 ml-2">[Compares platforms for week 1]</span>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Link 
            href="/ai-analysis" 
            className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            <BookOpen className="w-5 h-5 mr-2" />
            Try AI Analysis Now
          </Link>
          <p className="text-sm text-gray-600 mt-2">
            Start asking questions about your marketing data
          </p>
        </div>
      </div>
    </div>
  )
} 
'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, RefreshCw, MessageSquare, Sparkles, Mic, MicOff, HelpCircle, X, Download } from 'lucide-react'
import { MarketingData } from '@/types'
import DataChart from './DataChart'

interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  data?: any // For AI responses with data
  inputMethod?: 'text' | 'voice' // Track how user input was provided
}

interface AIConversationProps {
  campaignData: MarketingData[]
  onSessionStart: () => void
  onSessionEnd: () => void
}

export default function AIConversation({ campaignData, onSessionStart, onSessionEnd }: AIConversationProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string>('')
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState('')
  const [isSupported, setIsSupported] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [showDownloadModal, setShowDownloadModal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const synthesisRef = useRef<any>(null)

  // Auto-scroll to bottom when new messages arrive (only if user is near bottom)
  useEffect(() => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
      
      if (isNearBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }, [messages])

  // Generate session ID when component mounts
  useEffect(() => {
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setSessionId(newSessionId)
    onSessionStart()
    
    // Add welcome message
    setMessages([{
      id: 'welcome',
      type: 'ai',
      content: `Hello! I'm your AI marketing data assistant. I can help you analyze your campaign data. Ask me anything about your campaigns, performance metrics, or request specific analysis! Click the help button (?) to see what I can do.`,
      timestamp: new Date()
    }])

    return () => {
      onSessionEnd()
    }
  }, [campaignData.length, onSessionStart, onSessionEnd])

  // Setup voice recognition and synthesis
  useEffect(() => {
    // Check if speech recognition is supported
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setIsSupported(true)
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = 'en-US'
      
      recognitionRef.current.onstart = () => {
        setIsListening(true)
        setError('')
      }
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setInputValue(transcript)
        stopListening()
        // Automatically send voice input after a short delay
        setTimeout(() => {
          handleSendMessage('voice')
        }, 500)
      }
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        setError(`Speech recognition error: ${event.error}`)
        setIsListening(false)
      }
      
      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }

    // Setup speech synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthesisRef.current = window.speechSynthesis
    }
  }, [])

  const startListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start()
    }
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }

  const speakResponse = (text: string) => {
    if (synthesisRef.current) {
      // Stop any current speech
      synthesisRef.current.cancel()
      
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = 0.8
      
      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)
      
      synthesisRef.current.speak(utterance)
    }
  }

  const handleSendMessage = async (inputMethod: 'text' | 'voice' = 'text') => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
      inputMethod
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)
    setError('')

    try {
      const response = await processAIQuery(inputValue, campaignData)
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response.content,
        timestamp: new Date(),
        data: response.data,
        inputMethod: inputMethod === 'voice' ? 'voice' : undefined
      }

      setMessages(prev => [...prev, aiMessage])

      // Auto-speak AI responses for voice interactions
      if (inputMethod === 'voice' && synthesisRef.current) {
        speakResponse(response.content)
      }
    } catch (error) {
      console.error('Error processing query:', error)
      setError('Sorry, I encountered an error processing your request. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const processAIQuery = async (query: string, data: MarketingData[]): Promise<{ content: string; data?: any }> => {
    // Check if user is asking for help or prompt guide
    const helpKeywords = ['help', 'what can you do', 'prompt guide', 'examples', 'capabilities', 'guide']
    const isHelpRequest = helpKeywords.some(keyword => 
      query.toLowerCase().includes(keyword.toLowerCase())
    )

    if (isHelpRequest) {
      return {
        content: getPromptGuide()
      }
    }

    try {
      const response = await fetch('/api/ai/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          sessionId,
          data
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('API call failed:', error)
      // Fallback to local processing
      return processLocalQuery(query, data)
    }
  }

  const processLocalQuery = async (query: string, data: MarketingData[]): Promise<{ content: string; data?: any }> => {
    // Simple local processing for basic queries
    const lowerQuery = query.toLowerCase()
    
    if (lowerQuery.includes('total') || lowerQuery.includes('sum')) {
      const totalSpend = data.reduce((sum, item) => sum + (item.metrics.spend || 0), 0)
      const totalRevenue = data.reduce((sum, item) => sum + (item.metrics.revenue || 0), 0)
      const totalImpressions = data.reduce((sum, item) => sum + (item.metrics.impressions || 0), 0)
      
      return {
        content: `📊 Total Metrics:\n• Total Spend: $${totalSpend.toLocaleString()}\n• Total Revenue: $${totalRevenue.toLocaleString()}\n• Total Impressions: ${totalImpressions.toLocaleString()}`,
        data: {
          type: 'summary',
          spend: totalSpend,
          revenue: totalRevenue,
          impressions: totalImpressions
        }
      }
    }
    
    return {
      content: "I'm sorry, I'm having trouble processing that request right now. Please try asking about total spend, revenue, or impressions, or check the help guide for more examples."
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage('text')
    }
  }

  const startNewSession = () => {
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setSessionId(newSessionId)
    setMessages([{
      id: 'welcome',
      type: 'ai',
      content: `New session started! I'm ready to help you analyze your campaign data with ${campaignData.length} records.`,
      timestamp: new Date()
    }])
  }

  const getPromptGuide = () => {
    return `🤖 AI Marketing Data Query Guide

📊 CAMPAIGN PERFORMANCE QUERIES
• What were the top performing campaigns?
• Show me the best campaigns by ROAS
• Which campaigns had the highest CTR?
• List campaigns ranked by performance

🏢 BRAND ANALYTICS
• Brand analytics
• How are my brands performing?
• Show me brand-level metrics
• Which brand has the best ROAS?

🌐 PLATFORM ANALYSIS
• Which platform performed best?
• Show me platform spend breakdown
• What's the ROAS by platform?
• Platform performance comparison

📈 TIME-BASED ANALYSIS
• Show me spend by platform in Q2 2024
• What was performance in June 2024?
• Q1 vs Q2 performance comparison
• Monthly performance breakdown

💰 SPEND & BUDGET OPTIMIZATION
• How should I allocate my budget?
• Spend optimization recommendations
• Budget reallocation strategy
• ROI and ROAS analysis

📊 CHART & VISUALIZATION
• Can I get a chart of this for download?
• Produce a graph of this information
• Show me a chart of campaign performance
• Generate a visualization of platform spend

🎯 STRATEGIC INSIGHTS & OPTIMIZATION
• What can we learn from these campaigns?
• Optimization recommendations
• How can I improve performance?
• Universal optimization recommendations

🎨 CREATIVE & AUDIENCE ANALYSIS
• How did my creatives perform?
• Which creative formats worked best?
• Audience performance breakdown
• Creative optimization recommendations

💡 BEST PRACTICE QUERIES
1. What were the top performing campaigns?
2. Show me platform spend for Q2 2024
3. Can I get a chart of this for download?
4. What can we learn from these campaigns?
5. Optimization recommendations
6. Brand analytics
7. Which platform had the highest ROAS?

💬 NATURAL LANGUAGE EXAMPLES
• I want to understand how my campaigns are doing
• Help me figure out where to put my marketing budget
• What's working and what's not?
• How can I make my campaigns better?
• Give me the highlights of my performance

🎯 TIPS FOR BEST RESULTS
• Be specific: Show me ROAS by platform for Q2 2024
• Use natural language: Which campaigns should I invest more in?
• Ask follow-up questions: Can I get a chart of this?
• Request actionable insights: What should I do differently next time?

I can handle complex queries, maintain conversation context, and provide detailed analysis with charts and actionable recommendations!`
  }

  const getDownloadablePromptGuide = () => {
    return `# 🤖 AI Marketing Data Query Guide

## 📊 CAMPAIGN PERFORMANCE QUERIES
- What were the top performing campaigns?
- Show me the best campaigns by ROAS
- Which campaigns had the highest CTR?
- List campaigns ranked by performance
- What's the average ROAS across all campaigns?
- Which campaign had the most conversions?
- Show me campaign performance by date range

## 🏢 BRAND ANALYTICS
- Brand analytics
- How are my brands performing?
- Show me brand-level metrics
- Which brand has the best ROAS?
- Compare brand performance
- Brand portfolio analysis
- Cross-brand insights

## 🌐 PLATFORM ANALYSIS
- Which platform performed best?
- Show me platform spend breakdown
- What's the ROAS by platform?
- Platform performance comparison
- Which platform had the highest CTR?
- Platform-specific optimization
- Cross-platform analysis

## 📈 TIME-BASED ANALYSIS
- Show me spend by platform in Q2 2024
- What was performance in June 2024?
- Q1 vs Q2 performance comparison
- Monthly performance breakdown
- Year-over-year analysis
- Seasonal performance trends
- Date range specific queries

## 💰 SPEND & BUDGET OPTIMIZATION
- How should I allocate my budget?
- Spend optimization recommendations
- Budget reallocation strategy
- ROI and ROAS analysis
- Cost per acquisition analysis
- Budget efficiency metrics
- Investment recommendations

## 📊 CHART & VISUALIZATION
- Can I get a chart of this for download?
- Produce a graph of this information
- Show me a chart of campaign performance
- Generate a visualization of platform spend
- Create a chart of ROAS trends
- Visualize audience performance
- Download performance charts

## 🎯 STRATEGIC INSIGHTS & OPTIMIZATION
- What can we learn from these campaigns?
- Optimization recommendations
- How can I improve performance?
- Universal optimization recommendations
- Strategic insights and analysis
- Performance improvement suggestions
- Best practices recommendations

## 🎨 CREATIVE & AUDIENCE ANALYSIS
- How did my creatives perform?
- Which creative formats worked best?
- Audience performance breakdown
- Creative optimization recommendations
- Audience targeting analysis
- Creative performance metrics
- Audience optimization

## 💡 BEST PRACTICE QUERIES
1. What were the top performing campaigns?
2. Show me platform spend for Q2 2024
3. Can I get a chart of this for download?
4. What can we learn from these campaigns?
5. Optimization recommendations
6. Brand analytics
7. Which platform had the highest ROAS?
8. How should I allocate my budget?
9. Show me audience performance
10. Creative optimization suggestions

## 💬 NATURAL LANGUAGE EXAMPLES
- I want to understand how my campaigns are doing
- Help me figure out where to put my marketing budget
- What's working and what's not?
- How can I make my campaigns better?
- Give me the highlights of my performance
- Tell me about my best performing campaigns
- What insights can you provide about my data?

## 🎯 TIPS FOR BEST RESULTS
- Be specific: Show me ROAS by platform for Q2 2024
- Use natural language: Which campaigns should I invest more in?
- Ask follow-up questions: Can I get a chart of this?
- Request actionable insights: What should I do differently next time?
- Ask for comparisons: How does this compare to last month?
- Request breakdowns: Break this down by platform
- Ask for recommendations: What should I optimize?

## 🔍 ADVANCED QUERIES
- What anomalies should I be aware of?
- Show me performance by audience segment
- Which creative formats are most effective?
- What's my cost per conversion by platform?
- How does my performance compare to industry benchmarks?
- What seasonal trends do you see in my data?
- Which campaigns should I scale or pause?

## 📋 QUERY TEMPLATES
- Performance: What were the top [X] campaigns by [metric]?
- Comparison: How does [A] compare to [B]?
- Time-based: Show me [metric] for [time period]
- Optimization: What can I optimize for [goal]?
- Visualization: Can I get a chart of [data]?
- Analysis: What insights can you provide about [topic]?

I can handle complex queries, maintain conversation context, and provide detailed analysis with charts and actionable recommendations!`
  }

  const downloadPromptGuide = () => {
    const content = getDownloadablePromptGuide()
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'AI_Marketing_Data_Query_Guide.md'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setShowDownloadModal(false)
  }

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <Bot className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">AI Data Assistant</h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">Session: {sessionId.slice(-8)}</span>
          <button
            onClick={() => setShowHelpModal(true)}
            className="btn-secondary flex items-center space-x-1 text-xs"
            title="Show prompt guide"
          >
            <HelpCircle className="w-3 h-3" />
            <span>Help</span>
          </button>
          <button
            onClick={() => setShowDownloadModal(true)}
            className="btn-secondary flex items-center space-x-1 text-xs"
            title="Download prompt guide"
          >
            <Download className="w-3 h-3" />
            <span>Download</span>
          </button>
          <button
            onClick={startNewSession}
            className="btn-secondary flex items-center space-x-1 text-xs"
          >
            <RefreshCw className="w-3 h-3" />
            <span>New Session</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex items-start space-x-2 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                message.type === 'user' 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {message.type === 'user' ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>
              
              <div className={`rounded-lg px-4 py-2 ${
                message.type === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <div className="ml-2 flex items-center space-x-1">
                    {message.type === 'user' && message.inputMethod && (
                      <div title={message.inputMethod === 'voice' ? 'Voice input' : 'Text input'}>
                        {message.inputMethod === 'voice' ? (
                          <Mic className="w-3 h-3 text-primary-200" />
                        ) : (
                          <MessageSquare className="w-3 h-3 text-primary-200" />
                        )}
                      </div>
                    )}
                    {message.type === 'ai' && message.inputMethod === 'voice' && (
                      <div title="Voice response">
                        <Mic className="w-3 h-3 text-green-600" />
                      </div>
                    )}
                  </div>
                </div>
                
                {message.data && (
                  <div className="mt-2">
                    <DataChart data={message.data} />
                  </div>
                )}
                
                <p className={`text-xs mt-1 ${
                  message.type === 'user' ? 'text-primary-100' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-2">
              <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-gray-100 rounded-lg px-4 py-2">
                <div className="flex items-center space-x-1">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600"></div>
                  <span className="text-sm text-gray-600">Thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 flex-shrink-0">
        <div className="flex space-x-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me about your campaign data..."
            className="flex-1 resize-none input-field"
            rows={1}
            disabled={isLoading}
          />
          {isSupported && (
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={isLoading}
              className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                isListening
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={isListening ? 'Stop listening' : 'Start voice input'}
            >
              {isListening ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>
          )}
          <button
            onClick={() => handleSendMessage('text')}
            disabled={!inputValue.trim() || isLoading}
            className="btn-primary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-500">
            Press Enter to send, Shift+Enter for new line
          </p>
          {error && (
            <p className="text-xs text-red-500">
              {error}
            </p>
          )}
          {isListening && (
            <div className="flex items-center space-x-1 text-xs text-blue-600">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
              <span>Listening...</span>
            </div>
          )}
          {isSpeaking && (
            <div className="flex items-center space-x-1 text-xs text-green-600">
              <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
              <span>Speaking...</span>
            </div>
          )}
        </div>
      </div>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">AI Prompt Guide</h2>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono bg-gray-50 p-4 rounded-lg overflow-x-auto">
                  {getPromptGuide()}
                </pre>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-600">
                You can also ask me directly: help, what can you do, show me examples, or prompt guide
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Download Modal */}
      {showDownloadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Download Prompt Guide</h2>
              <button
                onClick={() => setShowDownloadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Download className="w-8 h-8 text-blue-600" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">AI Marketing Data Query Guide</h3>
                  <p className="text-sm text-gray-600">Comprehensive guide with all query categories and examples</p>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h4 className="font-medium text-gray-900 mb-2">What is included:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Campaign Performance Queries</li>
                  <li>• Brand Analytics</li>
                  <li>• Platform Analysis</li>
                  <li>• Time-based Analysis</li>
                  <li>• Budget Optimization</li>
                  <li>• Chart & Visualization</li>
                  <li>• Strategic Insights</li>
                  <li>• Creative & Audience Analysis</li>
                  <li>• Advanced Queries</li>
                  <li>• Query Templates</li>
                </ul>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDownloadModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={downloadPromptGuide}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Guide</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 
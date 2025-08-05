'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, RefreshCw, MessageSquare, Sparkles, Mic, MicOff, HelpCircle, X, Download, BarChart3, DollarSign, Target, Calendar, TrendingUp, Lightbulb, Users } from 'lucide-react'
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

interface PromptCategory {
  title: string
  description: string
  icon: React.ReactNode
  examples: string[]
  color: string
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
  const [showHelpGuideModal, setShowHelpGuideModal] = useState(false)
  const [showPromptGuide, setShowPromptGuide] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const chatSectionRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const synthesisRef = useRef<any>(null)

  // Comprehensive prompt categories (impressive, unique, and demo-worthy)
  const promptCategories: PromptCategory[] = [
    {
      title: "📈 Executive Summary & Overview",
      description: "Get a comprehensive overview of your marketing performance",
      icon: <BarChart3 className="w-5 h-5" />,
      color: "blue",
      examples: [
        "Give me an executive summary",
        "What is our overall performance?",
        "What are the key metrics?",
        "Show me a summary of our campaigns",
        "What is our performance overview?",
        "Give me a comprehensive summary"
      ]
    },
    {
      title: "💰 Financial Performance",
      description: "Dive into spend, revenue, and ROI metrics",
      icon: <DollarSign className="w-5 h-5" />,
      color: "green",
      examples: [
        "What is our total spend?",
        "What is our total revenue?",
        "What is our ROAS?",
        "What is our revenue?",
        "What is our CPA?",
        "What is our CPC?",
        "What is our CPM?",
        "What is our ROI?",
        "What is our profit margin?",
        "What is our CTR?",
        "What is our total spend?",
        "What is our total revenue?"
      ]
    },
    {
      title: "🏆 Platform Performance",
      description: "Analyze performance by advertising platform",
      icon: <Target className="w-5 h-5" />,
      color: "purple",
      examples: [
        "How is Meta performing?",
        "What is DV360's performance?",
        "Show me Amazon's metrics",
        "What are SA360's results?",
        "How is TradeDesk performing?",
        "Which platform is doing the best?",
        "Compare platform performance",
        "What is the top performing platform?",
        "What is each platform's ROAS?",
        "How is Meta performing?",
        "What is DV360's performance?",
        "Show me Amazon's metrics"
      ]
    },
    {
      title: "📅 Weekly Performance",
      description: "Break down performance by week within June 2024",
      icon: <Calendar className="w-5 h-5" />,
      color: "orange",
      examples: [
        "How did we perform in week 1?",
        "Show me week 2 results",
        "What happened in week 3?",
        "How was week 4?",
        "Compare all weeks",
        "Which week performed best?",
        "What is our weekly trend?",
        "Show me week-by-week performance",
        "Which week had the highest ROAS?",
        "What was our best week?",
        "Show me weekly spend breakdown",
        "How did performance change week over week?"
      ]
    },
    {
      title: "🎯 Campaign Analysis",
      description: "Analyze specific campaigns and their performance",
      icon: <TrendingUp className="w-5 h-5" />,
      color: "red",
      examples: [
        "What is our best campaign?",
        "What is our top campaign?",
        "What is our worst campaign?",
        "Which campaign has the highest ROAS?",
        "Which campaigns should I pause?",
        "Show me campaign rankings",
        "Which campaigns are most efficient?",
        "Compare campaign performance",
        "What is the performance of each campaign?",
        "What is FreshNest Summer Grilling performance?",
        "What is our best campaign?",
        "What is our top campaign?"
      ]
    },
    {
      title: "🔍 Optimization Insights",
      description: "Get recommendations and insights for improvement",
      icon: <Lightbulb className="w-5 h-5" />,
      color: "yellow",
      examples: [
        "What should we optimize?",
        "Give me optimization recommendations",
        "What can we improve?",
        "How can we improve performance?",
        "Where should we put more money?",
        "Give me strategic recommendations",
        "How can we increase ROAS?",
        "What should we optimize?",
        "What should we optimize?",
        "What should we optimize?",
        "What should we optimize?",
        "What should we optimize?"
      ]
    },
    {
      title: "📊 Detailed Analytics",
      description: "Deep dive into specific metrics and trends",
      icon: <BarChart3 className="w-5 h-5" />,
      color: "teal",
      examples: [
        "What is our click-through rate?",
        "How many conversions did we get?",
        "Show me audience performance",
        "How are our creatives performing?",
        "What is our CTR?",
        "What is our audience performance?",
        "What is our creative performance?",
        "What is our click-through rate?",
        "How many conversions did we get?",
        "Show me audience performance",
        "How are our creatives performing?",
        "What is our conversion rate?"
      ]
    },
    {
      title: "🎨 Creative & Audience",
      description: "Analyze creative performance and audience insights",
      icon: <Users className="w-5 h-5" />,
      color: "pink",
      examples: [
        "How did our creatives perform?",
        "Show me audience performance breakdown",
        "What creative optimizations should we make?",
        "Which audience segments performed best?",
        "What audience insights do you have?",
        "Which creative elements drove the most conversions?",
        "Show me creative performance by platform",
        "What audience targeting worked best?",
        "What creative recommendations do you have?",
        "How did our creatives perform?",
        "Show me audience performance",
        "How did our creatives perform?"
      ]
    }
  ]

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

  const handleSendMessage = async (inputMethod: 'text' | 'voice' = 'text', customMessage?: string) => {
    const messageToSend = customMessage || inputValue
    if (!messageToSend.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: messageToSend,
      timestamp: new Date(),
      inputMethod
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)
    setError('')

    try {
      const response = await processAIQuery(messageToSend, campaignData)
      
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
    setShowHelpGuideModal(false)
  }

  const handlePromptClick = async (prompt: string) => {
    // Scroll to the chat section immediately when clicked
    if (chatSectionRef.current) {
      chatSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    
    // Set the input value to the clicked prompt (for visual feedback)
    setInputValue(prompt)
    
    // Submit the prompt automatically with the prompt text directly
    await handleSendMessage('text', prompt)
    
    // Ensure we scroll to the bottom to see the new message as it populates
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
      }
    }, 100)
  }

  const getColorClasses = (color: string) => {
    const colorMap: { [key: string]: string } = {
      blue: 'bg-blue-50 border-blue-200 text-blue-800',
      green: 'bg-green-50 border-green-200 text-green-800',
      purple: 'bg-purple-50 border-purple-200 text-purple-800',
      orange: 'bg-orange-50 border-orange-200 text-orange-800',
      red: 'bg-red-50 border-red-200 text-red-800',
      yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      teal: 'bg-teal-50 border-teal-200 text-teal-800',
      pink: 'bg-pink-50 border-pink-200 text-pink-800'
    }
    return colorMap[color] || 'bg-gray-50 border-gray-200 text-gray-800'
  }

  return (
    <div className="space-y-8">
      {/* AI Chat Section */}
      <div ref={chatSectionRef} className="flex flex-col h-[600px] bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <Bot className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">AI Data Assistant</h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">Session: {sessionId.slice(-8)}</span>
          <button
            onClick={() => setShowHelpGuideModal(true)}
            className="btn-secondary flex items-center space-x-1 text-xs"
            title="Help Guide"
          >
            <HelpCircle className="w-3 h-3" />
            <span>Help Guide</span>
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
      </div>

      {/* Help Guide Modal */}
      {showHelpGuideModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">AI Marketing Data Query Guide</h2>
              <button
                onClick={() => setShowHelpGuideModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {/* Executive Overview */}
              <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-3 mb-4">
                  <HelpCircle className="w-8 h-8 text-blue-600" />
                  <h3 className="text-xl font-semibold text-gray-900">Executive Overview</h3>
                </div>
                <p className="text-gray-700 mb-4">
                  I am your AI marketing data assistant, designed to help you analyze campaign performance, 
                  optimize budgets, and generate actionable insights. I can handle complex queries, maintain 
                  conversation context, and provide detailed analysis with charts and actionable recommendations.
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Key Capabilities:</h4>
                    <ul className="text-gray-600 space-y-1">
                      <li>• Campaign Performance Analysis</li>
                      <li>• Brand & Platform Analytics</li>
                      <li>• Time-based Data Queries</li>
                      <li>• Budget Optimization</li>
                      <li>• Chart & Visualization</li>
                      <li>• Strategic Recommendations</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Best Practices:</h4>
                    <ul className="text-gray-600 space-y-1">
                      <li>• Be specific with time periods</li>
                      <li>• Ask follow-up questions</li>
                      <li>• Request actionable insights</li>
                      <li>• Use natural language</li>
                      <li>• Ask for comparisons</li>
                      <li>• Request visualizations</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Query Categories */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Campaign Performance */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    Campaign Performance
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>• What were the top performing campaigns?</li>
                    <li>• Show me the best campaigns by ROAS</li>
                    <li>• Which campaigns had the highest CTR?</li>
                    <li>• List campaigns ranked by performance</li>
                    <li>• What is the average ROAS across all campaigns?</li>
                  </ul>
                </div>

                {/* Brand Analytics */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Brand Analytics
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>• Brand analytics</li>
                    <li>• How are my brands performing?</li>
                    <li>• Show me brand-level metrics</li>
                    <li>• Which brand has the best ROAS?</li>
                    <li>• Compare brand performance</li>
                  </ul>
                </div>

                {/* Platform Analysis */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                    Platform Analysis
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>• Which platform performed best?</li>
                    <li>• Show me platform spend breakdown</li>
                    <li>• What is the ROAS by platform?</li>
                    <li>• Platform performance comparison</li>
                    <li>• Which platform had the highest CTR?</li>
                  </ul>
                </div>

                {/* Time-based Analysis */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                    Time-based Analysis
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>• Show me spend by platform in Q2 2024</li>
                    <li>• What was performance in June 2024?</li>
                    <li>• Q1 vs Q2 performance comparison</li>
                    <li>• Monthly performance breakdown</li>
                    <li>• Year-over-year analysis</li>
                  </ul>
                </div>

                {/* Budget Optimization */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                    Budget Optimization
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>• How should I allocate my budget?</li>
                    <li>• Spend optimization recommendations</li>
                    <li>• Budget reallocation strategy</li>
                    <li>• ROI and ROAS analysis</li>
                    <li>• Cost per acquisition analysis</li>
                  </ul>
                </div>

                {/* Chart & Visualization */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="w-2 h-2 bg-teal-500 rounded-full mr-2"></span>
                    Chart & Visualization
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>• Can I get a chart of this for download?</li>
                    <li>• Produce a graph of this information</li>
                    <li>• Show me a chart of campaign performance</li>
                    <li>• Generate a visualization of platform spend</li>
                    <li>• Create a chart of ROAS trends</li>
                  </ul>
                </div>

                {/* Strategic Insights */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></span>
                    Strategic Insights
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>• What can we learn from these campaigns?</li>
                    <li>• Optimization recommendations</li>
                    <li>• How can I improve performance?</li>
                    <li>• Universal optimization recommendations</li>
                    <li>• Strategic insights and analysis</li>
                  </ul>
                </div>

                {/* Creative & Audience */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="w-2 h-2 bg-pink-500 rounded-full mr-2"></span>
                    Creative & Audience
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>• How did my creatives perform?</li>
                    <li>• Which creative formats worked best?</li>
                    <li>• Audience performance breakdown</li>
                    <li>• Creative optimization recommendations</li>
                    <li>• Audience targeting analysis</li>
                  </ul>
                </div>
              </div>

              {/* Quick Start Examples */}
              <div className="mt-8 bg-gray-50 p-6 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-4">Quick Start Examples</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Basic Queries:</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• What were the top performing campaigns?</li>
                      <li>• Show me platform spend for Q2 2024</li>
                      <li>• Can I get a chart of this for download?</li>
                      <li>• What can we learn from these campaigns?</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Advanced Queries:</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• What anomalies should I be aware of?</li>
                      <li>• Show me performance by audience segment</li>
                      <li>• Which campaigns should I scale or pause?</li>
                      <li>• How does my performance compare to benchmarks?</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer with Download Option */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  You can also ask me directly: help, what can you do, show me examples, or prompt guide
                </p>
                <button
                  onClick={downloadPromptGuide}
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Full Guide</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Prompt Guide Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            🤖 Clickable Prompt Library
          </h3>
          <p className="text-gray-600">
            Not sure what to ask? Click any question below to get an immediate answer!
          </p>
        </div>

        {/* Prompt Categories */}
        <div className="space-y-6">
          {promptCategories.map((category, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <div className={`p-2 rounded-lg ${getColorClasses(category.color)}`}>
                  {category.icon}
                </div>
                <div className="ml-3">
                  <h4 className="font-semibold text-gray-900">{category.title}</h4>
                  <p className="text-sm text-gray-600">{category.description}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {category.examples.map((example, exampleIndex) => (
                  <button
                    key={exampleIndex}
                    onClick={() => handlePromptClick(example)}
                    disabled={isLoading}
                    className="text-left p-3 bg-white rounded border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm text-gray-700 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={`Click to ask: ${example}`}
                  >
                    &ldquo;{example}&rdquo;
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Tips */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-2">💡 Quick Tips:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Click any question above to get an immediate answer</li>
            <li>• The AI will automatically scroll you back to the chat</li>
            <li>• You can ask follow-up questions after any response</li>
            <li>• All data is from June 2024 - no other time periods available</li>
          </ul>
        </div>
      </div>
    </div>
  )
} 
'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, RefreshCw, MessageSquare, Sparkles, Mic, MicOff } from 'lucide-react'
import { MarketingData } from '@/types'

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
      content: `Hello! I'm your AI marketing data assistant. I can help you analyze your campaign data. Ask me anything about your campaigns, performance metrics, or request specific analysis!`,
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

    // Check if speech synthesis is supported
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
      synthesisRef.current.cancel() // Stop any current speech
      
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = 0.8
      
      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event.error)
        setIsSpeaking(false)
      }
      
      synthesisRef.current.speak(utterance)
    }
  }

  const handleSendMessage = async (inputMethod: 'text' | 'voice' = 'text') => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
      inputMethod
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // Simulate AI processing - in real implementation, this would call your backend
      const aiResponse = await processAIQuery(inputValue, campaignData)
      
      const aiMessage: Message = {
        id: `ai_${Date.now()}`,
        type: 'ai',
        content: aiResponse.content,
        timestamp: new Date(),
        data: aiResponse.data,
        inputMethod: userMessage.inputMethod // Track if this is a voice response
      }

      setMessages(prev => [...prev, aiMessage])
      
      // Only speak the AI response if the user used voice input
      if (userMessage.inputMethod === 'voice') {
        speakResponse(aiResponse.content)
      }
    } catch (error) {
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        type: 'ai',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const processAIQuery = async (query: string, data: MarketingData[]): Promise<{ content: string; data?: any }> => {
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
        })
      })

      if (!response.ok) {
        throw new Error('API request failed')
      }

      const result = await response.json()
      return {
        content: result.content,
        data: result.data
      }
    } catch (error) {
      console.error('AI query error:', error)
      // Fallback to local processing if API fails
      return processLocalQuery(query, data)
    }
  }

  const processLocalQuery = async (query: string, data: MarketingData[]): Promise<{ content: string; data?: any }> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

    const lowerQuery = query.toLowerCase()
    
    // Simple keyword-based responses for demo
    if (lowerQuery.includes('total') && lowerQuery.includes('impression')) {
      const total = data.reduce((sum, item) => sum + item.metrics.impressions, 0)
      return {
        content: `Total impressions across all campaigns: ${total.toLocaleString()}`,
        data: { metric: 'impressions', value: total, type: 'total' }
      }
    }
    
    if (lowerQuery.includes('total') && lowerQuery.includes('spend')) {
      const total = data.reduce((sum, item) => sum + item.metrics.spend, 0)
      return {
        content: `Total spend across all campaigns: $${total.toLocaleString()}`,
        data: { metric: 'spend', value: total, type: 'total' }
      }
    }
    
    if (lowerQuery.includes('best') && lowerQuery.includes('campaign')) {
      const bestCampaign = data.reduce((best, current) => 
        current.metrics.roas > best.metrics.roas ? current : best
      )
      return {
        content: `The best performing campaign by ROAS is "${bestCampaign.dimensions.campaign}" with a ROAS of ${bestCampaign.metrics.roas.toFixed(2)}x`,
        data: { campaign: bestCampaign, type: 'best_performer' }
      }
    }
    
    if (lowerQuery.includes('average') && lowerQuery.includes('ctr')) {
      const avgCTR = data.reduce((sum, item) => sum + item.metrics.ctr, 0) / data.length
      return {
        content: `Average CTR across all campaigns: ${(avgCTR * 100).toFixed(2)}%`,
        data: { metric: 'ctr', value: avgCTR, type: 'average' }
      }
    }
    
    if (lowerQuery.includes('campaign') && lowerQuery.includes('list')) {
      const campaigns = Array.from(new Set(data.map(item => item.dimensions.campaign)))
      return {
        content: `Here are all the campaigns in your data:\n${campaigns.map(c => `• ${c}`).join('\n')}`,
        data: { campaigns, type: 'list' }
      }
    }

    // Default response
    return {
      content: `I understand you're asking about "${query}". I can help you analyze your campaign data. Try asking about total impressions, spend, best performing campaigns, average CTR, or list all campaigns. I can also help with specific calculations and comparisons.`
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
                  <div className="mt-2 p-2 bg-white bg-opacity-20 rounded text-xs">
                    <Sparkles className="w-3 h-3 inline mr-1" />
                    Data available for visualization
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
  )
} 
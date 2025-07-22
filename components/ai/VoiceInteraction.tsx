'use client'

import React, { useState, useRef, useEffect } from 'react'

interface VoiceInteractionProps {
  onQuerySubmit: (query: string) => void
  isProcessing?: boolean
  lastResponse?: string
}

export default function VoiceInteraction({ onQuerySubmit, isProcessing, lastResponse }: VoiceInteractionProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState('')
  const [isSupported, setIsSupported] = useState(false)
  const [useOpenAITTS, setUseOpenAITTS] = useState(false)
  const [selectedVoice, setSelectedVoice] = useState('alloy')
  
  const recognitionRef = useRef<any>(null)
  const synthesisRef = useRef<any>(null)

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
        setTranscript(transcript)
        onQuerySubmit(transcript)
        stopListening()
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
  }, [onQuerySubmit])

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

  const speakResponse = async (text: string) => {
    if (useOpenAITTS) {
      // Use OpenAI TTS
      try {
        setIsSpeaking(true)
        const response = await fetch('/api/voice/tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text, voice: selectedVoice }),
        })

        if (response.ok) {
          const audioBlob = await response.blob()
          const audioUrl = URL.createObjectURL(audioBlob)
          const audio = new Audio(audioUrl)
          audio.onended = () => {
            setIsSpeaking(false)
            URL.revokeObjectURL(audioUrl)
          }
          audio.play()
        } else {
          // Fallback to browser TTS
          speakWithBrowser(text)
        }
      } catch (error) {
        console.error('OpenAI TTS error:', error)
        speakWithBrowser(text)
      }
    } else {
      speakWithBrowser(text)
    }
  }

  const speakWithBrowser = (text: string) => {
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

  useEffect(() => {
    if (lastResponse && !isProcessing) {
      speakResponse(lastResponse)
    }
  }, [lastResponse, isProcessing])

  if (!isSupported) {
    return (
      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800 text-sm">
          Voice interaction is not supported in your browser. Please use Chrome or Edge.
        </p>
      </div>
    )
  }

  return (
    <div className="mb-6 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">🎤 Voice Interaction</h3>
      
      {/* Voice Controls */}
      <div className="flex items-center space-x-4 mb-4">
        <button
          onClick={isListening ? stopListening : startListening}
          disabled={isProcessing}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            isListening
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isListening ? (
            <>
              <span className="w-4 h-4 bg-white rounded-full animate-pulse"></span>
              <span>Stop Listening</span>
            </>
          ) : (
            <>
              <span className="w-4 h-4 bg-white rounded-full"></span>
              <span>Start Listening</span>
            </>
          )}
        </button>

        {isSpeaking && (
          <div className="flex items-center space-x-2 text-blue-600">
            <span className="w-4 h-4 bg-blue-600 rounded-full animate-pulse"></span>
            <span className="text-sm">Speaking...</span>
          </div>
        )}

        {isProcessing && (
          <div className="flex items-center space-x-2 text-gray-600">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
            <span className="text-sm">Processing...</span>
          </div>
        )}
      </div>

      {/* Transcript Display */}
      {transcript && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded">
          <p className="text-sm text-gray-700">
            <strong>You said:</strong> "{transcript}"
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Voice Settings */}
      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Voice Settings</h4>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="useOpenAITTS"
              checked={useOpenAITTS}
              onChange={(e) => setUseOpenAITTS(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="useOpenAITTS" className="text-sm text-gray-700">
              Use OpenAI TTS (higher quality)
            </label>
          </div>
          
          {useOpenAITTS && (
            <div className="ml-6">
              <label htmlFor="voiceSelect" className="block text-sm text-gray-700 mb-1">
                Voice:
              </label>
              <select
                id="voiceSelect"
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="alloy">Alloy</option>
                <option value="echo">Echo</option>
                <option value="fable">Fable</option>
                <option value="onyx">Onyx</option>
                <option value="nova">Nova</option>
                <option value="shimmer">Shimmer</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Voice Commands</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• "What's my average CTR?"</li>
          <li>• "Show me top campaigns by ROAS"</li>
          <li>• "How much did I spend on Meta?"</li>
          <li>• "Compare platforms by performance"</li>
        </ul>
      </div>
    </div>
  )
} 
// Environment Configuration
// This file centralizes all environment variables and provides type-safe access

export const config = {
  // OpenAI Configuration
  openai: {
    apiKey: '', // TEMPORARILY DISABLED FOR TESTING
    model: process.env.OPENAI_MODEL || 'gpt-4',
  },
  
  // App Configuration
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    environment: process.env.NODE_ENV || 'development',
  },
  
  // Feature Flags
  features: {
    aiAnalysis: process.env.ENABLE_AI_ANALYSIS === 'true',
    openaiIntegration: process.env.ENABLE_OPENAI_INTEGRATION === 'true',
    firebaseIntegration: process.env.ENABLE_FIREBASE_INTEGRATION === 'true',
    analytics: process.env.ENABLE_ANALYTICS === 'true',
  },
  
  // Debug Configuration
  debug: {
    enabled: process.env.DEBUG === 'true',
    logLevel: process.env.LOG_LEVEL || 'info',
  },
  
  // NextAuth Configuration (if needed later)
  auth: {
    secret: process.env.NEXTAUTH_SECRET || '',
    url: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  }
}

// Validation
if (!config.openai.apiKey) {
  console.warn('⚠️  OPENAI_API_KEY is not set. AI features will not work.')
}

export default config

// Helper functions for common checks
export const isDevelopment = config.app.environment === 'development'
export const isProduction = config.app.environment === 'production'
export const isTest = config.app.environment === 'test'

// Feature flag helpers
export const isAIAnalysisEnabled = config.features.aiAnalysis
export const isFirebaseEnabled = config.features.firebaseIntegration
export const isOpenAIEnabled = config.features.openaiIntegration
export const isAnalyticsEnabled = config.features.analytics

// API key helpers
export const hasOpenAI = !!config.openai.apiKey

// Development helpers
export const isDebugEnabled = config.debug.enabled
export const getLogLevel = config.debug.logLevel 
#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const envPath = path.join(process.cwd(), '.env.local')

console.log('🚀 Marketing Data Query App - Environment Setup')
console.log('==============================================\n')

// Check if .env.local already exists
if (fs.existsSync(envPath)) {
  console.log('⚠️  .env.local already exists!')
  rl.question('Do you want to overwrite it? (y/N): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      setupEnvironment()
    } else {
      console.log('Setup cancelled.')
      rl.close()
    }
  })
} else {
  setupEnvironment()
}

function setupEnvironment() {
  console.log('\n📝 Setting up environment variables...\n')
  
  const envContent = `# Marketing Data Query App Environment Variables

# Development Environment (Cursor/Local)
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3001

# Database Configuration (Local Development)
DATABASE_URL=postgresql://username:password@localhost:5432/marketing_data

# API Keys (Development - replace with actual keys)
# Note: Publisher APIs removed - focusing on Firebase and OpenAI only

# OpenAI Configuration (Development)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4

# Firebase Configuration (Development)
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY_ID=your_firebase_private_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nYour private key here\\n-----END PRIVATE KEY-----\\n"
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_CLIENT_ID=your_firebase_client_id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=your_firebase_client_cert_url

# Authentication (Development)
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3001

# External Services (Development)
REDIS_URL=redis://localhost:6379

# Feature Flags (Development)
ENABLE_AI_ANALYSIS=true
ENABLE_FIREBASE_INTEGRATION=false
ENABLE_OPENAI_INTEGRATION=false
ENABLE_ANALYTICS=true

# Development Settings
DEBUG=true
LOG_LEVEL=debug
`

  fs.writeFileSync(envPath, envContent)
  
  console.log('✅ Environment file created successfully!')
  console.log('\n📋 Next steps:')
  console.log('1. Edit .env.local with your actual API keys')
  console.log('2. For production, set these variables in Vercel dashboard')
  console.log('3. Never commit .env.local to version control')
  console.log('\n🔧 Required variables for basic functionality:')
  console.log('   - NEXT_PUBLIC_APP_URL')
  console.log('   - NEXTAUTH_SECRET')
  console.log('   - NEXTAUTH_URL')
  console.log('\n🔑 Optional variables (enable features when added):')
console.log('   - OPENAI_API_KEY (for AI analysis)')
console.log('   - FIREBASE_* (for Firebase integration)')
  
  rl.close()
} 
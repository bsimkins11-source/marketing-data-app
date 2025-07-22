# 🚀 Vercel Deployment Guide

## Prerequisites
- Vercel account
- GitHub repository with your code
- OpenAI API key

## Step 1: Prepare Your Repository

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Ensure these files are included:**
   - `package.json`
   - `next.config.js`
   - `vercel.json`
   - `sample-campaign-data.csv`
   - All source code files

## Step 2: Deploy to Vercel

1. **Connect Repository:**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Select the repository

2. **Configure Project:**
   - Framework Preset: Next.js
   - Root Directory: `./` (default)
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)

## Step 3: Set Environment Variables

**⚠️ CRITICAL: Set these in Vercel Dashboard**

1. Go to your project settings in Vercel
2. Navigate to "Environment Variables"
3. Add the following variables:

### **Required Variables:**
```
OPENAI_API_KEY=sk-proj-your-actual-api-key-here
NODE_ENV=production
```

### **Optional Variables:**
```
OPENAI_MODEL=gpt-4
NEXT_PUBLIC_APP_URL=https://your-app-name.vercel.app
ENABLE_AI_ANALYSIS=true
ENABLE_OPENAI_INTEGRATION=true
ENABLE_ANALYTICS=true
DEBUG=false
LOG_LEVEL=info
```

## Step 4: Deploy

1. Click "Deploy"
2. Wait for build to complete
3. Your app will be available at `https://your-app-name.vercel.app`

## Step 5: Verify Deployment

1. **Test AI Features:**
   - Navigate to `/ai-analysis`
   - Try asking a question
   - Verify AI responses work

2. **Test Data Loading:**
   - Check `/dashboard`
   - Verify CSV data loads correctly

3. **Test Query Builder:**
   - Navigate to `/dashboard`
   - Test the Query Builder functionality

## Troubleshooting

### **Common Issues:**

1. **"OpenAI API error: 401"**
   - Check if `OPENAI_API_KEY` is set correctly in Vercel
   - Verify the API key is valid and has credits

2. **"Cannot read CSV file"**
   - Ensure `sample-campaign-data.csv` is in the root directory
   - Check file permissions

3. **Build Failures**
   - Check Vercel build logs
   - Ensure all dependencies are in `package.json`

### **Environment Variable Debugging:**
- Add temporary console.log in your API routes to verify variables are loaded
- Check Vercel function logs for any missing variables

## Security Notes

- ✅ Environment variables in Vercel are encrypted
- ✅ API keys are not exposed in client-side code
- ✅ CSV data is bundled with the deployment
- ⚠️ Never commit `.env.local` to Git
- ⚠️ Use different API keys for development and production

## Next Steps

After successful deployment:
1. Set up a custom domain (optional)
2. Configure analytics (if needed)
3. Set up monitoring and alerts
4. Consider moving to Firebase for production data storage 
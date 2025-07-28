# Marketing Data Query App

A modern Next.js application for querying and analyzing marketing campaign data with AI-powered insights.

## Description

This project is a comprehensive marketing data query application built with Next.js, TypeScript, and Tailwind CSS. It provides a powerful dashboard for analyzing marketing campaign data with natural language querying capabilities powered by OpenAI.

## Features

- 📊 **CSV Data Integration**: Load and analyze marketing campaign data from CSV files
- 🤖 **AI-Powered Queries**: Natural language querying with OpenAI integration
- 🎤 **Voice Interaction**: Voice-to-text and text-to-speech capabilities
- 📈 **Interactive Dashboard**: Real-time metrics and visualizations
- 🔍 **Query Builder**: Advanced filtering and data exploration tools
- 📱 **Responsive Design**: Works seamlessly across all devices
- 🎯 **Performance Analytics**: CTR, ROAS, CPA, and other key metrics

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Charts**: Recharts
- **AI**: OpenAI API
- **Voice**: Web Speech API + OpenAI TTS

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git
- OpenAI API key (optional, for AI features)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd maketing-data-query
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
npm run setup-env
# Edit .env.local with your OpenAI API key for AI features
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3001](http://localhost:3001) in your browser.

## Usage

### Dashboard
- View aggregated campaign metrics
- Explore data visualizations
- Use the Query Builder for custom analysis

### AI Analysis
- Ask natural language questions about your data
- Get instant insights and calculations
- Use voice input for hands-free interaction

### Data Format
The application expects CSV files with the following columns:
- `campaign_name`, `platform`, `impressions`, `clicks`, `conversions`
- `spend`, `revenue`, `ctr`, `cpc`, `cpm`, `cpa`, `roas`
- `date`, `ad_group_name`, `keyword`, etc.

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── ai-analysis/       # AI query interface
│   ├── dashboard/         # Dashboard page
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── ai/               # AI conversation components
│   ├── dashboard/        # Dashboard components
│   └── SharedHeader.tsx  # Shared header component
├── lib/                  # Utility functions
│   ├── server-data-service.ts  # Data loading and processing
│   ├── config.ts         # Configuration
│   └── utils.ts          # Utility functions
├── types/                # TypeScript type definitions
└── sample-campaign-data.csv  # Sample data file
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm run setup-env` - Set up environment variables

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Commit and push to your branch
6. Create a pull request

## License

MIT License

## Contact

[To be added] # Deployment trigger - Mon Jul 28 16:04:15 CDT 2025

#!/usr/bin/env python3
"""
Comprehensive QA Test for Prompt Guide Questions
Tests all questions in the prompt guide to ensure they return proper responses
"""

import requests
import json
import time
from typing import List, Dict, Any

# API endpoint
API_URL = "https://marketing-data-app.vercel.app/api/ai/query"

# All prompt guide questions organized by category
PROMPT_QUESTIONS = {
    "Executive Summary & Overview": [
        "Give me an executive summary",
        "What is our overall performance?",
        "What are the key metrics?",
        "Give me an executive summary",
        "What is our overall performance?",
        "What are the key metrics?"
    ],
    "Financial Performance": [
        "What is our total spend?",
        "What is our total revenue?",
        "What is our ROAS?",
        "What is our revenue?",
        "What is our cost per acquisition?",
        "What is our CPA?",
        "What is our cost per click?",
        "What is our CPM?",
        "What is our return on investment?",
        "What is our ROI?",
        "What is our profit margin?",
        "What is our total spend?"
    ],
    "Platform Performance": [
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
    ],
    "Weekly Performance": [
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
    ],
    "Campaign Analysis": [
        "What is our best campaign?",
        "What is our top campaign?",
        "What is our worst campaign?",
        "Which campaign has the highest ROAS?",
        "Which campaigns should I pause?",
        "Show me campaign rankings",
        "Which campaigns are most efficient?",
        "Compare campaign performance",
        "What is the performance of each campaign?",
        "What is our best campaign?",
        "What is our top campaign?",
        "What is our best campaign?"
    ],
    "Optimization Insights": [
        "What should we optimize?",
        "Give me optimization recommendations",
        "What can we improve?",
        "What are our opportunities?",
        "How can we improve performance?",
        "Where should we put more money?",
        "What optimization opportunities exist?",
        "What should I focus on improving?",
        "Give me strategic recommendations",
        "What are the biggest opportunities?",
        "How can we increase ROAS?",
        "What should we optimize?"
    ],
    "Detailed Analytics": [
        "What is our click-through rate?",
        "How many conversions did we get?",
        "Show me audience performance",
        "How are our creatives performing?",
        "What is our CTR?",
        "What is our conversion rate?",
        "What is our audience performance?",
        "What is our creative performance?",
        "What is our click-through rate?",
        "How many conversions did we get?",
        "Show me audience performance",
        "How are our creatives performing?"
    ],
    "Creative & Audience": [
        "How did our creatives perform?",
        "Which creative formats worked best?",
        "Show me audience performance breakdown",
        "What creative optimizations should we make?",
        "Which audience segments performed best?",
        "What audience insights do you have?",
        "Which creative elements drove the most conversions?",
        "Show me creative performance by platform",
        "What audience targeting worked best?",
        "What creative recommendations do you have?",
        "How did our creatives perform?",
        "Show me audience performance"
    ]
}

def test_single_query(query: str, session_id: str = None) -> Dict[str, Any]:
    """Test a single query and return the response"""
    if session_id is None:
        session_id = f"qa_test_{int(time.time())}"
    
    payload = {
        "query": query,
        "sessionId": session_id
    }
    
    try:
        response = requests.post(API_URL, json=payload, timeout=30)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        return {"error": str(e), "query": query}

def is_generic_response(response: Dict[str, Any]) -> bool:
    """Check if response is generic (not specific to the query)"""
    if "error" in response:
        return True
    
    content = response.get("content", "").lower()
    
    # Generic response indicators
    generic_phrases = [
        "i understand you're asking about",
        "i can help you analyze your campaign data",
        "try asking about:",
        "platform performance (e.g.,",
        "campaign metrics (e.g.,",
        "financial metrics (e.g.,",
        "comparative analysis (e.g.,",
        "executive summary (e.g.,",
        "optimization insights (e.g.,"
    ]
    
    return any(phrase in content for phrase in generic_phrases)

def analyze_response_quality(response: Dict[str, Any], query: str) -> Dict[str, Any]:
    """Analyze the quality of a response"""
    if "error" in response:
        return {
            "status": "ERROR",
            "error": response["error"],
            "query": query
        }
    
    content = response.get("content", "")
    data_type = response.get("data", {}).get("type", "unknown")
    
    # Check if it's a generic response
    if is_generic_response(response):
        return {
            "status": "GENERIC",
            "data_type": data_type,
            "content_preview": content[:100] + "..." if len(content) > 100 else content,
            "query": query
        }
    
    # Check for specific data types that indicate good responses
    good_data_types = [
        "executive_summary", "financial_summary", "roas_summary", "cpa_summary",
        "platform_performance", "platform_comparison", "campaign_performance",
        "weekly_performance", "optimization_insights", "anomaly_detection",
        "time_context", "chart_request"
    ]
    
    if data_type in good_data_types:
        return {
            "status": "GOOD",
            "data_type": data_type,
            "content_preview": content[:100] + "..." if len(content) > 100 else content,
            "query": query
        }
    
    # Check content for specific indicators
    specific_indicators = [
        "$", "spend", "revenue", "roas", "cpa", "ctr", "impressions", "clicks", "conversions",
        "meta", "amazon", "dv360", "cm360", "sa360", "tradedesk",
        "freshnest", "summer grilling", "back to school", "holiday recipes", "pantry staples",
        "week 1", "week 2", "week 3", "week 4", "june 2024",
        "optimize", "recommendations", "opportunities", "improve"
    ]
    
    content_lower = content.lower()
    has_specific_data = any(indicator in content_lower for indicator in specific_indicators)
    
    if has_specific_data:
        return {
            "status": "GOOD",
            "data_type": data_type,
            "content_preview": content[:100] + "..." if len(content) > 100 else content,
            "query": query
        }
    
    return {
        "status": "UNKNOWN",
        "data_type": data_type,
        "content_preview": content[:100] + "..." if len(content) > 100 else content,
        "query": query
    }

def run_comprehensive_qa():
    """Run comprehensive QA on all prompt guide questions"""
    print("🚀 Starting Comprehensive QA Test for Prompt Guide Questions")
    print("=" * 80)
    
    session_id = f"qa_comprehensive_{int(time.time())}"
    results = {}
    summary = {
        "total_questions": 0,
        "good_responses": 0,
        "generic_responses": 0,
        "error_responses": 0,
        "unknown": 0
    }
    
    for category, questions in PROMPT_QUESTIONS.items():
        print(f"\n📋 Testing Category: {category}")
        print("-" * 50)
        
        category_results = []
        
        for i, question in enumerate(questions, 1):
            print(f"  {i:2d}. Testing: {question}")
            
            # Test the query
            response = test_single_query(question, session_id)
            analysis = analyze_response_quality(response, question)
            category_results.append(analysis)
            
            # Update summary
            summary["total_questions"] += 1
            status_key = analysis["status"].lower() + "_responses"
            if status_key in summary:
                summary[status_key] += 1
            else:
                summary["unknown"] += 1
            
            # Print result
            status_emoji = {
                "GOOD": "✅",
                "GENERIC": "❌",
                "ERROR": "💥",
                "UNKNOWN": "❓"
            }
            print(f"      {status_emoji.get(analysis['status'], '❓')} {analysis['status']}")
            
            # Add delay to avoid rate limiting
            time.sleep(1)
        
        results[category] = category_results
    
    # Print comprehensive summary
    print("\n" + "=" * 80)
    print("📊 COMPREHENSIVE QA RESULTS")
    print("=" * 80)
    
    print(f"Total Questions Tested: {summary['total_questions']}")
    print(f"✅ Good Responses: {summary['good_responses']} ({summary['good_responses']/summary['total_questions']*100:.1f}%)")
    print(f"❌ Generic Responses: {summary['generic_responses']} ({summary['generic_responses']/summary['total_questions']*100:.1f}%)")
    print(f"💥 Errors: {summary['error_responses']} ({summary['error_responses']/summary['total_questions']*100:.1f}%)")
    print(f"❓ Unknown: {summary['unknown']} ({summary['unknown']/summary['total_questions']*100:.1f}%)")
    
    # Detailed breakdown by category
    print("\n📈 BREAKDOWN BY CATEGORY:")
    print("-" * 50)
    
    for category, category_results in results.items():
        category_good = sum(1 for r in category_results if r["status"] == "GOOD")
        category_total = len(category_results)
        success_rate = category_good / category_total * 100
        
        print(f"{category}: {category_good}/{category_total} ({success_rate:.1f}%)")
    
    # List problematic questions
    print("\n🚨 PROBLEMATIC QUESTIONS (Generic/Error/Unknown):")
    print("-" * 50)
    
    for category, category_results in results.items():
        problematic = [r for r in category_results if r["status"] != "GOOD"]
        if problematic:
            print(f"\n{category}:")
            for result in problematic:
                print(f"  ❌ {result['query']}")
                print(f"     Status: {result['status']}")
                if "content_preview" in result:
                    print(f"     Response: {result['content_preview']}")
                print()
    
    # Save detailed results to file
    with open("qa_prompt_guide_results.json", "w") as f:
        json.dump({
            "summary": summary,
            "detailed_results": results,
            "timestamp": time.time()
        }, f, indent=2)
    
    print(f"\n💾 Detailed results saved to: qa_prompt_guide_results.json")
    
    # Overall assessment
    success_rate = summary['good_responses'] / summary['total_questions'] * 100
    print(f"\n🎯 OVERALL SUCCESS RATE: {success_rate:.1f}%")
    
    if success_rate >= 90:
        print("🎉 EXCELLENT! Most questions are working properly.")
    elif success_rate >= 75:
        print("👍 GOOD! Most questions work, but some need attention.")
    elif success_rate >= 50:
        print("⚠️  FAIR! Many questions need fixes.")
    else:
        print("🚨 POOR! Most questions need significant work.")
    
    return results, summary

if __name__ == "__main__":
    run_comprehensive_qa() 
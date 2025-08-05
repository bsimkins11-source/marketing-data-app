#!/usr/bin/env python3
"""
Comprehensive QA Test for All Prompt Guide Questions
Tests if all questions return unique, specific responses rather than generic confirmations
"""

import requests
import json
import time
from typing import Dict, List, Tuple
from collections import defaultdict

# API endpoint
API_URL = "http://localhost:3000/api/ai/query"

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
        "What is FreshNest Summer Grilling performance?",
        "What is our best campaign?",
        "What is our top campaign?"
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

def test_query(query: str) -> Tuple[str, str, str]:
    """Test a single query and return status, response, and analysis"""
    
    payload = {
        "query": query,
        "sessionId": f"test_session_{int(time.time())}",
        "data": []  # The API will load sample data
    }
    
    try:
        response = requests.post(API_URL, json=payload, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            content = result.get('content', '')
            
            # Analyze the response
            if not content or content.strip() == '':
                return "ERROR", content, "Empty response"
            
            # Check for generic responses
            generic_indicators = [
                "I understand you're asking about",
                "I can help you analyze your campaign data",
                "Try asking about",
                "• Platform performance",
                "• Campaign metrics",
                "• Financial metrics",
                "• Comparative analysis",
                "• Executive summary",
                "• Optimization insights"
            ]
            
            is_generic = any(indicator in content for indicator in generic_indicators)
            
            if is_generic:
                return "GENERIC", content, "Generic response detected"
            else:
                # Check if it's a specific response based on category
                category_indicators = {
                    "Executive Summary": ["executive", "summary", "overview", "key metrics", "performance"],
                    "Financial": ["spend", "revenue", "roas", "cpa", "cpc", "cpm", "roi", "profit"],
                    "Platform": ["meta", "dv360", "amazon", "sa360", "tradedesk", "platform"],
                    "Weekly": ["week", "weekly", "trend", "breakdown"],
                    "Campaign": ["campaign", "freshnest", "best", "worst", "ranking"],
                    "Optimization": ["optimize", "improve", "opportunity", "recommendation", "strategy"],
                    "Analytics": ["ctr", "conversion", "audience", "creative", "performance"],
                    "Creative": ["creative", "audience", "format", "segment", "targeting", "recommendation"]
                }
                
                # Determine which category this query belongs to
                query_lower = query.lower()
                matched_category = None
                for category, indicators in category_indicators.items():
                    if any(indicator in query_lower for indicator in indicators):
                        matched_category = category
                        break
                
                if matched_category:
                    # Check if response has relevant content for that category
                    has_relevant_content = any(indicator in content.lower() for indicator in category_indicators[matched_category])
                    if has_relevant_content:
                        return "GOOD", content, f"Specific {matched_category} response"
                    else:
                        return "UNKNOWN", content, f"Response doesn't match {matched_category} indicators"
                else:
                    return "UNKNOWN", content, "Could not determine category"
                    
        else:
            return "ERROR", f"HTTP {response.status_code}", f"API error: {response.text}"
            
    except Exception as e:
        return "ERROR", str(e), f"Exception: {type(e).__name__}"

def analyze_response_uniqueness(responses: List[str]) -> Dict:
    """Analyze if responses are unique or repetitive"""
    
    # Normalize responses for comparison
    normalized_responses = []
    for resp in responses:
        # Remove common prefixes and normalize
        cleaned = resp.strip()
        # Remove emoji prefixes
        if cleaned.startswith("🎨") or cleaned.startswith("📊") or cleaned.startswith("💰") or cleaned.startswith("🏆") or cleaned.startswith("🎯") or cleaned.startswith("💡") or cleaned.startswith("👥") or cleaned.startswith("📈"):
            cleaned = cleaned[1:].strip()
        # Remove common headers
        for header in ["EXECUTIVE SUMMARY", "FINANCIAL PERFORMANCE", "PLATFORM PERFORMANCE", "WEEKLY PERFORMANCE", "CAMPAIGN ANALYSIS", "OPTIMIZATION INSIGHTS", "DETAILED ANALYTICS", "CREATIVE", "AUDIENCE"]:
            if cleaned.upper().startswith(header):
                cleaned = cleaned[len(header):].strip()
        
        normalized_responses.append(cleaned.lower())
    
    # Count unique responses
    unique_responses = set(normalized_responses)
    uniqueness_ratio = len(unique_responses) / len(normalized_responses) if normalized_responses else 0
    
    # Find duplicates
    duplicates = []
    seen = {}
    for i, resp in enumerate(normalized_responses):
        if resp in seen:
            duplicates.append((seen[resp], i))
        else:
            seen[resp] = i
    
    return {
        "total_responses": len(responses),
        "unique_responses": len(unique_responses),
        "uniqueness_ratio": uniqueness_ratio,
        "duplicate_pairs": duplicates
    }

def main():
    print("🔍 COMPREHENSIVE UNIQUENESS QA TEST")
    print("=" * 60)
    print()
    
    all_results = {}
    all_responses = []
    
    for category, questions in PROMPT_QUESTIONS.items():
        print(f"📋 Testing Category: {category}")
        print("-" * 50)
        
        category_results = []
        category_responses = []
        
        for i, question in enumerate(questions, 1):
            print(f"  {i}. Testing: {question}")
            
            status, response, analysis = test_query(question)
            category_results.append({
                "question": question,
                "status": status,
                "response": response[:200] + "..." if len(response) > 200 else response,
                "analysis": analysis
            })
            category_responses.append(response)
            all_responses.append(response)
            
            print(f"      Status: {status}")
            print(f"      Analysis: {analysis}")
            print(f"      Response: {response[:100]}...")
            print()
            
            # Small delay between requests
            time.sleep(0.5)
        
        all_results[category] = category_results
        
        # Category summary
        status_counts = {}
        for result in category_results:
            status = result["status"]
            status_counts[status] = status_counts.get(status, 0) + 1
        
        print(f"📊 {category} Summary:")
        for status, count in status_counts.items():
            print(f"  {status}: {count} ({count/len(category_results)*100:.1f}%)")
        print()
    
    # Overall uniqueness analysis
    uniqueness_analysis = analyze_response_uniqueness(all_responses)
    
    # Print comprehensive results
    print("📊 COMPREHENSIVE QA RESULTS")
    print("=" * 60)
    
    total_questions = sum(len(questions) for questions in PROMPT_QUESTIONS.values())
    print(f"Total Questions Tested: {total_questions}")
    
    # Overall status counts
    overall_status_counts = defaultdict(int)
    for category_results in all_results.values():
        for result in category_results:
            overall_status_counts[result["status"]] += 1
    
    print("\n🎯 OVERALL STATUS BREAKDOWN:")
    for status, count in overall_status_counts.items():
        print(f"  {status}: {count} ({count/total_questions*100:.1f}%)")
    
    print()
    print("🔄 RESPONSE UNIQUENESS ANALYSIS:")
    print(f"  Total Responses: {uniqueness_analysis['total_responses']}")
    print(f"  Unique Responses: {uniqueness_analysis['unique_responses']}")
    print(f"  Uniqueness Ratio: {uniqueness_analysis['uniqueness_ratio']:.2%}")
    
    if uniqueness_analysis['duplicate_pairs']:
        print(f"  Duplicate Response Pairs: {len(uniqueness_analysis['duplicate_pairs'])}")
        print("  Duplicate questions:")
        question_index = 0
        for category, questions in PROMPT_QUESTIONS.items():
            for i, question in enumerate(questions):
                for dup1, dup2 in uniqueness_analysis['duplicate_pairs']:
                    if dup1 == question_index or dup2 == question_index:
                        print(f"    - {category}: {question}")
                question_index += 1
    
    print()
    print("📈 CATEGORY BREAKDOWN:")
    for category, results in all_results.items():
        status_counts = {}
        for result in results:
            status = result["status"]
            status_counts[status] = status_counts.get(status, 0) + 1
        
        print(f"\n{category}:")
        for status, count in status_counts.items():
            print(f"  {status}: {count} ({count/len(results)*100:.1f}%)")
    
    print()
    print("🚨 PROBLEMATIC QUESTIONS (Generic/Error/Unknown):")
    print("-" * 60)
    
    for category, results in all_results.items():
        problematic = [r for r in results if r["status"] in ["GENERIC", "ERROR", "UNKNOWN"]]
        if problematic:
            print(f"\n{category}:")
            for result in problematic:
                print(f"  ❌ {result['question']}")
                print(f"     Status: {result['status']}")
                print(f"     Analysis: {result['analysis']}")
                print(f"     Response: {result['response']}")
                print()
    
    # Save detailed results
    with open('qa_comprehensive_uniqueness_results.json', 'w') as f:
        json.dump({
            "summary": {
                "total_questions": total_questions,
                "overall_status_counts": dict(overall_status_counts),
                "uniqueness_analysis": uniqueness_analysis
            },
            "category_results": all_results
        }, f, indent=2)
    
    print(f"💾 Detailed results saved to: qa_comprehensive_uniqueness_results.json")

if __name__ == "__main__":
    main() 
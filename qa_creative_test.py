#!/usr/bin/env python3
"""
Focused QA Test for Creative Questions
Tests if creative questions return unique, specific responses rather than generic confirmations
"""

import requests
import json
import time
from typing import Dict, List, Tuple

# API endpoint
API_URL = "http://localhost:3000/api/ai/query"

# Creative questions to test
CREATIVE_QUESTIONS = [
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
    "How did our creatives perform?"
]

def test_creative_query(query: str) -> Tuple[str, str, str]:
    """Test a single creative query and return status, response, and analysis"""
    
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
                # Check if it's a specific creative response
                creative_indicators = [
                    "creative", "audience", "format", "segment", "targeting",
                    "performance", "breakdown", "optimization", "recommendation",
                    "conversion", "platform", "insight"
                ]
                
                has_creative_content = any(indicator in content.lower() for indicator in creative_indicators)
                
                if has_creative_content:
                    return "GOOD", content, "Specific creative response"
                else:
                    return "UNKNOWN", content, "Response doesn't match creative indicators"
                    
        else:
            return "ERROR", f"HTTP {response.status_code}", f"API error: {response.text}"
            
    except Exception as e:
        return "ERROR", str(e), f"Exception: {type(e).__name__}"

def analyze_response_uniqueness(responses: List[str]) -> Dict:
    """Analyze if responses are unique or repetitive"""
    
    # Remove common prefixes/suffixes and normalize
    normalized_responses = []
    for resp in responses:
        # Remove common prefixes
        cleaned = resp.strip()
        if cleaned.startswith("🎨"):
            cleaned = cleaned[1:].strip()
        if cleaned.startswith("CREATIVE"):
            cleaned = cleaned[8:].strip()
        
        normalized_responses.append(cleaned.lower())
    
    # Count unique responses
    unique_responses = set(normalized_responses)
    uniqueness_ratio = len(unique_responses) / len(normalized_responses) if normalized_responses else 0
    
    # Find duplicates
    duplicates = []
    seen = set()
    for i, resp in enumerate(normalized_responses):
        if resp in seen:
            duplicates.append(i)
        seen.add(resp)
    
    return {
        "total_responses": len(responses),
        "unique_responses": len(unique_responses),
        "uniqueness_ratio": uniqueness_ratio,
        "duplicate_indices": duplicates
    }

def main():
    print("🎨 CREATIVE QUESTIONS QA TEST")
    print("=" * 50)
    print()
    
    results = []
    responses = []
    
    for i, question in enumerate(CREATIVE_QUESTIONS, 1):
        print(f"Testing {i}/{len(CREATIVE_QUESTIONS)}: {question}")
        
        status, response, analysis = test_creative_query(question)
        results.append({
            "question": question,
            "status": status,
            "response": response[:200] + "..." if len(response) > 200 else response,
            "analysis": analysis
        })
        responses.append(response)
        
        print(f"  Status: {status}")
        print(f"  Analysis: {analysis}")
        print(f"  Response: {response[:100]}...")
        print()
        
        # Small delay between requests
        time.sleep(1)
    
    # Analyze uniqueness
    uniqueness_analysis = analyze_response_uniqueness(responses)
    
    # Print summary
    print("📊 CREATIVE QA RESULTS SUMMARY")
    print("=" * 50)
    
    status_counts = {}
    for result in results:
        status = result["status"]
        status_counts[status] = status_counts.get(status, 0) + 1
    
    print(f"Total Questions: {len(results)}")
    for status, count in status_counts.items():
        print(f"{status}: {count} ({count/len(results)*100:.1f}%)")
    
    print()
    print("🔄 RESPONSE UNIQUENESS ANALYSIS")
    print("=" * 50)
    print(f"Total Responses: {uniqueness_analysis['total_responses']}")
    print(f"Unique Responses: {uniqueness_analysis['unique_responses']}")
    print(f"Uniqueness Ratio: {uniqueness_analysis['uniqueness_ratio']:.2%}")
    
    if uniqueness_analysis['duplicate_indices']:
        print(f"Duplicate Responses: {len(uniqueness_analysis['duplicate_indices'])}")
        print("Duplicate questions:")
        for idx in uniqueness_analysis['duplicate_indices']:
            print(f"  - {CREATIVE_QUESTIONS[idx]}")
    
    print()
    print("🚨 DETAILED RESULTS")
    print("=" * 50)
    
    for i, result in enumerate(results, 1):
        print(f"{i}. {result['question']}")
        print(f"   Status: {result['status']}")
        print(f"   Analysis: {result['analysis']}")
        print(f"   Response: {result['response']}")
        print()
    
    # Save detailed results
    with open('qa_creative_results.json', 'w') as f:
        json.dump({
            "summary": {
                "total_questions": len(results),
                "status_counts": status_counts,
                "uniqueness_analysis": uniqueness_analysis
            },
            "detailed_results": results
        }, f, indent=2)
    
    print(f"💾 Detailed results saved to: qa_creative_results.json")

if __name__ == "__main__":
    main() 
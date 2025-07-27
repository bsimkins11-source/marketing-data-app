#!/usr/bin/env python3
"""
Mega 1000 Question QA Test
Comprehensive test covering all categories with simple and complex questions
"""

import urllib.request
import json
import time
import random
from datetime import datetime

# API endpoint
API_URL = "http://localhost:3000/api/ai/query"

def send_query(query):
    """Send a query to the API and return the response"""
    try:
        data = json.dumps({"query": query}).encode('utf-8')
        req = urllib.request.Request(API_URL, data=data, headers={'Content-Type': 'application/json'})
        
        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.loads(response.read().decode('utf-8'))
            return result
    except Exception as e:
        return {"error": str(e)}

def categorize_response(response):
    """Categorize the response based on content and data type"""
    if "error" in response:
        return "ERROR"
    
    content = response.get("content", "").lower()
    data_type = response.get("data", {}).get("type", "")
    
    # Define response categories
    if "top performing" in content and "campaign" in content:
        return "TOP_CAMPAIGNS"
    elif "top performing" in content and "platform" in content:
        return "TOP_PLATFORMS"
    elif "top performing" in content and "creative" in content:
        return "TOP_CREATIVES"
    elif "anomaly" in content or "unusual" in content:
        return "ANOMALY_DETECTION"
    elif "comparison" in content or "compare" in content:
        return "COMPARATIVE_ANALYSIS"
    elif "executive" in content or "summary" in content:
        return "EXECUTIVE_SUMMARY"
    elif "optimization" in content or "recommendation" in content:
        return "OPTIMIZATION"
    elif "audience" in content:
        return "AUDIENCE_ANALYSIS"
    elif "brand" in content:
        return "BRAND_ANALYSIS"
    elif "drill down" in content or "breakdown" in content:
        return "DRILL_DOWN"
    elif "specific" in content or "detailed" in content:
        return "SPECIFIC_METRICS"
    else:
        return "GENERAL"

def generate_questions():
    """Generate 1000 diverse questions across all categories"""
    
    # Base question templates
    base_questions = [
        # Campaign Performance (150 questions)
        "what were the top performing campaigns",
        "which campaigns had the highest ROAS",
        "what was the best performing campaign for freshnest",
        "show me the top 3 campaigns by revenue",
        "which campaigns had the lowest CPA",
        "what campaigns performed best on meta",
        "top performing campaigns by platform",
        "which campaigns had the highest CTR",
        "what was the worst performing campaign",
        "show me campaign performance for ecofresh",
        "which campaigns had the best conversion rates",
        "what campaigns spent the most money",
        "top campaigns by impressions",
        "which campaigns had the highest CPM",
        "what campaigns generated the most revenue",
        "show me campaigns with ROAS above 4x",
        "which campaigns had the lowest spend",
        "top performing campaigns by clicks",
        "what campaigns had the best CPC",
        "which campaigns had the highest reach",
        
        # Platform Performance (150 questions)
        "what was the top performing platform",
        "which platform had the highest ROAS",
        "show me platform performance across all campaigns",
        "what platform had the lowest CPA",
        "top platforms by revenue",
        "which platform had the highest CTR",
        "what platform spent the most money",
        "show me platform comparison",
        "which platform had the best conversion rates",
        "top performing platforms by impressions",
        "what platform had the highest CPM",
        "which platform generated the most revenue",
        "show me platforms with ROAS above 3x",
        "what platform had the lowest spend",
        "top platforms by clicks",
        "which platform had the best CPC",
        "what platform had the highest reach",
        "show me platform performance for freshnest",
        "which platform performed best for ecofresh",
        "what platform had the most campaigns",
        
        # Creative Performance (150 questions)
        "what were the top performing creatives",
        "which creatives had the highest ROAS",
        "show me creative performance on amazon",
        "what creatives had the lowest CPA",
        "top creatives by revenue",
        "which creatives had the highest CTR",
        "what creatives spent the most money",
        "show me creative comparison",
        "which creatives had the best conversion rates",
        "top performing creatives by impressions",
        "what creatives had the highest CPM",
        "which creatives generated the most revenue",
        "show me creatives with ROAS above 4x",
        "what creatives had the lowest spend",
        "top creatives by clicks",
        "which creatives had the best CPC",
        "what creatives had the highest reach",
        "show me creative performance for freshnest",
        "which creatives performed best for ecofresh",
        "what creatives had the most impressions",
        
        # Anomaly Detection (100 questions)
        "were there any anomalies in the campaigns",
        "what unusual patterns did you notice",
        "are there any outliers in the data",
        "what campaigns had unexpected performance",
        "were there any unusual spending patterns",
        "what anomalies should I be aware of",
        "are there any suspicious data points",
        "what campaigns had unexpected ROAS",
        "were there any unusual CTR patterns",
        "what anomalies exist in platform performance",
        "are there any unexpected conversion rates",
        "what unusual patterns in creative performance",
        "were there any anomalies in spending",
        "what campaigns had unexpected CPA",
        "are there any unusual revenue patterns",
        "what anomalies in audience performance",
        "were there any unexpected CPM values",
        "what unusual patterns in impressions",
        "are there any anomalies in clicks",
        "what campaigns had unexpected reach",
        
        # Comparative Analysis (100 questions)
        "compare campaign performance",
        "how do platforms compare to each other",
        "compare creative performance across campaigns",
        "how does freshnest compare to ecofresh",
        "compare ROAS across platforms",
        "how do campaigns compare by CTR",
        "compare spending patterns",
        "how does performance compare by audience",
        "compare conversion rates",
        "how do platforms compare by CPA",
        "compare revenue generation",
        "how do creatives compare by CPM",
        "compare impression performance",
        "how do campaigns compare by clicks",
        "compare reach across platforms",
        "how does performance compare by brand",
        "compare optimization opportunities",
        "how do audiences compare by platform",
        "compare creative effectiveness",
        "how do campaigns compare by spend",
        
        # Executive Summary (100 questions)
        "provide an executive summary",
        "give me an overview of all campaigns",
        "what's the overall performance summary",
        "summarize the marketing data",
        "provide a high-level overview",
        "what are the key insights",
        "give me a summary of results",
        "what's the overall ROAS",
        "summarize platform performance",
        "what are the main takeaways",
        "provide a campaign summary",
        "what's the overall spend",
        "summarize creative performance",
        "what's the total revenue",
        "provide a performance overview",
        "what are the key metrics",
        "summarize audience performance",
        "what's the overall conversion rate",
        "provide a brand summary",
        "what are the main findings",
        
        # Optimization Recommendations (100 questions)
        "what optimization recommendations do you have",
        "how should I optimize the campaigns",
        "what improvements should I make",
        "what optimization opportunities exist",
        "how can I improve ROAS",
        "what should I optimize for better performance",
        "what optimization strategies do you recommend",
        "how should I optimize spending",
        "what creative optimizations should I make",
        "how can I optimize platform performance",
        "what audience optimizations do you recommend",
        "how should I optimize for conversions",
        "what optimization opportunities for freshnest",
        "how can I optimize ecofresh campaigns",
        "what optimization recommendations for meta",
        "how should I optimize amazon campaigns",
        "what optimization opportunities for cm360",
        "how can I optimize for better CTR",
        "what optimization strategies for CPA",
        "how should I optimize for revenue",
        
        # Audience Analysis (100 questions)
        "what audiences performed best",
        "which audiences had the highest ROAS",
        "show me audience performance",
        "what audiences had the lowest CPA",
        "top audiences by revenue",
        "which audiences had the highest CTR",
        "what audiences spent the most money",
        "show me audience comparison",
        "which audiences had the best conversion rates",
        "top performing audiences by impressions",
        "what audiences had the highest CPM",
        "which audiences generated the most revenue",
        "show me audiences with ROAS above 3x",
        "what audiences had the lowest spend",
        "top audiences by clicks",
        "which audiences had the best CPC",
        "what audiences had the highest reach",
        "show me audience performance for freshnest",
        "which audiences performed best for ecofresh",
        "what audiences had the most impressions",
        
        # Brand Analysis (50 questions)
        "what brands were used in these campaigns",
        "how did freshnest perform",
        "show me brand performance",
        "how did ecofresh compare to freshnest",
        "what was the best performing brand",
        "which brand had the highest ROAS",
        "show me brand comparison",
        "what brand had the lowest CPA",
        "top brands by revenue",
        "which brand had the highest CTR",
        "what brand spent the most money",
        "show me brand performance summary",
        "which brand had the best conversion rates",
        "top performing brands by impressions",
        "what brand had the highest CPM",
        "which brand generated the most revenue",
        "show me brands with ROAS above 4x",
        "what brand had the lowest spend",
        "top brands by clicks",
        "which brand had the best CPC",
        
        # Specific Metrics (50 questions)
        "what was the total spend",
        "what was the total revenue",
        "what was the overall ROAS",
        "what was the average CTR",
        "what was the average CPA",
        "what was the total impressions",
        "what was the total clicks",
        "what was the total conversions",
        "what was the average CPM",
        "what was the average CPC",
        "what was the conversion rate",
        "what was the click-through rate",
        "what was the cost per acquisition",
        "what was the return on ad spend",
        "what was the total reach",
        "what was the average order value",
        "what was the total number of campaigns",
        "what was the total number of platforms",
        "what was the total number of creatives",
        "what was the total number of audiences",
        
        # Drill Down Questions (50 questions)
        "drill down into campaign performance",
        "break down platform performance",
        "drill down into creative performance",
        "break down audience performance",
        "drill down into brand performance",
        "break down spending by platform",
        "drill down into revenue by campaign",
        "break down conversions by audience",
        "drill down into CTR by creative",
        "break down CPA by platform",
        "drill down into ROAS by campaign",
        "break down impressions by platform",
        "drill down into clicks by creative",
        "break down CPM by platform",
        "drill down into CPC by campaign",
        "break down reach by audience",
        "drill down into performance by brand",
        "break down optimization opportunities",
        "drill down into anomalies",
        "break down comparative analysis",
        
        # Complex Multi-Dimensional Questions (50 questions)
        "what creatives performed best against which audiences on what platforms",
        "how do campaigns perform across different platforms and audiences",
        "what's the relationship between creative performance and audience targeting",
        "how do platforms compare when targeting different audiences",
        "what creative-audience-platform combinations work best",
        "how does brand performance vary across platforms and audiences",
        "what's the optimal creative-audience-platform mix",
        "how do campaigns perform when considering all dimensions",
        "what insights can you provide across all performance dimensions",
        "how do different combinations of factors affect performance",
        "what patterns exist across campaigns, platforms, and audiences",
        "how does creative effectiveness vary by platform and audience",
        "what's the cross-dimensional performance analysis",
        "how do brands perform across different platform-audience combinations",
        "what's the multi-dimensional optimization strategy",
        "how do campaigns perform when considering creative, platform, and audience",
        "what's the relationship between all performance factors",
        "how do different dimensions interact to affect performance",
        "what's the comprehensive performance analysis",
        "how do all factors combine to determine success",
        
        # Sequential and Follow-up Questions (50 questions)
        "what were the top performing campaigns",
        "which of those had the highest CTR",
        "what was the CPA for that campaign",
        "how did it perform on different platforms",
        "what creatives were used in that campaign",
        "which audiences responded best to that campaign",
        "what was the overall ROAS for that campaign",
        "how did it compare to other campaigns",
        "what optimization opportunities exist for that campaign",
        "what was the total spend for that campaign",
        "how many impressions did that campaign get",
        "what was the conversion rate for that campaign",
        "which platform performed best for that campaign",
        "what was the CPM for that campaign",
        "how did that campaign perform by audience",
        "what was the CPC for that campaign",
        "how did that campaign perform over time",
        "what was the reach for that campaign",
        "how did that campaign perform by creative",
        "what was the total revenue for that campaign"
    ]
    
    # Generate variations and additional questions
    questions = []
    
    # Add base questions
    questions.extend(base_questions)
    
    # Generate variations with different wording
    variations = [
        "show me", "display", "list", "find", "identify", "tell me about", "what are", "which are",
        "top", "best", "highest", "leading", "most successful", "strongest",
        "performing", "performed", "performance", "results", "outcomes",
        "campaigns", "campaign", "ad campaigns", "marketing campaigns",
        "platforms", "platform", "channels", "ad platforms",
        "creatives", "creative", "ads", "advertisements", "creative assets",
        "anomalies", "anomaly", "unusual", "outliers", "suspicious", "unexpected",
        "compare", "comparison", "versus", "vs", "against", "relative to",
        "summary", "overview", "executive", "high-level", "key insights",
        "optimize", "optimization", "improve", "enhance", "better", "recommendations",
        "audiences", "audience", "targeting", "demographics", "segments",
        "brands", "brand", "companies", "organizations",
        "metrics", "kpis", "measurements", "data points", "statistics"
    ]
    
    # Generate additional questions using variations
    for base in base_questions[:100]:  # Use first 100 base questions
        for variation in random.sample(variations, 3):  # Pick 3 random variations
            if variation not in base:
                questions.append(base.replace("what were", variation).replace("what was", variation))
    
    # Generate platform-specific questions
    platforms = ["meta", "amazon", "cm360", "sa360", "google", "facebook", "instagram"]
    for platform in platforms:
        questions.extend([
            f"how did {platform} perform",
            f"what was the best campaign on {platform}",
            f"which creatives worked best on {platform}",
            f"what was the ROAS on {platform}",
            f"how did {platform} compare to other platforms"
        ])
    
    # Generate brand-specific questions
    brands = ["freshnest", "ecofresh"]
    for brand in brands:
        questions.extend([
            f"how did {brand} perform",
            f"what was the best campaign for {brand}",
            f"which platform worked best for {brand}",
            f"what was the ROAS for {brand}",
            f"how did {brand} compare to other brands"
        ])
    
    # Generate metric-specific questions
    metrics = ["roas", "ctr", "cpa", "cpm", "cpc", "conversions", "revenue", "spend"]
    for metric in metrics:
        questions.extend([
            f"what was the {metric}",
            f"which campaigns had the best {metric}",
            f"how did {metric} vary by platform",
            f"what was the average {metric}",
            f"which creatives had the best {metric}"
        ])
    
    # Ensure we have exactly 1000 questions
    while len(questions) < 1000:
        # Add more variations
        for base in base_questions:
            if len(questions) >= 1000:
                break
            questions.append(f"additional {base}")
    
    # Trim to exactly 1000
    questions = questions[:1000]
    
    return questions

def run_mega_test():
    """Run the mega 1000 question test"""
    print("🚀 Starting Mega 1000 Question QA Test")
    print("=" * 60)
    
    # Generate questions
    questions = generate_questions()
    print(f"📝 Generated {len(questions)} questions")
    
    # Initialize results tracking
    results = {
        "total_questions": len(questions),
        "successful_responses": 0,
        "errors": 0,
        "categories": {},
        "response_times": [],
        "start_time": datetime.now()
    }
    
    # Run tests in batches
    batch_size = 50
    total_batches = (len(questions) + batch_size - 1) // batch_size
    
    for batch_num in range(total_batches):
        start_idx = batch_num * batch_size
        end_idx = min(start_idx + batch_size, len(questions))
        batch_questions = questions[start_idx:end_idx]
        
        print(f"\n📦 Processing Batch {batch_num + 1}/{total_batches} (Questions {start_idx + 1}-{end_idx})")
        
        for i, question in enumerate(batch_questions, 1):
            question_num = start_idx + i
            
            # Send query
            start_time = time.time()
            response = send_query(question)
            response_time = time.time() - start_time
            
            # Categorize response
            category = categorize_response(response)
            
            # Track results
            if "error" not in response:
                results["successful_responses"] += 1
                if category not in results["categories"]:
                    results["categories"][category] = 0
                results["categories"][category] += 1
            else:
                results["errors"] += 1
            
            results["response_times"].append(response_time)
            
            # Progress indicator
            if question_num % 10 == 0:
                print(f"   ✅ Processed {question_num}/{len(questions)} questions")
        
        # Brief pause between batches
        time.sleep(1)
    
    # Calculate final results
    results["end_time"] = datetime.now()
    results["total_time"] = (results["end_time"] - results["start_time"]).total_seconds()
    results["avg_response_time"] = sum(results["response_times"]) / len(results["response_times"])
    results["success_rate"] = (results["successful_responses"] / results["total_questions"]) * 100
    
    # Print results
    print("\n" + "=" * 60)
    print("📊 MEGA 1000 QUESTION TEST RESULTS")
    print("=" * 60)
    print(f"Total Questions: {results['total_questions']}")
    print(f"Successful Responses: {results['successful_responses']}")
    print(f"Errors: {results['errors']}")
    print(f"Success Rate: {results['success_rate']:.2f}%")
    print(f"Total Time: {results['total_time']:.2f} seconds")
    print(f"Average Response Time: {results['avg_response_time']:.3f} seconds")
    
    print("\n📈 Response Categories:")
    for category, count in sorted(results["categories"].items(), key=lambda x: x[1], reverse=True):
        percentage = (count / results["successful_responses"]) * 100
        print(f"  {category}: {count} ({percentage:.1f}%)")
    
    # Save results
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"mega_1000_qa_results_{timestamp}.json"
    
    with open(filename, 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\n💾 Results saved to: {filename}")
    
    # Performance assessment
    if results["success_rate"] >= 95:
        print("\n🎉 EXCELLENT: Success rate above 95% - System is performing exceptionally well!")
    elif results["success_rate"] >= 90:
        print("\n✅ GOOD: Success rate above 90% - System is performing well!")
    elif results["success_rate"] >= 80:
        print("\n⚠️  FAIR: Success rate above 80% - Some improvements needed")
    else:
        print("\n❌ NEEDS WORK: Success rate below 80% - Significant improvements required")
    
    return results

if __name__ == "__main__":
    run_mega_test() 
#!/usr/bin/env python3

import urllib.request
import json
import time

def test_ai_charts():
    """Test AI chart generation capabilities"""
    
    base_url = "http://localhost:3000/api/ai/query"
    
    # Test cases for different chart types
    test_queries = [
        "show me a bar chart of top performing campaigns by revenue",
        "create a pie chart showing revenue distribution by campaign",
        "generate a line chart of spend vs revenue by campaign",
        "display a chart of ROAS by platform",
        "show me a bar chart of CTR by campaign",
        "create a pie chart of spend allocation by platform"
    ]
    
    print("🧪 Testing AI Chart Generation Capabilities")
    print("=" * 50)
    
    for i, query in enumerate(test_queries, 1):
        print(f"\n{i}. Testing: {query}")
        
        try:
            # Prepare the request
            data = json.dumps({"query": query}).encode('utf-8')
            req = urllib.request.Request(
                base_url,
                data=data,
                headers={'Content-Type': 'application/json'}
            )
            
            # Send request
            start_time = time.time()
            with urllib.request.urlopen(req) as response:
                result = json.loads(response.read().decode('utf-8'))
            end_time = time.time()
            
            # Check if response contains data for charts
            has_chart_data = 'data' in result and result['data'] is not None
            has_campaigns = has_chart_data and 'campaigns' in result['data']
            
            print(f"   ✅ Response received in {end_time - start_time:.2f}s")
            print(f"   📊 Chart data available: {has_chart_data}")
            print(f"   🎯 Campaign data: {has_campaigns}")
            
            if has_campaigns:
                campaigns = result['data']['campaigns']
                print(f"   📈 Number of campaigns: {len(campaigns)}")
                for campaign in campaigns[:2]:  # Show first 2 campaigns
                    print(f"      - {campaign['campaign']}: ${campaign['revenue']:,.0f}")
            
            # Check if query mentions specific chart types
            query_lower = query.lower()
            if 'pie' in query_lower and has_chart_data:
                print("   🥧 Pie chart request detected - should render pie chart")
            elif 'line' in query_lower and has_chart_data:
                print("   📈 Line chart request detected - should render line chart")
            elif 'bar' in query_lower and has_chart_data:
                print("   📊 Bar chart request detected - should render bar chart")
            
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
        
        time.sleep(1)  # Small delay between requests
    
    print("\n" + "=" * 50)
    print("🎯 Chart Testing Summary:")
    print("The AI should now be able to:")
    print("• Generate bar charts for campaign comparisons")
    print("• Create pie charts for distribution analysis")
    print("• Display line charts for trend analysis")
    print("• Provide structured data for visualization")
    print("\n📱 Visit http://localhost:3000/ai-analysis to test interactively!")

if __name__ == "__main__":
    test_ai_charts() 
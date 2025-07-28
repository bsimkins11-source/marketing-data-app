#!/usr/bin/env python3

import urllib.request
import json
import time

def test_universal_followup():
    """Test follow-up chart requests with different types of initial queries"""
    
    print("🧪 Testing Universal Follow-up Chart Requests")
    print("=" * 60)
    
    # Test different types of initial queries followed by chart requests
    test_sequences = [
        {
            "name": "Top Performing Campaigns",
            "queries": [
                "what were the top performing campaigns",
                "can I get a chart of this for download"
            ]
        },
        {
            "name": "Brand Analysis",
            "queries": [
                "what brands were used in these campaigns",
                "show me a chart of this"
            ]
        },
        {
            "name": "Platform Performance",
            "queries": [
                "what was the top performing platform across all campaigns",
                "create a graph of this data"
            ]
        },
        {
            "name": "Creative Performance",
            "queries": [
                "what were the top performing creatives on amazon",
                "download a chart of this"
            ]
        },
        {
            "name": "Campaign Summary",
            "queries": [
                "provide me an overall summary of the 4 campaigns",
                "visualize this as a chart"
            ]
        }
    ]
    
    for test_case in test_sequences:
        print(f"\n📊 Testing: {test_case['name']}")
        print("-" * 40)
        
        session_id = f"test_{test_case['name'].lower().replace(' ', '_')}_{int(time.time())}"
        
        for i, query in enumerate(test_case['queries'], 1):
            print(f"\n{i}. Query: {query}")
            
            try:
                # Prepare the request with session ID
                data = json.dumps({
                    "query": query,
                    "sessionId": session_id
                }).encode('utf-8')
                
                req = urllib.request.Request(
                    "http://localhost:3000/api/ai/query",
                    data=data,
                    headers={'Content-Type': 'application/json'}
                )
                
                # Send request
                with urllib.request.urlopen(req) as response:
                    result = json.loads(response.read().decode('utf-8'))
                
                # Debug information
                data_type = result.get('data', {}).get('type', 'none')
                has_campaigns = bool(result.get('data', {}).get('campaigns'))
                campaign_count = len(result.get('data', {}).get('campaigns', []))
                
                print(f"   📊 Data type: {data_type}")
                print(f"   📋 Has campaigns: {has_campaigns}")
                print(f"   🔢 Campaign count: {campaign_count}")
                
                if has_campaigns and campaign_count > 0:
                    campaigns = result.get('data', {}).get('campaigns', [])
                    total_revenue = sum(c.get('revenue', 0) for c in campaigns)
                    print(f"   💰 Total Revenue: ${total_revenue:,.0f}")
                    print(f"   📈 First item: {campaigns[0].get('campaign', 'unknown')}")
                
                # Check content for context clues
                content = result.get('content', '')
                if 'PREVIOUS RESULTS' in content:
                    print("   🔄 Generated from previous context")
                elif 'CHART DATA GENERATED' in content:
                    print("   📊 Generated as new chart")
                elif 'Top Performing Campaigns' in content:
                    print("   🏆 Generated as top performing campaigns")
                elif 'BRANDS USED' in content:
                    print("   🏷️ Generated as brand analysis")
                elif 'PLATFORM PERFORMANCE' in content:
                    print("   📱 Generated as platform performance")
                elif 'CREATIVE PERFORMANCE' in content:
                    print("   🎨 Generated as creative performance")
                elif 'CAMPAIGN SUMMARY' in content:
                    print("   📋 Generated as campaign summary")
                
                print(f"   📝 Content Preview: {content[:100]}...")
                
            except Exception as e:
                print(f"   ❌ Error: {str(e)}")
            
            time.sleep(0.5)
        
        print(f"\n✅ Completed: {test_case['name']}")
    
    print("\n" + "=" * 60)
    print("🎯 Expected Behavior Summary:")
    print("✅ All initial queries should return appropriate data")
    print("✅ All follow-up chart requests should generate charts")
    print("✅ Charts should include download buttons")
    print("✅ Content should mention 'PREVIOUS RESULTS'")
    print("✅ Different data types should be converted to chart format")

if __name__ == "__main__":
    test_universal_followup() 
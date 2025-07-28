#!/usr/bin/env python3

import urllib.request
import json
import time

def test_chart_rendering():
    """Test if charts are actually rendering on the AI page"""
    
    print("🧪 Testing Chart Rendering on AI Page")
    print("=" * 50)
    
    # Test a simple chart request
    query = "show me a bar chart of top performing campaigns"
    
    try:
        # Prepare the request
        data = json.dumps({"query": query}).encode('utf-8')
        req = urllib.request.Request(
            "http://localhost:3000/api/ai/query",
            data=data,
            headers={'Content-Type': 'application/json'}
        )
        
        # Send request
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
        
        print(f"✅ Query: {query}")
        print(f"📊 Data Type: {result.get('data', {}).get('type')}")
        print(f"🎯 Chart Type: {result.get('data', {}).get('chartType')}")
        print(f"📈 Campaigns: {len(result.get('data', {}).get('campaigns', []))}")
        
        # Check if we have the right data structure
        if result.get('data', {}).get('type') == 'chart_data':
            print("✅ Chart data structure is correct")
            
            campaigns = result.get('data', {}).get('campaigns', [])
            if campaigns:
                print("✅ Campaign data is available")
                print(f"📊 First campaign: {campaigns[0].get('campaign')}")
                print(f"💰 Revenue: ${campaigns[0].get('revenue', 0):,.0f}")
            else:
                print("❌ No campaign data found")
        else:
            print(f"❌ Wrong data type: {result.get('data', {}).get('type')}")
        
        print("\n🔍 Next Steps:")
        print("1. Visit http://localhost:3000/ai-analysis")
        print("2. Ask: 'show me a bar chart of top performing campaigns'")
        print("3. Check if the chart appears below the text response")
        print("4. Look for any console errors in browser dev tools")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    test_chart_rendering() 
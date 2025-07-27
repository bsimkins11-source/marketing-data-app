import urllib.request
import json
import time

def query_api(query):
    url = "https://marketing-data-app.vercel.app/api/ai/query"
    data = json.dumps({"query": query}).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except Exception as e:
        return f"Error: {e}"

def test_creative_level_fix():
    """Test the creative-level data fix"""
    test_queries = [
        "what were the top 3 performing creatives across all 4 campaigns",
        "show me the best creatives on amazon",
        "top performing creatives on meta",
        "best advertisements on dv360"
    ]
    
    print("🔧 Testing Creative-Level Data Fix")
    print("=" * 50)
    
    for i, query in enumerate(test_queries, 1):
        response = query_api(query)
        
        if "Try asking about:" in response or "I can help you analyze" in response:
            status = "❌"
        elif "Creative Variant" in response:
            status = "✅"
        else:
            status = "⚠️"
        
        print(f"{i}. {status} {query}")
        if status == "✅":
            print(f"   Response: {str(response)[:200]}...")
        elif status == "⚠️":
            print(f"   Response: {str(response)[:100]}...")
        time.sleep(0.1)
    
    print("\n" + "=" * 50)
    print("Creative-level fix verification complete!")

if __name__ == "__main__":
    test_creative_level_fix() 
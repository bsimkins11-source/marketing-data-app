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

def test_creative_fix():
    """Test the creative queries fix"""
    test_queries = [
        "what were the top performing creatives on amazon",
        "show me the best creatives on meta",
        "top performing ads on dv360",
        "best advertisements on cm360",
        "top creatives"
    ]
    
    print("🔧 Testing Creative Queries Fix")
    print("=" * 50)
    
    for i, query in enumerate(test_queries, 1):
        response = query_api(query)
        
        if "Try asking about:" in response or "I can help you analyze" in response:
            status = "❌"
        else:
            status = "✅"
        
        print(f"{i}. {status} {query}")
        if status == "✅":
            print(f"   Response: {str(response)[:150]}...")
        time.sleep(0.1)
    
    print("\n" + "=" * 50)
    print("Creative fix verification complete!")

if __name__ == "__main__":
    test_creative_fix() 
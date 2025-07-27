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

def test_top_performing_fix():
    """Test the top performing campaigns fix"""
    test_queries = [
        "what were the top performing campaigns",
        "show me the best performing campaigns",
        "which campaigns are performing best",
        "top campaigns by performance",
        "best campaigns"
    ]
    
    print("🔧 Testing Top Performing Campaigns Fix")
    print("=" * 50)
    
    for i, query in enumerate(test_queries, 1):
        response = query_api(query)
        
        if "Try asking about:" in response or "I can help you analyze" in response:
            status = "❌"
        else:
            status = "✅"
        
        print(f"{i}. {status} {query}")
        if status == "✅":
            print(f"   Response: {response[:100]}...")
        time.sleep(0.1)
    
    print("\n" + "=" * 50)
    print("Fix verification complete!")

if __name__ == "__main__":
    test_top_performing_fix() 
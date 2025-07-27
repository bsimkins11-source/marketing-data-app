import urllib.request
import json
import time

def query_api(query, session_id="test_session_123"):
    url = "https://marketing-data-app.vercel.app/api/ai/query"
    data = json.dumps({"query": query, "sessionId": session_id}).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except Exception as e:
        return f"Error: {e}"

def test_sequential_questions():
    """Test sequential questions that build on each other"""
    print("🧪 TESTING SEQUENTIAL QUESTIONS & DRILL-DOWN CAPABILITIES")
    print("=" * 70)
    
    session_id = f"sequential_test_{int(time.time())}"
    
    # Test 1: Basic platform question followed by drill-down
    print("\n📊 Test 1: Platform Performance → Campaign Drill-down")
    print("-" * 50)
    
    # Initial question
    result1 = query_api("How is Meta performing?", session_id)
    print(f"Q1: How is Meta performing?")
    print(f"A1: {result1.get('content', 'No content')[:100]}...")
    print(f"Type: {result1.get('data', {}).get('type', 'No type')}")
    
    time.sleep(2)  # Rate limiting
    
    # Drill-down question
    result2 = query_api("Show me the campaigns for Meta", session_id)
    print(f"\nQ2: Show me the campaigns for Meta")
    print(f"A2: {result2.get('content', 'No content')[:100]}...")
    print(f"Type: {result2.get('data', {}).get('type', 'No type')}")
    
    time.sleep(2)
    
    # Test 2: Campaign question followed by platform drill-down
    print("\n📊 Test 2: Campaign Performance → Platform Drill-down")
    print("-" * 50)
    
    # Initial question
    result3 = query_api("What is the spend for FreshNest Summer Grilling?", session_id)
    print(f"Q3: What is the spend for FreshNest Summer Grilling?")
    print(f"A3: {result3.get('content', 'No content')[:100]}...")
    print(f"Type: {result3.get('data', {}).get('type', 'No type')}")
    
    time.sleep(2)
    
    # Drill-down question
    result4 = query_api("Break down the platforms for this campaign", session_id)
    print(f"\nQ4: Break down the platforms for this campaign")
    print(f"A4: {result4.get('content', 'No content')[:100]}...")
    print(f"Type: {result4.get('data', {}).get('type', 'No type')}")
    
    time.sleep(2)
    
    # Test 3: Metric question followed by trend drill-down
    print("\n📊 Test 3: Metric Question → Trend Drill-down")
    print("-" * 50)
    
    # Initial question
    result5 = query_api("What is the overall ROAS?", session_id)
    print(f"Q5: What is the overall ROAS?")
    print(f"A5: {result5.get('content', 'No content')[:100]}...")
    print(f"Type: {result5.get('data', {}).get('type', 'No type')}")
    
    time.sleep(2)
    
    # Drill-down question
    result6 = query_api("Show me the trends for this metric", session_id)
    print(f"\nQ6: Show me the trends for this metric")
    print(f"A6: {result6.get('content', 'No content')[:100]}...")
    print(f"Type: {result6.get('data', {}).get('type', 'No type')}")
    
    time.sleep(2)
    
    # Test 4: Complex sequential conversation
    print("\n📊 Test 4: Complex Sequential Conversation")
    print("-" * 50)
    
    questions = [
        "Which platform performed best?",
        "Tell me more about their campaigns",
        "What about their conversion rates?",
        "Show me the details for the top campaign",
        "How does this compare to other platforms?"
    ]
    
    for i, question in enumerate(questions, 1):
        result = query_api(question, session_id)
        print(f"Q{i}: {question}")
        print(f"A{i}: {result.get('content', 'No content')[:150]}...")
        print(f"Type: {result.get('data', {}).get('type', 'No type')}")
        print("-" * 30)
        time.sleep(2)
    
    # Test 5: Drill-down keywords
    print("\n📊 Test 5: Drill-down Keyword Detection")
    print("-" * 50)
    
    drill_down_queries = [
        "Drill down into the campaigns",
        "Break down the platforms",
        "Show me more details",
        "Tell me more about this",
        "What are the specifics?",
        "Give me more information",
        "Expand on this",
        "Elaborate further"
    ]
    
    # First establish context
    context_result = query_api("How is Amazon performing?", session_id)
    print(f"Context: How is Amazon performing?")
    print(f"Response: {context_result.get('content', 'No content')[:100]}...")
    time.sleep(2)
    
    for i, query in enumerate(drill_down_queries, 1):
        result = query_api(query, session_id)
        print(f"Q{i}: {query}")
        print(f"A{i}: {result.get('content', 'No content')[:150]}...")
        print(f"Type: {result.get('data', {}).get('type', 'No type')}")
        print("-" * 30)
        time.sleep(2)
    
    print("\n✅ Sequential and Drill-down Testing Complete!")

if __name__ == "__main__":
    test_sequential_questions() 
#!/bin/bash

# Comprehensive QA Test for Marketing Data Query App
API_URL="https://marketing-data-app.vercel.app/api/ai/query"

echo "🚀 Starting Comprehensive QA Test for Marketing Data Query App..."
echo "================================================================"

# Test categories
declare -A test_categories
test_categories["Time Context"]=0
test_categories["Executive Summary"]=0
test_categories["Weekly Performance"]=0
test_categories["Platform Performance"]=0
test_categories["Campaign Analysis"]=0
test_categories["Financial Metrics"]=0
test_categories["Optimization Insights"]=0

total_tests=0
total_passed=0

# Function to run a test
run_test() {
    local category="$1"
    local query="$2"
    local expected_patterns="$3"
    local test_name="$4"
    
    echo "🔄 Testing [$category]: $test_name"
    echo "   Query: \"$query\""
    
    # Make API call
    response=$(curl -s -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"$query\"}")
    
    # Check if response contains expected patterns
    local passed=true
    IFS='|' read -ra patterns <<< "$expected_patterns"
    for pattern in "${patterns[@]}"; do
        if ! echo "$response" | grep -q "$pattern"; then
            passed=false
            break
        fi
    done
    
    if [ "$passed" = true ]; then
        echo "   ✅ PASS"
        ((test_categories["$category"]++))
        ((total_passed++))
    else
        echo "   ❌ FAIL"
        echo "   Response: $(echo "$response" | head -c 300)..."
    fi
    
    ((total_tests++))
    echo ""
    sleep 1  # Rate limiting
}

echo ""
echo "📅 TIME CONTEXT TESTS"
echo "===================="

# Test time context handler
run_test "Time Context" "When was this data collected?" "Data Timeframe|June 2024" "Time period query"
run_test "Time Context" "What month is this data from?" "Data Timeframe|June 2024" "Month query"
run_test "Time Context" "What year is this data from?" "Data Timeframe|June 2024" "Year query"
run_test "Time Context" "What's the timeframe for this data?" "Data Timeframe|June 2024" "Timeframe query"

# Test other months (should get June 2024 disclaimer)
run_test "Time Context" "How did we perform in March?" "June 2024|No data is available for other months" "Other month query"
run_test "Time Context" "What about January 2024?" "June 2024|No data is available for other months" "Other month/year query"
run_test "Time Context" "Show me December data" "June 2024|No data is available for other months" "Other month query"

echo ""
echo "📊 EXECUTIVE SUMMARY TESTS"
echo "========================="

# Test executive summary handler
run_test "Executive Summary" "Give me an executive summary" "EXECUTIVE SUMMARY|Data Context|Financial Performance" "Executive summary query"
run_test "Executive Summary" "What's the overall performance?" "EXECUTIVE SUMMARY|Data Context|Financial Performance" "Overall performance query"
run_test "Executive Summary" "Summarize our marketing performance" "EXECUTIVE SUMMARY|Data Context|Financial Performance" "Marketing performance summary"
run_test "Executive Summary" "What are the key metrics?" "EXECUTIVE SUMMARY|Data Context|Financial Performance" "Key metrics query"
run_test "Executive Summary" "What are the key findings?" "EXECUTIVE SUMMARY|Data Context|Financial Performance" "Key findings query"

echo ""
echo "📅 WEEKLY PERFORMANCE TESTS"
echo "=========================="

# Test weekly performance handlers
run_test "Weekly Performance" "How did we perform in week 1?" "Week 1 Performance|Financial Metrics|Engagement Metrics" "Week 1 performance"
run_test "Weekly Performance" "What's the performance for week 2?" "Week 2 Performance|Financial Metrics|Engagement Metrics" "Week 2 performance"
run_test "Weekly Performance" "Show me week 3 results" "Week 3 Performance|Financial Metrics|Engagement Metrics" "Week 3 performance"
run_test "Weekly Performance" "Week 4 performance" "Week 4 Performance|Financial Metrics|Engagement Metrics" "Week 4 performance"
run_test "Weekly Performance" "Compare all weeks" "Weekly Performance Comparison|Week 1|Week 2|Week 3|Week 4" "Weekly comparison"

echo ""
echo "🌐 PLATFORM PERFORMANCE TESTS"
echo "============================"

# Test platform performance handlers
run_test "Platform Performance" "What is Meta's performance?" "Meta Performance|Spend|Revenue|ROAS" "Meta performance"
run_test "Platform Performance" "How is Amazon performing?" "Amazon Performance|Spend|Revenue|ROAS" "Amazon performance"
run_test "Platform Performance" "What are DV360's results?" "Dv360 Performance|Spend|Revenue|ROAS" "DV360 performance"
run_test "Platform Performance" "Show me CM360's metrics" "Cm360 Performance|Spend|Revenue|ROAS" "CM360 performance"

echo ""
echo "📈 CAMPAIGN ANALYSIS TESTS"
echo "========================="

# Test campaign analysis
run_test "Campaign Analysis" "Which campaign is doing the best?" "CAMPAIGN COMPARISON|Top Performer|ROAS" "Best campaign query"
run_test "Campaign Analysis" "Compare all campaigns" "CAMPAIGN COMPARISON|Ranked by ROAS" "Campaign comparison"
run_test "Campaign Analysis" "What's our best performing campaign?" "CAMPAIGN COMPARISON|Top Performer|ROAS" "Best campaign query"

echo ""
echo "💰 FINANCIAL METRICS TESTS"
echo "========================="

# Test financial metrics
run_test "Financial Metrics" "What's our total spend?" "Total Spend|Total Revenue|Overall ROAS" "Total spend query"
run_test "Financial Metrics" "What's our ROAS?" "Total Spend|Total Revenue|Overall ROAS" "ROAS query"
run_test "Financial Metrics" "How much revenue did we generate?" "Total Spend|Total Revenue|Overall ROAS" "Revenue query"

echo ""
echo "🎯 OPTIMIZATION INSIGHTS TESTS"
echo "============================="

# Test optimization insights
run_test "Optimization Insights" "What should I optimize?" "CAMPAIGN HEALTH ANALYSIS|Areas of Concern|Recommendations" "Optimization query"
run_test "Optimization Insights" "What are the trends?" "CAMPAIGN HEALTH ANALYSIS|Areas of Concern|Recommendations" "Trends query"
run_test "Optimization Insights" "Give me insights" "CAMPAIGN HEALTH ANALYSIS|Areas of Concern|Recommendations" "Insights query"

echo ""
echo "📊 QA TEST RESULTS SUMMARY"
echo "=========================="
echo "Total Tests: $total_tests"
echo "Total Passed: $total_passed"
echo "Total Failed: $((total_tests - total_passed))"
echo "Overall Success Rate: $((total_passed * 100 / total_tests))%"
echo ""

echo "📈 CATEGORY BREAKDOWN:"
for category in "${!test_categories[@]}"; do
    echo "  $category: ${test_categories[$category]} tests passed"
done

echo ""
if [ $((total_passed * 100 / total_tests)) -ge 90 ]; then
    echo "🎉 EXCELLENT! All major functionality is working correctly!"
elif [ $((total_passed * 100 / total_tests)) -ge 75 ]; then
    echo "👍 GOOD! Most functionality is working well."
else
    echo "⚠️  NEEDS ATTENTION! Several areas need improvement."
fi

echo ""
echo "✅ QA Test Complete!" 
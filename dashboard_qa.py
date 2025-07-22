#!/usr/bin/env python3
"""
Dashboard Campaign Performance QA Script
Validates dashboard data against CSV calculations
"""

import csv
from collections import defaultdict

def validate_dashboard_data():
    """Validate dashboard campaign performance data against CSV"""
    
    # Load CSV data
    data = []
    with open('sample-campaign-data.csv', 'r') as file:
        reader = csv.DictReader(file)
        for row in reader:
            data.append(row)
    
    print("=== DASHBOARD CAMPAIGN PERFORMANCE QA ===")
    print(f"CSV Total Records: {len(data)}")
    print()
    
    # Calculate campaign aggregates from CSV
    campaign_data = defaultdict(lambda: {
        'impressions': 0, 'clicks': 0, 'conversions': 0, 
        'spend': 0, 'revenue': 0, 'rows': 0
    })
    
    for row in data:
        campaign = row['campaign_name'].strip()
        campaign_data[campaign]['impressions'] += int(row['impressions'])
        campaign_data[campaign]['clicks'] += int(row['clicks'])
        campaign_data[campaign]['conversions'] += int(row['conversions'])
        campaign_data[campaign]['spend'] += float(row['spend'])
        campaign_data[campaign]['revenue'] += float(row['spend']) * float(row['roas'])
        campaign_data[campaign]['rows'] += 1
    
    # Calculate metrics for each campaign
    csv_campaigns = []
    for campaign, data_dict in campaign_data.items():
        impressions = data_dict['impressions']
        clicks = data_dict['clicks']
        conversions = data_dict['conversions']
        spend = data_dict['spend']
        revenue = data_dict['revenue']
        
        ctr = clicks / impressions if impressions > 0 else 0
        cpc = spend / clicks if clicks > 0 else 0
        cpa = spend / conversions if conversions > 0 else 0
        roas = revenue / spend if spend > 0 else 0
        
        csv_campaigns.append({
            'campaign': campaign,
            'impressions': impressions,
            'clicks': clicks,
            'conversions': conversions,
            'spend': spend,
            'revenue': revenue,
            'ctr': ctr,
            'cpc': cpc,
            'cpa': cpa,
            'roas': roas
        })
    
    # Dashboard data (from API response)
    dashboard_campaigns = [
        {
            "campaign": "FreshNest Summer Grilling",
            "impressions": 1315803,
            "clicks": 63944,
            "conversions": 7596,
            "spend": 43671.66077378465,
            "revenue": 120518.44432985548,
            "ctr": 0.05835,
            "cpc": 5.296250000000001,
            "cpa": 18.679302614971455,
            "roas": 2.9140025266683933
        },
        {
            "campaign": "FreshNest Back to School",
            "impressions": 3844061,
            "clicks": 151183,
            "conversions": 27428,
            "spend": 120452.90969607318,
            "revenue": 381946.0548102442,
            "ctr": 0.057177551020408154,
            "cpc": 2.615102040816326,
            "cpa": 10.749253947145423,
            "roas": 3.2025063727013365
        },
        {
            "campaign": "FreshNest Holiday Recipes",
            "impressions": 1173926,
            "clicks": 51644,
            "conversions": 7172,
            "spend": 23846.80133048229,
            "revenue": 81687.42942529416,
            "ctr": 0.08914285714285716,
            "cpc": 2.2378571428571434,
            "cpa": 9.39218574662326,
            "roas": 2.9493954433369303
        },
        {
            "campaign": "FreshNest Pantry Staples",
            "impressions": 1643461,
            "clicks": 58086,
            "conversions": 8529,
            "spend": 41632.95173354955,
            "revenue": 136791.4767353427,
            "ctr": 0.043695,
            "cpc": 1.4974999999999998,
            "cpa": 10.29109062505458,
            "roas": 3.195660455730141
        }
    ]
    
    # Compare each campaign
    print("=== CAMPAIGN-BY-CAMPAIGN VALIDATION ===")
    for csv_campaign in csv_campaigns:
        campaign_name = csv_campaign['campaign']
        dashboard_campaign = next((c for c in dashboard_campaigns if c['campaign'] == campaign_name), None)
        
        if dashboard_campaign:
            print(f"\n📊 {campaign_name}:")
            
            # Compare key metrics
            metrics = ['impressions', 'clicks', 'conversions', 'spend', 'revenue', 'ctr', 'cpc', 'cpa', 'roas']
            all_match = True
            
            for metric in metrics:
                csv_val = csv_campaign[metric]
                dash_val = dashboard_campaign[metric]
                
                # Handle floating point precision
                if isinstance(csv_val, float) and isinstance(dash_val, float):
                    diff = abs(csv_val - dash_val)
                    tolerance = 0.01 if metric in ['ctr', 'cpc', 'cpa', 'roas'] else 0.1
                    matches = diff < tolerance
                else:
                    matches = csv_val == dash_val
                
                if matches:
                    print(f"  ✅ {metric}: {csv_val} (CSV) = {dash_val} (Dashboard)")
                else:
                    print(f"  ❌ {metric}: {csv_val} (CSV) ≠ {dash_val} (Dashboard)")
                    all_match = False
            
            if all_match:
                print(f"  🎯 {campaign_name}: ALL METRICS MATCH")
            else:
                print(f"  ⚠️  {campaign_name}: SOME DISCREPANCIES FOUND")
        else:
            print(f"❌ Campaign '{campaign_name}' not found in dashboard data")
    
    # Validate totals
    print("\n=== TOTAL METRICS VALIDATION ===")
    
    # Calculate totals from CSV
    csv_totals = {
        'impressions': sum(c['impressions'] for c in csv_campaigns),
        'clicks': sum(c['clicks'] for c in csv_campaigns),
        'conversions': sum(c['conversions'] for c in csv_campaigns),
        'spend': sum(c['spend'] for c in csv_campaigns),
        'revenue': sum(c['revenue'] for c in csv_campaigns)
    }
    
    # Dashboard totals
    dash_totals = {
        'impressions': 7977251,
        'clicks': 324857,
        'conversions': 50725,
        'spend': 229604.32353388966,
        'revenue': 720943.4053007367
    }
    
    print("Totals Comparison:")
    for metric in ['impressions', 'clicks', 'conversions', 'spend', 'revenue']:
        csv_val = csv_totals[metric]
        dash_val = dash_totals[metric]
        
        if abs(csv_val - dash_val) < 0.1:
            print(f"  ✅ {metric}: {csv_val:,.0f} (CSV) = {dash_val:,.0f} (Dashboard)")
        else:
            print(f"  ❌ {metric}: {csv_val:,.0f} (CSV) ≠ {dash_val:,.0f} (Dashboard)")
    
    # Campaign count validation
    print(f"\n=== CAMPAIGN COUNT VALIDATION ===")
    csv_count = len(csv_campaigns)
    dash_count = len(dashboard_campaigns)
    print(f"CSV Campaigns: {csv_count}")
    print(f"Dashboard Campaigns: {dash_count}")
    print(f"Match: {'✅' if csv_count == dash_count else '❌'}")
    
    return csv_campaigns, dashboard_campaigns

if __name__ == "__main__":
    csv_data, dashboard_data = validate_dashboard_data()
    print("\n=== QA COMPLETE ===") 
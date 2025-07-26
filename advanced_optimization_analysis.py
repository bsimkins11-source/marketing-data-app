#!/usr/bin/env python3
"""
ADVANCED OPTIMIZATION ANALYSIS
==============================
Analyze placement, creative, and audience optimization opportunities
"""

import csv
from collections import defaultdict

def load_csv_data():
    """Load and process CSV data"""
    data = []
    with open('sample-campaign-data.csv', 'r') as file:
        reader = csv.DictReader(file)
        for row in reader:
            # Calculate revenue from spend and ROAS
            spend = float(row['spend'])
            roas = float(row['roas'])
            revenue = spend * roas
            
            data.append({
                'platform': row['platform'],
                'campaign_name': row['campaign_name'],
                'ad_group_name': row['ad_group_name'],
                'placement_name': row['placement_name'],
                'creative_name': row['creative_name'],
                'creative_format': row['creative_format'],
                'spend': spend,
                'revenue': revenue,
                'impressions': float(row['impressions']),
                'clicks': float(row['clicks']),
                'conversions': float(row['conversions']),
                'ctr': float(row['clicks']) / float(row['impressions']) if float(row['impressions']) > 0 else 0,
                'roas': roas,
                'cpc': float(row['cpc']) if row['cpc'] else 0,
                'cpm': float(row['cpm']) if row['cpm'] else 0
            })
    return data

def analyze_advanced_optimizations():
    """Analyze advanced optimization opportunities"""
    data = load_csv_data()
    
    print('🔍 ADVANCED OPTIMIZATION ANALYSIS')
    print('=' * 60)
    
    # 1. PLACEMENT ANALYSIS
    print('\n📍 PLACEMENT PERFORMANCE ANALYSIS')
    print('-' * 40)
    
    placement_groups = defaultdict(list)
    for item in data:
        placement_groups[item['placement_name']].append(item)
    
    placement_metrics = {}
    for placement, items in placement_groups.items():
        total_spend = sum(item['spend'] for item in items)
        total_revenue = sum(item['revenue'] for item in items)
        total_impressions = sum(item['impressions'] for item in items)
        total_clicks = sum(item['clicks'] for item in items)
        
        placement_metrics[placement] = {
            'spend': total_spend,
            'revenue': total_revenue,
            'impressions': total_impressions,
            'clicks': total_clicks,
            'roas': total_revenue / total_spend if total_spend > 0 else 0,
            'ctr': total_clicks / total_impressions if total_impressions > 0 else 0,
            'count': len(items)
        }
    
    # Top placements by ROAS
    print('\n🏆 TOP PLACEMENTS BY ROAS:')
    placement_roas = [(placement, metrics['roas']) for placement, metrics in placement_metrics.items() if metrics['spend'] > 1000]  # Filter for meaningful spend
    placement_roas.sort(key=lambda x: x[1], reverse=True)
    for i, (placement, roas) in enumerate(placement_roas[:10], 1):
        spend = placement_metrics[placement]['spend']
        print(f'{i}. {placement}: {roas:.2f}x ROAS (${spend:,.0f} spend)')
    
    # Top placements by CTR
    print('\n🎯 TOP PLACEMENTS BY CTR:')
    placement_ctr = [(placement, metrics['ctr']) for placement, metrics in placement_metrics.items() if metrics['impressions'] > 1000]  # Filter for meaningful impressions
    placement_ctr.sort(key=lambda x: x[1], reverse=True)
    for i, (placement, ctr) in enumerate(placement_ctr[:10], 1):
        impressions = placement_metrics[placement]['impressions']
        print(f'{i}. {placement}: {ctr*100:.2f}% CTR ({impressions:,.0f} impressions)')
    
    # 2. CREATIVE FORMAT ANALYSIS
    print('\n🎨 CREATIVE FORMAT PERFORMANCE')
    print('-' * 40)
    
    format_groups = defaultdict(list)
    for item in data:
        if item['creative_format']:  # Filter out empty formats
            format_groups[item['creative_format']].append(item)
    
    format_metrics = {}
    for format_type, items in format_groups.items():
        total_spend = sum(item['spend'] for item in items)
        total_revenue = sum(item['revenue'] for item in items)
        total_impressions = sum(item['impressions'] for item in items)
        total_clicks = sum(item['clicks'] for item in items)
        
        format_metrics[format_type] = {
            'spend': total_spend,
            'revenue': total_revenue,
            'impressions': total_impressions,
            'clicks': total_clicks,
            'roas': total_revenue / total_spend if total_spend > 0 else 0,
            'ctr': total_clicks / total_impressions if total_impressions > 0 else 0,
            'count': len(items)
        }
    
    print('\n📊 CREATIVE FORMAT PERFORMANCE:')
    for format_type, metrics in format_metrics.items():
        print(f'• {format_type}:')
        print(f'  - ROAS: {metrics["roas"]:.2f}x')
        print(f'  - CTR: {metrics["ctr"]*100:.2f}%')
        print(f'  - Spend: ${metrics["spend"]:,.0f}')
        print(f'  - Campaigns: {metrics["count"]}')
    
    # 3. AD GROUP ANALYSIS (AUDIENCE SEGMENTS)
    print('\n👥 AD GROUP (AUDIENCE) PERFORMANCE')
    print('-' * 40)
    
    adgroup_groups = defaultdict(list)
    for item in data:
        adgroup_groups[item['ad_group_name']].append(item)
    
    adgroup_metrics = {}
    for adgroup, items in adgroup_groups.items():
        total_spend = sum(item['spend'] for item in items)
        total_revenue = sum(item['revenue'] for item in items)
        total_impressions = sum(item['impressions'] for item in items)
        total_clicks = sum(item['clicks'] for item in items)
        
        adgroup_metrics[adgroup] = {
            'spend': total_spend,
            'revenue': total_revenue,
            'impressions': total_impressions,
            'clicks': total_clicks,
            'roas': total_revenue / total_spend if total_spend > 0 else 0,
            'ctr': total_clicks / total_impressions if total_impressions > 0 else 0,
            'count': len(items)
        }
    
    # Top ad groups by ROAS
    print('\n🏆 TOP AD GROUPS BY ROAS:')
    adgroup_roas = [(adgroup, metrics['roas']) for adgroup, metrics in adgroup_metrics.items() if metrics['spend'] > 500]
    adgroup_roas.sort(key=lambda x: x[1], reverse=True)
    for i, (adgroup, roas) in enumerate(adgroup_roas[:10], 1):
        spend = adgroup_metrics[adgroup]['spend']
        print(f'{i}. {adgroup}: {roas:.2f}x ROAS (${spend:,.0f} spend)')
    
    # 4. CREATIVE PERFORMANCE ANALYSIS
    print('\n🎨 INDIVIDUAL CREATIVE PERFORMANCE')
    print('-' * 40)
    
    creative_groups = defaultdict(list)
    for item in data:
        if item['creative_name']:  # Filter out empty creatives
            creative_groups[item['creative_name']].append(item)
    
    creative_metrics = {}
    for creative, items in creative_groups.items():
        total_spend = sum(item['spend'] for item in items)
        total_revenue = sum(item['revenue'] for item in items)
        total_impressions = sum(item['impressions'] for item in items)
        total_clicks = sum(item['clicks'] for item in items)
        
        creative_metrics[creative] = {
            'spend': total_spend,
            'revenue': total_revenue,
            'impressions': total_impressions,
            'clicks': total_clicks,
            'roas': total_revenue / total_spend if total_spend > 0 else 0,
            'ctr': total_clicks / total_impressions if total_impressions > 0 else 0,
            'count': len(items)
        }
    
    # Top creatives by ROAS
    print('\n🏆 TOP CREATIVES BY ROAS:')
    creative_roas = [(creative, metrics['roas']) for creative, metrics in creative_metrics.items() if metrics['spend'] > 100]
    creative_roas.sort(key=lambda x: x[1], reverse=True)
    for i, (creative, roas) in enumerate(creative_roas[:10], 1):
        spend = creative_metrics[creative]['spend']
        print(f'{i}. {creative}: {roas:.2f}x ROAS (${spend:,.0f} spend)')
    
    # 5. OPTIMIZATION RECOMMENDATIONS
    print('\n💡 ADVANCED OPTIMIZATION RECOMMENDATIONS')
    print('=' * 60)
    
    # Placement optimization
    print('\n📍 PLACEMENT OPTIMIZATION:')
    worst_placements = [(placement, metrics['roas']) for placement, metrics in placement_metrics.items() if metrics['spend'] > 1000]
    worst_placements.sort(key=lambda x: x[1])
    print(f'• OPTIMIZE: {worst_placements[0][0]} (ROAS: {worst_placements[0][1]:.2f}x)')
    print(f'• SCALE: {placement_roas[0][0]} (ROAS: {placement_roas[0][1]:.2f}x)')
    
    # Creative format optimization
    print('\n🎨 CREATIVE FORMAT OPTIMIZATION:')
    best_format = max(format_metrics.items(), key=lambda x: x[1]['roas'])
    print(f'• BEST FORMAT: {best_format[0]} (ROAS: {best_format[1]["roas"]:.2f}x)')
    print(f'• RECOMMENDATION: Increase {best_format[0]} creative production')
    
    # Audience optimization
    print('\n👥 AUDIENCE OPTIMIZATION:')
    worst_adgroup = min(adgroup_roas, key=lambda x: x[1])
    best_adgroup = max(adgroup_roas, key=lambda x: x[1])
    print(f'• SCALE: {best_adgroup[0]} (ROAS: {best_adgroup[1]:.2f}x)')
    print(f'• OPTIMIZE: {worst_adgroup[0]} (ROAS: {worst_adgroup[1]:.2f}x)')
    
    # Creative optimization
    print('\n🎨 CREATIVE OPTIMIZATION:')
    worst_creative = min(creative_roas, key=lambda x: x[1])
    best_creative = max(creative_roas, key=lambda x: x[1])
    print(f'• REPLICATE: {best_creative[0]} (ROAS: {best_creative[1]:.2f}x)')
    print(f'• REPLACE: {worst_creative[0]} (ROAS: {worst_creative[1]:.2f}x)')
    
    # Revenue impact calculation
    print('\n📈 POTENTIAL REVENUE IMPACT:')
    total_spend = sum(metrics['spend'] for metrics in placement_metrics.values())
    current_revenue = sum(metrics['revenue'] for metrics in placement_metrics.values())
    
    # If we moved all spend to best placement
    best_placement_roas = placement_roas[0][1]
    potential_revenue = total_spend * best_placement_roas
    revenue_increase = potential_revenue - current_revenue
    
    print(f'• Moving all spend to best placement ({placement_roas[0][0]}):')
    print(f'  - Current revenue: ${current_revenue:,.0f}')
    print(f'  - Potential revenue: ${potential_revenue:,.0f}')
    print(f'  - Revenue increase: ${revenue_increase:,.0f} (+{(revenue_increase/current_revenue)*100:.1f}%)')

if __name__ == "__main__":
    analyze_advanced_optimizations() 
#!/usr/bin/env python3
"""
CAMPAIGN MANAGEMENT ANALYSIS
============================
Analyze campaign health, pacing, optimization patterns, and management quality
"""

import csv
from collections import defaultdict
from datetime import datetime, timedelta

def load_csv_data():
    """Load and process CSV data with dates"""
    data = []
    with open('sample-campaign-data.csv', 'r') as file:
        reader = csv.DictReader(file)
        for row in reader:
            # Calculate revenue from spend and ROAS
            spend = float(row['spend'])
            roas = float(row['roas'])
            revenue = spend * roas
            
            # Parse date
            try:
                date = datetime.strptime(row['date'], '%Y-%m-%d')
            except:
                date = datetime.now()  # Fallback
            
            data.append({
                'date': date,
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

def analyze_campaign_management():
    """Analyze campaign management quality and health"""
    data = load_csv_data()
    
    print('🔍 CAMPAIGN MANAGEMENT ANALYSIS')
    print('=' * 60)
    
    # 1. CAMPAIGN PACING ANALYSIS
    print('\n📅 CAMPAIGN PACING ANALYSIS')
    print('-' * 40)
    
    # Group by campaign and analyze pacing
    campaign_groups = defaultdict(list)
    for item in data:
        campaign_groups[item['campaign_name']].append(item)
    
    pacing_analysis = {}
    for campaign, items in campaign_groups.items():
        if len(items) < 2:
            continue
            
        # Sort by date
        items.sort(key=lambda x: x['date'])
        
        # Calculate daily spend patterns
        daily_spend = defaultdict(float)
        for item in items:
            daily_spend[item['date']] += item['spend']
        
        # Calculate pacing metrics
        total_spend = sum(item['spend'] for item in items)
        date_range = max(item['date'] for item in items) - min(item['date'] for item in items)
        days_active = date_range.days + 1
        avg_daily_spend = total_spend / days_active if days_active > 0 else 0
        
        # Find spending anomalies (days with 0 spend or unusually high spend)
        spend_values = list(daily_spend.values())
        avg_spend = sum(spend_values) / len(spend_values) if spend_values else 0
        spend_std = (sum((x - avg_spend) ** 2 for x in spend_values) / len(spend_values)) ** 0.5 if len(spend_values) > 1 else 0
        
        zero_spend_days = sum(1 for spend in spend_values if spend == 0)
        high_spend_days = sum(1 for spend in spend_values if spend > avg_spend + 2 * spend_std)
        
        pacing_analysis[campaign] = {
            'total_spend': total_spend,
            'days_active': days_active,
            'avg_daily_spend': avg_daily_spend,
            'zero_spend_days': zero_spend_days,
            'high_spend_days': high_spend_days,
            'spend_volatility': spend_std / avg_spend if avg_spend > 0 else 0,
            'pacing_score': 100 - (zero_spend_days * 10) - (high_spend_days * 5)  # Simple scoring
        }
    
    print('\n📊 CAMPAIGN PACING SCORES:')
    for campaign, metrics in pacing_analysis.items():
        print(f'• {campaign}:')
        print(f'  - Pacing Score: {metrics["pacing_score"]}/100')
        print(f'  - Days Active: {metrics["days_active"]}')
        print(f'  - Avg Daily Spend: ${metrics["avg_daily_spend"]:.2f}')
        print(f'  - Zero Spend Days: {metrics["zero_spend_days"]}')
        print(f'  - High Spend Days: {metrics["high_spend_days"]}')
        print(f'  - Spend Volatility: {metrics["spend_volatility"]:.2f}')
    
    # 2. OPTIMIZATION PATTERN ANALYSIS
    print('\n⚡ OPTIMIZATION PATTERN ANALYSIS')
    print('-' * 40)
    
    # Analyze if campaigns show signs of active optimization
    optimization_insights = {}
    for campaign, items in campaign_groups.items():
        if len(items) < 3:
            continue
            
        # Sort by date
        items.sort(key=lambda x: x['date'])
        
        # Calculate performance trends
        early_performance = items[:len(items)//3]  # First third
        late_performance = items[-len(items)//3:]  # Last third
        
        early_avg_roas = sum(item['roas'] for item in early_performance) / len(early_performance)
        late_avg_roas = sum(item['roas'] for item in late_performance) / len(late_performance)
        
        early_avg_ctr = sum(item['ctr'] for item in early_performance) / len(early_performance)
        late_avg_ctr = sum(item['ctr'] for item in late_performance) / len(late_performance)
        
        roas_improvement = ((late_avg_roas - early_avg_roas) / early_avg_roas * 100) if early_avg_roas > 0 else 0
        ctr_improvement = ((late_avg_ctr - early_avg_ctr) / early_avg_ctr * 100) if early_avg_ctr > 0 else 0
        
        # Check for creative rotation (different creatives over time)
        early_creatives = set(item['creative_name'] for item in early_performance)
        late_creatives = set(item['creative_name'] for item in late_performance)
        new_creatives = len(late_creatives - early_creatives)
        
        # Check for placement optimization
        early_placements = set(item['placement_name'] for item in early_performance)
        late_placements = set(item['placement_name'] for item in late_performance)
        placement_changes = len(late_placements - early_placements)
        
        optimization_insights[campaign] = {
            'roas_improvement': roas_improvement,
            'ctr_improvement': ctr_improvement,
            'new_creatives': new_creatives,
            'placement_changes': placement_changes,
            'optimization_score': min(100, max(0, 50 + roas_improvement + ctr_improvement + new_creatives * 10 + placement_changes * 5))
        }
    
    print('\n📈 OPTIMIZATION PERFORMANCE:')
    for campaign, metrics in optimization_insights.items():
        print(f'• {campaign}:')
        print(f'  - Optimization Score: {metrics["optimization_score"]:.0f}/100')
        print(f'  - ROAS Improvement: {metrics["roas_improvement"]:+.1f}%')
        print(f'  - CTR Improvement: {metrics["ctr_improvement"]:+.1f}%')
        print(f'  - New Creatives: {metrics["new_creatives"]}')
        print(f'  - Placement Changes: {metrics["placement_changes"]}')
    
    # 3. ANOMALY DETECTION
    print('\n🚨 ANOMALY DETECTION')
    print('-' * 40)
    
    anomalies = []
    
    # Detect performance anomalies
    all_roas = [item['roas'] for item in data]
    avg_roas = sum(all_roas) / len(all_roas)
    roas_std = (sum((x - avg_roas) ** 2 for x in all_roas) / len(all_roas)) ** 0.5
    
    all_ctr = [item['ctr'] for item in data]
    avg_ctr = sum(all_ctr) / len(all_ctr)
    ctr_std = (sum((x - avg_ctr) ** 2 for x in all_ctr) / len(all_ctr)) ** 0.5
    
    for item in data:
        # ROAS anomalies
        if item['roas'] > avg_roas + 2 * roas_std:
            anomalies.append(f"🚀 EXCEPTIONAL ROAS: {item['campaign_name']} - {item['roas']:.2f}x ROAS on {item['date'].strftime('%Y-%m-%d')}")
        elif item['roas'] < avg_roas - 2 * roas_std and item['roas'] > 0:
            anomalies.append(f"⚠️ POOR ROAS: {item['campaign_name']} - {item['roas']:.2f}x ROAS on {item['date'].strftime('%Y-%m-%d')}")
        
        # CTR anomalies
        if item['ctr'] > avg_ctr + 2 * ctr_std:
            anomalies.append(f"🎯 EXCEPTIONAL CTR: {item['campaign_name']} - {item['ctr']*100:.2f}% CTR on {item['date'].strftime('%Y-%m-%d')}")
        elif item['ctr'] < avg_ctr - 2 * ctr_std and item['ctr'] > 0:
            anomalies.append(f"📉 POOR CTR: {item['campaign_name']} - {item['ctr']*100:.2f}% CTR on {item['date'].strftime('%Y-%m-%d')}")
    
    # Detect spending anomalies
    daily_spend_total = defaultdict(float)
    for item in data:
        daily_spend_total[item['date']] += item['spend']
    
    spend_values = list(daily_spend_total.values())
    avg_daily_spend = sum(spend_values) / len(spend_values)
    spend_std = (sum((x - avg_daily_spend) ** 2 for x in spend_values) / len(spend_values)) ** 0.5
    
    for date, spend in daily_spend_total.items():
        if spend > avg_daily_spend + 2 * spend_std:
            anomalies.append(f"💰 HIGH SPEND DAY: ${spend:.0f} on {date.strftime('%Y-%m-%d')} (vs avg ${avg_daily_spend:.0f})")
        elif spend < avg_daily_spend - 2 * spend_std:
            anomalies.append(f"💸 LOW SPEND DAY: ${spend:.0f} on {date.strftime('%Y-%m-%d')} (vs avg ${avg_daily_spend:.0f})")
    
    print('\n🚨 DETECTED ANOMALIES:')
    if anomalies:
        for anomaly in anomalies[:10]:  # Show top 10
            print(f'• {anomaly}')
    else:
        print('• No significant anomalies detected')
    
    # 4. CAMPAIGN MANAGEMENT QUALITY ASSESSMENT
    print('\n📋 CAMPAIGN MANAGEMENT QUALITY ASSESSMENT')
    print('=' * 60)
    
    # Overall assessment
    avg_pacing_score = sum(metrics['pacing_score'] for metrics in pacing_analysis.values()) / len(pacing_analysis) if pacing_analysis else 0
    avg_optimization_score = sum(metrics['optimization_score'] for metrics in optimization_insights.values()) / len(optimization_insights) if optimization_insights else 0
    
    print(f'\n📊 OVERALL MANAGEMENT SCORES:')
    print(f'• Pacing Quality: {avg_pacing_score:.0f}/100')
    print(f'• Optimization Quality: {avg_optimization_score:.0f}/100')
    print(f'• Overall Management Score: {(avg_pacing_score + avg_optimization_score) / 2:.0f}/100')
    
    # Management recommendations
    print(f'\n💡 MANAGEMENT RECOMMENDATIONS:')
    
    if avg_pacing_score < 70:
        print('• ⚠️ PACING ISSUES: Campaigns show inconsistent daily spend patterns')
        print('  - Implement daily budget pacing controls')
        print('  - Set up automated alerts for zero-spend days')
        print('  - Review campaign scheduling and budget allocation')
    
    if avg_optimization_score < 70:
        print('• ⚠️ OPTIMIZATION GAPS: Limited evidence of active campaign optimization')
        print('  - Implement weekly performance reviews')
        print('  - Test new creatives more frequently')
        print('  - Optimize underperforming placements')
        print('  - Scale high-performing audience segments')
    
    if len(anomalies) > 5:
        print('• ⚠️ ANOMALY MANAGEMENT: Multiple performance anomalies detected')
        print('  - Set up real-time monitoring alerts')
        print('  - Implement automated pause rules for poor performers')
        print('  - Create escalation procedures for exceptional performance')
    
    # Best and worst managed campaigns
    if pacing_analysis and optimization_insights:
        best_managed = max(pacing_analysis.keys(), key=lambda x: pacing_analysis[x]['pacing_score'] + optimization_insights.get(x, {}).get('optimization_score', 0))
        worst_managed = min(pacing_analysis.keys(), key=lambda x: pacing_analysis[x]['pacing_score'] + optimization_insights.get(x, {}).get('optimization_score', 0))
        
        print(f'\n🏆 BEST MANAGED CAMPAIGN: {best_managed}')
        print(f'📉 NEEDS ATTENTION: {worst_managed}')
    
    # Campaign health summary
    healthy_campaigns = sum(1 for metrics in pacing_analysis.values() if metrics['pacing_score'] > 80 and optimization_insights.get(list(pacing_analysis.keys())[list(pacing_analysis.values()).index(metrics)], {}).get('optimization_score', 0) > 80)
    total_campaigns = len(pacing_analysis)
    
    print(f'\n🏥 CAMPAIGN HEALTH SUMMARY:')
    print(f'• Healthy Campaigns: {healthy_campaigns}/{total_campaigns} ({healthy_campaigns/total_campaigns*100:.0f}%)')
    print(f'• Campaigns Needing Attention: {total_campaigns - healthy_campaigns}/{total_campaigns} ({(total_campaigns - healthy_campaigns)/total_campaigns*100:.0f}%)')

if __name__ == "__main__":
    analyze_campaign_management() 
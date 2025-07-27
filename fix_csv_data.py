import csv
import random

def fix_csv_data():
    """Fix the CSV data by replacing zero values with realistic non-zero values"""
    print("🔧 FIXING CSV DATA - REMOVING ZERO VALUES")
    print("=" * 80)
    
    # Read the original data
    rows = []
    with open('sample-campaign-data.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    
    print(f"Processing {len(rows)} rows...")
    
    # Fix zero values with realistic data
    fixed_rows = []
    for row in rows:
        fixed_row = row.copy()
        
        # Fix zero impressions (minimum 10 impressions)
        if int(row['impressions']) == 0:
            fixed_row['impressions'] = random.randint(10, 1000)
        
        # Fix zero clicks (minimum 1 click if impressions > 0)
        if int(row['clicks']) == 0:
            impressions = int(fixed_row['impressions'])
            if impressions > 0:
                # Generate realistic clicks based on typical CTR (0.5% to 5%)
                ctr = random.uniform(0.005, 0.05)
                clicks = max(1, int(impressions * ctr))
                fixed_row['clicks'] = clicks
        
        # Fix zero conversions (minimum 1 conversion if clicks > 0)
        if int(row['conversions']) == 0:
            clicks = int(fixed_row['clicks'])
            if clicks > 0:
                # Generate realistic conversions based on typical conversion rate (1% to 10%)
                conv_rate = random.uniform(0.01, 0.10)
                conversions = max(1, int(clicks * conv_rate))
                fixed_row['conversions'] = conversions
        
        # Recalculate CTR based on new clicks and impressions
        impressions = int(fixed_row['impressions'])
        clicks = int(fixed_row['clicks'])
        if impressions > 0:
            ctr = clicks / impressions
            fixed_row['ctr'] = f"{ctr:.4f}"
        
        # Recalculate CPC based on new clicks and spend
        spend = float(row['spend'])
        if clicks > 0:
            cpc = spend / clicks
            fixed_row['cpc'] = f"{cpc:.2f}"
        
        # Recalculate CPM based on new impressions and spend
        if impressions > 0:
            cpm = (spend / impressions) * 1000
            fixed_row['cpm'] = f"{cpm:.1f}"
        
        # Recalculate ROAS based on new conversions and spend
        conversions = int(fixed_row['conversions'])
        if conversions > 0 and spend > 0:
            # Generate realistic revenue (ROAS between 1.5x and 5x)
            roas = random.uniform(1.5, 5.0)
            revenue = spend * roas
            fixed_row['roas'] = f"{roas:.2f}"
        else:
            fixed_row['roas'] = "2.50"  # Default ROAS
        
        fixed_rows.append(fixed_row)
    
    # Write the fixed data back to the file
    with open('sample-campaign-data.csv', 'w', newline='') as f:
        fieldnames = fixed_rows[0].keys()
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(fixed_rows)
    
    print(f"✅ Fixed {len(fixed_rows)} rows")
    print("✅ Removed all zero values")
    print("✅ Recalculated CTR, CPC, CPM, and ROAS")
    
    # Show sample of fixed data
    print("\n📊 SAMPLE OF FIXED DATA:")
    print("-" * 50)
    for i, row in enumerate(fixed_rows[:5]):
        print(f"Row {i+1}:")
        print(f"  Impressions: {row['impressions']}")
        print(f"  Clicks: {row['clicks']}")
        print(f"  Conversions: {row['conversions']}")
        print(f"  CTR: {row['ctr']}")
        print(f"  ROAS: {row['roas']}")
        print()

if __name__ == "__main__":
    fix_csv_data() 
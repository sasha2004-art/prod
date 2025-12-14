import pandas as pd
import json

# Read the CSV
df = pd.read_csv(r'c:\Users\user\Documents\prod\datadatarass.csv')

# Filter valid rows
df = df.dropna(subset=['пятерочки', 'выручка'])

# Create scatter data list
scatter_data = df[['пятерочки', 'выручка']].rename(columns={'пятерочки': 'x', 'выручка': 'y'}).to_dict(orient='records')

# Write to JS file
js_content = f"const revenueScatterData = {json.dumps(scatter_data)};"
print(f"Data length: {len(scatter_data)}")
print(f"Content preview: {js_content[:100]}")

with open(r'c:\Users\user\Documents\prod\js\revenue_scatter_data.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print("Successfully generated js/revenue_scatter_data.js")

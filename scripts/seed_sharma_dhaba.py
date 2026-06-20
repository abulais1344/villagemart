#!/usr/bin/env python3
"""Seed 12 food menu items for Sharma Dhaba into vm_products."""

import json
import os
import urllib.request
import urllib.parse

# ── Load credentials from .env.local ────────────────────────────────────────
env_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
env = {}
with open(env_path) as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, _, v = line.partition('=')
            env[k.strip()] = v.strip()

SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'].rstrip('/')
SERVICE_KEY  = env['SUPABASE_SERVICE_ROLE_KEY']

HEADERS = {
    'apikey':        SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}',
    'Content-Type':  'application/json',
    'Prefer':        'return=representation',
}


def sb_get(path: str, params: dict) -> list:
    qs = urllib.parse.urlencode(params)
    url = f'{SUPABASE_URL}/rest/v1/{path}?{qs}'
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def sb_post(path: str, body) -> list:
    data = json.dumps(body).encode()
    url = f'{SUPABASE_URL}/rest/v1/{path}'
    req = urllib.request.Request(url, data=data, headers=HEADERS, method='POST')
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


# ── Step 1: Find Sharma Dhaba merchant ID ───────────────────────────────────
print('Looking up Sharma Dhaba...')
rows = sb_get('merchants', {'store_name': 'eq.Sharma Dhaba', 'select': 'id,store_name', 'limit': '5'})
if not rows:
    # Try a broader search in case the name differs slightly
    rows = sb_get('merchants', {'store_name': 'ilike.*Sharma*', 'select': 'id,store_name', 'limit': '5'})
if not rows:
    print('ERROR: No merchant found matching "Sharma Dhaba". Merchants in DB:')
    all_m = sb_get('merchants', {'select': 'id,store_name', 'limit': '20'})
    for m in all_m:
        print(f"  {m['id']}  {m['store_name']}")
    raise SystemExit(1)

merchant = rows[0]
MERCHANT_ID = merchant['id']
print(f'  ✓ Found: {merchant["store_name"]}  id={MERCHANT_ID}')


# ── Step 2: Find "Restaurants & Dhabas" category ID ─────────────────────────
print('Looking up restaurants category...')
cat_rows = sb_get('categories', {'slug': 'eq.restaurants', 'select': 'id,name,slug', 'limit': '1'})
if not cat_rows:
    # Try common alternative slugs
    for slug in ('restaurants-dhabas', 'food', 'restaurant'):
        cat_rows = sb_get('categories', {'slug': f'eq.{slug}', 'select': 'id,name,slug', 'limit': '1'})
        if cat_rows:
            break
if not cat_rows:
    print('ERROR: No category found for restaurants. Categories in DB:')
    all_c = sb_get('categories', {'select': 'id,name,slug', 'limit': '30'})
    for c in all_c:
        print(f"  {c['id']}  {c['slug']}  {c['name']}")
    raise SystemExit(1)

category = cat_rows[0]
CATEGORY_ID = category['id']
print(f'  ✓ Found: {category["name"]}  id={CATEGORY_ID}')


# ── Step 3: Build menu items ─────────────────────────────────────────────────
ITEMS = [
    {'name': 'Dal Tadka',           'selling_price': 60,  'mrp': 70,  'unit': 'bowl',  'stock_quantity': 50,  'description': 'Creamy yellow dal tempered with ghee, cumin and garlic.'},
    {'name': 'Roti (2 pcs)',        'selling_price': 20,  'mrp': 20,  'unit': 'piece', 'stock_quantity': 100, 'description': 'Fresh wheat rotis made on tawa.'},
    {'name': 'Sabzi of the Day',    'selling_price': 55,  'mrp': 65,  'unit': 'bowl',  'stock_quantity': 30,  'description': 'Seasonal fresh vegetable curry.'},
    {'name': 'Rice (Plain)',        'selling_price': 40,  'mrp': 40,  'unit': 'plate', 'stock_quantity': 50,  'description': 'Steamed basmati rice.'},
    {'name': 'Dal Rice Combo',      'selling_price': 90,  'mrp': 110, 'unit': 'plate', 'stock_quantity': 30,  'description': 'Dal Tadka + steamed rice — a complete meal.'},
    {'name': 'Roti Sabzi Combo',    'selling_price': 80,  'mrp': 100, 'unit': 'plate', 'stock_quantity': 30,  'description': '2 rotis + sabzi of the day.'},
    {'name': 'Thali (Full)',        'selling_price': 130, 'mrp': 160, 'unit': 'plate', 'stock_quantity': 20,  'description': 'Dal, sabzi, roti (2), rice, papad & pickle.'},
    {'name': 'Poha',                'selling_price': 30,  'mrp': 35,  'unit': 'plate', 'stock_quantity': 40,  'description': 'Breakfast special — flattened rice with onion, peanuts and curry leaves.'},
    {'name': 'Chai',                'selling_price': 15,  'mrp': 15,  'unit': 'cup',   'stock_quantity': 200, 'description': 'Classic milk tea.'},
    {'name': 'Lassi (Sweet)',       'selling_price': 40,  'mrp': 50,  'unit': 'glass', 'stock_quantity': 30,  'description': 'Chilled sweet lassi made with fresh curd.'},
    {'name': 'Masala Chai',         'selling_price': 20,  'mrp': 20,  'unit': 'cup',   'stock_quantity': 200, 'description': 'Ginger, cardamom and spice tea.'},
    {'name': 'Jeera Rice',          'selling_price': 55,  'mrp': 65,  'unit': 'plate', 'stock_quantity': 40,  'description': 'Basmati rice tempered with ghee and cumin seeds.'},
]

records = []
for item in ITEMS:
    offer_pct = round((1 - item['selling_price'] / item['mrp']) * 100, 2) if item['mrp'] > item['selling_price'] else 0
    records.append({
        'merchant_id':       MERCHANT_ID,
        'category_id':       CATEGORY_ID,
        'name':              item['name'],
        'description':       item['description'],
        'selling_price':     item['selling_price'],
        'mrp':               item['mrp'],
        'unit':              item['unit'],
        'stock_quantity':    item['stock_quantity'],
        'stock_status':      'in_stock',
        'is_active':         True,
        'is_featured':       True,
        'offer_percentage':  offer_pct,
        'images':            [],
        'sku':               f'SHARMA-{item["name"].upper().replace(" ", "-")[:20]}',
    })


# ── Step 4: Insert ────────────────────────────────────────────────────────────
print(f'\nInserting {len(records)} menu items...')
inserted = sb_post('vm_products', records)
print(f'  ✓ Inserted {len(inserted)} products\n')
for p in inserted:
    print(f"  {p['name']:30s}  ₹{p['selling_price']:>4}  id={p['id']}")

print('\nDone! Sharma Dhaba menu is live.')

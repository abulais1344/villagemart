-- Add emoji column to categories table
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS emoji TEXT;

-- Set default emojis for existing categories
UPDATE categories SET emoji = '🥛' WHERE slug IN ('dairy', 'milk') AND emoji IS NULL;
UPDATE categories SET emoji = '🍞' WHERE slug IN ('bread-bakery', 'bread') AND emoji IS NULL;
UPDATE categories SET emoji = '🥚' WHERE slug = 'eggs' AND emoji IS NULL;
UPDATE categories SET emoji = '🥬' WHERE slug IN ('fruits-vegetables', 'vegetables') AND emoji IS NULL;
UPDATE categories SET emoji = '🛒' WHERE slug = 'groceries' AND emoji IS NULL;
UPDATE categories SET emoji = '🍪' WHERE slug = 'snacks' AND emoji IS NULL;
UPDATE categories SET emoji = '🏠' WHERE slug = 'household' AND emoji IS NULL;
UPDATE categories SET emoji = '🧴' WHERE slug = 'personal-care' AND emoji IS NULL;
UPDATE categories SET emoji = '👶' WHERE slug = 'baby-care' AND emoji IS NULL;
UPDATE categories SET emoji = '📦' WHERE slug IN ('cold-drinks', 'beverages') AND emoji IS NULL;
UPDATE categories SET emoji = '📦' WHERE slug IN ('frozen-instant', 'frozen-foods') AND emoji IS NULL;
UPDATE categories SET emoji = '🍛' WHERE slug IN ('restaurants', 'restaurants-dhabas') AND emoji IS NULL;
UPDATE categories SET emoji = '💊' WHERE slug IN ('medicine', 'medicines') AND emoji IS NULL;

-- Fallback for any remaining categories without an emoji
UPDATE categories SET emoji = '📦' WHERE emoji IS NULL;

-- Insert new inactive categories (enable from admin once products are added)
INSERT INTO categories (name, slug, emoji, sort_order, is_active)
VALUES
  ('Learning Toys',          'learning-toys',        '🧸', 13, false),
  ('Kids Clothes',           'kids-clothes',          '👗', 14, false),
  ('Car & Bike Accessories', 'car-bike-accessories',  '🚗', 15, false)
ON CONFLICT (slug) DO NOTHING;

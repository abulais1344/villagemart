-- Reclassify Shoeb Chicken Store and Khawwa & Paneer Store
-- Run after deploying the code changes that add these merchant_type values.

update merchants
  set merchant_type = 'chicken_mutton'
  where store_name = 'Shoeb Chicken Store';

update merchants
  set merchant_type = 'khawa_paneer',
      cuisine_type  = '🧀 Khawa & Paneer'
  where store_name = 'Khawwa & Paneer Store';

-- Approve both when ready (run separately once each merchant is set up):
-- update merchants set status = 'approved' where store_name = 'Shoeb Chicken Store';
-- update merchants set status = 'approved' where store_name = 'Khawwa & Paneer Store';

-- Rollback for 0018. Restores the exact values read from the production
-- database immediately before deletion (2026-09-29), in case something is
-- later found to still depend on them.
INSERT INTO settings (key, value) VALUES
  ('defaultMachine', 'Profitec Go'),
  ('defaultGrinder', 'Eureka Mignon Magnifico'),
  ('defaultRegularGrinder', 'Eureka Mignon Magnifico'),
  ('defaultBasket', 'Profitec Go Stock Basket'),
  ('defaultBasketSize', 'Profitec Go Stock Basket'),
  ('defaultPuckScreen', 'Normcore — 58mm — diameter: 58.5 — thickness: 1.7')
ON CONFLICT (key) DO NOTHING;

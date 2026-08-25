-- grinder_initial_output_for_charts was a personal Airtable chart-display
-- helper (narrowed the y-axis for grinder output's typical ~2g spread) — a
-- pure formula of Initial Output (g) / initial_grind_weight, never an
-- independent input. Safe to drop: no data loss, since initial_grind_weight
-- remains the canonical field it was derived from.
ALTER TABLE shots
  DROP COLUMN IF EXISTS grinder_initial_output_for_charts;

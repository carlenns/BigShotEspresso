BEGIN;

CREATE TABLE IF NOT EXISTS beans (
  id serial PRIMARY KEY,
  name text NOT NULL,
  origin text,
  region text,
  roaster text,
  roast_level text,
  process text,
  variety text,
  altitude text,
  roaster_notes text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  airtable_record_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS grinders (
  id serial PRIMARY KEY,
  name text NOT NULL,
  brand text,
  model text,
  type text,
  burr_size text,
  burr_type text,
  adjustment_type text,
  grind_setting_precision integer,
  grind_step_increment real,
  is_default boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS machines (
  id serial PRIMARY KEY,
  name text NOT NULL,
  brand text,
  model text,
  brew_method text,
  stock_basket text,
  is_default boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accessories (
  id serial PRIMARY KEY,
  type text NOT NULL,
  brand text,
  model text,
  size text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  specs jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
  id serial PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bags (
  id serial PRIMARY KEY,
  bean_id integer REFERENCES beans(id),
  bag_number text,
  bag_name text,
  purchase_date text,
  roast_date text,
  opened_date text,
  closed_out_date text,
  bag_weight real,
  remaining_estimate real,
  cost real,
  is_active boolean NOT NULL DEFAULT false,
  start_grind_setting real,
  current_grind_setting real,
  start_grind_time real,
  current_grind_time real,
  default_dose real,
  default_yield real,
  default_temp integer,
  dial_in_notes text,
  notes text,
  airtable_record_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hoppers (
  id serial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  bag_id integer REFERENCES bags(id),
  starting_beans real,
  is_active boolean NOT NULL DEFAULT false,
  hopper_mass real,
  hopper_percent real,
  shots_left_estimate real,
  phase text,
  notes text,
  airtable_record_id text UNIQUE,
  raw_row jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS one_active_hopper_per_bag
  ON hoppers (bag_id)
  WHERE is_active = true;

CREATE TABLE IF NOT EXISTS hopper_range_baselines (
  id serial PRIMARY KEY,
  hopper_range text NOT NULL UNIQUE,
  baseline_output_adjusted_date date,
  baseline_output_status text,
  baseline_output real,
  avg_initial_output real,
  observation_count integer,
  airtable_record_id text UNIQUE,
  raw_row jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shots (
  id serial PRIMARY KEY,
  shot_date text NOT NULL,
  bag_id integer REFERENCES bags(id),
  bean text,
  bag text,
  grinder_id integer REFERENCES grinders(id),
  machine_id integer REFERENCES machines(id),
  hopper_id integer REFERENCES hoppers(id),
  hopper_range_baseline_id integer REFERENCES hopper_range_baselines(id),
  bag_label text,
  days_since_open integer,
  grind_setting real,
  grind_time real,
  initial_grind_weight real,
  total_output real,
  dose real,
  time_adj real,
  top_up_grind real,
  over_grind_removed real,
  bean_delta real,
  grind_waste real,
  beans_added real,
  dose_correction_type text,
  dose_correction real,
  output_delta real,
  yield real,
  ratio text,
  temperature integer,
  pour_delay integer,
  pour_time integer,
  flow_time integer,
  rating real,
  preference_rating real,
  rating_difference real,
  avg_weighted_rating real,
  rated boolean,
  is_for_others boolean,
  is_reference boolean NOT NULL DEFAULT false,
  signature_shot boolean,
  sour_shot boolean,
  boundary_shot boolean,
  bean_achievement text[],
  drink_type text,
  status text,
  shot_classification text[],
  fault_status text[],
  reference_type text,
  expression_style text[],
  daily_driver_count integer,
  include_in_analysis boolean DEFAULT true,
  important_to_intelligence boolean,
  intelligence_lesson_type text[],
  notes text,
  fault_notes text,
  bag_opened_date text,
  hopper_phase text,
  hopper_fullness real,
  hopper_percent real,
  hopper_range text,
  taste_zone text,
  zone text,
  zone_score integer,
  taste_score integer,
  agreement_percent real,
  flow_score real,
  model_flag text,
  time_gap integer,
  scale_zone text,
  flow_diagnostic text,
  pour_delay_window text,
  flow_time_window text,
  flow_time_offset real,
  drift_delta real,
  shot_drift_status text,
  shot_quality_score real,
  shot_tier text,
  perfect_range_flag text,
  drift_warning text,
  hopper_zone text,
  hopper_drift_link text,
  hopper_impact_score real,
  hopper_correction_rule text,
  action_suggestion text,
  scale_calibration_reminder text,
  bag_calibration_reminder text,
  calculation text,
  baseline_unaided_output real,
  baseline_output_delta real,
  actual_dose_error real,
  hopper_threshold_flag text,
  hopper_behaviour text,
  hopper_severity text,
  top_up_gap real,
  top_up_recommendation text,
  grinder_initial_output_for_charts real,
  import_fingerprint text UNIQUE,
  grind_adjusted text,
  shots_left_est real,
  finished_shot boolean,
  sensory_notes text,
  airtable_record_id text UNIQUE,
  raw_row jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS shots_import_fingerprint_unique
  ON shots (import_fingerprint)
  WHERE import_fingerprint IS NOT NULL;

CREATE INDEX IF NOT EXISTS shots_analysis_bag_date_idx
  ON shots (bag_id, shot_date DESC)
  WHERE include_in_analysis = true;

CREATE INDEX IF NOT EXISTS shots_analysis_reference_bag_idx
  ON shots (bag_id, is_reference)
  WHERE include_in_analysis = true;

CREATE TABLE IF NOT EXISTS taste_selectors (
  id serial PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'custom',
  is_default boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shot_taste_selectors (
  shot_id integer NOT NULL REFERENCES shots(id) ON DELETE CASCADE,
  taste_selector_id integer NOT NULL REFERENCES taste_selectors(id) ON DELETE CASCADE,
  PRIMARY KEY (shot_id, taste_selector_id)
);

CREATE TABLE IF NOT EXISTS airtable_sync_evidence (
  id serial PRIMARY KEY,
  source_table text NOT NULL,
  source_record_id text NOT NULL,
  source_created_time timestamptz,
  fields jsonb NOT NULL,
  content_hash text NOT NULL,
  synced_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS airtable_sync_evidence_record_hash_unique
  ON airtable_sync_evidence (source_table, source_record_id, content_hash);

COMMIT;

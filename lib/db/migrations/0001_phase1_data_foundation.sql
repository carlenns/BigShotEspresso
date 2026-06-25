BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shots' AND column_name = 'scale_time'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shots' AND column_name = 'flow_time'
  ) THEN
    ALTER TABLE shots RENAME COLUMN scale_time TO flow_time;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shots' AND column_name = 'scale_time'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shots' AND column_name = 'flow_time'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM shots
      WHERE scale_time IS NOT NULL
        AND flow_time IS NOT NULL
        AND scale_time IS DISTINCT FROM flow_time
    ) THEN
      RAISE EXCEPTION 'Cannot reconcile shots.scale_time and shots.flow_time because conflicting values exist';
    END IF;
    UPDATE shots SET flow_time = COALESCE(flow_time, scale_time);
    ALTER TABLE shots DROP COLUMN scale_time;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shots' AND column_name = 'flow_time'
  ) THEN
    RAISE EXCEPTION 'Neither shots.scale_time nor shots.flow_time exists';
  END IF;
END $$;

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

CREATE TABLE IF NOT EXISTS airtable_sync_evidence (
  id serial PRIMARY KEY,
  source_table text NOT NULL,
  source_record_id text NOT NULL,
  source_created_time timestamptz,
  fields jsonb NOT NULL,
  content_hash text NOT NULL,
  synced_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT airtable_sync_evidence_record_hash_unique
    UNIQUE (source_table, source_record_id, content_hash)
);

ALTER TABLE shots
  ADD COLUMN IF NOT EXISTS hopper_id integer REFERENCES hoppers(id),
  ADD COLUMN IF NOT EXISTS hopper_range_baseline_id integer REFERENCES hopper_range_baselines(id),
  ADD COLUMN IF NOT EXISTS bag_label text,
  ADD COLUMN IF NOT EXISTS days_since_open integer,
  ADD COLUMN IF NOT EXISTS boundary_shot boolean,
  ADD COLUMN IF NOT EXISTS important_to_intelligence boolean,
  ADD COLUMN IF NOT EXISTS intelligence_lesson_type text[],
  ADD COLUMN IF NOT EXISTS hopper_fullness real,
  ADD COLUMN IF NOT EXISTS hopper_percent real,
  ADD COLUMN IF NOT EXISTS hopper_range text,
  ADD COLUMN IF NOT EXISTS taste_zone text,
  ADD COLUMN IF NOT EXISTS zone text,
  ADD COLUMN IF NOT EXISTS zone_score integer,
  ADD COLUMN IF NOT EXISTS taste_score integer,
  ADD COLUMN IF NOT EXISTS agreement_percent real,
  ADD COLUMN IF NOT EXISTS flow_score real,
  ADD COLUMN IF NOT EXISTS model_flag text,
  ADD COLUMN IF NOT EXISTS time_gap integer,
  ADD COLUMN IF NOT EXISTS scale_zone text,
  ADD COLUMN IF NOT EXISTS flow_diagnostic text,
  ADD COLUMN IF NOT EXISTS pour_delay_window text,
  ADD COLUMN IF NOT EXISTS flow_time_window text,
  ADD COLUMN IF NOT EXISTS flow_time_offset real,
  ADD COLUMN IF NOT EXISTS drift_delta real,
  ADD COLUMN IF NOT EXISTS shot_drift_status text,
  ADD COLUMN IF NOT EXISTS shot_quality_score real,
  ADD COLUMN IF NOT EXISTS shot_tier text,
  ADD COLUMN IF NOT EXISTS perfect_range_flag text,
  ADD COLUMN IF NOT EXISTS drift_warning text,
  ADD COLUMN IF NOT EXISTS hopper_zone text,
  ADD COLUMN IF NOT EXISTS hopper_drift_link text,
  ADD COLUMN IF NOT EXISTS hopper_impact_score real,
  ADD COLUMN IF NOT EXISTS hopper_correction_rule text,
  ADD COLUMN IF NOT EXISTS action_suggestion text,
  ADD COLUMN IF NOT EXISTS scale_calibration_reminder text,
  ADD COLUMN IF NOT EXISTS bag_calibration_reminder text,
  ADD COLUMN IF NOT EXISTS calculation text,
  ADD COLUMN IF NOT EXISTS baseline_unaided_output real,
  ADD COLUMN IF NOT EXISTS baseline_output_delta real,
  ADD COLUMN IF NOT EXISTS actual_dose_error real,
  ADD COLUMN IF NOT EXISTS hopper_threshold_flag text,
  ADD COLUMN IF NOT EXISTS hopper_behaviour text,
  ADD COLUMN IF NOT EXISTS hopper_severity text,
  ADD COLUMN IF NOT EXISTS top_up_gap real,
  ADD COLUMN IF NOT EXISTS top_up_recommendation text,
  ADD COLUMN IF NOT EXISTS grinder_initial_output_for_charts real,
  ADD COLUMN IF NOT EXISTS import_fingerprint text;

DO $$
DECLARE
  target_column text;
BEGIN
  FOREACH target_column IN ARRAY ARRAY[
    'fault_status',
    'shot_classification',
    'bean_achievement',
    'expression_style'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'shots'
        AND information_schema.columns.column_name = target_column
        AND data_type = 'text'
    ) THEN
      EXECUTE format(
        'ALTER TABLE shots ALTER COLUMN %I TYPE text[] USING CASE WHEN %I IS NULL OR btrim(%I) = '''' THEN NULL ELSE ARRAY[%I] END',
        target_column,
        target_column,
        target_column,
        target_column
      );
    END IF;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS shots_import_fingerprint_unique
  ON shots (import_fingerprint)
  WHERE import_fingerprint IS NOT NULL;

CREATE INDEX IF NOT EXISTS shots_analysis_bag_date_idx
  ON shots (bag_id, shot_date DESC)
  WHERE include_in_analysis = true;

CREATE INDEX IF NOT EXISTS shots_analysis_reference_bag_idx
  ON shots (bag_id, is_reference)
  WHERE include_in_analysis = true;

UPDATE shots
SET include_in_analysis = true
WHERE airtable_record_id IS NULL
  AND include_in_analysis IS NULL;

ALTER TABLE shots
  ALTER COLUMN include_in_analysis SET DEFAULT true;

COMMIT;

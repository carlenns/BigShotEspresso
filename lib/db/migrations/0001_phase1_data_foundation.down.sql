BEGIN;

DROP INDEX IF EXISTS shots_analysis_reference_bag_idx;
DROP INDEX IF EXISTS shots_analysis_bag_date_idx;
DROP INDEX IF EXISTS shots_import_fingerprint_unique;

ALTER TABLE shots
  ALTER COLUMN include_in_analysis DROP DEFAULT;

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
        AND data_type = 'ARRAY'
    ) THEN
      EXECUTE format(
        'ALTER TABLE shots ALTER COLUMN %I TYPE text USING array_to_string(%I, '','')',
        target_column,
        target_column
      );
    END IF;
  END LOOP;
END $$;

ALTER TABLE shots
  DROP COLUMN IF EXISTS hopper_id,
  DROP COLUMN IF EXISTS hopper_range_baseline_id,
  DROP COLUMN IF EXISTS bag_label,
  DROP COLUMN IF EXISTS days_since_open,
  DROP COLUMN IF EXISTS boundary_shot,
  DROP COLUMN IF EXISTS important_to_intelligence,
  DROP COLUMN IF EXISTS intelligence_lesson_type,
  DROP COLUMN IF EXISTS hopper_fullness,
  DROP COLUMN IF EXISTS hopper_percent,
  DROP COLUMN IF EXISTS hopper_range,
  DROP COLUMN IF EXISTS taste_zone,
  DROP COLUMN IF EXISTS zone,
  DROP COLUMN IF EXISTS zone_score,
  DROP COLUMN IF EXISTS taste_score,
  DROP COLUMN IF EXISTS agreement_percent,
  DROP COLUMN IF EXISTS flow_score,
  DROP COLUMN IF EXISTS model_flag,
  DROP COLUMN IF EXISTS time_gap,
  DROP COLUMN IF EXISTS scale_zone,
  DROP COLUMN IF EXISTS flow_diagnostic,
  DROP COLUMN IF EXISTS pour_delay_window,
  DROP COLUMN IF EXISTS flow_time_window,
  DROP COLUMN IF EXISTS flow_time_offset,
  DROP COLUMN IF EXISTS drift_delta,
  DROP COLUMN IF EXISTS shot_drift_status,
  DROP COLUMN IF EXISTS shot_quality_score,
  DROP COLUMN IF EXISTS shot_tier,
  DROP COLUMN IF EXISTS perfect_range_flag,
  DROP COLUMN IF EXISTS drift_warning,
  DROP COLUMN IF EXISTS hopper_zone,
  DROP COLUMN IF EXISTS hopper_drift_link,
  DROP COLUMN IF EXISTS hopper_impact_score,
  DROP COLUMN IF EXISTS hopper_correction_rule,
  DROP COLUMN IF EXISTS action_suggestion,
  DROP COLUMN IF EXISTS scale_calibration_reminder,
  DROP COLUMN IF EXISTS bag_calibration_reminder,
  DROP COLUMN IF EXISTS calculation,
  DROP COLUMN IF EXISTS baseline_unaided_output,
  DROP COLUMN IF EXISTS baseline_output_delta,
  DROP COLUMN IF EXISTS actual_dose_error,
  DROP COLUMN IF EXISTS hopper_threshold_flag,
  DROP COLUMN IF EXISTS hopper_behaviour,
  DROP COLUMN IF EXISTS hopper_severity,
  DROP COLUMN IF EXISTS top_up_gap,
  DROP COLUMN IF EXISTS top_up_recommendation,
  DROP COLUMN IF EXISTS grinder_initial_output_for_charts,
  DROP COLUMN IF EXISTS import_fingerprint;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shots' AND column_name = 'flow_time'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shots' AND column_name = 'scale_time'
  ) THEN
    ALTER TABLE shots RENAME COLUMN flow_time TO scale_time;
  END IF;
END $$;

DROP TABLE IF EXISTS airtable_sync_evidence;
DROP TABLE IF EXISTS hopper_range_baselines;
DROP TABLE IF EXISTS hoppers;

COMMIT;

import type {
  Hopper,
  HopperRangeBaseline,
  Shot,
} from "@workspace/db/schema";

export function toShotApi(shot: Shot) {
  const {
    airtableRecordId: _airtableRecordId,
    rawRow: _rawRow,
    importFingerprint: _importFingerprint,
    ...response
  } = shot;
  return response;
}

export function toHopperApi(hopper: Hopper) {
  const {
    airtableRecordId: _airtableRecordId,
    rawRow: _rawRow,
    ...response
  } = hopper;
  return response;
}

export function toHopperRangeBaselineApi(baseline: HopperRangeBaseline) {
  const {
    airtableRecordId: _airtableRecordId,
    rawRow: _rawRow,
    ...response
  } = baseline;
  return response;
}

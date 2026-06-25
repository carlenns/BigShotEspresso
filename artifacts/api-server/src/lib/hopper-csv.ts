import type {
  InsertHopper,
  InsertHopperRangeBaseline,
} from "@workspace/db/schema";
import {
  parseCsvBoolean,
  parseCsvInteger,
  parseCsvNumber,
  parseCsvRecords,
  parseCsvString,
} from "./csv";

export interface ParsedCsv<T> {
  headers: string[];
  rows: T[];
  errors: string[];
}

function rawRow(headers: string[], record: string[]): Record<string, string> {
  return Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ""]));
}

function validateNumber(
  value: string | undefined,
  fieldName: string,
  rowNumber: number,
  errors: string[],
): number | null {
  const parsed = parseCsvNumber(value);
  if (value?.trim() && parsed == null) {
    errors.push(`Row ${rowNumber}: ${fieldName} is not a valid number`);
  }
  return parsed;
}

export function parseHopperCsvData(text: string): ParsedCsv<InsertHopper> {
  const records = parseCsvRecords(text);
  if (records.length < 2) return { headers: [], rows: [], errors: ["No data rows found"] };

  const headers = records[0]!.map((value, index) =>
    index === 0 ? value.replace(/^\uFEFF/, "").trim() : value.trim(),
  );
  const column = (name: string) =>
    headers.findIndex((header) => header.toLowerCase() === name.toLowerCase());
  const rows: InsertHopper[] = [];
  const errors: string[] = [];

  records.slice(1).forEach((record, index) => {
    const rowNumber = index + 2;
    const name = parseCsvString(record[column("Name")]);
    if (!name) {
      errors.push(`Row ${rowNumber}: Name is required`);
      return;
    }
    rows.push({
      name,
      startingBeans: validateNumber(record[column("Starting Beans (g)")], "Starting Beans (g)", rowNumber, errors),
      isActive: parseCsvBoolean(record[column("Active")]) ?? false,
      hopperMass: validateNumber(record[column("Hopper Mass (g)")], "Hopper Mass (g)", rowNumber, errors),
      hopperPercent: validateNumber(record[column("Hopper %")], "Hopper %", rowNumber, errors),
      shotsLeftEstimate: validateNumber(record[column("Shots Left (estimated)")], "Shots Left (estimated)", rowNumber, errors),
      notes: parseCsvString(record[column("Notes")]),
      rawRow: rawRow(headers, record),
    });
  });

  return { headers, rows, errors };
}

export function parseBaselineCsvData(
  text: string,
): ParsedCsv<InsertHopperRangeBaseline> {
  const records = parseCsvRecords(text);
  if (records.length < 2) return { headers: [], rows: [], errors: ["No data rows found"] };

  const headers = records[0]!.map((value, index) =>
    index === 0 ? value.replace(/^\uFEFF/, "").trim() : value.trim(),
  );
  const column = (name: string) =>
    headers.findIndex((header) => header.toLowerCase() === name.toLowerCase());
  const rows: InsertHopperRangeBaseline[] = [];
  const errors: string[] = [];

  records.slice(1).forEach((record, index) => {
    const rowNumber = index + 2;
    const hopperRange = parseCsvString(record[column("Hopper Range")]);
    if (!hopperRange) {
      errors.push(`Row ${rowNumber}: Hopper Range is required`);
      return;
    }
    const countValue = record[column("Count")];
    const observationCount = parseCsvInteger(countValue);
    if (countValue?.trim() && observationCount == null) {
      errors.push(`Row ${rowNumber}: Count is not a valid integer`);
    }
    rows.push({
      hopperRange,
      baselineOutputAdjustedDate: parseCsvString(record[column("Baseline Output Adjusted Date")]),
      baselineOutputStatus: parseCsvString(record[column("Baseline Output Status")]),
      baselineOutput: validateNumber(record[column("Baseline Output (g)")], "Baseline Output (g)", rowNumber, errors),
      avgInitialOutput: validateNumber(record[column("Avg Initial Output (g)")], "Avg Initial Output (g)", rowNumber, errors),
      observationCount,
      rawRow: rawRow(headers, record),
    });
  });

  return { headers, rows, errors };
}

import { createHash } from "node:crypto";

export function parseCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index++) {
    const character = text[index]!;
    if (inQuotes) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index++;
      } else if (character === '"') {
        inQuotes = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      inQuotes = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      row.push(field);
      field = "";
      if (row.some((value) => value.trim() !== "")) records.push(row);
      row = [];
      if (character === "\r" && text[index + 1] === "\n") index++;
    } else {
      field += character;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some((value) => value.trim() !== "")) records.push(row);
  }

  return records;
}

export function parseCsvString(value: string | undefined): string | null {
  const result = value?.trim();
  return result ? result : null;
}

export function parseCsvNumber(value: string | undefined): number | null {
  const normalized = value?.trim().replace(/%$/, "");
  if (!normalized) return null;
  const result = Number.parseFloat(normalized);
  return Number.isFinite(result) ? result : null;
}

export function parseCsvInteger(value: string | undefined): number | null {
  const parsed = parseCsvNumber(value);
  return parsed == null ? null : Math.trunc(parsed);
}

export function parseCsvBoolean(value: string | undefined): boolean | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  if (["1", "true", "yes", "checked"].includes(normalized)) return true;
  if (["0", "false", "no", "unchecked"].includes(normalized)) return false;
  return null;
}

export function parseCsvMultiSelect(value: string | undefined): string[] | null {
  const normalized = parseCsvString(value);
  if (!normalized) return null;
  const values = normalized
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return values.length > 0 ? values : null;
}

export function csvRowFingerprint(
  headers: string[],
  record: string[],
): string {
  const canonical = headers.map((header, index) => [header, record[index] ?? ""]);
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

export function flattenUnique(values: (string[] | null | undefined)[]): string[] {
  const unique = new Set<string>();
  for (const value of values) {
    for (const item of value ?? []) unique.add(item);
  }
  return [...unique].sort();
}

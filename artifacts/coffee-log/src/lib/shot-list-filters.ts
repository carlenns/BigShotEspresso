// Shot Log filter state <-> URL query <-> GET /shots params (Phase 2A S2).
// Pure and dependency-free so it can be unit-tested from the api-server suite.

export const SHOT_LIST_PAGE_SIZE = 25;

export interface ShotListFilters {
  search: string;
  bagId: string; // "" = all bags
  status: string;
  faultStatus: string;
  reference: "" | "true" | "false";
  ratingMin: string;
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD
  page: number; // 1-based
}

export const EMPTY_SHOT_LIST_FILTERS: ShotListFilters = {
  search: "",
  bagId: "",
  status: "",
  faultStatus: "",
  reference: "",
  ratingMin: "",
  dateFrom: "",
  dateTo: "",
  page: 1,
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseShotListQuery(search: string): ShotListFilters {
  const q = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const get = (key: string) => (q.get(key) ?? "").trim();
  const reference = get("ref");
  const page = Number.parseInt(get("page"), 10);
  const bagId = get("bag");
  const ratingMin = get("ratingMin");
  return {
    search: q.get("q") ?? "",
    bagId: /^\d+$/.test(bagId) ? bagId : "",
    status: get("status"),
    faultStatus: get("fault"),
    reference: reference === "true" || reference === "false" ? reference : "",
    ratingMin: /^\d+(\.\d+)?$/.test(ratingMin) ? ratingMin : "",
    dateFrom: DATE_RE.test(get("from")) ? get("from") : "",
    dateTo: DATE_RE.test(get("to")) ? get("to") : "",
    page: Number.isFinite(page) && page > 1 ? page : 1,
  };
}

/** Serialize to a stable, minimal query string (no leading "?"; "" when unfiltered). */
export function toShotListQuery(f: ShotListFilters): string {
  const q = new URLSearchParams();
  if (f.search) q.set("q", f.search);
  if (f.bagId) q.set("bag", f.bagId);
  if (f.status) q.set("status", f.status);
  if (f.faultStatus) q.set("fault", f.faultStatus);
  if (f.reference) q.set("ref", f.reference);
  if (f.ratingMin) q.set("ratingMin", f.ratingMin);
  if (f.dateFrom) q.set("from", f.dateFrom);
  if (f.dateTo) q.set("to", f.dateTo);
  if (f.page > 1) q.set("page", String(f.page));
  return q.toString();
}

/** Map UI filters to the existing GET /shots query params. */
export function toListShotsParams(f: ShotListFilters, pageSize = SHOT_LIST_PAGE_SIZE): Record<string, string> {
  const params: Record<string, string> = {
    limit: String(pageSize),
    offset: String((Math.max(1, f.page) - 1) * pageSize),
  };
  if (f.search) params.search = f.search;
  if (f.bagId) params.bagId = f.bagId;
  if (f.status) params.status = f.status;
  if (f.faultStatus) params.faultStatus = f.faultStatus;
  if (f.reference) params.isReference = f.reference;
  if (f.ratingMin) params.ratingMin = f.ratingMin;
  // shot_date is stored as text: app-logged shots as local "YYYY-MM-DDTHH:mm",
  // imported shots as ISO strings. The API compares strings, so whole-day bounds
  // are "YYYY-MM-DD" (inclusive start) and "YYYY-MM-DDT23:59:59.999Z" (inclusive end).
  if (f.dateFrom) params.dateFrom = f.dateFrom;
  if (f.dateTo) params.dateTo = `${f.dateTo}T23:59:59.999Z`;
  return params;
}

/** Number of active filters, excluding free-text search and paging. */
export function activeFilterCount(f: ShotListFilters): number {
  return [f.bagId, f.status, f.faultStatus, f.reference, f.ratingMin, f.dateFrom, f.dateTo].filter(Boolean).length;
}

export function pageSummary(page: number, total: number, pageSize = SHOT_LIST_PAGE_SIZE): {
  from: number;
  to: number;
  pageCount: number;
} {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0 || page > pageCount) return { from: 0, to: 0, pageCount };
  const from = (page - 1) * pageSize + 1;
  return { from, to: Math.min(total, page * pageSize), pageCount };
}

import type { Completeness } from "@bio-mcp/shared";
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

function directCompleteness(data: unknown): Completeness | undefined {
  if (!record(data) || data.__staged === true) return undefined;
  if (Array.isArray(data.results) && typeof data.count === "number") return {
    complete: false, returned: data.results.length, total_available: data.count,
    truncation: {reason:data.next ? "page_limit":"unknown",detail:"This is one InterPro record page, not proof of complete query coverage.",remedy:"Retain native count, next/previous cursors, filters and observed InterPro release while traversing pages; a live traversal is not an immutable snapshot."},
  };
  const batch = Array.isArray(data.results) && data.results.every(row => record(row) && typeof row.md5 === "string");
  if (batch || typeof data.md5 === "string" && Array.isArray(data.matches)) return {
    complete: false, returned: batch ? (data.results as unknown[]).length : 1,
    truncation: {reason:"unknown",detail:"Cached matches do not establish which analyses ran or complete functional coverage. The batch service collapses repeated MD5s.",remedy:"Retain each returned checksum, found flag, source, signature library version and location. Use Dispatcher discovery before deciding whether additional computation is needed."},
  };
  return undefined;
}

/** Preserve native coverage limits when a program returns composed evidence. */
export function interproCompleteness(data: unknown): Completeness | undefined {
  const observations: Completeness[] = [];
  const pending = [data];
  while (pending.length) {
    const value = pending.pop();
    if (!value || typeof value !== "object") continue;
    const direct = directCompleteness(value);
    if (direct) { observations.push(direct); continue; }
    if (record(value) && value.__staged === true) {
      const staging = value._staging;
      if (record(staging) && record(staging.completeness) && staging.completeness.complete === false)
        observations.push({ ...staging.completeness, complete: false });
      continue;
    }
    for (const child of Object.values(value)) pending.push(child);
  }
  if (observations.length === 0) return undefined;
  if (observations.length === 1) return observations[0];
  return { complete: false, truncation: { reason: "unknown",
    detail: "Composed InterPro evidence includes bounded record pages or cached sequence matches; neither establishes complete functional coverage.",
    remedy: "Retain the counts, cursors, checksums, found flags and source/library versions of each native response separately." } };
}

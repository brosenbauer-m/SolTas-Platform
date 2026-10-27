/**
 * PostgREST `or` filter that finds `query` (case-insensitive, anywhere) in any of `columns`.
 * The value is quoted, so commas, dots and brackets in what people type ("water, sanitation") can't break the
 * filter; % and _ are matched literally.
 */
export function ilikeAny(columns: string[], query: string): string {
  const like = query.replace(/[\\%_]/g, "\\$&");
  const quoted = `"%${like.replace(/["\\]/g, "\\$&")}%"`;
  return columns.map((column) => `${column}.ilike.${quoted}`).join(",");
}

/**
 * Drizzle's mysql2 driver returns mutation metadata as
 * [ResultSetHeader, FieldPacket[]]. Keep compatibility with direct headers and
 * the rowsAffected spelling used by a few other drivers.
 */
export function getAffectedRows(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  if (!header || typeof header !== "object") return 0;
  const value = (header as any).affectedRows ?? (header as any).rowsAffected ?? 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

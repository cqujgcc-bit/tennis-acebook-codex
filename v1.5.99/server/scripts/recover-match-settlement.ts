/**
 * Safely advance one stuck match settlement through the same split-transfer
 * state machine used by the mini program.
 *
 * Usage: pnpm exec tsx scripts/recover-match-settlement.ts 71 --execute
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { getDb, getUserById } from "../server/db";
import { matchSettlements, tennisMatches } from "../drizzle/schema";
import { processSplitSettlementTransfer, splitSettlementAmount } from "../server/settlement-transfer";

const matchId = Number(process.argv[2]);
const execute = process.argv.includes("--execute");
if (!Number.isInteger(matchId) || matchId <= 0) throw new Error("A positive matchId is required");

const db = await getDb();
if (!db) throw new Error("DATABASE_URL is unavailable");

const [row] = await db.select({
  matchId: matchSettlements.matchId,
  organizerId: matchSettlements.organizerId,
  status: matchSettlements.status,
  netAmount: matchSettlements.netAmount,
  title: tennisMatches.title,
  matchDate: tennisMatches.matchDate,
}).from(matchSettlements)
  .leftJoin(tennisMatches, eq(matchSettlements.matchId, tennisMatches.id))
  .where(eq(matchSettlements.matchId, matchId))
  .limit(1);

if (!row) throw new Error(`Settlement not found for match ${matchId}`);
const amountFen = Math.round(Number(row.netAmount || 0) * 100);
const organizer = await getUserById(row.organizerId);
const openid = organizer?.wechatOpenid || "";

console.log(JSON.stringify({
  matchId: row.matchId,
  matchDate: row.matchDate,
  status: row.status,
  amountFen,
  splitAmountsFen: amountFen > 0 ? splitSettlementAmount(amountFen) : [],
  hasOpenid: !!openid,
  execute,
}));

if (!execute) process.exit(0);
if (row.status === "disputed" || row.status === "cancelled") throw new Error(`Settlement state ${row.status} forbids transfer`);
if (row.status === "settled") {
  console.log(JSON.stringify({ action: "already-settled" }));
  process.exit(0);
}
if (!openid) throw new Error("Organizer does not have a bound wechatOpenid");
if (amountFen <= 0) throw new Error("Settlement amount must be positive");

const result = await processSplitSettlementTransfer({
  db,
  matchId,
  organizerId: row.organizerId,
  openid,
  totalFen: amountFen,
  matchTitle: row.title || `球局${matchId}`,
});
console.log(JSON.stringify({ action: "split-settlement", ...result }));

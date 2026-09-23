/**
 * Safely recover one stuck match settlement.
 *
 * Usage (from server directory):
 *   pnpm exec tsx scripts/recover-match-settlement.ts 71 --execute
 *
 * The script never replaces a non-terminal WeChat transfer. It first queries the
 * original bill, reuses the same out_bill_no for ACCEPTED, and creates a new bill
 * only after the old bill is explicitly FAIL/CANCELLED/not found.
 */
import "dotenv/config";
import { and, eq, inArray } from "drizzle-orm";
import { getDb, getUserById } from "../server/db";
import { matchOrders, matchSettlements, tennisMatches } from "../drizzle/schema";
import {
  buildMatchTransferRemark,
  cancelTransferBill,
  decodeTransferPackageInfo,
  encodeTransferPackageInfo,
  generateOrderId,
  isValidOutBillNo,
  queryTransferBill,
  transferToUser,
} from "../server/wxpay";

const matchId = Number(process.argv[2]);
const execute = process.argv.includes("--execute");

if (!Number.isInteger(matchId) || matchId <= 0) {
  throw new Error("A positive matchId is required");
}

const db = await getDb();
if (!db) throw new Error("DATABASE_URL is unavailable");

const [row] = await db.select({
  id: matchSettlements.id,
  matchId: matchSettlements.matchId,
  organizerId: matchSettlements.organizerId,
  status: matchSettlements.status,
  netAmount: matchSettlements.netAmount,
  wxBatchId: matchSettlements.wxBatchId,
  disputeReason: matchSettlements.disputeReason,
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
const remark = buildMatchTransferRemark((row.title || `球局${matchId}`).slice(0, 16));

console.log(JSON.stringify({
  matchId: row.matchId,
  matchDate: row.matchDate,
  status: row.status,
  amountFen,
  hasBill: !!row.wxBatchId,
  hasPackage: !!decodeTransferPackageInfo(row.disputeReason),
  hasOpenid: !!openid,
  execute,
}));

if (!execute) process.exit(0);
if (row.status === "disputed" || row.status === "cancelled") {
  throw new Error(`Settlement state ${row.status} forbids transfer`);
}
if (row.status === "settled") {
  console.log(JSON.stringify({ action: "already-settled" }));
  process.exit(0);
}
if (!openid) throw new Error("Organizer does not have a bound wechatOpenid");
if (amountFen <= 0) throw new Error("Settlement amount must be positive");

async function markSettled() {
  const settledAt = new Date();
  await db!.update(matchSettlements).set({ status: "settled", settledAt })
    .where(eq(matchSettlements.matchId, matchId));
  await db!.update(matchOrders).set({ status: "settled", settledAt })
    .where(and(eq(matchOrders.matchId, matchId), inArray(matchOrders.status, ["paid"])));
}

async function storeTransfer(result: { batchId: string; status: string; packageInfo?: string }) {
  if (result.status === "SUCCESS") {
    await db!.update(matchSettlements).set({
      status: "settled",
      settledAt: new Date(),
      wxBatchId: result.batchId,
    }).where(eq(matchSettlements.matchId, matchId));
    await db!.update(matchOrders).set({ status: "settled", settledAt: new Date() })
      .where(and(eq(matchOrders.matchId, matchId), inArray(matchOrders.status, ["paid"])));
    console.log(JSON.stringify({ action: "settled", state: result.status }));
    return;
  }
  await db!.update(matchSettlements).set({
    status: "confirming",
    wxBatchId: result.batchId,
    ...(result.packageInfo ? { disputeReason: encodeTransferPackageInfo(result.packageInfo) } : {}),
  }).where(eq(matchSettlements.matchId, matchId));
  console.log(JSON.stringify({
    action: "await-user-or-processing",
    state: result.status,
    needsUserConfirmation: result.status === "WAIT_USER_CONFIRM",
    hasPackage: !!result.packageInfo,
  }));
}

let canCreateReplacement = !row.wxBatchId;
if (row.wxBatchId) {
  try {
    const bill = await queryTransferBill(row.wxBatchId);
    console.log(JSON.stringify({ action: "query-original", state: bill.state }));
    if (bill.state === "SUCCESS") {
      await markSettled();
      console.log(JSON.stringify({ action: "synced-success" }));
      process.exit(0);
    }
    if (bill.state === "ACCEPTED") {
      const resumed = await transferToUser({ batchId: row.wxBatchId, openid, amountFen, remark });
      await storeTransfer(resumed);
      process.exit(0);
    }
    if (bill.state === "PROCESSING" || bill.state === "CANCELING") {
      console.log(JSON.stringify({ action: "wait-non-terminal", state: bill.state }));
      process.exit(0);
    }
    if (bill.state === "WAIT_USER_CONFIRM" || bill.state === "TRANSFERING") {
      const packageInfo = decodeTransferPackageInfo(row.disputeReason);
      if (packageInfo) {
        console.log(JSON.stringify({ action: "user-confirmation-required", state: bill.state, hasPackage: true }));
        process.exit(0);
      }
      const cancelled = await cancelTransferBill(row.wxBatchId);
      console.log(JSON.stringify({ action: "cancel-missing-package", state: cancelled.state }));
      if (cancelled.state !== "CANCELLED") process.exit(0);
      canCreateReplacement = true;
    } else if (bill.state === "FAIL" || bill.state === "CANCELLED") {
      canCreateReplacement = true;
    } else {
      throw new Error(`Unsupported WeChat transfer state: ${bill.state}`);
    }
  } catch (error: any) {
    const message = String(error?.message || error || "");
    const legacyInvalidBill = !isValidOutBillNo(row.wxBatchId)
      && (message.includes("PARAM_ERROR") || message.includes("INVALID_REQUEST"));
    const notFound = message.includes("404") || message.includes("ORDER_NOT_EXIST")
      || message.includes("NOT_FOUND") || message.includes("BILL_NOT_EXIST");
    if (!legacyInvalidBill && !notFound) throw error;
    console.log(JSON.stringify({ action: "original-not-found" }));
    canCreateReplacement = true;
  }
}

if (!canCreateReplacement) process.exit(0);
const replacement = await transferToUser({
  batchId: generateOrderId(),
  openid,
  amountFen,
  remark,
});
await storeTransfer(replacement);

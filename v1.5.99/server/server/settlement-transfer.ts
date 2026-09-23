import { and, asc, eq, gte, inArray } from "drizzle-orm";
import {
  matchOrders,
  matchSettlements,
  matchSettlementTransfers,
} from "../drizzle/schema";
import {
  buildMatchTransferRemark,
  generateOrderId,
  queryTransferBill,
  transferToUser,
  wxpayConfig,
} from "./wxpay";

export const MAX_SINGLE_TRANSFER_FEN = 20_000;
export const MAX_DAILY_TRANSFER_FEN = 200_000;

const ACTIVE_STATES = ["CREATED", "ACCEPTED", "PROCESSING", "WAIT_USER_CONFIRM", "TRANSFERING", "CANCELING"];
const TERMINAL_FAILURE_STATES = ["FAIL", "CANCELLED"];

export type SettlementTransferProgress = {
  completedAmountFen: number;
  totalAmountFen: number;
  completedSequences: number;
  totalSequences: number;
  currentSequence?: number;
};

export type SettlementTransferResult = {
  success: true;
  settled: boolean;
  deferred?: boolean;
  transfer?: {
    status: string;
    packageInfo?: string;
    mchId: string;
    amountFen: number;
    sequence: number;
    totalSequences: number;
  };
  progress: SettlementTransferProgress;
  message: string;
};

export function splitSettlementAmount(totalFen: number, maxSingleFen = MAX_SINGLE_TRANSFER_FEN): number[] {
  if (!Number.isInteger(totalFen) || totalFen <= 0) throw new Error("结算金额必须为正整数分");
  if (!Number.isInteger(maxSingleFen) || maxSingleFen <= 0) throw new Error("单笔限额必须为正整数分");
  const result: number[] = [];
  let remaining = totalFen;
  while (remaining > 0) {
    const amount = Math.min(remaining, maxSingleFen);
    result.push(amount);
    remaining -= amount;
  }
  return result;
}

function isNotFoundError(error: unknown) {
  const message = String((error as any)?.message || error || "");
  return message.includes("404") || message.includes("ORDER_NOT_EXIST")
    || message.includes("NOT_FOUND") || message.includes("BILL_NOT_EXIST");
}

function shanghaiDayStartUtc(now = new Date()) {
  const shanghai = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return new Date(Date.UTC(shanghai.getUTCFullYear(), shanghai.getUTCMonth(), shanghai.getUTCDate()) - 8 * 60 * 60 * 1000);
}

async function loadLatestLegs(db: any, matchId: number) {
  const rows = await db.select().from(matchSettlementTransfers)
    .where(eq(matchSettlementTransfers.matchId, matchId))
    .orderBy(asc(matchSettlementTransfers.sequence), asc(matchSettlementTransfers.attempt));
  const latest = new Map<number, any>();
  for (const row of rows) latest.set(row.sequence, row);
  return Array.from(latest.values()).sort((a, b) => a.sequence - b.sequence);
}

export async function hasSplitSettlementPlan(db: any, matchId: number) {
  const legs = await loadLatestLegs(db, matchId);
  return legs.length > 0;
}

async function ensureTransferPlan(db: any, matchId: number, totalFen: number) {
  const amounts = splitSettlementAmount(totalFen);
  let legs = await loadLatestLegs(db, matchId);
  if (legs.length === 0) {
    try {
      await db.insert(matchSettlementTransfers).values(amounts.map((amountFen, index) => ({
        matchId,
        sequence: index + 1,
        attempt: 1,
        amountFen,
        outBillNo: generateOrderId(),
        status: "CREATED",
      })));
    } catch (error: any) {
      // 双击或并发重试可能同时建计划；唯一索引保证只保留一套，重新读取即可。
      if (!String(error?.message || error).includes("Duplicate")) throw error;
    }
    legs = await loadLatestLegs(db, matchId);
  }
  if (legs.length !== amounts.length || legs.some((leg, index) => leg.amountFen !== amounts[index])) {
    throw new Error("结算分笔计划与应结算金额不一致，请联系平台核对");
  }
  return legs;
}

async function updateLegFromQuery(db: any, leg: any, state: string, failReason?: string) {
  const now = new Date();
  await db.update(matchSettlementTransfers).set({
    status: state,
    ...(failReason ? { errorMessage: failReason } : {}),
    ...(state === "SUCCESS" || TERMINAL_FAILURE_STATES.includes(state) ? { completedAt: now } : {}),
  }).where(eq(matchSettlementTransfers.id, leg.id));
  return { ...leg, status: state, errorMessage: failReason || leg.errorMessage, completedAt: state === "SUCCESS" ? now : leg.completedAt };
}

async function queryAndSyncLeg(db: any, leg: any) {
  try {
    const bill = await queryTransferBill(leg.outBillNo);
    return await updateLegFromQuery(db, leg, bill.state, bill.failReason);
  } catch (error) {
    if (isNotFoundError(error)) return leg;
    throw error;
  }
}

async function usedDailyFen(db: any, organizerId: number, excludeId?: number) {
  const rows = await db.select({
    id: matchSettlementTransfers.id,
    amountFen: matchSettlementTransfers.amountFen,
    status: matchSettlementTransfers.status,
  }).from(matchSettlementTransfers)
    .innerJoin(matchSettlements, eq(matchSettlementTransfers.matchId, matchSettlements.matchId))
    .where(and(
      eq(matchSettlements.organizerId, organizerId),
      gte(matchSettlementTransfers.initiatedAt, shanghaiDayStartUtc()),
      inArray(matchSettlementTransfers.status, ACTIVE_STATES.concat(["SUCCESS"])),
    ));
  return rows.reduce((sum: number, row: any) => sum + (row.id === excludeId ? 0 : Number(row.amountFen || 0)), 0);
}

async function progressFor(db: any, matchId: number, totalFen: number): Promise<SettlementTransferProgress> {
  const legs = await loadLatestLegs(db, matchId);
  const completed = legs.filter(leg => leg.status === "SUCCESS");
  const current = legs.find(leg => leg.status !== "SUCCESS");
  return {
    completedAmountFen: completed.reduce((sum, leg) => sum + Number(leg.amountFen), 0),
    totalAmountFen: totalFen,
    completedSequences: completed.length,
    totalSequences: splitSettlementAmount(totalFen).length,
    ...(current ? { currentSequence: current.sequence } : {}),
  };
}

async function markSettlementComplete(db: any, matchId: number) {
  const settledAt = new Date();
  await db.update(matchSettlements).set({ status: "settled", settledAt })
    .where(eq(matchSettlements.matchId, matchId));
  await db.update(matchOrders).set({ status: "settled", settledAt })
    .where(and(eq(matchOrders.matchId, matchId), inArray(matchOrders.status, ["paid"])));
}

function pendingResult(leg: any, progress: SettlementTransferProgress, packageInfo?: string): SettlementTransferResult {
  const amount = (Number(leg.amountFen) / 100).toFixed(2);
  return {
    success: true,
    settled: false,
    transfer: {
      status: leg.status,
      ...(packageInfo ? { packageInfo } : {}),
      mchId: wxpayConfig.mchId,
      amountFen: Number(leg.amountFen),
      sequence: leg.sequence,
      totalSequences: progress.totalSequences,
    },
    progress,
    message: leg.status === "WAIT_USER_CONFIRM"
      ? `请确认第 ${leg.sequence}/${progress.totalSequences} 笔收款 ¥${amount}`
      : `第 ${leg.sequence}/${progress.totalSequences} 笔转账处理中`,
  };
}

/**
 * 推进一次分笔结算。只有上一笔微信明确 SUCCESS 后，才会向微信创建下一笔。
 * 同一尝试始终复用 out_bill_no，网络重试不会产生重复付款。
 */
export async function processSplitSettlementTransfer(params: {
  db: any;
  matchId: number;
  organizerId: number;
  openid: string;
  totalFen: number;
  matchTitle: string;
}): Promise<SettlementTransferResult> {
  const { db, matchId, organizerId, openid, totalFen } = params;
  await ensureTransferPlan(db, matchId, totalFen);
  const totalSequences = splitSettlementAmount(totalFen).length;

  while (true) {
    const legs = await loadLatestLegs(db, matchId);
    let leg = legs.find(item => item.status !== "SUCCESS");
    if (!leg) {
      await markSettlementComplete(db, matchId);
      return {
        success: true,
        settled: true,
        progress: await progressFor(db, matchId, totalFen),
        message: `已分 ${totalSequences} 笔结算 ¥${(totalFen / 100).toFixed(2)} 到微信零钱`,
      };
    }

    // 已向微信发起过的单据，必须先查单；CREATED+initiatedAt 也可能是“微信已受理、落库失败”。
    if (leg.status !== "CREATED" || leg.initiatedAt) leg = await queryAndSyncLeg(db, leg);
    if (leg.status === "SUCCESS") continue;

    if (leg.status === "WAIT_USER_CONFIRM" || leg.status === "TRANSFERING") {
      return pendingResult(leg, await progressFor(db, matchId, totalFen), leg.packageInfo || undefined);
    }
    if (leg.status === "PROCESSING" || leg.status === "CANCELING") {
      return pendingResult(leg, await progressFor(db, matchId, totalFen));
    }
    if (TERMINAL_FAILURE_STATES.includes(leg.status)) {
      const [created] = await db.insert(matchSettlementTransfers).values({
        matchId,
        sequence: leg.sequence,
        attempt: leg.attempt + 1,
        amountFen: leg.amountFen,
        outBillNo: generateOrderId(),
        status: "CREATED",
      }).$returningId();
      const [replacement] = await db.select().from(matchSettlementTransfers)
        .where(eq(matchSettlementTransfers.id, created.id));
      leg = replacement;
    }

    if (leg.status !== "CREATED" && leg.status !== "ACCEPTED") {
      throw new Error(`暂不支持的微信转账状态：${leg.status}`);
    }

    const usedFen = await usedDailyFen(db, organizerId, leg.id);
    if (usedFen + Number(leg.amountFen) > MAX_DAILY_TRANSFER_FEN) {
      const progress = await progressFor(db, matchId, totalFen);
      return {
        success: true,
        settled: false,
        deferred: true,
        progress,
        message: `今日转账已接近 ¥2000 限额，剩余第 ${leg.sequence}/${totalSequences} 笔将在次日继续`,
      };
    }

    const initiatedAt = leg.initiatedAt || new Date();
    await db.update(matchSettlementTransfers).set({ initiatedAt, errorMessage: null })
      .where(eq(matchSettlementTransfers.id, leg.id));
    try {
      const transfer = await transferToUser({
        batchId: leg.outBillNo,
        openid,
        amountFen: Number(leg.amountFen),
        remark: buildMatchTransferRemark(params.matchTitle.slice(0, 16)),
      });
      const completedAt = transfer.status === "SUCCESS" ? new Date() : null;
      await db.update(matchSettlementTransfers).set({
        status: transfer.status,
        packageInfo: transfer.packageInfo || null,
        initiatedAt,
        ...(completedAt ? { completedAt } : {}),
      }).where(eq(matchSettlementTransfers.id, leg.id));
      await db.update(matchSettlements).set({
        status: "confirming",
        wxBatchId: transfer.batchId,
      }).where(eq(matchSettlements.matchId, matchId));
      leg = { ...leg, status: transfer.status, packageInfo: transfer.packageInfo, initiatedAt, completedAt };
      if (transfer.status === "SUCCESS") continue;
      return pendingResult(leg, await progressFor(db, matchId, totalFen), transfer.packageInfo);
    } catch (error: any) {
      await db.update(matchSettlementTransfers).set({ errorMessage: String(error?.message || error) })
        .where(eq(matchSettlementTransfers.id, leg.id));
      throw error;
    }
  }
}

/** 钱包页只同步微信状态，不主动创建下一笔。 */
export async function syncSplitSettlementTransfer(params: { db: any; matchId: number; totalFen: number }) {
  const legs = await loadLatestLegs(params.db, params.matchId);
  if (legs.length === 0) return null;
  for (const leg of legs) {
    if (leg.status === "SUCCESS" || (!leg.initiatedAt && leg.status === "CREATED")) continue;
    await queryAndSyncLeg(params.db, leg);
  }
  const progress = await progressFor(params.db, params.matchId, params.totalFen);
  if (progress.completedSequences === progress.totalSequences) await markSettlementComplete(params.db, params.matchId);
  return progress;
}

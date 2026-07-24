/**
 * 球局群聊接口测试
 * 使用 HTTP fetch 方式（与 wechat_auth.test.ts 相同模式）
 * 测试 match.getMessages / match.sendMessage / match.getUnreadCount
 */
import { describe, it, expect, beforeAll } from "vitest";
import { SignJWT } from "jose";
import * as db from "./db";

const BASE = "http://localhost:3000/api/trpc";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const APP_ID = process.env.VITE_APP_ID || "test-app";
const secret = new TextEncoder().encode(JWT_SECRET);

async function signToken(openId: string, name: string) {
  const exp = Math.floor((Date.now() + 365 * 24 * 60 * 60 * 1000) / 1000);
  return new SignJWT({ openId, appId: APP_ID, name })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(exp)
    .sign(secret);
}

async function apiGet(path: string, params: Record<string, unknown>, token?: string) {
  const input = encodeURIComponent(JSON.stringify({ json: params }));
  const res = await fetch(`${BASE}/${path}?input=${input}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  return res.json();
}

async function apiPost(path: string, body: unknown, token?: string) {
  const res = await fetch(`${BASE}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ json: body }),
  });
  return res.json();
}

describe("球局群聊接口", () => {
  const ts = Date.now();
  const organizerWxId = `vitest_chat_org_${ts}`;
  const participantWxId = `vitest_chat_par_${ts}`;
  const outsiderWxId = `vitest_chat_out_${ts}`;

  let organizerOpenId: string;
  let participantOpenId: string;
  let outsiderOpenId: string;
  let organizerToken: string;
  let participantToken: string;
  let outsiderToken: string;
  let matchId: number;

  beforeAll(async () => {
    // 创建三个测试用户（组织者、参与者、局外人）
    const org = await db.createUserByWechat(organizerWxId, "群聊测试组织者");
    const par = await db.createUserByWechat(participantWxId, "群聊测试参与者");
    const out = await db.createUserByWechat(outsiderWxId, "群聊局外人");
    if (!org || !par || !out) throw new Error("创建测试用户失败");

    organizerOpenId = org.openId;
    participantOpenId = par.openId;
    outsiderOpenId = out.openId;

    organizerToken = await signToken(organizerOpenId, "群聊测试组织者");
    participantToken = await signToken(participantOpenId, "群聊测试参与者");
    outsiderToken = await signToken(outsiderOpenId, "群聊局外人");

    // 组织者创建球局
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
    const createRes = await apiPost("match.create", {
      title: "群聊测试球局",
      matchType: "doubles",
      levelRequired: "any",
      matchDate: tomorrow,
      startTime: "10:00",
      endTime: "11:30",
      venueName: "测试场地",
      maxParticipants: 4,
      costPerPerson: 0,
      costSplitType: "free",
      bringOwnBall: false,
      feeRequired: false,
    }, organizerToken);

    const createResult = createRes?.result?.data?.json;
    if (!createResult?.matchId) throw new Error(`创建球局失败: ${JSON.stringify(createRes)}`);
    matchId = createResult.matchId;

    // 参与者加入球局
    const joinRes = await apiPost("match.join", { matchId }, participantToken);
    const joinResult = joinRes?.result?.data?.json;
    if (!joinResult?.success) throw new Error(`参与者加入球局失败: ${JSON.stringify(joinRes)}`);
  });

  it("组织者可以发送文字消息", async () => {
    const res = await apiPost("match.sendMessage", {
      matchId,
      content: "大家好，明天见！",
    }, organizerToken);
    const result = res?.result?.data?.json;
    expect(res?.error).toBeUndefined();
    expect(result?.success).toBe(true);
    expect(result?.messageId).toBeGreaterThan(0);
  });

  it("参与者可以发送文字消息", async () => {
    const res = await apiPost("match.sendMessage", {
      matchId,
      content: "好的，期待！",
    }, participantToken);
    const result = res?.result?.data?.json;
    expect(res?.error).toBeUndefined();
    expect(result?.success).toBe(true);
  });

  it("getMessages 返回消息列表（含发送者信息）", async () => {
    const res = await apiGet("match.getMessages", { matchId }, organizerToken);
    const result = res?.result?.data?.json;
    expect(res?.error).toBeUndefined();
    expect(result?.messages).toBeDefined();
    expect(result.messages.length).toBeGreaterThanOrEqual(2);

    const msg = result.messages[0];
    expect(msg).toHaveProperty("id");
    expect(msg).toHaveProperty("content");
    expect(msg).toHaveProperty("msgType");
    expect(msg).toHaveProperty("userName");
    expect(msg).toHaveProperty("createdAt");
  });

  it("getMessages 轮询增量（afterId）只返回新消息", async () => {
    // 先获取全部消息
    const allRes = await apiGet("match.getMessages", { matchId }, organizerToken);
    const allMsgs = allRes?.result?.data?.json?.messages;
    expect(allMsgs?.length).toBeGreaterThan(0);
    const lastId = allMsgs[allMsgs.length - 1].id;

    // 发一条新消息
    await apiPost("match.sendMessage", { matchId, content: "增量轮询测试消息" }, organizerToken);

    // 用 afterId 只拉新消息
    const incrRes = await apiGet("match.getMessages", { matchId, afterId: lastId }, organizerToken);
    const incrMsgs = incrRes?.result?.data?.json?.messages;
    expect(incrMsgs?.length).toBe(1);
    expect(incrMsgs[0].content).toBe("增量轮询测试消息");
  });

  it("getUnreadCount 返回正确的未读数量", async () => {
    // 获取全部消息
    const allRes = await apiGet("match.getMessages", { matchId }, participantToken);
    const allMsgs = allRes?.result?.data?.json?.messages;
    expect(allMsgs?.length).toBeGreaterThan(0);
    const firstId = allMsgs[0].id;

    // 以第一条消息为 lastReadId，后续消息都算未读
    const countRes = await apiGet("match.getUnreadCount", {
      matchId,
      lastReadId: firstId,
    }, participantToken);
    const countResult = countRes?.result?.data?.json;
    expect(countResult?.count).toBeGreaterThan(0);
  });

  it("非成员无法发送消息（应返回 FORBIDDEN 错误）", async () => {
    const res = await apiPost("match.sendMessage", {
      matchId,
      content: "我不是成员，不该能发消息",
    }, outsiderToken);
    expect(res?.error).toBeDefined();
    expect(res.error?.json?.data?.code).toBe("FORBIDDEN");
  });

  it("非成员无法查看消息（应返回 FORBIDDEN 错误）", async () => {
    const res = await apiGet("match.getMessages", { matchId }, outsiderToken);
    expect(res?.error).toBeDefined();
    expect(res.error?.json?.data?.code).toBe("FORBIDDEN");
  });

  it("图片消息可以发送并在列表中可见", async () => {
    const imgUrl = "https://example.com/test-photo.jpg";
    const sendRes = await apiPost("match.sendMessage", {
      matchId,
      content: imgUrl,
      msgType: "image",
    }, organizerToken);
    const sendResult = sendRes?.result?.data?.json;
    expect(sendRes?.error).toBeUndefined();
    expect(sendResult?.success).toBe(true);

    // 验证图片消息在列表中
    const listRes = await apiGet("match.getMessages", { matchId }, organizerToken);
    const msgs = listRes?.result?.data?.json?.messages;
    const imgMsg = msgs?.find((m: any) => m.msgType === "image");
    expect(imgMsg).toBeDefined();
    expect(imgMsg?.content).toBe(imgUrl);
  });

  it("加入球局时自动插入系统消息", async () => {
    // 参与者加入时已触发系统消息，验证消息列表中有 system 类型消息
    const listRes = await apiGet("match.getMessages", { matchId }, organizerToken);
    const msgs = listRes?.result?.data?.json?.messages;
    const sysMsg = msgs?.find((m: any) => m.msgType === "system");
    expect(sysMsg).toBeDefined();
    expect(sysMsg?.content).toContain("加入了球局");
  });

  it("未登录用户无法发送消息（应返回 UNAUTHORIZED 错误）", async () => {
    const res = await apiPost("match.sendMessage", {
      matchId,
      content: "未登录发消息",
    }); // 不传 token
    expect(res?.error).toBeDefined();
    expect(res.error?.json?.data?.code).toBe("UNAUTHORIZED");
  });
});

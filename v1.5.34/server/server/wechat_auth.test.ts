/**
 * 微信登录认证测试
 * 验证 wx_ 前缀 openId 的用户能正常通过 Bearer token 认证并发布球局
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

async function apiGet(path: string, token?: string) {
  const res = await fetch(`${BASE}/${path}`, {
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

describe("微信登录认证", () => {
  const wxOpenId = "wx_vitest_test_openid_001";
  let wxToken: string;

  beforeAll(async () => {
    // 创建测试用 wx_ 用户
    await db.createUserByWechat("vitest_test_openid_001", "Vitest微信测试用户", null);
    wxToken = await signToken(wxOpenId, "Vitest微信测试用户");
  });

  it("wx_ token 应能通过 auth.me 认证", async () => {
    const data = await apiGet("auth.me", wxToken);
    const user = data?.result?.data?.json;
    expect(user).not.toBeNull();
    expect(user?.openId).toBe(wxOpenId);
  });

  it("wx_ 用户应能成功发布球局", async () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
    const data = await apiPost("match.create", {
      title: "Vitest测试球局",
      matchType: "doubles",
      levelRequired: "any",
      matchDate: tomorrow,
      startTime: "10:00",
      venueName: "测试场地",
      maxParticipants: 4,
      costPerPerson: 0,
      costSplitType: "free",
      bringOwnBall: false,
      feeRequired: false,
    }, wxToken);

    expect(data?.error).toBeUndefined();
    const result = data?.result?.data?.json;
    expect(result?.success).toBe(true);
    expect(result?.matchId).toBeGreaterThan(0);
  });

  it("无效 token 应返回认证错误", async () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
    const data = await apiPost("match.create", {
      title: "测试球局",
      matchType: "doubles",
      levelRequired: "any",
      matchDate: tomorrow,
      startTime: "10:00",
      venueName: "测试场地",
      maxParticipants: 4,
      costPerPerson: 0,
      costSplitType: "free",
      bringOwnBall: false,
      feeRequired: false,
    }, "invalid_token_here");

    expect(data?.error).toBeDefined();
  });
});

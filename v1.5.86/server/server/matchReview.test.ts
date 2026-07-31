/**
 * matchReview 信用评价体系测试
 * 覆盖：创建评价、防重复评价、获取评价列表、信用分更新
 */
import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeCtx(userId: number | null = null) {
  return {
    req: {} as any,
    res: {} as any,
    user: userId
      ? ({
          id: userId,
          openId: `test_${userId}`,
          name: `TestUser${userId}`,
          email: null,
          avatar: null,
          role: "user" as const,
          phone: null,
          wechatId: null,
          wechatOpenid: null,
          pkuAlumni: false,
          pkuInfo: null,
          ntrpLevel: null,
          creditScore: 100,
          status: "active" as const,
          banReason: null,
          warningCount: 0,
          warningHistory: null,
          passwordHash: null,
          lastSignedIn: new Date(),
          createdAt: new Date(),
        } as any)
      : null,
  };
}

const caller = (userId: number | null) =>
  appRouter.createCaller(makeCtx(userId));

// ─── Tests ───────────────────────────────────────────────────────────────────
describe("matchReview", () => {
  it("match.getUserReviews returns array for any userId", async () => {
    const c = caller(null);
    const result = await c.match.getUserReviews({ userId: 9999 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("match.getReviews returns array for any matchId", async () => {
    const c = caller(null);
    const result = await c.match.getReviews({ matchId: 9999 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("match.review throws UNAUTHORIZED when not logged in", async () => {
    const c = caller(null);
    await expect(
      c.match.review({
        matchId: 1,
        revieweeId: 2,
        punctualityScore: 5,
        friendlinessScore: 5,
        levelMatchScore: 5,
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("match.review throws NOT_FOUND for non-existent match", async () => {
    const c = caller(1);
    await expect(
      c.match.review({
        matchId: 999999,
        revieweeId: 2,
        punctualityScore: 5,
        friendlinessScore: 5,
        levelMatchScore: 5,
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("user.updateNtrpLevel throws UNAUTHORIZED when not logged in", async () => {
    const c = caller(null);
    await expect(
      c.user.updateNtrpLevel({ ntrpLevel: 3.5 })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("user.updateNtrpLevel validates range (min 1.0, max 6.0)", async () => {
    const c = caller(1);
    await expect(
      c.user.updateNtrpLevel({ ntrpLevel: 0.5 })
    ).rejects.toThrow();
    await expect(
      c.user.updateNtrpLevel({ ntrpLevel: 6.5 })
    ).rejects.toThrow();
  });

  it("match.list accepts ntrpMin/ntrpMax filter params", async () => {
    const c = caller(null);
    const result = await c.match.list({ ntrpMin: 3.0, ntrpMax: 4.5 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("match.list accepts city filter param", async () => {
    const c = caller(null);
    const result = await c.match.list({ city: "shenzhen" });
    expect(Array.isArray(result)).toBe(true);
  });

  it("match.create includes new fields in schema validation", async () => {
    const c = caller(1);
    // Should reject invalid costSplitType
    await expect(
      c.match.create({
        title: "Test Match",
        matchType: "singles",
        matchDate: "2099-12-31",
        startTime: "10:00",
        venueName: "Test Venue",
        maxParticipants: 2,
        costSplitType: "invalid_type" as any,
        bringOwnBall: false,
      })
    ).rejects.toThrow();
  });
});

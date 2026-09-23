/**
 * Tests for phone-based SMS login procedures
 * auth.sendSmsCode and auth.loginWithPhone
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB ──────────────────────────────────────────────────────────────────
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    createSmsCode: vi.fn().mockResolvedValue(undefined),
    getValidSmsCode: vi.fn(),
    markSmsCodeUsed: vi.fn().mockResolvedValue(undefined),
    getUserByOpenId: vi.fn(),
    upsertUser: vi.fn().mockResolvedValue(undefined),
  };
});

// ─── Mock SDK ─────────────────────────────────────────────────────────────────
vi.mock("./_core/sdk", () => ({
  sdk: {
    signSession: vi.fn().mockResolvedValue("mock-jwt-token"),
    authenticateRequest: vi.fn().mockRejectedValue(new Error("Not authenticated")),
  },
}));

// ─── Mock ENV ─────────────────────────────────────────────────────────────────
vi.mock("./_core/env", () => ({
  ENV: {
    appId: "test-app-id",
    cookieSecret: "test-secret",
    databaseUrl: "",
    oAuthServerUrl: "",
    ownerOpenId: "",
    isProduction: false,
    forgeApiUrl: "",
    forgeApiKey: "",
  },
}));

import * as db from "./db";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function createMockContext(): TrpcContext {
  const mockReq = {
    headers: { cookie: "" },
    protocol: "https",
    ip: "127.0.0.1",
  } as any;
  const mockRes = {
    cookie: vi.fn(),
    clearCookie: vi.fn(),
  } as any;
  return {
    req: mockReq,
    res: mockRes,
    user: null,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("auth.sendSmsCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create SMS code and return success for valid phone", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.sendSmsCode({ phone: "13800138000" });

    expect(result.success).toBe(true);
    expect(result.message).toBe("验证码已发送");
    expect(db.createSmsCode).toHaveBeenCalledWith(
      "13800138000",
      expect.stringMatching(/^\d{6}$/),
      expect.any(Date)
    );
  });

  it("should reject invalid phone number format (too short)", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.sendSmsCode({ phone: "12345" })
    ).rejects.toThrow();
  });

  it("should reject phone numbers not starting with 1[3-9]", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.sendSmsCode({ phone: "12800138000" })
    ).rejects.toThrow();
  });

  it("should generate a 6-digit numeric code", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await caller.auth.sendSmsCode({ phone: "13900139000" });

    const [, code] = (db.createSmsCode as any).mock.calls[0];
    expect(code).toMatch(/^\d{6}$/);
    expect(parseInt(code)).toBeGreaterThanOrEqual(100000);
    expect(parseInt(code)).toBeLessThanOrEqual(999999);
  });

  it("should set expiry to ~10 minutes in the future", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const before = Date.now();

    await caller.auth.sendSmsCode({ phone: "13700137000" });

    const [, , expiresAt] = (db.createSmsCode as any).mock.calls[0];
    const expiresMs = expiresAt.getTime();
    expect(expiresMs).toBeGreaterThan(before + 9 * 60 * 1000);
    expect(expiresMs).toBeLessThan(before + 11 * 60 * 1000);
  });
});

describe("auth.loginWithPhone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should login successfully with valid code and set cookie", async () => {
    const mockSmsRecord = {
      id: 1,
      phone: "13800138000",
      code: "123456",
      purpose: "login" as const,
      isUsed: false,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      createdAt: new Date(),
    };
    const mockUser = {
      id: 42,
      openId: "phone_13800138000",
      name: "13800138000",
      phone: "13800138000",
      email: null,
      avatar: null,
      loginMethod: "phone",
      role: "user" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    vi.mocked(db.getValidSmsCode).mockResolvedValue(mockSmsRecord);
    vi.mocked(db.getUserByOpenId).mockResolvedValue(mockUser);

    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.loginWithPhone({
      phone: "13800138000",
      code: "123456",
    });

    expect(result.success).toBe(true);
    expect(result.user.phone).toBe("13800138000");
    expect(result.user.role).toBe("user");
    expect(db.markSmsCodeUsed).toHaveBeenCalledWith(1);
    expect(db.upsertUser).toHaveBeenCalledWith(
      expect.objectContaining({
        openId: "phone_13800138000",
        phone: "13800138000",
        loginMethod: "phone",
      })
    );
    // Cookie should be set
    expect(ctx.res.cookie).toHaveBeenCalledWith(
      "app_session_id",
      "mock-jwt-token",
      expect.any(Object)
    );
  });

  it("should reject with wrong verification code", async () => {
    vi.mocked(db.getValidSmsCode).mockResolvedValue(undefined);

    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.loginWithPhone({ phone: "13800138000", code: "000000" })
    ).rejects.toThrow("验证码错误或已过期");
  });

  it("should reject with expired or used code (returns undefined)", async () => {
    vi.mocked(db.getValidSmsCode).mockResolvedValue(undefined);

    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.loginWithPhone({ phone: "13800138000", code: "123456" })
    ).rejects.toThrow();
  });

  it("should reject code that is not 6 digits", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.loginWithPhone({ phone: "13800138000", code: "12345" })
    ).rejects.toThrow();
  });

  it("should use phone_{number} format as openId", async () => {
    const mockSmsRecord = {
      id: 2,
      phone: "13912345678",
      code: "654321",
      purpose: "login" as const,
      isUsed: false,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      createdAt: new Date(),
    };
    const mockUser = {
      id: 99,
      openId: "phone_13912345678",
      name: "13912345678",
      phone: "13912345678",
      email: null,
      avatar: null,
      loginMethod: "phone",
      role: "user" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    vi.mocked(db.getValidSmsCode).mockResolvedValue(mockSmsRecord);
    vi.mocked(db.getUserByOpenId).mockResolvedValue(mockUser);

    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await caller.auth.loginWithPhone({ phone: "13912345678", code: "654321" });

    expect(db.upsertUser).toHaveBeenCalledWith(
      expect.objectContaining({ openId: "phone_13912345678" })
    );
    expect(db.getUserByOpenId).toHaveBeenCalledWith("phone_13912345678");
  });
});

/**
 * Tests for email-based registration and login procedures
 * auth.registerWithEmail and auth.loginWithEmail
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock bcrypt ───────────────────────────────────────────────────────────────
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed_password_mock"),
    compare: vi.fn(),
  },
}));

// ─── Mock DB ──────────────────────────────────────────────────────────────────
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getUserByEmail: vi.fn(),
    getUserByOpenId: vi.fn(),
    upsertUser: vi.fn().mockResolvedValue(undefined),
    setUserPasswordHash: vi.fn().mockResolvedValue(undefined),
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
import bcrypt from "bcryptjs";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function createMockContext(): TrpcContext {
  return {
    req: { headers: { cookie: "" }, protocol: "https" } as any,
    res: { cookie: vi.fn(), clearCookie: vi.fn() } as any,
    user: null,
  };
}

const mockUser = {
  id: 1,
  openId: "email_test@example.com",
  name: "Test User",
  email: "test@example.com",
  phone: null,
  avatar: null,
  loginMethod: "email",
  passwordHash: "hashed_password_mock",
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

// ─── registerWithEmail Tests ───────────────────────────────────────────────────
describe("auth.registerWithEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should register a new user successfully", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue(undefined);
    vi.mocked(db.getUserByOpenId).mockResolvedValue(mockUser);

    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.registerWithEmail({
      email: "test@example.com",
      password: "password123",
      name: "Test User",
    });

    expect(result.success).toBe(true);
    expect(result.user.email).toBe("test@example.com");
    expect(db.upsertUser).toHaveBeenCalledWith(
      expect.objectContaining({
        openId: "email_test@example.com",
        email: "test@example.com",
        loginMethod: "email",
      })
    );
    expect(db.setUserPasswordHash).toHaveBeenCalledWith(
      "email_test@example.com",
      "hashed_password_mock"
    );
    expect(ctx.res.cookie).toHaveBeenCalledWith(
      "app_session_id",
      "mock-jwt-token",
      expect.any(Object)
    );
  });

  it("should use email prefix as default name when name not provided", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue(undefined);
    vi.mocked(db.getUserByOpenId).mockResolvedValue(mockUser);

    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await caller.auth.registerWithEmail({
      email: "john.doe@example.com",
      password: "password123",
    });

    expect(db.upsertUser).toHaveBeenCalledWith(
      expect.objectContaining({ name: "john.doe" })
    );
  });

  it("should reject if email already registered", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue(mockUser);

    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.registerWithEmail({ email: "test@example.com", password: "password123" })
    ).rejects.toThrow("该邮箱已注册");
  });

  it("should reject password shorter than 8 characters", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.registerWithEmail({ email: "test@example.com", password: "short" })
    ).rejects.toThrow();
  });

  it("should reject invalid email format", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.registerWithEmail({ email: "not-an-email", password: "password123" })
    ).rejects.toThrow();
  });
});

// ─── loginWithEmail Tests ──────────────────────────────────────────────────────
describe("auth.loginWithEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should login successfully with correct credentials", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue(mockUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.loginWithEmail({
      email: "test@example.com",
      password: "password123",
    });

    expect(result.success).toBe(true);
    expect(result.user.email).toBe("test@example.com");
    expect(ctx.res.cookie).toHaveBeenCalledWith(
      "app_session_id",
      "mock-jwt-token",
      expect.any(Object)
    );
  });

  it("should reject with wrong password", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue(mockUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.loginWithEmail({ email: "test@example.com", password: "wrongpassword" })
    ).rejects.toThrow("邮箱或密码错误");
  });

  it("should reject if email not found", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue(undefined);

    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.loginWithEmail({ email: "notfound@example.com", password: "password123" })
    ).rejects.toThrow("邮箱或密码错误");
  });

  it("should reject if user has no password (phone-only user)", async () => {
    const phoneUser = { ...mockUser, passwordHash: null };
    vi.mocked(db.getUserByEmail).mockResolvedValue(phoneUser as any);

    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.loginWithEmail({ email: "test@example.com", password: "password123" })
    ).rejects.toThrow("邮箱或密码错误");
  });

  it("should reject invalid email format", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.loginWithEmail({ email: "bad-email", password: "password123" })
    ).rejects.toThrow();
  });
});

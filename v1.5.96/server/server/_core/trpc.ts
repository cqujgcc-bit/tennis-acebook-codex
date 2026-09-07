import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const isDev = process.env.NODE_ENV !== "production";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    // Detect sensitive database/internal error messages that should never reach the client
    const isSensitiveMessage =
      error.message?.includes("Failed query") ||
      error.message?.includes("select ") ||
      error.message?.includes("insert ") ||
      error.message?.includes("update ") ||
      error.message?.includes("delete ") ||
      error.message?.includes("ECONNREFUSED") ||
      error.message?.includes("ER_") ||
      error.message?.includes("Access denied");

    const isInternalError = shape.data.code === "INTERNAL_SERVER_ERROR";

    // Always mask sensitive messages; in production also mask all internal errors
    const safeMessage =
      isSensitiveMessage || (!isDev && isInternalError)
        ? "服务器内部错误，请稍后重试"
        : shape.message;

    // Log sensitive errors server-side so they are not lost
    if (isSensitiveMessage) {
      console.error("[tRPC] Masked sensitive error:", error.message);
    }
    // Always log INTERNAL_SERVER_ERROR with full details for debugging
    if (isInternalError) {
      console.error("[tRPC] INTERNAL_SERVER_ERROR at", shape.data.path, ":", error.message, error.cause);
    }

    return {
      ...shape,
      message: safeMessage,
      data: {
        ...shape.data,
        // Never expose stack traces in production
        stack: isDev ? shape.data.stack : undefined,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  // Check if user is banned (allow admins through regardless)
  if ((ctx.user as any).status === "banned" && ctx.user.role !== "admin") {
    const reason = (ctx.user as any).banReason;
    throw new TRPCError({
      code: "FORBIDDEN",
      message: reason
        ? `您的账号已被封禁。封禁原因：${reason}`
        : "您的账号已被封禁，如有异议请联系平台客服。",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

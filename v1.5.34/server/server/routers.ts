import { z } from "zod";
import bcrypt from "bcryptjs";
import { COOKIE_NAME } from "@shared/const";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import * as db from "./db";
import { createPrepay, refundOrder, transferToUser, generateOrderId, isWxpayConfigured } from "./wxpay";
import { notifyOwner } from "./_core/notification";
import { smsSendVerifyCode } from "./sms";
import {
  wxNotifyBookingToStudent,
  wxNotifyBookingToCoach,
  wxNotifyCoachContactToStudent,
  wxNotifyStudentContactToCoach,
  wxNotifyCoachApproved,
  wxNotifyCoachRejected,
  wxNotifyCircleMatch,
  wxNotifyMatchJoin,
} from "./wechat-notify";
// ─── Helper: coach-only guard ─────────────────────────────────────────────────
// v2: 含密码登录、测试账户、教练角色设置
const coachProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "coach" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "仅教练可操作" });
  }
  return next({ ctx });
});

const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "仅管理员可操作" });
  }
  return next({ ctx });
});

// ─── Venue photo matcher ─────────────────────────────────────────────────────
// 深圳常用网球场实景照片（已上传到 /manus-storage/）
// 后期可替换为高德 Places Photo API

// 精确匹配：深圳常用球场名称关键词 → 实景照片
const SHENZHEN_VENUE_PHOTOS: Record<string, string> = {
  // 南山区
  "深云文体公园": "/manus-storage/shenyun_wentigongyuan_b1ebf798.jpg",
  "深云": "/manus-storage/shenyun_wentigongyuan_b1ebf798.jpg",
  "大沙河网球": "/manus-storage/dashahe_wangqiu_89abde6b.jpg",
  "大沙河国际": "/manus-storage/dashahe_wangqiu_89abde6b.jpg",
  "弘金地": "/manus-storage/hongjindi_wangqiu_f76502f1.jpg",
  "弘金地网球": "/manus-storage/hongjindi_wangqiu_f76502f1.jpg",
  "弘金地费雷罗": "/manus-storage/hongjindi_wangqiu_f76502f1.jpg",
  "深圳湾体育中心": "/manus-storage/shenzhenwang_tiyuzhongxin_f968f210.jpg",
  "深圳湾体育": "/manus-storage/shenzhenwang_tiyuzhongxin_f968f210.jpg",
  "春茧": "/manus-storage/shenzhenwang_tiyuzhongxin_f968f210.jpg",
  "深圳湾训练基地": "/manus-storage/shenzhenwan_xunlian_8f6ed075.jpg",
  // 福田区
  "香蜜体育中心": "/manus-storage/xiangmi_tiyuzhongxin_1a956f13.jpg",
  "香蜜公园体育": "/manus-storage/xiangmi_tiyuzhongxin_1a956f13.jpg",
  "香蜜公园": "/manus-storage/xiangmi_tiyuzhongxin_1a956f13.jpg",
  "香蜜网球": "/manus-storage/xiangmi_tiyuzhongxin_1a956f13.jpg",
  "深圳市体育中心网球": "/manus-storage/shenzhen_tiyuzhongxin_ef3eb9dd.jpg",
  "市体育中心网球": "/manus-storage/shenzhen_tiyuzhongxin_ef3eb9dd.jpg",
  "市体育中心": "/manus-storage/shenzhen_tiyuzhongxin_ef3eb9dd.jpg",
  "当代车辆段": "/manus-storage/meilin_wentigongyuan_4f4e70d8.jpg",
  // 福田/龙华区
  "下梅林文体公园": "/manus-storage/meilin_wentigongyuan_4f4e70d8.jpg",
  "下梅林": "/manus-storage/meilin_wentigongyuan_4f4e70d8.jpg",
  "梅林文体": "/manus-storage/meilin_wentigongyuan_4f4e70d8.jpg",
  "梅林网球": "/manus-storage/meilin_wentigongyuan_4f4e70d8.jpg",
  // 南山/荔香区
  "荔香公园网球": "/manus-storage/lixiang_gongyuan_848849e7.jpg",
  "荔香公园": "/manus-storage/lixiang_gongyuan_848849e7.jpg",
  "荔香网球": "/manus-storage/lixiang_gongyuan_848849e7.jpg",
  // 龙岗区
  "大运中心网球": "/manus-storage/dayun_zhongxin_a5fa7b24.jpg",
  "大运中心": "/manus-storage/dayun_zhongxin_a5fa7b24.jpg",
  "大运网球": "/manus-storage/dayun_zhongxin_a5fa7b24.jpg",
  "龙岗大运": "/manus-storage/dayun_zhongxin_a5fa7b24.jpg",
  // 罗湖区
  "罗湖网球中心": "/manus-storage/luohu_wangqiu_d7d5cf3e.jpg",
  "罗湖网球": "/manus-storage/luohu_wangqiu_d7d5cf3e.jpg",
  "罗湖体育馆": "/manus-storage/luohu_wangqiu_d7d5cf3e.jpg",
  // 网羽中心
  "网羽中心": "/manus-storage/shenzhen_tiyuzhongxin_ef3eb9dd.jpg",
  "深圳市网羽中心": "/manus-storage/shenzhen_tiyuzhongxin_ef3eb9dd.jpg",
};

// 通用备选图库（匹配不到具体场地时按类型随机选一张）
const FALLBACK_VENUE_PHOTOS = [
  "/manus-storage/shenyun_wentigongyuan_b1ebf798.jpg",   // 深云文体公园鸟瞰
  "/manus-storage/dayun_zhongxin_a5fa7b24.jpg",          // 大运中心鸟瞰
  "/manus-storage/shenzhenwang_tiyuzhongxin_f968f210.jpg", // 深圳湾体育中心
  "/manus-storage/xiangmi_tiyuzhongxin_1a956f13.jpg",    // 香蜜体育中心
  "/manus-storage/dashahe_wangqiu_89abde6b.jpg",         // 大沙河网球中心
];

function getVenuePhoto(venueName: string): string {
  if (!venueName) return FALLBACK_VENUE_PHOTOS[0];
  // 先尝试精确匹配深圳常用球场
  for (const [keyword, photoUrl] of Object.entries(SHENZHEN_VENUE_PHOTOS)) {
    if (venueName.includes(keyword)) {
      return photoUrl;
    }
  }
  // 未匹配到具体场地，从通用备选图库随机选一张
  return FALLBACK_VENUE_PHOTOS[Math.floor(Math.random() * FALLBACK_VENUE_PHOTOS.length)];
}

// ─── Notification helper ──────────────────────────────────────────────────────
async function sendNotification(userId: number, type: string, title: string, content: string, relatedId?: number) {
  try {
    await db.createNotification({ userId, type, title, content, relatedId });
  } catch (e) {
    console.warn("Notification failed:", e);
  }
}

// ─── 候补名单自动补位 helper ───────────────────────────────────────────────────
// 当一个空位出现（有人退出 / 发起人增加名额）时调用。
// 免费局：把候补名单第 1 名（最早加入）直接转正为 confirmed，计数 +1，并通知。
// 收费局：向所有候补者广播「有空位，先到先得」（接位时才付费，沿用 join 流程），
//         本函数不自动转正收费局候补，返回 false（空位仍开放，待先到者 join）。
// 返回值：true 表示空位已被实际补上（仅免费局即时转正时为 true）。
async function tryPromoteFromWaitlist(matchId: number, matchTitle: string): Promise<boolean> {
  try {
    const dbInst = await db.getDb();
    if (!dbInst) return false;
    const match = await db.getTennisMatchById(matchId);
    if (!match) return false;
    // 仅在仍有空位且球局可报名时补位（currentParticipants 已含发起人，直接与 maxParticipants 比较）
    if (match.status !== "open" || match.currentParticipants >= match.maxParticipants) return false;
    const { matchParticipants: mp, matchMessages: mm } = await import("../drizzle/schema");
    const { eq, and, asc } = await import("drizzle-orm");
    // 取候补名单（按加入时间升序，先到先得）
    const waiters = await dbInst.select().from(mp)
      .where(and(eq(mp.matchId, matchId), eq(mp.status, "waitlist")))
      .orderBy(asc(mp.createdAt));
    if (!waiters.length) return false;

    const needsPayment = !!((match as any).feeRequired && match.feePerPerson && Number(match.feePerPerson) > 0);

    if (!needsPayment) {
      // 免费局：第 1 名直接转正
      const first = waiters[0];
      await dbInst.update(mp).set({ status: "confirmed", paymentStatus: "not_required" })
        .where(and(eq(mp.matchId, matchId), eq(mp.userId, first.userId)));
      await db.updateTennisMatchParticipantCount(matchId, 1);
      const _afterFill = await db.getTennisMatchById(matchId);
      if (_afterFill && (_afterFill.currentParticipants ?? 0) >= (_afterFill.maxParticipants ?? 0)) {
        await db.updateTennisMatchStatus(matchId, "full");
      }
      // 通知补位成功者
      await sendNotification(first.userId, "system", "候补成功 🎾",
        `有人退出，您已从候补名单补位成功，进入球局「${matchTitle}」。请准时到场！`, matchId);
      try {
        const u = await db.getUserById(first.userId);
        if (u?.wechatOpenid) {
          await wxNotifyMatchJoin({ openid: u.wechatOpenid, matchTitle, joinerName: "您" }).catch(() => {});
        }
      } catch { /* ignore */ }
      // 群系统消息
      try {
        const u2 = await db.getUserById(first.userId);
        await dbInst.insert(mm).values({ matchId, userId: first.userId, content: `${u2?.name ?? "候补球友"} 从候补名单补位成功 🎾`, msgType: "system" });
      } catch { /* ignore */ }
      return true;
    }

    // 收费局：广播「有空位，先到先得」，接位者点击后走正常 join+支付流程
    for (const w of waiters) {
      await sendNotification(w.userId, "system", "球局有空位啦 🎾",
        `您候补的球局「${matchTitle}」出现空位，先到先得！请尽快进入球局完成报名与支付（名额有限，可能被他人抢先）。`, matchId);
      try {
        const u = await db.getUserById(w.userId);
        if (u?.wechatOpenid) {
          await wxNotifyMatchJoin({ openid: u.wechatOpenid, matchTitle, joinerName: "候补提醒" }).catch(() => {});
        }
      } catch { /* ignore */ }
    }
    return false;
  } catch (e: any) {
    console.warn("[tryPromoteFromWaitlist] failed:", e?.message || e);
    return false;
  }
}

export const appRouter = router({
  system: systemRouter,

  // ─── Auth ──────────────────────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    // ─── Phone + SMS login ───────────────────────────────────────────────────────
    sendSmsCode: publicProcedure
      .input(z.object({ phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入正确的手机号") }))
      .mutation(async ({ input }) => {
        const { phone } = input;
        // Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await db.createSmsCode(phone, code, expiresAt);

        // 通过阿里云短信发送验证码（fire-and-forget，不阻塞响应）
        smsSendVerifyCode({ phone, code }).catch(console.error);
        // 开发环境同时打印到控制台方便调试
        if (process.env.NODE_ENV !== "production") {
          console.log(`[SMS Dev] 手机号: ${phone}, 验证码: ${code} (有效期10分钟)`);
        }

        return { success: true, message: "验证码已发送" };
      }),

    loginWithPhone: publicProcedure
      .input(z.object({
        phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入正确的手机号"),
        code: z.string().length(6, "验证码必须为6位"),
      }))
      .mutation(async ({ input, ctx }) => {
        const { phone, code } = input;

        // Verify SMS code
        const smsRecord = await db.getValidSmsCode(phone, code);
        if (!smsRecord) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "验证码错误或已过期，请重新获取",
          });
        }

        // Mark code as used
        await db.markSmsCodeUsed(smsRecord.id);

        // Upsert user — use phone_{number} as openId for compatibility
        const openId = `phone_${phone}`;
        await db.upsertUser({
          openId,
          phone,
          name: phone, // default name is phone number, user can update later
          loginMethod: "phone",
          lastSignedIn: new Date(),
        });

        const user = await db.getUserByOpenId(openId);
        if (!user) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "用户创建失败" });
        }

        // Sign JWT session
        const sessionToken = await sdk.signSession({
          openId,
          appId: ENV.appId,
          name: user.name || phone,
        });

        // Set cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

        return {
          success: true,
          user: {
            id: user.id,
            name: user.name,
            phone: user.phone,
            role: user.role,
            avatar: user.avatar,
          },
        };
      }),

    // ─── Email register/login ────────────────────────────────────────────────
    registerWithEmail: publicProcedure
      .input(z.object({
        email: z.string().email("请输入正确的邮箱地址"),
        password: z.string().min(8, "密码至少8位").max(64, "密码最多64位"),
        name: z.string().min(1, "请输入姓名").max(50).optional(),
        phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入正确的手机号").optional(),
        wechatId: z.string().min(1).max(100).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { email, password, name, phone, wechatId } = input;

        // Check if email already registered
        const existing = await db.getUserByEmail(email);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "该邮箱已注册，请直接登录" });
        }

        const passwordHash = await bcrypt.hash(password, 8);
        const openId = `email_${email}`;

        await db.upsertUser({
          openId,
          email,
          name: name || email.split("@")[0],
          phone: phone || undefined,
          wechatId: wechatId || undefined,
          loginMethod: "email",
          lastSignedIn: new Date(),
        });
        await db.setUserPasswordHash(openId, passwordHash);

        const user = await db.getUserByOpenId(openId);
        if (!user) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "注册失败" });
        }

        const sessionToken = await sdk.signSession({
          openId,
          appId: ENV.appId,
          name: user.name || email,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

        return {
          success: true,
          user: { id: user.id, name: user.name, email: user.email, role: user.role },
        };
      }),

    loginWithEmail: publicProcedure
      .input(z.object({
        email: z.string().email("请输入正确的邮箱地址"),
        password: z.string().min(1, "请输入密码"),
      }))
      .mutation(async ({ input, ctx }) => {
        const { email, password } = input;

        const user = await db.getUserByEmail(email);
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "邮箱或密码错误" });
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "邮箱或密码错误" });
        }

        // Update last signed in
        await db.upsertUser({
          openId: user.openId,
          lastSignedIn: new Date(),
        });

        const sessionToken = await sdk.signSession({
          openId: user.openId,
          appId: ENV.appId,
          name: user.name || email,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

        return {
          success: true,
                    user: { id: user.id, name: user.name, email: user.email, role: user.role },
        };
      }),
    // ─── Phone + Password register/login ────────────────────────────────
    registerWithPhone: publicProcedure
      .input(z.object({
        phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入正确的手机号"),
        password: z.string().min(8, "密码至少8位").max(64, "密码最多64位"),
        name: z.string().min(1, "请输入姓名").max(50).optional(),
        code: z.string().length(6, "验证码必须为6位"),
      }))
      .mutation(async ({ input, ctx }) => {
        const { phone, password, name, code } = input;
        const smsRecord = await db.getValidSmsCode(phone, code);
        if (!smsRecord) throw new TRPCError({ code: "BAD_REQUEST", message: "验证码错误或已过期，请重新获取" });
        await db.markSmsCodeUsed(smsRecord.id);
        const openId = `phone_${phone}`;
        const existing = await db.getUserByOpenId(openId);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "该手机号已注册，请直接登录" });
        const passwordHash = await bcrypt.hash(password, 8);
        await db.upsertUser({ openId, phone, name: name || phone, loginMethod: "phone_password", lastSignedIn: new Date() });
        await db.setUserPasswordHash(openId, passwordHash);
        const user = await db.getUserByOpenId(openId);
        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "注册失败" });
        const sessionToken = await sdk.signSession({ openId, appId: ENV.appId, name: user.name || phone });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);
        return { success: true, user: { id: user.id, name: user.name, phone: user.phone, role: user.role } };
      }),
    loginWithPassword: publicProcedure
      .input(z.object({
        phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入正确的手机号"),
        password: z.string().min(1, "请输入密码"),
      }))
      .mutation(async ({ input, ctx }) => {
        const { phone, password } = input;
        const openId = `phone_${phone}`;
        const user = await db.getUserByOpenId(openId);
        if (!user || !user.passwordHash) throw new TRPCError({ code: "UNAUTHORIZED", message: "手机号或密码错误" });
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "手机号或密码错误" });
        await db.upsertUser({ openId, lastSignedIn: new Date() });
        const sessionToken = await sdk.signSession({ openId, appId: ENV.appId, name: user.name || phone });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);
        return { success: true, user: { id: user.id, name: user.name, phone: user.phone, role: user.role } };
      }),

    // ─── 微信小程序登录 ──────────────────────────────────────────────────────────────────────────────
    // 小程序前端调用 wx.login() 获取 code，传到后端换取 openid 并建立会话
    loginWithWechat: publicProcedure
      .input(z.object({
        code: z.string().min(1, "微信登录 code 不能为空"),
        nickName: z.string().optional(),
        avatarUrl: z.string().optional(),
        phoneCode: z.string().optional(), // getPhoneNumber 返回的动态令牌，传了则登录时绑定手机号
      }))
      .mutation(async ({ input, ctx }) => {
        const { code, nickName, avatarUrl, phoneCode } = input;

        // 用 code 换取 openid
        const { code2Session } = await import("./_core/wechat");
        let sessionData: { openid: string; session_key: string };
        try {
          sessionData = await code2Session(code);
        } catch (err: any) {
          console.error("[loginWithWechat] code2Session failed:", err?.message || String(err));
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "微信登录失败，请重试",
          });
        }

        const { openid: wechatOpenid } = sessionData;

        // 查找或创建用户
        let user = await db.getUserByWechatOpenid(wechatOpenid);
        if (!user) {
          user = await db.createUserByWechat(wechatOpenid, nickName, avatarUrl);
        } else {
          // 更新最后登录时间
          await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
        }

        if (!user) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "用户创建失败" });
        }

        // 若前端提供了 getPhoneNumber 动态令牌，且用户尚未绑定手机号，则登录时一并绑定
        if (phoneCode && !user.phone) {
          try {
            const { getPhoneNumberByCode } = await import("./_core/wechat");
            const phone = await getPhoneNumberByCode(phoneCode);
            if (phone) {
              await db.upsertUser({ openId: user.openId, phone });
              user = { ...user, phone } as typeof user;
            }
          } catch (err: any) {
            // 手机号绑定失败不阻断登录，仅记录日志
            console.error("[loginWithWechat] bind phone failed:", err?.message || String(err));
          }
        }

        // 签发 JWT 会话
        const sessionToken = await sdk.signSession({
          openId: user.openId,
          appId: ENV.appId,
          name: user.name || "微信用户",
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

        return {
          success: true,
          token: sessionToken,
          user: {
            id: user.id,
            name: user.name,
            phone: user.phone,
            role: user.role,
            avatar: user.avatar,
            gender: user.gender,
            city: user.city,
            tennisLevel: user.tennisLevel,
            ntrpLevel: (user as any).ntrpLevel,
            createdAt: user.createdAt ? new Date(user.createdAt).getTime() : Date.now(),
            isNewUser: !user.phone, // 新用户尚未绑定手机号
          },
        };
      }),

    // ─── 微信登录绑定手机号 ──────────────────────────────────────────────────────────────────────────────
    // 微信登录后如果是新用户，引导绑定手机号（可选）
    bindPhoneToWechat: protectedProcedure
      .input(z.object({
        phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入正确的手机号"),
        code: z.string().length(6, "验证码必须为6位"),
      }))
      .mutation(async ({ input, ctx }) => {
        const { phone, code } = input;
        const smsRecord = await db.getValidSmsCode(phone, code);
        if (!smsRecord) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "验证码错误或已过期" });
        }
        await db.markSmsCodeUsed(smsRecord.id);
        // 更新手机号
        const db2 = await import("./db");
        await db2.upsertUser({ openId: ctx.user.openId, phone, lastSignedIn: new Date() });
        return { success: true };
      }),

    // ─── 小程序专用：邮箱密码登录（返回JWT token，不依赖Cookie）─────────────────────────────
    miniLoginWithEmail: publicProcedure
      .input(z.object({
        email: z.string().email("请输入正确的邮箱地址"),
        password: z.string().min(1, "请输入密码"),
      }))
      .mutation(async ({ input }) => {
        const { email, password } = input;
        // 先查找已有账号
        let user = await db.getUserByEmail(email);
        if (!user) {
          // 新用户自动注册
          if (password.length < 6) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "密码至少6位" });
          }
          const passwordHash = await bcrypt.hash(password, 8);
          const openId = `email_${email}`;
          await db.upsertUser({ openId, email, name: email.split("@")[0], loginMethod: "email", lastSignedIn: new Date() });
          await db.setUserPasswordHash(openId, passwordHash);
          user = await db.getUserByOpenId(openId);
          if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "注册失败" });
        } else {
          // 已有账号，验证密码
          if (!user.passwordHash) {
            throw new TRPCError({ code: "UNAUTHORIZED", message: "该邮箱未设置密码，请通过网页端登录" });
          }
          const valid = await bcrypt.compare(password, user.passwordHash);
          if (!valid) {
            throw new TRPCError({ code: "UNAUTHORIZED", message: "邮箱或密码错误" });
          }
          await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
          user = await db.getUserByOpenId(user.openId);
          if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "用户不存在" });
        }
        const token = await sdk.signSession({ openId: user.openId, appId: ENV.appId, name: user.name || email });
        return {
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            avatar: user.avatar,
            gender: user.gender,
            city: user.city,
            tennisLevel: user.tennisLevel,
            ntrpLevel: user.ntrpLevel,
            createdAt: user.createdAt ? new Date(user.createdAt).getTime() : Date.now(),
          },
        };
      }),

    // ─── 小程序专用：手机号验证码登录（返回JWT token）─────────────────────────────────────
    miniLoginWithPhone: publicProcedure
      .input(z.object({
        phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入正确的手机号"),
        code: z.string().length(6, "验证码必须为6位"),
      }))
      .mutation(async ({ input }) => {
        const { phone, code } = input;
        const smsRecord = await db.getValidSmsCode(phone, code);
        if (!smsRecord) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "验证码错误或已过期，请重新获取" });
        }
        await db.markSmsCodeUsed(smsRecord.id);
        const openId = `phone_${phone}`;
        await db.upsertUser({ openId, phone, name: phone, loginMethod: "phone", lastSignedIn: new Date() });
        const user = await db.getUserByOpenId(openId);
        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "用户创建失败" });
        const token = await sdk.signSession({ openId, appId: ENV.appId, name: user.name || phone });
        return {
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            avatar: user.avatar,
            gender: user.gender,
            city: user.city,
            tennisLevel: user.tennisLevel,
            ntrpLevel: user.ntrpLevel,
            createdAt: user.createdAt ? new Date(user.createdAt).getTime() : Date.now(),
          },
        };
      }),

    // ─── 小程序专用：手机号+密码登录（返回JWT token）────────────────────────────────
    miniLoginWithPassword: publicProcedure
      .input(z.object({
        phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入正确的手机号"),
        password: z.string().min(1, "请输入密码"),
      }))
      .mutation(async ({ input }) => {
        const { phone, password } = input;
        const openId = `phone_${phone}`;
        const user = await db.getUserByOpenId(openId);
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "手机号或密码错误" });
        }
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "手机号或密码错误" });
        await db.upsertUser({ openId, lastSignedIn: new Date() });
        const token = await sdk.signSession({ openId, appId: ENV.appId, name: user.name || phone });
        return {
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            avatar: user.avatar,
            gender: user.gender,
            city: user.city,
            tennisLevel: user.tennisLevel,
            ntrpLevel: user.ntrpLevel,
            createdAt: user.createdAt ? new Date(user.createdAt).getTime() : Date.now(),
          },
        };
      }),

    // ─── 小程序专用：保存微信 openid（静默绑定，用于订阅消息推送）────────────────────────────────
    saveWechatOpenid: protectedProcedure
      .input(z.object({
        code: z.string().min(1, "wx.login code 不能为空"),
      }))
      .mutation(async ({ input, ctx }) => {
        const { code2Session } = await import("./_core/wechat");
        const session = await code2Session(input.code);
        if (!session.openid) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "无法获取微信 openid" });
        }
        await db.bindWechatOpenid(ctx.user.id, session.openid);
        return { success: true };
      }),

    // ─── 小程序专用：手机号+密码注册（返回JWT token）────────────────────────────────
    miniRegisterWithPassword: publicProcedure
      .input(z.object({
        phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入正确的手机号"),
        password: z.string().min(6, "密码至少6位").max(64),
        name: z.string().min(1).max(50).optional(),
      }))
      .mutation(async ({ input }) => {
        const { phone, password, name } = input;
        const openId = `phone_${phone}`;
        const existing = await db.getUserByOpenId(openId);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "该手机号已注册，请直接登录" });
        const passwordHash = await bcrypt.hash(password, 8);
        await db.upsertUser({ openId, phone, name: name || phone, loginMethod: "phone_password", lastSignedIn: new Date() });
        await db.setUserPasswordHash(openId, passwordHash);
        const user = await db.getUserByOpenId(openId);
        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "注册失败" });
        const token = await sdk.signSession({ openId, appId: ENV.appId, name: user.name || phone });
        return {
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            avatar: user.avatar,
            gender: user.gender,
            city: user.city,
            tennisLevel: user.tennisLevel,
            ntrpLevel: user.ntrpLevel,
            createdAt: user.createdAt ? new Date(user.createdAt).getTime() : Date.now(),
          },
        };
      }),

    // 通过手机号查找用户（供替代人选功能使用）
    findUserByPhone: protectedProcedure
      .input(z.object({ phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入正确的手机号") }))
      .query(async ({ input }) => {
        const user = await db.getUserByPhone(input.phone);
        if (!user) return null;
        return { id: user.id, name: user.name, avatar: user.avatar };
      }),
    // ─── 临时调试：微信支付配置状态 ───────────────────────────────────────────
    wxpayDebug: publicProcedure
      .mutation(async () => {
        const { isWxpayConfigured, wxpayConfig } = await import("./wxpay");
        const configured = isWxpayConfigured();
        // 尝试查询最近5条订单状态
        let recentOrders: any[] = [];
        let ordersError: string | null = null;
        try {
          recentOrders = await db.getRecentMatchOrders(5);
        } catch (e: any) {
          ordersError = e?.message || String(e);
        }
        // 检查公鑰格式（用于回调签名验证）
        const publicKeyPreview = wxpayConfig.publicKey
          ? wxpayConfig.publicKey.substring(0, 60) + '...'
          : 'EMPTY';
        const privateKeyPreview = wxpayConfig.privateKey
          ? wxpayConfig.privateKey.substring(0, 60) + '...'
          : 'EMPTY';
        return {
          isWxpayConfigured: configured,
          appId: wxpayConfig.appId ? wxpayConfig.appId.substring(0, 8) + '...' : 'EMPTY',
          mchId: wxpayConfig.mchId ? wxpayConfig.mchId : 'EMPTY',
          hasApiV3Key: !!wxpayConfig.apiV3Key,
          apiV3KeyLength: wxpayConfig.apiV3Key?.length || 0,
          hasSerialNo: !!wxpayConfig.serialNo,
          serialNo: wxpayConfig.serialNo || 'EMPTY',
          privateKeyLength: wxpayConfig.privateKey?.length || 0,
          privateKeyPreview,
          hasPublicKey: !!wxpayConfig.publicKey,
          publicKeyId: wxpayConfig.publicKeyId || 'EMPTY',
          publicKeyPreview,
          notifyUrl: wxpayConfig.notifyUrl,
          recentOrders,
          ordersError,
        };
      }),
  }),
  // ─── Coaches ───────────────────────────────────────────────────────────────
  coach: router({
    list: publicProcedure
      .input(z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        /** Filter by weekly availability: 0=Sun,1=Mon,...,6=Sat */
        dayOfWeek: z.number().min(0).max(6).optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        let coaches = await db.getCoachProfiles(input);
        // Filter by weekly availability if requested
        if (input?.dayOfWeek !== undefined && input.startTime && input.endTime) {
          const availableIds = await db.getCoachIdsByWeeklyAvailability(
            input.dayOfWeek, input.startTime, input.endTime
          );
          coaches = coaches.filter(c => availableIds.includes(c.id));
        }
        // Attach venues, availability, and teaching locations for each coach
        const withVenues = await Promise.all(
          coaches.map(async (c) => {
            const venues = await db.getCoachVenues(c.id);
            const availability = await db.getCoachAvailability(c.id);
            const teachingLocations = await db.getCoachLocations(c.id);
            return { ...c, venues, availability, teachingLocations };
          })
        );
        return withVenues;
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const coach = await db.getCoachProfileById(input.id);
        if (!coach) throw new TRPCError({ code: "NOT_FOUND" });
        const reviews = await db.getCoachReviews(input.id);
        const venues = await db.getCoachVenues(input.id);
        const availability = await db.getCoachAvailability(input.id);
        const reservedSlots = await db.getCoachReservedSlotsPublic(input.id);
        return { coach, reviews, venues, availability, reservedSlots };
      }),

    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const coach = await db.getCoachProfileBySlug(input.slug);
        if (!coach) throw new TRPCError({ code: "NOT_FOUND" });
        const reviews = await db.getCoachReviews(coach.id);
        const venues = await db.getCoachVenues(coach.id);
        const reservedSlots = await db.getCoachReservedSlotsPublic(coach.id);
        return { coach, reviews, venues, reservedSlots };
      }),

    checkMyApplication: protectedProcedure.query(async ({ ctx }) => {
      // Any logged-in user can check if they already have a coach profile
      const profile = await db.getCoachProfileByUserId(ctx.user.id);
      if (!profile) return { exists: false, profile: null };
      return { exists: true, profile };
    }),

    myProfile: coachProcedure.query(async ({ ctx }) => {
      const profile = await db.getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "教练档案不存在" });
      const venues = await db.getCoachVenues(profile.id);
      const availability = await db.getCoachAvailability(profile.id);
      return { profile, venues, availability };
    }),

    createProfile: protectedProcedure
      .input(z.object({
        displayName: z.string().min(2),
        tagline: z.string().optional(),
        bio: z.string().optional(),
        phone: z.string().optional(), // coach contact phone
        yearsExperience: z.number().optional(),
        certifications: z.array(z.string()).optional(),
        certificationImages: z.array(z.string()).optional(), // uploaded cert image URLs
        specialties: z.array(z.string()).optional(),
        achievements: z.array(z.string()).optional(),
        pricePerHour: z.string().optional(),
        socialLinks: z.object({
          xiaohongshu: z.string().optional(),
          wechat: z.string().optional(),
          weibo: z.string().optional(),
          douyin: z.string().optional(),
          other: z.string().optional(),
        }).optional(),
        videoUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await db.getCoachProfileByUserId(ctx.user.id);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "教练档案已存在" });

        const inviteCode = nanoid(8).toUpperCase();
        const shareSlug = input.displayName.replace(/\s+/g, "-").toLowerCase() + "-" + nanoid(4);

        await db.createCoachProfile({
          userId: ctx.user.id,
          displayName: input.displayName,
          tagline: input.tagline,
          bio: input.bio,
          phone: input.phone,
          yearsExperience: input.yearsExperience ?? 0,
          certifications: input.certifications ?? [],
          certificationImages: input.certificationImages ?? [],
          specialties: input.specialties ?? [],
          achievements: input.achievements ?? [],
          pricePerHour: input.pricePerHour ?? "600.00",
          socialLinks: input.socialLinks ?? {},
          videoUrl: input.videoUrl,
          inviteCode,
          shareSlug,
          verificationStatus: "pending", // 直接进入待审核队列
        });

        // Note: role is NOT upgraded here — user must submitForReview and await admin approval
        // Notify owner about new coach application
        await notifyOwner({
          title: `新教练入驻申请 🎾`,
          content: `${ctx.user.name ?? ctx.user.email ?? "未知用户"} 提交了教练入驻申请，请到管理后台审核。`,
        });

        return { success: true, inviteCode, shareSlug };
      }),

    updateProfile: coachProcedure
      .input(z.object({
        displayName: z.string().optional(),
        tagline: z.string().optional(),
        bio: z.string().optional(),
        phone: z.string().optional(), // coach contact phone
        avatar: z.string().optional(),
        coverImage: z.string().optional(),
        yearsExperience: z.number().optional(),
        certifications: z.array(z.string()).optional(),
        certificationImages: z.array(z.string()).optional(),
        specialties: z.array(z.string()).optional(),
        achievements: z.array(z.string()).optional(),
        pricePerHour: z.string().optional(),
        socialLinks: z.object({
          xiaohongshu: z.string().optional(),
          wechat: z.string().optional(),
          weibo: z.string().optional(),
          douyin: z.string().optional(),
          other: z.string().optional(),
        }).optional(),
        videoUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getCoachProfileByUserId(ctx.user.id);
        if (!profile) throw new TRPCError({ code: "NOT_FOUND" });
        // If coach updates promotional content (social links or video), reset content review to pending
        const hasPromoContent = input.socialLinks !== undefined || input.videoUrl !== undefined;
        const updateData: Record<string, any> = { ...input };
        if (hasPromoContent) {
          updateData.contentReviewStatus = "pending";
          updateData.contentReviewNote = null;
        }
        await db.updateCoachProfile(profile.id, updateData);
        return { success: true, contentReviewReset: hasPromoContent };
      }),

    setAvailability: coachProcedure
      .input(z.object({
        slots: z.array(z.object({
          dayOfWeek: z.number().optional(),
          specificDate: z.string().optional(),
          startTime: z.string(),
          endTime: z.string(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getCoachProfileByUserId(ctx.user.id);
        if (!profile) throw new TRPCError({ code: "NOT_FOUND" });
        await db.setCoachAvailability(profile.id, input.slots);
        return { success: true };
      }),

    // ── Weekly availability: add/remove individual slots ─────────────────────
    addWeeklySlot: coachProcedure
      .input(z.object({
        dayOfWeek: z.number().min(0).max(6),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime: z.string().regex(/^\d{2}:\d{2}$/),
        specificDate: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getCoachProfileByUserId(ctx.user.id);
        if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "教练档案不存在" });
        if (input.startTime >= input.endTime)
          throw new TRPCError({ code: "BAD_REQUEST", message: "结束时间必须晚于开始时间" });
        await db.addCoachWeeklySlot(profile.id, input.dayOfWeek, input.startTime, input.endTime, input.specificDate);
        return { success: true };
      }),

    removeWeeklySlot: coachProcedure
      .input(z.object({ slotId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getCoachProfileByUserId(ctx.user.id);
        if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "教练档案不存在" });
        await db.removeCoachWeeklySlot(profile.id, input.slotId);
        return { success: true };
      }),

    // ── Price per hour ────────────────────────────────────────────────────────
    /** Minimum price: 300 CNY/hr to protect platform's premium positioning */
    updatePricePerHour: coachProcedure
      .input(z.object({
        pricePerHour: z.string().refine(v => {
          const n = parseFloat(v);
          return !isNaN(n) && n >= 300;
        }, { message: "课时单价不能低于平台最低标准 300 元/小时" }),
      }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getCoachProfileByUserId(ctx.user.id);
        if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "教练档案不存在" });
        await db.updateCoachProfile(profile.id, { pricePerHour: input.pricePerHour });
        return { success: true };
      }),

    bindVenue: coachProcedure
      .input(z.object({ venueId: z.number(), isPreferred: z.boolean().optional() }))
      .mutation(async ({ ctx, input }) => {
        let profile = await db.getCoachProfileByUserId(ctx.user.id);
        if (!profile) {
          // Auto-create coach profile for admin users who don't have one yet
          const inviteCode = nanoid(8).toUpperCase();
          const shareSlug = (ctx.user.name ?? "coach").replace(/\s+/g, "-").toLowerCase() + "-" + nanoid(4);
          await db.createCoachProfile({
            userId: ctx.user.id,
            displayName: ctx.user.name ?? "教练",
            inviteCode,
            shareSlug,
          });
          profile = await db.getCoachProfileByUserId(ctx.user.id);
          if (!profile) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "无法创建教练档案" });
        }
        await db.addCoachVenue(profile.id, input.venueId, input.isPreferred ?? false);
        return { success: true };
      }),

    unbindVenue: coachProcedure
      .input(z.object({ venueId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getCoachProfileByUserId(ctx.user.id);
        if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "教练档案不存在" });
        await db.removeCoachVenue(profile.id, input.venueId);
        return { success: true };
      }),

    setVenuePreferred: coachProcedure
      .input(z.object({ venueId: z.number(), isPreferred: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getCoachProfileByUserId(ctx.user.id);
        if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "教练档案不存在" });
        await db.setCoachVenuePreferred(profile.id, input.venueId, input.isPreferred);
        return { success: true };
      }),

    allVenues: coachProcedure.query(async () => {
      return db.getAllVenues();
    }),

    // ── Reserved slots (coach has pre-booked a venue) ──────────────────────────
    reservedSlots: coachProcedure.query(async ({ ctx }) => {
      const profile = await db.getCoachProfileByUserId(ctx.user.id);
      if (!profile) return []; // No profile yet, return empty
      return db.getCoachReservedSlots(profile.id);
    }),

    addReservedSlot: coachProcedure
      .input(z.object({
        specificDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式应为 YYYY-MM-DD"),
        startTime: z.string().regex(/^\d{2}:\d{2}$/, "时间格式应为 HH:MM"),
        endTime: z.string().regex(/^\d{2}:\d{2}$/, "时间格式应为 HH:MM"),
        venueId: z.number(),
        courtNo: z.string().optional(),
        venueNote: z.string().max(200).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        let profile = await db.getCoachProfileByUserId(ctx.user.id);
        if (!profile) {
          const inviteCode = nanoid(8).toUpperCase();
          const shareSlug = (ctx.user.name ?? "coach").replace(/\s+/g, "-").toLowerCase() + "-" + nanoid(4);
          await db.createCoachProfile({
            userId: ctx.user.id,
            displayName: ctx.user.name ?? "教练",
            inviteCode,
            shareSlug,
          });
          profile = await db.getCoachProfileByUserId(ctx.user.id);
          if (!profile) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "无法创建教练档案" });
        }
        await db.addCoachReservedSlot({ coachId: profile.id, ...input });
        return { success: true };
      }),

    removeReservedSlot: coachProcedure
      .input(z.object({ slotId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getCoachProfileByUserId(ctx.user.id);
        if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "教练档案不存在" });
        await db.removeCoachReservedSlot(input.slotId, profile.id);
        return { success: true };
      }),

    // Submit coach profile for admin review
    submitForReview: coachProcedure.mutation(async ({ ctx }) => {
      const profile = await db.getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "请先创建教练档案" });
      if (profile.verificationStatus === "approved") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "资质已通过审核" });
      }
      if (profile.verificationStatus === "pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "已提交审核，请等待管理员处理" });
      }
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { coachProfiles } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await dbInstance.update(coachProfiles)
        .set({ verificationStatus: "pending" })
        .where(eq(coachProfiles.id, profile.id));
      return { success: true };
    }),

    stats: coachProcedure.query(async ({ ctx }) => {
      const profile = await db.getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError({ code: "NOT_FOUND" });
      const stats = await db.getCoachStats(profile.id);
      const earnings = await db.getCoachEarnings(profile.id);
      return { ...stats, ...earnings };
    }),

    students: coachProcedure.query(async ({ ctx }) => {
      const profile = await db.getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError({ code: "NOT_FOUND" });
      return db.getCoachStudents(profile.id);
    }),

    bookings: coachProcedure
      .input(z.object({ status: z.string().optional() }).optional())
      .query(async ({ ctx }) => {
        const profile = await db.getCoachProfileByUserId(ctx.user.id);
        if (!profile) throw new TRPCError({ code: "NOT_FOUND" });
        const bookingList = await db.getBookingsByCoach(profile.id);
        // Enrich with student and venue info
        const enriched = await Promise.all(bookingList.map(async (b) => {
          const student = await db.getUserById(b.studentId);
          const venue = b.venueId ? await db.getVenueById(b.venueId) : null;
          return { ...b, student, venue };
        }));
        const publicEnriched = enriched.filter((m: any) => !m.circleOnly);
        return publicEnriched;
      }),

    confirmBooking: coachProcedure
      .input(z.object({ bookingId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getCoachProfileByUserId(ctx.user.id);
        if (!profile) throw new TRPCError({ code: "NOT_FOUND" });
        const booking = await db.getBookingById(input.bookingId);
        if (!booking || booking.coachId !== profile.id) throw new TRPCError({ code: "FORBIDDEN" });
        if (booking.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "预约状态不正确" });

        await db.updateBookingStatus(input.bookingId, "confirmed", { confirmedAt: new Date() });
        await sendNotification(booking.studentId, "booking_confirmed",
          "预约已确认 ✅",
          `您的课程预约已被教练确认！时间：${booking.lessonDate} ${booking.startTime}-${booking.endTime}`,
          input.bookingId
        );

        // ── 预约确认后互发联系方式（微信订阅消息）──────────────────────────────
        try {
          const [studentUser, coachUser] = await Promise.all([
            db.getUserById(booking.studentId),
            db.getUserById(profile.userId),
          ]);
          const coachPhone = (profile as any).phone as string | undefined;
          const studentPhone = studentUser?.phone as string | undefined;

          // 发给学员：教练手机号
          if (studentUser?.wechatOpenid && coachPhone) {
            wxNotifyCoachContactToStudent({
              openid: studentUser.wechatOpenid,
              coachName: profile.displayName,
              coachPhone,
            }).catch(console.error);
          }
          // 发给教练：学员手机号
          if (coachUser?.wechatOpenid && studentPhone) {
            wxNotifyStudentContactToCoach({
              openid: coachUser.wechatOpenid,
              studentName: studentUser?.name ?? "学员",
              studentPhone,
            }).catch(console.error);
          }
        } catch (wxErr) {
          console.error("[WxNotify] Failed to send contact info:", wxErr);
        }

        return { success: true };
      }),

    rejectBooking: coachProcedure
      .input(z.object({ bookingId: z.number(), reason: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getCoachProfileByUserId(ctx.user.id);
        if (!profile) throw new TRPCError({ code: "NOT_FOUND" });
        const booking = await db.getBookingById(input.bookingId);
        if (!booking || booking.coachId !== profile.id) throw new TRPCError({ code: "FORBIDDEN" });

        await db.updateBookingStatus(input.bookingId, "rejected", {
          cancelReason: input.reason,
          cancelledAt: new Date(),
        });
        // Refund
        await db.updatePaymentStatus(input.bookingId, "refunded");
        await sendNotification(booking.studentId, "booking_rejected",
          "预约被拒绝",
          `您的课程预约被教练拒绝。原因：${input.reason ?? "教练时间冲突"}。费用将退回原支付方式。`,
          input.bookingId
        );
        return { success: true };
      }),

    cancelBooking: coachProcedure
      .input(z.object({ bookingId: z.number(), reason: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getCoachProfileByUserId(ctx.user.id);
        if (!profile) throw new TRPCError({ code: "NOT_FOUND" });
        const booking = await db.getBookingById(input.bookingId);
        if (!booking || booking.coachId !== profile.id) throw new TRPCError({ code: "FORBIDDEN" });

        await db.updateBookingStatus(input.bookingId, "cancelled_by_coach", {
          cancelReason: input.reason,
          cancelledAt: new Date(),
        });
        await db.updatePaymentStatus(input.bookingId, "refunded");
        await sendNotification(booking.studentId, "booking_cancelled",
          "课程已取消",
          `教练取消了您的课程（${booking.lessonDate} ${booking.startTime}）。费用将退回原支付方式。`,
          input.bookingId
        );
        return { success: true };
      }),

    coupons: coachProcedure.query(async ({ ctx }) => {
      const profile = await db.getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError({ code: "NOT_FOUND" });
      return db.getCoachCoupons(profile.id);
    }),

    createCoupon: coachProcedure
      .input(z.object({
        name: z.string(),
        type: z.enum(["fixed", "percent"]),
        discountValue: z.string(),
        minOrderAmount: z.string().optional(),
        maxUsageCount: z.number().optional(),
        isFirstLesson: z.boolean().optional(),
        validDays: z.number().default(30),
      }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getCoachProfileByUserId(ctx.user.id);
        if (!profile) throw new TRPCError({ code: "NOT_FOUND" });
        const code = nanoid(8).toUpperCase();
        const validFrom = new Date();
        const validUntil = new Date(Date.now() + input.validDays * 86400000);
        await db.createCoupon({
          coachId: profile.id,
          code,
          name: input.name,
          type: input.type,
          discountValue: input.discountValue,
          minOrderAmount: input.minOrderAmount,
          maxUsageCount: input.maxUsageCount,
          isFirstLesson: input.isFirstLesson,
          validFrom,
          validUntil,
        });
        return { success: true, code };
      }),

    // ── Coach Locations ──────────────────────────────────────────────────────────────────
    myLocations: coachProcedure.query(async ({ ctx }) => {
      const profile = await db.getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError({ code: "NOT_FOUND" });
      return db.getCoachLocations(profile.id);
    }),

    addLocation: coachProcedure
      .input(z.object({
        name: z.string().min(1),
        address: z.string().min(1),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        isPrimary: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getCoachProfileByUserId(ctx.user.id);
        if (!profile) throw new TRPCError({ code: "NOT_FOUND" });
        const locations = await db.getCoachLocations(profile.id);
        if (locations.length >= 5) throw new TRPCError({ code: "BAD_REQUEST", message: "最多添加5个常用教学地点" });
        await db.addCoachLocation(profile.id, input);
        return { success: true };
      }),

    removeLocation: coachProcedure
      .input(z.object({ locationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getCoachProfileByUserId(ctx.user.id);
        if (!profile) throw new TRPCError({ code: "NOT_FOUND" });
        await db.removeCoachLocation(profile.id, input.locationId);
        return { success: true };
      }),

    setPrimaryLocation: coachProcedure
      .input(z.object({ locationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getCoachProfileByUserId(ctx.user.id);
        if (!profile) throw new TRPCError({ code: "NOT_FOUND" });
        await db.setPrimaryCoachLocation(profile.id, input.locationId);
        return { success: true };
      }),

    // ── PKU Discount ──────────────────────────────────────────────────────────────────────
    setPkuDiscount: coachProcedure
      .input(z.object({
        pkuDiscount: z.number().min(0).max(99), // 0=不折扣, 90=9折, 85=8.5折
      }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getCoachProfileByUserId(ctx.user.id);
        if (!profile) throw new TRPCError({ code: "NOT_FOUND" });
        await db.updateCoachProfile(profile.id, { pkuDiscount: input.pkuDiscount });
        return { success: true };
      }),

    // ── Lesson Packages ──────────────────────────────────────────────────────────────────
    myPackages: coachProcedure.query(async ({ ctx }) => {
      const profile = await db.getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError({ code: "NOT_FOUND" });
      return db.getLessonPackagesByCoach(profile.id);
    }),

    createPackage: coachProcedure
      .input(z.object({
        name: z.string().min(1),
        totalLessons: z.number().min(1).max(100),
        price: z.string(),
        originalPrice: z.string().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getCoachProfileByUserId(ctx.user.id);
        if (!profile) throw new TRPCError({ code: "NOT_FOUND" });
        await db.createLessonPackage({ coachId: profile.id, ...input });
        return { success: true };
      }),

    deletePackage: coachProcedure
      .input(z.object({ packageId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getCoachProfileByUserId(ctx.user.id);
        if (!profile) throw new TRPCError({ code: "NOT_FOUND" });
        await db.deleteLessonPackage(input.packageId, profile.id);
        return { success: true };
      }),

    studentPackages: coachProcedure.query(async ({ ctx }) => {
      const profile = await db.getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError({ code: "NOT_FOUND" });
      const pkgs = await db.getStudentPackagesByCoach(profile.id);
      return Promise.all(pkgs.map(async (p) => {
        const student = await db.getUserById(p.studentId);
        const pkg = await db.getLessonPackageById(p.packageId);
        return { ...p, student, packageName: pkg?.name };
      }));
    }),

    deductLesson: coachProcedure
      .input(z.object({
        studentPackageId: z.number(),
        bookingId: z.number().optional(),
        note: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const pkg = await db.getStudentPackageById(input.studentPackageId);
        if (!pkg) throw new TRPCError({ code: "NOT_FOUND", message: "课时包不存在" });
        const profile = await db.getCoachProfileByUserId(ctx.user.id);
        if (!profile || pkg.coachId !== profile.id) throw new TRPCError({ code: "FORBIDDEN" });
        if (pkg.status !== "active") throw new TRPCError({ code: "BAD_REQUEST", message: "课时包状态异常" });
        await db.deductStudentPackageLesson(input.studentPackageId, ctx.user.id, input.bookingId, input.note);
        await sendNotification(
          pkg.studentId, "system",
          "课时已扣减",
          `教练已确认完成一节课，剩余课时：${pkg.remainingLessons - 1}节。`,
          undefined
        );
        return { success: true, remainingLessons: pkg.remainingLessons - 1 };
      }),
  }),

  // ─── Tennis Match (约球) ──────────────────────────────────────────────────────────────────
  match: router({
    list: publicProcedure
      .input(z.object({
        status: z.string().optional(),
        matchType: z.string().optional(),
        levelRequired: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        onlyAvailable: z.boolean().optional(),
        city: z.string().optional(),
        ntrpMin: z.number().optional(),
        ntrpMax: z.number().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
        nearbyLat: z.number().optional(),
        nearbyLng: z.number().optional(),
        nearbyRadiusKm: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        const matches = await db.getTennisMatches(input);
        // Haversine 距离计算（km）
        function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
          const R = 6371;
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLng = (lng2 - lng1) * Math.PI / 180;
          const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
          return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        }
        // 丰富组织者信息（小程序首页卡片需要）
        const enriched = await Promise.all(matches.map(async (m: any) => {
          const author = await db.getUserById(m.authorId);
          let distanceKm: number | null = null;
          if (input?.nearbyLat != null && input?.nearbyLng != null && m.latitude != null && m.longitude != null) {
            distanceKm = Math.round(haversineKm(input.nearbyLat, input.nearbyLng, Number(m.latitude), Number(m.longitude)) * 10) / 10;
          }
          return {
            ...m,
            organizerName: author?.name ?? null,
            organizerAvatar: author?.avatar ?? null,
            distanceKm,
          };
        }));
        // 过滤 circleOnly 球局（非圈内成员不可见）
        const publicMatches = enriched.filter((m: any) => !m.circleOnly);
        // 附近模式：按距离过滤 + 排序
        if (input?.nearbyLat != null && input?.nearbyLng != null) {
          const radius = input.nearbyRadiusKm ?? 15;
          return publicMatches
            .filter(m => m.distanceKm != null && m.distanceKm <= radius)
            .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
        }
        return publicMatches;
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const match = await db.getTennisMatchById(input.id);
        if (!match) throw new TRPCError({ code: "NOT_FOUND" });
        // 确保 circleOnly 和 feeRequired 字段存在，即使数据库中没有，也默认为 false
        const safeMatch = { ...match, circleOnly: (match as any).circleOnly ?? false, feeRequired: (match as any).feeRequired ?? false };
        // 仅圈内可见的球局：需要是圈子成员才能查看
        if (safeMatch.circleOnly && safeMatch.circleId) {
          if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "该球局仅限圈内成员查看，请先登录" });
          const dbInstance = await db.getDb();
          if (dbInstance) {
            const { circleMembers } = await import("../drizzle/schema");
            const { eq, and } = await import("drizzle-orm");
            const [membership] = await dbInstance.select().from(circleMembers)
              .where(and(eq(circleMembers.circleId, safeMatch.circleId), eq(circleMembers.userId, ctx.user.id))).limit(1);
            if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "该球局仅限圈内成员查看" });
          }
        }
        const participants = await db.getMatchParticipants(input.id);
        const author = await db.getUserById(match.authorId);
        const enrichedParticipants = await Promise.all(
          participants.map(async (p) => {
            const user = await db.getUserById(p.userId);
            return { ...p, user: user ? { id: user.id, name: user.name, avatar: user.avatar, ntrpLevel: user.ntrpLevel, creditScore: user.creditScore } : null };
          })
        );
        // 只展示正式参与者（confirmed），保持 participants 字段与旧前端兼容；另外单独返回候补名单
        // 排除发起人自身的参与记录（历史数据/异常流程可能让发起人也有一条 confirmed 记录），
        // 避免发起人被同时算作 author 和 participant 导致人数重复计数、状态错误。
        const confirmedParticipants = enrichedParticipants.filter((p: any) => p.status === "confirmed" && p.userId !== match.authorId);
        const waitlistParticipants = enrichedParticipants
          .filter((p: any) => p.status === "waitlist")
          .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        // 当前用户自己的报名状态（含 pending 待支付占位），供前端展示「继续支付」入口
        let myParticipation: { status: string; paymentStatus: string; topupAmount?: number; paidAmount?: number } | null = null;
        if (ctx.user) {
          const mine = enrichedParticipants.find((p: any) => p.userId === ctx.user!.id);
          if (mine) myParticipation = { status: (mine as any).status, paymentStatus: (mine as any).paymentStatus, topupAmount: Number((mine as any).topupAmount || 0), paidAmount: Number((mine as any).paidAmount || 0) };
        }
        // 实时按真实在册人数纠正返回的 currentParticipants 与 status，
        // 不依赖可能被历史脏数据污染的字段，保证前端显示准确。
        // 真实在册人数 = 发起人(1) + 非发起人的 confirmed 报名者。
        const realCurrent = 1 + confirmedParticipants.length;
        const maxP = (match.maxParticipants ?? realCurrent);
        let correctedStatus = match.status;
        // 仅在未取消/未完成时根据人数纠正 open/full；不触碰 cancelled/completed
        if (match.status === "open" || match.status === "full") {
          correctedStatus = realCurrent >= maxP ? "full" : "open";
        }
        const correctedMatch = { ...match, currentParticipants: realCurrent, status: correctedStatus };
        return {
          match: correctedMatch,
          participants: confirmedParticipants,
          waitlist: waitlistParticipants,
          waitlistCount: waitlistParticipants.length,
          myParticipation,
          author: author ? { id: author.id, name: author.name, avatar: author.avatar, ntrpLevel: author.ntrpLevel, creditScore: author.creditScore } : null,
        };
      }),

    create: protectedProcedure
      .input(z.object({
        title: z.string().min(2).max(100),
        matchType: z.enum(["singles", "doubles", "mixed_doubles", "practice", "group"]),
        levelRequired: z.enum(["itf1", "itf2", "itf3", "itf4", "itf5", "itf6", "itf7", "itf8", "itf9", "itf10", "any"]).default("any"),
        matchDate: z.string(),
        startTime: z.string(),
        endTime: z.string().optional(),
        venueName: z.string().min(1),
        venueAddress: z.string().optional(),
        courtNo: z.string().max(50).optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        maxParticipants: z.number().min(2).max(20),
        description: z.string().optional(),
        contactInfo: z.string().optional(),
        costPerPerson: z.number().optional(),
        imageUrl: z.string().optional(),
        city: z.string().default("shenzhen"),
        ntrpMin: z.number().min(1).max(6).optional(),
        ntrpMax: z.number().min(1).max(6).optional(),
        costSplitType: z.enum(["free", "aa", "host_pays", "custom"]).default("aa"),
        bringOwnBall: z.boolean().default(false),
        feeRequired: z.boolean().default(false),
        feePerPerson: z.number().optional(),
        paymentDeadline: z.number().optional(),
        circleId: z.number().optional(),
        circleOnly: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const resolvedImageUrl = input.imageUrl || getVenuePhoto(input.venueName);
        // 记录场地总费用（= 发布时人均 × 名额上限），用于后续扩员重算人均与退差价
        let courtTotalFee: number | undefined = undefined;
        if (input.feeRequired && input.feePerPerson && input.feePerPerson > 0 && input.maxParticipants > 0) {
          courtTotalFee = Math.round(input.feePerPerson * input.maxParticipants * 100) / 100;
        }
        const newMatch = await db.createTennisMatch({ authorId: ctx.user.id, ...input, courtTotalFee, imageUrl: resolvedImageUrl });
        // 圈内发起球局 → 通知圈其他成员
        if (input.circleId) {
          try {
            const dbInst = await db.getDb();
            if (dbInst) {
              const { circleMembers, circles } = await import("../drizzle/schema");
              const { eq } = await import("drizzle-orm");
              const [circle] = await dbInst.select().from(circles).where(eq(circles.id, input.circleId)).limit(1);
              const members = await dbInst.select().from(circleMembers).where(eq(circleMembers.circleId, input.circleId));
              const author = await db.getUserById(ctx.user.id);
              for (const m of members) {
                if (m.userId === ctx.user.id) continue;
                await sendNotification(m.userId, "circle_match", "圈内新球局", `${author?.name || '有人'} 在圈子「${circle?.name || ''}」发起了球局「${input.title}」`, newMatch?.id ?? undefined);
              }
            }
          } catch (e) { console.warn("circle match notify failed", e); }
        }
        return { success: true, matchId: newMatch?.id ?? 0 };
      }),

    join: protectedProcedure
      .input(z.object({ matchId: z.number(), message: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const match = await db.getTennisMatchById(input.matchId);
        if (!match) throw new TRPCError({ code: "NOT_FOUND" });
        // 确保 circleOnly 和 feeRequired 字段存在，即使数据库中没有，也默认为 false
        const safeMatch = { ...match, circleOnly: (match as any).circleOnly ?? false, feeRequired: (match as any).feeRequired ?? false };
        if (match.status !== "open") throw new TRPCError({ code: "BAD_REQUEST", message: "该约球已不可报名" });
        if (match.authorId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "不能报名自己发布的约球" });
        // 开球时间一到即截止报名（兜底，防止绕过前端）
        if (new Date(`${match.matchDate}T${match.startTime}:00+08:00`).getTime() <= Date.now()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "该球局已开始，无法报名" });
        }
        // 信用分为 0 时禁止直接报名
        const joiningUser = await db.getUserById(ctx.user.id);
        if (joiningUser && joiningUser.creditScore <= 0) {
          throw new TRPCError({ code: "FORBIDDEN", message: "CREDIT_ZERO" });
        }
        // ★ V6 欠费拦截：存在未结清的待补缴记录时，必须先缴清才能报名新球局
        const hasArrears = await db.hasTopupPending(ctx.user.id);
        if (hasArrears) {
          throw new TRPCError({ code: "FORBIDDEN", message: "TOPUP_PENDING" });
        }
        const existing = await db.getMatchParticipant(input.matchId, ctx.user.id);
        if (existing && existing.status === "confirmed") throw new TRPCError({ code: "BAD_REQUEST", message: "已经报名" });
        // 人数口径：currentParticipants 已含发起人（schema 默认 1），直接与 maxParticipants 比较判满
        if (match.currentParticipants >= match.maxParticipants) throw new TRPCError({ code: "BAD_REQUEST", message: "人数已满" });
        // 是否需要预付场地费
        const needsPayment = !!(match.feeRequired && match.feePerPerson && Number(match.feePerPerson) > 0);
        // ★ 收费局：报名仅创建「待支付占位」(status=pending)，不占名额、不通知；支付成功回调后才转 confirmed 并占位
        //   免费局：维持原逻辑，一键即 confirmed 占位
        if (needsPayment) {
          const dbInst = await db.getDb();
          if (dbInst) {
            const { matchParticipants: mp } = await import("../drizzle/schema");
            const { eq, and } = await import("drizzle-orm");
            if (existing) {
              // 重新报名（之前已退出/待支付），重置为待支付占位
              await dbInst.update(mp).set({ status: "pending", paymentStatus: "pending" })
                .where(and(eq(mp.matchId, input.matchId), eq(mp.userId, ctx.user.id)));
            } else {
              await dbInst.insert(mp).values({ matchId: input.matchId, userId: ctx.user.id, message: input.message, status: "pending", paymentStatus: "pending" });
            }
          }
          // 收费局此处不加计数、不发通知、不进群聊，全部留到支付成功回调处理
          return { success: true, needsPayment: true };
        }
        // ── 免费局：直接确认占位 ──
        if (existing) {
          const dbInst = await db.getDb();
          if (dbInst) {
            const { matchParticipants: mp } = await import("../drizzle/schema");
            const { eq, and } = await import("drizzle-orm");
            await dbInst.update(mp).set({ status: "confirmed", paymentStatus: "not_required" }).where(and(eq(mp.matchId, input.matchId), eq(mp.userId, ctx.user.id)));
          }
        } else {
          await db.joinTennisMatch(input.matchId, ctx.user.id, input.message, "not_required");
        }
        await db.updateTennisMatchParticipantCount(input.matchId, 1);
        // 计数已落库，查真实值判满，避免 +1 预判提前满员
        const _afterJoin = await db.getTennisMatchById(input.matchId);
        if (_afterJoin && (_afterJoin.currentParticipants ?? 0) >= (_afterJoin.maxParticipants ?? 0)) {
          await db.updateTennisMatchStatus(input.matchId, "full");
        }
        // Notify author
        const joiner = await db.getUserById(ctx.user.id);
        await sendNotification(match.authorId, "system", "新的报名", `${joiner?.name ?? "有人"}报名了您的约球「${match.title}」。`, undefined);
        // 微信订阅消息通知发布者
        try {
          const author = await db.getUserById(match.authorId);
          if (author?.wechatOpenid) {
            await wxNotifyMatchJoin({
              openid: author.wechatOpenid,
              matchTitle: match.title,
              joinerName: joiner?.name ?? "小伙伴",
            });
          }
        } catch (_e) { /* 微信通知失败不影响主流程 */ }
        // 群聊系统消息：加入球局
        try {
          const { matchMessages: _mm } = await import("../drizzle/schema");
          const _dbInst = await db.getDb();
          if (_dbInst) {
            await _dbInst.insert(_mm).values({
              matchId: input.matchId,
              userId: ctx.user.id,
              content: `${joiner?.name ?? "小伙伴"} 加入了球局 🎾`,
              msgType: "system",
            });
          }
        } catch (_e) { /* 系统消息失败不影响主流程 */ }
        return { success: true };
      }),

    leave: protectedProcedure
      .input(z.object({ matchId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const match = await db.getTennisMatchById(input.matchId);
        if (!match) throw new TRPCError({ code: "NOT_FOUND" });
        // 确保 circleOnly 和 feeRequired 字段存在，即使数据库中没有，也默认为 false
        const safeMatch = { ...match, circleOnly: (match as any).circleOnly ?? false, feeRequired: (match as any).feeRequired ?? false };
        const participant = await db.getMatchParticipant(input.matchId, ctx.user.id);
        if (!participant || (participant.status !== "confirmed" && participant.status !== "pending")) throw new TRPCError({ code: "BAD_REQUEST", message: "您尚未报名此约球" });

        // ★ 待支付占位（pending）取消：还未真正付款、不占名额，直接置 cancelled，无需退款/扣分/减计数
        if (participant.status === "pending") {
          await db.leaveTennisMatch(input.matchId, ctx.user.id);
          return { success: true, penalized: false, refunded: false, refundMessage: "" };
        }

        // 分级退款规则：
        //   diffHours >= 2：开球前2小时以上取消 → 全额退款给退出者
        //   1 <= diffHours < 2：开球前1-2小时取消 → 退 50%给退出者，50%给组织者
        //   diffHours < 1（含已开球但 < 24h）：不退款，全额给组织者
        const matchDateTime = new Date(`${match.matchDate}T${match.startTime}:00+08:00`);
        const now = new Date();
        const diffMs = matchDateTime.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        // isPastDeadline: 开球前 2h 内且尚未结束（用于扣分判断）
        const isPastDeadline = diffHours < 2 && diffHours > -24;
        // 退款比例：2h以上=全额，1-2h=50%，1h内=0
        const refundRatio = diffHours >= 2 ? 1.0 : diffHours >= 1 ? 0.5 : 0.0;
        // 组织者得到比例：2h以上=0，1-2h=50%，1h内=100%
        const organizerRatio = 1.0 - refundRatio;

        // ─── 退款处理：若已付款，按分级规则处理 ──────────────
        let refunded = false;
        let refundMessage = "";
        // 注意：paymentStatus 可能是 paid（回调已处理）或 pending（已支付但回调未到）
        if (participant.paymentStatus === "paid" || participant.paymentStatus === "pending") {
          try {
            const dbInst = await db.getDb();
            if (dbInst) {
              const { matchOrders, matchParticipants: mp } = await import("../drizzle/schema");
              const { eq, and, inArray } = await import("drizzle-orm");
              // 查找订单：优先用 participant.orderId，屜底从 match_orders 表查
              let resolvedOrderId = participant.orderId;
              if (!resolvedOrderId) {
                const fallback = await dbInst.select().from(matchOrders)
                  .where(and(
                    eq(matchOrders.matchId, input.matchId),
                    eq(matchOrders.userId, ctx.user.id),
                    inArray(matchOrders.status, ["paid", "pending"])
                  ))
                  .limit(1);
                if (fallback.length > 0) resolvedOrderId = fallback[0].orderId;
              }
              const [order] = resolvedOrderId
                ? await dbInst.select().from(matchOrders).where(eq(matchOrders.orderId, resolvedOrderId)).limit(1)
                : [];
              // pending 状态：查询微信侧确认是否已实际支付
              if (order && order.status === "pending") {
                const { queryOrder } = await import("./wxpay");
                const wxOrder = await queryOrder(resolvedOrderId!);
                if (wxOrder?.trade_state === "SUCCESS") {
                  order.status = "paid" as typeof order.status;
                } else {
                  console.log(`[leave] 订单未实际支付，跳过处理: orderId=${resolvedOrderId} wxState=${wxOrder?.trade_state}`);
                  order.status = "refunded" as typeof order.status; // 跳过后续处理
                }
              }
              if (order && order.status === "paid") {
                const totalFen = Math.round(Number(order.amount) * 100);
                if (refundRatio > 0) {
                  // 退款给退出者
                  const refundFen = Math.floor(totalFen * refundRatio);
                  const refundAmount = (refundFen / 100).toFixed(2);
                  const refundId = `RF${resolvedOrderId}`;
                  await refundOrder({
                    orderId: resolvedOrderId!,
                    refundId,
                    totalFen,
                    refundFen,
                    reason: `用户取消报名-${match.title} ${match.matchDate} ${match.startTime}`.slice(0, 80),
                  });
                  await dbInst.update(matchOrders)
                    .set({ status: "refunded", refundId, refundReason: "用户取消报名", refundedAt: new Date() })
                    .where(eq(matchOrders.orderId, resolvedOrderId!));
                  await dbInst.update(mp)
                    .set({ paymentStatus: "refunded" })
                    .where(and(eq(mp.matchId, input.matchId), eq(mp.userId, ctx.user.id)));
                  refunded = true;
                  if (refundRatio === 1.0) {
                    refundMessage = `¥${order.amount} 退款已发起，预计1-3个工作日到账`;
                  } else {
                    refundMessage = `开球前1-2小时取消，退还 50%（¥${refundAmount}），剩余 50% 由平台托管，球局结束后结算给组织者`;
                  }
                  console.log(`[leave] 退款成功 userId=${ctx.user.id} orderId=${resolvedOrderId} refundFen=${refundFen} refundRatio=${refundRatio}`);
                } else {
                  // 不退款，订单保持 paid 状态，球局结束后由结算流程统一处理
                  // 仅更新参与者状态，订单保持 paid 以便结算时计入总金额
                  await dbInst.update(mp)
                    .set({ paymentStatus: "refunded", status: "cancelled" })
                    .where(and(eq(mp.matchId, input.matchId), eq(mp.userId, ctx.user.id)));
                  refundMessage = "开球前1小时内取消，场地费不予退还，球局结束后将结算给组织者";
                }
              } else if (!order) {
                console.warn(`[leave] 未找到订单 userId=${ctx.user.id} matchId=${input.matchId}`);
                refundMessage = "未找到支付订单，请联系客服处理";
              } else {
                console.warn(`[leave] 订单状态不支持处理: orderId=${resolvedOrderId} status=${order.status}`);
              }
            }
          } catch (e: any) {
            console.error("[leave] 退款/结算失败:", e?.message || e);
            refundMessage = "退款处理中，如有问题请联系客服";
          }
        }

        await db.leaveTennisMatch(input.matchId, ctx.user.id);
        await db.updateTennisMatchParticipantCount(input.matchId, -1);
        const wasFull = match.status === "full";
        if (wasFull) await db.updateTennisMatchStatus(input.matchId, "open");

        // ─── 触发候补自动补位：有人退出后，尝试从候补名单补位 ─────────────
        // promoted=true 表示空位已被候补/广播补上（损失已弥补）
        let promoted = false;
        try {
          promoted = await tryPromoteFromWaitlist(input.matchId, match.title);
        } catch (e: any) {
          console.warn("[leave] waitlist promote failed:", e?.message || e);
        }

        // 扣分判定（按是否造成损失）：
        //   - 仅当开球前 2h 内退出(isPastDeadline)
        //   - 且该局退出前为满员(wasFull，说明已凑齐、你的离开会造成缺人)
        //   - 且未被候补/替补成功补位(!promoted)
        //   三者同时满足才扣分；否则视为无损失，不扣分。
        const shouldPenalize = isPastDeadline && wasFull && !promoted;

        // 超过截止时间取消且造成损失：扣除 10 信用分，并重置连续参加计数
        if (shouldPenalize) {
          await db.addCreditLog(
            ctx.user.id,
            -10,
            `超时取消报名「${match.title}」（开球前不到2小时）`,
            input.matchId
          );
          // 扣分同时重置连续参加计数
          const dbInst2 = await db.getDb();
          if (dbInst2) {
            const { users: usersTable } = await import("../drizzle/schema");
            const { eq } = await import("drizzle-orm");
            await dbInst2.update(usersTable).set({ consecutiveAttendCount: 0 }).where(eq(usersTable.id, ctx.user.id));
          }
          // 群聊系统消息：退出球局
          try {
            const { matchMessages: _mm2 } = await import("../drizzle/schema");
            const _dbInst2 = await db.getDb();
            const leaver = await db.getUserById(ctx.user.id);
            if (_dbInst2) {
              await _dbInst2.insert(_mm2).values({
                matchId: input.matchId,
                userId: ctx.user.id,
                content: `${leaver?.name ?? "有人"} 退出了球局`,
                msgType: "system",
              });
            }
          } catch (_e2) { /* 系统消息失败不影响主流程 */ }
          return { success: true, penalized: true, deducted: 10, refunded, refundMessage };
        }
        // 群聊系统消息：退出球局
        try {
          const { matchMessages: _mm3 } = await import("../drizzle/schema");
          const _dbInst3 = await db.getDb();
          const leaver2 = await db.getUserById(ctx.user.id);
          if (_dbInst3) {
            await _dbInst3.insert(_mm3).values({
              matchId: input.matchId,
              userId: ctx.user.id,
              content: `${leaver2?.name ?? "有人"} 退出了球局`,
              msgType: "system",
            });
          }
        } catch (_e3) { /* 系统消息失败不影响主流程 */ }
        return { success: true, penalized: false, deducted: 0, refunded, refundMessage, promoted };
      }),

    // ─── 候补名单：加入候补（球局已满时） ──────────────────────────────────────
    joinWaitlist: protectedProcedure
      .input(z.object({ matchId: z.number(), message: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const match = await db.getTennisMatchById(input.matchId);
        if (!match) throw new TRPCError({ code: "NOT_FOUND" });
        if (match.authorId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "不能候补自己发布的球局" });
        if (match.status === "cancelled" || match.status === "completed") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "该球局已结束，无法候补" });
        }
        // 开球时间一到即截止候补（兜底）
        if (new Date(`${match.matchDate}T${match.startTime}:00+08:00`).getTime() <= Date.now()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "该球局已开始，无法加入候补" });
        }
        // 信用分为 0 禁止
        const joiningUser = await db.getUserById(ctx.user.id);
        if (joiningUser && joiningUser.creditScore <= 0) {
          throw new TRPCError({ code: "FORBIDDEN", message: "CREDIT_ZERO" });
        }
        // 未满员时应直接报名，不需候补（currentParticipants 已含发起人）
        if (match.currentParticipants < match.maxParticipants && match.status === "open") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "球局还有空位，请直接报名" });
        }
        const existing = await db.getMatchParticipant(input.matchId, ctx.user.id);
        if (existing && existing.status === "confirmed") throw new TRPCError({ code: "BAD_REQUEST", message: "您已报名该球局" });
        if (existing && existing.status === "waitlist") throw new TRPCError({ code: "BAD_REQUEST", message: "您已在候补名单中" });
        const dbInst = await db.getDb();
        if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { matchParticipants: mp } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        if (existing) {
          // 曾经取消/退出过，重新置为候补（刷新 createdAt 作为排队时间）
          await dbInst.update(mp)
            .set({ status: "waitlist", paymentStatus: "not_required", message: input.message, createdAt: new Date() })
            .where(and(eq(mp.matchId, input.matchId), eq(mp.userId, ctx.user.id)));
        } else {
          await dbInst.insert(mp).values({ matchId: input.matchId, userId: ctx.user.id, status: "waitlist", paymentStatus: "not_required", message: input.message });
        }
        // 算排位
        const waiters = await dbInst.select().from(mp)
          .where(and(eq(mp.matchId, input.matchId), eq(mp.status, "waitlist")))
          .orderBy(mp.createdAt);
        const position = waiters.findIndex((w: any) => w.userId === ctx.user.id) + 1;
        // 通知发起人
        const waiter = await db.getUserById(ctx.user.id);
        await sendNotification(match.authorId, "system", "新的候补",
          `${waiter?.name ?? "有人"} 加入了您球局「${match.title}」的候补名单，如有人退出将自动补位。`, input.matchId);
        return { success: true, position };
      }),

    // 退出候补名单
    leaveWaitlist: protectedProcedure
      .input(z.object({ matchId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const dbInst = await db.getDb();
        if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { matchParticipants: mp } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        const p = await db.getMatchParticipant(input.matchId, ctx.user.id);
        if (!p || p.status !== "waitlist") throw new TRPCError({ code: "BAD_REQUEST", message: "您不在候补名单中" });
        await dbInst.update(mp).set({ status: "cancelled" })
          .where(and(eq(mp.matchId, input.matchId), eq(mp.userId, ctx.user.id)));
        return { success: true };
      }),

    // ─── 发起人同意候补者加入：名额+1、重算人均退差价、免费局转正/收费局置待支付 ───
    approveWaitlist: protectedProcedure
      .input(z.object({ matchId: z.number(), userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const match = await db.getTennisMatchById(input.matchId);
        if (!match) throw new TRPCError({ code: "NOT_FOUND", message: "球局不存在" });
        if (match.authorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "只有发起人可同意候补加入" });
        if (match.status === "cancelled") throw new TRPCError({ code: "BAD_REQUEST", message: "球局已取消" });
        if (match.status === "completed") throw new TRPCError({ code: "BAD_REQUEST", message: "球局已结束，无法调整" });
        // 已进入结算流程则禁止调整，避免资金倒挂
        try {
          const dbChk = await db.getDb();
          if (dbChk) {
            const { matchSettlements } = await import("../drizzle/schema");
            const { eq } = await import("drizzle-orm");
            const [st] = await dbChk.select().from(matchSettlements).where(eq(matchSettlements.matchId, input.matchId)).limit(1);
            if (st && (st.status === "confirming" || st.status === "settled")) {
              throw new TRPCError({ code: "BAD_REQUEST", message: "球局已确认完成或已结算，无法再加人" });
            }
          }
        } catch (e) { if (e instanceof TRPCError) throw e; }

        const dbInst = await db.getDb();
        if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { tennisMatches, matchOrders, matchParticipants: mp, matchMessages: mm } = await import("../drizzle/schema");
        const { eq, and, sql } = await import("drizzle-orm");

        // 校验目标用户确在候补名单
        const target = await db.getMatchParticipant(input.matchId, input.userId);
        if (!target || target.status !== "waitlist") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "该用户不在候补名单中" });
        }
        const targetUser = await db.getUserById(input.userId);
        const isFeeMatch = !!((match as any).feeRequired && match.feePerPerson && Number(match.feePerPerson) > 0);

        // ── 名额+1（只增） ──
        const oldMax = match.maxParticipants;
        const newMax = oldMax + 1;
        let newFeePerPerson: number | null = null;
        let refundedCount = 0;

        if (!isFeeMatch) {
          // 免费局：只扩名额，不涉退款
          await dbInst.update(tennisMatches).set({ maxParticipants: newMax } as any).where(eq(tennisMatches.id, input.matchId));
        } else {
          // 收费局：重算人均 + 对已付款者退差价
          const totalFee = (match as any).courtTotalFee && Number((match as any).courtTotalFee) > 0
            ? Number((match as any).courtTotalFee)
            : Math.round(Number(match.feePerPerson) * oldMax * 100) / 100;
          const newFeeFen = Math.ceil((totalFee * 100) / newMax);
          newFeePerPerson = Math.round(newFeeFen) / 100;
          await dbInst.update(tennisMatches)
            .set({ maxParticipants: newMax, feePerPerson: String(newFeePerPerson.toFixed(2)) } as any)
            .where(eq(tennisMatches.id, input.matchId));
          // 对所有已付款参与者退差价
          const paidParticipants = await dbInst.select().from(mp)
            .where(and(eq(mp.matchId, input.matchId), eq(mp.paymentStatus, "paid")));
          for (const p of paidParticipants) {
            try {
              let orderId = p.orderId;
              if (!orderId) {
                const [fb] = await dbInst.select().from(matchOrders)
                  .where(and(eq(matchOrders.matchId, input.matchId), eq(matchOrders.userId, p.userId), eq(matchOrders.status, "paid")))
                  .limit(1);
                if (fb) orderId = fb.orderId;
              }
              if (!orderId) continue;
              const [order] = await dbInst.select().from(matchOrders).where(eq(matchOrders.orderId, orderId)).limit(1);
              if (!order || order.status !== "paid") continue;
              const paidFen = Math.round(Number(order.amount) * 100);
              const userDiffFen = paidFen - newFeeFen;
              if (userDiffFen <= 0) continue;
              const refundId = `RFADD${orderId}${Date.now().toString().slice(-6)}`.slice(0, 60);
              await refundOrder({ orderId, refundId, totalFen: paidFen, refundFen: userDiffFen, reason: `同意候补加人退差价-${(match as any).title}`.slice(0, 80) });
              await dbInst.update(matchOrders)
                .set({ refundedFen: sql`refundedFen + ${userDiffFen}`, refundId, refundReason: "同意候补退差价", refundedAt: new Date() })
                .where(eq(matchOrders.orderId, orderId));
              refundedCount += 1;
              await sendNotification(p.userId, "system", "人数增加·已退差价",
                `球局「${(match as any).title}」增加了一位球友，人均降为 ¥${(newFeePerPerson as number).toFixed(2)}，已为您退还差价 ¥${(userDiffFen / 100).toFixed(2)}，预计1-3个工作日到账。`,
                input.matchId);
            } catch (refErr: any) {
              console.error(`[approveWaitlist] 退差价失败 userId=${p.userId}: ${refErr?.message || refErr}`);
            }
          }
        }

        // ── 候补者转状态 ──
        if (!isFeeMatch) {
          // 免费局：直接转正 confirmed、计数+1、通知、进群
          await dbInst.update(mp).set({ status: "confirmed", paymentStatus: "not_required" })
            .where(and(eq(mp.matchId, input.matchId), eq(mp.userId, input.userId)));
          await db.updateTennisMatchParticipantCount(input.matchId, 1);
          const cur = await db.getTennisMatchById(input.matchId);
          if (cur && (cur.currentParticipants ?? 0) >= (cur.maxParticipants ?? 0)) {
            await db.updateTennisMatchStatus(input.matchId, "full");
          } else {
            await db.updateTennisMatchStatus(input.matchId, "open");
          }
          await sendNotification(input.userId, "system", "候补成功 🎾",
            `发起人已同意您加入球局「${match.title}」，您已成功报名，请准时到场！`, input.matchId);
          try {
            const u = await db.getUserById(input.userId);
            if (u?.wechatOpenid) await wxNotifyMatchJoin({ openid: u.wechatOpenid, matchTitle: match.title, joinerName: "候补成功" }).catch(() => {});
          } catch { /* ignore */ }
          try {
            await dbInst.insert(mm).values({ matchId: input.matchId, userId: input.userId, content: `${targetUser?.name ?? "球友"} 经发起人同意从候补加入球局 🎾`, msgType: "system" });
          } catch { /* ignore */ }
        } else {
          // 收费局：置 pending 待支付占位（不计数），通知去支付，付成功回调后转正
          await dbInst.update(mp).set({ status: "pending", paymentStatus: "pending" })
            .where(and(eq(mp.matchId, input.matchId), eq(mp.userId, input.userId)));
          await db.updateTennisMatchStatus(input.matchId, "open");
          await sendNotification(input.userId, "system", "发起人已同意您加入 🎾",
            `发起人已同意您加入球局「${match.title}」，请尽快进入球局支付 ¥${(newFeePerPerson as number).toFixed(2)} 完成报名（支付成功后才正式占位）。`, input.matchId);
          try {
            const u = await db.getUserById(input.userId);
            if (u?.wechatOpenid) await wxNotifyMatchJoin({ openid: u.wechatOpenid, matchTitle: match.title, joinerName: "同意加入·待支付" }).catch(() => {});
          } catch { /* ignore */ }
        }

        // 群聊播报人数变化
        if (isFeeMatch && newFeePerPerson != null) {
          try {
            await dbInst.insert(mm).values({ matchId: input.matchId, userId: ctx.user.id,
              content: `发起人同意增加一位球友，人均降为 ¥${newFeePerPerson.toFixed(2)}，已付款的小伙伴将自动收到差价退款 🎾`, msgType: "system" });
          } catch { /* ignore */ }
        }
        return { success: true, isFeeMatch, newMaxParticipants: newMax, newFeePerPerson, refunded: refundedCount };
      }),

    // 查询我的候补状态与排位
    myWaitlistPosition: protectedProcedure
      .input(z.object({ matchId: z.number() }))
      .query(async ({ ctx, input }) => {
        const dbInst = await db.getDb();
        if (!dbInst) return { onWaitlist: false, position: 0, total: 0 };
        const { matchParticipants: mp } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        const waiters = await dbInst.select().from(mp)
          .where(and(eq(mp.matchId, input.matchId), eq(mp.status, "waitlist")))
          .orderBy(mp.createdAt);
        const idx = waiters.findIndex((w: any) => w.userId === ctx.user.id);
        return {
          onWaitlist: idx >= 0,
          position: idx >= 0 ? idx + 1 : 0,
          total: waiters.length,
        };
      }),

    // 替代人选：将自己的报名转让给另一个用户（免扣信用分）
    replaceSelf: protectedProcedure
      .input(z.object({ matchId: z.number(), replacerId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const match = await db.getTennisMatchById(input.matchId);
        if (!match) throw new TRPCError({ code: "NOT_FOUND" });
        // 确保 circleOnly 和 feeRequired 字段存在，即使数据库中没有，也默认为 false
        const safeMatch = { ...match, circleOnly: (match as any).circleOnly ?? false, feeRequired: (match as any).feeRequired ?? false };
        const participant = await db.getMatchParticipant(input.matchId, ctx.user.id);
        if (!participant || participant.status !== "confirmed") throw new TRPCError({ code: "BAD_REQUEST", message: "您尚未报名此约球" });
        // 检查替代人是否已在列表
        const existing = await db.getMatchParticipant(input.matchId, input.replacerId);
        if (existing && existing.status === "confirmed") throw new TRPCError({ code: "BAD_REQUEST", message: "该用户已是参与者" });
        // 取消原报名人
        await db.leaveTennisMatch(input.matchId, ctx.user.id);
        // 添加替代人（无论此前是否取消过，均重新加入为参与者）
        await db.joinTennisMatch(input.matchId, input.replacerId);
        // 通知发起人：有人顶替
        try {
          const replacer = await db.getUserById(input.replacerId);
          await sendNotification(match.authorId, "system", "替补加入",
            `${replacer?.name ?? "有人"} 已顶替 ${ctx.user.name ?? "原参与者"} 的位置。`, input.matchId);
        } catch (_e) { /* 通知失败不影响主流程 */ }
        return { success: true };
      }),

    // ─── 寻找替代者：生成替代邀请 token ──────────────────────────────────────
    createReplaceInvite: protectedProcedure
      .input(z.object({ matchId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const match = await db.getTennisMatchById(input.matchId);
        if (!match) throw new TRPCError({ code: "NOT_FOUND" });
        // 确保 circleOnly 和 feeRequired 字段存在，即使数据库中没有，也默认为 false
        const safeMatch = { ...match, circleOnly: (match as any).circleOnly ?? false, feeRequired: (match as any).feeRequired ?? false };
        const isAuthor = match.authorId === ctx.user.id;
        const participant = await db.getMatchParticipant(input.matchId, ctx.user.id);
        // 发起人本人也可发起转让（转让整个球局/队长身份）；普通参与者需是 confirmed
        if (!isAuthor && (!participant || participant.status !== "confirmed")) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "您尚未报名此约球" });
        }
        // 已进入结算流程的球局不允许转让
        if (match.status === "completed" || match.status === "cancelled") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "球局已结束或已取消，无法转让" });
        }
        // 检查是否已有 pending 邀请
        const dbInst = await db.getDb();
        if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { matchReplaceInvites } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        const existingInvites = await dbInst.select().from(matchReplaceInvites)
          .where(and(
            eq(matchReplaceInvites.matchId, input.matchId),
            eq(matchReplaceInvites.fromUserId, ctx.user.id),
            eq(matchReplaceInvites.status, "pending")
          ));
        if (existingInvites.length > 0) {
          // 已有 pending 邀请，直接返回
          return { token: existingInvites[0].token, inviteId: existingInvites[0].id };
        }
        // 生成新 token，过期时间为开球时间
        const token = nanoid(32);
        const expiresAt = new Date(`${match.matchDate}T${match.startTime}:00+08:00`);
        await dbInst.insert(matchReplaceInvites).values({
          matchId: input.matchId,
          fromUserId: ctx.user.id,
          token,
          expiresAt,
        });
        return { token, inviteId: null };
      }),

    // ─── 查询替代邀请信息（供接受页面展示）──────────────────────────────────
    getReplaceInvite: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const dbInst = await db.getDb();
        if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { matchReplaceInvites } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const invites = await dbInst.select().from(matchReplaceInvites)
          .where(eq(matchReplaceInvites.token, input.token));
        if (invites.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "邀请不存在" });
        const invite = invites[0];
        if (invite.status === "accepted") {
          return { invite, match: null, fromUser: null, status: "accepted" as const };
        }
        const now = new Date();
        if (invite.status === "expired" || now > invite.expiresAt) {
          if (invite.status === "pending") {
            await dbInst.update(matchReplaceInvites)
              .set({ status: "expired" })
              .where(eq(matchReplaceInvites.token, input.token));
          }
          return { invite, match: null, fromUser: null, status: "expired" as const };
        }
        const match = await db.getTennisMatchById(invite.matchId);
        const fromUser = await db.getUserById(invite.fromUserId);
        return {
          invite,
          match,
          fromUser: fromUser ? { id: fromUser.id, name: fromUser.name, avatar: fromUser.avatar } : null,
          status: "pending" as const,
        };
      }),

    // ─── 接受替代邀请 ─────────────────────────────────────────────────────────
    acceptReplaceInvite: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const dbInst = await db.getDb();
        if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { matchReplaceInvites } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const invites = await dbInst.select().from(matchReplaceInvites)
          .where(eq(matchReplaceInvites.token, input.token));
        if (invites.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "邀请不存在" });
        const invite = invites[0];
        if (invite.status !== "pending") {
          throw new TRPCError({ code: "BAD_REQUEST", message: invite.status === "accepted" ? "邀请已被接受" : "邀请已过期" });
        }
        const now = new Date();
        if (now > invite.expiresAt) {
          await dbInst.update(matchReplaceInvites).set({ status: "expired" }).where(eq(matchReplaceInvites.token, input.token));
          throw new TRPCError({ code: "BAD_REQUEST", message: "邀请已过期（球局已开始）" });
        }
        if (invite.fromUserId === ctx.user.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "不能接受自己发出的邀请" });
        }
        const match = await db.getTennisMatchById(invite.matchId);
        if (!match) throw new TRPCError({ code: "NOT_FOUND", message: "球局不存在" });
        if (match.status === "cancelled") throw new TRPCError({ code: "BAD_REQUEST", message: "球局已取消" });
        // 检查接受者是否已在球局
        const acceptorParticipant = await db.getMatchParticipant(invite.matchId, ctx.user.id);
        if (acceptorParticipant && acceptorParticipant.status === "confirmed") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "您已是此球局的参与者" });
        }
        // 执行替代：原参与者退出（不扣分），并全额退款给原参与者
        const fromParticipant = await db.getMatchParticipant(invite.matchId, invite.fromUserId);
        if (fromParticipant && fromParticipant.status === "confirmed") {
          // 如果原参与者已付款，全额退款（替代者会重新支付）
          if (fromParticipant.paymentStatus === "paid" || fromParticipant.paymentStatus === "pending") {
            try {
              const { matchOrders, matchParticipants: mp } = await import("../drizzle/schema");
              const { and: andOp, inArray } = await import("drizzle-orm");
              let resolvedOrderId = fromParticipant.orderId;
              if (!resolvedOrderId) {
                const fallback = await dbInst.select().from(matchOrders)
                  .where(andOp(eq(matchOrders.matchId, invite.matchId), eq(matchOrders.userId, invite.fromUserId), inArray(matchOrders.status, ["paid", "pending"])))
                  .limit(1);
                if (fallback.length > 0) resolvedOrderId = fallback[0].orderId;
              }
              const [order] = resolvedOrderId
                ? await dbInst.select().from(matchOrders).where(eq(matchOrders.orderId, resolvedOrderId)).limit(1)
                : [];
              if (order && (order.status === "paid" || order.status === "pending")) {
                const amountFen = Math.round(Number(order.amount) * 100);
                const refundId = `RFRE${resolvedOrderId}`;
                const { refundOrder: doRefund } = await import("./wxpay");
                await doRefund({
                  orderId: resolvedOrderId!,
                  refundId,
                  totalFen: amountFen,
                  refundFen: amountFen,
                  reason: `找到替代者-全额退款-${match.title}`.slice(0, 80),
                });
                await dbInst.update(matchOrders)
                  .set({ status: "refunded", refundId, refundReason: "找到替代者全额退款", refundedAt: now })
                  .where(eq(matchOrders.orderId, resolvedOrderId!));
                await dbInst.update(mp)
                  .set({ paymentStatus: "refunded" })
                  .where(andOp(eq(mp.matchId, invite.matchId), eq(mp.userId, invite.fromUserId)));
                console.log(`[acceptReplace] 原参与者退款成功 userId=${invite.fromUserId} orderId=${resolvedOrderId}`);
              }
            } catch (refundErr: any) {
              console.error(`[acceptReplace] 原参与者退款失败: ${refundErr?.message}`);
              // 退款失败不阻止替代流程
            }
          }
          await db.leaveTennisMatch(invite.matchId, invite.fromUserId);
          await db.updateTennisMatchParticipantCount(invite.matchId, -1);
        }
        // 加入新参与者
        await db.joinTennisMatch(invite.matchId, ctx.user.id);
        await db.updateTennisMatchParticipantCount(invite.matchId, 1);
        // 更新邀请状态
        await dbInst.update(matchReplaceInvites).set({
          status: "accepted",
          toUserId: ctx.user.id,
          acceptedAt: now,
        }).where(eq(matchReplaceInvites.token, input.token));

        // ─── 发起人转让：若邀请来源是发起人本人，转移 authorId（队长/收款人变更）───
        const isAuthorTransfer = invite.fromUserId === match.authorId;
        if (isAuthorTransfer) {
          try {
            const { tennisMatches: tm } = await import("../drizzle/schema");
            await dbInst.update(tm).set({ authorId: ctx.user.id } as any).where(eq(tm.id, invite.matchId));
            // 群聊系统消息：队长变更
            const { matchMessages: mmT } = await import("../drizzle/schema");
            const newAuthor = await db.getUserById(ctx.user.id);
            await dbInst.insert(mmT).values({
              matchId: invite.matchId,
              userId: ctx.user.id,
              content: `${newAuthor?.name ?? "新队长"} 已接手成为本局发起人（队长）🎾`,
              msgType: "system",
            });
          } catch (transErr: any) {
            console.error(`[acceptReplace] 发起人转让失败 matchId=${invite.matchId}: ${transErr?.message || transErr}`);
          }
        }

        // 通知转让方：已被接手
        try {
          const acceptor = await db.getUserById(ctx.user.id);
          await sendNotification(invite.fromUserId, "system", isAuthorTransfer ? "球局已转让" : "已找到替补",
            `${acceptor?.name ?? "对方"} 已${isAuthorTransfer ? "接手您的球局" : "顶替您的位置"}「${(match as any).title}」，${(fromParticipant && (fromParticipant.paymentStatus === "paid" || fromParticipant.paymentStatus === "pending")) ? "已为您发起全额退款，预计1-3个工作日到账。" : "无需扣费。"}本次不扣信用分。`,
            invite.matchId);
        } catch (_e) { /* 通知失败不阻断 */ }

        // 原参与者不扣信用分（已找到替代者）
        // 如果球局有场地费，替代者需要支付
        const needsPay = !!(match.feeRequired && Number(match.feePerPerson) > 0);
        return { success: true, matchId: invite.matchId, needsPay, isAuthorTransfer };
      }),

    cancel: protectedProcedure
      .input(z.object({ matchId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const match = await db.getTennisMatchById(input.matchId);
        if (!match) throw new TRPCError({ code: "NOT_FOUND" });
        // 确保 circleOnly 和 feeRequired 字段存在，即使数据库中没有，也默认为 false
        const safeMatch = { ...match, circleOnly: (match as any).circleOnly ?? false, feeRequired: (match as any).feeRequired ?? false };
        if (match.authorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "只有发布者可取消" });
        if (match.status === "cancelled") throw new TRPCError({ code: "BAD_REQUEST", message: "球局已是取消状态" });
        if (match.status === "completed") throw new TRPCError({ code: "BAD_REQUEST", message: "球局已结束，无法取消" });

        // 判断是否超过取消截止时间（开球前 2 小时）
        const matchDateTime = new Date(`${match.matchDate}T${match.startTime}:00+08:00`);
        const now = new Date();
        const diffHours = (matchDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        const isPastDeadline = diffHours < 2 && diffHours > -24;

        // 取消球局
        await db.updateTennisMatchStatus(input.matchId, "cancelled");

        let penalized = false;
        // 超过截止时间取消：发布人同样扣 10 信用分
        if (isPastDeadline) {
          await db.addCreditLog(
            ctx.user.id,
            -10,
            `超时取消球局「${match.title}」（开球前不到2小时）`,
            input.matchId
          );
          // 扣分同时重置连续参加计数
          const dbInst0 = await db.getDb();
          if (dbInst0) {
            const { users: usersTable } = await import("../drizzle/schema");
            const { eq } = await import("drizzle-orm");
            await dbInst0.update(usersTable).set({ consecutiveAttendCount: 0 }).where(eq(usersTable.id, ctx.user.id));
          }
          penalized = true;
        }

        // ─── 退款：对所有已付款参与者自动退款 ─────────────────────────────────
        let refundCount = 0;
        let refundFailCount = 0;
        try {
          const dbInst = await db.getDb();
          if (dbInst) {
            const { matchOrders, matchParticipants: mp } = await import("../drizzle/schema");
            const { eq, and, inArray } = await import("drizzle-orm");
            const participants = await db.getMatchParticipants(input.matchId);
            for (const p of participants) {
              if (p.status !== "confirmed") continue;
              // 注意：paymentStatus 可能是 paid（回调已处理）或 pending（已支付但回调未到）
              if (p.paymentStatus !== "paid" && p.paymentStatus !== "pending") continue;
              // 查找订单：优先用 participant.orderId，兜底从 match_orders 表查（不限制 status）
              let orderId = p.orderId;
              if (!orderId) {
                const fallbackOrders = await dbInst.select().from(matchOrders)
                  .where(and(
                    eq(matchOrders.matchId, input.matchId),
                    eq(matchOrders.userId, p.userId),
                    inArray(matchOrders.status, ["paid", "pending"])
                  ))
                  .limit(1);
                if (fallbackOrders.length > 0) orderId = fallbackOrders[0].orderId;
              }
              if (!orderId) {
                console.warn(`[cancel] 未找到订单 userId=${p.userId} matchId=${input.matchId}`);
                continue;
              }
              try {
                const [order] = await dbInst.select().from(matchOrders)
                  .where(eq(matchOrders.orderId, orderId)).limit(1);
                // 支持对 paid 和 pending 状态的订单退款
                if (order && (order.status === "paid" || order.status === "pending")) {
                  
                  const amountFen = Math.round(Number(order.amount) * 100);
                  const alreadyRefundedFen = Number((order as any).refundedFen) || 0;
                  const remainFen = amountFen - alreadyRefundedFen;
                  if (remainFen <= 0) { console.log(`[cancel] 订单已全额退完 orderId=${orderId}`); refundCount++; continue; }
                  const cancelRefundId = `RFCNL${orderId}${Date.now().toString().slice(-4)}`.slice(0, 60);
                  await refundOrder({ orderId, refundId: cancelRefundId, totalFen: amountFen, refundFen: remainFen, reason: `组织者取消球局-${match.title} ${match.matchDate} ${match.startTime}`.slice(0, 80) });
                  await dbInst.update(matchOrders)
                    .set({ status: "refunded", refundId: cancelRefundId, refundReason: "球局取消", refundedAt: new Date() })
                    .where(eq(matchOrders.orderId, orderId));
                  await dbInst.update(mp)
                    .set({ paymentStatus: "refunded" })
                    .where(and(eq(mp.matchId, input.matchId), eq(mp.userId, p.userId)));
                  refundCount++;
                  console.log(`[cancel] 退款成功 userId=${p.userId} orderId=${orderId} amount=${order.amount} orderStatus=${order.status}`);
                } else {
                  console.warn(`[cancel] 订单状态不支持退款: userId=${p.userId} orderId=${orderId} status=${order?.status}`);
                }
              } catch (refundErr: any) {
                refundFailCount++;
                console.error(`[cancel] 退款失败 userId=${p.userId} orderId=${orderId}:`, refundErr.message);
              }
            }
          }
        } catch (refundBatchErr: any) {
          console.error(`[cancel] 批量退款异常:`, refundBatchErr.message);
        }

        // 通知已报名的参与者
        try {
          const participants = await db.getMatchParticipants(input.matchId);
          const { sendMatchCancelledToParticipant } = await import("./wechat-notify");
          for (const p of participants) {
            if (p.userId === ctx.user.id || p.status !== "confirmed") continue;
            // 站内消息：我报名的球局被取消
            await sendNotification(p.userId, "match_cancelled", "球局已取消", `你报名的球局「${match.title}」（${match.matchDate} ${match.startTime}）已被发起人取消。`, input.matchId);
            const pUser = await db.getUserById(p.userId);
            if (pUser?.wechatOpenid) {
              await sendMatchCancelledToParticipant(pUser.wechatOpenid, match.title, match.matchDate, match.startTime).catch(() => {});
            }
          }
        } catch (_) {}

        return { success: true, penalized, deducted: penalized ? 10 : 0, refundCount, refundFailCount };
      }),

        update: protectedProcedure
      .input(z.object({
        matchId: z.number(),
        title: z.string().min(2).max(100).optional(),
        matchType: z.enum(["singles", "doubles", "mixed_doubles", "practice", "group"]).optional(),
        levelRequired: z.enum(["itf1", "itf2", "itf3", "itf4", "itf5", "itf6", "itf7", "itf8", "itf9", "itf10", "any"]).optional(),
        matchDate: z.string().optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        venueName: z.string().min(1).optional(),
        venueAddress: z.string().optional(),
        courtNo: z.string().max(50).optional(),
        maxParticipants: z.number().min(2).max(20).optional(),
        description: z.string().optional(),
        contactInfo: z.string().optional(),
        costPerPerson: z.number().optional(),
        costSplitType: z.enum(["free", "aa", "host_pays", "custom"]).optional(),
        bringOwnBall: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const match = await db.getTennisMatchById(input.matchId);
        if (!match) throw new TRPCError({ code: "NOT_FOUND" });
        // 确保 circleOnly 和 feeRequired 字段存在，即使数据库中没有，也默认为 false
        const safeMatch = { ...match, circleOnly: (match as any).circleOnly ?? false, feeRequired: (match as any).feeRequired ?? false };
        if (match.authorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "只有发布者可编辑" });
        if (match.status === "cancelled") throw new TRPCError({ code: "BAD_REQUEST", message: "已取消的球局无法编辑" });
        const { matchId, ...fields } = input;
        const dbInst = await db.getDb();
        if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { tennisMatches } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const updateData: Record<string, unknown> = {};
        if (fields.title !== undefined) updateData.title = fields.title;
        if (fields.matchType !== undefined) updateData.matchType = fields.matchType;
        if (fields.levelRequired !== undefined) updateData.levelRequired = fields.levelRequired;
        if (fields.matchDate !== undefined) updateData.matchDate = fields.matchDate;
        if (fields.startTime !== undefined) updateData.startTime = fields.startTime;
        if (fields.endTime !== undefined) updateData.endTime = fields.endTime;
        if (fields.venueName !== undefined) updateData.venueName = fields.venueName;
        if (fields.venueAddress !== undefined) updateData.venueAddress = fields.venueAddress;
        if (fields.courtNo !== undefined) updateData.courtNo = fields.courtNo;
        if (fields.maxParticipants !== undefined) {
          // currentParticipants 已含发起人，即当前实际占用人数
          if (fields.maxParticipants < match.currentParticipants) {
            throw new TRPCError({ code: "BAD_REQUEST", message: `人数上限不能低于当前人数 (${match.currentParticipants})` });
          }
          updateData.maxParticipants = fields.maxParticipants;
        }
        if (fields.description !== undefined) updateData.description = fields.description;
        if (fields.contactInfo !== undefined) updateData.contactInfo = fields.contactInfo;
        if (fields.costPerPerson !== undefined) updateData.costPerPerson = fields.costPerPerson;
        if (fields.costSplitType !== undefined) updateData.costSplitType = fields.costSplitType;
        if (fields.bringOwnBall !== undefined) updateData.bringOwnBall = fields.bringOwnBall;
        await dbInst.update(tennisMatches).set(updateData as any).where(eq(tennisMatches.id, matchId));
        return { success: true };
      }),
    // ─── 增加名额：只增不减，重算人均，对已付款者立即退差价 ──────────────────────
    increaseCapacity: protectedProcedure
      .input(z.object({ matchId: z.number(), newMaxParticipants: z.number().min(2).max(20) }))
      .mutation(async ({ ctx, input }) => {
        const match = await db.getTennisMatchById(input.matchId);
        if (!match) throw new TRPCError({ code: "NOT_FOUND" });
        const safeMatch = { ...match, feeRequired: (match as any).feeRequired ?? false };
        if (match.authorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "只有发起人可调整人数" });
        if (match.status === "cancelled") throw new TRPCError({ code: "BAD_REQUEST", message: "球局已取消" });
        if (match.status === "completed") throw new TRPCError({ code: "BAD_REQUEST", message: "球局已结束，无法调整人数" });
        // 已进入结算流程（确认完成/已结算）则禁止改人数，避免资金倒挂
        try {
          const dbChk = await db.getDb();
          if (dbChk) {
            const { matchSettlements } = await import("../drizzle/schema");
            const { eq } = await import("drizzle-orm");
            const [st] = await dbChk.select().from(matchSettlements).where(eq(matchSettlements.matchId, input.matchId)).limit(1);
            if (st && (st.status === "confirming" || st.status === "settled")) {
              throw new TRPCError({ code: "BAD_REQUEST", message: "球局已确认完成或已结算，无法再调整人数" });
            }
          }
        } catch (e) { if (e instanceof TRPCError) throw e; /* 查询失败不阻断，继续走只增校验 */ }
        // 只增不减
        const oldMax = match.maxParticipants;
        if (input.newMaxParticipants <= oldMax) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `人数只能增加，当前上限为 ${oldMax} 人` });
        }
        const dbInst = await db.getDb();
        if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { tennisMatches, matchOrders, matchParticipants: mp } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");

        // 免费局：只调名额，不涉及退款
        const isFeeMatch = !!(safeMatch.feeRequired && match.feePerPerson && Number(match.feePerPerson) > 0);
        if (!isFeeMatch) {
          await dbInst.update(tennisMatches).set({ maxParticipants: input.newMaxParticipants } as any).where(eq(tennisMatches.id, input.matchId));
          if (match.status === "full" && match.currentParticipants < input.newMaxParticipants) {
            await db.updateTennisMatchStatus(input.matchId, "open");
          }
          return { success: true, refunded: 0, newFeePerPerson: null as number | null };
        }

        // 场地总费用：优先用已存的 courtTotalFee，存量无则用 旧人均×旧名额 反推
        const totalFee = (match as any).courtTotalFee && Number((match as any).courtTotalFee) > 0
          ? Number((match as any).courtTotalFee)
          : Math.round(Number(match.feePerPerson) * oldMax * 100) / 100;
        // 新人均：向上取整到分，保证退给大家后总额不超过场地总费用
        const newFeeFen = Math.ceil((totalFee * 100) / input.newMaxParticipants);
        const newFeePerPerson = Math.round(newFeeFen) / 100;
        const oldFeeFen = Math.round(Number(match.feePerPerson) * 100);

        // 先更新球局的名额与人均（后续新报名者按新单价付）
        await dbInst.update(tennisMatches)
          .set({ maxParticipants: input.newMaxParticipants, feePerPerson: String(newFeePerPerson.toFixed(2)) } as any)
          .where(eq(tennisMatches.id, input.matchId));
        if (match.status === "full" && match.currentParticipants < input.newMaxParticipants) {
          await db.updateTennisMatchStatus(input.matchId, "open");
        }

        // 对所有已付款参与者退差价
        const diffFen = oldFeeFen - newFeeFen;
        let refundedCount = 0;
        if (diffFen > 0) {
          const paidParticipants = await dbInst.select().from(mp)
            .where(and(eq(mp.matchId, input.matchId), eq(mp.paymentStatus, "paid")));
          for (const p of paidParticipants) {
            try {
              // 找该用户在本局的已支付订单
              let orderId = p.orderId;
              if (!orderId) {
                const [fb] = await dbInst.select().from(matchOrders)
                  .where(and(eq(matchOrders.matchId, input.matchId), eq(matchOrders.userId, p.userId), eq(matchOrders.status, "paid")))
                  .limit(1);
                if (fb) orderId = fb.orderId;
              }
              if (!orderId) continue;
              const [order] = await dbInst.select().from(matchOrders).where(eq(matchOrders.orderId, orderId)).limit(1);
              if (!order || order.status !== "paid") continue;
              const paidFen = Math.round(Number(order.amount) * 100);
              // 实际差价 = 该用户实付 - 新人均（兼容历史可能不同的实付）
              const userDiffFen = paidFen - newFeeFen;
              if (userDiffFen <= 0) continue;
              const refundId = `RFDIFF${orderId}${Date.now().toString().slice(-6)}`.slice(0, 60);
              await refundOrder({
                orderId,
                refundId,
                totalFen: paidFen,
                refundFen: userDiffFen,
                reason: `扩员退差价-${(match as any).title}`.slice(0, 80),
              });
              // 记录退差价：订单金额更新为新人均，标记退款单号（部分退款，订单仍保持 paid 以便结算计入新人均）
              await dbInst.update(matchOrders)
                .set({ amount: String(newFeePerPerson.toFixed(2)), refundId, refundReason: "扩员退差价", refundedAt: new Date() })
                .where(eq(matchOrders.orderId, orderId));
              refundedCount += 1;
              // 通知本人
              await sendNotification(p.userId, "system", "人数增加·已退差价",
                `球局「${(match as any).title}」人数增加，人均降为 ¥${newFeePerPerson.toFixed(2)}，已为您退还差价 ¥${(userDiffFen / 100).toFixed(2)}，预计1-3个工作日到账。`,
                input.matchId);
            } catch (refErr: any) {
              console.error(`[increaseCapacity] 退差价失败 userId=${p.userId} matchId=${input.matchId}: ${refErr?.message || refErr}`);
              // 单个失败不阻断其他人
            }
          }
          // 群聊系统消息
          try {
            const { matchMessages } = await import("../drizzle/schema");
            await dbInst.insert(matchMessages).values({
              matchId: input.matchId,
              userId: ctx.user.id,
              content: `发起人将人数增加到 ${input.newMaxParticipants} 人，人均降为 ¥${newFeePerPerson.toFixed(2)}，已付款的小伙伴将自动收到差价退款 🎾`,
              msgType: "system",
            });
          } catch (_e) { /* 系统消息失败不影响主流程 */ }
        }
        // 扩员出现新空位：触发候补自动补位（免费局转正 / 收费局广播先到先得）
        try {
          await tryPromoteFromWaitlist(input.matchId, (match as any).title);
        } catch (e: any) {
          console.warn("[increaseCapacity] waitlist promote failed:", e?.message || e);
        }
        return { success: true, refunded: refundedCount, newFeePerPerson };
      }),
    myMatches: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserTennisMatches(ctx.user.id);
    }),
    review: protectedProcedure
      .input(z.object({
        matchId: z.number(),
        revieweeId: z.number(),
        punctualityScore: z.number().min(1).max(5),
        friendlinessScore: z.number().min(1).max(5),
        levelMatchScore: z.number().min(1).max(5),
        comment: z.string().max(300).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const match = await db.getTennisMatchById(input.matchId);
        if (!match) throw new TRPCError({ code: "NOT_FOUND" });
        // 确保 circleOnly 和 feeRequired 字段存在，即使数据库中没有，也默认为 false
        const safeMatch = { ...match, circleOnly: (match as any).circleOnly ?? false, feeRequired: (match as any).feeRequired ?? false };
        // 验证评价人是参与者
        const participants = await db.getMatchParticipants(input.matchId);
        const isParticipant = participants.some(p => p.userId === ctx.user.id && p.status === "confirmed") || match.authorId === ctx.user.id;
        if (!isParticipant) throw new TRPCError({ code: "FORBIDDEN", message: "只有参与者可以评价" });
        const alreadyReviewed = await db.hasUserReviewed(input.matchId, ctx.user.id, input.revieweeId);
        if (alreadyReviewed) throw new TRPCError({ code: "BAD_REQUEST", message: "已经评价过该用户" });
        await db.createMatchReview({ ...input, reviewerId: ctx.user.id });
        return { success: true };
      }),

    getReviews: publicProcedure
      .input(z.object({ matchId: z.number() }))
      .query(async ({ input }) => {
        return db.getMatchReviews(input.matchId);
      }),

    getUserReviews: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return db.getUserReviews(input.userId);
      }),
    // ─── 支付：创建预付订单 ──────────────────────────────────────────────────
    // ─── V6 球局编辑：发起人可改标题/时间/地点/名额/费用，名额变更通知已报名者 ───
    editMatch: protectedProcedure
      .input(z.object({
        matchId: z.number(),
        title: z.string().optional(),
        matchDate: z.string().optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        venueName: z.string().optional(),
        venueAddress: z.string().optional(),
        courtNo: z.string().optional(),
        description: z.string().optional(),
        maxParticipants: z.number().min(1).optional(),
        feePerPerson: z.number().min(0).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const match = await db.getTennisMatchById(input.matchId);
        if (!match) throw new TRPCError({ code: "NOT_FOUND" });
        if (match.authorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "只有发起人可编辑球局" });
        if (match.status === "completed" || match.status === "cancelled") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "已完成或已取消的球局不可编辑" });
        }
        // 名额不可小于当前已确认人数
        if (input.maxParticipants !== undefined) {
          if (input.maxParticipants < (match.currentParticipants ?? 1)) {
            throw new TRPCError({ code: "BAD_REQUEST", message: `名额不能小于当前已报名人数（${match.currentParticipants}）` });
          }
        }
        // 计算 courtTotalFee（若改了人均或名额）
        const newFeePerPerson = input.feePerPerson ?? (match.feePerPerson ? Number(match.feePerPerson) : undefined);
        const newMax = input.maxParticipants ?? match.maxParticipants;
        let courtTotalFee: number | undefined = undefined;
        if ((match as any).feeRequired && newFeePerPerson && newFeePerPerson > 0 && newMax > 0) {
          courtTotalFee = Math.round(newFeePerPerson * newMax * 100) / 100;
        }
        await db.updateTennisMatchInfo(input.matchId, {
          title: input.title, matchDate: input.matchDate, startTime: input.startTime, endTime: input.endTime,
          venueName: input.venueName, venueAddress: input.venueAddress, courtNo: input.courtNo,
          description: input.description, maxParticipants: input.maxParticipants,
          feePerPerson: newFeePerPerson, courtTotalFee,
        });
        // 若球局原为 full 且名额增加，恢复为 open
        if (input.maxParticipants !== undefined && input.maxParticipants > (match.currentParticipants ?? 1) && match.status === "full") {
          await db.updateTennisMatchStatus(input.matchId, "open");
        }
        // 通知已报名者球局信息有变更
        try {
          const participants = await db.getMatchParticipants(input.matchId);
          const changedFields: string[] = [];
          if (input.title) changedFields.push("标题");
          if (input.matchDate || input.startTime || input.endTime) changedFields.push("时间");
          if (input.venueName || input.venueAddress || input.courtNo) changedFields.push("地点");
          if (input.maxParticipants !== undefined) changedFields.push("名额");
          if (input.feePerPerson !== undefined) changedFields.push("费用");
          const summary = changedFields.length > 0 ? changedFields.join("、") : "信息";
          for (const p of participants) {
            if (p.userId === ctx.user.id) continue;
            if (p.status === "confirmed" || p.status === "pending") {
              await sendNotification(p.userId, "system", "球局信息变更",
                `您报名的「${input.title ?? match.title}」${summary}已由发起人更新，请留意最新安排。`, input.matchId);
            }
          }
          // 群聊系统消息
          const { matchMessages: _mm } = await import("../drizzle/schema");
          const _dbInst = await db.getDb();
          if (_dbInst) {
            await _dbInst.insert(_mm).values({ matchId: input.matchId, userId: ctx.user.id, content: `发起人更新了球局${summary} 📝`, msgType: "system" });
          }
        } catch (_e) { /* 通知失败不影响主流程 */ }
        return { success: true };
      }),
    // ─── V6 补缴支付：到场少缴者补差额（微信真实支付）─────────────────────────
    payTopup: protectedProcedure
      .input(z.object({ matchId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const part = await db.getMatchParticipant(input.matchId, ctx.user.id);
        if (!part) throw new TRPCError({ code: "NOT_FOUND", message: "未找到报名记录" });
        if (part.paymentStatus !== "topup_pending" || Number(part.topupAmount) <= 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "无待补缴金额" });
        }
        const match = await db.getTennisMatchById(input.matchId);
        if (!match) throw new TRPCError({ code: "NOT_FOUND" });
        const me = await db.getUserById(ctx.user.id);
        const openid = me?.wechatOpenid;
        if (!openid) throw new TRPCError({ code: "BAD_REQUEST", message: "未绑定微信账号，无法发起支付" });
        const topupYuan = Number(part.topupAmount);
        const amountFen = Math.round(topupYuan * 100);
        const orderId = generateOrderId();
        // 创建补缴订单
        await db.createMatchOrderRow({ orderId, matchId: input.matchId, userId: ctx.user.id, amount: topupYuan, orderType: "topup", status: "pending" });
        let prepay;
        try {
          prepay = await createPrepay({ orderId, description: `球局补缴-${match.title}`, amountFen, openid });
        } catch (e: any) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `微信支付预下单失败: ${e.message}` });
        }
        if (prepay.prepayId) await db.updateMatchOrder(orderId, { wxPrepayId: prepay.prepayId });
        return { orderId, ...prepay, isMockMode: !isWxpayConfigured(), amount: topupYuan };
      }),
    // ─── V6 补缴确认（Mock 模式 / 回调统一处理后调用）─────────────────────────
    confirmTopupPayment: protectedProcedure
      .input(z.object({ orderId: z.string(), matchId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const dbInst = await db.getDb();
        if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const order = await db.getMatchOrderByOrderId(input.orderId);
        if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "订单不存在" });
        // 生产环境补缴亦走微信回调，这里仅 Mock 直连
        if (isWxpayConfigured()) throw new TRPCError({ code: "FORBIDDEN", message: "生产环境支付由微信回调处理" });
        await db.updateMatchOrder(input.orderId, { status: "paid", paidAt: new Date() });
        // 累加实付，清零待补缴，状态转 paid
        const part = await db.getMatchParticipant(input.matchId, ctx.user.id);
        const newPaid = (part ? Number(part.paidAmount) : 0) + Number(order.amount);
        await db.setParticipantSettlement(input.matchId, ctx.user.id, { paidAmount: newPaid, topupAmount: 0, paymentStatus: "paid" });
        // 补缴款项继续结算给发起人
        try {
          const match = await db.getTennisMatchById(input.matchId);
          if (match) {
            const organizer = await db.getUserById(match.authorId);
            if (organizer?.wechatOpenid) {
              const batchId = generateOrderId();
              await transferToUser({ batchId, openid: organizer.wechatOpenid, amountFen: Math.round(Number(order.amount) * 100), remark: `球局「${match.title}」补缴结算` });
              await db.updateMatchOrder(input.orderId, { status: "settled", settledAt: new Date() });
              await sendNotification(match.authorId, "system", "补缴到账", `「${match.title}」有参与者补缴 ${Number(order.amount).toFixed(2)} 元，已结算到您的微信零钱。`, input.matchId);
            }
          }
        } catch (e: any) {
          console.error("topup settle failed:", e?.message || e);
        }
        return { success: true };
      }),
    createPayOrder: protectedProcedure
      .input(z.object({
        matchId: z.number(),
        // openid 由后端从 ctx.user.wechatOpenid 获取，不再依赖前端传入（安全）
      }))
      .mutation(async ({ ctx, input }) => {
        const match = await db.getTennisMatchById(input.matchId);
        if (!match) throw new TRPCError({ code: "NOT_FOUND" });
        // 确保 circleOnly 和 feeRequired 字段存在，即使数据库中没有，也默认为 false
        const safeMatch = { ...match, circleOnly: (match as any).circleOnly ?? false, feeRequired: (match as any).feeRequired ?? false };
        if (!match.feeRequired || !match.feePerPerson) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "该球局无需预付费用" });
        }
        // 发起人不能报名/支付自己发布的球局（与 join 一致，防止发起人重复占位导致人数错乱）
        if (match.authorId === ctx.user.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "不能报名自己发布的球局" });
        }
        // 开球时间一到即截止支付（兜底）
        if (new Date(`${match.matchDate}T${match.startTime}:00+08:00`).getTime() <= Date.now()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "该球局已开始，无法支付" });
        }
        // 检查是否已报名（待支付占位 pending 或已确认 confirmed 都可发起支付）
        const participant = await db.getMatchParticipant(input.matchId, ctx.user.id);
        if (!participant || (participant.status !== "pending" && participant.status !== "confirmed")) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "请先报名再支付" });
        }
        if (participant.paymentStatus === "paid") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "已支付，请勿重复支付" });
        }
        // 从用户表获取 wechatOpenid（安全，不依赖前端传入）
        const userRecord = await db.getUserById(ctx.user.id);
        const openid = userRecord?.wechatOpenid;
        if (!openid && isWxpayConfigured()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "未绑定微信账号，无法发起支付" });
        }
        const orderId = generateOrderId();
        const amountFen = Math.round(Number(match.feePerPerson) * 100);
        const dbInst = await db.getDb();
        if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { matchOrders } = await import("../drizzle/schema");
        // 创建订单记录
        await dbInst.insert(matchOrders).values({
          orderId,
          matchId: input.matchId,
          userId: ctx.user.id,
          amount: String(match.feePerPerson),
          status: "pending",
        });
        // 更新参与者订单号
        const { matchParticipants: mp } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        await dbInst.update(mp).set({ orderId, paymentStatus: "pending" })
          .where(and(eq(mp.matchId, input.matchId), eq(mp.userId, ctx.user.id)));
        // 调用微信支付预下单
        let prepay;
        try {
          prepay = await createPrepay({
            orderId,
            description: `球局场地费-${match.title}`,
            amountFen,
            openid: openid || "mock_openid", // Mock 模式下 openid 不重要
          });
        } catch (prepayErr: any) {
          console.error(`[createPayOrder] createPrepay 失败 orderId=${orderId}:`, prepayErr.message);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `微信支付预下单失败: ${prepayErr.message}` });
        }
        // 将 prepayId 写入数据库（之前漏掉了这一步）
        if (prepay.prepayId) {
          await dbInst.update(matchOrders)
            .set({ wxPrepayId: prepay.prepayId })
            .where(eq(matchOrders.orderId, orderId));
        }
        console.log(`[createPayOrder] 预下单成功 orderId=${orderId} prepayId=${prepay.prepayId} userId=${ctx.user.id} matchId=${input.matchId}`);
        return { orderId, ...prepay, isMockMode: !isWxpayConfigured() };
      }),

    // ─── 支付：支付成功回调（微信服务器主动通知）─────────────────────────────
    // 注意：此接口由微信服务器调用，需在 index.ts 中注册为 POST /api/wxpay/notify
    // 这里提供一个内部处理函数，由 index.ts 路由调用
    confirmPayment: protectedProcedure
      .input(z.object({ orderId: z.string(), matchId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // 仅 Mock 模式下前端可直接调用此接口模拟支付成功
        if (isWxpayConfigured()) {
          throw new TRPCError({ code: "FORBIDDEN", message: "生产环境支付由微信回调处理" });
        }
        const dbInst = await db.getDb();
        if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { matchOrders, matchParticipants: mp, tennisMatches: tm } = await import("../drizzle/schema");
        const { eq, and, sql } = await import("drizzle-orm");
        await dbInst.update(matchOrders).set({ status: "paid", paidAt: new Date() })
          .where(eq(matchOrders.orderId, input.orderId));
        // 是否首次从待支付占位 pending 转 confirmed
        const partRows = await dbInst.select().from(mp).where(and(eq(mp.matchId, input.matchId), eq(mp.userId, ctx.user.id)));
        const wasPending = partRows.length > 0 && partRows[0].status === "pending";
        // 转 confirmed + 已支付；同时写入 orderId，退款时需要通过 orderId 查找订单
        await dbInst.update(mp).set({ status: "confirmed", paymentStatus: "paid", orderId: input.orderId })
          .where(and(eq(mp.matchId, input.matchId), eq(mp.userId, ctx.user.id)));
        if (wasPending) {
          await dbInst.update(tm).set({ currentParticipants: sql`${tm.currentParticipants} + 1` as any }).where(eq(tm.id, input.matchId));
          const matchRows = await dbInst.select().from(tm).where(eq(tm.id, input.matchId));
          if (matchRows.length > 0) {
            const m = matchRows[0];
            // m.currentParticipants 已是 +1 后的新值（含发起人），直接与 max 比较判满
            if (((m.currentParticipants ?? 0)) >= (m.maxParticipants ?? 0) && m.status === "open") {
              await dbInst.update(tm).set({ status: "full" }).where(eq(tm.id, input.matchId));
            }
            const joiner = await db.getUserById(ctx.user.id);
            await sendNotification(m.authorId, "system", "新的报名", `${joiner?.name ?? "有人"}已付费报名您的约球「${m.title}」。`, undefined);
          }
        }
        return { success: true };
      }),

    // ─── 支付：发起者确认球局完成，触发结算流程 ──────────────────────────────
    confirmMatchComplete: protectedProcedure
      // attendance: 实际到场名单（可选）。传入则走 V6 动态重算+多退少补；不传则向后兼容走原全额结算
      .input(z.object({
        matchId: z.number(),
        attendance: z.array(z.object({ userId: z.number(), attended: z.boolean() })).optional(),
        // 发起人本人是否到场打球：到场则一同分摊场地费（分母+1），未到场则不分摊。默认 true。
        organizerAttended: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const match = await db.getTennisMatchById(input.matchId);
        if (!match) throw new TRPCError({ code: "NOT_FOUND" });
        // 确保 circleOnly 和 feeRequired 字段存在，即使数据库中没有，也默认为 false
        const safeMatch = { ...match, circleOnly: (match as any).circleOnly ?? false, feeRequired: (match as any).feeRequired ?? false };
        if (match.authorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "只有发布者可确认" });
        if (match.status === "completed") throw new TRPCError({ code: "BAD_REQUEST", message: "已确认完成" });
        const dbInst = await db.getDb();
        if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { matchOrders, matchSettlements, tennisMatches } = await import("../drizzle/schema");
        const { eq, and, inArray } = await import("drizzle-orm");
        // 标记球局为已完成
        await dbInst.update(tennisMatches).set({ status: "completed" }).where(eq(tennisMatches.id, input.matchId));

        // 已支付的预付订单（每位付费参与者一笔）
        const paidOrders = await dbInst.select().from(matchOrders)
          .where(and(eq(matchOrders.matchId, input.matchId), inArray(matchOrders.orderType as any, ["prepay"] as any), inArray(matchOrders.status, ["paid"])));
        const fallbackPaidOrders = paidOrders.length > 0 ? paidOrders : await dbInst.select().from(matchOrders)
          .where(and(eq(matchOrders.matchId, input.matchId), inArray(matchOrders.status, ["paid"])));
        const usedPaidOrders = fallbackPaidOrders;
        const totalPaid = usedPaidOrders.reduce((sum, o) => sum + Number(o.amount), 0);
        if (totalPaid <= 0) return { success: true, totalAmount: 0, message: "无需结算" };

        // ══════════════════════ V6 分支：按实到场动态重算（多退少补）══════════════════════
        if (input.attendance && input.attendance.length > 0) {
          // 场地费总额：优先用已存 courtTotalFee，缺省用 已付总额 兜底
          const courtTotalFee = (match as any).courtTotalFee && Number((match as any).courtTotalFee) > 0
            ? Number((match as any).courtTotalFee)
            : totalPaid;
          const attendedIds = input.attendance.filter(a => a.attended).map(a => a.userId);
          const paidAttendedCount = attendedIds.length; // 付费参与者中实际到场人数
          // 发起人是否到场：到场则一同分摊场地费（分母 +1），未到场则不分摊。默认视为到场。
          const organizerAttended = input.organizerAttended !== false;
          // 分摊总人数 = 付费到场人数 + （发起人到场 ? 1 : 0）
          const divisor = paidAttendedCount + (organizerAttended ? 1 : 0);
          if (divisor <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "到场人数不能为 0" });
          const attendedCount = paidAttendedCount; // 兼容下文：付费到场人数（用于消息展示）
          // 人均应付（按实际分摊总人数均摊场地费），分为单位避免精度问题
          const perFen = Math.round((courtTotalFee * 100) / divisor);

          let refundTotalFen = 0; // 累计退款（分）
          let topupTotalFen = 0;  // 累计待补缴（分）
          const settleNotes: string[] = [];

          for (const o of usedPaidOrders) {
            const uid = o.userId;
            const paidFen = Math.round(Number(o.amount) * 100);
            const isAttended = attendedIds.includes(uid);
            // 写入到场标记
            await db.setParticipantAttendance(input.matchId, uid, isAttended);

            if (!isAttended) {
              // 爽约：报名付费未到场 → 那份钱不退、扣信用分；记 paidAmount 不变、topup=0
              await db.setParticipantSettlement(input.matchId, uid, { paidAmount: Number(o.amount), topupAmount: 0, paymentStatus: "paid" });
              try { await db.addCreditLog(uid, -10, `爽约未到场扣分-${safeMatch.title}`.slice(0, 80), input.matchId); } catch (_e) {}
              await sendNotification(uid, "system", "爽约提醒",
                `您报名的「${safeMatch.title}」未到场，已付费用不予退还并扣除信用分。`, input.matchId);
              continue;
            }

            // 到场者：实际应付 perFen，与已付对比
            if (paidFen > perFen) {
              // 多付 → 退差价（原路退回微信）
              const diffFen = paidFen - perFen;
              const refundId = generateOrderId();
              try {
                await refundOrder({ orderId: o.orderId, refundId, totalFen: paidFen, refundFen: diffFen, reason: `到场重算退差价-${safeMatch.title}`.slice(0, 80) });
                await db.updateMatchOrder(o.orderId, { status: "partial_refunded", refundId, refundReason: "到场重算退差价", refundedAt: new Date() });
                await db.setParticipantSettlement(input.matchId, uid, { paidAmount: perFen / 100, topupAmount: 0, paymentStatus: "partial_refunded" });
                refundTotalFen += diffFen;
                await sendNotification(uid, "system", "退款通知",
                  `「${safeMatch.title}」按实际到场人数重算，已为您退回 ${(diffFen/100).toFixed(2)} 元（原路退回微信）。`, input.matchId);
              } catch (e: any) {
                console.error("refund diff failed:", e?.message || e);
                await notifyOwner({ title: "退差价失败", content: `球局 ${input.matchId} 用户 ${uid} 退差价失败：${e?.message || e}` });
              }
            } else if (paidFen < perFen) {
              // 少付 → 挂待补缴账单（不强制划扣）
              const topupFen = perFen - paidFen;
              await db.setParticipantSettlement(input.matchId, uid, { paidAmount: Number(o.amount), topupAmount: topupFen / 100, paymentStatus: "topup_pending" });
              topupTotalFen += topupFen;
              await sendNotification(uid, "system", "待补缴提醒",
                `「${safeMatch.title}」按实际到场人数重算，您需补缴 ${(topupFen/100).toFixed(2)} 元。请在「我的钱包」完成补缴，未结清将无法报名新球局。`, input.matchId);
            } else {
              // 刚好相等
              await db.setParticipantSettlement(input.matchId, uid, { paidAmount: Number(o.amount), topupAmount: 0, paymentStatus: "paid" });
            }
          }

          // 实际可结算给发起人的金额：
          // 实收 = 付费者已付总额 - 已退差价；
          // 若发起人本人到场，需自付其应分摊的一份(perFen)，从结算额中扣除（即发起人不把自己那份收走）。
          const organizerShareFen = organizerAttended ? perFen : 0;
          const settleFen = Math.round(totalPaid * 100) - refundTotalFen - organizerShareFen;
          const settleYuan = settleFen / 100;

          // 结算记录 upsert
          const existing = await dbInst.select().from(matchSettlements).where(eq(matchSettlements.matchId, input.matchId));
          if (!existing[0]) {
            await dbInst.insert(matchSettlements).values({
              matchId: input.matchId, organizerId: ctx.user.id,
              totalAmount: String(courtTotalFee), platformFee: "0.00",
              netAmount: String(settleYuan), status: "confirming", confirmedAt: new Date(),
            });
          } else {
            await dbInst.update(matchSettlements).set({ netAmount: String(settleYuan), confirmedAt: new Date() }).where(eq(matchSettlements.matchId, input.matchId));
          }

          // 打款给发起人（已收部分）
          let settled = false;
          let settleMessage = `按实际到场 ${attendedCount} 人重算完成`;
          try {
            const organizer = await db.getUserById(ctx.user.id);
            const payeeOpenid = organizer?.wechatOpenid;
            if (payeeOpenid && settleFen > 0) {
              const batchId = generateOrderId();
              const transfer = await transferToUser({ batchId, openid: payeeOpenid, amountFen: settleFen, remark: `球局「${safeMatch.title}」场地费结算` });
              await dbInst.update(matchSettlements).set({ status: "settled", settledAt: new Date(), wxBatchId: transfer.batchId }).where(eq(matchSettlements.matchId, input.matchId));
              await dbInst.update(matchOrders).set({ status: "settled", settledAt: new Date() })
                .where(and(eq(matchOrders.matchId, input.matchId), inArray(matchOrders.status, ["paid"])));
              settled = true;
              settleMessage = `按实到 ${attendedCount} 人重算：已结算 ${settleYuan.toFixed(2)} 元到您的微信零钱` + (topupTotalFen > 0 ? `；另有 ${(topupTotalFen/100).toFixed(2)} 元待到场者补缴` : "");
            } else if (!payeeOpenid) {
              await notifyOwner({ title: "结算缺少 openid", content: `球局 ${input.matchId} 发起人缺少 wechatOpenid，无法自动打款。` });
              settleMessage = "结算待处理：未获取到您的微信收款信息，请联系平台";
            }
          } catch (e: any) {
            console.error("transferToUser failed:", e?.message || e);
            settleMessage = `重算完成，结算处理中（${settleYuan.toFixed(2)} 元）`;
            await notifyOwner({ title: "结算打款失败，待重试", content: `球局 ${input.matchId} 打款失败：${e?.message || e}` });
          }
          return { success: true, mode: "dynamic", attendedCount, divisor, organizerAttended, organizerShare: organizerShareFen / 100, perPerson: perFen / 100, refundTotal: refundTotalFen / 100, topupTotal: topupTotalFen / 100, settled, message: settleMessage };
        }

        // ══════════════════════ 兼容分支：原全额结算（未传到场名单）══════════════════════
        const totalAmount = totalPaid;
        const existing = await dbInst.select().from(matchSettlements).where(eq(matchSettlements.matchId, input.matchId));
        let settlementRow = existing[0];
        if (!settlementRow) {
          await dbInst.insert(matchSettlements).values({
            matchId: input.matchId, organizerId: ctx.user.id,
            totalAmount: String(totalAmount), platformFee: "0.00", netAmount: String(totalAmount),
            status: "confirming", confirmedAt: new Date(),
          });
          const reread = await dbInst.select().from(matchSettlements).where(eq(matchSettlements.matchId, input.matchId));
          settlementRow = reread[0];
        }
        if (settlementRow && settlementRow.status === "settled") {
          return { success: true, totalAmount, settled: true, message: "该球局已结算" };
        }
        let settled = false;
        let settleMessage = `共 ${totalAmount} 元将结算给您`;
        try {
          const organizer = await db.getUserById(ctx.user.id);
          const payeeOpenid = organizer?.wechatOpenid;
          if (!payeeOpenid) {
            settleMessage = "结算待处理：未获取到您的微信收款信息，请联系平台";
            await notifyOwner({ title: "结算打款缺少 openid", content: `球局 ${input.matchId} 确认完成，但发起人(用户 ${ctx.user.id})缺少 wechatOpenid，无法自动打款，请人工处理。` });
          } else {
            const amountFen = Math.round(totalAmount * 100);
            const batchId = generateOrderId();
            const transfer = await transferToUser({ batchId, openid: payeeOpenid, amountFen, remark: `球局「${safeMatch.title}」场地费结算` });
            await dbInst.update(matchSettlements).set({ status: "settled", settledAt: new Date(), wxBatchId: transfer.batchId }).where(eq(matchSettlements.matchId, input.matchId));
            await dbInst.update(matchOrders).set({ status: "settled", settledAt: new Date() })
              .where(and(eq(matchOrders.matchId, input.matchId), eq(matchOrders.status, "paid")));
            settled = true;
            settleMessage = `共 ${totalAmount} 元已结算到您的微信零钱`;
          }
        } catch (e: any) {
          console.error("transferToUser failed:", e?.message || e);
          settleMessage = `球局已确认完成，结算正在处理中（${totalAmount} 元）`;
          await notifyOwner({ title: "结算打款失败，待重试", content: `球局 ${input.matchId} 自动打款失败：${e?.message || e}。已保留待结算状态，等待重试或人工处理。` });
        }
        const participants = await db.getMatchParticipants(input.matchId);
        for (const p of participants) {
          if (p.paymentStatus === "paid") {
            await sendNotification(p.userId, "system", "球局已完成",
              `「${safeMatch.title}」已由发起人确认完成，场地费已全额结算给发起人。如对费用有异议，请在球局群内与发起人私下协商，平台不介入资金纠纷。`,
              input.matchId);
          }
        }
        return { success: true, totalAmount, settled, message: settleMessage };
      }),
    // ─── 支付：参与者申请异议（球局未举行等情况）────────────────────────────
    disputeSettlement: protectedProcedure
      .input(z.object({ matchId: z.number(), reason: z.string().min(5, "请描述异议原因（至少5字）") }))
      .mutation(async ({ ctx, input }) => {
        const dbInst = await db.getDb();
        if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { matchSettlements } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const settlements = await dbInst.select().from(matchSettlements).where(eq(matchSettlements.matchId, input.matchId));
        if (settlements.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "未找到结算记录" });
        const settlement = settlements[0];
        if (settlement.status !== "confirming") throw new TRPCError({ code: "BAD_REQUEST", message: "该结算已处理，无法申请异议" });
        // 检查是否在24小时内
        const confirmedAt = settlement.confirmedAt ? new Date(settlement.confirmedAt) : new Date();
        const diffHours = (Date.now() - confirmedAt.getTime()) / (1000 * 60 * 60);
        if (diffHours > 24) throw new TRPCError({ code: "BAD_REQUEST", message: "异议申请已超过24小时截止时间" });
        await dbInst.update(matchSettlements).set({
          status: "disputed",
          disputeReason: input.reason,
          disputeUserId: ctx.user.id,
        }).where(eq(matchSettlements.matchId, input.matchId));
        // 通知平台管理员介入
        await notifyOwner({
          title: "结算异议申请",
          content: `用户 ${ctx.user.id} 对球局 ${input.matchId} 的结算提出异议：${input.reason}，请介入处理。`,
        });
        return { success: true };
      }),

    // ─── 支付：查询我的钱包（待结算、已结算、退款记录）────────────────────
    myWallet: protectedProcedure
      .query(async ({ ctx }) => {
        const dbInst = await db.getDb();
        if (!dbInst) return { pendingOrders: [], settledOrders: [], refundedOrders: [], pendingSettlements: [] };
        const { matchOrders, matchSettlements, tennisMatches } = await import("../drizzle/schema");
        const { eq, and, inArray } = await import("drizzle-orm");
        // 我支付的订单
        const myOrders = await dbInst.select({
          orderId: matchOrders.orderId,
          matchId: matchOrders.matchId,
          amount: matchOrders.amount,
          status: matchOrders.status,
          paidAt: matchOrders.paidAt,
          refundedAt: matchOrders.refundedAt,
          matchTitle: tennisMatches.title,
          matchDate: tennisMatches.matchDate,
        }).from(matchOrders)
          .leftJoin(tennisMatches, eq(matchOrders.matchId, tennisMatches.id))
          .where(eq(matchOrders.userId, ctx.user.id));
        // 我作为组织者的待结算/已结算记录
        const mySettlements = await dbInst.select({
          matchId: matchSettlements.matchId,
          totalAmount: matchSettlements.totalAmount,
          netAmount: matchSettlements.netAmount,
          status: matchSettlements.status,
          confirmedAt: matchSettlements.confirmedAt,
          settledAt: matchSettlements.settledAt,
          matchTitle: tennisMatches.title,
          matchDate: tennisMatches.matchDate,
        }).from(matchSettlements)
          .leftJoin(tennisMatches, eq(matchSettlements.matchId, tennisMatches.id))
          .where(eq(matchSettlements.organizerId, ctx.user.id));
        // V6 我的待补缴（按实际到场重算后少缴的部分）
        const { matchParticipants } = await import("../drizzle/schema");
        const myTopups = await dbInst.select({
          matchId: matchParticipants.matchId,
          topupAmount: matchParticipants.topupAmount,
          paymentStatus: matchParticipants.paymentStatus,
          matchTitle: tennisMatches.title,
          matchDate: tennisMatches.matchDate,
        }).from(matchParticipants)
          .leftJoin(tennisMatches, eq(matchParticipants.matchId, tennisMatches.id))
          .where(and(eq(matchParticipants.userId, ctx.user.id), eq(matchParticipants.paymentStatus, "topup_pending" as any)));
        return {
          topupPending: myTopups.filter(t => Number(t.topupAmount) > 0),
          pendingOrders: myOrders.filter(o => o.status === "pending"),
          paidOrders: myOrders.filter(o => o.status === "paid" || o.status === "settled"),
          refundedOrders: myOrders.filter(o => o.status === "refunded"),
          pendingSettlements: mySettlements.filter(s => s.status === "confirming"),
          settledSettlements: mySettlements.filter(s => s.status === "settled"),
          disputedSettlements: mySettlements.filter(s => s.status === "disputed"),
        };
      }),
    // ─── 球局群聊 ──────────────────────────────────────────────────────────────
    // 获取群聊消息列表（分页 + 轮询增量）
    getMessages: protectedProcedure
      .input(z.object({
        matchId: z.number(),
        afterId: z.number().optional(),   // 轮询时传上次最后一条消息的 id
        limit: z.number().min(1).max(100).default(50),
      }))
      .query(async ({ ctx, input }) => {
        const { matchMessages, matchParticipants, users } = await import("../drizzle/schema");
        const { eq, and, gt, desc, asc } = await import("drizzle-orm");
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        // 验证用户是参与者或发布者
        const match = await db.getTennisMatchById(input.matchId);
        if (!match) throw new TRPCError({ code: "NOT_FOUND", message: "球局不存在" });
        const participantRows = await dbInstance.select().from(matchParticipants)
          .where(and(
            eq(matchParticipants.matchId, input.matchId),
            eq(matchParticipants.userId, ctx.user.id),
            eq(matchParticipants.status, "confirmed"),
          ));
        const isParticipant = match.authorId === ctx.user.id || participantRows.length > 0;
        if (!isParticipant) throw new TRPCError({ code: "FORBIDDEN", message: "仅球局成员可查看群聊" });

        const conditions: any[] = [eq(matchMessages.matchId, input.matchId)];
        if (input.afterId) conditions.push(gt(matchMessages.id, input.afterId));

        const msgs = await dbInstance
          .select({
            id: matchMessages.id,
            content: matchMessages.content,
            msgType: matchMessages.msgType,
            createdAt: matchMessages.createdAt,
            userId: matchMessages.userId,
            userName: users.name,
            userAvatar: users.avatar,
          })
          .from(matchMessages)
          .leftJoin(users, eq(matchMessages.userId, users.id))
          .where(and(...conditions))
          .orderBy(input.afterId ? asc(matchMessages.id) : desc(matchMessages.id))
          .limit(input.limit);

        // 首次加载时反转为时间正序
        return { messages: input.afterId ? msgs : msgs.reverse() };
      }),

    // 发送群聊消息
    sendMessage: protectedProcedure
      .input(z.object({
        matchId: z.number(),
        content: z.string().min(1).max(2000),
        msgType: z.enum(["text", "image"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { matchMessages, matchParticipants } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const match = await db.getTennisMatchById(input.matchId);
        if (!match) throw new TRPCError({ code: "NOT_FOUND", message: "球局不存在" });
        if (match.status === "cancelled") throw new TRPCError({ code: "BAD_REQUEST", message: "球局已取消，无法发送消息" });

        const participantRows = await dbInstance.select().from(matchParticipants)
          .where(and(
            eq(matchParticipants.matchId, input.matchId),
            eq(matchParticipants.userId, ctx.user.id),
            eq(matchParticipants.status, "confirmed"),
          ));
        const isParticipant = match.authorId === ctx.user.id || participantRows.length > 0;
        if (!isParticipant) throw new TRPCError({ code: "FORBIDDEN", message: "仅球局成员可发送消息" });

        const msgType = input.msgType ?? "text";
        const [result] = await dbInstance.insert(matchMessages).values({
          matchId: input.matchId,
          userId: ctx.user.id,
          content: input.content.trim(),
          msgType,
        });
        const newId = (result as any)?.insertId ?? 0;
        return { success: true, messageId: Number(newId) };
      }),

    // 获取未读消息数
    getUnreadCount: protectedProcedure
      .input(z.object({
        matchId: z.number(),
        lastReadId: z.number().default(0),  // 上次读到的最后一条消息 id
      }))
      .query(async ({ ctx, input }) => {
        const { matchMessages, matchParticipants } = await import("../drizzle/schema");
        const { eq, and, gt } = await import("drizzle-orm");
        const dbInstance = await db.getDb();
        if (!dbInstance) return { count: 0 };
        // 验证是否是球局成员
        const match = await db.getTennisMatchById(input.matchId);
        if (!match) return { count: 0 };
        const participantRows = await dbInstance.select().from(matchParticipants)
          .where(and(
            eq(matchParticipants.matchId, input.matchId),
            eq(matchParticipants.userId, ctx.user.id),
            eq(matchParticipants.status, "confirmed"),
          ));
        const isParticipant = match.authorId === ctx.user.id || participantRows.length > 0;
        if (!isParticipant) return { count: 0 };
        const rows = await dbInstance.select({ id: matchMessages.id })
          .from(matchMessages)
          .where(and(
            eq(matchMessages.matchId, input.matchId),
            gt(matchMessages.id, input.lastReadId),
          ));
        return { count: rows.length };
      }),
  }),

  // ─── Lesson Packages (Student side) ───────────────────────────────────────────────────────
  package: router({
    listByCoach: publicProcedure
      .input(z.object({ coachId: z.number() }))
      .query(async ({ input }) => {
        return db.getLessonPackagesByCoach(input.coachId);
      }),

    buy: protectedProcedure
      .input(z.object({ packageId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const pkg = await db.getLessonPackageById(input.packageId);
        if (!pkg || !pkg.isActive) throw new TRPCError({ code: "NOT_FOUND", message: "课时包不存在" });
        // Create pending_payment record
        await db.createStudentPackage({
          packageId: pkg.id,
          studentId: ctx.user.id,
          coachId: pkg.coachId,
          totalLessons: pkg.totalLessons,
          remainingLessons: pkg.totalLessons,
          pricePaid: pkg.price,
        });
        // Notify coach
        const student = await db.getUserById(ctx.user.id);
        const coach = await db.getCoachProfileById(pkg.coachId);
        if (coach) {
          await sendNotification(
            coach.userId, "system",
            "学员购买了课时包",
            `${student?.name ?? "学员"}购买了您的「${pkg.name}」（${pkg.totalLessons}节课），请确认收款并安排课程。`,
            undefined
          );
        }
        return { success: true, message: "课时包购买成功，请完成支付后联系教练激活" };
      }),

    myPackages: protectedProcedure.query(async ({ ctx }) => {
      const pkgs = await db.getStudentPackages(ctx.user.id);
      return Promise.all(pkgs.map(async (p) => {
        const pkg = await db.getLessonPackageById(p.packageId);
        const coach = await db.getCoachProfileById(p.coachId);
        const deductions = await db.getPackageDeductions(p.id);
        return { ...p, packageName: pkg?.name, coachName: coach?.displayName, coachAvatar: coach?.avatar, deductions };
      }));
    }),

    requestRefund: protectedProcedure
      .input(z.object({ studentPackageId: z.number(), note: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const pkg = await db.getStudentPackageById(input.studentPackageId);
        if (!pkg) throw new TRPCError({ code: "NOT_FOUND" });
        if (pkg.studentId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        if (!(["active", "pending_payment"] as string[]).includes(pkg.status)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "该课时包状态不支持退款" });
        }
        await db.requestStudentPackageRefund(input.studentPackageId, ctx.user.id, input.note);
        // Notify coach
        const coach = await db.getCoachProfileById(pkg.coachId);
        if (coach) {
          await sendNotification(
            coach.userId, "system",
            "学员申请退款",
            `学员申请对课时包进行退款，请及时处理。备注：${input.note ?? "无"}`,
            undefined
          );
        }
        return { success: true };
      }),
  }),

  // ─── User (PKU Alumni) ─────────────────────────────────────────────────────────────────────
  user: router({
    myStats: protectedProcedure.query(async ({ ctx }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) return { matchCount: 0, bookingCount: 0, coachLessons: 0 };
      const { matchParticipants, bookings, tennisMatches } = await import("../drizzle/schema");
      const { eq, and, count } = await import("drizzle-orm");
      // 球局数口径：只统计【已确认(confirmed)参与】且【球局已被发起人确认完成(completed)】的球局
      const [matchCountResult] = await dbInstance
        .select({ count: count() })
        .from(matchParticipants)
        .innerJoin(tennisMatches, eq(matchParticipants.matchId, tennisMatches.id))
        .where(and(
          eq(matchParticipants.userId, ctx.user.id),
          eq(matchParticipants.status, "confirmed"),
          eq(tennisMatches.status, "completed")
        ));
      const [bookingCountResult] = await dbInstance
        .select({ count: count() })
        .from(bookings)
        .where(eq(bookings.studentId, ctx.user.id));
      return {
        matchCount: Number(matchCountResult?.count ?? 0),
        bookingCount: Number(bookingCountResult?.count ?? 0),
        coachLessons: Number(bookingCountResult?.count ?? 0), // 暂时对齐 bookingCount
      };
    }),

    applyPkuAlumni: protectedProcedure
      .input(z.object({
        year: z.string().optional(),
        school: z.string().optional(),
        studentId: z.string().optional(),
        note: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbInst = await db.getDb();
        if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { users: usersTable } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await dbInst.update(usersTable).set({
          pkuAlumni: true,
          pkuInfo: { year: input.year, school: input.school, studentId: input.studentId, note: input.note },
        }).where(eq(usersTable.id, ctx.user.id));
        return { success: true };
      }),

    revokePkuAlumni: protectedProcedure.mutation(async ({ ctx }) => {
      const dbInst = await db.getDb();
      if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { users: usersTable } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await dbInst.update(usersTable).set({ pkuAlumni: false, pkuInfo: null }).where(eq(usersTable.id, ctx.user.id));
      return { success: true };
    }),

    // 更新 NTRP 水平
    updateNtrpLevel: protectedProcedure
      .input(z.object({
        ntrpLevel: z.number().min(1.0).max(6.0),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbInst = await db.getDb();
        if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { users: usersTable } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await dbInst.update(usersTable).set({ ntrpLevel: String(input.ntrpLevel) }).where(eq(usersTable.id, ctx.user.id));
        return { success: true };
      }),

    // 更新联系方式（手机号 + 微信号）
    updateContact: protectedProcedure
      .input(z.object({
        phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入正确的手机号").optional(),
        wechatId: z.string().min(1).max(100).optional(),
      }).refine(data => !!(data.phone || data.wechatId), {
        message: "手机号和微信号至少填写一项",
        path: ["phone"],
      }))
      .mutation(async ({ ctx, input }) => {
        const dbInst = await db.getDb();
        if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { users: usersTable } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const updates: Record<string, string | null> = {};
        if (input.phone !== undefined) updates.phone = input.phone;
        if (input.wechatId !== undefined) updates.wechatId = input.wechatId;
        await dbInst.update(usersTable).set(updates).where(eq(usersTable.id, ctx.user.id));
        return { success: true };
      }),

    // 更新个人资料（昵称、头像、性别、城市、网球水平）
    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(50).optional(),
        avatar: z.string().optional(),
        gender: z.enum(["male", "female"]).nullable().optional(),
        city: z.string().max(50).nullable().optional(),
        tennisLevel: z.number().int().min(1).max(5).nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbInst = await db.getDb();
        if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { users: usersTable } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const updates: Record<string, string | number | null | undefined> = {};
        if (input.name !== undefined) updates.name = input.name;
        if (input.avatar !== undefined) updates.avatar = input.avatar;
        if (input.gender !== undefined) updates.gender = input.gender;
        if (input.city !== undefined) updates.city = input.city;
        if (input.tennisLevel !== undefined) updates.tennisLevel = input.tennisLevel;
        await dbInst.update(usersTable).set(updates).where(eq(usersTable.id, ctx.user.id));
        return { success: true };
      }),
    // 获取用户公开主页（NTRP、信用分、评价历史）
    getPublicProfile: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const user = await db.getUserById(input.userId);
        if (!user) throw new TRPCError({ code: "NOT_FOUND" });
        const reviews = await db.getUserReviews(input.userId);
        return {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          ntrpLevel: user.ntrpLevel,
          creditScore: user.creditScore,
          createdAt: user.createdAt,
          reviews,
        };
      }),

    // ─── 小程序码生成 ──────────────────────────────────────────────────────────────────────────────
    // 生成小程序码（球局分享 / 教练分享页用）
    getWxacode: publicProcedure
      .input(z.object({
        scene: z.string().max(32, "scene 最多 32 个字符"),  // 如 "matchId=123" 或 "coachId=5"
        page: z.string().optional(),                               // 小程序页面路径
        width: z.number().min(280).max(1280).optional(),
      }))
      .query(async ({ input }) => {
        const { getWxacode } = await import("./_core/wechat");
        try {
          const buf = await getWxacode({
            scene: input.scene,
            page: input.page,
            width: input.width ?? 430,
          });
          // 返回 base64 编码，前端直接用 <img src="data:image/png;base64,..." />
          return { base64: `data:image/png;base64,${buf.toString("base64")}` };
        } catch (err) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "小程序码生成失败，请稍后重试",
          });
        }
      }),

    // 查询当前用户的信用分变动记录
    getCreditLogs: protectedProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const logs = await db.getCreditLogs(ctx.user.id, input?.limit ?? 30);
        const userInfo = await db.getUserById(ctx.user.id);
        return {
          creditScore: userInfo?.creditScore ?? ctx.user.creditScore,
          consecutiveAttendCount: userInfo?.consecutiveAttendCount ?? 0,
          creditRestoreApplied: userInfo?.creditRestoreApplied ?? false,
          logs,
        };
      }),

    // 申请信用分恢复（信用分为0时可用）
        applyCreditRestore: protectedProcedure
      .mutation(async ({ ctx }) => {
        const userInfo = await db.getUserById(ctx.user.id);
        if (!userInfo) throw new TRPCError({ code: "NOT_FOUND" });
        if (userInfo.creditScore > 0) throw new TRPCError({ code: "BAD_REQUEST", message: "信用分大于0，无需申请" });
        if (userInfo.creditRestoreApplied) throw new TRPCError({ code: "BAD_REQUEST", message: "已提交申请，请等待审核" });
        await db.applyCreditRestore(ctx.user.id);
        // 通知管理员
        const { notifyOwner } = await import("./_core/notification");
        await notifyOwner({ title: "信用分恢复申请", content: `用户 ${userInfo.name ?? userInfo.phone ?? userInfo.id} 提交了信用分恢复申请，请前往管理后台审核。` });
                return { success: true };
      }),
  }),

  // ─── Venues ────────────────────────────────────────────────────────────────
  venue: router({
    // 找场地页·官方预订小程序列表（仅返回已上架，按权重降序）
    bookingApps: publicProcedure.query(async () => {
      return db.listBookingApps(true);
    }),
    list: publicProcedure
      .input(z.object({ area: z.string().optional(), search: z.string().optional(), limit: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return db.getVenues({ area: input?.area, search: input?.search, limit: input?.limit });
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const venue = await db.getVenueById(input.id);
        if (!venue) throw new TRPCError({ code: "NOT_FOUND" });
        return venue;
      }),

    create: adminProcedure
      .input(z.object({
        name: z.string(),
        area: z.enum(["大学城", "南山", "福田", "其他"]),
        address: z.string(),
        description: z.string().optional(),
        courtCount: z.number().optional(),
        pricePerHour: z.string().optional(),
        openTime: z.string().optional(),
        closeTime: z.string().optional(),
        phone: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createVenue(input as any);
        return { success: true };
      }),
  }),

  // ─── Bookings ──────────────────────────────────────────────────────────────
  booking: router({
    myBookings: protectedProcedure.query(async ({ ctx }) => {
      const bookingList = await db.getBookingsByStudent(ctx.user.id);
      const enriched = await Promise.all(bookingList.map(async (b) => {
        const coach = await db.getCoachProfileById(b.coachId);
        const venue = b.venueId ? await db.getVenueById(b.venueId) : null;
        const existingReview = await db.getReviewByBookingId(b.id);
        return { ...b, coach, venue, hasReviewed: !!existingReview };
      }));
      const publicEnriched = enriched.filter((m: any) => !m.circleOnly);
        return publicEnriched;
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const booking = await db.getBookingById(input.id);
        if (!booking) throw new TRPCError({ code: "NOT_FOUND" });
        if (booking.studentId !== ctx.user.id && ctx.user.role !== "coach" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const coach = await db.getCoachProfileById(booking.coachId);
        const venue = booking.venueId ? await db.getVenueById(booking.venueId) : null;
        const payment = await db.getPaymentByBookingId(booking.id);
        return { ...booking, coach, venue, payment };
      }),

    create: protectedProcedure
      .input(z.object({
        coachId: z.number(),
        venueId: z.number().optional(),          // null/undefined for custom venue
        customVenueName: z.string().optional(),  // student-supplied venue name
        customVenueAddress: z.string().optional(), // student-supplied address
        lessonDate: z.string(),
        startTime: z.string(),
        endTime: z.string(),
        durationHours: z.string().optional(),
        couponCode: z.string().optional(),
        studentNote: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const coach = await db.getCoachProfileById(input.coachId);
        if (!coach) throw new TRPCError({ code: "NOT_FOUND", message: "教练不存在" });

        const duration = parseFloat(input.durationHours ?? "1");
        const pricePerHour = parseFloat(coach.pricePerHour ?? "600");
        const totalAmount = (pricePerHour * duration).toFixed(2);

        let discountAmount = "0.00";
        let couponId: number | undefined;

        if (input.couponCode) {
          const coupon = await db.getCouponByCode(input.couponCode);
          if (coupon && new Date() <= new Date(coupon.validUntil)) {
            if (coupon.type === "fixed") {
              discountAmount = Math.min(parseFloat(coupon.discountValue), parseFloat(totalAmount)).toFixed(2);
            } else {
              discountAmount = (parseFloat(totalAmount) * parseFloat(coupon.discountValue) / 100).toFixed(2);
            }
            couponId = coupon.id;
          }
        }

        const finalAmount = (parseFloat(totalAmount) - parseFloat(discountAmount)).toFixed(2);
        const bookingNo = "BK" + Date.now().toString().slice(-10);

        await db.createBooking({
          bookingNo,
          studentId: ctx.user.id,
          coachId: input.coachId,
          venueId: input.venueId ?? null,
          customVenueName: input.customVenueName,
          customVenueAddress: input.customVenueAddress,
          lessonDate: input.lessonDate,
          startTime: input.startTime,
          endTime: input.endTime,
          durationHours: duration.toString(),
          pricePerHour: pricePerHour.toString(),
          totalAmount,
          discountAmount,
          finalAmount,
          couponId,
          studentNote: input.studentNote,
          status: "confirmed",
        });

        // Get the created booking（按 bookingNo 精确匹配，避免依赖返回顺序）
        const allBookings = await db.getBookingsByStudent(ctx.user.id);
        const newBooking = allBookings.find((b: any) => b.bookingNo === bookingNo) || allBookings[0];

        // Create payment record
        await db.createPayment({
          bookingId: newBooking.id,
          studentId: ctx.user.id,
          coachId: input.coachId,
          amount: finalAmount,
        });

        // Simulate payment success (in production, integrate real payment gateway)
        await db.updatePaymentStatus(newBooking.id, "paid");

        // Get venue info for notifications
        let venueInfo = "";
        if (input.venueId) {
          const venue = await db.getVenueById(input.venueId);
          if (venue) {
            venueInfo = `\n📍 上课地点：${venue.name}\n🏠 地址：${venue.address}${venue.mapUrl ? `\n🗺️ 导航：${venue.mapUrl}` : ""}${venue.bookingNote ? `\n📝 预约说明：${venue.bookingNote}` : ""}`;
          }
        } else if (input.customVenueName) {
          venueInfo = `\n📍 上课地点：${input.customVenueName}${input.customVenueAddress ? `\n🏠 地址：${input.customVenueAddress}` : ""}`;
        }

        // Notify coach
        const coachUser = await db.getUserById(coach.userId);
        if (coachUser) {
          await sendNotification(coachUser.id, "booking_created",
            "新预约已确认 🎾",
            `${ctx.user.name ?? "学员"} 已预约您的课程：${input.lessonDate} ${input.startTime}-${input.endTime}，请准时到场。${venueInfo}`,
            newBooking.id
          );
        }

                // Notify student
        await sendNotification(ctx.user.id, "payment_success",
          "预约已确认 🎾",
          `课程预约已确认！上课时间：${input.lessonDate} ${input.startTime}-${input.endTime}，金额：¥${finalAmount}。${venueInfo}`,
          newBooking.id
        );
        // ─── 微信订阅消息通知（fire-and-forget）─────────────────────────
        const venueNotifyName = input.customVenueName
          ?? (input.venueId ? (await db.getVenueById(input.venueId))?.name ?? "待确认" : "待确认");
        // 通知学员：预约成功
        if (ctx.user.wechatOpenid) {
          wxNotifyBookingToStudent({
            openid: ctx.user.wechatOpenid,
            coachName: coach.displayName,
            lessonDate: input.lessonDate,
            startTime: input.startTime,
            venueName: venueNotifyName,
          }).catch(console.error);
        }
        // 通知教练：新预约
        if (coachUser?.wechatOpenid) {
          wxNotifyBookingToCoach({
            openid: coachUser.wechatOpenid,
            studentName: ctx.user.name ?? "学员",
            lessonDate: input.lessonDate,
            startTime: input.startTime,
            venueName: venueNotifyName,
          }).catch(console.error);
        }
        // ── 互发联系方式（微信订阅消息）──────────────────────────────────────────
        const coachPhone = (coach as any).phone as string | undefined;
        const studentPhone = ctx.user.phone as string | undefined;
        // 发给学员：教练手机号
        if (ctx.user.wechatOpenid && coachPhone) {
          wxNotifyCoachContactToStudent({
            openid: ctx.user.wechatOpenid,
            coachName: coach.displayName,
            coachPhone,
          }).catch(console.error);
        }
        // 发给教练：学员手机号
        if (coachUser?.wechatOpenid && studentPhone) {
          wxNotifyStudentContactToCoach({
            openid: coachUser.wechatOpenid,
            studentName: ctx.user.name ?? "学员",
            studentPhone,
          }).catch(console.error);
        }
        return { success: true, bookingId: newBooking.id, bookingNo, finalAmount };
      }),

    cancel: protectedProcedure
      .input(z.object({ bookingId: z.number(), reason: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const booking = await db.getBookingById(input.bookingId);
        if (!booking) throw new TRPCError({ code: "NOT_FOUND" });
        if (booking.studentId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        if (!["pending", "confirmed"].includes(booking.status)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "当前状态无法取消" });
        }

        await db.updateBookingStatus(input.bookingId, "cancelled_by_student", {
          cancelReason: input.reason,
          cancelledAt: new Date(),
        });
        await db.updatePaymentStatus(input.bookingId, "refunded");

        // Notify coach
        const coach = await db.getCoachProfileById(booking.coachId);
        if (coach) {
          const coachUser = await db.getUserById(coach.userId);
          if (coachUser) {
            await sendNotification(coachUser.id, "booking_cancelled",
              "学员取消预约",
              `${ctx.user.name ?? "学员"} 取消了 ${booking.lessonDate} ${booking.startTime} 的课程。`,
              input.bookingId
            );
          }
        }

        return { success: true };
      }),

    submitReview: protectedProcedure
      .input(z.object({
        bookingId: z.number(),
        rating: z.number().min(1).max(5),
        content: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const booking = await db.getBookingById(input.bookingId);
        if (!booking || booking.studentId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        if (booking.status !== "completed") throw new TRPCError({ code: "BAD_REQUEST", message: "课程未完成" });

        // Prevent duplicate reviews for the same booking
        const existingReview = await db.getReviewByBookingId(input.bookingId);
        if (existingReview) throw new TRPCError({ code: "BAD_REQUEST", message: "该课程已评价，不可重复提交" });

        await db.createReview({
          bookingId: input.bookingId,
          studentId: ctx.user.id,
          coachId: booking.coachId,
          rating: input.rating,
          content: input.content,
          tags: input.tags,
        });

        const coach = await db.getCoachProfileById(booking.coachId);
        if (coach) {
          const coachUser = await db.getUserById(coach.userId);
          if (coachUser) {
            await sendNotification(coachUser.id, "review_received",
              "收到新评价 ⭐",
              `${ctx.user.name ?? "学员"} 给您留下了 ${input.rating} 星评价。`,
              input.bookingId
            );
          }
        }

        return { success: true };
      }),
  }),

  // ─── Notifications ─────────────────────────────────────────────────────────
  notification: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getNotifications(ctx.user.id);
    }),

    markRead: protectedProcedure
      .input(z.object({ ids: z.array(z.number()).optional() }))
      .mutation(async ({ ctx, input }) => {
        await db.markNotificationsRead(ctx.user.id, input.ids);
        return { success: true };
      }),

    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await db.markNotificationsRead(ctx.user.id);
      return { success: true };
    }),

    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      const count = await db.getUnreadNotificationCount(ctx.user.id);
      return { count };
    }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteNotification(ctx.user.id, input.id);
        return { success: true };
      }),
  }),

  // ─── Coupons (public) ──────────────────────────────────────────────────────
  coupon: router({
    validate: protectedProcedure
      .input(z.object({ code: z.string(), coachId: z.number(), amount: z.string() }))
      .query(async ({ input }) => {
        const coupon = await db.getCouponByCode(input.code);
        if (!coupon) return { valid: false, message: "优惠券不存在" };
        if (new Date() > new Date(coupon.validUntil)) return { valid: false, message: "优惠券已过期" };
        if (coupon.usedCount >= (coupon.maxUsageCount ?? 100)) return { valid: false, message: "优惠券已用完" };
        if (coupon.coachId && coupon.coachId !== input.coachId) return { valid: false, message: "该优惠券不适用于此教练" };

        let discount = 0;
        if (coupon.type === "fixed") {
          discount = Math.min(parseFloat(coupon.discountValue), parseFloat(input.amount));
        } else {
          discount = parseFloat(input.amount) * parseFloat(coupon.discountValue) / 100;
        }

        return {
          valid: true,
          coupon,
          discount: discount.toFixed(2),
          finalAmount: (parseFloat(input.amount) - discount).toFixed(2),
        };
      }),
  }),

  // ─── Admin ─────────────────────────────────────────────────────────────────
  admin: router({
    stats: adminProcedure.query(async () => {
      const base = await db.getPlatformStats();
      const dbInstance = await db.getDb();
      if (!dbInstance) return { ...base, totalMatches: 0, weekMatches: 0, weekParticipants: 0 };
      const { tennisMatches, matchParticipants } = await import("../drizzle/schema");
      const { sql: sqlFn, gte: gteOp } = await import("drizzle-orm");
      const [matchCount] = await dbInstance.select({ count: sqlFn<number>`count(*)` }).from(tennisMatches);
      const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7);
      const weekStartStr = weekStart.toISOString().slice(0, 10);
      const [weekMatchCount] = await dbInstance.select({ count: sqlFn<number>`count(*)` }).from(tennisMatches).where(gteOp(tennisMatches.matchDate, weekStartStr));
      const [weekParticipantCount] = await dbInstance.select({ count: sqlFn<number>`count(*)` }).from(matchParticipants).where(gteOp(matchParticipants.createdAt, weekStart));
      return {
        ...base,
        totalMatches: Number(matchCount?.count ?? 0),
        weekMatches: Number(weekMatchCount?.count ?? 0),
        weekParticipants: Number(weekParticipantCount?.count ?? 0),
      };
    }),

    coaches: adminProcedure.query(async () => {
      return db.getCoachProfiles({ limit: 100 });
    }),

    venues: adminProcedure.query(async () => {
      return db.getVenues();
    }),

    seedVenues: adminProcedure.mutation(async () => {
      const venueData = [
        {
          name: "深圳大学城体育中心网球场",
          area: "大学城" as const,
          address: "深圳市南山区留仙大道2032号",
          description: "大学城核心区域，环境优美，设施完善，拥有多片标准网球场地，灯光照明满足夜间训练需求。",
          courtCount: 6,
          pricePerHour: "80.00",
          openTime: "08:00",
          closeTime: "22:00",
          phone: "0755-26536888",
        },
        {
          name: "深圳大学粤海校区网球场",
          area: "大学城" as const,
          address: "深圳市南山区南海大道3688号",
          description: "深圳大学校内网球场，硬地球场，环境安静，适合专业训练。",
          courtCount: 4,
          pricePerHour: "60.00",
          openTime: "08:00",
          closeTime: "22:00",
          phone: "0755-26534000",
        },
        {
          name: "南山粤海文体中心（UPTennis）",
          area: "南山" as const,
          address: "深圳市南山区高新南环路1号",
          description: "南山科技园核心地带，室内网球场，不受天气影响，专业级场地设施。",
          courtCount: 8,
          pricePerHour: "120.00",
          openTime: "07:00",
          closeTime: "23:00",
          phone: "0755-86000888",
        },
        {
          name: "蛇口体育中心网球场",
          area: "南山" as const,
          address: "深圳市南山区蛇口工业路109号",
          description: "蛇口老区国际化社区，氛围轻松，周边配套完善，适合休闲与专业训练。",
          courtCount: 4,
          pricePerHour: "90.00",
          openTime: "08:00",
          closeTime: "22:00",
          phone: "0755-26851888",
        },
        {
          name: "深圳湾体育中心网球场",
          area: "南山" as const,
          address: "深圳市南山区白石路6号",
          description: "深圳湾畔，景色优美，专业级网球场地，曾承办多项国际赛事。",
          courtCount: 10,
          pricePerHour: "140.00",
          openTime: "07:00",
          closeTime: "22:00",
          phone: "0755-86999888",
        },
        {
          name: "香蜜体育中心网球场",
          area: "福田" as const,
          address: "深圳市福田区香蜜公园西北部",
          description: "福田区最大专业网球场地，7片标准网球场，场地标准高，灯光照明满足专业训练和业余比赛需求。",
          courtCount: 7,
          pricePerHour: "100.00",
          openTime: "07:00",
          closeTime: "22:00",
          phone: "0755-83789888",
        },
        {
          name: "中心公园体育中心网球场",
          area: "福田" as const,
          address: "深圳市福田区中心公园D1区",
          description: "福田CBD核心，停车便利，视野开阔，提供教练培训课程及器材租借服务。",
          courtCount: 2,
          pricePerHour: "80.00",
          openTime: "08:00",
          closeTime: "21:00",
          phone: "0755-83521888",
        },
        {
          name: "黑马网球俱乐部（香格里拉店）",
          area: "福田" as const,
          address: "深圳市福田区CBD香格里拉大酒店4楼",
          description: "CBD核心地带，高端室内网球场，环境优雅，适合商务人士和高端学员。",
          courtCount: 3,
          pricePerHour: "150.00",
          openTime: "07:00",
          closeTime: "23:00",
          phone: "0755-82888888",
        },
      ];

      for (const v of venueData) {
        await db.createVenue(v as any);
      }
      return { success: true, count: venueData.length };
    }),

    pendingCoaches: adminProcedure.query(async () => {
      const dbInstance = await db.getDb();
      if (!dbInstance) return [];
      const { coachProfiles } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      // Return coaches that have submitted for review (pending) or are already approved/rejected
      return dbInstance.select().from(coachProfiles)
        .where(eq(coachProfiles.verificationStatus, "pending"))
        .limit(100);
    }),
    allCoaches: adminProcedure
      .input(z.object({
        sortBy: z.enum(["totalLessons", "avgRating", "totalStudents", "sortWeight", "createdAt"]).optional(),
        filterSpecialty: z.string().optional(),
        filterCategory: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) return [];
        const { coachProfiles } = await import("../drizzle/schema");
        const { desc, asc } = await import("drizzle-orm");
        const sortField = input?.sortBy ?? "sortWeight";
        const orderFn = sortField === "createdAt" ? asc : desc;
        const rows = await dbInstance.select().from(coachProfiles)
          .orderBy(orderFn((coachProfiles as any)[sortField]))
          .limit(200);
        // Filter by specialty or category tag in JS (JSON columns)
        let result = rows;
        if (input?.filterSpecialty) {
          result = result.filter(r => (r.specialties as string[] ?? []).includes(input.filterSpecialty!));
        }
        if (input?.filterCategory) {
          result = result.filter(r => (r.categoryTags as string[] ?? []).includes(input.filterCategory!));
        }
        return result;
      }),

    reorderCoaches: adminProcedure
      .input(z.object({
        // Array of { coachId, sortWeight } pairs to update in batch
        orders: z.array(z.object({ coachId: z.number(), sortWeight: z.number() })),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { coachProfiles } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await Promise.all(
          input.orders.map(({ coachId, sortWeight }) =>
            dbInstance.update(coachProfiles).set({ sortWeight }).where(eq(coachProfiles.id, coachId))
          )
        );
        return { success: true };
      }),

    updateCoachMeta: adminProcedure
      .input(z.object({
        coachId: z.number(),
        categoryTags: z.array(z.string()).optional(),
        sortWeight: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { coachProfiles } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const updates: Record<string, unknown> = {};
        if (input.categoryTags !== undefined) updates.categoryTags = input.categoryTags;
        if (input.sortWeight !== undefined) updates.sortWeight = input.sortWeight;
        if (Object.keys(updates).length === 0) return { success: true };
        await dbInstance.update(coachProfiles).set(updates as any).where(eq(coachProfiles.id, input.coachId));
        return { success: true };
      }),
    approveCoach: adminProcedure
      .input(z.object({ coachId: z.number() }))
      .mutation(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { coachProfiles } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const [coach] = await dbInstance.select().from(coachProfiles).where(eq(coachProfiles.id, input.coachId)).limit(1);
        if (!coach) throw new TRPCError({ code: "NOT_FOUND" });
        await dbInstance.update(coachProfiles)
          .set({ isVerified: true, isActive: true, verificationStatus: "approved", reviewNote: null })
          .where(eq(coachProfiles.id, input.coachId));
        // Upgrade user role to coach upon approval
        const { users } = await import("../drizzle/schema");
        await dbInstance.update(users).set({ role: "coach" }).where(eq(users.id, coach.userId));
                // Notify the coach
        await sendNotification(coach.userId, "coach_approved",
          "教练入驻申请已通过 ✅",
          "恭喜！您的教练入驻申请已通过审核，现在可以登录教练工作台并接受学员预约。",
          input.coachId
        );
        // 微信订阅消息通知教练
        const coachUserApprove = await db.getUserById(coach.userId);
        if (coachUserApprove?.wechatOpenid) {
          wxNotifyCoachApproved({
            openid: coachUserApprove.wechatOpenid,
            coachName: coach.displayName,
          }).catch(console.error);
        }
        return { success: true };
      }),
    rejectCoach: adminProcedure
      .input(z.object({ coachId: z.number(), reason: z.string().optional() }))
      .mutation(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { coachProfiles } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const [coach] = await dbInstance.select().from(coachProfiles).where(eq(coachProfiles.id, input.coachId)).limit(1);
        if (!coach) throw new TRPCError({ code: "NOT_FOUND" });
        await dbInstance.update(coachProfiles)
          .set({ isActive: false, verificationStatus: "rejected", reviewNote: input.reason ?? null })
          .where(eq(coachProfiles.id, input.coachId));
                // Notify the coach
        await sendNotification(coach.userId, "coach_rejected",
          "教练资质审核未通过",
          `您的教练档案审核未通过。${input.reason ? "原因：" + input.reason : ""}请完善资料后重新提交。`,
          input.coachId
        );
        // 微信订阅消息通知教练
        const coachUserReject = await db.getUserById(coach.userId);
        if (coachUserReject?.wechatOpenid) {
          wxNotifyCoachRejected({
            openid: coachUserReject.wechatOpenid,
            coachName: coach.displayName,
            reason: input.reason ?? "资质材料不符合要求",
          }).catch(console.error);
        }
        return { success: true };
      }),
    submitForReview: adminProcedure
      .input(z.object({ coachId: z.number() }))
      .mutation(async ({ input }) => {
        // Admin can also manually trigger review submission on behalf of a coach
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { coachProfiles } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await dbInstance.update(coachProfiles)
          .set({ verificationStatus: "pending" })
          .where(eq(coachProfiles.id, input.coachId));
        return { success: true };
      }),

    // ── Content review: approve/reject coach's self-promotion content ──────────
    reviewCoachContent: adminProcedure
      .input(z.object({
        coachId: z.number(),
        status: z.enum(["approved", "rejected"]),
        note: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { coachProfiles } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const [coach] = await dbInstance.select().from(coachProfiles).where(eq(coachProfiles.id, input.coachId)).limit(1);
        if (!coach) throw new TRPCError({ code: "NOT_FOUND" });
        await dbInstance.update(coachProfiles)
          .set({ contentReviewStatus: input.status, contentReviewNote: input.note ?? null })
          .where(eq(coachProfiles.id, input.coachId));
        // Notify the coach
        if (input.status === "approved") {
          await sendNotification(coach.userId, "system",
            "个人主页内容审核通过 ✅",
            "您的个人介绍、社交媒体链接和视频内容已通过审核，现已在教练详情页公开展示。",
            input.coachId
          );
        } else {
          await sendNotification(coach.userId, "system",
            "个人主页内容审核未通过",
            `您的个人主页内容审核未通过。${input.note ? "原因：" + input.note : "请修改后重新提交。"}`,
            input.coachId
          );
        }
        return { success: true };
      }),

    // ── Get coaches pending content review ────────────────────────────────────
    pendingContentReview: adminProcedure.query(async () => {
      const dbInstance = await db.getDb();
      if (!dbInstance) return [];
      const { coachProfiles } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      return dbInstance.select().from(coachProfiles)
        .where(eq(coachProfiles.contentReviewStatus, "pending"))
        .limit(100);
    }),
    allStudents: adminProcedure
      .input(z.object({
        search: z.string().optional(),
        sortBy: z.enum(["createdAt", "totalBookings", "totalSpent", "lastSignedIn"]).optional(),
      }).optional())
      .query(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) return [];
        const { users, bookings } = await import("../drizzle/schema");
        const { eq, and, or, like, sql, desc, asc, ne } = await import("drizzle-orm");
        // Get all users with role=user (students)
        let query = dbInstance.select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          avatar: users.avatar,
          createdAt: users.createdAt,
          lastSignedIn: users.lastSignedIn,
        }).from(users).where(eq(users.role, "user"));
        const rows = await query.limit(500);
        // Get booking stats per student
        const statsRows = await dbInstance.select({
          studentId: bookings.studentId,
          totalBookings: sql<number>`count(*)`,
          completedBookings: sql<number>`sum(case when ${bookings.status} = 'completed' then 1 else 0 end)`,
          totalSpent: sql<number>`sum(case when ${bookings.status} = 'completed' then cast(${bookings.finalAmount} as decimal) else 0 end)`,
          lastBookingDate: sql<string>`max(${bookings.lessonDate})`,
        }).from(bookings).groupBy(bookings.studentId);
        const statsMap = new Map(statsRows.map(s => [s.studentId, s]));
        let result = rows.map(u => ({
          ...u,
          totalBookings: Number(statsMap.get(u.id)?.totalBookings ?? 0),
          completedBookings: Number(statsMap.get(u.id)?.completedBookings ?? 0),
          totalSpent: Number(statsMap.get(u.id)?.totalSpent ?? 0),
          lastBookingDate: statsMap.get(u.id)?.lastBookingDate ?? null,
        }));
        // Search filter
        if (input?.search) {
          const q = input.search.toLowerCase();
          result = result.filter(u =>
            (u.name ?? "").toLowerCase().includes(q) ||
            (u.email ?? "").toLowerCase().includes(q) ||
            (u.phone ?? "").includes(q)
          );
        }
        // Sort
        const sortBy = input?.sortBy ?? "createdAt";
        result.sort((a, b) => {
          if (sortBy === "totalBookings") return b.totalBookings - a.totalBookings;
          if (sortBy === "totalSpent") return b.totalSpent - a.totalSpent;
          if (sortBy === "lastSignedIn") return (b.lastSignedIn ? new Date(b.lastSignedIn).getTime() : 0) - (a.lastSignedIn ? new Date(a.lastSignedIn).getTime() : 0);
          return (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        });
        return result;
      }),

    studentBookings: adminProcedure
      .input(z.object({ studentId: z.number() }))
      .query(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) return [];
        const { bookings, coachProfiles } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const rows = await dbInstance.select({
          id: bookings.id,
          bookingNo: bookings.bookingNo,
          lessonDate: bookings.lessonDate,
          startTime: bookings.startTime,
          endTime: bookings.endTime,
          status: bookings.status,
          finalAmount: bookings.finalAmount,
          coachId: bookings.coachId,
          customVenueName: bookings.customVenueName,
          studentNote: bookings.studentNote,
          createdAt: bookings.createdAt,
          coachName: coachProfiles.displayName,
        })
        .from(bookings)
        .leftJoin(coachProfiles, eq(bookings.coachId, coachProfiles.id))
        .where(eq(bookings.studentId, input.studentId))
        .orderBy(bookings.createdAt)
        .limit(200);
        return rows.reverse();
      }),

    // ─── User Moderation ────────────────────────────────────────────────────
    listUsers: adminProcedure
      .input(z.object({
        search: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        const userList = await db.listUsers(input);
        const total = await db.countUsers(input?.search);
        return { users: userList, total };
      }),

    warnUser: adminProcedure
      .input(z.object({
        userId: z.number(),
        reason: z.string().min(1, "请填写警告原因"),
      }))
      .mutation(async ({ input }) => {
        const user = await db.getUserById(input.userId);
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在" });
        if (user.role === "admin") throw new TRPCError({ code: "FORBIDDEN", message: "不能对管理员执行此操作" });
        const history = (Array.isArray((user as any).warningHistory) ? (user as any).warningHistory : []) as Array<{reason: string; createdAt: string}>;
        history.push({ reason: input.reason, createdAt: new Date().toISOString() });
        const newCount = ((user as any).warningCount ?? 0) + 1;
        await db.updateUserModeration(input.userId, {
          status: "warned",
          warningCount: newCount,
          warningHistory: history,
        });
        // Send in-app notification to user
        await sendNotification(
          input.userId,
          "system",
          "违规警告通知",
          `您的账号因违规行为收到管理员警告（第 ${newCount} 次）。违规原因：${input.reason}。请立即整改，若继续违规将被封号。`,
          undefined
        );
        return { success: true };
      }),

    banUser: adminProcedure
      .input(z.object({
        userId: z.number(),
        reason: z.string().min(1, "请填写封号原因"),
      }))
      .mutation(async ({ input }) => {
        const user = await db.getUserById(input.userId);
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在" });
        if (user.role === "admin") throw new TRPCError({ code: "FORBIDDEN", message: "不能对管理员执行此操作" });
        await db.updateUserModeration(input.userId, {
          status: "banned",
          banReason: input.reason,
        });
        // Send in-app notification
        await sendNotification(
          input.userId,
          "system",
          "账号已被封禁",
          `您的账号因违规行为已被管理员封禁。封禁原因：${input.reason}。如有异议请联系平台客服。`,
          undefined
        );
        return { success: true };
      }),

    unbanUser: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        const user = await db.getUserById(input.userId);
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在" });
        await db.updateUserModeration(input.userId, {
          status: "active",
          banReason: null,
        });
        await sendNotification(
          input.userId,
          "system",
          "账号封禁已解除",
          "您的账号封禁已被管理员解除，现在可以正常使用平台所有功能。",
          undefined
        );
        return { success: true };
      }),

    deleteUser: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        const user = await db.getUserById(input.userId);
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在" });
        if (user.role === "admin") throw new TRPCError({ code: "FORBIDDEN", message: "不能删除管理员账户" });
        await db.deleteUserById(input.userId);
        return { success: true };
      }),

    // ─── Match Management ───────────────────────────────────────────────────
    allMatches: adminProcedure
      .input(z.object({
        status: z.string().optional(),
        search: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }))
      .query(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) return { matches: [], total: 0 };
        const { tennisMatches, users } = await import("../drizzle/schema");
        const { eq: eqOp, gte: gteOp, lte: lteOp, desc: descOp, and: andOp, or: orOp, sql: sqlFn } = await import("drizzle-orm");
        const conditions: any[] = [];
        if (input.status) conditions.push(eqOp(tennisMatches.status, input.status as any));
        if (input.dateFrom) conditions.push(gteOp(tennisMatches.matchDate, input.dateFrom));
        if (input.dateTo) conditions.push(lteOp(tennisMatches.matchDate, input.dateTo));
        if (input.search) {
          const like = `%${input.search}%`;
          conditions.push(orOp(
            sqlFn`${tennisMatches.title} LIKE ${like}`,
            sqlFn`${users.name} LIKE ${like}`,
          ));
        }
        const whereClause = conditions.length > 0 ? andOp(...(conditions as [any, ...any[]])) : undefined;
        const rows = await dbInstance.select({
          id: tennisMatches.id,
          title: tennisMatches.title,
          matchType: tennisMatches.matchType,
          matchDate: tennisMatches.matchDate,
          startTime: tennisMatches.startTime,
          venueName: tennisMatches.venueName,
          status: tennisMatches.status,
          currentParticipants: tennisMatches.currentParticipants,
          maxParticipants: tennisMatches.maxParticipants,
          authorId: tennisMatches.authorId,
          createdAt: tennisMatches.createdAt,
          authorName: users.name,
          authorEmail: users.email,
        }).from(tennisMatches)
          .leftJoin(users, eqOp(tennisMatches.authorId, users.id))
          .where(whereClause)
          .orderBy(descOp(tennisMatches.createdAt));
        const total = rows.length;
        const matches = rows.slice(input.offset, input.offset + input.limit);
        return { matches, total };
      }),

    cancelMatch: adminProcedure
      .input(z.object({
        matchId: z.number(),
        reason: z.string().min(1, "请填写取消原因"),
      }))
      .mutation(async ({ input }) => {
        const match = await db.getTennisMatchById(input.matchId);
        if (!match) throw new TRPCError({ code: "NOT_FOUND", message: "球局不存在" });
        if (match.status === "cancelled") throw new TRPCError({ code: "BAD_REQUEST", message: "球局已取消" });
        await db.updateTennisMatchStatus(input.matchId, "cancelled");
        const participants = await db.getMatchParticipants(input.matchId);
        for (const p of participants) {
          if (p.status === "confirmed") {
            await sendNotification(p.userId, "system", "球局已被取消",
              `您报名的球局「${match.title}」已被管理员取消。原因：${input.reason}`, undefined);
          }
        }
        await sendNotification(match.authorId, "system", "您的球局已被管理员取消",
          `您发布的球局「${match.title}」已被管理员强制取消。原因：${input.reason}`, undefined);
        return { success: true };
      }),

    deleteMatch: adminProcedure
      .input(z.object({ matchId: z.number() }))
      .mutation(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { tennisMatches, matchParticipants } = await import("../drizzle/schema");
        const { eq: eqOp } = await import("drizzle-orm");
        await dbInstance.delete(matchParticipants).where(eqOp(matchParticipants.matchId, input.matchId));
        await dbInstance.delete(tennisMatches).where(eqOp(tennisMatches.id, input.matchId));
        return { success: true };
      }),

    // ─── Permission Management ───────────────────────────────────────────────
    allAdmins: adminProcedure.query(async () => {
      const dbInstance = await db.getDb();
      if (!dbInstance) return [];
      const { users } = await import("../drizzle/schema");
      const { eq: eqOp } = await import("drizzle-orm");
      return dbInstance.select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        avatar: users.avatar,
        openId: users.openId,
        createdAt: users.createdAt,
        lastSignedIn: users.lastSignedIn,
      }).from(users).where(eqOp(users.role, "admin"));
    }),

    grantAdmin: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.openId !== ENV.ownerOpenId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "只有超级管理员可以授权管理员权限" });
        }
        const targetUser = await db.getUserById(input.userId);
        if (!targetUser) throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在" });
        if (targetUser.role === "admin") throw new TRPCError({ code: "BAD_REQUEST", message: "该用户已是管理员" });
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { users } = await import("../drizzle/schema");
        const { eq: eqOp } = await import("drizzle-orm");
        await dbInstance.update(users).set({ role: "admin" }).where(eqOp(users.id, input.userId));
        await sendNotification(input.userId, "system", "您已获得管理员权限",
          "平台超级管理员已授予您管理员权限，您现在可以访问管理后台。", undefined);
        return { success: true };
      }),

    revokeAdmin: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.openId !== ENV.ownerOpenId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "只有超级管理员可以撤销管理员权限" });
        }
        if (ctx.user.id === input.userId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "不能撤销自己的管理员权限" });
        }
        const targetUser = await db.getUserById(input.userId);
        if (!targetUser) throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在" });
        if (targetUser.openId === ENV.ownerOpenId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "不能撤销超级管理员的权限" });
        }
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { users } = await import("../drizzle/schema");
        const { eq: eqOp } = await import("drizzle-orm");
        await dbInstance.update(users).set({ role: "user" }).where(eqOp(users.id, input.userId));
        await sendNotification(input.userId, "system", "管理员权限已被撤销",
          "您的管理员权限已被超级管理员撤销。", undefined);
        return { success: true };
      }),

    searchUsersForAdmin: adminProcedure
      .input(z.object({ query: z.string().min(1) }))
      .query(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) return [];
        const { users } = await import("../drizzle/schema");
        const { or: orOp, sql: sqlFn } = await import("drizzle-orm");
        const like = `%${input.query}%`;
        return dbInstance.select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          avatar: users.avatar,
          role: users.role,
          openId: users.openId,
        }).from(users).where(
          orOp(
            sqlFn`${users.name} LIKE ${like}`,
            sqlFn`${users.email} LIKE ${like}`,
            sqlFn`${users.phone} LIKE ${like}`,
          )
        ).limit(20);
      }),
    seedCoach: adminProcedure.mutation(async ({ ctx }) => {
      // Create a demo coach profile for the admin user
      const existing = await db.getCoachProfileByUserId(ctx.user.id);
      if (existing) return { success: true, message: "已存在" };

      const inviteCode = "TENNIS2024";
      const shareSlug = "coach-zhang-wei";

      await db.createCoachProfile({
        userId: ctx.user.id,
        displayName: "张威教练",
        tagline: "前ATP职业球员 · 12年执教经验 · 深圳顶级私教",
        bio: "曾参加ATP巡回赛，具备丰富的职业比赛经验。执教12年，培养出多名省级冠军学员。擅长技术体系化训练，从基础到高阶全程指导，课程因人而异，精准提升每位学员的竞技水平。",
        yearsExperience: 12,
        certifications: ["ITF国际网球联合会认证教练", "中国网球协会一级教练", "ATP职业球员认证"],
        specialties: ["发球技术", "底线对抗", "网前截击", "青少年培训", "竞技提升"],
        achievements: ["前ATP世界排名前200", "广东省网球冠军", "深圳市最佳教练奖"],
        pricePerHour: "700.00",
        inviteCode,
        shareSlug,
        isVerified: true,
        totalLessons: 856,
        totalStudents: 128,
        avgRating: "4.97",
      });

      const dbInstance = await db.getDb();
      if (dbInstance) {
        const { users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await dbInstance.update(users).set({ role: "coach" }).where(eq(users.id, ctx.user.id));
      }

      return { success: true };
    }),

    // 信用分恢复申请列表
    creditRestoreList: adminProcedure
      .query(async () => {
        return db.getPendingCreditRestoreList();
      }),

    // 审核通过信用分恢复申请
    approveCreditRestore: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        await db.approveCreditRestore(input.userId);
        return { success: true };
      }),
    // ── 管理员手动调整用户信用分（加分/扣分，写日志+通知用户）──
    adjustCredit: adminProcedure
      .input(z.object({
        userId: z.number(),
        delta: z.number().int().min(-100).max(100),
        reason: z.string().min(1).max(200),
      }))
      .mutation(async ({ input }) => {
        const user = await db.getUserById(input.userId);
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在" });
        await db.addCreditLog(input.userId, input.delta, `管理员调整：${input.reason}`);
        const updated = await db.getUserById(input.userId);
        const sign = input.delta >= 0 ? "+" : "";
        await sendNotification(
          input.userId,
          "system",
          "信用分调整通知",
          `管理员调整了您的信用分（${sign}${input.delta}），原因：${input.reason}。当前信用分：${updated?.creditScore ?? "-"}。`,
          undefined
        );
        return { success: true, creditScore: updated?.creditScore ?? null };
      }),
    // ── 全局公告：向用户群发系统通知 ──
    broadcast: adminProcedure
      .input(z.object({
        title: z.string().min(1).max(50),
        content: z.string().min(1).max(1000),
        scope: z.enum(["all", "user", "coach", "admin"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { users: usersTbl } = await import("../drizzle/schema");
        const { eq: eqOp } = await import("drizzle-orm");
        let rows;
        if (input.scope && input.scope !== "all") {
          rows = await dbInstance.select({ id: usersTbl.id }).from(usersTbl).where(eqOp(usersTbl.role, input.scope as any));
        } else {
          rows = await dbInstance.select({ id: usersTbl.id }).from(usersTbl);
        }
        let sent = 0;
        for (const r of rows) {
          try { await sendNotification(r.id, "system", input.title, input.content, undefined); sent++; }
          catch (e) { /* 单个失败不阻断 */ }
        }
        return { success: true, sent };
      }),
    // ── 找场地页预订平台：管理（看全部含下架）──
    listBookingApps: adminProcedure.query(async () => {
      return db.listBookingApps(false);
    }),
    reorderBookingApps: adminProcedure
      .input(z.object({ orders: z.array(z.object({ id: z.number(), sortWeight: z.number() })) }))
      .mutation(async ({ input }) => {
        await db.reorderBookingApps(input.orders);
        return { success: true };
      }),
    toggleBookingApp: adminProcedure
      .input(z.object({ id: z.number(), enabled: z.boolean() }))
      .mutation(async ({ input }) => {
        await db.toggleBookingApp(input.id, input.enabled);
        return { success: true };
      }),
    upsertBookingApp: adminProcedure
      .input(z.object({
        id: z.number().optional(),
        appKey: z.string().min(1).max(64),
        name: z.string().min(1).max(100),
        description: z.string().max(200).optional(),
        appId: z.string().min(1).max(64),
        emoji: z.string().max(16).optional(),
        sortWeight: z.number().optional(),
        enabled: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.upsertBookingApp(input);
        return { success: true, id };
      }),
    deleteBookingApp: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteBookingApp(input.id);
        return { success: true };
      }),
  }),
  // ─── Feedback routes（意见反馈）───────────────────────────────────────────
  feedback: router({
    // 用户提交意见反馈
    submit: protectedProcedure
      .input(z.object({
        content: z.string().min(1).max(1000),
        contact: z.string().max(100).optional(),
        category: z.enum(["suggestion", "bug", "other"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createFeedback({
          userId: ctx.user.id,
          content: input.content,
          contact: input.contact,
          category: input.category,
        });
        return { success: true };
      }),
    // 用户查看自己的反馈与回复
    myList: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getFeedbacksByUser(ctx.user.id);
      }),
    // 管理员查看全部反馈
    adminList: adminProcedure
      .input(z.object({
        status: z.enum(["pending", "replied", "closed"]).optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getAllFeedbacks({ status: input?.status });
      }),
    // 管理员待处理反馈数量
    pendingCount: adminProcedure
      .query(async () => {
        const count = await db.getPendingFeedbackCount();
        return { count };
      }),
    // 管理员回复反馈（并通知用户）
    reply: adminProcedure
      .input(z.object({
        id: z.number(),
        reply: z.string().min(1).max(1000),
      }))
      .mutation(async ({ input }) => {
        const fb = await db.getFeedbackById(input.id);
        if (!fb) throw new TRPCError({ code: "NOT_FOUND", message: "反馈不存在" });
        await db.replyFeedback(input.id, input.reply);
        // 给用户发送系统通知
        await sendNotification(fb.userId, "system", "您的反馈已回复", input.reply, input.id);
        return { success: true };
      }),
  }),
  // ─── Circle routes ───────────────────────────────────────────────────────
  circle: router({
    // 创建圈子
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(2).max(50),
        description: z.string().max(200).optional(),
        joinPolicy: z.enum(["invite_only", "approval", "open"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { circles, circleMembers } = await import("../drizzle/schema");
        // 生成唯一6位邀请码
        let inviteCode = '';
        let tries = 0;
        while (tries < 10) {
          const code = Math.random().toString(36).substring(2, 8).toUpperCase();
          const existing = await dbInstance.select().from(circles).where((await import("drizzle-orm")).eq(circles.inviteCode, code)).limit(1);
          if (existing.length === 0) { inviteCode = code; break; }
          tries++;
        }
        if (!inviteCode) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "生成邀请码失败" });
        const [result] = await dbInstance.insert(circles).values({
          name: input.name,
          description: input.description || null,
          inviteCode,
          ownerId: ctx.user.id,
          maxMembers: 50,
          memberCount: 1,
          isPrivate: (input.joinPolicy || "approval") === "invite_only",
          joinPolicy: input.joinPolicy || "approval",
        });
        const circleId = (result as any).insertId;
        // 创建者自动成为owner成员
        await dbInstance.insert(circleMembers).values({
          circleId,
          userId: ctx.user.id,
          role: 'owner',
        });
        return { success: true, circleId, inviteCode };
      }),

    // 查询我加入的所有圈子
    myCircles: protectedProcedure.query(async ({ ctx }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) return [];
      const { circles, circleMembers, users, tennisMatches } = await import("../drizzle/schema");
      const { eq, inArray, and, gte } = await import("drizzle-orm");
      // 先查我加入的圈子ID
      const myMemberships = await dbInstance.select({ circleId: circleMembers.circleId, role: circleMembers.role })
        .from(circleMembers).where(eq(circleMembers.userId, ctx.user.id));
      if (myMemberships.length === 0) return [];
      const circleIds = myMemberships.map(m => m.circleId);
      const circleList = await dbInstance.select().from(circles).where(inArray(circles.id, circleIds));
      // 查询owner信息
      const ownerIds = Array.from(new Set(circleList.map(c => c.ownerId)));
      const ownerList = await dbInstance.select({ id: users.id, name: users.name, avatar: users.avatar })
        .from(users).where(inArray(users.id, ownerIds));
      const ownerMap = Object.fromEntries(ownerList.map(u => [u.id, u]));
      const roleMap = Object.fromEntries(myMemberships.map(m => [m.circleId, m.role]));
      // 批量查询各圈成员（含头像），用于头像墙与成员数
      const allMembers = await dbInstance.select({
        circleId: circleMembers.circleId,
        userId: circleMembers.userId,
        name: users.name,
        avatar: users.avatar,
      }).from(circleMembers)
        .leftJoin(users, eq(circleMembers.userId, users.id))
        .where(inArray(circleMembers.circleId, circleIds));
      const membersByCircle: Record<number, Array<{ userId: number; name: string | null; avatar: string | null }>> = {};
      for (const m of allMembers) {
        if (!membersByCircle[m.circleId]) membersByCircle[m.circleId] = [];
        membersByCircle[m.circleId].push({ userId: m.userId, name: m.name, avatar: m.avatar });
      }
      // 批量查询各圈活跃球局数（招募中且未过期）
      const activeCountByCircle: Record<number, number> = {};
      try {
        const todayStr = new Date().toISOString().slice(0, 10);
        const matchRows = await dbInstance.select({ circleId: tennisMatches.circleId, status: tennisMatches.status, matchDate: tennisMatches.matchDate })
          .from(tennisMatches)
          .where(and(inArray(tennisMatches.circleId, circleIds), gte(tennisMatches.matchDate, todayStr)));
        for (const r of matchRows) {
          if (r.circleId == null) continue;
          if (r.status && r.status !== 'open') continue;
          activeCountByCircle[r.circleId] = (activeCountByCircle[r.circleId] || 0) + 1;
        }
      } catch (e) { /* 容错：球局表无 circleId 时忽略 */ }
      return circleList.map(c => {
        const members = membersByCircle[c.id] || [];
        return {
          ...c,
          myRole: roleMap[c.id] || 'member',
          owner: ownerMap[c.ownerId] || null,
          memberCount: members.length,
          memberAvatars: members.slice(0, 5).map(m => ({ name: m.name, avatar: m.avatar })),
          activeGames: activeCountByCircle[c.id] || 0,
        };
      });
    }),

    // 通过邀请码预览圈子（小程序使用此名称）
    previewByCode: protectedProcedure
      .input(z.object({ code: z.string().min(4).max(12) }))
      .query(async ({ ctx, input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { circles, circleMembers, users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const [circle] = await dbInstance.select().from(circles)
          .where(eq(circles.inviteCode, input.code.toUpperCase())).limit(1);
        if (!circle) throw new TRPCError({ code: "NOT_FOUND", message: "邀请码无效" });
        const [owner] = await dbInstance.select({ id: users.id, name: users.name, avatar: users.avatar })
          .from(users).where(eq(users.id, circle.ownerId)).limit(1);
        const myMemberships = await dbInstance.select().from(circleMembers)
          .where(eq(circleMembers.userId, ctx.user.id)).limit(50);
        const myMembership = myMemberships.find(m => m.circleId === circle.id);
        const alreadyJoined = !!myMembership;
        // 圈主兜底：即使成员表异常，ownerId 命中也应视为 owner
        const myRole = circle.ownerId === ctx.user.id ? 'owner' : (myMembership ? myMembership.role : 'member');
        return { ...circle, owner: owner || null, alreadyJoined, myRole };
      }),
    // 通过邀请码查询圈子信息（加入前预览）
    getByCode: protectedProcedure
      .input(z.object({ code: z.string().min(4).max(12) }))
      .query(async ({ ctx, input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { circles, circleMembers, users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const [circle] = await dbInstance.select().from(circles)
          .where(eq(circles.inviteCode, input.code.toUpperCase())).limit(1);
        if (!circle) throw new TRPCError({ code: "NOT_FOUND", message: "邀请码无效" });
        const [owner] = await dbInstance.select({ id: users.id, name: users.name, avatar: users.avatar })
          .from(users).where(eq(users.id, circle.ownerId)).limit(1);
        // 检查当前用户是否已加入（精确按 circleId + userId 查询）
        const { and: _and } = await import("drizzle-orm");
        const [myMembership] = await dbInstance.select().from(circleMembers)
          .where(_and(eq(circleMembers.circleId, circle.id), eq(circleMembers.userId, ctx.user.id)))
          .limit(1);
        const alreadyJoined = !!myMembership;
        return { ...circle, owner: owner || null, alreadyJoined };
      }),

    // 通过邀请码加入圈子
    join: protectedProcedure
      .input(z.object({ code: z.string().min(4).max(12) }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { circles, circleMembers } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const [circle] = await dbInstance.select().from(circles)
          .where(eq(circles.inviteCode, input.code.toUpperCase())).limit(1);
        if (!circle) throw new TRPCError({ code: "NOT_FOUND", message: "邀请码无效" });
        // 检查是否已加入
        const existing = await dbInstance.select().from(circleMembers)
          .where(eq(circleMembers.userId, ctx.user.id));
        if (existing.some(m => m.circleId === circle.id)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "您已在该圈子中" });
        }
        if (circle.memberCount >= circle.maxMembers) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "圈子已满" });
        }
        // 邀请码本身即圈主主动分享的凭证，approval 圈子凭邀请码也允许直接加入；
        // 「申请-审核」流程仅用于无邀请码、从发现页申请加入的场景（circle.applyToJoin）。
        await dbInstance.insert(circleMembers).values({
          circleId: circle.id,
          userId: ctx.user.id,
          role: 'member',
        });
        // 更新成员数
        await dbInstance.update(circles)
          .set({ memberCount: circle.memberCount + 1 })
          .where(eq(circles.id, circle.id));
        // 通知圈主：有新成员加入
        try {
          if (circle.ownerId && circle.ownerId !== ctx.user.id) {
            const joiner = await db.getUserById(ctx.user.id);
            await sendNotification(circle.ownerId, "circle_joined", "新成员加入", `${joiner?.name || '有人'} 加入了你的圈子「${circle.name}」`, circle.id);
          }
        } catch (e) { console.warn("circle join notify failed", e); }
        return { success: true, circleId: circle.id, circleName: circle.name };
      }),

    // 退出圈子
    leave: protectedProcedure
      .input(z.object({ circleId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { circles, circleMembers } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        const [circle] = await dbInstance.select().from(circles)
          .where(eq(circles.id, input.circleId)).limit(1);
        if (!circle) throw new TRPCError({ code: "NOT_FOUND", message: "圈子不存在" });
        if (circle.ownerId === ctx.user.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "创建者不能退出圈子，请先转让或解散" });
        }
        await dbInstance.delete(circleMembers)
          .where(and(eq(circleMembers.circleId, input.circleId), eq(circleMembers.userId, ctx.user.id)));
        if (circle.memberCount > 1) {
          await dbInstance.update(circles)
            .set({ memberCount: circle.memberCount - 1 })
            .where(eq(circles.id, input.circleId));
        }
                return { success: true };
      }),

    // 圈内发布公告
    createPost: protectedProcedure
      .input(z.object({
        circleId: z.number(),
        content: z.string().min(1).max(500),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { circleMembers, circlePosts } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        const [member] = await dbInstance.select().from(circleMembers)
          .where(and(eq(circleMembers.circleId, input.circleId), eq(circleMembers.userId, ctx.user.id))).limit(1);
        if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "仅圈内成员可发布公告" });
        const [result] = await dbInstance.insert(circlePosts).values({
          circleId: input.circleId,
          authorId: ctx.user.id,
          content: input.content,
          isPinned: member.role === 'owner' || member.role === 'admin',
        });
        // 圈主/管理员发公告（置顶）→ 通知全体成员
        try {
          if (member.role === 'owner' || member.role === 'admin') {
            const { circles } = await import("../drizzle/schema");
            const [circle] = await dbInstance.select().from(circles).where(eq(circles.id, input.circleId)).limit(1);
            const allMembers = await dbInstance.select().from(circleMembers).where(eq(circleMembers.circleId, input.circleId));
            for (const m of allMembers) {
              if (m.userId === ctx.user.id) continue;
              await sendNotification(m.userId, "circle_announcement", "圈子公告", `圈子「${circle?.name || ''}」发布了新公告：${input.content.slice(0, 30)}`, input.circleId);
            }
          }
        } catch (e) { console.warn("announcement notify failed", e); }
        return { success: true, postId: (result as any).insertId };
      }),

    // 删除圈内动态（作者本人或圈主/管理员）
    deletePost: protectedProcedure
      .input(z.object({ postId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { circleMembers, circlePosts, circlePostComments, circlePostLikes } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const [post] = await dbInstance.select().from(circlePosts).where(eq(circlePosts.id, input.postId)).limit(1);
        if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "动态不存在" });
        // 权限：作者本人，或该圈圈主/管理员
        let canDelete = post.authorId === ctx.user.id;
        if (!canDelete) {
          const { and } = await import("drizzle-orm");
          const [member] = await dbInstance.select().from(circleMembers)
            .where(and(eq(circleMembers.circleId, post.circleId), eq(circleMembers.userId, ctx.user.id))).limit(1);
          canDelete = !!member && (member.role === 'owner' || member.role === 'admin');
        }
        if (!canDelete) throw new TRPCError({ code: "FORBIDDEN", message: "只能删除自己发布的动态" });
        // 连带删除评论与点赞
        try { await dbInstance.delete(circlePostComments).where(eq(circlePostComments.postId, input.postId)); } catch {}
        try { await dbInstance.delete(circlePostLikes).where(eq(circlePostLikes.postId, input.postId)); } catch {}
        await dbInstance.delete(circlePosts).where(eq(circlePosts.id, input.postId));
        return { success: true };
      }),
    // 获取圈内公告列表
    getPosts: protectedProcedure
      .input(z.object({ circleId: z.number() }))
      .query(async ({ ctx, input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { circleMembers, circlePosts, circlePostComments, users } = await import("../drizzle/schema");
        const { eq, and, desc, inArray, sql } = await import("drizzle-orm");
        const [member] = await dbInstance.select().from(circleMembers)
          .where(and(eq(circleMembers.circleId, input.circleId), eq(circleMembers.userId, ctx.user.id))).limit(1);
        if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "仅圈内成员可查看" });
        const posts = await dbInstance.select({
          id: circlePosts.id,
          content: circlePosts.content,
          isPinned: circlePosts.isPinned,
          createdAt: circlePosts.createdAt,
          authorId: circlePosts.authorId,
          authorName: users.name,
          authorAvatar: users.avatar,
        }).from(circlePosts)
          .leftJoin(users, eq(circlePosts.authorId, users.id))
          .where(eq(circlePosts.circleId, input.circleId))
          .orderBy(desc(circlePosts.isPinned), desc(circlePosts.createdAt))
          .limit(50);
        // 统计每条动态的评论数
        const postIds = posts.map(p => p.id);
        let cmtMap = new Map<number, number>();
        if (postIds.length) {
          try {
            const counts = await dbInstance.select({
              postId: circlePostComments.postId,
              count: sql<number>`count(*)`,
            }).from(circlePostComments)
              .where(inArray(circlePostComments.postId, postIds))
              .groupBy(circlePostComments.postId);
            cmtMap = new Map(counts.map(c => [c.postId, Number(c.count)]));
          } catch {}
        }
        return posts.map(p => ({ ...p, commentCount: cmtMap.get(p.id) || 0 }));
      }),

    // 圈内排行榜（按参与球局数量排名）
    leaderboard: protectedProcedure
      .input(z.object({ circleId: z.number() }))
      .query(async ({ ctx, input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { circleMembers, tennisMatches, matchParticipants, users } = await import("../drizzle/schema");
        const { eq, and, sql } = await import("drizzle-orm");
        const [member] = await dbInstance.select().from(circleMembers)
          .where(and(eq(circleMembers.circleId, input.circleId), eq(circleMembers.userId, ctx.user.id))).limit(1);
        if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "仅圈内成员可查看" });
        const members = await dbInstance.select({
          userId: circleMembers.userId,
          role: circleMembers.role,
          joinedAt: circleMembers.joinedAt,
          name: users.name,
          avatar: users.avatar,
        }).from(circleMembers)
          .leftJoin(users, eq(circleMembers.userId, users.id))
          .where(eq(circleMembers.circleId, input.circleId));
        let matchCounts: { userId: number; count: number }[] = [];
        try {
          matchCounts = await dbInstance.select({
            userId: matchParticipants.userId,
            count: sql<number>`count(*)`,
          }).from(matchParticipants)
            .innerJoin(tennisMatches, eq(matchParticipants.matchId, tennisMatches.id))
            .where(eq(tennisMatches.circleId, input.circleId))
            .groupBy(matchParticipants.userId);
        } catch {
          // circleId 字段不存在时降级，排行榜 matchCount 全为 0
        }
        const countMap = new Map(matchCounts.map(r => [r.userId, Number(r.count)]));
        return members.map(m => ({
          ...m,
          matchCount: countMap.get(m.userId) || 0,
        })).sort((a, b) => b.matchCount - a.matchCount);
      }),

    // 获取圈内球局列表
    getMatches: protectedProcedure
      .input(z.object({ circleId: z.number() }))
      .query(async ({ ctx, input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { circleMembers, tennisMatches, users } = await import("../drizzle/schema");
        const { eq, and, desc, ne } = await import("drizzle-orm");
        const [member] = await dbInstance.select().from(circleMembers)
          .where(and(eq(circleMembers.circleId, input.circleId), eq(circleMembers.userId, ctx.user.id))).limit(1);
        if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "仅圈内成员可查看" });
        let matches: any[] = [];
        try {
          matches = await dbInstance.select({
            id: tennisMatches.id,
            title: tennisMatches.title,
            matchDate: tennisMatches.matchDate,
            startTime: tennisMatches.startTime,
            venueName: tennisMatches.venueName,
            levelRequired: tennisMatches.levelRequired,
            maxParticipants: tennisMatches.maxParticipants,
            currentParticipants: tennisMatches.currentParticipants,
            status: tennisMatches.status,
            imageUrl: tennisMatches.imageUrl,
            authorId: tennisMatches.authorId,
            authorName: users.name,
            authorAvatar: users.avatar,
          }).from(tennisMatches)
            .leftJoin(users, eq(tennisMatches.authorId, users.id))
            .where(and(eq(tennisMatches.circleId, input.circleId), ne(tennisMatches.status, "cancelled" as any)))
            .orderBy(desc(tennisMatches.createdAt))
            .limit(30);
        } catch {
          // circleId 字段不存在时降级，返回空列表
          matches = [];
        }
        return matches;
      }),

    // 点赞动态
    likePost: protectedProcedure
      .input(z.object({ postId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { circlePostLikes } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        const existing = await dbInstance.select().from(circlePostLikes)
          .where(and(eq(circlePostLikes.postId, input.postId), eq(circlePostLikes.userId, ctx.user.id))).limit(1);
        if (existing.length > 0) {
          await dbInstance.delete(circlePostLikes)
            .where(and(eq(circlePostLikes.postId, input.postId), eq(circlePostLikes.userId, ctx.user.id)));
          return { liked: false };
        }
        await dbInstance.insert(circlePostLikes).values({ postId: input.postId, userId: ctx.user.id });
        // 通知动态作者（不给自己发）
        try {
          const { circlePosts } = await import("../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          const [post] = await dbInstance.select().from(circlePosts).where(eq(circlePosts.id, input.postId)).limit(1);
          if (post && post.authorId !== ctx.user.id) {
            await sendNotification(post.authorId, "post_liked", "动态被点赞", `${ctx.user.name || '有人'} 点赞了你的动态`, input.postId);
          }
        } catch (e) { console.warn("like notify failed", e); }
        return { liked: true };
      }),

    // 获取动态评论列表
    getComments: protectedProcedure
      .input(z.object({ postId: z.number() }))
      .query(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { circlePostComments, users } = await import("../drizzle/schema");
        const { eq, asc } = await import("drizzle-orm");
        const comments = await dbInstance.select({
          id: circlePostComments.id,
          postId: circlePostComments.postId,
          parentId: circlePostComments.parentId,
          content: circlePostComments.content,
          createdAt: circlePostComments.createdAt,
          authorId: circlePostComments.authorId,
          authorName: users.name,
          authorAvatar: users.avatar,
        }).from(circlePostComments)
          .leftJoin(users, eq(circlePostComments.authorId, users.id))
          .where(eq(circlePostComments.postId, input.postId))
          .orderBy(asc(circlePostComments.createdAt))
          .limit(200);
        return comments;
      }),

    // 发表评论/回复
    createComment: protectedProcedure
      .input(z.object({
        postId: z.number(),
        circleId: z.number(),
        content: z.string().min(1).max(500),
        parentId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { circleMembers, circlePosts, circlePostComments } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        const [member] = await dbInstance.select().from(circleMembers)
          .where(and(eq(circleMembers.circleId, input.circleId), eq(circleMembers.userId, ctx.user.id))).limit(1);
        if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "仅圈内成员可评论" });
        const [result] = await dbInstance.insert(circlePostComments).values({
          postId: input.postId,
          circleId: input.circleId,
          authorId: ctx.user.id,
          content: input.content,
          parentId: input.parentId ?? null,
        } as any);
        // 通知：回复了某条评论 → 通知父评论作者；否则通知动态作者
        try {
          if (input.parentId) {
            const [parent] = await dbInstance.select().from(circlePostComments).where(eq(circlePostComments.id, input.parentId)).limit(1);
            if (parent && parent.authorId !== ctx.user.id) {
              await sendNotification(parent.authorId, "comment_replied", "评论被回复", `${ctx.user.name || '有人'} 回复了你：${input.content.slice(0, 30)}`, input.postId);
            }
          } else {
            const [post] = await dbInstance.select().from(circlePosts).where(eq(circlePosts.id, input.postId)).limit(1);
            if (post && post.authorId !== ctx.user.id) {
              await sendNotification(post.authorId, "post_commented", "动态被评论", `${ctx.user.name || '有人'} 评论了你的动态：${input.content.slice(0, 30)}`, input.postId);
            }
          }
        } catch (e) { console.warn("comment notify failed", e); }
        return { success: true, commentId: (result as any).insertId };
      }),
    // 打卡
    checkin: protectedProcedure
      .input(z.object({
        circleId: z.number(),
        content: z.string().max(200).optional(),
        trainingMinutes: z.number().min(0).max(600).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { circleMembers, circleCheckins } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        const [member] = await dbInstance.select().from(circleMembers)
          .where(and(eq(circleMembers.circleId, input.circleId), eq(circleMembers.userId, ctx.user.id))).limit(1);
        if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "仅圈内成员可打卡" });
        const today = new Date().toISOString().split('T')[0];
        const existing = await dbInstance.select().from(circleCheckins)
          .where(and(eq(circleCheckins.circleId, input.circleId), eq(circleCheckins.userId, ctx.user.id), eq(circleCheckins.checkinDate, today))).limit(1);
        if (existing.length > 0) throw new TRPCError({ code: "BAD_REQUEST", message: "今日已打卡" });
        await dbInstance.insert(circleCheckins).values({
          circleId: input.circleId,
          userId: ctx.user.id,
          content: input.content || null,
          trainingMinutes: input.trainingMinutes || 0,
          checkinDate: today,
        });

        // 自动在圈子动态流发布一条打卡动态
        try {
          const { circlePosts, users } = await import("../drizzle/schema");
          const [userRow] = await dbInstance.select({ name: users.name })
            .from(users).where(eq(users.id, ctx.user.id)).limit(1);
          const userName = userRow?.name || '球友';
          const minutesLabel = input.trainingMinutes ? `　⏱ ${input.trainingMinutes}分钟` : '';
          const contentLabel = input.content ? `\n“${input.content}”` : '';
          const postContent = `🎾 ${userName} 完成了今日打卡！${minutesLabel}${contentLabel}`;
          await dbInstance.insert(circlePosts).values({
            circleId: input.circleId,
            authorId: ctx.user.id,
            content: postContent,
            isPinned: false,
          });
        } catch (e) {
          console.warn('[checkin] 自动发布动态失败', e);
        }

        return { success: true };
      }),
    // 获取圈内打卡列表
    getCheckins: protectedProcedure
      .input(z.object({ circleId: z.number(), limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) return [];
        const { circleCheckins, users } = await import("../drizzle/schema");
        const { eq, desc } = await import("drizzle-orm");
        const rows = await dbInstance.select({
          id: circleCheckins.id,
          userId: circleCheckins.userId,
          content: circleCheckins.content,
          trainingMinutes: circleCheckins.trainingMinutes,
          checkinDate: circleCheckins.checkinDate,
          createdAt: circleCheckins.createdAt,
          userName: users.name,
          userAvatar: users.avatar,
        }).from(circleCheckins)
          .leftJoin(users, eq(circleCheckins.userId, users.id))
          .where(eq(circleCheckins.circleId, input.circleId))
          .orderBy(desc(circleCheckins.createdAt))
          .limit(input.limit);
        const today = new Date().toISOString().split('T')[0];
        const myCheckinToday = rows.some(r => r.userId === ctx.user.id && r.checkinDate === today);
        return { items: rows, myCheckinToday };
      }),
    // 创建圈内活动
    createActivity: protectedProcedure
      .input(z.object({
        circleId: z.number(),
        title: z.string().min(2).max(100),
        description: z.string().max(500).optional(),
        activityDate: z.string(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        venueName: z.string().max(100).optional(),
        maxParticipants: z.number().min(2).max(200).default(20),
        repeatWeeks: z.number().min(0).max(8).default(0), // 0=不重复, 1-8=重复周数
        feeMode: z.enum(["free", "aa"]).default("free"), // free=纯免费, aa=赛后AA平摊
      }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { circleMembers, circleActivities, notifications, circles, users } = await import("../drizzle/schema");
        const { eq, and, ne } = await import("drizzle-orm");

        // 验证是圈内成员
        const [member] = await dbInstance.select().from(circleMembers)
          .where(and(eq(circleMembers.circleId, input.circleId), eq(circleMembers.userId, ctx.user.id))).limit(1);
        if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "仅圈内成员可发起活动" });

        // 获取圈子名称和发起人名称
        const [circleRow] = await dbInstance.select({ name: circles.name }).from(circles)
          .where(eq(circles.id, input.circleId)).limit(1);
        const [creatorRow] = await dbInstance.select({ name: users.name }).from(users)
          .where(eq(users.id, ctx.user.id)).limit(1);
        const circleName = circleRow?.name ?? "圈子";
        const creatorName = creatorRow?.name ?? "球友";

        // 计算要创建的活动日期列表（包含本次 + repeatWeeks 次）
        const dates: string[] = [input.activityDate];
        if (input.repeatWeeks > 0) {
          const base = new Date(input.activityDate + "T00:00:00");
          for (let w = 1; w <= input.repeatWeeks; w++) {
            const next = new Date(base.getTime() + w * 7 * 24 * 60 * 60 * 1000);
            dates.push(next.toISOString().slice(0, 10));
          }
        }

        // 插入第一个活动（父活动）
        const [firstResult] = await dbInstance.insert(circleActivities).values({
          circleId: input.circleId,
          creatorId: ctx.user.id,
          title: input.title,
          description: input.description || null,
          activityDate: dates[0],
          startTime: input.startTime || null,
          endTime: input.endTime || null,
          venueName: input.venueName || null,
          maxParticipants: input.maxParticipants,
          repeatWeeks: input.repeatWeeks,
          feeMode: input.feeMode,
          seriesId: null,
        });
        const parentId = (firstResult as any).insertId as number;

        // 插入后续周期活动（seriesId 指向父活动）
        for (let i = 1; i < dates.length; i++) {
          await dbInstance.insert(circleActivities).values({
            circleId: input.circleId,
            creatorId: ctx.user.id,
            title: input.title,
            description: input.description || null,
            activityDate: dates[i],
            startTime: input.startTime || null,
            endTime: input.endTime || null,
            venueName: input.venueName || null,
            maxParticipants: input.maxParticipants,
            repeatWeeks: 0,
            feeMode: input.feeMode,
            seriesId: parentId,
          });
        }

        // 批量向圈内所有其他成员发送通知
        const allMembers = await dbInstance.select({ userId: circleMembers.userId })
          .from(circleMembers)
          .where(and(eq(circleMembers.circleId, input.circleId), ne(circleMembers.userId, ctx.user.id)));

        const dateLabel = dates.length > 1
          ? `${dates[0]} 起，共 ${dates.length} 周`
          : dates[0];
        const timeLabel = input.startTime
          ? (input.endTime ? ` ${input.startTime}-${input.endTime}` : ` ${input.startTime}`)
          : "";
        const venueLabel = input.venueName ? `　📍 ${input.venueName}` : "";

        if (allMembers.length > 0) {
          const notifValues = allMembers.map(m => ({
            userId: m.userId,
            type: "circle_activity" as const,
            title: `【${circleName}】新活动：${input.title}`,
            content: `${creatorName} 发起了一个活动。📅 ${dateLabel}${timeLabel}${venueLabel}，快去报名！`,
            relatedId: parentId,
          }));
          await dbInstance.insert(notifications).values(notifValues as any);
        }

        return { success: true, activityId: parentId, totalCreated: dates.length };
      }),
    // 获取圈内活动列表
    getActivities: protectedProcedure
      .input(z.object({ circleId: z.number() }))
      .query(async ({ ctx, input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) return [];
        const { circleActivities, circleActivitySignups, users } = await import("../drizzle/schema");
        const { eq, desc } = await import("drizzle-orm");
        const activities = await dbInstance.select({
          id: circleActivities.id,
          title: circleActivities.title,
          description: circleActivities.description,
          activityDate: circleActivities.activityDate,
          startTime: circleActivities.startTime,
          endTime: circleActivities.endTime,
          venueName: circleActivities.venueName,
          maxParticipants: circleActivities.maxParticipants,
          currentParticipants: circleActivities.currentParticipants,
          status: circleActivities.status,
          feeMode: circleActivities.feeMode,
          settleStatus: circleActivities.settleStatus,
          totalCost: circleActivities.totalCost,
          creatorId: circleActivities.creatorId,
          createdAt: circleActivities.createdAt,
          creatorName: users.name,
          creatorAvatar: users.avatar,
        }).from(circleActivities)
          .leftJoin(users, eq(circleActivities.creatorId, users.id))
          .where(eq(circleActivities.circleId, input.circleId))
          .orderBy(desc(circleActivities.activityDate))
          .limit(20);
        const mySignups = await dbInstance.select({ activityId: circleActivitySignups.activityId })
          .from(circleActivitySignups).where(eq(circleActivitySignups.userId, ctx.user.id));
        const mySignupSet = new Set(mySignups.map(s => s.activityId));

        // 批量获取所有活动的报名头像（最多5个/活动）
        const activityIds = activities.map(a => a.id);
        let signupAvatarMap: Record<number, { avatar: string | null; name: string | null }[]> = {};
        if (activityIds.length > 0) {
          const { inArray } = await import("drizzle-orm");
          const allSignups = await dbInstance.select({
            activityId: circleActivitySignups.activityId,
            avatar: users.avatar,
            name: users.name,
          }).from(circleActivitySignups)
            .leftJoin(users, eq(circleActivitySignups.userId, users.id))
            .where(inArray(circleActivitySignups.activityId, activityIds))
            .orderBy(circleActivitySignups.createdAt);
          for (const s of allSignups) {
            if (!signupAvatarMap[s.activityId]) signupAvatarMap[s.activityId] = [];
            if (signupAvatarMap[s.activityId].length < 5) {
              signupAvatarMap[s.activityId].push({ avatar: s.avatar, name: s.name });
            }
          }
        }

        return activities.map(a => ({
          ...a,
          isSigned: mySignupSet.has(a.id),
          signupAvatars: signupAvatarMap[a.id] || [],
        }));
      }),
    // 报名/取消报名活动
    signupActivity: protectedProcedure
      .input(z.object({ activityId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { circleActivities, circleActivitySignups } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        const [activity] = await dbInstance.select().from(circleActivities)
          .where(eq(circleActivities.id, input.activityId)).limit(1);
        if (!activity) throw new TRPCError({ code: "NOT_FOUND" });
        const existing = await dbInstance.select().from(circleActivitySignups)
          .where(and(eq(circleActivitySignups.activityId, input.activityId), eq(circleActivitySignups.userId, ctx.user.id))).limit(1);
        if (existing.length > 0) {
          await dbInstance.delete(circleActivitySignups)
            .where(and(eq(circleActivitySignups.activityId, input.activityId), eq(circleActivitySignups.userId, ctx.user.id)));
          await dbInstance.update(circleActivities)
            .set({ currentParticipants: Math.max(0, (activity.currentParticipants ?? 0) - 1) })
            .where(eq(circleActivities.id, input.activityId));
          return { signed: false };
        }
        const curCount = activity.currentParticipants ?? 0;
        if (curCount >= (activity.maxParticipants || 20)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "活动人数已满" });
        }
        await dbInstance.insert(circleActivitySignups).values({ activityId: input.activityId, userId: ctx.user.id });
        await dbInstance.update(circleActivities)
          .set({ currentParticipants: curCount + 1 })
          .where(eq(circleActivities.id, input.activityId));
        return { signed: true };
      }),
    cancelActivity: protectedProcedure
      .input(z.object({ activityId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { circleActivities, circleActivitySignups } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const [activity] = await dbInstance.select().from(circleActivities)
          .where(eq(circleActivities.id, input.activityId)).limit(1);
        if (!activity) throw new TRPCError({ code: "NOT_FOUND", message: "活动不存在" });
        if (activity.creatorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "仅发起人可取消活动" });
        if (activity.settleStatus === "settled") throw new TRPCError({ code: "BAD_REQUEST", message: "已结算完成的活动无法取消" });
        if (activity.status === "cancelled") throw new TRPCError({ code: "BAD_REQUEST", message: "该活动已取消" });
        // 清除所有报名记录
        await dbInstance.delete(circleActivitySignups)
          .where(eq(circleActivitySignups.activityId, input.activityId));
        // 将活动状态设为 cancelled
        await dbInstance.update(circleActivities).set({
          status: "cancelled",
          currentParticipants: 0,
        }).where(eq(circleActivities.id, input.activityId));
        return { success: true };
      }),
    // 圈内发布球局并推送短信通知给圈内成员
    notifyMembers: protectedProcedure
      .input(z.object({ circleId: z.number(), matchId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { circles, circleMembers, tennisMatches, users } = await import("../drizzle/schema");
        const { eq, and, ne } = await import("drizzle-orm");
        const [member] = await dbInstance.select().from(circleMembers)
          .where(and(eq(circleMembers.circleId, input.circleId), eq(circleMembers.userId, ctx.user.id))).limit(1);
        if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "仅圈内成员可操作" });
        const [match] = await dbInstance.select().from(tennisMatches)
          .where(eq(tennisMatches.id, input.matchId)).limit(1);
        if (!match) throw new TRPCError({ code: "NOT_FOUND" });
        // 确保 circleOnly 和 feeRequired 字段存在，即使数据库中没有，也默认为 false
        const safeMatch = { ...match, circleOnly: (match as any).circleOnly ?? false, feeRequired: (match as any).feeRequired ?? false };
        const [circle] = await dbInstance.select().from(circles)
          .where(eq(circles.id, input.circleId)).limit(1);
        const members = await dbInstance.select({
          userId: circleMembers.userId,
          phone: users.phone,
          name: users.name,
          wechatOpenid: users.wechatOpenid,
        }).from(circleMembers)
          .leftJoin(users, eq(circleMembers.userId, users.id))
          .where(and(eq(circleMembers.circleId, input.circleId), ne(circleMembers.userId, ctx.user.id)));
        let notified = 0;
        for (const m of members) {
          if (!m.wechatOpenid) continue;
          try {
            const ok = await wxNotifyCircleMatch({
              openid: m.wechatOpenid,
              circleName: circle?.name || '圈子',
              matchDate: match.matchDate,
              startTime: match.startTime,
              venueName: match.venueName,
            });
            if (ok) notified++;
          } catch (e) {
            console.error('[circle.notifyMembers] 微信通知失败', m.userId, e);
          }
        }
        return { success: true, notified, total: members.length };
      }),

    // 获取圈内成员列表（圈主/管理员可用）
    getMembers: protectedProcedure
      .input(z.object({ circleId: z.number() }))
      .query(async ({ ctx, input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) return [];
        const { circleMembers, circles, users } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        // 验证是圈内成员
        const [me] = await dbInstance.select().from(circleMembers)
          .where(and(eq(circleMembers.circleId, input.circleId), eq(circleMembers.userId, ctx.user.id))).limit(1);
        if (!me) throw new TRPCError({ code: "FORBIDDEN", message: "仅圈内成员可查看" });
        const rows = await dbInstance.select({
          memberId: circleMembers.id,
          userId: circleMembers.userId,
          role: circleMembers.role,
          joinedAt: circleMembers.joinedAt,
          name: users.name,
          avatar: users.avatar,
          phone: users.phone,
        }).from(circleMembers)
          .leftJoin(users, eq(circleMembers.userId, users.id))
          .where(eq(circleMembers.circleId, input.circleId));
        return rows.map(r => ({ ...r, isMe: r.userId === ctx.user.id }));
      }),

    // 踢出成员（圈主或管理员可操作）
    kickMember: protectedProcedure
      .input(z.object({ circleId: z.number(), targetUserId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { circles, circleMembers } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        // 验证操作者是圈主或管理员
        const [me] = await dbInstance.select().from(circleMembers)
          .where(and(eq(circleMembers.circleId, input.circleId), eq(circleMembers.userId, ctx.user.id))).limit(1);
        if (!me || (me.role !== 'owner' && me.role !== 'admin')) {
          throw new TRPCError({ code: "FORBIDDEN", message: "仅圈主或管理员可踢出成员" });
        }
        if (input.targetUserId === ctx.user.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "不能踢出自己" });
        }
        // 不能踢出圈主
        const [circle] = await dbInstance.select().from(circles)
          .where(eq(circles.id, input.circleId)).limit(1);
        if (circle?.ownerId === input.targetUserId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "不能踢出圈主" });
        }
        // 管理员不能踢出其他管理员
        const [target] = await dbInstance.select().from(circleMembers)
          .where(and(eq(circleMembers.circleId, input.circleId), eq(circleMembers.userId, input.targetUserId))).limit(1);
        if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "该成员不在圈内" });
        if (me.role === 'admin' && target.role === 'admin') {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理员不能踢出其他管理员" });
        }
        await dbInstance.delete(circleMembers)
          .where(and(eq(circleMembers.circleId, input.circleId), eq(circleMembers.userId, input.targetUserId)));
        // 更新成员数
        if (circle && circle.memberCount > 1) {
          await dbInstance.update(circles)
            .set({ memberCount: circle.memberCount - 1 })
            .where(eq(circles.id, input.circleId));
        }
        return { success: true };
      }),

    // 转让圈主权限（仅圈主可操作）
    transferOwner: protectedProcedure
      .input(z.object({ circleId: z.number(), targetUserId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { circles, circleMembers } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        // 验证操作者是圈主
        const [circle] = await dbInstance.select().from(circles)
          .where(eq(circles.id, input.circleId)).limit(1);
        if (!circle) throw new TRPCError({ code: "NOT_FOUND", message: "圈子不存在" });
        if (circle.ownerId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "仅圈主可转让权限" });
        }
        // 验证目标用户在圈内
        const [target] = await dbInstance.select().from(circleMembers)
          .where(and(eq(circleMembers.circleId, input.circleId), eq(circleMembers.userId, input.targetUserId))).limit(1);
        if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "该成员不在圈内" });
        // 更新 circles.ownerId
        await dbInstance.update(circles)
          .set({ ownerId: input.targetUserId })
          .where(eq(circles.id, input.circleId));
        // 新圈主设为 owner
        await dbInstance.update(circleMembers)
          .set({ role: 'owner' })
          .where(and(eq(circleMembers.circleId, input.circleId), eq(circleMembers.userId, input.targetUserId)));
        // 原圈主降为 member
        await dbInstance.update(circleMembers)
          .set({ role: 'member' })
          .where(and(eq(circleMembers.circleId, input.circleId), eq(circleMembers.userId, ctx.user.id)));
        return { success: true };
      }),

    // 圈主修改入圈策略 / 简介
    updateSettings: protectedProcedure
      .input(z.object({
        circleId: z.number(),
        joinPolicy: z.enum(["invite_only", "approval", "open"]).optional(),
        description: z.string().max(200).optional(),
        avatar: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { circles, circleMembers } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        const [me] = await dbInstance.select().from(circleMembers)
          .where(and(eq(circleMembers.circleId, input.circleId), eq(circleMembers.userId, ctx.user.id))).limit(1);
        if (!me || (me.role !== 'owner' && me.role !== 'admin')) {
          throw new TRPCError({ code: "FORBIDDEN", message: "仅圈主/管理员可修改设置" });
        }
        const patch: any = {};
        if (input.joinPolicy) { patch.joinPolicy = input.joinPolicy; patch.isPrivate = input.joinPolicy === "invite_only"; }
        if (input.description !== undefined) patch.description = input.description || null;
        if (input.avatar !== undefined) patch.avatar = input.avatar || null;
        if (Object.keys(patch).length > 0) {
          await dbInstance.update(circles).set(patch).where(eq(circles.id, input.circleId));
        }
        return { success: true };
      }),

    // 发现公开圈子（approval / open，可搜索）
    discover: protectedProcedure
      .input(z.object({ keyword: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) return [];
        const { circles, circleMembers, circleJoinRequests, users } = await import("../drizzle/schema");
        const { inArray, like, and, or, eq, ne } = await import("drizzle-orm");
        // 只展示非私密的圈子
        let rows = await dbInstance.select().from(circles)
          .where(or(eq(circles.joinPolicy, "approval"), eq(circles.joinPolicy, "open")))
          .limit(100);
        const kw = (input && input.keyword || "").trim();
        if (kw) rows = rows.filter(c => (c.name || "").includes(kw) || (c.description || "").includes(kw));
        // 我已加入的圈
        const myMems = await dbInstance.select({ circleId: circleMembers.circleId })
          .from(circleMembers).where(eq(circleMembers.userId, ctx.user.id));
        const joinedSet = new Set(myMems.map(m => m.circleId));
        // 我已提交且待审的申请
        const myReqs = await dbInstance.select({ circleId: circleJoinRequests.circleId, status: circleJoinRequests.status })
          .from(circleJoinRequests).where(and(eq(circleJoinRequests.userId, ctx.user.id), eq(circleJoinRequests.status, "pending")));
        const pendingSet = new Set(myReqs.map(r => r.circleId));
        // owner 信息
        const ownerIds = Array.from(new Set(rows.map(c => c.ownerId)));
        let ownerMap: Record<number, any> = {};
        if (ownerIds.length) {
          const owners = await dbInstance.select({ id: users.id, name: users.name, avatar: users.avatar })
            .from(users).where(inArray(users.id, ownerIds));
          ownerMap = Object.fromEntries(owners.map(u => [u.id, u]));
        }
        return rows.map(c => ({
          ...c,
          owner: ownerMap[c.ownerId] || null,
          alreadyJoined: joinedSet.has(c.id),
          requestPending: pendingSet.has(c.id),
        })).sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0));
      }),

    // 申请加入圈子（approval 策略）
    applyToJoin: protectedProcedure
      .input(z.object({ circleId: z.number(), message: z.string().max(200).optional() }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { circles, circleMembers, circleJoinRequests, notifications } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        const [circle] = await dbInstance.select().from(circles).where(eq(circles.id, input.circleId)).limit(1);
        if (!circle) throw new TRPCError({ code: "NOT_FOUND", message: "圈子不存在" });
        // 已是成员
        const mem = await dbInstance.select().from(circleMembers)
          .where(and(eq(circleMembers.circleId, input.circleId), eq(circleMembers.userId, ctx.user.id))).limit(1);
        if (mem.length > 0) throw new TRPCError({ code: "BAD_REQUEST", message: "您已在该圈子中" });
        if ((circle as any).joinPolicy === "open") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "该圈子可直接加入，无需申请" });
        }
        if ((circle as any).joinPolicy === "invite_only") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "该圈子仅凭邀请码加入" });
        }
        if (circle.memberCount >= circle.maxMembers) throw new TRPCError({ code: "BAD_REQUEST", message: "圈子已满" });
        // 已有待审申请
        const exist = await dbInstance.select().from(circleJoinRequests)
          .where(and(eq(circleJoinRequests.circleId, input.circleId), eq(circleJoinRequests.userId, ctx.user.id), eq(circleJoinRequests.status, "pending"))).limit(1);
        if (exist.length > 0) throw new TRPCError({ code: "BAD_REQUEST", message: "申请已提交，请等待审核" });
        await dbInstance.insert(circleJoinRequests).values({
          circleId: input.circleId,
          userId: ctx.user.id,
          message: input.message || null,
          status: "pending",
        });
        // 通知圈主
        try {
          await dbInstance.insert(notifications).values({
            userId: circle.ownerId,
            type: "circle_activity" as any,
            title: `【${circle.name}】有新的入圈申请`,
            content: `${ctx.user.name || '一位球友'} 申请加入你的圈子，请去审核。`,
            relatedId: input.circleId,
          } as any);
        } catch (e) { console.error('[circle.applyToJoin] notify owner failed', e); }
        return { success: true };
      }),

    // 我的入圈申请状态
    myJoinRequests: protectedProcedure.query(async ({ ctx }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) return [];
      const { circleJoinRequests } = await import("../drizzle/schema");
      const { eq, desc } = await import("drizzle-orm");
      return await dbInstance.select().from(circleJoinRequests)
        .where(eq(circleJoinRequests.userId, ctx.user.id))
        .orderBy(desc(circleJoinRequests.createdAt)).limit(50);
    }),

    // 圈主查看待审核申请列表
    listJoinRequests: protectedProcedure
      .input(z.object({ circleId: z.number() }))
      .query(async ({ ctx, input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) return [];
        const { circleMembers, circleJoinRequests, users } = await import("../drizzle/schema");
        const { eq, and, desc } = await import("drizzle-orm");
        const [me] = await dbInstance.select().from(circleMembers)
          .where(and(eq(circleMembers.circleId, input.circleId), eq(circleMembers.userId, ctx.user.id))).limit(1);
        if (!me || (me.role !== 'owner' && me.role !== 'admin')) {
          throw new TRPCError({ code: "FORBIDDEN", message: "仅圈主/管理员可查看" });
        }
        return await dbInstance.select({
          id: circleJoinRequests.id,
          userId: circleJoinRequests.userId,
          message: circleJoinRequests.message,
          status: circleJoinRequests.status,
          createdAt: circleJoinRequests.createdAt,
          name: users.name,
          avatar: users.avatar,
          gender: users.gender,
          ntrpLevel: users.ntrpLevel,
        }).from(circleJoinRequests)
          .leftJoin(users, eq(circleJoinRequests.userId, users.id))
          .where(and(eq(circleJoinRequests.circleId, input.circleId), eq(circleJoinRequests.status, "pending")))
          .orderBy(desc(circleJoinRequests.createdAt)).limit(50);
      }),

    // 圈主审核（通过/拒绝）
    reviewJoinRequest: protectedProcedure
      .input(z.object({ requestId: z.number(), approve: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { circles, circleMembers, circleJoinRequests, notifications } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        const [req] = await dbInstance.select().from(circleJoinRequests).where(eq(circleJoinRequests.id, input.requestId)).limit(1);
        if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "申请不存在" });
        if (req.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "该申请已处理" });
        const [me] = await dbInstance.select().from(circleMembers)
          .where(and(eq(circleMembers.circleId, req.circleId), eq(circleMembers.userId, ctx.user.id))).limit(1);
        if (!me || (me.role !== 'owner' && me.role !== 'admin')) {
          throw new TRPCError({ code: "FORBIDDEN", message: "仅圈主/管理员可审核" });
        }
        const [circle] = await dbInstance.select().from(circles).where(eq(circles.id, req.circleId)).limit(1);
        if (!circle) throw new TRPCError({ code: "NOT_FOUND" });
        if (input.approve) {
          // 再次确认未加入 & 未满
          const mem = await dbInstance.select().from(circleMembers)
            .where(and(eq(circleMembers.circleId, req.circleId), eq(circleMembers.userId, req.userId))).limit(1);
          if (mem.length === 0) {
            if (circle.memberCount >= circle.maxMembers) throw new TRPCError({ code: "BAD_REQUEST", message: "圈子已满" });
            await dbInstance.insert(circleMembers).values({ circleId: req.circleId, userId: req.userId, role: 'member' });
            await dbInstance.update(circles).set({ memberCount: circle.memberCount + 1 }).where(eq(circles.id, req.circleId));
          }
          await dbInstance.update(circleJoinRequests).set({ status: "approved", reviewedBy: ctx.user.id }).where(eq(circleJoinRequests.id, input.requestId));
        } else {
          await dbInstance.update(circleJoinRequests).set({ status: "rejected", reviewedBy: ctx.user.id }).where(eq(circleJoinRequests.id, input.requestId));
        }
        // 通知申请人
        try {
          await dbInstance.insert(notifications).values({
            userId: req.userId,
            type: "circle_activity" as any,
            title: input.approve ? `【${circle.name}】已通过你的入圈申请` : `【${circle.name}】未通过你的入圈申请`,
            content: input.approve ? `欢迎加入圈子，快去看看圈内球局吧！` : `很遗憾，本次申请未通过。`,
            relatedId: req.circleId,
          } as any);
        } catch (e) { console.error('[circle.reviewJoinRequest] notify failed', e); }
        return { success: true, approved: input.approve };
      }),

    // 待审核申请计数（圈主红点用）
    pendingRequestCount: protectedProcedure
      .input(z.object({ circleId: z.number() }))
      .query(async ({ ctx, input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) return { count: 0 };
        const { circleMembers, circleJoinRequests } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        const [me] = await dbInstance.select().from(circleMembers)
          .where(and(eq(circleMembers.circleId, input.circleId), eq(circleMembers.userId, ctx.user.id))).limit(1);
        if (!me || (me.role !== 'owner' && me.role !== 'admin')) return { count: 0 };
        const rows = await dbInstance.select().from(circleJoinRequests)
          .where(and(eq(circleJoinRequests.circleId, input.circleId), eq(circleJoinRequests.status, "pending")));
        return { count: rows.length };
      }),

    // ═══════════════════════════════════════════════════════════════
    // 圈子完善：活动模板 / 解散圈子 / 赛后AA平摊结算（路线一，新增）
    // ═══════════════════════════════════════════════════════════════

    // ── 活动模板：列表 ──
    getTemplates: protectedProcedure
      .input(z.object({ circleId: z.number() }))
      .query(async ({ ctx, input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) return [];
        const { activityTemplates, circleMembers } = await import("../drizzle/schema");
        const { eq, and, desc } = await import("drizzle-orm");
        const [me] = await dbInstance.select().from(circleMembers)
          .where(and(eq(circleMembers.circleId, input.circleId), eq(circleMembers.userId, ctx.user.id))).limit(1);
        if (!me) return [];
        return await dbInstance.select().from(activityTemplates)
          .where(eq(activityTemplates.circleId, input.circleId))
          .orderBy(desc(activityTemplates.createdAt));
      }),

    // ── 活动模板：创建（仅圈主/管理员）──
    createTemplate: protectedProcedure
      .input(z.object({
        circleId: z.number(),
        title: z.string().min(2).max(100),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        venueName: z.string().max(100).optional(),
        maxParticipants: z.number().min(2).max(200).default(20),
        feeMode: z.enum(["free", "aa"]).default("free"),
        description: z.string().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { circleMembers, activityTemplates } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        const [me] = await dbInstance.select().from(circleMembers)
          .where(and(eq(circleMembers.circleId, input.circleId), eq(circleMembers.userId, ctx.user.id))).limit(1);
        if (!me || (me.role !== 'owner' && me.role !== 'admin')) {
          throw new TRPCError({ code: "FORBIDDEN", message: "仅圈主或管理员可创建模板" });
        }
        const [result] = await dbInstance.insert(activityTemplates).values({
          circleId: input.circleId,
          title: input.title,
          startTime: input.startTime || null,
          endTime: input.endTime || null,
          venueName: input.venueName || null,
          maxParticipants: input.maxParticipants,
          feeMode: input.feeMode,
          description: input.description || null,
        });
        return { success: true, templateId: (result as any).insertId };
      }),

    // ── 活动模板：删除（仅圈主/管理员）──
    deleteTemplate: protectedProcedure
      .input(z.object({ templateId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { activityTemplates, circleMembers } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        const [tpl] = await dbInstance.select().from(activityTemplates)
          .where(eq(activityTemplates.id, input.templateId)).limit(1);
        if (!tpl) throw new TRPCError({ code: "NOT_FOUND" });
        const [me] = await dbInstance.select().from(circleMembers)
          .where(and(eq(circleMembers.circleId, tpl.circleId), eq(circleMembers.userId, ctx.user.id))).limit(1);
        if (!me || (me.role !== 'owner' && me.role !== 'admin')) {
          throw new TRPCError({ code: "FORBIDDEN", message: "仅圈主或管理员可删除模板" });
        }
        await dbInstance.delete(activityTemplates).where(eq(activityTemplates.id, input.templateId));
        return { success: true };
      }),

    // ── 解散圈子（仅圈主，物理删除全部关联数据）──
    dismissCircle: protectedProcedure
      .input(z.object({ circleId: z.number(), confirmName: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { circles, circleMembers, circlePosts, circlePostLikes, circlePostComments, circleActivities, circleActivitySignups,
          activityTemplates, circleCheckins, circleJoinRequests } = await import("../drizzle/schema");
        const { eq, inArray } = await import("drizzle-orm");
        const [circle] = await dbInstance.select().from(circles)
          .where(eq(circles.id, input.circleId)).limit(1);
        if (!circle) throw new TRPCError({ code: "NOT_FOUND", message: "圈子不存在" });
        if (circle.ownerId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "仅圈主可解散圈子" });
        }
        if ((circle.name || "").trim() !== (input.confirmName || "").trim()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "圈子名称不匹配，解散失败" });
        }
        // 物理删除：活动报名→活动→模板→动态→签到→入圈申请→成员→圈子本身
        const activities = await dbInstance.select({ id: circleActivities.id }).from(circleActivities)
          .where(eq(circleActivities.circleId, input.circleId));
        if (activities.length > 0) {
          await dbInstance.delete(circleActivitySignups)
            .where(inArray(circleActivitySignups.activityId, activities.map(a => a.id)));
        }
        await dbInstance.delete(circleActivities).where(eq(circleActivities.circleId, input.circleId));
        await dbInstance.delete(activityTemplates).where(eq(activityTemplates.circleId, input.circleId));
        // 先清理帖子的点赞与评论，再删帖子
        const posts = await dbInstance.select({ id: circlePosts.id }).from(circlePosts)
          .where(eq(circlePosts.circleId, input.circleId));
        if (posts.length > 0) {
          const postIds = posts.map(p => p.id);
          await dbInstance.delete(circlePostLikes).where(inArray(circlePostLikes.postId, postIds));
          await dbInstance.delete(circlePostComments).where(inArray(circlePostComments.postId, postIds));
        }
        await dbInstance.delete(circlePosts).where(eq(circlePosts.circleId, input.circleId));
        await dbInstance.delete(circleCheckins).where(eq(circleCheckins.circleId, input.circleId));
        await dbInstance.delete(circleJoinRequests).where(eq(circleJoinRequests.circleId, input.circleId));
        await dbInstance.delete(circleMembers).where(eq(circleMembers.circleId, input.circleId));
        await dbInstance.delete(circles).where(eq(circles.id, input.circleId));
        return { success: true };
      }),

    // ── 赛后结算：发起人填实际总开销+到场名单，系统按到场人数平摊生成账单（方案A：默认全员到场）──
    settleActivity: protectedProcedure
      .input(z.object({
        activityId: z.number(),
        totalCost: z.number().min(0),               // 实际总开销（元）
        absentUserIds: z.array(z.number()).default([]), // 未到场成员（从默认全员到场中剔除）
      }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { circleActivities, circleActivitySignups } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        const [activity] = await dbInstance.select().from(circleActivities)
          .where(eq(circleActivities.id, input.activityId)).limit(1);
        if (!activity) throw new TRPCError({ code: "NOT_FOUND", message: "活动不存在" });
        if (activity.creatorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "仅发起人可结算" });
        if (activity.feeMode !== "aa") throw new TRPCError({ code: "BAD_REQUEST", message: "该活动为免费活动，无需结算" });
        if (activity.settleStatus === "settled") throw new TRPCError({ code: "BAD_REQUEST", message: "该活动已结算完成" });
        // 取全部报名成员
        const signups = await dbInstance.select().from(circleActivitySignups)
          .where(eq(circleActivitySignups.activityId, input.activityId));
        if (signups.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "无人报名，无需结算" });
        const absentSet = new Set(input.absentUserIds);
        const attendees = signups.filter(s => !absentSet.has(s.userId));
        if (attendees.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "到场人数为 0，无法结算" });
        const totalFen = Math.round(input.totalCost * 100);
        // 平摊：向上取整到分，最后一人兜底差额，保证合计=总额
        const baseShare = Math.floor(totalFen / attendees.length);
        let remainder = totalFen - baseShare * attendees.length;
        // 写入每位报名成员的结算结果
        for (const s of signups) {
          const isAbsent = absentSet.has(s.userId);
          if (isAbsent) {
            await dbInstance.update(circleActivitySignups).set({
              attended: false, shareAmount: 0, payStatus: "none",
            }).where(and(eq(circleActivitySignups.activityId, input.activityId), eq(circleActivitySignups.userId, s.userId)));
          } else {
            // 发起人自己那份不需要向自己收款，标记为已结清
            const isCreator = s.userId === ctx.user.id;
            let share = baseShare;
            if (remainder > 0) { share += 1; remainder -= 1; }
            await dbInstance.update(circleActivitySignups).set({
              attended: true,
              shareAmount: share,
              payStatus: isCreator ? "paid" : "unpaid",
              paidAt: isCreator ? new Date() : null,
            }).where(and(eq(circleActivitySignups.activityId, input.activityId), eq(circleActivitySignups.userId, s.userId)));
            if (!isCreator) {
              await sendNotification(s.userId, "system", "活动费用待支付",
                `「${activity.title}」已结算，您应分摊 ¥${(share / 100).toFixed(2)}，请在小程序内支付给发起人。`, input.activityId);
            }
          }
        }
        await dbInstance.update(circleActivities).set({
          totalCost: totalFen,
          settleStatus: "settling",
          status: "completed",
        }).where(eq(circleActivities.id, input.activityId));
        const attendeeCount = attendees.length;
        return { success: true, attendeeCount, perPerson: Math.round(totalFen / attendeeCount) / 100, totalCost: input.totalCost };
      }),

    // ── 查看某活动的结算/账单（已付未付清单）──
    getActivitySettlement: protectedProcedure
      .input(z.object({ activityId: z.number() }))
      .query(async ({ ctx, input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) return null;
        const { circleActivities, circleActivitySignups, users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const [activity] = await dbInstance.select().from(circleActivities)
          .where(eq(circleActivities.id, input.activityId)).limit(1);
        if (!activity) return null;
        const rows = await dbInstance.select({
          userId: circleActivitySignups.userId,
          attended: circleActivitySignups.attended,
          shareAmount: circleActivitySignups.shareAmount,
          payStatus: circleActivitySignups.payStatus,
          name: users.name,
          avatar: users.avatar,
        }).from(circleActivitySignups)
          .leftJoin(users, eq(circleActivitySignups.userId, users.id))
          .where(eq(circleActivitySignups.activityId, input.activityId));
        const paidCount = rows.filter(r => r.payStatus === "paid").length;
        const unpaidCount = rows.filter(r => r.payStatus === "unpaid").length;
        return {
          activityId: activity.id,
          title: activity.title,
          feeMode: activity.feeMode,
          totalCost: activity.totalCost,
          settleStatus: activity.settleStatus,
          creatorId: activity.creatorId,
          isCreator: activity.creatorId === ctx.user.id,
          paidCount, unpaidCount,
          bills: rows.map(r => ({ ...r, isMe: r.userId === ctx.user.id })),
        };
      }),

    // ── 成员支付自己那份AA费用（微信支付下单，收款后由发起人结清打款）──
    payActivityShare: protectedProcedure
      .input(z.object({ activityId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { circleActivities, circleActivitySignups, matchOrders } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        const [activity] = await dbInstance.select().from(circleActivities)
          .where(eq(circleActivities.id, input.activityId)).limit(1);
        if (!activity) throw new TRPCError({ code: "NOT_FOUND", message: "活动不存在" });
        const [signup] = await dbInstance.select().from(circleActivitySignups)
          .where(and(eq(circleActivitySignups.activityId, input.activityId), eq(circleActivitySignups.userId, ctx.user.id))).limit(1);
        if (!signup) throw new TRPCError({ code: "BAD_REQUEST", message: "您未报名该活动" });
        if (signup.payStatus === "paid") throw new TRPCError({ code: "BAD_REQUEST", message: "您已支付，请勿重复支付" });
        if (signup.payStatus !== "unpaid" || signup.shareAmount <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "暂无待支付费用" });
        const userRecord = await db.getUserById(ctx.user.id);
        const openid = userRecord?.wechatOpenid;
        if (!openid && isWxpayConfigured()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "未绑定微信账号，无法发起支付" });
        }
        const orderId = generateOrderId();
        const amountFen = signup.shareAmount;
        // 复用 matchOrders 表记录订单（matchId 存活动ID的负值以区分，避免污染球局订单）
        await dbInstance.insert(matchOrders).values({
          orderId,
          matchId: -input.activityId,
          userId: ctx.user.id,
          amount: String((amountFen / 100).toFixed(2)),
          status: "pending",
        });
        await dbInstance.update(circleActivitySignups).set({ orderId })
          .where(and(eq(circleActivitySignups.activityId, input.activityId), eq(circleActivitySignups.userId, ctx.user.id)));
        let prepay;
        try {
          prepay = await createPrepay({
            orderId,
            description: `圈子活动AA-${activity.title}`,
            amountFen,
            openid: openid || "mock_openid",
          });
        } catch (prepayErr: any) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `微信支付预下单失败: ${prepayErr.message}` });
        }
        if (prepay.prepayId) {
          await dbInstance.update(matchOrders).set({ wxPrepayId: prepay.prepayId }).where(eq(matchOrders.orderId, orderId));
        }
        return { orderId, ...prepay, isMockMode: !isWxpayConfigured() };
      }),

    // ── 成员AA支付成功确认（Mock模式前端调用；生产由微信回调统一处理）──
    confirmActivityPayment: protectedProcedure
      .input(z.object({ orderId: z.string(), activityId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (isWxpayConfigured()) {
          throw new TRPCError({ code: "FORBIDDEN", message: "生产环境支付由微信回调处理" });
        }
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { circleActivities, circleActivitySignups, matchOrders } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        await dbInstance.update(matchOrders).set({ status: "paid", paidAt: new Date() })
          .where(eq(matchOrders.orderId, input.orderId));
        await dbInstance.update(circleActivitySignups).set({ payStatus: "paid", paidAt: new Date() })
          .where(and(eq(circleActivitySignups.activityId, input.activityId), eq(circleActivitySignups.userId, ctx.user.id)));
        // 若全部到场成员均已支付，则把活动标记为已结算
        const remaining = await dbInstance.select().from(circleActivitySignups)
          .where(and(eq(circleActivitySignups.activityId, input.activityId), eq(circleActivitySignups.payStatus, "unpaid")));
        if (remaining.length === 0) {
          await dbInstance.update(circleActivities).set({ settleStatus: "settled", settledAt: new Date() })
            .where(eq(circleActivities.id, input.activityId));
        }
        return { success: true, allPaid: remaining.length === 0 };
      }),
  }),
  coachPortal: router({
    // 教练工作台统计数据
    stats: coachProcedure.query(async ({ ctx }) => {
      const profile = await db.getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "教练档案不存在" });
      const stats = await db.getCoachStats(profile.id);
      const earnings = await db.getCoachEarnings(profile.id);
      // 今日预约数
      const dbInstance = await db.getDb();
      const { bookings } = await import("../drizzle/schema");
      const { eq, and, gte, lte } = await import("drizzle-orm");
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(todayStart.getTime() + 86400000);
      const todayBookings = dbInstance ? await dbInstance.select().from(bookings).where(
        and(eq(bookings.coachId, profile.id), gte(bookings.lessonDate, todayStart.toISOString().split('T')[0]), lte(bookings.lessonDate, todayEnd.toISOString().split('T')[0]))
      ) : [];
      return {
        todayBookings: todayBookings.length,
        monthIncome: earnings.total || 0,
        totalStudents: stats.totalStudents || 0,
        pendingBookings: 0,
        totalLessons: stats.totalLessons || 0,
      };
    }),
    // 今日排课
    todaySchedule: coachProcedure.query(async ({ ctx }) => {
      const profile = await db.getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "教练档案不存在" });
      const dbInstance = await db.getDb();
      if (!dbInstance) return { items: [] };
      const { bookings, users, venues } = await import("../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      const today = new Date().toISOString().split('T')[0];
      const todayBookings = await dbInstance.select().from(bookings)
        .where(and(eq(bookings.coachId, profile.id), eq(bookings.lessonDate, today)))
        .orderBy(bookings.startTime);
      const enriched = await Promise.all(todayBookings.map(async (b) => {
        const student = await db.getUserById(b.studentId);
        const venue = b.venueId ? await db.getVenueById(b.venueId) : null;
        return { ...b, student, venue };
      }));
      return { items: enriched };
    }),
    // 按日期查预约
    bookingsByDate: coachProcedure
      .input(z.object({ date: z.string() }))
      .query(async ({ ctx, input }) => {
        const profile = await db.getCoachProfileByUserId(ctx.user.id);
        if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "教练档案不存在" });
        const dbInstance = await db.getDb();
        if (!dbInstance) return { items: [] };
        const { bookings } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        const dayBookings = await dbInstance.select().from(bookings)
          .where(and(eq(bookings.coachId, profile.id), eq(bookings.lessonDate, input.date)))
          .orderBy(bookings.startTime);
        const enriched = await Promise.all(dayBookings.map(async (b) => {
          const student = await db.getUserById(b.studentId);
          const venue = b.venueId ? await db.getVenueById(b.venueId) : null;
          return { ...b, student, venue };
        }));
        return { items: enriched };
      }),
    // 确认预约
    confirmBooking: coachProcedure
      .input(z.object({ bookingId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getCoachProfileByUserId(ctx.user.id);
        if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "教练档案不存在" });
        const booking = await db.getBookingById(input.bookingId);
        if (!booking || booking.coachId !== profile.id) throw new TRPCError({ code: "FORBIDDEN" });
        await db.updateBookingStatus(input.bookingId, "confirmed");
        return { success: true };
      }),
    // 添加可用时段（小程序传 date 字段，自动计算 dayOfWeek）
    addAvailableSlot: coachProcedure
      .input(z.object({
        date: z.string().optional(),         // YYYY-MM-DD（小程序传此字段）
        startTime: z.string(),
        endTime: z.string(),
        venueId: z.number().optional(),
        specificDate: z.string().optional(), // 兼容旧调用
        dayOfWeek: z.number().min(0).max(6).optional(), // 兼容旧调用
      }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getCoachProfileByUserId(ctx.user.id);
        if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "教练档案不存在" });
        const specificDate = input.date || input.specificDate;
        const dayOfWeek = input.dayOfWeek ?? (specificDate ? new Date(specificDate + 'T00:00:00').getDay() : 0);
        await db.addCoachWeeklySlot(profile.id, dayOfWeek, input.startTime, input.endTime, specificDate);
        return { success: true };
      }),
    // 查询某日已添加的可用时段
    getSlotsByDate: coachProcedure
      .input(z.object({ date: z.string() }))
      .query(async ({ ctx, input }) => {
        const profile = await db.getCoachProfileByUserId(ctx.user.id);
        if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "教练档案不存在" });
        const dbInstance = await db.getDb();
        if (!dbInstance) return { items: [] };
        const { coachAvailability } = await import("../drizzle/schema");
        const { eq, and, or } = await import("drizzle-orm");
        const dow = new Date(input.date + 'T00:00:00').getDay();
        const slots = await dbInstance.select().from(coachAvailability)
          .where(and(
            eq(coachAvailability.coachId, profile.id),
            eq(coachAvailability.isAvailable, true),
            or(
              eq(coachAvailability.specificDate, input.date),
              and(eq(coachAvailability.dayOfWeek, dow))
            )
          ))
          .orderBy(coachAvailability.startTime);
        return { items: slots };
      }),
    // 删除可用时段
    removeSlot: coachProcedure
      .input(z.object({ slotId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getCoachProfileByUserId(ctx.user.id);
        if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "教练档案不存在" });
        await db.removeCoachWeeklySlot(profile.id, input.slotId);
        return { success: true };
      }),
    // 月收入统计
    incomeByMonth: coachProcedure
      .input(z.object({ month: z.string() }))
      .query(async ({ ctx, input }) => {
        const profile = await db.getCoachProfileByUserId(ctx.user.id);
        if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "教练档案不存在" });
        const dbInstance = await db.getDb();
        if (!dbInstance) return { total: 0, lessons: 0, items: [] };
        const { bookings, payments } = await import("../drizzle/schema");
        const { eq, and, like } = await import("drizzle-orm");
        const monthBookings = await dbInstance.select().from(bookings)
          .where(and(eq(bookings.coachId, profile.id), eq(bookings.status, "completed"), like(bookings.lessonDate, `${input.month}%`)));
        const enriched = await Promise.all(monthBookings.map(async (b) => {
          const student = await db.getUserById(b.studentId);
          const payment = await db.getPaymentByBookingId(b.id);
          return { ...b, student, amount: payment?.coachEarnings || b.finalAmount };
        }));
        const total = enriched.reduce((s, b) => s + parseFloat(b.amount || '0'), 0);
        return { total, lessons: enriched.length, items: enriched };
      }),
  }),

  // ─── Partner Venue Router（合作场馆 + 空场时段）────────────────────────────
  partnerVenue: router({
    // 获取所有上线合作场馆列表
    list: publicProcedure.query(async () => {
      const { partnerVenues } = await import("../drizzle/schema");
      const { eq, desc } = await import("drizzle-orm");
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      return dbInstance.select().from(partnerVenues)
        .where(eq(partnerVenues.isActive, true))
        .orderBy(desc(partnerVenues.sortOrder));
    }),

    // 获取单个场馆详情
    detail: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const { partnerVenues } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const rows = await dbInstance.select().from(partnerVenues).where(eq(partnerVenues.id, input.id));
        if (!rows.length) throw new TRPCError({ code: "NOT_FOUND", message: "场馆不存在" });
        return rows[0];
      }),

    // 获取场馆空场时段（按日期）
    slots: publicProcedure
      .input(z.object({ venueId: z.number(), date: z.string().optional() }))
      .query(async ({ input }) => {
        const { venueAvailableSlots } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const today = new Date().toISOString().split('T')[0];
        const targetDate = input.date || today;
        return dbInstance.select().from(venueAvailableSlots)
          .where(and(
            eq(venueAvailableSlots.venueId, input.venueId),
            eq(venueAvailableSlots.slotDate, targetDate),
            eq(venueAvailableSlots.isBooked, false)
          ))
          .orderBy(venueAvailableSlots.startTime);
      }),

    // 获取首页展示：各场馆今日/明日空场数量摘要
    todaySummary: publicProcedure.query(async () => {
      const { partnerVenues, venueAvailableSlots } = await import("../drizzle/schema");
      const { eq, and, sql } = await import("drizzle-orm");
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const venues = await dbInstance.select().from(partnerVenues)
        .where(eq(partnerVenues.isActive, true))
        .orderBy(sql`${partnerVenues.sortOrder} desc`);
      const result = await Promise.all(venues.map(async (v: typeof partnerVenues.$inferSelect) => {
        const todaySlots = await dbInstance.select().from(venueAvailableSlots)
          .where(and(eq(venueAvailableSlots.venueId, v.id), eq(venueAvailableSlots.slotDate, today), eq(venueAvailableSlots.isBooked, false)));
        const tomorrowSlots = await dbInstance.select().from(venueAvailableSlots)
          .where(and(eq(venueAvailableSlots.venueId, v.id), eq(venueAvailableSlots.slotDate, tomorrow), eq(venueAvailableSlots.isBooked, false)));
        return { ...v, todayCount: todaySlots.length, tomorrowCount: tomorrowSlots.length, todaySlots: todaySlots.slice(0, 3) };
      }));
      return result;
    }),

    // 管理员：新增场馆
    adminCreate: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        address: z.string().optional(),
        district: z.string().optional(),
        phone: z.string().optional(),
        imageUrl: z.string().optional(),
        bookingUrl: z.string().optional(),
        description: z.string().optional(),
        courtCount: z.number().default(0),
        priceRange: z.string().optional(),
        amenities: z.array(z.string()).default([]),
        sortOrder: z.number().default(0),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const { partnerVenues } = await import("../drizzle/schema");
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        await dbInstance.insert(partnerVenues).values({ ...input, isActive: true });
        return { success: true };
      }),

    // 管理员：更新场馆
    adminUpdate: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        address: z.string().optional(),
        district: z.string().optional(),
        phone: z.string().optional(),
        imageUrl: z.string().optional(),
        bookingUrl: z.string().optional(),
        description: z.string().optional(),
        courtCount: z.number().optional(),
        priceRange: z.string().optional(),
        amenities: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const { partnerVenues } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { id, ...data } = input;
        await dbInstance.update(partnerVenues).set(data).where(eq(partnerVenues.id, id));
        return { success: true };
      }),

    // 管理员/场馆方：添加空场时段
    addSlot: protectedProcedure
      .input(z.object({
        venueId: z.number(),
        slotDate: z.string(),
        startTime: z.string(),
        endTime: z.string(),
        courtName: z.string().optional(),
        courtType: z.enum(['hard', 'clay', 'grass', 'indoor']).optional(),
        price: z.number().optional(),
        remark: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const { venueAvailableSlots } = await import("../drizzle/schema");
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        await dbInstance.insert(venueAvailableSlots).values({
          ...input,
          price: input.price ? String(input.price) : undefined,
          isBooked: false,
        });
        return { success: true };
      }),

    // 管理员：批量添加空场时段
    addSlotsBatch: protectedProcedure
      .input(z.object({
        venueId: z.number(),
        slotDate: z.string(),
        slots: z.array(z.object({
          startTime: z.string(),
          endTime: z.string(),
          courtName: z.string().optional(),
          courtType: z.enum(['hard', 'clay', 'grass', 'indoor']).optional(),
          price: z.number().optional(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const { venueAvailableSlots } = await import("../drizzle/schema");
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const rows = input.slots.map(s => ({
          venueId: input.venueId,
          slotDate: input.slotDate,
          startTime: s.startTime,
          endTime: s.endTime,
          courtName: s.courtName,
          courtType: s.courtType || 'hard' as const,
          price: s.price ? String(s.price) : undefined,
          isBooked: false,
        }));
        if (rows.length > 0) await dbInstance.insert(venueAvailableSlots).values(rows);
        return { success: true, count: rows.length };
      }),

    // 管理员：删除空场时段
    deleteSlot: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const { venueAvailableSlots } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        await dbInstance.delete(venueAvailableSlots).where(eq(venueAvailableSlots.id, input.id));
        return { success: true };
      }),
  }),
});
export type AppRouter = typeof appRouter;

// v1.5.34 — 活动取消功能部署触发

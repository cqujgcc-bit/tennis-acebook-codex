import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { sdk } from "./sdk";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  // 微信支付回调路由使用 express.raw 保存原始请求体，必须在 express.json 之前注册
  app.use("/api/wxpay/notify", express.raw({ type: "application/json", limit: "1mb" }));
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // ── File upload endpoint ────────────────────────────────────────────────────
  app.post("/api/upload", async (req, res) => {
    try {
      // Parse multipart form data using built-in busboy
      const busboy = (await import("busboy")).default;
      const bb = busboy({ headers: req.headers, limits: { fileSize: 10 * 1024 * 1024 } });
      let fileBuffer: Buffer | null = null;
      let mimeType = "application/octet-stream";
      let fileName = "upload";

      bb.on("file", (_name: string, file: NodeJS.ReadableStream, info: { filename: string; mimeType: string }) => {
        mimeType = info.mimeType || "application/octet-stream";
        fileName = info.filename || "upload";
        const chunks: Buffer[] = [];
        file.on("data", (chunk: Buffer) => chunks.push(chunk));
        file.on("end", () => { fileBuffer = Buffer.concat(chunks); });
      });

      bb.on("finish", async () => {
        try {
          if (!fileBuffer) return res.status(400).json({ error: "No file" });
          const { storagePut } = await import("../storage");
          const ext = fileName.split(".").pop() ?? "bin";
          const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { url, key: storedKey } = await storagePut(key, fileBuffer, mimeType);
          // url is a relative path like /manus-storage/xxx
          // Return it as-is; clients should prepend their own origin if needed
          res.json({ url, key: storedKey });
        } catch (err: any) {
          res.status(500).json({ error: err.message });
        }
      });

      req.pipe(bb);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Scheduled: lesson reminders (24h before) ──────────────────────────────
  app.post("/api/scheduled/lesson-reminders", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron) return res.status(403).json({ error: "cron-only" });

      const { getDb } = await import("../db");
      const { bookings, notifications } = await import("../../drizzle/schema");
      const { and, eq, gte, lte } = await import("drizzle-orm");

      const db = await getDb();
      if (!db) return res.json({ ok: true, skipped: "no-db" });

      // Find bookings starting in 20-28 hours (to avoid duplicate reminders)
      const now = new Date();
      const in20h = new Date(now.getTime() + 20 * 60 * 60 * 1000);
      const in28h = new Date(now.getTime() + 28 * 60 * 60 * 1000);

      const tomorrow20 = in20h.toISOString().split("T")[0];
      const tomorrow28 = in28h.toISOString().split("T")[0];

      const upcomingBookings = await db
        .select()
        .from(bookings)
        .where(
          and(
            eq(bookings.status, "confirmed"),
            gte(bookings.lessonDate, tomorrow20),
            lte(bookings.lessonDate, tomorrow28)
          )
        );

      let reminded = 0;
      for (const booking of upcomingBookings) {
        // Notify student
        await db.insert(notifications).values({
          userId: booking.studentId,
          type: "lesson_reminder",
          title: "上课提醒 ⏰",
          content: `明天 ${booking.lessonDate} ${booking.startTime}-${booking.endTime} 您有一节网球课，请准时到场！`,
          relatedId: booking.id,
        } as any);
        // Notify coach
        await db.insert(notifications).values({
          userId: booking.coachId,
          type: "lesson_reminder",
          title: "上课提醒 ⏰",
          content: `明天 ${booking.lessonDate} ${booking.startTime}-${booking.endTime} 您有一节课程，请做好准备。`,
          relatedId: booking.id,
        } as any);
        reminded++;
      }

      res.json({ ok: true, reminded });
    } catch (err: any) {
      res.status(500).json({ error: err.message, stack: err.stack, timestamp: new Date().toISOString() });
    }
  });

  // ── Scheduled: circle activity reminders (3 days before) ──────────────────
  // 圈内活动提前3天提醒：扫描距开始正好3天且未报名的成员，发送站内提醒
  app.post("/api/scheduled/circle-activity-reminders", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron) return res.status(403).json({ error: "cron-only" });

      const { getDb } = await import("../db");
      const { circleActivities, circleActivitySignups, circleMembers, circles, notifications } = await import("../../drizzle/schema");
      const { and, eq, inArray, ne } = await import("drizzle-orm");

      const db = await getDb();
      if (!db) return res.json({ ok: true, skipped: "no-db" });

      // 计算“3天后”的日期（YYYY-MM-DD，东八区）
      const now = new Date();
      const target = new Date(now.getTime() + (3 * 24 + 8) * 60 * 60 * 1000); // +8h 保证取东八区当天
      const targetDate = target.toISOString().split("T")[0];

      // 找出活动日期正好是目标日、且状态未取消/未完成的活动
      const activities = await db.select().from(circleActivities)
        .where(and(eq(circleActivities.activityDate, targetDate), inArray(circleActivities.status, ["open", "full"])));

      let reminded = 0;
      for (const act of activities) {
        const [circleRow] = await db.select({ name: circles.name }).from(circles).where(eq(circles.id, act.circleId)).limit(1);
        const circleName = circleRow?.name ?? "圈子";
        // 圈内全部成员
        const members = await db.select({ userId: circleMembers.userId }).from(circleMembers).where(eq(circleMembers.circleId, act.circleId));
        // 已报名成员
        const signups = await db.select({ userId: circleActivitySignups.userId }).from(circleActivitySignups).where(eq(circleActivitySignups.activityId, act.id));
        const signedSet = new Set(signups.map(s => s.userId));
        const timeLabel = act.startTime ? ` ${act.startTime}${act.endTime ? "-" + act.endTime : ""}` : "";
        const venueLabel = act.venueName ? `，📍${act.venueName}` : "";
        for (const m of members) {
          if (signedSet.has(m.userId)) continue; // 已报名的不重复提醒
          await db.insert(notifications).values({
            userId: m.userId,
            type: "circle_activity",
            title: `【${circleName}】活动提醒 ⏰`,
            content: `「${act.title}」将于3天后（${act.activityDate}${timeLabel}）举行${venueLabel}，还没报名哦，快去抢名额！`,
            relatedId: act.id,
          } as any);
          reminded++;
        }
      }
      res.json({ ok: true, activities: activities.length, reminded });
    } catch (err: any) {
      res.status(500).json({ error: err.message, stack: err.stack, timestamp: new Date().toISOString() });
    }
  });

  // ── Scheduled: cleanup expired reserved slots ──────────────────────────────
  app.post("/api/scheduled/cleanup-expired-slots", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron) return res.status(403).json({ error: "cron-only" });

      const { getDb } = await import("../db");
      const { coachAvailability } = await import("../../drizzle/schema");
      const { and, eq, lt } = await import("drizzle-orm");

      const db = await getDb();
      if (!db) return res.json({ ok: true, skipped: "no-db" });

      // Delete reserved slots whose date is before today
      const today = new Date().toISOString().slice(0, 10);
      const result = await db.delete(coachAvailability).where(
        and(
          lt(coachAvailability.specificDate, today),
          eq(coachAvailability.isAvailable, true)
        )
      );

      const deleted = (result as any)?.rowsAffected ?? 0;
      console.log(`[cleanup-expired-slots] Deleted ${deleted} expired reserved slots before ${today}`);
      res.json({ ok: true, deleted, before: today });
    } catch (err: any) {
      res.status(500).json({ error: err.message, stack: err.stack, timestamp: new Date().toISOString() });
    }
  });

  // ── Scheduled: close expired tennis matches ──────────────────────────────
  app.post("/api/scheduled/close-expired-matches", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron) return res.status(403).json({ error: "cron-only" });

      const { getDb } = await import("../db");
      const { tennisMatches } = await import("../../drizzle/schema");
      const { and, eq, lt, or, sql } = await import("drizzle-orm");

      const db = await getDb();
      if (!db) return res.json({ ok: true, skipped: "no-db" });

      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      // HH:MM in local+8 (server may be UTC, use UTC+8)
      const cst = new Date(now.getTime() + 8 * 3600 * 1000);
      const todayCSTStr = cst.toISOString().slice(0, 10);
      const currentTimeStr = cst.toISOString().slice(11, 16); // "HH:MM"

      // Close matches where:
      // 1. matchDate < today (any status open/full), OR
      // 2. matchDate == today AND startTime <= currentTime (any status open/full)
      const result = await db
        .update(tennisMatches)
        .set({ status: "completed" })
        .where(
          and(
            or(
              eq(tennisMatches.status, "open"),
              eq(tennisMatches.status, "full")
            ),
            or(
              lt(tennisMatches.matchDate, todayCSTStr),
              and(
                eq(tennisMatches.matchDate, todayCSTStr),
                sql`${tennisMatches.startTime} <= ${currentTimeStr}`
              )
            )
          )
        );

      const closed = (result as any)?.rowsAffected ?? 0;
      console.log(`[close-expired-matches] Closed ${closed} expired matches at ${now.toISOString()} (CST ${todayCSTStr} ${currentTimeStr})`);

      // 自动记录到场：对刚关闭的球局的所有确认参与者调用 recordAttendAndCheckRestore
      if (closed > 0) {
        try {
          const { matchParticipants } = await import("../../drizzle/schema");
          const { and: andOp, eq: eqOp, or: orOp, lt: ltOp, sql: sqlExpr } = await import("drizzle-orm");
          const { recordAttendAndCheckRestore } = await import("../db");

          // 查询刚被关闭的球局（已变为 completed）
          const justClosedMatches = await db
            .select({ id: tennisMatches.id })
            .from(tennisMatches)
            .where(
              andOp(
                eqOp(tennisMatches.status, "completed"),
                orOp(
                  ltOp(tennisMatches.matchDate, todayCSTStr),
                  andOp(
                    eqOp(tennisMatches.matchDate, todayCSTStr),
                    sqlExpr`${tennisMatches.startTime} <= ${currentTimeStr}`
                  )
                )
              )
            );

          const { recordOrganizerReward } = await import("../db");
          let attendRecorded = 0;
          let creditRestored = 0;
          let organizerRewarded = 0;
          for (const match of justClosedMatches) {
            const participants = await db
              .select({ userId: matchParticipants.userId })
              .from(matchParticipants)
              .where(andOp(eqOp(matchParticipants.matchId, match.id), eqOp(matchParticipants.status, "confirmed")));
            for (const p of participants) {
              const restored = await recordAttendAndCheckRestore(p.userId, match.id);
              attendRecorded++;
              if (restored) creditRestored++;
            }
            // 给组织者发放 +50 组织奖励
            const matchRow = await db.select({ authorId: tennisMatches.authorId })
              .from(tennisMatches).where(eqOp(tennisMatches.id, match.id)).limit(1);
            if (matchRow[0]?.authorId) {
              await recordOrganizerReward(matchRow[0].authorId, match.id);
              organizerRewarded++;
            }
          }
          console.log(`[close-expired-matches] Recorded ${attendRecorded} attendances, ${creditRestored} credit scores restored, ${organizerRewarded} organizers rewarded`);
        } catch (attendErr: any) {
          console.error(`[close-expired-matches] Attendance recording failed:`, attendErr.message);
        }
      }

      res.json({ ok: true, closed });
    } catch (err: any) {
      res.status(500).json({ error: err.message, stack: err.stack, timestamp: new Date().toISOString() });
    }
  });

  // ── Scheduled: expire pending replace invites + deduct credit ──────────────────
  app.post("/api/scheduled/expire-replace-invites", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron) return res.status(403).json({ error: "cron-only" });

      const { getDb, addCreditLog } = await import("../db");
      const { matchReplaceInvites, matchParticipants } = await import("../../drizzle/schema");
      const { and, eq, lte } = await import("drizzle-orm");

      const db = await getDb();
      if (!db) return res.json({ ok: true, skipped: "no-db" });

      const now = new Date();

      // 1. 查询所有 pending 且已过期（expiresAt <= now）的替代邀请
      const expiredInvites = await db
        .select({
          id: matchReplaceInvites.id,
          matchId: matchReplaceInvites.matchId,
          fromUserId: matchReplaceInvites.fromUserId,
        })
        .from(matchReplaceInvites)
        .where(
          and(
            eq(matchReplaceInvites.status, "pending"),
            lte(matchReplaceInvites.expiresAt, now)
          )
        );

      let expiredCount = 0;
      let deductedCount = 0;

      for (const invite of expiredInvites) {
        // 2. 将邀请标记为 expired
        await db
          .update(matchReplaceInvites)
          .set({ status: "expired" })
          .where(eq(matchReplaceInvites.id, invite.id));
        expiredCount++;

        // 3. 检查该用户是否仍在球局中（status=confirmed）
        // 若是，说明未找到替代者，扣10信用分并移除参与
        const participant = await db
          .select({ status: matchParticipants.status })
          .from(matchParticipants)
          .where(
            and(
              eq(matchParticipants.matchId, invite.matchId),
              eq(matchParticipants.userId, invite.fromUserId),
              eq(matchParticipants.status, "confirmed")
            )
          )
          .limit(1);

        if (participant.length > 0) {
          // 扣10信用分
          await addCreditLog(
            invite.fromUserId,
            -10,
            "开球前未找到替代者，扣除信用分",
            invite.matchId
          );
          // 将参与状态改为 cancelled
          await db
            .update(matchParticipants)
            .set({ status: "cancelled" })
            .where(
              and(
                eq(matchParticipants.matchId, invite.matchId),
                eq(matchParticipants.userId, invite.fromUserId)
              )
            );
          deductedCount++;
        }
      }

      console.log(
        `[expire-replace-invites] Expired ${expiredCount} invites, deducted credit for ${deductedCount} users at ${now.toISOString()}`
      );
      res.json({ ok: true, expiredCount, deductedCount });
    } catch (err: any) {
      res.status(500).json({
        error: err.message,
        stack: err.stack,
        context: { url: req.url },
        timestamp: new Date().toISOString(),
      });
    }
  });

  // ── Scheduled: auto-settle matches after 24h confirming period ────────────────────
  app.post("/api/scheduled/auto-settle-matches", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron) return res.status(403).json({ error: "cron-only" });

      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) return res.json({ ok: true, settledCount: 0, skipped: "no-db" });

      const { matchSettlements, matchOrders } = await import("../../drizzle/schema");
      const { eq, lte, and } = await import("drizzle-orm");

      const now = new Date();
      const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24小时前

      // 查询所有 confirming 且 confirmedAt <= cutoff 的结算记录
      const pendingSettlements = await db.select().from(matchSettlements)
        .where(and(
          eq(matchSettlements.status, "confirming"),
          lte(matchSettlements.confirmedAt, cutoff)
        ));

      let settledCount = 0;
      for (const settlement of pendingSettlements) {
        try {
          // 标记结算完成
          await db.update(matchSettlements)
            .set({ status: "settled", settledAt: now })
            .where(eq(matchSettlements.id, settlement.id));

          // 标记订单为已结算
          await db.update(matchOrders)
            .set({ status: "settled" })
            .where(and(
              eq(matchOrders.matchId, settlement.matchId),
              eq(matchOrders.status, "paid")
            ));

          // Mock 模式：直接标记已结算；生产模式将调用 transferToUser
          // const { isWxpayConfigured, transferToUser } = await import("../wxpay");
          // if (isWxpayConfigured()) { await transferToUser({ ... }); }

          settledCount++;
          console.log(`[auto-settle] Settled matchId=${settlement.matchId}, amount=${settlement.netAmount}`);
        } catch (innerErr: any) {
          console.error(`[auto-settle] Failed to settle matchId=${settlement.matchId}:`, innerErr.message);
        }
      }

      console.log(`[auto-settle] Processed ${pendingSettlements.length} settlements, settled ${settledCount} at ${now.toISOString()}`);
      res.json({ ok: true, settledCount, total: pendingSettlements.length });
    } catch (err: any) {
      res.status(500).json({
        error: err.message,
        stack: err.stack,
        context: { url: req.url },
        timestamp: new Date().toISOString(),
      });
    }
  });

  // ── 微信支付回调（POST /api/wxpay/notify）────────────────────────────────────
  app.post("/api/wxpay/notify", async (req, res) => {
    try {
      const timestamp = req.headers["wechatpay-timestamp"] as string || "";
      const nonce = req.headers["wechatpay-nonce"] as string || "";
      const signature = req.headers["wechatpay-signature"] as string || "";
      const serial = req.headers["wechatpay-serial"] as string || "";

      // 获取原始请求体（express.raw 会将 body 作为 Buffer 保存，用于签名验证）
      const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : (typeof req.body === "string" ? req.body : JSON.stringify(req.body));
      const notifyBody = JSON.parse(rawBody) as { event_type?: string; resource?: { ciphertext: string; nonce: string; associated_data: string } };
      console.log(`[wxpay/notify] received, rawBody length=${rawBody.length}, event_type=${notifyBody.event_type || 'unknown'}`);

      const { verifyNotifySignature, getVerifyPublicKey, decryptNotifyData, isWxpayConfigured } = await import("../wxpay");

      // 生产环境验证签名；开发/Mock 环境跳过
      if (isWxpayConfigured()) {
        const pubKey = getVerifyPublicKey();
        if (pubKey) {
          const valid = verifyNotifySignature(timestamp, nonce, rawBody, signature, pubKey);
          if (!valid) {
            console.warn(`[wxpay/notify] Signature verification failed, serial=${serial}`);
            return res.status(401).json({ code: "SIGN_ERROR", message: "签名验证失败" });
          }
        } else {
          console.warn(`[wxpay/notify] WXPAY_PUBLIC_KEY not configured, skipping signature verification`);
        }
      }

      // 使用已解析的 notifyBody
      if (!notifyBody.resource) {
        console.warn(`[wxpay/notify] Missing resource field, body=${rawBody.substring(0, 200)}`);
        return res.status(400).json({ code: "PARAM_ERROR", message: "缺少 resource 字段" });
      }

      // 解密支付结果
      const decrypted = decryptNotifyData(
        notifyBody.resource.ciphertext,
        notifyBody.resource.nonce,
        notifyBody.resource.associated_data
      );
      const payResult = JSON.parse(decrypted) as {
        out_trade_no: string;
        trade_state: string;
        transaction_id: string;
        payer?: { openid: string };
      };

      console.log(`[wxpay/notify] event=${notifyBody.event_type}, trade_no=${payResult.out_trade_no}, state=${payResult.trade_state}`);

      if (payResult.trade_state === "SUCCESS") {
        const dbMod = await import("../db");
        const { getDb } = dbMod;
        const db = await getDb();
        if (db) {
          const { matchOrders, matchParticipants, tennisMatches, matchMessages } = await import("../../drizzle/schema");
          const { eq, and, sql } = await import("drizzle-orm");
          // 更新订单状态
          await db.update(matchOrders)
            .set({ status: "paid", paidAt: new Date(), wxTransactionId: payResult.transaction_id })
            .where(eq(matchOrders.orderId, payResult.out_trade_no));
          // 查订单
          const orders = await db.select().from(matchOrders).where(eq(matchOrders.orderId, payResult.out_trade_no));
          if (orders.length > 0) {
            const order = orders[0];
            // ── V6 补缴回调：topup 订单清账 + 结算给发起人，处理完直接结束本订单逻辑 ──
            if ((order as any).orderType === "topup") {
              try {
                const partRowsT = await db.select().from(matchParticipants)
                  .where(and(eq(matchParticipants.matchId, order.matchId), eq(matchParticipants.userId, order.userId)));
                const prevPaid = partRowsT.length > 0 ? Number((partRowsT[0] as any).paidAmount || 0) : 0;
                await db.update(matchParticipants)
                  .set({ paymentStatus: "paid", paidAmount: String(prevPaid + Number(order.amount)) as any, topupAmount: "0.00" as any })
                  .where(and(eq(matchParticipants.matchId, order.matchId), eq(matchParticipants.userId, order.userId)));
                // 补缴款结算给发起人
                const matchRowsT = await db.select().from(tennisMatches).where(eq(tennisMatches.id, order.matchId));
                if (matchRowsT.length > 0) {
                  const mt = matchRowsT[0];
                  const organizer = await dbMod.getUserById(mt.authorId);
                  if (organizer?.wechatOpenid) {
                    const { transferToUser, generateOrderId } = await import("../wxpay");
                    const batchId = generateOrderId();
                    await transferToUser({ batchId, openid: organizer.wechatOpenid, amountFen: Math.round(Number(order.amount) * 100), remark: `球局「${mt.title}」补缴结算` });
                    await db.update(matchOrders).set({ status: "settled", settledAt: new Date() }).where(eq(matchOrders.orderId, order.orderId));
                    await dbMod.createNotification({ userId: mt.authorId, type: "system", title: "补缴到账", content: `「${mt.title}」有参与者补缴 ${Number(order.amount).toFixed(2)} 元，已结算到您的微信零钱。` });
                  }
                }
              } catch (_topupErr) {
                console.error(`[wxpay/notify] 补缴清账失败 order=${order.orderId}:`, (_topupErr as any)?.message);
              }
              res.status(200).json({ code: "SUCCESS", message: "成功" });
              return;
            }
            // 查当前参与者状态，判断是否需要从「待支付占位 pending」转「确认 confirmed」
            const partRows = await db.select().from(matchParticipants)
              .where(and(eq(matchParticipants.matchId, order.matchId), eq(matchParticipants.userId, order.userId)));
            const wasPending = partRows.length > 0 && partRows[0].status === "pending";
            // 更新参与者：转 confirmed + 已支付（幂等，重复回调不会重复占位）
            await db.update(matchParticipants)
              .set({ status: "confirmed", paymentStatus: "paid", orderId: order.orderId })
              .where(and(eq(matchParticipants.matchId, order.matchId), eq(matchParticipants.userId, order.userId)));
            // 仅当从 pending 首次转 confirmed 时才占名额、发通知、进群聊
            if (wasPending) {
              try {
                // ★ 超员保护：并发支付时，若在本笔支付确认前名额已被占满，则不占位，自动退款
                const preRows = await db.select().from(tennisMatches).where(eq(tennisMatches.id, order.matchId));
                const preMatch = preRows.length > 0 ? preRows[0] : null;
                if (preMatch && (preMatch.currentParticipants ?? 0) >= (preMatch.maxParticipants ?? 0)) {
                  console.warn(`[wxpay/notify] 球局已满，自动退款 order=${order.orderId} matchId=${order.matchId}`);
                  try {
                    const { refundOrder } = await import("../wxpay");
                    const amountFen = Math.round(Number(order.amount) * 100);
                    const refundId = `RFOVER${order.orderId}`;
                    await refundOrder({ orderId: order.orderId, refundId, totalFen: amountFen, refundFen: amountFen, reason: "球局已满员-自动退款" });
                    await db.update(matchOrders).set({ status: "refunded", refundId, refundReason: "球局已满员" } as any).where(eq(matchOrders.orderId, order.orderId));
                    await db.update(matchParticipants).set({ status: "cancelled", paymentStatus: "refunded" } as any)
                      .where(and(eq(matchParticipants.matchId, order.matchId), eq(matchParticipants.userId, order.userId)));
                    await dbMod.createNotification({ userId: order.userId, type: "system", title: "球局已满员", content: `抱歉，您支付时球局「${preMatch.title}」已满员，费用已原路退回。` });
                  } catch (_refundErr) {
                    console.error(`[wxpay/notify] 满员自动退款失败 order=${order.orderId}:`, (_refundErr as any)?.message);
                  }
                  res.status(200).json({ code: "SUCCESS", message: "成功" });
                  return;
                }
                // 占位计数 +1
                await db.update(tennisMatches)
                  .set({ currentParticipants: sql`${tennisMatches.currentParticipants} + 1` as any })
                  .where(eq(tennisMatches.id, order.matchId));
                // 查最新球局（计数已落库），用真实值判满，避免 +1 预判导致提前满员
                const matchRows = await db.select().from(tennisMatches).where(eq(tennisMatches.id, order.matchId));
                if (matchRows.length > 0) {
                  const m = matchRows[0];
                  // currentParticipants 已是最新落库值，直接与 maxParticipants 比较
                  if ((m.currentParticipants ?? 0) >= (m.maxParticipants ?? 0) && m.status === "open") {
                    await db.update(tennisMatches).set({ status: "full" }).where(eq(tennisMatches.id, order.matchId));
                  }
                  // 发通知给发起人 + 进群聊系统消息
                  try {
                    const joiner = await dbMod.getUserById(order.userId);
                    await dbMod.createNotification({ userId: m.authorId, type: "system", title: "新的报名", content: `${joiner?.name ?? "有人"}已付费报名您的约球「${m.title}」。` });
                    await db.insert(matchMessages).values({
                      matchId: order.matchId,
                      userId: order.userId,
                      content: `${joiner?.name ?? "小伙伴"} 加入了球局 🎾`,
                      msgType: "system",
                    });
                  } catch (_notifyErr) { /* 通知/群消息失败不影响支付主流程 */ }
                }
              } catch (_incErr) {
                console.error(`[wxpay/notify] 支付成功后占位处理失败 order=${order.orderId}:`, (_incErr as any)?.message);
              }
            }
          }
        }
      }

      // 微信支付要求回调必须返回 200 + 特定格式
      res.status(200).json({ code: "SUCCESS", message: "成功" });
    } catch (err: any) {
      console.error(`[wxpay/notify] Error processing notify:`, err.message, err.stack);
      // 解密或处理失败时返回 500，让微信重试；签名验证失败已在上面返回 401
      if (!res.headersSent) {
        res.status(500).json({ code: "FAIL", message: "处理失败，请重试" });
      }
    }
  });

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, async () => {
    console.log(`Server running on http://localhost:${port}/`);
    // Run seed data initialization after server starts
    try {
      await seedDemoData();
    } catch (e) {
      console.error('[seed] Failed to seed demo data:', e);
    }
    // 启动结算兜底定时任务（重试打款失败的结算）
    try {
      const { startSettlementCron } = await import("../settlement-cron");
      startSettlementCron();
    } catch (e) {
      console.error('[settlement-cron] Failed to start:', e);
    }
  });
}

// ── Seed demo coach data for production ──────────────────────────────────────
async function seedDemoData() {
  const { getDb } = await import("../db");
  const db = await getDb();
  if (!db) return;

  const { users, coachProfiles, venues, coachVenues, coachAvailability } = await import("../../drizzle/schema");
  const { eq, count } = await import("drizzle-orm");

  // Check if demo coaches already exist (by inviteCode)
  const existing = await db.select({ c: count() }).from(coachProfiles).where(eq(coachProfiles.inviteCode, 'CHENWEI2024'));
  if ((existing[0]?.c ?? 0) > 0) {
    console.log('[seed] Demo coaches already exist, skipping.');
    return;
  }

  console.log('[seed] Seeding demo coaches...');

  // ── Venues ──────────────────────────────────────────────────────────────────
  const venueData = [
    { id: 30001, name: '深圳大学城体育中心网球场', area: '大学城' as const, address: '深圳市南山区留仙大道2032号', description: '坐落于塘朗山下、大沙河畔，共11片标准室外硬地网球场，灯光设备齐全，可承办大型网球比赛活动。', facilities: ['灯光照明','停车场','更衣室','淋浴间'], courtCount: 11, courtTypes: ['硬地'], pricePerHour: '80.00', openTime: '07:00', closeTime: '22:00', phone: '0755-26030304', mapUrl: 'https://ditu.amap.com/place/B02F37VC3Q', bookingNote: '请在微信小程序「i深体」中搜索"大学城体育中心"进行场地预约，提前1-2天预订。', isActive: true },
    { id: 30002, name: '深圳湾体育中心室外网球场', area: '南山' as const, address: '深圳市南山区白石路1号', description: '深圳湾体育中心配套网球场，环境优美，毗邻深圳湾海岸线，共6片室外硬地球场。', facilities: ['灯光照明','停车场','更衣室'], courtCount: 6, courtTypes: ['硬地'], pricePerHour: '100.00', openTime: '07:00', closeTime: '22:00', phone: null, mapUrl: 'https://ditu.amap.com/place/B0FFHZRQK5', bookingNote: '请提前通过官方小程序或电话预约，周末场地紧张，建议提前3天预订。', isActive: true },
    { id: 30003, name: 'TT网球蛇口室外场', area: '南山' as const, address: '深圳市南山区蛇口街道望海路1号海上世界广场', description: 'TT网球俱乐部蛇口分部，位于海上世界商业区，共4片室外硬地球场，配套设施完善。', facilities: ['灯光照明','停车场','更衣室','淋浴间','球具租赁'], courtCount: 4, courtTypes: ['硬地'], pricePerHour: '120.00', openTime: '08:00', closeTime: '22:00', phone: null, mapUrl: 'https://ditu.amap.com/search?query=TT网球蛇口&city=深圳', bookingNote: '请通过TT网球APP预约，会员享受优先预约权。', isActive: true },
    { id: 30006, name: '科技园网球中心', area: '南山' as const, address: '深圳市南山区西丽街道高新北三路与科技北三路交叉路口北侧', description: '位于科技园核心区，交通便利，适合周边上班族和科技园员工使用。', facilities: ['灯光照明','停车场','更衣室'], courtCount: 6, courtTypes: ['硬地'], pricePerHour: '90.00', openTime: '08:00', closeTime: '22:00', phone: null, mapUrl: 'https://ditu.amap.com/search?query=科技园网球中心&city=深圳', bookingNote: '请提前电话或在线预约，建议提前1天预订。', isActive: true },
    { id: 30004, name: '沙河公园网球场', area: '南山' as const, address: '深圳市南山区沙河街道沙河公园内', description: '沙河公园内配套网球场，环境清幽，绿树成荫，共4片室外硬地球场，价格实惠。', facilities: ['灯光照明','停车场'], courtCount: 4, courtTypes: ['硬地'], pricePerHour: '60.00', openTime: '07:00', closeTime: '21:00', phone: null, mapUrl: 'https://ditu.amap.com/search?query=沙河公园网球场&city=深圳', bookingNote: '现场预约，先到先得，建议工作日前往避开高峰。', isActive: true },
  ];

  for (const v of venueData) {
    const existing = await db.select({ c: count() }).from(venues).where(eq(venues.id, v.id));
    if ((existing[0]?.c ?? 0) === 0) {
      await db.insert(venues).values(v as any);
    }
  }

  // ── Demo users ───────────────────────────────────────────────────────────────
  const demoUsers = [
    { id: 1590041, openId: 'demo_coach_chenwei_001', name: '陈威', role: 'coach' as const, loginMethod: 'demo' },
    { id: 1590042, openId: 'demo_coach_lina_002', name: '李娜', role: 'coach' as const, loginMethod: 'demo' },
    { id: 1590043, openId: 'demo_coach_zhanghao_003', name: '张浩', role: 'coach' as const, loginMethod: 'demo' },
    { id: 1590044, openId: 'demo_coach_wangfang_004', name: '王芳', role: 'coach' as const, loginMethod: 'demo' },
  ];

  for (const u of demoUsers) {
    const existingUser = await db.select({ c: count() }).from(users).where(eq(users.id, u.id));
    if ((existingUser[0]?.c ?? 0) === 0) {
      await db.insert(users).values(u as any);
    }
  }

  // ── Demo coach profiles ──────────────────────────────────────────────────────
  const demoCoaches = [
    {
      id: 150001, userId: 1590041, displayName: '陈威教练', tagline: '前省队专业球员，专注成人技术提升',
      bio: '前广东省网球队队员，职业生涯参加过多项全国性赛事。退役后专注青少年及成人网球教学，擅长正手技术体系和比赛战术训练。现常驻深圳南山区，已培养学员超过200人，多名学员达到业余4.0水平。',
      yearsExperience: 12, certifications: ['国家二级运动员证书','ITF Level 2教练认证','中国网球协会注册教练'],
      specialties: ['正手技术','比赛战术','青少年培训'], achievements: ['广东省青少年网球锦标赛亚军（2015）','深圳市网球公开赛冠军（2018）'],
      pricePerHour: '680.00', inviteCode: 'CHENWEI2024', shareSlug: 'chen-wei-coach',
      isActive: true, isVerified: true, verificationStatus: 'approved' as const, contentReviewStatus: 'approved' as const,
      sortWeight: 90, totalLessons: 248, totalStudents: 67, avgRating: '4.90',
    },
    {
      id: 150002, userId: 1590042, displayName: '李娜教练', tagline: 'WTA职业球员背景，女子专项教学专家',
      bio: '曾参加WTA外卡赛事，拥有丰富的职业赛场经验。专注女子网球教学，擅长帮助女性球员建立正确技术框架，课程氛围轻松愉快，特别适合初学者和希望提高双打技术的球员。',
      yearsExperience: 9, certifications: ['WTA球员资质证明','ITF Level 1教练认证','广东省网球协会注册教练'],
      specialties: ['女子专项','初学者入门','双打技术'], achievements: ['广东省女子网球锦标赛季军（2017）','培养多名学员参加深圳市业余联赛'],
      pricePerHour: '580.00', inviteCode: 'LINA2024', shareSlug: 'li-na-coach',
      isActive: true, isVerified: true, verificationStatus: 'approved' as const, contentReviewStatus: 'approved' as const,
      sortWeight: 88, totalLessons: 186, totalStudents: 54, avgRating: '4.80',
    },
    {
      id: 150003, userId: 1590043, displayName: '张浩教练', tagline: '体能与技术双修，竞技提升首选',
      bio: '体育学院网球专业毕业，曾任深圳某知名网球俱乐部首席教练。擅长结合运动科学进行体能训练与技术改造，尤其擅长帮助有一定基础的球员突破瓶颈、提升竞技水平。课程包含视频分析和个性化训练计划。',
      yearsExperience: 8, certifications: ['体育学院网球专业学士','ITF Level 1认证','USPTA职业网球教练认证'],
      specialties: ['技术改造','体能训练','竞技提升'], achievements: ['深圳市网球俱乐部联赛团体冠军教练（2020、2022）','培养多名学员进入深圳市队'],
      pricePerHour: '750.00', inviteCode: 'ZHANGHAO2024', shareSlug: 'zhang-hao-coach',
      isActive: true, isVerified: true, verificationStatus: 'approved' as const, contentReviewStatus: 'approved' as const,
      sortWeight: 85, totalLessons: 312, totalStudents: 89, avgRating: '4.70',
    },
    {
      id: 150004, userId: 1590044, displayName: '王芳教练', tagline: '亲子网球专家，寓教于乐',
      bio: '专注亲子网球教学10年，拥有儿童体育教育背景。课程设计生动有趣，善于激发孩子对网球的兴趣，同时兼顾家长参与，打造亲子共同成长的运动体验。已成功带领多个家庭从零开始爱上网球。',
      yearsExperience: 10, certifications: ['儿童体育教育资格证','ITF Level 1教练认证','深圳市网球协会青少年教练资质'],
      specialties: ['亲子网球','儿童启蒙','家庭课程'], achievements: ['深圳市优秀青少年网球教练称号（2021）','带领学员参加全国青少年网球巡回赛'],
      pricePerHour: '500.00', inviteCode: 'WANGFANG2024', shareSlug: 'wang-fang-coach',
      isActive: true, isVerified: true, verificationStatus: 'approved' as const, contentReviewStatus: 'approved' as const,
      sortWeight: 87, totalLessons: 421, totalStudents: 112, avgRating: '4.90',
    },
  ];

  for (const c of demoCoaches) {
    const existingCoach = await db.select({ c: count() }).from(coachProfiles).where(eq(coachProfiles.id, c.id));
    if ((existingCoach[0]?.c ?? 0) === 0) {
      await db.insert(coachProfiles).values(c as any);
    }
  }

  // ── Coach-venue bindings ─────────────────────────────────────────────────────
  const coachVenueBindings = [
    { coachId: 150001, venueId: 30001, isPreferred: true },
    { coachId: 150001, venueId: 30002, isPreferred: false },
    { coachId: 150002, venueId: 30002, isPreferred: true },
    { coachId: 150002, venueId: 30003, isPreferred: false },
    { coachId: 150003, venueId: 30001, isPreferred: true },
    { coachId: 150003, venueId: 30006, isPreferred: false },
    { coachId: 150004, venueId: 30003, isPreferred: true },
    { coachId: 150004, venueId: 30004, isPreferred: false },
  ];

  for (const b of coachVenueBindings) {
    const existingBind = await db.select({ c: count() }).from(coachVenues)
      .where(eq(coachVenues.coachId, b.coachId));
    if ((existingBind[0]?.c ?? 0) === 0) {
      await db.insert(coachVenues).values(b as any);
    }
  }

  // ── Coach availability ───────────────────────────────────────────────────────
  const availabilityData = [
    // 陈威: 周二、周四 18-20, 周六 09-11
    { coachId: 150001, dayOfWeek: 2, startTime: '18:00', endTime: '20:00', isAvailable: true },
    { coachId: 150001, dayOfWeek: 4, startTime: '18:00', endTime: '20:00', isAvailable: true },
    { coachId: 150001, dayOfWeek: 6, startTime: '09:00', endTime: '11:00', isAvailable: true },
    // 李娜: 周一、周三 09-11, 周五 14-16, 周日 10-12
    { coachId: 150002, dayOfWeek: 1, startTime: '09:00', endTime: '11:00', isAvailable: true },
    { coachId: 150002, dayOfWeek: 3, startTime: '09:00', endTime: '11:00', isAvailable: true },
    { coachId: 150002, dayOfWeek: 5, startTime: '14:00', endTime: '16:00', isAvailable: true },
    { coachId: 150002, dayOfWeek: 0, startTime: '10:00', endTime: '12:00', isAvailable: true },
    // 张浩: 周一至周五 18-20, 周六 09-11
    { coachId: 150003, dayOfWeek: 1, startTime: '18:00', endTime: '20:00', isAvailable: true },
    { coachId: 150003, dayOfWeek: 2, startTime: '18:00', endTime: '20:00', isAvailable: true },
    { coachId: 150003, dayOfWeek: 3, startTime: '18:00', endTime: '20:00', isAvailable: true },
    { coachId: 150003, dayOfWeek: 4, startTime: '18:00', endTime: '20:00', isAvailable: true },
    { coachId: 150003, dayOfWeek: 5, startTime: '18:00', endTime: '20:00', isAvailable: true },
    { coachId: 150003, dayOfWeek: 6, startTime: '09:00', endTime: '11:00', isAvailable: true },
    // 王芳: 周三、周五 15-17, 周六、周日 09-11
    { coachId: 150004, dayOfWeek: 3, startTime: '15:00', endTime: '17:00', isAvailable: true },
    { coachId: 150004, dayOfWeek: 5, startTime: '15:00', endTime: '17:00', isAvailable: true },
    { coachId: 150004, dayOfWeek: 6, startTime: '09:00', endTime: '11:00', isAvailable: true },
    { coachId: 150004, dayOfWeek: 0, startTime: '09:00', endTime: '11:00', isAvailable: true },
  ];

  const existingAvail = await db.select({ c: count() }).from(coachAvailability)
    .where(eq(coachAvailability.coachId, 150001));
  if ((existingAvail[0]?.c ?? 0) === 0) {
    await db.insert(coachAvailability).values(availabilityData as any);
  }

  console.log('[seed] Demo coaches seeded successfully.');
}

startServer().catch(console.error);

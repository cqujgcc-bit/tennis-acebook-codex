import { eq, desc, asc, and, sql, like, inArray, lt, lte, isNotNull, gte, or, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  users, InsertUser,
  coachProfiles, InsertCoachProfile,
  venues, InsertVenue,
  coachVenues,
  coachAvailability,
  bookings, InsertBooking,
  payments,
  reviews,
  notifications,
  coupons,
  couponUsages,
  inviteUsages,
  smsCodes,
  coachLocations,
  tennisMatches,
  matchParticipants,
  matchReviews,
  lessonPackages,
  studentPackages,
  packageDeductions,
  creditLogs,
  feedbacks,
  bookingApps,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const fields = ["name", "email", "loginMethod", "phone", "wechatId", "avatar"] as const;
  for (const f of fields) {
    if (user[f] !== undefined) {
      values[f] = user[f] ?? null;
      updateSet[f] = user[f] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserByWechatOpenid(wechatOpenid: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.wechatOpenid, wechatOpenid)).limit(1);
  return result[0];
}

export async function bindWechatOpenid(userId: number, wechatOpenid: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ wechatOpenid }).where(eq(users.id, userId));
}

export async function createUserByWechat(wechatOpenid: string, name?: string, avatar?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // 使用 wechat_openid 作为唯一标识，生成一个内部 openId
  const internalOpenId = `wx_${wechatOpenid}`;
  await db.insert(users).values({
    openId: internalOpenId,
    wechatOpenid,
    name: name ?? "微信用户",
    avatar: avatar ?? null,
    loginMethod: "wechat",
    lastSignedIn: new Date(),
  }).onDuplicateKeyUpdate({ set: { lastSignedIn: new Date() } });
  const result = await db.select().from(users).where(eq(users.openId, internalOpenId)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function listUsers(opts?: { search?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(users).$dynamic();
  if (opts?.search) {
    const like = `%${opts.search}%`;
    query = query.where(
      or(
        sql`${users.name} LIKE ${like}`,
        sql`${users.email} LIKE ${like}`,
        sql`${users.openId} LIKE ${like}`,
        sql`${users.phone} LIKE ${like}`
      )
    );
  }
  return query
    .orderBy(desc(users.createdAt))
    .limit(opts?.limit ?? 50)
    .offset(opts?.offset ?? 0);
}

export async function countUsers(search?: string) {
  const db = await getDb();
  if (!db) return 0;
  let query = db.select({ count: sql<number>`COUNT(*)` }).from(users).$dynamic();
  if (search) {
    const like = `%${search}%`;
    query = query.where(
      or(
        sql`${users.name} LIKE ${like}`,
        sql`${users.email} LIKE ${like}`,
        sql`${users.openId} LIKE ${like}`,
        sql`${users.phone} LIKE ${like}`
      )
    );
  }
  const result = await query;
  return Number(result[0]?.count ?? 0);
}

export async function updateUserModeration(
  id: number,
  data: { status?: "active" | "warned" | "banned"; banReason?: string | null; warningCount?: number; warningHistory?: Array<{reason: string; createdAt: string}> }
) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data as any).where(eq(users.id, id));
}

export async function deleteUserById(id: number) {
  const db = await getDb();
  if (!db) return;
  // Delete in dependency order (leaf tables first)
  // 1. Reviews (as student or coach)
  await db.delete(reviews).where(eq(reviews.studentId, id));
  await db.delete(reviews).where(eq(reviews.coachId, id));
  // 2. Coupon usages
  await db.delete(couponUsages).where(eq(couponUsages.userId, id));
  // 3. Payments (as student or coach)
  await db.delete(payments).where(eq(payments.studentId, id));
  await db.delete(payments).where(eq(payments.coachId, id));
  // 4. Bookings (as student or coach)
  await db.delete(bookings).where(eq(bookings.studentId, id));
  await db.delete(bookings).where(eq(bookings.coachId, id));
  // 5. Coach availability & venues
  const profile = await getCoachProfileByUserId(id);
  if (profile) {
    await db.delete(coachAvailability).where(eq(coachAvailability.coachId, profile.id));
    await db.delete(coachVenues).where(eq(coachVenues.coachId, profile.id));
    await db.delete(coachProfiles).where(eq(coachProfiles.userId, id));
  }
  // 6. Notifications
  await db.delete(notifications).where(eq(notifications.userId, id));
  // 7. User row
  await db.delete(users).where(eq(users.id, id));
}

// ─── Coach Profiles ───────────────────────────────────────────────────────────
export async function getCoachProfiles(opts?: { limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(coachProfiles)
    .where(eq(coachProfiles.isActive, true))
    .orderBy(desc(coachProfiles.sortWeight), desc(coachProfiles.totalLessons))
    .limit(opts?.limit ?? 20)
    .offset(opts?.offset ?? 0);
}

export async function getCoachProfileById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(coachProfiles).where(eq(coachProfiles.id, id)).limit(1);
  return result[0];
}

export async function getCoachProfileByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(coachProfiles).where(eq(coachProfiles.userId, userId)).limit(1);
  return result[0];
}

export async function getCoachProfileBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(coachProfiles).where(eq(coachProfiles.shareSlug, slug)).limit(1);
  return result[0];
}

export async function createCoachProfile(data: InsertCoachProfile) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(coachProfiles).values(data);
  return result;
}

export async function updateCoachProfile(id: number, data: Partial<InsertCoachProfile>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(coachProfiles).set(data).where(eq(coachProfiles.id, id));
}

// ─── Venues ───────────────────────────────────────────────────────────────────
export async function getVenues(opts?: { area?: string; search?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(venues.isActive, true)];
  if (opts?.area) conditions.push(eq(venues.area, opts.area as any));
  if (opts?.search) {
    const kw = `%${opts.search}%`;
    conditions.push(
      or(
        sql`${venues.name} LIKE ${kw}`,
        sql`${venues.district} LIKE ${kw}`,
        sql`${venues.address} LIKE ${kw}`,
        sql`${venues.area} LIKE ${kw}`
      ) as any
    );
  }
  return db
    .select()
    .from(venues)
    .where(and(...conditions))
    .orderBy(asc(venues.name))
    .limit(opts?.limit ?? 100);
}

export async function getVenueById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(venues).where(eq(venues.id, id)).limit(1);
  return result[0];
}

export async function createVenue(data: InsertVenue) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(venues).values(data);
  return result;
}

export async function getCoachVenues(coachId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ venue: venues, isPreferred: coachVenues.isPreferred })
    .from(coachVenues)
    .innerJoin(venues, eq(coachVenues.venueId, venues.id))
    .where(eq(coachVenues.coachId, coachId));
}

// ─── Availability ─────────────────────────────────────────────────────────────
export async function getCoachAvailability(coachId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(coachAvailability).where(
    and(eq(coachAvailability.coachId, coachId), eq(coachAvailability.isAvailable, true))
  );
}

export async function setCoachAvailability(coachId: number, slots: Array<{
  dayOfWeek?: number;
  specificDate?: string;
  startTime: string;
  endTime: string;
}>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Clear existing and re-insert
  await db.delete(coachAvailability).where(eq(coachAvailability.coachId, coachId));
  if (slots.length > 0) {
    await db.insert(coachAvailability).values(
      slots.map(s => ({ coachId, ...s, isAvailable: true }))
    );
  }
}

/** Add a single recurring weekly slot (dayOfWeek-based), optionally tied to a specific date */
export async function addCoachWeeklySlot(
  coachId: number,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  specificDate?: string,
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(coachAvailability).values({
    coachId,
    dayOfWeek,
    startTime,
    endTime,
    isAvailable: true,
    ...(specificDate ? { specificDate } : {}),
  });
}

/** Remove a single weekly slot by id (only if it belongs to this coach) */
export async function removeCoachWeeklySlot(coachId: number, slotId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(coachAvailability).where(
    and(eq(coachAvailability.id, slotId), eq(coachAvailability.coachId, coachId))
  );
}

/** Get coach IDs that have a weekly slot covering the given dayOfWeek + time range */
export async function getCoachIdsByWeeklyAvailability(
  dayOfWeek: number,
  startTime: string,
  endTime: string,
): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ coachId: coachAvailability.coachId })
    .from(coachAvailability)
    .where(
      and(
        eq(coachAvailability.dayOfWeek, dayOfWeek),
        eq(coachAvailability.isAvailable, true),
        sql`${coachAvailability.startTime} <= ${startTime}`,
        sql`${coachAvailability.endTime} >= ${endTime}`,
      )
    );
  const ids = rows.map(r => r.coachId);
  return ids.filter((id, idx) => ids.indexOf(id) === idx);
}

// ─── Bookings ─────────────────────────────────────────────────────────────────
export async function createBooking(data: InsertBooking) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(bookings).values(data);
  return result;
}

export async function getBookingById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  return result[0];
}

export async function getBookingsByStudent(studentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bookings)
    .where(eq(bookings.studentId, studentId))
    .orderBy(desc(bookings.createdAt));
}

export async function getBookingsByCoach(coachId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bookings)
    .where(eq(bookings.coachId, coachId))
    .orderBy(desc(bookings.createdAt));
}

export async function updateBookingStatus(id: number, status: string, extra?: Record<string, unknown>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(bookings).set({ status: status as any, ...extra }).where(eq(bookings.id, id));
}

// ─── Payments ─────────────────────────────────────────────────────────────────
export async function createPayment(data: {
  bookingId: number;
  studentId: number;
  coachId: number;
  amount: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const platformFeeRate = 0.05;
  const platformFee = (parseFloat(data.amount) * platformFeeRate).toFixed(2);
  const coachEarnings = (parseFloat(data.amount) - parseFloat(platformFee)).toFixed(2);
  const [result] = await db.insert(payments).values({
    ...data,
    platformFeeRate: platformFeeRate.toString(),
    platformFee,
    coachEarnings,
  });
  return result;
}

export async function updatePaymentStatus(bookingId: number, status: "paid" | "refunded") {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(payments).set({
    status,
    paidAt: status === "paid" ? new Date() : undefined,
  }).where(eq(payments.bookingId, bookingId));
}

export async function getPaymentByBookingId(bookingId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(payments).where(eq(payments.bookingId, bookingId)).limit(1);
  return result[0];
}

export async function getCoachEarnings(coachId: number) {
  const db = await getDb();
  if (!db) return { total: 0, settled: 0, pending: 0 };
  const rows = await db.select().from(payments).where(
    and(eq(payments.coachId, coachId), eq(payments.status, "paid"))
  );
  const total = rows.reduce((s, r) => s + parseFloat(r.coachEarnings ?? "0"), 0);
  const settled = rows.filter(r => r.settlementStatus === "settled").reduce((s, r) => s + parseFloat(r.coachEarnings ?? "0"), 0);
  return { total, settled, pending: total - settled };
}

// ─── Reviews ──────────────────────────────────────────────────────────────────
export async function getCoachReviews(coachId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reviews)
    .where(and(eq(reviews.coachId, coachId), eq(reviews.isPublic, true)))
    .orderBy(desc(reviews.createdAt))
    .limit(20);
}

export async function createReview(data: {
  bookingId: number;
  studentId: number;
  coachId: number;
  rating: number;
  content?: string;
  tags?: string[];
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(reviews).values(data);
  // Update coach avg rating
  const allReviews = await db.select().from(reviews).where(eq(reviews.coachId, data.coachId));
  const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
  await db.update(coachProfiles).set({ avgRating: avg.toFixed(2) }).where(eq(coachProfiles.id, data.coachId));
  return result;
}

// ─── Notifications ────────────────────────────────────────────────────────────
export async function createNotification(data: {
  userId: number;
  type: string;
  title: string;
  content: string;
  relatedId?: number;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values(data as any);
}

export async function getNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
}

export async function markNotificationsRead(userId: number, ids?: number[]) {
  const db = await getDb();
  if (!db) return;
  if (ids && ids.length > 0) {
    await db.update(notifications).set({ isRead: true })
      .where(and(eq(notifications.userId, userId), inArray(notifications.id, ids)));
  } else {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
  }
}

export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: count() }).from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return result[0]?.count ?? 0;
}

export async function deleteNotification(userId: number, id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(notifications).where(and(eq(notifications.userId, userId), eq(notifications.id, id)));
}

// ─── Coupons ──────────────────────────────────────────────────────────────────
export async function getCouponByCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(coupons)
    .where(and(eq(coupons.code, code), eq(coupons.isActive, true)))
    .limit(1);
  return result[0];
}

export async function getCoachCoupons(coachId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(coupons).where(eq(coupons.coachId, coachId));
}

export async function createCoupon(data: {
  coachId?: number;
  code: string;
  name: string;
  type: "fixed" | "percent";
  discountValue: string;
  minOrderAmount?: string;
  maxUsageCount?: number;
  isFirstLesson?: boolean;
  validFrom: Date;
  validUntil: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(coupons).values(data as any);
  return result;
}

// ─── Coach Stats ──────────────────────────────────────────────────────────────
export async function getCoachStats(coachId: number) {
  const db = await getDb();
  if (!db) return { totalLessons: 0, totalStudents: 0, monthlyLessons: 0, monthlyEarnings: 0 };

  const allBookings = await db.select().from(bookings).where(
    and(eq(bookings.coachId, coachId), eq(bookings.status, "completed"))
  );

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyBookings = allBookings.filter(b => new Date(b.createdAt) >= monthStart);
  const uniqueStudents = new Set(allBookings.map(b => b.studentId)).size;
  const monthlyEarnings = monthlyBookings.reduce((s, b) => s + parseFloat(b.finalAmount), 0);

  return {
    totalLessons: allBookings.length,
    totalStudents: uniqueStudents,
    monthlyLessons: monthlyBookings.length,
    monthlyEarnings,
  };
}

// ─── Student Management ───────────────────────────────────────────────────────
export async function getCoachStudents(coachId: number) {
  const db = await getDb();
  if (!db) return [];

  const coachBookings = await db.select().from(bookings)
    .where(eq(bookings.coachId, coachId))
    .orderBy(desc(bookings.createdAt));

  const studentIds = Array.from(new Set(coachBookings.map(b => b.studentId)));
  if (studentIds.length === 0) return [];

  const studentUsers = await db.select().from(users).where(inArray(users.id, studentIds));

  return studentUsers.map(u => {
    const studentBookings = coachBookings.filter(b => b.studentId === u.id);
    const completedBookings = studentBookings.filter(b => b.status === "completed");
    const totalSpent = completedBookings.reduce((s, b) => s + parseFloat(b.finalAmount), 0);
    return {
      ...u,
      totalLessons: completedBookings.length,
      totalSpent,
      lastLesson: studentBookings[0]?.lessonDate,
    };
  });
}

// ─── Admin Stats ──────────────────────────────────────────────────────────────
export async function getPlatformStats() {
  const db = await getDb();
  if (!db) return { totalCoaches: 0, totalStudents: 0, totalBookings: 0, totalRevenue: 0 };

  const [coachCount] = await db.select({ count: sql<number>`count(*)` }).from(coachProfiles).where(eq(coachProfiles.isActive, true));
  const [studentCount] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, "user"));
  const [bookingCount] = await db.select({ count: sql<number>`count(*)` }).from(bookings);
  const paidPayments = await db.select().from(payments).where(eq(payments.status, "paid"));
  const totalRevenue = paidPayments.reduce((s, p) => s + parseFloat(p.amount), 0);

  return {
    totalCoaches: coachCount?.count ?? 0,
    totalStudents: studentCount?.count ?? 0,
    totalBookings: bookingCount?.count ?? 0,
    totalRevenue,
  };
}

// ─── SMS Verification Codes ───────────────────────────────────────────────────

export async function createSmsCode(phone: string, code: string, expiresAt: Date): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Invalidate previous unused codes for this phone
  await db.update(smsCodes).set({ isUsed: true }).where(
    and(eq(smsCodes.phone, phone), eq(smsCodes.isUsed, false))
  );
  await db.insert(smsCodes).values({ phone, code, expiresAt });
}

export async function getValidSmsCode(phone: string, code: string): Promise<typeof smsCodes.$inferSelect | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const now = new Date();
  const result = await db.select().from(smsCodes).where(
    and(
      eq(smsCodes.phone, phone),
      eq(smsCodes.code, code),
      eq(smsCodes.isUsed, false),
      // expiresAt > now — use sql comparison
      sql`${smsCodes.expiresAt} > ${now}`
    )
  ).limit(1);
  return result[0];
}

export async function markSmsCodeUsed(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(smsCodes).set({ isUsed: true }).where(eq(smsCodes.id, id));
}

export async function getUserByPhone(phone: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  return result[0];
}

// ─── Email Auth ───────────────────────────────────────────────────────────────

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function setUserPasswordHash(openId: string, passwordHash: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(users).set({ passwordHash }).where(eq(users.openId, openId));
}

export async function addCoachVenue(coachId: number, venueId: number, isPreferred = false) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Upsert: ignore duplicate
  await db.insert(coachVenues).values({ coachId, venueId, isPreferred })
    .onDuplicateKeyUpdate({ set: { isPreferred } });
}

export async function removeCoachVenue(coachId: number, venueId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(coachVenues).where(
    and(eq(coachVenues.coachId, coachId), eq(coachVenues.venueId, venueId))
  );
}

export async function setCoachVenuePreferred(coachId: number, venueId: number, isPreferred: boolean) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(coachVenues)
    .set({ isPreferred })
    .where(and(eq(coachVenues.coachId, coachId), eq(coachVenues.venueId, venueId)));
}

export async function getAllVenues() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(venues).where(eq(venues.isActive, true)).orderBy(venues.area, venues.name);
}

// ─── Reviews ──────────────────────────────────────────────────────────────────
export async function getReviewByBookingId(bookingId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(reviews).where(eq(reviews.bookingId, bookingId)).limit(1);
  return rows[0] ?? null;
}

// ─── Coach Reserved Slots (with venue) ───────────────────────────────────────
export async function addCoachReservedSlot(data: {
  coachId: number;
  specificDate: string;   // YYYY-MM-DD
  startTime: string;      // HH:MM
  endTime: string;        // HH:MM
  venueId: number;
  courtNo?: string;
  venueNote?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  // Conflict detection: check if any existing slot overlaps with the new one
  const existing = await db.select({
    id: coachAvailability.id,
    specificDate: coachAvailability.specificDate,
    startTime: coachAvailability.startTime,
    endTime: coachAvailability.endTime,
  })
    .from(coachAvailability)
    .where(
      and(
        eq(coachAvailability.coachId, data.coachId),
        eq(coachAvailability.specificDate, data.specificDate),
        eq(coachAvailability.isAvailable, true)
      )
    );

  // Check for time overlap: new slot [start, end) overlaps existing [s, e) if start < e && end > s
  const conflict = existing.find((slot) => {
    return data.startTime < slot.endTime && data.endTime > slot.startTime;
  });
  if (conflict) {
    throw new Error(`时间冲突：该日期 ${data.specificDate} 已有时段 ${conflict.startTime}–${conflict.endTime}，与新增时段重叠，请重新选择时间`);
  }

  const [result] = await db.insert(coachAvailability).values({
    coachId: data.coachId,
    specificDate: data.specificDate,
    startTime: data.startTime,
    endTime: data.endTime,
    venueId: data.venueId,
    courtNo: data.courtNo ?? null,
    venueNote: data.venueNote ?? null,
    isAvailable: true,
  });
  return result;
}

export async function removeCoachReservedSlot(slotId: number, coachId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(coachAvailability).where(
    and(eq(coachAvailability.id, slotId), eq(coachAvailability.coachId, coachId))
  );
}

export async function getCoachReservedSlots(coachId: number) {
  const db = await getDb();
  if (!db) return [];
  // Return future slots with venue info
  const slots = await db.select({
    id: coachAvailability.id,
    coachId: coachAvailability.coachId,
    specificDate: coachAvailability.specificDate,
    startTime: coachAvailability.startTime,
    endTime: coachAvailability.endTime,
    venueId: coachAvailability.venueId,
    courtNo: coachAvailability.courtNo,
    venueNote: coachAvailability.venueNote,
    isAvailable: coachAvailability.isAvailable,
    venueName: venues.name,
    venueAddress: venues.address,
    venueArea: venues.area,
    venueMapUrl: venues.mapUrl,
  })
    .from(coachAvailability)
    .leftJoin(venues, eq(coachAvailability.venueId, venues.id))
    .where(
      and(
        eq(coachAvailability.coachId, coachId),
        eq(coachAvailability.isAvailable, true),
        // only slots that have a venue reserved
        isNotNull(coachAvailability.venueId)
      )
    )
    .orderBy(coachAvailability.specificDate, coachAvailability.startTime);
  return slots;
}

export async function getCoachReservedSlotsPublic(coachId: number) {
  // Same as above but only future dates, for student view
  const db = await getDb();
  if (!db) return [];
  const today = new Date().toISOString().slice(0, 10);
  const slots = await db.select({
    id: coachAvailability.id,
    specificDate: coachAvailability.specificDate,
    startTime: coachAvailability.startTime,
    endTime: coachAvailability.endTime,
    venueId: coachAvailability.venueId,
    courtNo: coachAvailability.courtNo,
    venueNote: coachAvailability.venueNote,
    venueName: venues.name,
    venueAddress: venues.address,
    venueArea: venues.area,
    venueMapUrl: venues.mapUrl,
  })
    .from(coachAvailability)
    .leftJoin(venues, eq(coachAvailability.venueId, venues.id))
    .where(
      and(
        eq(coachAvailability.coachId, coachId),
        eq(coachAvailability.isAvailable, true),
        isNotNull(coachAvailability.venueId),
        gte(coachAvailability.specificDate, today)
      )
    )
    .orderBy(coachAvailability.specificDate, coachAvailability.startTime);
  return slots;
}

// ─── Coach Locations ──────────────────────────────────────────────────────────
export async function getCoachLocations(coachId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(coachLocations).where(eq(coachLocations.coachId, coachId)).orderBy(desc(coachLocations.isPrimary), coachLocations.createdAt);
}

export async function addCoachLocation(coachId: number, data: { name: string; address: string; latitude?: string | null; longitude?: string | null; isPrimary?: boolean }) {
  const db = await getDb();
  if (!db) return;
  // If setting as primary, clear existing primary first
  if (data.isPrimary) {
    await db.update(coachLocations).set({ isPrimary: false }).where(eq(coachLocations.coachId, coachId));
  }
  await db.insert(coachLocations).values({ coachId, ...data });
}

export async function removeCoachLocation(coachId: number, locationId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(coachLocations).where(and(eq(coachLocations.id, locationId), eq(coachLocations.coachId, coachId)));
}

export async function setPrimaryCoachLocation(coachId: number, locationId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(coachLocations).set({ isPrimary: false }).where(eq(coachLocations.coachId, coachId));
  await db.update(coachLocations).set({ isPrimary: true }).where(and(eq(coachLocations.id, locationId), eq(coachLocations.coachId, coachId)));
}

// ─── Tennis Matches ───────────────────────────────────────────────────────────
export async function getTennisMatches(opts?: {
  status?: string; matchType?: string; levelRequired?: string;
  dateFrom?: string; dateTo?: string; onlyAvailable?: boolean;
  city?: string; ntrpMin?: number; ntrpMax?: number;
  limit?: number; offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  // 使用安全字段列表（不包含可能不存在的新字段），通过 sql 原生查询避免 schema 字段不存在时报错
  const safeSelect = {
    id: tennisMatches.id,
    authorId: tennisMatches.authorId,
    title: tennisMatches.title,
    matchType: tennisMatches.matchType,
    levelRequired: tennisMatches.levelRequired,
    matchDate: tennisMatches.matchDate,
    startTime: tennisMatches.startTime,
    endTime: tennisMatches.endTime,
    venueName: tennisMatches.venueName,
    venueAddress: tennisMatches.venueAddress,
    courtNo: tennisMatches.courtNo,
    maxParticipants: tennisMatches.maxParticipants,
    currentParticipants: tennisMatches.currentParticipants,
    description: tennisMatches.description,
    contactInfo: tennisMatches.contactInfo,
    costPerPerson: tennisMatches.costPerPerson,
    imageUrl: tennisMatches.imageUrl,
    latitude: tennisMatches.latitude,
    longitude: tennisMatches.longitude,
    city: tennisMatches.city,
    ntrpMin: tennisMatches.ntrpMin,
    ntrpMax: tennisMatches.ntrpMax,
    costSplitType: tennisMatches.costSplitType,
    bringOwnBall: tennisMatches.bringOwnBall,
    status: tennisMatches.status,
    createdAt: tennisMatches.createdAt,
    updatedAt: tennisMatches.updatedAt,
  };
  const conditions: any[] = [];
  if (opts?.status) conditions.push(eq(tennisMatches.status, opts.status as any));
  if (opts?.matchType) conditions.push(eq(tennisMatches.matchType, opts.matchType as any));
  if (opts?.levelRequired) conditions.push(eq(tennisMatches.levelRequired, opts.levelRequired as any));
  if (opts?.dateFrom) conditions.push(gte(tennisMatches.matchDate, opts.dateFrom));
  if (opts?.dateTo) conditions.push(lte(tennisMatches.matchDate, opts.dateTo));
  // 城市筛选
  if (opts?.city) conditions.push(eq(tennisMatches.city, opts.city));
  // 先尝试包含 circleId 的完整查询，失败则降级到安全字段
  // 排序辅助：open(招募中) = 0, full(已成局/人满) = 1, 其余(cancelled/completed等) = 2
  // 每组内按 matchDate + startTime 升序（越近越前）
  function sortMatches(rows: any[]): any[] {
    function statusPriority(status: string): number {
      if (status === 'open') return 0;
      if (status === 'full') return 1;
      return 2;
    }
    return rows.sort((a, b) => {
      const aPri = statusPriority(a.status);
      const bPri = statusPriority(b.status);
      if (aPri !== bPri) return aPri - bPri;
      // 同优先级：按时间升序
      const aKey = `${a.matchDate}T${a.startTime}`;
      const bKey = `${b.matchDate}T${b.startTime}`;
      return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
    });
  }

  try {
    const fullSelect = { ...safeSelect, circleId: tennisMatches.circleId, circleOnly: tennisMatches.circleOnly };
    // 公开列表默认过滤掉「仅圈内可见」的球局
    const publicConditions = [...conditions, eq(tennisMatches.circleOnly, false)];
    const query = db.select(fullSelect).from(tennisMatches).$dynamic();
    query.where(and(...publicConditions));
    // DB 层先按日期+时间粗排，最终排序在内存中完成（保证 open 置顶）
    query.orderBy(asc(tennisMatches.matchDate), asc(tennisMatches.startTime));
    if (opts?.limit) query.limit(opts.limit);
    if (opts?.offset) query.offset(opts.offset);
    const results = await query;
    let filtered = results as any[];
    // 公开列表默认排除已取消的球局（除非调用方显式按 status 过滤）
    if (!opts?.status) {
      filtered = filtered.filter((m: any) => m.status !== 'cancelled');
    }
    if (opts?.onlyAvailable) {
      filtered = filtered.filter((m: any) => m.status === 'open' && m.currentParticipants < m.maxParticipants);
    }
    if (opts?.ntrpMin !== undefined) {
      filtered = filtered.filter((m: any) => m.ntrpMax === null || Number(m.ntrpMax) >= opts.ntrpMin!);
    }
    if (opts?.ntrpMax !== undefined) {
      filtered = filtered.filter((m: any) => m.ntrpMin === null || Number(m.ntrpMin) <= opts.ntrpMax!);
    }
    return sortMatches(filtered);
  } catch {
    // 降级：不查 circleId（生产数据库可能尚未迁移）
    const query = db.select(safeSelect).from(tennisMatches).$dynamic();
    // 降级时也尝试过滤 circleOnly，失败则忽略
    try {
      const fallbackConditions = [...conditions, eq(tennisMatches.circleOnly, false)];
      query.where(and(...fallbackConditions));
    } catch {
      if (conditions.length > 0) query.where(and(...conditions));
    }
    query.orderBy(asc(tennisMatches.matchDate), asc(tennisMatches.startTime));
    if (opts?.limit) query.limit(opts.limit);
    if (opts?.offset) query.offset(opts.offset);
    const results = await query;
    let filtered = results as any[];
    // 公开列表默认排除已取消的球局（除非调用方显式按 status 过滤）
    if (!opts?.status) {
      filtered = filtered.filter((m: any) => m.status !== 'cancelled');
    }
    if (opts?.onlyAvailable) {
      filtered = filtered.filter((m: any) => m.status === 'open' && m.currentParticipants < m.maxParticipants);
    }
    if (opts?.ntrpMin !== undefined) {
      filtered = filtered.filter((m: any) => m.ntrpMax === null || Number(m.ntrpMax) >= opts.ntrpMin!);
    }
    if (opts?.ntrpMax !== undefined) {
      filtered = filtered.filter((m: any) => m.ntrpMin === null || Number(m.ntrpMin) <= opts.ntrpMax!);
    }
    return sortMatches(filtered);
  }
}

export async function getTennisMatchById(id: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const rows = await db.select().from(tennisMatches).where(eq(tennisMatches.id, id)).limit(1);
    return {
      ...(rows[0] ?? {}),
      circleOnly: (rows[0] as any)?.circleOnly ?? false,
      feeRequired: (rows[0] as any)?.feeRequired ?? false,
    } ?? null;
  } catch (error) {
    console.warn(`[Database] getTennisMatchById failed for id ${id}, attempting fallback:`, error);
    // 降级处理：手动指定字段列表，排除可能不存在的新字段（如 circleId, circleOnly, feeRequired 等）
    const safeFields: any = {
      // 确保在降级模式下，新字段默认值为 false
      circleOnly: sql<boolean>`COALESCE(${tennisMatches.circleOnly}, FALSE)`,
      feeRequired: sql<boolean>`COALESCE(${tennisMatches.feeRequired}, FALSE)`,
      id: tennisMatches.id,
      authorId: tennisMatches.authorId,
      title: tennisMatches.title,
      matchType: tennisMatches.matchType,
      levelRequired: tennisMatches.levelRequired,
      matchDate: tennisMatches.matchDate,
      startTime: tennisMatches.startTime,
      endTime: tennisMatches.endTime,
      venueName: tennisMatches.venueName,
      venueAddress: tennisMatches.venueAddress,
      courtNo: tennisMatches.courtNo,
      maxParticipants: tennisMatches.maxParticipants,
      currentParticipants: tennisMatches.currentParticipants,
      description: tennisMatches.description,
      contactInfo: tennisMatches.contactInfo,
      costPerPerson: tennisMatches.costPerPerson,
      imageUrl: tennisMatches.imageUrl,
      latitude: tennisMatches.latitude,
      longitude: tennisMatches.longitude,
      city: tennisMatches.city,
      ntrpMin: tennisMatches.ntrpMin,
      ntrpMax: tennisMatches.ntrpMax,
      costSplitType: tennisMatches.costSplitType,
      bringOwnBall: tennisMatches.bringOwnBall,
      status: tennisMatches.status,
      createdAt: tennisMatches.createdAt,
      updatedAt: tennisMatches.updatedAt,
    };
    
    try {
      const rows = await db.select(safeFields).from(tennisMatches).where(eq(tennisMatches.id, id)).limit(1);
      return {
      ...(rows[0] ?? {}),
      circleOnly: (rows[0] as any)?.circleOnly ?? false,
      feeRequired: (rows[0] as any)?.feeRequired ?? false,
    } ?? null;
    } catch (fallbackError) {
      console.error(`[Database] getTennisMatchById fallback also failed for id ${id}:`, fallbackError);
      return null;
    }
  }
}

export async function createTennisMatch(data: {
  authorId: number; title: string; matchType: string; levelRequired: string;
  matchDate: string; startTime: string; endTime?: string; venueName: string;
  venueAddress?: string; courtNo?: string; latitude?: number; longitude?: number;
  maxParticipants: number; description?: string; contactInfo?: string;
  costPerPerson?: number; imageUrl?: string;
  city?: string; ntrpMin?: number; ntrpMax?: number;
  costSplitType?: string; bringOwnBall?: boolean;
  feeRequired?: boolean; feePerPerson?: number; courtTotalFee?: number; paymentDeadline?: number;
  circleId?: number; circleOnly?: boolean;
}) {
  const db = await getDb();
  if (!db) return null;

  try {
    // 尝试完整插入
    const [result] = await db.insert(tennisMatches).values(data as any).$returningId();
    return {
      ...result,
      circleOnly: (result as any)?.circleOnly ?? false,
      feeRequired: (result as any)?.feeRequired ?? false,
    };
  } catch (error) {
    console.warn("[Database] createTennisMatch full insert failed, attempting safe insert:", error);
    
    // 降级：仅插入旧版本数据库中存在的字段
    const safeData: any = {
      authorId: data.authorId,
      title: data.title,
      matchType: data.matchType,
      levelRequired: data.levelRequired,
      matchDate: data.matchDate,
      startTime: data.startTime,
      endTime: data.endTime,
      venueName: data.venueName,
      venueAddress: data.venueAddress,
      courtNo: data.courtNo,
      latitude: data.latitude,
      longitude: data.longitude,
      maxParticipants: data.maxParticipants,
      description: data.description,
      contactInfo: data.contactInfo,
      costPerPerson: data.costPerPerson,
      imageUrl: data.imageUrl,
      city: data.city,
      ntrpMin: data.ntrpMin,
      ntrpMax: data.ntrpMax,
      costSplitType: data.costSplitType,
      bringOwnBall: data.bringOwnBall,
      // 注意：courtTotalFee 为新列，安全降级路径不写入（旧库可能无此列）
    };

    try {
      const [result] = await db.insert(tennisMatches).values(safeData).$returningId();
      return {
      ...result,
      circleOnly: (result as any)?.circleOnly ?? false,
      feeRequired: (result as any)?.feeRequired ?? false,
    };
    } catch (fallbackError) {
      console.error("[Database] createTennisMatch safe insert also failed:", fallbackError);
      throw fallbackError;
    }
  }
}

export async function updateTennisMatchStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(tennisMatches).set({ status: status as any }).where(eq(tennisMatches.id, id));
}

export async function updateTennisMatchParticipantCount(id: number, delta: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(tennisMatches).set({ currentParticipants: sql`${tennisMatches.currentParticipants} + ${delta}` }).where(eq(tennisMatches.id, id));
}

export async function getMatchParticipants(matchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(matchParticipants).where(eq(matchParticipants.matchId, matchId)).orderBy(matchParticipants.createdAt);
}

export async function getMatchParticipant(matchId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(matchParticipants).where(and(eq(matchParticipants.matchId, matchId), eq(matchParticipants.userId, userId))).limit(1);
  return rows[0] ?? null;
}

export async function joinTennisMatch(matchId: number, userId: number, message?: string, paymentStatus?: string) {
  const db = await getDb();
  if (!db) return;
  const values: any = { matchId, userId, status: "confirmed", message };
  if (paymentStatus) values.paymentStatus = paymentStatus;
  await db.insert(matchParticipants).values(values);
}

export async function leaveTennisMatch(matchId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(matchParticipants).set({ status: "cancelled" }).where(and(eq(matchParticipants.matchId, matchId), eq(matchParticipants.userId, userId)));
}

// ─── 信用分辅助函数 ────────────────────────────────────────────────────────────
export async function addCreditLog(userId: number, delta: number, reason: string, matchId?: number) {
  const db = await getDb();
  if (!db) return;
  // 写入变动记录
  await db.insert(creditLogs).values({ userId, delta, reason, matchId: matchId ?? null });
  // 更新用户信用分（钳制在 0-100）
  await db.execute(sql`UPDATE users SET creditScore = GREATEST(0, LEAST(100, creditScore + ${delta})) WHERE id = ${userId}`);
}

export async function getCreditLogs(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(creditLogs).where(eq(creditLogs.userId, userId)).orderBy(desc(creditLogs.createdAt)).limit(limit);
}

/**
 * 用户按时参加球局后调用：连续参加次数+1，达到3次自动恢复满分，同时给予 +20 参与奖励
 * 返回 true 表示触发了满分恢复
 */
export async function recordAttendAndCheckRestore(userId: number, matchId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const userRows = await db.select({ creditScore: users.creditScore, consecutiveAttendCount: users.consecutiveAttendCount })
    .from(users).where(eq(users.id, userId)).limit(1);
  const user = userRows[0];
  if (!user) return false;
  const newCount = (user.consecutiveAttendCount ?? 0) + 1;
  if (newCount >= 3 && user.creditScore < 100) {
    // 达到3次，满分恢复（不额外加 +20，直接恢复到 100）
    await db.execute(sql`UPDATE users SET creditScore = 100, consecutiveAttendCount = 0, creditRestoreApplied = false WHERE id = ${userId}`);
    await db.insert(creditLogs).values({ userId, delta: 100 - user.creditScore, reason: '连续3次按时参加球局，信用分恢复满分', matchId });
    return true;
  } else {
    // 正常参与奖励 +20（信用分已满时不超过100）
    const newScore = Math.min(100, user.creditScore + 20);
    const actualDelta = newScore - user.creditScore;
    await db.execute(sql`UPDATE users SET consecutiveAttendCount = ${newCount}, creditScore = ${newScore} WHERE id = ${userId}`);
    if (actualDelta > 0) {
      await db.insert(creditLogs).values({ userId, delta: actualDelta, reason: '按时参加球局，获得参与奖励', matchId });
    }
    return false;
  }
}

/**
 * 球局完成时给组织者记录 +50 组织奖励
 */
export async function recordOrganizerReward(userId: number, matchId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const userRows = await db.select({ creditScore: users.creditScore }).from(users).where(eq(users.id, userId)).limit(1);
  const user = userRows[0];
  if (!user) return;
  const newScore = Math.min(100, user.creditScore + 50);
  const actualDelta = newScore - user.creditScore;
  if (actualDelta > 0) {
    await db.execute(sql`UPDATE users SET creditScore = ${newScore} WHERE id = ${userId}`);
    await db.insert(creditLogs).values({ userId, delta: actualDelta, reason: '成功组织球局完成，获得组织奖励', matchId });
  }
}

/** 用户提交信用分恢复申请 */
export async function applyCreditRestore(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.execute(sql`UPDATE users SET creditRestoreApplied = true WHERE id = ${userId}`);
}

/** 管理员审核通过信用分恢复申请 */
export async function approveCreditRestore(userId: number) {
  const db = await getDb();
  if (!db) return;
  const userRows = await db.select({ creditScore: users.creditScore }).from(users).where(eq(users.id, userId)).limit(1);
  const user = userRows[0];
  if (!user) return;
  await db.execute(sql`UPDATE users SET creditScore = 100, consecutiveAttendCount = 0, creditRestoreApplied = false WHERE id = ${userId}`);
  await db.insert(creditLogs).values({ userId, delta: 100 - user.creditScore, reason: '管理员审核通过申请，信用分恢复满分' });
}

/** 获取待审核的信用分恢复申请列表（管理员用） */
export async function getPendingCreditRestoreList() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: users.id, name: users.name, phone: users.phone, avatar: users.avatar,
    creditScore: users.creditScore, consecutiveAttendCount: users.consecutiveAttendCount,
  }).from(users).where(eq(users.creditRestoreApplied, true));
}

export async function getUserTennisMatches(userId: number) {
  const db = await getDb();
  if (!db) return { authored: [], joined: [] };
  const authored = await db.select().from(tennisMatches).where(eq(tennisMatches.authorId, userId)).orderBy(desc(tennisMatches.createdAt));
  const joinedRows = await db.select({ matchId: matchParticipants.matchId }).from(matchParticipants).where(and(eq(matchParticipants.userId, userId), eq(matchParticipants.status, "confirmed")));
  const joinedIds = joinedRows.map(r => r.matchId).filter(id => !authored.some(a => a.id === id));
  const joined = joinedIds.length > 0 ? await db.select().from(tennisMatches).where(inArray(tennisMatches.id, joinedIds)).orderBy(desc(tennisMatches.createdAt)) : [];
  return { authored, joined };
}

// ─── Lesson Packages ──────────────────────────────────────────────────────────
export async function getLessonPackagesByCoach(coachId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lessonPackages).where(and(eq(lessonPackages.coachId, coachId), eq(lessonPackages.isActive, true))).orderBy(lessonPackages.createdAt);
}

export async function getLessonPackageById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(lessonPackages).where(eq(lessonPackages.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createLessonPackage(data: { coachId: number; name: string; totalLessons: number; price: string; originalPrice?: string; description?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(lessonPackages).values(data as any);
}

export async function deleteLessonPackage(id: number, coachId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(lessonPackages).set({ isActive: false }).where(and(eq(lessonPackages.id, id), eq(lessonPackages.coachId, coachId)));
}

// ─── Student Packages ─────────────────────────────────────────────────────────
export async function createStudentPackage(data: { packageId: number; studentId: number; coachId: number; totalLessons: number; remainingLessons: number; pricePaid: string }) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(studentPackages).values({ ...data, status: "pending_payment" } as any);
  return result;
}

export async function getStudentPackages(studentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(studentPackages).where(eq(studentPackages.studentId, studentId)).orderBy(desc(studentPackages.createdAt));
}

export async function getStudentPackagesByCoach(coachId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(studentPackages).where(eq(studentPackages.coachId, coachId)).orderBy(desc(studentPackages.createdAt));
}

export async function getStudentPackageById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(studentPackages).where(eq(studentPackages.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function activateStudentPackage(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(studentPackages).set({ status: "active", paidAt: new Date() }).where(eq(studentPackages.id, id));
}

export async function deductStudentPackageLesson(id: number, deductedBy: number, bookingId?: number, note?: string) {
  const db = await getDb();
  if (!db) return;
  const pkg = await getStudentPackageById(id);
  if (!pkg || pkg.remainingLessons <= 0) throw new Error("课时不足");
  const newRemaining = pkg.remainingLessons - 1;
  await db.update(studentPackages).set({
    remainingLessons: newRemaining,
    status: newRemaining === 0 ? "exhausted" : "active",
  }).where(eq(studentPackages.id, id));
  await db.insert(packageDeductions).values({ studentPackageId: id, deductedBy, bookingId, note } as any);
}

export async function requestStudentPackageRefund(id: number, studentId: number, note?: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(studentPackages).set({ status: "refund_requested", refundNote: note }).where(and(eq(studentPackages.id, id), eq(studentPackages.studentId, studentId)));
}

export async function getPackageDeductions(studentPackageId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(packageDeductions).where(eq(packageDeductions.studentPackageId, studentPackageId)).orderBy(desc(packageDeductions.createdAt));
}

// ─── Match Reviews ────────────────────────────────────────────────────────────
export async function createMatchReview(data: {
  matchId: number; reviewerId: number; revieweeId: number;
  punctualityScore: number; friendlinessScore: number; levelMatchScore: number;
  comment?: string;
}) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(matchReviews).values(data as any).$returningId();
  // 更新被评价人的信用分（三项均分的平均分，映射到 0-100）
  const avgScore = (data.punctualityScore + data.friendlinessScore + data.levelMatchScore) / 3;
  const creditDelta = Math.round((avgScore - 3) * 5); // 3分=中性，每分差异影响5分
  if (creditDelta !== 0) {
    await db.execute(sql`UPDATE users SET creditScore = GREATEST(0, LEAST(100, creditScore + ${creditDelta})) WHERE id = ${data.revieweeId}`);
  }
  return result;
}

export async function getMatchReviews(matchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(matchReviews).where(eq(matchReviews.matchId, matchId)).orderBy(matchReviews.createdAt);
}

export async function getUserReviews(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(matchReviews).where(eq(matchReviews.revieweeId, userId)).orderBy(desc(matchReviews.createdAt));
}

export async function hasUserReviewed(matchId: number, reviewerId: number, revieweeId: number) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select({ id: matchReviews.id }).from(matchReviews)
    .where(and(eq(matchReviews.matchId, matchId), eq(matchReviews.reviewerId, reviewerId), eq(matchReviews.revieweeId, revieweeId))).limit(1);
  return rows.length > 0;
}

// ─── Match Orders 查询（调试用）────────────────────────────────────────────
export async function getRecentMatchOrders(limit: number = 5) {
  const db = await getDb();
  if (!db) return [];
  const { matchOrders } = await import("../drizzle/schema");
  return db.select().from(matchOrders).orderBy(desc(matchOrders.id)).limit(limit);
}

// ─── Feedbacks（意见反馈）─────────────────────────────────────────────────────
export async function createFeedback(data: {
  userId: number;
  content: string;
  contact?: string | null;
  category?: "suggestion" | "bug" | "other";
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(feedbacks).values({
    userId: data.userId,
    content: data.content,
    contact: data.contact ?? null,
    category: data.category ?? "other",
  });
  return result;
}

export async function getFeedbacksByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(feedbacks)
    .where(eq(feedbacks.userId, userId))
    .orderBy(desc(feedbacks.createdAt))
    .limit(50);
}

export async function getAllFeedbacks(opts?: { status?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  let query = db
    .select({
      id: feedbacks.id,
      userId: feedbacks.userId,
      content: feedbacks.content,
      contact: feedbacks.contact,
      category: feedbacks.category,
      status: feedbacks.status,
      adminReply: feedbacks.adminReply,
      repliedAt: feedbacks.repliedAt,
      createdAt: feedbacks.createdAt,
      userName: users.name,
      userAvatar: users.avatar,
    })
    .from(feedbacks)
    .leftJoin(users, eq(feedbacks.userId, users.id))
    .$dynamic();
  if (opts?.status) {
    query = query.where(eq(feedbacks.status, opts.status as any));
  }
  return query
    .orderBy(desc(feedbacks.createdAt))
    .limit(opts?.limit ?? 100)
    .offset(opts?.offset ?? 0);
}

export async function getFeedbackById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(feedbacks).where(eq(feedbacks.id, id)).limit(1);
  return result[0];
}

export async function replyFeedback(id: number, adminReply: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(feedbacks)
    .set({ adminReply, status: "replied", repliedAt: new Date() })
    .where(eq(feedbacks.id, id));
}

export async function getPendingFeedbackCount(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: count() }).from(feedbacks)
    .where(eq(feedbacks.status, "pending"));
  return result[0]?.count ?? 0;
}

// ─── Booking Apps（找场地页·官方预订小程序）─────────────────────────────────
export async function listBookingApps(onlyEnabled = false) {
  const db = await getDb();
  if (!db) return [];
  let q = db.select().from(bookingApps).$dynamic();
  if (onlyEnabled) q = q.where(eq(bookingApps.enabled, true));
  return q.orderBy(desc(bookingApps.sortWeight), asc(bookingApps.id));
}
export async function reorderBookingApps(orders: Array<{ id: number; sortWeight: number }>) {
  const db = await getDb();
  if (!db) return;
  await Promise.all(orders.map(({ id, sortWeight }) =>
    db.update(bookingApps).set({ sortWeight }).where(eq(bookingApps.id, id))
  ));
}
export async function toggleBookingApp(id: number, enabled: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(bookingApps).set({ enabled }).where(eq(bookingApps.id, id));
}
export async function upsertBookingApp(data: { id?: number; appKey: string; name: string; description?: string; appId: string; emoji?: string; sortWeight?: number; enabled?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (data.id) {
    const patch: Record<string, unknown> = { appKey: data.appKey, name: data.name, description: data.description ?? null, appId: data.appId, emoji: data.emoji ?? null };
    if (data.sortWeight !== undefined) patch.sortWeight = data.sortWeight;
    if (data.enabled !== undefined) patch.enabled = data.enabled;
    await db.update(bookingApps).set(patch as any).where(eq(bookingApps.id, data.id));
    return data.id;
  }
  const [res] = await db.insert(bookingApps).values({
    appKey: data.appKey, name: data.name, description: data.description ?? null,
    appId: data.appId, emoji: data.emoji ?? null,
    sortWeight: data.sortWeight ?? 0, enabled: data.enabled ?? true,
  });
  return (res as any).insertId;
}
export async function deleteBookingApp(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(bookingApps).where(eq(bookingApps.id, id));
}


// ─── V6 动态结算辅助函数（球局编辑 + 按实到场重算多退少补）──────────────────────
// 说明：只增不删，所有函数动态 import schema，沿用现有 getDb() 连接。

/** 查询某用户所有未结清的待补缴记录（topupAmount>0 或 paymentStatus=topup_pending） */
export async function getTopupPendingByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const { matchParticipants: mp, tennisMatches: tm } = await import("../drizzle/schema");
  const rows = await db.select({
    matchId: mp.matchId,
    userId: mp.userId,
    paymentStatus: mp.paymentStatus,
    topupAmount: mp.topupAmount,
    paidAmount: mp.paidAmount,
    matchTitle: tm.title,
    matchDate: tm.matchDate,
  }).from(mp)
    .leftJoin(tm, eq(mp.matchId, tm.id))
    .where(and(eq(mp.userId, userId), eq(mp.paymentStatus, "topup_pending")));
  return rows.filter((r: any) => Number(r.topupAmount) > 0);
}

/** 是否存在未结清的待补缴（用于报名新球局前的欠费拦截） */
export async function hasTopupPending(userId: number): Promise<boolean> {
  const list = await getTopupPendingByUser(userId);
  return list.length > 0;
}

/** 标记某参与者本局实际到场与否 */
export async function setParticipantAttendance(matchId: number, userId: number, attended: boolean) {
  const db = await getDb();
  if (!db) return;
  const { matchParticipants: mp } = await import("../drizzle/schema");
  await db.update(mp).set({ matchAttended: attended })
    .where(and(eq(mp.matchId, matchId), eq(mp.userId, userId)));
}

/** 设置参与者支付相关字段（实付/补缴/支付状态） */
export async function setParticipantSettlement(matchId: number, userId: number, data: {
  paidAmount?: number; topupAmount?: number; paymentStatus?: string;
}) {
  const db = await getDb();
  if (!db) return;
  const { matchParticipants: mp } = await import("../drizzle/schema");
  const patch: any = {};
  if (data.paidAmount !== undefined) patch.paidAmount = String(data.paidAmount);
  if (data.topupAmount !== undefined) patch.topupAmount = String(data.topupAmount);
  if (data.paymentStatus !== undefined) patch.paymentStatus = data.paymentStatus;
  if (Object.keys(patch).length === 0) return;
  await db.update(mp).set(patch)
    .where(and(eq(mp.matchId, matchId), eq(mp.userId, userId)));
}

/** 创建一条 matchOrders（支持 orderType：prepay/topup/refund_diff） */
export async function createMatchOrderRow(data: {
  orderId: string; matchId: number; userId: number; amount: number;
  orderType?: "prepay" | "topup" | "refund_diff"; status?: string; wxPrepayId?: string;
}) {
  const db = await getDb();
  if (!db) return;
  const { matchOrders } = await import("../drizzle/schema");
  await db.insert(matchOrders).values({
    orderId: data.orderId,
    matchId: data.matchId,
    userId: data.userId,
    amount: String(data.amount),
    orderType: (data.orderType ?? "prepay") as any,
    status: (data.status ?? "pending") as any,
    wxPrepayId: data.wxPrepayId,
  } as any);
}

/** 按订单号取订单 */
export async function getMatchOrderByOrderId(orderId: string) {
  const db = await getDb();
  if (!db) return null;
  const { matchOrders } = await import("../drizzle/schema");
  const rows = await db.select().from(matchOrders).where(eq(matchOrders.orderId, orderId)).limit(1);
  return rows[0] ?? null;
}

/** 取某用户某局已支付（paid/settled）的预付订单（用于重算时退差） */
export async function getPaidPrepayOrder(matchId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const { matchOrders } = await import("../drizzle/schema");
  const rows = await db.select().from(matchOrders)
    .where(and(
      eq(matchOrders.matchId, matchId),
      eq(matchOrders.userId, userId),
      inArray(matchOrders.status, ["paid", "settled"]),
    )).orderBy(desc(matchOrders.id)).limit(1);
  return rows[0] ?? null;
}

/** 更新订单状态/退款信息 */
export async function updateMatchOrder(orderId: string, patch: Record<string, any>) {
  const db = await getDb();
  if (!db) return;
  const { matchOrders } = await import("../drizzle/schema");
  await db.update(matchOrders).set(patch as any).where(eq(matchOrders.orderId, orderId));
}

/** 更新球局基本信息（发起人编辑：标题/时间/地点/名额/费用） */
export async function updateTennisMatchInfo(id: number, patch: {
  title?: string; matchDate?: string; startTime?: string; endTime?: string;
  venueName?: string; venueAddress?: string; courtNo?: string; description?: string;
  maxParticipants?: number; feePerPerson?: number; courtTotalFee?: number;
}) {
  const db = await getDb();
  if (!db) return;
  const clean: any = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (k === "feePerPerson" || k === "courtTotalFee") clean[k] = String(v);
    else clean[k] = v;
  }
  if (Object.keys(clean).length === 0) return;
  await db.update(tennisMatches).set(clean).where(eq(tennisMatches.id, id));
}


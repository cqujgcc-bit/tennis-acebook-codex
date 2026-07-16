import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  json,
} from "drizzle-orm/mysql-core";

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  wechatId: varchar("wechatId", { length: 100 }), // 微信号
  wechatOpenid: varchar("wechatOpenid", { length: 128 }).unique(), // 微信小程序 openid，用于微信登录
  avatar: text("avatar"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  role: mysqlEnum("role", ["user", "coach", "admin"]).default("user").notNull(),
  // PKU Alumni
  pkuAlumni: boolean("pkuAlumni").default(false).notNull(),
  pkuInfo: json("pkuInfo").$type<{year?: string; school?: string; studentId?: string; note?: string} | null>().default(null),
  // Moderation
  status: mysqlEnum("status", ["active", "warned", "banned"]).default("active").notNull(),
  banReason: text("banReason"), // reason for ban
  warningCount: int("warningCount").default(0).notNull(),
  warningHistory: json("warningHistory").$type<Array<{reason: string; createdAt: string}>>().default([]),
  // 个人资料
  gender: mysqlEnum("gender", ["male", "female"]),
  city: varchar("city", { length: 50 }),
  tennisLevel: int("tennisLevel"), // 约球水平 1-5: 1入门 2初级 3中级 4中高级 5高级
  // NTRP 水平和信用体系
  ntrpLevel: decimal("ntrpLevel", { precision: 3, scale: 1 }), // NTRP 等级 1.0-6.0，步长 0.5
  creditScore: int("creditScore").default(100).notNull(), // 信用分 0-100，默认100
  consecutiveAttendCount: int("consecutiveAttendCount").default(0).notNull(), // 连续按时参加次数（达到3次自动恢复满分）
  creditRestoreApplied: boolean("creditRestoreApplied").default(false).notNull(), // 是否已提交信用分恢复申请
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Coach Profiles ──────────────────────────────────────────────────────────
export const coachProfiles = mysqlTable("coach_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // Basic info
  displayName: varchar("displayName", { length: 100 }).notNull(),
  tagline: varchar("tagline", { length: 200 }), // e.g. "前ATP职业球员 · 10年执教经验"
  bio: text("bio"),
  avatar: text("avatar"),
  coverImage: text("coverImage"),
  // Professional background
  yearsExperience: int("yearsExperience").default(0),
  certifications: json("certifications").$type<string[]>().default([]),
  certificationImages: json("certificationImages").$type<string[]>().default([]), // uploaded certificate image URLs
  specialties: json("specialties").$type<string[]>().default([]), // e.g. ["发球技术","底线对抗","青少年培训"]
  achievements: json("achievements").$type<string[]>().default([]),
  // Contact
  phone: varchar("phone", { length: 20 }), // coach's contact phone number
  // Social media & video
  socialLinks: json("socialLinks").$type<{xiaohongshu?: string; wechat?: string; weibo?: string; douyin?: string; other?: string}>().default({}),
  videoUrl: varchar("videoUrl", { length: 500 }), // intro video URL (YouTube/Bilibili/etc)
  // Content review status (for bio, social links, video etc.)
  contentReviewStatus: mysqlEnum("contentReviewStatus", ["pending", "approved", "rejected"]).default("pending").notNull(),
  contentReviewNote: text("contentReviewNote"), // admin note on content review
  // PKU Alumni discount (set by coach)
  pkuDiscount: int("pkuDiscount").default(0), // 0=no discount, 90=9折, 85=8.5折 etc.
  // Admin classification & sorting
  categoryTags: json("categoryTags").$type<string[]>().default([]), // admin-set category tags
  sortWeight: int("sortWeight").default(0).notNull(), // admin manual sort weight (higher = first)
  // Pricing
  pricePerHour: decimal("pricePerHour", { precision: 10, scale: 2 }).notNull().default("600.00"),
  // Invite & promotion
  inviteCode: varchar("inviteCode", { length: 20 }).unique(),
  shareSlug: varchar("shareSlug", { length: 50 }).unique(), // for personal share page
  // Status
  isActive: boolean("isActive").default(true).notNull(),
  isVerified: boolean("isVerified").default(false).notNull(),
  // Verification workflow: pending → approved / rejected
  verificationStatus: mysqlEnum("verificationStatus", ["draft", "pending", "approved", "rejected"]).default("draft").notNull(),
  reviewNote: text("reviewNote"), // admin feedback on rejection
  totalLessons: int("totalLessons").default(0).notNull(),
  totalStudents: int("totalStudents").default(0).notNull(),
  avgRating: decimal("avgRating", { precision: 3, scale: 2 }).default("5.00"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CoachProfile = typeof coachProfiles.$inferSelect;
export type InsertCoachProfile = typeof coachProfiles.$inferInsert;

// ─── Venues (Tennis Courts) ───────────────────────────────────────────────────
export const venues = mysqlTable("venues", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  area: varchar("area", { length: 50 }).notNull(), // 区域，如「福田区」「南山区」
  district: varchar("district", { length: 50 }), // 子区域，如「大学城」「后海」
  operatorName: varchar("operatorName", { length: 200 }), // 运营方
  bookingMethod: varchar("bookingMethod", { length: 300 }), // 预约方式
  coverImage: text("coverImage"), // 封面图片URL（主图，用作约球背景）
  featureDesc: text("featureDesc"), // 特色描述
  address: varchar("address", { length: 200 }).notNull(),
  description: text("description"),
  facilities: json("facilities").$type<string[]>().default([]),
  courtCount: int("courtCount").default(1).notNull(),
  courtTypes: json("courtTypes").$type<string[]>().default([]), // e.g. ["硬地","红土"]
  pricePerHour: decimal("pricePerHour", { precision: 10, scale: 2 }).default("100.00"),
  openTime: varchar("openTime", { length: 10 }).default("08:00"),
  closeTime: varchar("closeTime", { length: 10 }).default("22:00"),
  phone: varchar("phone", { length: 20 }),
  images: json("images").$type<string[]>().default([]),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  isActive: boolean("isActive").default(true).notNull(),
  mapUrl: varchar("mapUrl", { length: 500 }),        // 高德地图链接
  bookingNote: text("bookingNote"),                   // 预约说明
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Venue = typeof venues.$inferSelect;
export type InsertVenue = typeof venues.$inferInsert;

// ─── Coach Venues (Coach binds preferred venues) ──────────────────────────────
export const coachVenues = mysqlTable("coach_venues", {
  id: int("id").autoincrement().primaryKey(),
  coachId: int("coachId").notNull(),
  venueId: int("venueId").notNull(),
  isPreferred: boolean("isPreferred").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Coach Availability ───────────────────────────────────────────────────────
export const coachAvailability = mysqlTable("coach_availability", {
  id: int("id").autoincrement().primaryKey(),
  coachId: int("coachId").notNull(),
  // Recurring weekly availability
  dayOfWeek: int("dayOfWeek"), // 0=Sun, 1=Mon, ..., 6=Sat; null = specific date
  specificDate: varchar("specificDate", { length: 10 }), // YYYY-MM-DD for one-off slots
  startTime: varchar("startTime", { length: 5 }).notNull(), // HH:MM
  endTime: varchar("endTime", { length: 5 }).notNull(),   // HH:MM
  isAvailable: boolean("isAvailable").default(true).notNull(),
  // Venue reservation by coach
  venueId: int("venueId"),           // which venue the coach has reserved
  courtNo: varchar("courtNo", { length: 20 }), // specific court number e.g. "3号场"
  venueNote: varchar("venueNote", { length: 200 }), // extra note for students
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CoachAvailability = typeof coachAvailability.$inferSelect;

// ─── Bookings ─────────────────────────────────────────────────────────────────
export const bookings = mysqlTable("bookings", {
  id: int("id").autoincrement().primaryKey(),
  bookingNo: varchar("bookingNo", { length: 30 }).notNull().unique(), // e.g. BK20240527001
  studentId: int("studentId").notNull(),
  coachId: int("coachId").notNull(),
  venueId: int("venueId"),  // null when student uses custom venue
  customVenueName: varchar("customVenueName", { length: 200 }),   // student-supplied venue name
  customVenueAddress: varchar("customVenueAddress", { length: 500 }), // student-supplied address
  // Time
  lessonDate: varchar("lessonDate", { length: 10 }).notNull(), // YYYY-MM-DD
  startTime: varchar("startTime", { length: 5 }).notNull(),   // HH:MM
  endTime: varchar("endTime", { length: 5 }).notNull(),
  durationHours: decimal("durationHours", { precision: 4, scale: 2 }).default("1.00"),
  // Pricing
  pricePerHour: decimal("pricePerHour", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal("discountAmount", { precision: 10, scale: 2 }).default("0.00"),
  finalAmount: decimal("finalAmount", { precision: 10, scale: 2 }).notNull(),
  couponId: int("couponId"),
  // Status
  status: mysqlEnum("status", [
    "pending",     // 待确认（学员已支付，等待教练确认）
    "confirmed",   // 已确认
    "completed",   // 已完成
    "cancelled_by_student",
    "cancelled_by_coach",
    "rejected",    // 教练拒绝
  ]).default("pending").notNull(),
  // Notes
  studentNote: text("studentNote"),
  coachNote: text("coachNote"),
  cancelReason: text("cancelReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  confirmedAt: timestamp("confirmedAt"),
  completedAt: timestamp("completedAt"),
  cancelledAt: timestamp("cancelledAt"),
});

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;

// ─── Payments ─────────────────────────────────────────────────────────────────
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull(),
  studentId: int("studentId").notNull(),
  coachId: int("coachId").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  // Payment status
  status: mysqlEnum("status", ["pending", "paid", "refunded", "partially_refunded"]).default("pending").notNull(),
  paymentMethod: varchar("paymentMethod", { length: 50 }).default("wechat_pay"),
  transactionId: varchar("transactionId", { length: 100 }),
  paidAt: timestamp("paidAt"),
  // Settlement
  settlementStatus: mysqlEnum("settlementStatus", ["pending", "settled"]).default("pending").notNull(),
  settledAt: timestamp("settledAt"),
  platformFeeRate: decimal("platformFeeRate", { precision: 5, scale: 4 }).default("0.0500"), // 5%
  platformFee: decimal("platformFee", { precision: 10, scale: 2 }).default("0.00"),
  coachEarnings: decimal("coachEarnings", { precision: 10, scale: 2 }).default("0.00"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;

// ─── Reviews ──────────────────────────────────────────────────────────────────
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull().unique(),
  studentId: int("studentId").notNull(),
  coachId: int("coachId").notNull(),
  rating: int("rating").notNull(), // 1-5
  content: text("content"),
  tags: json("tags").$type<string[]>().default([]), // e.g. ["专业","耐心","效果好"]
  isPublic: boolean("isPublic").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Review = typeof reviews.$inferSelect;

// ─── Notifications ────────────────────────────────────────────────────────────
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", [
    "booking_created",
    "booking_confirmed",
    "booking_rejected",
    "booking_cancelled",
    "lesson_reminder",
    "payment_success",
    "review_received",
    "settlement_completed",
    "circle_activity",
    "circle_joined",
    "circle_announcement",
    "circle_match",
    "coach_approved",
    "coach_rejected",
    "comment_replied",
    "post_commented",
    "post_liked",
    "match_cancelled",
    "system",
  ]).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  relatedId: int("relatedId"), // bookingId or paymentId
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;

// ─── Coupons ──────────────────────────────────────────────────────────────────
export const coupons = mysqlTable("coupons", {
  id: int("id").autoincrement().primaryKey(),
  coachId: int("coachId"), // null = platform-wide
  code: varchar("code", { length: 30 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  type: mysqlEnum("type", ["fixed", "percent"]).notNull(), // fixed amount or percentage
  discountValue: decimal("discountValue", { precision: 10, scale: 2 }).notNull(),
  minOrderAmount: decimal("minOrderAmount", { precision: 10, scale: 2 }).default("0.00"),
  maxUsageCount: int("maxUsageCount").default(100),
  usedCount: int("usedCount").default(0).notNull(),
  isFirstLesson: boolean("isFirstLesson").default(false), // first lesson only
  validFrom: timestamp("validFrom").notNull(),
  validUntil: timestamp("validUntil").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Coupon = typeof coupons.$inferSelect;

// ─── Coupon Usages ────────────────────────────────────────────────────────────
export const couponUsages = mysqlTable("coupon_usages", {
  id: int("id").autoincrement().primaryKey(),
  couponId: int("couponId").notNull(),
  userId: int("userId").notNull(),
  bookingId: int("bookingId").notNull(),
  discountAmount: decimal("discountAmount", { precision: 10, scale: 2 }).notNull(),
  usedAt: timestamp("usedAt").defaultNow().notNull(),
});

// ─── SMS Verification Codes ─────────────────────────────────────────────────
export const smsCodes = mysqlTable("sms_codes", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  purpose: mysqlEnum("purpose", ["login", "register"]).default("login").notNull(),
  isUsed: boolean("isUsed").default(false).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SmsCode = typeof smsCodes.$inferSelect;

// ─── Invite Codes ─────────────────────────────────────────────────────────────
export const inviteUsages = mysqlTable("invite_usages", {
  id: int("id").autoincrement().primaryKey(),
  coachId: int("coachId").notNull(),
  invitedUserId: int("invitedUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Coach Locations (常用教学地点) ──────────────────────────────────────────
export const coachLocations = mysqlTable("coach_locations", {
  id: int("id").autoincrement().primaryKey(),
  coachId: int("coachId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),      // 地点名称，如「深大网球中心」
  address: varchar("address", { length: 300 }).notNull(), // 详细地址
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  isPrimary: boolean("isPrimary").default(false).notNull(), // 主要教学地点
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CoachLocation = typeof coachLocations.$inferSelect;

// ─── Tennis Match Posts (约球帖子) ────────────────────────────────────────────
export const tennisMatches = mysqlTable("tennis_matches", {
  id: int("id").autoincrement().primaryKey(),
  authorId: int("authorId").notNull(),
  title: varchar("title", { length: 100 }).notNull(),
  matchType: mysqlEnum("matchType", ["singles", "doubles", "mixed_doubles", "practice", "group"]).notNull(),
  levelRequired: mysqlEnum("levelRequired", ["itf1", "itf2", "itf3", "itf4", "itf5", "itf6", "itf7", "itf8", "itf9", "itf10", "any"]).default("any").notNull(),
  matchDate: varchar("matchDate", { length: 10 }).notNull(),  // YYYY-MM-DD
  startTime: varchar("startTime", { length: 5 }).notNull(),   // HH:MM
  endTime: varchar("endTime", { length: 5 }),                 // HH:MM (optional)
  venueName: varchar("venueName", { length: 200 }).notNull(),
  venueAddress: varchar("venueAddress", { length: 300 }),
  courtNo: varchar("courtNo", { length: 50 }), // 场地号码，如「3号场」「A场」
  maxParticipants: int("maxParticipants").default(2).notNull(), // 2=单打, 4=双打
  currentParticipants: int("currentParticipants").default(1).notNull(), // includes author
  description: text("description"),
  contactInfo: varchar("contactInfo", { length: 200 }), // 联系方式（可选公开）
  costPerPerson: decimal("costPerPerson", { precision: 10, scale: 2 }), // 线下人均费用（可选）
  imageUrl: varchar("imageUrl", { length: 500 }), // 活动图片URL（可选）
  latitude: decimal("latitude", { precision: 10, scale: 7 }), // 地点纬度
  longitude: decimal("longitude", { precision: 10, scale: 7 }), // 地点经度
  // 城市扩展字段（当前只激活深圳，预留全国扩展接口）
  city: varchar("city", { length: 50 }).default("shenzhen").notNull(), // 城市 code，参考 shared/cities.ts
  // NTRP 水平要求（替换原 itf 字段，向下兼容）
  ntrpMin: decimal("ntrpMin", { precision: 3, scale: 1 }), // 最低 NTRP 要求
  ntrpMax: decimal("ntrpMax", { precision: 3, scale: 1 }), // 最高 NTRP 要求
  // 球局信息完善
  costSplitType: mysqlEnum("costSplitType", ["free", "aa", "host_pays", "custom"]).default("aa"), // 费用分摊方式
  bringOwnBall: boolean("bringOwnBall").default(false).notNull(), // 是否需要自带球
  // 支付相关字段
  feeRequired: boolean("feeRequired").default(false).notNull(), // 是否需要预付场地费
  feePerPerson: decimal("feePerPerson", { precision: 10, scale: 2 }), // 人均费用（元），feeRequired=true 时必填
  courtTotalFee: decimal("courtTotalFee", { precision: 10, scale: 2 }), // 场地总费用（元）= 发布时人均×名额上限；用于扩员重算人均、退差价
  paymentDeadline: timestamp("paymentDeadline"),               // 支付截止时间（默认开球前1小时）
  status: mysqlEnum("status", ["open", "full", "cancelled", "completed"]).default("open").notNull(),
  circleId: int("circleId"),  // 圈内专属球局（null 表示公开）
  circleOnly: boolean("circleOnly").default(false).notNull(), // 仅限圈内成员可见（公开列表不展示）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TennisMatch = typeof tennisMatches.$inferSelect;

// ─── Match Participants (约球报名) ────────────────────────────────────────────
export const matchParticipants = mysqlTable("match_participants", {
  id: int("id").autoincrement().primaryKey(),
  matchId: int("matchId").notNull(),
  userId: int("userId").notNull(),
    status: mysqlEnum("status", ["pending", "confirmed", "rejected", "cancelled", "waitlist"]).default("confirmed").notNull(), // waitlist=候补名单（不计入 currentParticipants）
  message: text("message"), // 报名留言
  // 支付状态
  paymentStatus: mysqlEnum("paymentStatus", ["not_required", "pending", "paid", "refunded", "topup_pending", "partial_refunded"]).default("not_required").notNull(),
  orderId: varchar("orderId", { length: 64 }), // 关联的支付订单号
  matchAttended: boolean("matchAttended").default(false).notNull(), // 实际到场（发起人确认完成时勾选）
  paidAmount: decimal("paidAmount", { precision: 10, scale: 2 }).default("0.00").notNull(), // 该用户该局累计实付
  topupAmount: decimal("topupAmount", { precision: 10, scale: 2 }).default("0.00").notNull(), // 待补缴金额（>0 表示未结清）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type MatchParticipant = typeof matchParticipants.$inferSelect;

// ─── Lesson Packages (课时包套餐，由教练发布) ──────────────────────────────────
export const lessonPackages = mysqlTable("lesson_packages", {
  id: int("id").autoincrement().primaryKey(),
  coachId: int("coachId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),       // 如「10节精品课」
  totalLessons: int("totalLessons").notNull(),             // 课时数量
  price: decimal("price", { precision: 10, scale: 2 }).notNull(), // 套餐总价
  originalPrice: decimal("originalPrice", { precision: 10, scale: 2 }), // 原价（用于显示优惠）
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LessonPackage = typeof lessonPackages.$inferSelect;

// ─── Student Packages (学员购买的课时包) ──────────────────────────────────────
export const studentPackages = mysqlTable("student_packages", {
  id: int("id").autoincrement().primaryKey(),
  packageId: int("packageId").notNull(),
  studentId: int("studentId").notNull(),
  coachId: int("coachId").notNull(),
  totalLessons: int("totalLessons").notNull(),
  remainingLessons: int("remainingLessons").notNull(),
  pricePaid: decimal("pricePaid", { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending_payment", "active", "exhausted", "refund_requested", "refunded"]).default("pending_payment").notNull(),
  refundNote: text("refundNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  paidAt: timestamp("paidAt"),
});

export type StudentPackage = typeof studentPackages.$inferSelect;

// ─── Package Deduction Records (课时扣减记录) ─────────────────────────────────
export const packageDeductions = mysqlTable("package_deductions", {
  id: int("id").autoincrement().primaryKey(),
  studentPackageId: int("studentPackageId").notNull(),
  bookingId: int("bookingId"),  // 关联预约（可选）
  deductedBy: int("deductedBy").notNull(), // 教练userId
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PackageDeduction = typeof packageDeductions.$inferSelect;

// ─── Match Reviews (球局互评体系) ─────────────────────────────────────────────
export const matchReviews = mysqlTable("match_reviews", {
  id: int("id").autoincrement().primaryKey(),
  matchId: int("matchId").notNull(),        // 关联球局
  reviewerId: int("reviewerId").notNull(),  // 评价人
  revieweeId: int("revieweeId").notNull(),  // 被评价人
  // 三个维度评分（1-5星）
  punctualityScore: int("punctualityScore").notNull(), // 准时度
  friendlinessScore: int("friendlinessScore").notNull(), // 友好度
  levelMatchScore: int("levelMatchScore").notNull(),   // 水平符合度
  comment: text("comment"),                // 文字评价（可选）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MatchReview = typeof matchReviews.$inferSelect;
export type InsertMatchReview = typeof matchReviews.$inferInsert;

// ─── Circles (小圈子/组队) ────────────────────────────────────────────────────
export const circles = mysqlTable("circles", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),        // 圈子名称，如「北大网球群」
  description: text("description"),                        // 圈子简介
  avatar: text("avatar"),                                  // 圈子头像
  inviteCode: varchar("inviteCode", { length: 12 }).notNull().unique(), // 6位邀请码
  ownerId: int("ownerId").notNull(),                       // 创建者
  maxMembers: int("maxMembers").default(50).notNull(),     // 最大成员数
  memberCount: int("memberCount").default(1).notNull(),    // 当前成员数
  isPrivate: boolean("isPrivate").default(true).notNull(), // 是否私密（默认私密，旧字段保留兼容）
  // 入圈策略：invite_only=私密(仅邀请码) / approval=公开可申请(圈主审核) / open=公开自由加入
  joinPolicy: mysqlEnum("joinPolicy", ["invite_only", "approval", "open"]).default("approval").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Circle = typeof circles.$inferSelect;
export type InsertCircle = typeof circles.$inferInsert;

// 入圈申请（圈主审核制）
export const circleJoinRequests = mysqlTable("circle_join_requests", {
  id: int("id").autoincrement().primaryKey(),
  circleId: int("circleId").notNull(),
  userId: int("userId").notNull(),
  message: varchar("message", { length: 200 }),                 // 申请留言
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  reviewedBy: int("reviewedBy"),                                // 审核人（圈主/管理员）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CircleJoinRequest = typeof circleJoinRequests.$inferSelect;

export const circleMembers = mysqlTable("circle_members", {
  id: int("id").autoincrement().primaryKey(),
  circleId: int("circleId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "admin", "member"]).default("member").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

export type CircleMember = typeof circleMembers.$inferSelect;

// 圈子公告 / 动态
export const circlePosts = mysqlTable("circle_posts", {
  id: int("id").autoincrement().primaryKey(),
  circleId: int("circleId").notNull(),
  authorId: int("authorId").notNull(),
  content: text("content").notNull(),
  isPinned: boolean("isPinned").default(false).notNull(), // 是否置顶
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CirclePost = typeof circlePosts.$inferSelect;
export type InsertCirclePost = typeof circlePosts.$inferInsert;

// 圈内动态点赞
export const circlePostLikes = mysqlTable("circle_post_likes", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull(),
  userId: int("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CirclePostLike = typeof circlePostLikes.$inferSelect;

// 圈内动态评论/回复
export const circlePostComments = mysqlTable("circle_post_comments", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull(),
  circleId: int("circleId").notNull(),
  authorId: int("authorId").notNull(),
  content: text("content").notNull(),
  parentId: int("parentId"), // 可选，二级回复时指向父评论id
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CirclePostComment = typeof circlePostComments.$inferSelect;
export type InsertCirclePostComment = typeof circlePostComments.$inferInsert;

// 圈内打卡记录
export const circleCheckins = mysqlTable("circle_checkins", {
  id: int("id").autoincrement().primaryKey(),
  circleId: int("circleId").notNull(),
  userId: int("userId").notNull(),
  content: varchar("content", { length: 200 }),    // 打卡内容（可选）
  trainingMinutes: int("trainingMinutes").default(0), // 训练时长（分钟）
  checkinDate: varchar("checkinDate", { length: 10 }).notNull(), // YYYY-MM-DD
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CircleCheckin = typeof circleCheckins.$inferSelect;

// 圈内活动
export const circleActivities = mysqlTable("circle_activities", {
  id: int("id").autoincrement().primaryKey(),
  circleId: int("circleId").notNull(),
  creatorId: int("creatorId").notNull(),
  title: varchar("title", { length: 100 }).notNull(),
  description: text("description"),
  activityDate: varchar("activityDate", { length: 10 }).notNull(), // YYYY-MM-DD
  startTime: varchar("startTime", { length: 5 }),   // HH:MM
  endTime: varchar("endTime", { length: 5 }),       // HH:MM (optional)
  venueName: varchar("venueName", { length: 100 }),
  maxParticipants: int("maxParticipants").default(20),
  currentParticipants: int("currentParticipants").default(0),
  status: mysqlEnum("status", ["open", "full", "cancelled", "completed"]).default("open").notNull(),
  repeatWeeks: int("repeatWeeks").default(0).notNull(), // 0=不重复, 1-4=重复周数
  seriesId: int("seriesId"),                           // 周期性系列的父活动ID
  // ── 圈内活动收费（路线一：无定金 + 赛后按到场平摊）──
  feeMode: mysqlEnum("feeMode", ["free", "aa"]).default("free").notNull(), // free=纯免费活动, aa=赛后AA平摊
  totalCost: int("totalCost").default(0).notNull(),    // 发起人录入的实际总开销（分）
  settleStatus: mysqlEnum("settleStatus", ["none", "settling", "settled"]).default("none").notNull(), // 结算状态
  settledAt: timestamp("settledAt"),                   // 结算确认时间
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CircleActivity = typeof circleActivities.$inferSelect;

// 圈内活动报名
export const circleActivitySignups = mysqlTable("circle_activity_signups", {
  id: int("id").autoincrement().primaryKey(),
  activityId: int("activityId").notNull(),
  userId: int("userId").notNull(),
  // ── 赛后结算相关（路线一）──
  attended: boolean("attended").default(true).notNull(), // 是否到场（方案A：默认全员到场）
  shareAmount: int("shareAmount").default(0).notNull(),  // 应摊金额（分），结算时写入
  payStatus: mysqlEnum("payStatus", ["none", "unpaid", "paid"]).default("none").notNull(), // none=未结算, unpaid=待支付, paid=已支付
  orderId: varchar("orderId", { length: 64 }),          // 微信支付订单号
  paidAt: timestamp("paidAt"),                          // 支付完成时间
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CircleActivitySignup = typeof circleActivitySignups.$inferSelect;

// 圈内活动模板（圈主预设，便于一键/批量发布固定活动）
export const activityTemplates = mysqlTable("activity_templates", {
  id: int("id").autoincrement().primaryKey(),
  circleId: int("circleId").notNull(),
  title: varchar("title", { length: 100 }).notNull(),
  startTime: varchar("startTime", { length: 5 }),      // HH:MM
  endTime: varchar("endTime", { length: 5 }),          // HH:MM
  venueName: varchar("venueName", { length: 100 }),
  maxParticipants: int("maxParticipants").default(20).notNull(),
  feeMode: mysqlEnum("feeMode", ["free", "aa"]).default("free").notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ActivityTemplate = typeof activityTemplates.$inferSelect;

// ─── Partner Venues（合作场馆）────────────────────────────────────────────────
export const partnerVenues = mysqlTable("partner_venues", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),          // 场馆名称
  address: varchar("address", { length: 200 }),              // 地址
  district: varchar("district", { length: 50 }),             // 区域（南山/福田/罗湖等）
  phone: varchar("phone", { length: 20 }),                   // 联系电话
  imageUrl: text("imageUrl"),                                // 封面图
  bookingUrl: text("bookingUrl"),                            // 外部预订链接
  description: text("description"),                          // 简介
  courtCount: int("courtCount").default(0),                  // 总场地数
  priceRange: varchar("priceRange", { length: 50 }),         // 价格区间，如 "50-120元/小时"
  amenities: json("amenities").$type<string[]>().default([]),// 设施标签，如 ["停车场","淋浴","灯光场"]
  isActive: boolean("isActive").default(true).notNull(),     // 是否上线展示
  sortOrder: int("sortOrder").default(0),                    // 排序权重
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PartnerVenue = typeof partnerVenues.$inferSelect;

// ─── Venue Available Slots（场馆空场时段）────────────────────────────────────
export const venueAvailableSlots = mysqlTable("venue_available_slots", {
  id: int("id").autoincrement().primaryKey(),
  venueId: int("venueId").notNull(),
  slotDate: varchar("slotDate", { length: 10 }).notNull(),   // YYYY-MM-DD
  startTime: varchar("startTime", { length: 5 }).notNull(),  // HH:MM
  endTime: varchar("endTime", { length: 5 }).notNull(),      // HH:MM
  courtName: varchar("courtName", { length: 50 }),           // 场地名称，如 "1号场"
  courtType: mysqlEnum("courtType", ["hard", "clay", "grass", "indoor"]).default("hard"), // 场地类型
  price: decimal("price", { precision: 8, scale: 2 }),       // 单价（元/小时）
  isBooked: boolean("isBooked").default(false).notNull(),    // 是否已被预订
  remark: varchar("remark", { length: 100 }),                // 备注
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type VenueAvailableSlot = typeof venueAvailableSlots.$inferSelect;

// ─── Credit Logs（信用分变动记录）────────────────────────────────────────────
export const creditLogs = mysqlTable("credit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),                           // 用户 ID
  delta: int("delta").notNull(),                             // 变动值（负数为扣分，正数为加分）
  reason: varchar("reason", { length: 200 }).notNull(),      // 变动原因说明
  matchId: int("matchId"),                                   // 关联球局 ID（可选）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CreditLog = typeof creditLogs.$inferSelect;

// ─── Match Replace Invites（球局替代邀请）────────────────────────────────────
export const matchReplaceInvites = mysqlTable("match_replace_invites", {
  id: int("id").autoincrement().primaryKey(),
  matchId: int("matchId").notNull(),                         // 关联球局 ID
  fromUserId: int("fromUserId").notNull(),                   // 发起替代的用户（原参与者）
  toUserId: int("toUserId"),                                 // 接受替代的用户（接受后填入）
  token: varchar("token", { length: 64 }).notNull().unique(),// 唯一邀请 token
  status: mysqlEnum("status", ["pending", "accepted", "expired"]).default("pending").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),               // 过期时间（开球时间）
  acceptedAt: timestamp("acceptedAt"),                       // 接受时间
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type MatchReplaceInvite = typeof matchReplaceInvites.$inferSelect;

// ─── Match Orders（球局支付订单）────────────────────────────────────────────
export const matchOrders = mysqlTable("match_orders", {
  id: int("id").autoincrement().primaryKey(),
  orderId: varchar("orderId", { length: 64 }).notNull().unique(), // 平台订单号，如 MO20260616001
  matchId: int("matchId").notNull(),                              // 关联球局 ID
  userId: int("userId").notNull(),                                // 付款用户 ID
  orderType: mysqlEnum("orderType", ["prepay", "topup", "refund_diff"]).default("prepay").notNull(), // 订单类型：预付/补缴/退差
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // 支付金额（元）
  status: mysqlEnum("status", [
    "pending",      // 待支付
    "paid",         // 已支付（资金托管中）
    "refunding",    // 退款中
    "refunded",     // 已退款
    "settled",      // 已结算给发起者
  ]).default("pending").notNull(),
  wxPrepayId: varchar("wxPrepayId", { length: 100 }),             // 微信预支付 ID
  wxTransactionId: varchar("wxTransactionId", { length: 64 }),    // 微信支付交易号
  refundId: varchar("refundId", { length: 64 }),                  // 微信退款单号
  refundReason: varchar("refundReason", { length: 200 }),         // 退款原因
  refundedFen: int("refundedFen").default(0).notNull(),       // 累计已退金额（分）
  paidAt: timestamp("paidAt"),                                    // 支付时间
  refundedAt: timestamp("refundedAt"),                            // 退款时间
  settledAt: timestamp("settledAt"),                              // 结算时间
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MatchOrder = typeof matchOrders.$inferSelect;

// ─── Match Settlements（球局结算记录）────────────────────────────────────────
export const matchSettlements = mysqlTable("match_settlements", {
  id: int("id").autoincrement().primaryKey(),
  matchId: int("matchId").notNull().unique(),                     // 关联球局 ID（每局只有一条）
  organizerId: int("organizerId").notNull(),                      // 发起者 ID（收款方）
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(), // 应结算总金额
  platformFee: decimal("platformFee", { precision: 10, scale: 2 }).default("0.00").notNull(), // 平台手续费（预留）
  netAmount: decimal("netAmount", { precision: 10, scale: 2 }).notNull(), // 实际到账金额
  status: mysqlEnum("status", [
    "pending",      // 待结算（球局结束，等待发起者确认）
    "confirming",   // 确认中（发起者已确认，24小时异议期）
    "disputed",     // 有异议（冻结，等待平台处理）
    "settled",      // 已结算（已打款给发起者）
    "cancelled",    // 已取消（球局取消，全额退款）
  ]).default("pending").notNull(),
  confirmedAt: timestamp("confirmedAt"),                          // 发起者确认时间
  settledAt: timestamp("settledAt"),                              // 结算完成时间
  wxBatchId: varchar("wxBatchId", { length: 64 }),               // 微信企业付款批次号
  disputeReason: text("disputeReason"),                           // 异议原因
  disputeUserId: int("disputeUserId"),                            // 提出异议的用户 ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MatchSettlement = typeof matchSettlements.$inferSelect;

// 球局群聊消息
export const matchMessages = mysqlTable("match_messages", {
  id: int("id").autoincrement().primaryKey(),
  matchId: int("matchId").notNull(),           // 关联球局 ID
  userId: int("userId").notNull(),             // 发送者 ID
  content: text("content").notNull(),          // 消息内容
  msgType: mysqlEnum("msgType", [
    "text",    // 普通文字
    "image",   // 图片消息（content 存储图片 URL）
    "system",  // 系统通知（如：xxx 加入了球局）
  ]).default("text").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type MatchMessage = typeof matchMessages.$inferSelect;

// ─── Feedbacks（用户意见反馈）─────────────────────────────────────────────────
export const feedbacks = mysqlTable("feedbacks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),                 // 提交用户 ID
  content: text("content").notNull(),              // 反馈内容
  contact: varchar("contact", { length: 100 }),    // 联系方式（可选）
  category: mysqlEnum("category", [
    "suggestion", // 功能建议
    "bug",        // 问题反馈
    "other",      // 其他
  ]).default("other").notNull(),
  status: mysqlEnum("status", [
    "pending",   // 待处理
    "replied",   // 已回复
    "closed",    // 已关闭
  ]).default("pending").notNull(),
  adminReply: text("adminReply"),                  // 管理员回复内容
  repliedAt: timestamp("repliedAt"),               // 回复时间
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Feedback = typeof feedbacks.$inferSelect;

// ─── Booking Apps（找场地页·官方预订小程序，管理员可排序/上下架）──────────────
export const bookingApps = mysqlTable("booking_apps", {
  id: int("id").autoincrement().primaryKey(),
  appKey: varchar("appKey", { length: 64 }).notNull(),     // 业务 key，如 app_iszt
  name: varchar("name", { length: 100 }).notNull(),         // 平台名称
  description: varchar("description", { length: 200 }),     // 一句话说明
  appId: varchar("appId", { length: 64 }).notNull(),        // 目标小程序 appid
  emoji: varchar("emoji", { length: 16 }),                  // 图标 emoji
  sortWeight: int("sortWeight").default(0).notNull(),       // 排序权重，越大越靠前
  enabled: boolean("enabled").default(true).notNull(),      // 是否上架
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type BookingApp = typeof bookingApps.$inferSelect;

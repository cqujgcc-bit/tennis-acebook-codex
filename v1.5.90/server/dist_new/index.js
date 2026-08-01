var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// drizzle/schema.ts
var schema_exports = {};
__export(schema_exports, {
  activityTemplates: () => activityTemplates,
  bookings: () => bookings,
  circleActivities: () => circleActivities,
  circleActivitySignups: () => circleActivitySignups,
  circleCheckins: () => circleCheckins,
  circleJoinRequests: () => circleJoinRequests,
  circleMembers: () => circleMembers,
  circlePostComments: () => circlePostComments,
  circlePostLikes: () => circlePostLikes,
  circlePosts: () => circlePosts,
  circles: () => circles,
  coachAvailability: () => coachAvailability,
  coachLocations: () => coachLocations,
  coachProfiles: () => coachProfiles,
  coachVenues: () => coachVenues,
  couponUsages: () => couponUsages,
  coupons: () => coupons,
  creditLogs: () => creditLogs,
  feedbacks: () => feedbacks,
  inviteUsages: () => inviteUsages,
  lessonPackages: () => lessonPackages,
  matchMessages: () => matchMessages,
  matchOrders: () => matchOrders,
  matchParticipants: () => matchParticipants,
  matchReplaceInvites: () => matchReplaceInvites,
  matchReviews: () => matchReviews,
  matchSettlements: () => matchSettlements,
  notifications: () => notifications,
  packageDeductions: () => packageDeductions,
  partnerVenues: () => partnerVenues,
  payments: () => payments,
  reviews: () => reviews,
  smsCodes: () => smsCodes,
  studentPackages: () => studentPackages,
  tennisMatches: () => tennisMatches,
  users: () => users,
  venueAvailableSlots: () => venueAvailableSlots,
  venues: () => venues
});
import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  json
} from "drizzle-orm/mysql-core";
var users, coachProfiles, venues, coachVenues, coachAvailability, bookings, payments, reviews, notifications, coupons, couponUsages, smsCodes, inviteUsages, coachLocations, tennisMatches, matchParticipants, lessonPackages, studentPackages, packageDeductions, matchReviews, circles, circleJoinRequests, circleMembers, circlePosts, circlePostLikes, circlePostComments, circleCheckins, circleActivities, circleActivitySignups, activityTemplates, partnerVenues, venueAvailableSlots, creditLogs, matchReplaceInvites, matchOrders, matchSettlements, matchMessages, feedbacks;
var init_schema = __esm({
  "drizzle/schema.ts"() {
    "use strict";
    users = mysqlTable("users", {
      id: int("id").autoincrement().primaryKey(),
      openId: varchar("openId", { length: 64 }).notNull().unique(),
      name: text("name"),
      email: varchar("email", { length: 320 }),
      phone: varchar("phone", { length: 20 }),
      wechatId: varchar("wechatId", { length: 100 }),
      // 微信号
      wechatOpenid: varchar("wechatOpenid", { length: 128 }).unique(),
      // 微信小程序 openid，用于微信登录
      avatar: text("avatar"),
      loginMethod: varchar("loginMethod", { length: 64 }),
      passwordHash: varchar("passwordHash", { length: 255 }),
      role: mysqlEnum("role", ["user", "coach", "admin"]).default("user").notNull(),
      // PKU Alumni
      pkuAlumni: boolean("pkuAlumni").default(false).notNull(),
      pkuInfo: json("pkuInfo").$type().default(null),
      // Moderation
      status: mysqlEnum("status", ["active", "warned", "banned"]).default("active").notNull(),
      banReason: text("banReason"),
      // reason for ban
      warningCount: int("warningCount").default(0).notNull(),
      warningHistory: json("warningHistory").$type().default([]),
      // 个人资料
      gender: mysqlEnum("gender", ["male", "female"]),
      city: varchar("city", { length: 50 }),
      tennisLevel: int("tennisLevel"),
      // 约球水平 1-5: 1入门 2初级 3中级 4中高级 5高级
      // NTRP 水平和信用体系
      ntrpLevel: decimal("ntrpLevel", { precision: 3, scale: 1 }),
      // NTRP 等级 1.0-6.0，步长 0.5
      creditScore: int("creditScore").default(100).notNull(),
      // 信用分 0-100，默认100
      consecutiveAttendCount: int("consecutiveAttendCount").default(0).notNull(),
      // 连续按时参加次数（达到3次自动恢复满分）
      creditRestoreApplied: boolean("creditRestoreApplied").default(false).notNull(),
      // 是否已提交信用分恢复申请
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
      lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
    });
    coachProfiles = mysqlTable("coach_profiles", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("userId").notNull(),
      // Basic info
      displayName: varchar("displayName", { length: 100 }).notNull(),
      tagline: varchar("tagline", { length: 200 }),
      // e.g. "前ATP职业球员 · 10年执教经验"
      bio: text("bio"),
      avatar: text("avatar"),
      coverImage: text("coverImage"),
      // Professional background
      yearsExperience: int("yearsExperience").default(0),
      certifications: json("certifications").$type().default([]),
      certificationImages: json("certificationImages").$type().default([]),
      // uploaded certificate image URLs
      specialties: json("specialties").$type().default([]),
      // e.g. ["发球技术","底线对抗","青少年培训"]
      achievements: json("achievements").$type().default([]),
      // Contact
      phone: varchar("phone", { length: 20 }),
      // coach's contact phone number
      // Social media & video
      socialLinks: json("socialLinks").$type().default({}),
      videoUrl: varchar("videoUrl", { length: 500 }),
      // intro video URL (YouTube/Bilibili/etc)
      // Content review status (for bio, social links, video etc.)
      contentReviewStatus: mysqlEnum("contentReviewStatus", ["pending", "approved", "rejected"]).default("pending").notNull(),
      contentReviewNote: text("contentReviewNote"),
      // admin note on content review
      // PKU Alumni discount (set by coach)
      pkuDiscount: int("pkuDiscount").default(0),
      // 0=no discount, 90=9折, 85=8.5折 etc.
      // Admin classification & sorting
      categoryTags: json("categoryTags").$type().default([]),
      // admin-set category tags
      sortWeight: int("sortWeight").default(0).notNull(),
      // admin manual sort weight (higher = first)
      // Pricing
      pricePerHour: decimal("pricePerHour", { precision: 10, scale: 2 }).notNull().default("600.00"),
      // Invite & promotion
      inviteCode: varchar("inviteCode", { length: 20 }).unique(),
      shareSlug: varchar("shareSlug", { length: 50 }).unique(),
      // for personal share page
      // Status
      isActive: boolean("isActive").default(true).notNull(),
      isVerified: boolean("isVerified").default(false).notNull(),
      // Verification workflow: pending → approved / rejected
      verificationStatus: mysqlEnum("verificationStatus", ["draft", "pending", "approved", "rejected"]).default("draft").notNull(),
      reviewNote: text("reviewNote"),
      // admin feedback on rejection
      totalLessons: int("totalLessons").default(0).notNull(),
      totalStudents: int("totalStudents").default(0).notNull(),
      avgRating: decimal("avgRating", { precision: 3, scale: 2 }).default("5.00"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    venues = mysqlTable("venues", {
      id: int("id").autoincrement().primaryKey(),
      name: varchar("name", { length: 100 }).notNull(),
      area: varchar("area", { length: 50 }).notNull(),
      // 区域，如「福田区」「南山区」
      district: varchar("district", { length: 50 }),
      // 子区域，如「大学城」「后海」
      operatorName: varchar("operatorName", { length: 200 }),
      // 运营方
      bookingMethod: varchar("bookingMethod", { length: 300 }),
      // 预约方式
      coverImage: text("coverImage"),
      // 封面图片URL（主图，用作约球背景）
      featureDesc: text("featureDesc"),
      // 特色描述
      address: varchar("address", { length: 200 }).notNull(),
      description: text("description"),
      facilities: json("facilities").$type().default([]),
      courtCount: int("courtCount").default(1).notNull(),
      courtTypes: json("courtTypes").$type().default([]),
      // e.g. ["硬地","红土"]
      pricePerHour: decimal("pricePerHour", { precision: 10, scale: 2 }).default("100.00"),
      openTime: varchar("openTime", { length: 10 }).default("08:00"),
      closeTime: varchar("closeTime", { length: 10 }).default("22:00"),
      phone: varchar("phone", { length: 20 }),
      images: json("images").$type().default([]),
      latitude: decimal("latitude", { precision: 10, scale: 7 }),
      longitude: decimal("longitude", { precision: 10, scale: 7 }),
      isActive: boolean("isActive").default(true).notNull(),
      mapUrl: varchar("mapUrl", { length: 500 }),
      // 高德地图链接
      bookingNote: text("bookingNote"),
      // 预约说明
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    coachVenues = mysqlTable("coach_venues", {
      id: int("id").autoincrement().primaryKey(),
      coachId: int("coachId").notNull(),
      venueId: int("venueId").notNull(),
      isPreferred: boolean("isPreferred").default(false),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    coachAvailability = mysqlTable("coach_availability", {
      id: int("id").autoincrement().primaryKey(),
      coachId: int("coachId").notNull(),
      // Recurring weekly availability
      dayOfWeek: int("dayOfWeek"),
      // 0=Sun, 1=Mon, ..., 6=Sat; null = specific date
      specificDate: varchar("specificDate", { length: 10 }),
      // YYYY-MM-DD for one-off slots
      startTime: varchar("startTime", { length: 5 }).notNull(),
      // HH:MM
      endTime: varchar("endTime", { length: 5 }).notNull(),
      // HH:MM
      isAvailable: boolean("isAvailable").default(true).notNull(),
      // Venue reservation by coach
      venueId: int("venueId"),
      // which venue the coach has reserved
      courtNo: varchar("courtNo", { length: 20 }),
      // specific court number e.g. "3号场"
      venueNote: varchar("venueNote", { length: 200 }),
      // extra note for students
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    bookings = mysqlTable("bookings", {
      id: int("id").autoincrement().primaryKey(),
      bookingNo: varchar("bookingNo", { length: 30 }).notNull().unique(),
      // e.g. BK20240527001
      studentId: int("studentId").notNull(),
      coachId: int("coachId").notNull(),
      venueId: int("venueId"),
      // null when student uses custom venue
      customVenueName: varchar("customVenueName", { length: 200 }),
      // student-supplied venue name
      customVenueAddress: varchar("customVenueAddress", { length: 500 }),
      // student-supplied address
      // Time
      lessonDate: varchar("lessonDate", { length: 10 }).notNull(),
      // YYYY-MM-DD
      startTime: varchar("startTime", { length: 5 }).notNull(),
      // HH:MM
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
        "pending",
        // 待确认（学员已支付，等待教练确认）
        "confirmed",
        // 已确认
        "completed",
        // 已完成
        "cancelled_by_student",
        "cancelled_by_coach",
        "rejected"
        // 教练拒绝
      ]).default("pending").notNull(),
      // Notes
      studentNote: text("studentNote"),
      coachNote: text("coachNote"),
      cancelReason: text("cancelReason"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
      confirmedAt: timestamp("confirmedAt"),
      completedAt: timestamp("completedAt"),
      cancelledAt: timestamp("cancelledAt")
    });
    payments = mysqlTable("payments", {
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
      platformFeeRate: decimal("platformFeeRate", { precision: 5, scale: 4 }).default("0.0500"),
      // 5%
      platformFee: decimal("platformFee", { precision: 10, scale: 2 }).default("0.00"),
      coachEarnings: decimal("coachEarnings", { precision: 10, scale: 2 }).default("0.00"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    reviews = mysqlTable("reviews", {
      id: int("id").autoincrement().primaryKey(),
      bookingId: int("bookingId").notNull().unique(),
      studentId: int("studentId").notNull(),
      coachId: int("coachId").notNull(),
      rating: int("rating").notNull(),
      // 1-5
      content: text("content"),
      tags: json("tags").$type().default([]),
      // e.g. ["专业","耐心","效果好"]
      isPublic: boolean("isPublic").default(true).notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    notifications = mysqlTable("notifications", {
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
        "system"
      ]).notNull(),
      title: varchar("title", { length: 200 }).notNull(),
      content: text("content").notNull(),
      relatedId: int("relatedId"),
      // bookingId or paymentId
      isRead: boolean("isRead").default(false).notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    coupons = mysqlTable("coupons", {
      id: int("id").autoincrement().primaryKey(),
      coachId: int("coachId"),
      // null = platform-wide
      code: varchar("code", { length: 30 }).notNull().unique(),
      name: varchar("name", { length: 100 }).notNull(),
      type: mysqlEnum("type", ["fixed", "percent"]).notNull(),
      // fixed amount or percentage
      discountValue: decimal("discountValue", { precision: 10, scale: 2 }).notNull(),
      minOrderAmount: decimal("minOrderAmount", { precision: 10, scale: 2 }).default("0.00"),
      maxUsageCount: int("maxUsageCount").default(100),
      usedCount: int("usedCount").default(0).notNull(),
      isFirstLesson: boolean("isFirstLesson").default(false),
      // first lesson only
      validFrom: timestamp("validFrom").notNull(),
      validUntil: timestamp("validUntil").notNull(),
      isActive: boolean("isActive").default(true).notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    couponUsages = mysqlTable("coupon_usages", {
      id: int("id").autoincrement().primaryKey(),
      couponId: int("couponId").notNull(),
      userId: int("userId").notNull(),
      bookingId: int("bookingId").notNull(),
      discountAmount: decimal("discountAmount", { precision: 10, scale: 2 }).notNull(),
      usedAt: timestamp("usedAt").defaultNow().notNull()
    });
    smsCodes = mysqlTable("sms_codes", {
      id: int("id").autoincrement().primaryKey(),
      phone: varchar("phone", { length: 20 }).notNull(),
      code: varchar("code", { length: 6 }).notNull(),
      purpose: mysqlEnum("purpose", ["login", "register"]).default("login").notNull(),
      isUsed: boolean("isUsed").default(false).notNull(),
      expiresAt: timestamp("expiresAt").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    inviteUsages = mysqlTable("invite_usages", {
      id: int("id").autoincrement().primaryKey(),
      coachId: int("coachId").notNull(),
      invitedUserId: int("invitedUserId").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    coachLocations = mysqlTable("coach_locations", {
      id: int("id").autoincrement().primaryKey(),
      coachId: int("coachId").notNull(),
      name: varchar("name", { length: 100 }).notNull(),
      // 地点名称，如「深大网球中心」
      address: varchar("address", { length: 300 }).notNull(),
      // 详细地址
      latitude: decimal("latitude", { precision: 10, scale: 7 }),
      longitude: decimal("longitude", { precision: 10, scale: 7 }),
      isPrimary: boolean("isPrimary").default(false).notNull(),
      // 主要教学地点
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    tennisMatches = mysqlTable("tennis_matches", {
      id: int("id").autoincrement().primaryKey(),
      authorId: int("authorId").notNull(),
      title: varchar("title", { length: 100 }).notNull(),
      matchType: mysqlEnum("matchType", ["singles", "doubles", "mixed_doubles", "practice", "group"]).notNull(),
      levelRequired: mysqlEnum("levelRequired", ["itf1", "itf2", "itf3", "itf4", "itf5", "itf6", "itf7", "itf8", "itf9", "itf10", "any"]).default("any").notNull(),
      matchDate: varchar("matchDate", { length: 10 }).notNull(),
      // YYYY-MM-DD
      startTime: varchar("startTime", { length: 5 }).notNull(),
      // HH:MM
      endTime: varchar("endTime", { length: 5 }),
      // HH:MM (optional)
      venueName: varchar("venueName", { length: 200 }).notNull(),
      venueAddress: varchar("venueAddress", { length: 300 }),
      courtNo: varchar("courtNo", { length: 50 }),
      // 场地号码，如「3号场」「A场」
      maxParticipants: int("maxParticipants").default(2).notNull(),
      // 2=单打, 4=双打
      currentParticipants: int("currentParticipants").default(1).notNull(),
      // includes author
      description: text("description"),
      contactInfo: varchar("contactInfo", { length: 200 }),
      // 联系方式（可选公开）
      costPerPerson: decimal("costPerPerson", { precision: 10, scale: 2 }),
      // 线下人均费用（可选）
      imageUrl: varchar("imageUrl", { length: 500 }),
      // 活动图片URL（可选）
      latitude: decimal("latitude", { precision: 10, scale: 7 }),
      // 地点纬度
      longitude: decimal("longitude", { precision: 10, scale: 7 }),
      // 地点经度
      // 城市扩展字段（当前只激活深圳，预留全国扩展接口）
      city: varchar("city", { length: 50 }).default("shenzhen").notNull(),
      // 城市 code，参考 shared/cities.ts
      // NTRP 水平要求（替换原 itf 字段，向下兼容）
      ntrpMin: decimal("ntrpMin", { precision: 3, scale: 1 }),
      // 最低 NTRP 要求
      ntrpMax: decimal("ntrpMax", { precision: 3, scale: 1 }),
      // 最高 NTRP 要求
      // 球局信息完善
      costSplitType: mysqlEnum("costSplitType", ["free", "aa", "host_pays", "custom"]).default("aa"),
      // 费用分摊方式
      bringOwnBall: boolean("bringOwnBall").default(false).notNull(),
      // 是否需要自带球
      // 支付相关字段
      feeRequired: boolean("feeRequired").default(false).notNull(),
      // 是否需要预付场地费
      feePerPerson: decimal("feePerPerson", { precision: 10, scale: 2 }),
      // 人均费用（元），feeRequired=true 时必填
      courtTotalFee: decimal("courtTotalFee", { precision: 10, scale: 2 }),
      // 场地总费用（元）= 发布时人均×名额上限；用于扩员重算人均、退差价
      paymentDeadline: timestamp("paymentDeadline"),
      // 支付截止时间（默认开球前1小时）
      status: mysqlEnum("status", ["open", "full", "cancelled", "completed"]).default("open").notNull(),
      circleId: int("circleId"),
      // 圈内专属球局（null 表示公开）
      circleOnly: boolean("circleOnly").default(false).notNull(),
      // 仅限圈内成员可见（公开列表不展示）
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    matchParticipants = mysqlTable("match_participants", {
      id: int("id").autoincrement().primaryKey(),
      matchId: int("matchId").notNull(),
      userId: int("userId").notNull(),
      status: mysqlEnum("status", ["pending", "confirmed", "rejected", "cancelled", "waitlist"]).default("confirmed").notNull(),
      // waitlist=候补名单（不计入 currentParticipants）
      message: text("message"),
      // 报名留言
      // 支付状态
      paymentStatus: mysqlEnum("paymentStatus", ["not_required", "pending", "paid", "refunded"]).default("not_required").notNull(),
      orderId: varchar("orderId", { length: 64 }),
      // 关联的支付订单号
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    lessonPackages = mysqlTable("lesson_packages", {
      id: int("id").autoincrement().primaryKey(),
      coachId: int("coachId").notNull(),
      name: varchar("name", { length: 100 }).notNull(),
      // 如「10节精品课」
      totalLessons: int("totalLessons").notNull(),
      // 课时数量
      price: decimal("price", { precision: 10, scale: 2 }).notNull(),
      // 套餐总价
      originalPrice: decimal("originalPrice", { precision: 10, scale: 2 }),
      // 原价（用于显示优惠）
      description: text("description"),
      isActive: boolean("isActive").default(true).notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    studentPackages = mysqlTable("student_packages", {
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
      paidAt: timestamp("paidAt")
    });
    packageDeductions = mysqlTable("package_deductions", {
      id: int("id").autoincrement().primaryKey(),
      studentPackageId: int("studentPackageId").notNull(),
      bookingId: int("bookingId"),
      // 关联预约（可选）
      deductedBy: int("deductedBy").notNull(),
      // 教练userId
      note: text("note"),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    matchReviews = mysqlTable("match_reviews", {
      id: int("id").autoincrement().primaryKey(),
      matchId: int("matchId").notNull(),
      // 关联球局
      reviewerId: int("reviewerId").notNull(),
      // 评价人
      revieweeId: int("revieweeId").notNull(),
      // 被评价人
      // 三个维度评分（1-5星）
      punctualityScore: int("punctualityScore").notNull(),
      // 准时度
      friendlinessScore: int("friendlinessScore").notNull(),
      // 友好度
      levelMatchScore: int("levelMatchScore").notNull(),
      // 水平符合度
      comment: text("comment"),
      // 文字评价（可选）
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    circles = mysqlTable("circles", {
      id: int("id").autoincrement().primaryKey(),
      name: varchar("name", { length: 100 }).notNull(),
      // 圈子名称，如「北大网球群」
      description: text("description"),
      // 圈子简介
      avatar: text("avatar"),
      // 圈子头像
      inviteCode: varchar("inviteCode", { length: 12 }).notNull().unique(),
      // 6位邀请码
      ownerId: int("ownerId").notNull(),
      // 创建者
      maxMembers: int("maxMembers").default(50).notNull(),
      // 最大成员数
      memberCount: int("memberCount").default(1).notNull(),
      // 当前成员数
      isPrivate: boolean("isPrivate").default(true).notNull(),
      // 是否私密（默认私密，旧字段保留兼容）
      // 入圈策略：invite_only=私密(仅邀请码) / approval=公开可申请(圈主审核) / open=公开自由加入
      joinPolicy: mysqlEnum("joinPolicy", ["invite_only", "approval", "open"]).default("approval").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    circleJoinRequests = mysqlTable("circle_join_requests", {
      id: int("id").autoincrement().primaryKey(),
      circleId: int("circleId").notNull(),
      userId: int("userId").notNull(),
      message: varchar("message", { length: 200 }),
      // 申请留言
      status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
      reviewedBy: int("reviewedBy"),
      // 审核人（圈主/管理员）
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    circleMembers = mysqlTable("circle_members", {
      id: int("id").autoincrement().primaryKey(),
      circleId: int("circleId").notNull(),
      userId: int("userId").notNull(),
      role: mysqlEnum("role", ["owner", "admin", "member"]).default("member").notNull(),
      joinedAt: timestamp("joinedAt").defaultNow().notNull()
    });
    circlePosts = mysqlTable("circle_posts", {
      id: int("id").autoincrement().primaryKey(),
      circleId: int("circleId").notNull(),
      authorId: int("authorId").notNull(),
      content: text("content").notNull(),
      isPinned: boolean("isPinned").default(false).notNull(),
      // 是否置顶
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    circlePostLikes = mysqlTable("circle_post_likes", {
      id: int("id").autoincrement().primaryKey(),
      postId: int("postId").notNull(),
      userId: int("userId").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    circlePostComments = mysqlTable("circle_post_comments", {
      id: int("id").autoincrement().primaryKey(),
      postId: int("postId").notNull(),
      circleId: int("circleId").notNull(),
      authorId: int("authorId").notNull(),
      content: text("content").notNull(),
      parentId: int("parentId"),
      // 可选，二级回复时指向父评论id
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    circleCheckins = mysqlTable("circle_checkins", {
      id: int("id").autoincrement().primaryKey(),
      circleId: int("circleId").notNull(),
      userId: int("userId").notNull(),
      content: varchar("content", { length: 200 }),
      // 打卡内容（可选）
      trainingMinutes: int("trainingMinutes").default(0),
      // 训练时长（分钟）
      checkinDate: varchar("checkinDate", { length: 10 }).notNull(),
      // YYYY-MM-DD
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    circleActivities = mysqlTable("circle_activities", {
      id: int("id").autoincrement().primaryKey(),
      circleId: int("circleId").notNull(),
      creatorId: int("creatorId").notNull(),
      title: varchar("title", { length: 100 }).notNull(),
      description: text("description"),
      activityDate: varchar("activityDate", { length: 10 }).notNull(),
      // YYYY-MM-DD
      startTime: varchar("startTime", { length: 5 }),
      // HH:MM
      endTime: varchar("endTime", { length: 5 }),
      // HH:MM (optional)
      venueName: varchar("venueName", { length: 100 }),
      maxParticipants: int("maxParticipants").default(20),
      currentParticipants: int("currentParticipants").default(0),
      status: mysqlEnum("status", ["open", "full", "cancelled", "completed"]).default("open").notNull(),
      repeatWeeks: int("repeatWeeks").default(0).notNull(),
      // 0=不重复, 1-4=重复周数
      seriesId: int("seriesId"),
      // 周期性系列的父活动ID
      // ── 圈内活动收费（路线一：无定金 + 赛后按到场平摊）──
      feeMode: mysqlEnum("feeMode", ["free", "aa"]).default("free").notNull(),
      // free=纯免费活动, aa=赛后AA平摊
      totalCost: int("totalCost").default(0).notNull(),
      // 发起人录入的实际总开销（分）
      settleStatus: mysqlEnum("settleStatus", ["none", "settling", "settled"]).default("none").notNull(),
      // 结算状态
      settledAt: timestamp("settledAt"),
      // 结算确认时间
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    circleActivitySignups = mysqlTable("circle_activity_signups", {
      id: int("id").autoincrement().primaryKey(),
      activityId: int("activityId").notNull(),
      userId: int("userId").notNull(),
      // ── 赛后结算相关（路线一）──
      attended: boolean("attended").default(true).notNull(),
      // 是否到场（方案A：默认全员到场）
      shareAmount: int("shareAmount").default(0).notNull(),
      // 应摊金额（分），结算时写入
      payStatus: mysqlEnum("payStatus", ["none", "unpaid", "paid"]).default("none").notNull(),
      // none=未结算, unpaid=待支付, paid=已支付
      orderId: varchar("orderId", { length: 64 }),
      // 微信支付订单号
      paidAt: timestamp("paidAt"),
      // 支付完成时间
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    activityTemplates = mysqlTable("activity_templates", {
      id: int("id").autoincrement().primaryKey(),
      circleId: int("circleId").notNull(),
      title: varchar("title", { length: 100 }).notNull(),
      startTime: varchar("startTime", { length: 5 }),
      // HH:MM
      endTime: varchar("endTime", { length: 5 }),
      // HH:MM
      venueName: varchar("venueName", { length: 100 }),
      maxParticipants: int("maxParticipants").default(20).notNull(),
      feeMode: mysqlEnum("feeMode", ["free", "aa"]).default("free").notNull(),
      description: text("description"),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    partnerVenues = mysqlTable("partner_venues", {
      id: int("id").autoincrement().primaryKey(),
      name: varchar("name", { length: 100 }).notNull(),
      // 场馆名称
      address: varchar("address", { length: 200 }),
      // 地址
      district: varchar("district", { length: 50 }),
      // 区域（南山/福田/罗湖等）
      phone: varchar("phone", { length: 20 }),
      // 联系电话
      imageUrl: text("imageUrl"),
      // 封面图
      bookingUrl: text("bookingUrl"),
      // 外部预订链接
      description: text("description"),
      // 简介
      courtCount: int("courtCount").default(0),
      // 总场地数
      priceRange: varchar("priceRange", { length: 50 }),
      // 价格区间，如 "50-120元/小时"
      amenities: json("amenities").$type().default([]),
      // 设施标签，如 ["停车场","淋浴","灯光场"]
      isActive: boolean("isActive").default(true).notNull(),
      // 是否上线展示
      sortOrder: int("sortOrder").default(0),
      // 排序权重
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    venueAvailableSlots = mysqlTable("venue_available_slots", {
      id: int("id").autoincrement().primaryKey(),
      venueId: int("venueId").notNull(),
      slotDate: varchar("slotDate", { length: 10 }).notNull(),
      // YYYY-MM-DD
      startTime: varchar("startTime", { length: 5 }).notNull(),
      // HH:MM
      endTime: varchar("endTime", { length: 5 }).notNull(),
      // HH:MM
      courtName: varchar("courtName", { length: 50 }),
      // 场地名称，如 "1号场"
      courtType: mysqlEnum("courtType", ["hard", "clay", "grass", "indoor"]).default("hard"),
      // 场地类型
      price: decimal("price", { precision: 8, scale: 2 }),
      // 单价（元/小时）
      isBooked: boolean("isBooked").default(false).notNull(),
      // 是否已被预订
      remark: varchar("remark", { length: 100 }),
      // 备注
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    creditLogs = mysqlTable("credit_logs", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("userId").notNull(),
      // 用户 ID
      delta: int("delta").notNull(),
      // 变动值（负数为扣分，正数为加分）
      reason: varchar("reason", { length: 200 }).notNull(),
      // 变动原因说明
      matchId: int("matchId"),
      // 关联球局 ID（可选）
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    matchReplaceInvites = mysqlTable("match_replace_invites", {
      id: int("id").autoincrement().primaryKey(),
      matchId: int("matchId").notNull(),
      // 关联球局 ID
      fromUserId: int("fromUserId").notNull(),
      // 发起替代的用户（原参与者）
      toUserId: int("toUserId"),
      // 接受替代的用户（接受后填入）
      token: varchar("token", { length: 64 }).notNull().unique(),
      // 唯一邀请 token
      status: mysqlEnum("status", ["pending", "accepted", "expired"]).default("pending").notNull(),
      expiresAt: timestamp("expiresAt").notNull(),
      // 过期时间（开球时间）
      acceptedAt: timestamp("acceptedAt"),
      // 接受时间
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    matchOrders = mysqlTable("match_orders", {
      id: int("id").autoincrement().primaryKey(),
      orderId: varchar("orderId", { length: 64 }).notNull().unique(),
      // 平台订单号，如 MO20260616001
      matchId: int("matchId").notNull(),
      // 关联球局 ID
      userId: int("userId").notNull(),
      // 付款用户 ID
      amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
      // 支付金额（元）
      status: mysqlEnum("status", [
        "pending",
        // 待支付
        "paid",
        // 已支付（资金托管中）
        "refunding",
        // 退款中
        "refunded",
        // 已退款
        "settled"
        // 已结算给发起者
      ]).default("pending").notNull(),
      wxPrepayId: varchar("wxPrepayId", { length: 100 }),
      // 微信预支付 ID
      wxTransactionId: varchar("wxTransactionId", { length: 64 }),
      // 微信支付交易号
      refundId: varchar("refundId", { length: 64 }),
      // 微信退款单号
      refundReason: varchar("refundReason", { length: 200 }),
      // 退款原因
      paidAt: timestamp("paidAt"),
      // 支付时间
      refundedAt: timestamp("refundedAt"),
      // 退款时间
      settledAt: timestamp("settledAt"),
      // 结算时间
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    matchSettlements = mysqlTable("match_settlements", {
      id: int("id").autoincrement().primaryKey(),
      matchId: int("matchId").notNull().unique(),
      // 关联球局 ID（每局只有一条）
      organizerId: int("organizerId").notNull(),
      // 发起者 ID（收款方）
      totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),
      // 应结算总金额
      platformFee: decimal("platformFee", { precision: 10, scale: 2 }).default("0.00").notNull(),
      // 平台手续费（预留）
      netAmount: decimal("netAmount", { precision: 10, scale: 2 }).notNull(),
      // 实际到账金额
      status: mysqlEnum("status", [
        "pending",
        // 待结算（球局结束，等待发起者确认）
        "confirming",
        // 确认中（发起者已确认，24小时异议期）
        "disputed",
        // 有异议（冻结，等待平台处理）
        "settled",
        // 已结算（已打款给发起者）
        "cancelled"
        // 已取消（球局取消，全额退款）
      ]).default("pending").notNull(),
      confirmedAt: timestamp("confirmedAt"),
      // 发起者确认时间
      settledAt: timestamp("settledAt"),
      // 结算完成时间
      wxBatchId: varchar("wxBatchId", { length: 64 }),
      // 微信企业付款批次号
      disputeReason: text("disputeReason"),
      // 异议原因
      disputeUserId: int("disputeUserId"),
      // 提出异议的用户 ID
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    matchMessages = mysqlTable("match_messages", {
      id: int("id").autoincrement().primaryKey(),
      matchId: int("matchId").notNull(),
      // 关联球局 ID
      userId: int("userId").notNull(),
      // 发送者 ID
      content: text("content").notNull(),
      // 消息内容
      msgType: mysqlEnum("msgType", [
        "text",
        // 普通文字
        "image",
        // 图片消息（content 存储图片 URL）
        "system"
        // 系统通知（如：xxx 加入了球局）
      ]).default("text").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    feedbacks = mysqlTable("feedbacks", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("userId").notNull(),
      // 提交用户 ID
      content: text("content").notNull(),
      // 反馈内容
      contact: varchar("contact", { length: 100 }),
      // 联系方式（可选）
      category: mysqlEnum("category", [
        "suggestion",
        // 功能建议
        "bug",
        // 问题反馈
        "other"
        // 其他
      ]).default("other").notNull(),
      status: mysqlEnum("status", [
        "pending",
        // 待处理
        "replied",
        // 已回复
        "closed"
        // 已关闭
      ]).default("pending").notNull(),
      adminReply: text("adminReply"),
      // 管理员回复内容
      repliedAt: timestamp("repliedAt"),
      // 回复时间
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
  }
});

// server/_core/env.ts
var ENV;
var init_env = __esm({
  "server/_core/env.ts"() {
    "use strict";
    ENV = {
      appId: process.env.VITE_APP_ID ?? "",
      cookieSecret: process.env.JWT_SECRET ?? "",
      databaseUrl: process.env.DATABASE_URL ?? "",
      oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
      ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
      isProduction: process.env.NODE_ENV === "production",
      forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
      forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
      // 微信小程序
      wechatAppId: process.env.WECHAT_APP_ID ?? "",
      wechatAppSecret: process.env.WECHAT_APP_SECRET ?? ""
    };
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  activateStudentPackage: () => activateStudentPackage,
  addCoachLocation: () => addCoachLocation,
  addCoachReservedSlot: () => addCoachReservedSlot,
  addCoachVenue: () => addCoachVenue,
  addCoachWeeklySlot: () => addCoachWeeklySlot,
  addCreditLog: () => addCreditLog,
  applyCreditRestore: () => applyCreditRestore,
  approveCreditRestore: () => approveCreditRestore,
  bindWechatOpenid: () => bindWechatOpenid,
  countUsers: () => countUsers,
  createBooking: () => createBooking,
  createCoachProfile: () => createCoachProfile,
  createCoupon: () => createCoupon,
  createFeedback: () => createFeedback,
  createLessonPackage: () => createLessonPackage,
  createMatchReview: () => createMatchReview,
  createNotification: () => createNotification,
  createPayment: () => createPayment,
  createReview: () => createReview,
  createSmsCode: () => createSmsCode,
  createStudentPackage: () => createStudentPackage,
  createTennisMatch: () => createTennisMatch,
  createUserByWechat: () => createUserByWechat,
  createVenue: () => createVenue,
  deductStudentPackageLesson: () => deductStudentPackageLesson,
  deleteLessonPackage: () => deleteLessonPackage,
  deleteNotification: () => deleteNotification,
  deleteUserById: () => deleteUserById,
  getAllFeedbacks: () => getAllFeedbacks,
  getAllVenues: () => getAllVenues,
  getBookingById: () => getBookingById,
  getBookingsByCoach: () => getBookingsByCoach,
  getBookingsByStudent: () => getBookingsByStudent,
  getCoachAvailability: () => getCoachAvailability,
  getCoachCoupons: () => getCoachCoupons,
  getCoachEarnings: () => getCoachEarnings,
  getCoachIdsByWeeklyAvailability: () => getCoachIdsByWeeklyAvailability,
  getCoachLocations: () => getCoachLocations,
  getCoachProfileById: () => getCoachProfileById,
  getCoachProfileBySlug: () => getCoachProfileBySlug,
  getCoachProfileByUserId: () => getCoachProfileByUserId,
  getCoachProfiles: () => getCoachProfiles,
  getCoachReservedSlots: () => getCoachReservedSlots,
  getCoachReservedSlotsPublic: () => getCoachReservedSlotsPublic,
  getCoachReviews: () => getCoachReviews,
  getCoachStats: () => getCoachStats,
  getCoachStudents: () => getCoachStudents,
  getCoachVenues: () => getCoachVenues,
  getCouponByCode: () => getCouponByCode,
  getCreditLogs: () => getCreditLogs,
  getDb: () => getDb,
  getFeedbackById: () => getFeedbackById,
  getFeedbacksByUser: () => getFeedbacksByUser,
  getLessonPackageById: () => getLessonPackageById,
  getLessonPackagesByCoach: () => getLessonPackagesByCoach,
  getMatchParticipant: () => getMatchParticipant,
  getMatchParticipants: () => getMatchParticipants,
  getMatchReviews: () => getMatchReviews,
  getNotifications: () => getNotifications,
  getPackageDeductions: () => getPackageDeductions,
  getPaymentByBookingId: () => getPaymentByBookingId,
  getPendingCreditRestoreList: () => getPendingCreditRestoreList,
  getPendingFeedbackCount: () => getPendingFeedbackCount,
  getPlatformStats: () => getPlatformStats,
  getRecentMatchOrders: () => getRecentMatchOrders,
  getReviewByBookingId: () => getReviewByBookingId,
  getStudentPackageById: () => getStudentPackageById,
  getStudentPackages: () => getStudentPackages,
  getStudentPackagesByCoach: () => getStudentPackagesByCoach,
  getTennisMatchById: () => getTennisMatchById,
  getTennisMatches: () => getTennisMatches,
  getUnreadNotificationCount: () => getUnreadNotificationCount,
  getUserByEmail: () => getUserByEmail,
  getUserById: () => getUserById,
  getUserByOpenId: () => getUserByOpenId,
  getUserByPhone: () => getUserByPhone,
  getUserByWechatOpenid: () => getUserByWechatOpenid,
  getUserReviews: () => getUserReviews,
  getUserTennisMatches: () => getUserTennisMatches,
  getValidSmsCode: () => getValidSmsCode,
  getVenueById: () => getVenueById,
  getVenues: () => getVenues,
  hasUserReviewed: () => hasUserReviewed,
  joinTennisMatch: () => joinTennisMatch,
  leaveTennisMatch: () => leaveTennisMatch,
  listUsers: () => listUsers,
  markNotificationsRead: () => markNotificationsRead,
  markSmsCodeUsed: () => markSmsCodeUsed,
  recordAttendAndCheckRestore: () => recordAttendAndCheckRestore,
  recordOrganizerReward: () => recordOrganizerReward,
  removeCoachLocation: () => removeCoachLocation,
  removeCoachReservedSlot: () => removeCoachReservedSlot,
  removeCoachVenue: () => removeCoachVenue,
  removeCoachWeeklySlot: () => removeCoachWeeklySlot,
  replyFeedback: () => replyFeedback,
  requestStudentPackageRefund: () => requestStudentPackageRefund,
  setCoachAvailability: () => setCoachAvailability,
  setCoachVenuePreferred: () => setCoachVenuePreferred,
  setPrimaryCoachLocation: () => setPrimaryCoachLocation,
  setUserPasswordHash: () => setUserPasswordHash,
  updateBookingStatus: () => updateBookingStatus,
  updateCoachProfile: () => updateCoachProfile,
  updatePaymentStatus: () => updatePaymentStatus,
  updateTennisMatchParticipantCount: () => updateTennisMatchParticipantCount,
  updateTennisMatchStatus: () => updateTennisMatchStatus,
  updateUserModeration: () => updateUserModeration,
  upsertUser: () => upsertUser
});
import { eq, desc, asc, and, sql, inArray, lte, isNotNull, gte, or, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
async function getDb() {
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
async function upsertUser(user) {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values = { openId: user.openId };
  const updateSet = {};
  const fields = ["name", "email", "loginMethod", "phone", "wechatId", "avatar"];
  for (const f of fields) {
    if (user[f] !== void 0) {
      values[f] = user[f] ?? null;
      updateSet[f] = user[f] ?? null;
    }
  }
  if (user.lastSignedIn !== void 0) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== void 0) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = /* @__PURE__ */ new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = /* @__PURE__ */ new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}
async function getUserByWechatOpenid(wechatOpenid) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.wechatOpenid, wechatOpenid)).limit(1);
  return result[0];
}
async function bindWechatOpenid(userId, wechatOpenid) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ wechatOpenid }).where(eq(users.id, userId));
}
async function createUserByWechat(wechatOpenid, name, avatar) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const internalOpenId = `wx_${wechatOpenid}`;
  await db.insert(users).values({
    openId: internalOpenId,
    wechatOpenid,
    name: name ?? "\u5FAE\u4FE1\u7528\u6237",
    avatar: avatar ?? null,
    loginMethod: "wechat",
    lastSignedIn: /* @__PURE__ */ new Date()
  }).onDuplicateKeyUpdate({ set: { lastSignedIn: /* @__PURE__ */ new Date() } });
  const result = await db.select().from(users).where(eq(users.openId, internalOpenId)).limit(1);
  return result[0];
}
async function getUserById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}
async function listUsers(opts) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(users).$dynamic();
  if (opts?.search) {
    const like2 = `%${opts.search}%`;
    query = query.where(
      or(
        sql`${users.name} LIKE ${like2}`,
        sql`${users.email} LIKE ${like2}`,
        sql`${users.openId} LIKE ${like2}`
      )
    );
  }
  return query.orderBy(desc(users.createdAt)).limit(opts?.limit ?? 50).offset(opts?.offset ?? 0);
}
async function countUsers(search) {
  const db = await getDb();
  if (!db) return 0;
  let query = db.select({ count: sql`COUNT(*)` }).from(users).$dynamic();
  if (search) {
    const like2 = `%${search}%`;
    query = query.where(
      or(
        sql`${users.name} LIKE ${like2}`,
        sql`${users.email} LIKE ${like2}`,
        sql`${users.openId} LIKE ${like2}`
      )
    );
  }
  const result = await query;
  return Number(result[0]?.count ?? 0);
}
async function updateUserModeration(id, data) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, id));
}
async function deleteUserById(id) {
  const db = await getDb();
  if (!db) return;
  await db.delete(reviews).where(eq(reviews.studentId, id));
  await db.delete(reviews).where(eq(reviews.coachId, id));
  await db.delete(couponUsages).where(eq(couponUsages.userId, id));
  await db.delete(payments).where(eq(payments.studentId, id));
  await db.delete(payments).where(eq(payments.coachId, id));
  await db.delete(bookings).where(eq(bookings.studentId, id));
  await db.delete(bookings).where(eq(bookings.coachId, id));
  const profile = await getCoachProfileByUserId(id);
  if (profile) {
    await db.delete(coachAvailability).where(eq(coachAvailability.coachId, profile.id));
    await db.delete(coachVenues).where(eq(coachVenues.coachId, profile.id));
    await db.delete(coachProfiles).where(eq(coachProfiles.userId, id));
  }
  await db.delete(notifications).where(eq(notifications.userId, id));
  await db.delete(users).where(eq(users.id, id));
}
async function getCoachProfiles(opts) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(coachProfiles).where(eq(coachProfiles.isActive, true)).orderBy(desc(coachProfiles.sortWeight), desc(coachProfiles.totalLessons)).limit(opts?.limit ?? 20).offset(opts?.offset ?? 0);
}
async function getCoachProfileById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(coachProfiles).where(eq(coachProfiles.id, id)).limit(1);
  return result[0];
}
async function getCoachProfileByUserId(userId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(coachProfiles).where(eq(coachProfiles.userId, userId)).limit(1);
  return result[0];
}
async function getCoachProfileBySlug(slug) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(coachProfiles).where(eq(coachProfiles.shareSlug, slug)).limit(1);
  return result[0];
}
async function createCoachProfile(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(coachProfiles).values(data);
  return result;
}
async function updateCoachProfile(id, data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(coachProfiles).set(data).where(eq(coachProfiles.id, id));
}
async function getVenues(opts) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(venues.isActive, true)];
  if (opts?.area) conditions.push(eq(venues.area, opts.area));
  if (opts?.search) {
    const kw = `%${opts.search}%`;
    conditions.push(
      or(
        sql`${venues.name} LIKE ${kw}`,
        sql`${venues.district} LIKE ${kw}`,
        sql`${venues.address} LIKE ${kw}`,
        sql`${venues.area} LIKE ${kw}`
      )
    );
  }
  return db.select().from(venues).where(and(...conditions)).orderBy(asc(venues.name)).limit(opts?.limit ?? 100);
}
async function getVenueById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(venues).where(eq(venues.id, id)).limit(1);
  return result[0];
}
async function createVenue(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(venues).values(data);
  return result;
}
async function getCoachVenues(coachId) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ venue: venues, isPreferred: coachVenues.isPreferred }).from(coachVenues).innerJoin(venues, eq(coachVenues.venueId, venues.id)).where(eq(coachVenues.coachId, coachId));
}
async function getCoachAvailability(coachId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(coachAvailability).where(
    and(eq(coachAvailability.coachId, coachId), eq(coachAvailability.isAvailable, true))
  );
}
async function setCoachAvailability(coachId, slots) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(coachAvailability).where(eq(coachAvailability.coachId, coachId));
  if (slots.length > 0) {
    await db.insert(coachAvailability).values(
      slots.map((s) => ({ coachId, ...s, isAvailable: true }))
    );
  }
}
async function addCoachWeeklySlot(coachId, dayOfWeek, startTime, endTime, specificDate) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(coachAvailability).values({
    coachId,
    dayOfWeek,
    startTime,
    endTime,
    isAvailable: true,
    ...specificDate ? { specificDate } : {}
  });
}
async function removeCoachWeeklySlot(coachId, slotId) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(coachAvailability).where(
    and(eq(coachAvailability.id, slotId), eq(coachAvailability.coachId, coachId))
  );
}
async function getCoachIdsByWeeklyAvailability(dayOfWeek, startTime, endTime) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ coachId: coachAvailability.coachId }).from(coachAvailability).where(
    and(
      eq(coachAvailability.dayOfWeek, dayOfWeek),
      eq(coachAvailability.isAvailable, true),
      sql`${coachAvailability.startTime} <= ${startTime}`,
      sql`${coachAvailability.endTime} >= ${endTime}`
    )
  );
  const ids = rows.map((r) => r.coachId);
  return ids.filter((id, idx) => ids.indexOf(id) === idx);
}
async function createBooking(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(bookings).values(data);
  return result;
}
async function getBookingById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  return result[0];
}
async function getBookingsByStudent(studentId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bookings).where(eq(bookings.studentId, studentId)).orderBy(desc(bookings.createdAt));
}
async function getBookingsByCoach(coachId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bookings).where(eq(bookings.coachId, coachId)).orderBy(desc(bookings.createdAt));
}
async function updateBookingStatus(id, status, extra) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(bookings).set({ status, ...extra }).where(eq(bookings.id, id));
}
async function createPayment(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const platformFeeRate = 0.05;
  const platformFee = (parseFloat(data.amount) * platformFeeRate).toFixed(2);
  const coachEarnings = (parseFloat(data.amount) - parseFloat(platformFee)).toFixed(2);
  const [result] = await db.insert(payments).values({
    ...data,
    platformFeeRate: platformFeeRate.toString(),
    platformFee,
    coachEarnings
  });
  return result;
}
async function updatePaymentStatus(bookingId, status) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(payments).set({
    status,
    paidAt: status === "paid" ? /* @__PURE__ */ new Date() : void 0
  }).where(eq(payments.bookingId, bookingId));
}
async function getPaymentByBookingId(bookingId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(payments).where(eq(payments.bookingId, bookingId)).limit(1);
  return result[0];
}
async function getCoachEarnings(coachId) {
  const db = await getDb();
  if (!db) return { total: 0, settled: 0, pending: 0 };
  const rows = await db.select().from(payments).where(
    and(eq(payments.coachId, coachId), eq(payments.status, "paid"))
  );
  const total = rows.reduce((s, r) => s + parseFloat(r.coachEarnings ?? "0"), 0);
  const settled = rows.filter((r) => r.settlementStatus === "settled").reduce((s, r) => s + parseFloat(r.coachEarnings ?? "0"), 0);
  return { total, settled, pending: total - settled };
}
async function getCoachReviews(coachId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reviews).where(and(eq(reviews.coachId, coachId), eq(reviews.isPublic, true))).orderBy(desc(reviews.createdAt)).limit(20);
}
async function createReview(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(reviews).values(data);
  const allReviews = await db.select().from(reviews).where(eq(reviews.coachId, data.coachId));
  const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
  await db.update(coachProfiles).set({ avgRating: avg.toFixed(2) }).where(eq(coachProfiles.id, data.coachId));
  return result;
}
async function createNotification(data) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values(data);
}
async function getNotifications(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(50);
}
async function markNotificationsRead(userId, ids) {
  const db = await getDb();
  if (!db) return;
  if (ids && ids.length > 0) {
    await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.userId, userId), inArray(notifications.id, ids)));
  } else {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
  }
}
async function getUnreadNotificationCount(userId) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: count() }).from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return result[0]?.count ?? 0;
}
async function deleteNotification(userId, id) {
  const db = await getDb();
  if (!db) return;
  await db.delete(notifications).where(and(eq(notifications.userId, userId), eq(notifications.id, id)));
}
async function getCouponByCode(code) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(coupons).where(and(eq(coupons.code, code), eq(coupons.isActive, true))).limit(1);
  return result[0];
}
async function getCoachCoupons(coachId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(coupons).where(eq(coupons.coachId, coachId));
}
async function createCoupon(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(coupons).values(data);
  return result;
}
async function getCoachStats(coachId) {
  const db = await getDb();
  if (!db) return { totalLessons: 0, totalStudents: 0, monthlyLessons: 0, monthlyEarnings: 0 };
  const allBookings = await db.select().from(bookings).where(
    and(eq(bookings.coachId, coachId), eq(bookings.status, "completed"))
  );
  const now = /* @__PURE__ */ new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyBookings = allBookings.filter((b) => new Date(b.createdAt) >= monthStart);
  const uniqueStudents = new Set(allBookings.map((b) => b.studentId)).size;
  const monthlyEarnings = monthlyBookings.reduce((s, b) => s + parseFloat(b.finalAmount), 0);
  return {
    totalLessons: allBookings.length,
    totalStudents: uniqueStudents,
    monthlyLessons: monthlyBookings.length,
    monthlyEarnings
  };
}
async function getCoachStudents(coachId) {
  const db = await getDb();
  if (!db) return [];
  const coachBookings = await db.select().from(bookings).where(eq(bookings.coachId, coachId)).orderBy(desc(bookings.createdAt));
  const studentIds = Array.from(new Set(coachBookings.map((b) => b.studentId)));
  if (studentIds.length === 0) return [];
  const studentUsers = await db.select().from(users).where(inArray(users.id, studentIds));
  return studentUsers.map((u) => {
    const studentBookings = coachBookings.filter((b) => b.studentId === u.id);
    const completedBookings = studentBookings.filter((b) => b.status === "completed");
    const totalSpent = completedBookings.reduce((s, b) => s + parseFloat(b.finalAmount), 0);
    return {
      ...u,
      totalLessons: completedBookings.length,
      totalSpent,
      lastLesson: studentBookings[0]?.lessonDate
    };
  });
}
async function getPlatformStats() {
  const db = await getDb();
  if (!db) return { totalCoaches: 0, totalStudents: 0, totalBookings: 0, totalRevenue: 0 };
  const [coachCount] = await db.select({ count: sql`count(*)` }).from(coachProfiles).where(eq(coachProfiles.isActive, true));
  const [studentCount] = await db.select({ count: sql`count(*)` }).from(users).where(eq(users.role, "user"));
  const [bookingCount] = await db.select({ count: sql`count(*)` }).from(bookings);
  const paidPayments = await db.select().from(payments).where(eq(payments.status, "paid"));
  const totalRevenue = paidPayments.reduce((s, p) => s + parseFloat(p.amount), 0);
  return {
    totalCoaches: coachCount?.count ?? 0,
    totalStudents: studentCount?.count ?? 0,
    totalBookings: bookingCount?.count ?? 0,
    totalRevenue
  };
}
async function createSmsCode(phone, code, expiresAt) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(smsCodes).set({ isUsed: true }).where(
    and(eq(smsCodes.phone, phone), eq(smsCodes.isUsed, false))
  );
  await db.insert(smsCodes).values({ phone, code, expiresAt });
}
async function getValidSmsCode(phone, code) {
  const db = await getDb();
  if (!db) return void 0;
  const now = /* @__PURE__ */ new Date();
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
async function markSmsCodeUsed(id) {
  const db = await getDb();
  if (!db) return;
  await db.update(smsCodes).set({ isUsed: true }).where(eq(smsCodes.id, id));
}
async function getUserByPhone(phone) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  return result[0];
}
async function getUserByEmail(email) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}
async function setUserPasswordHash(openId, passwordHash) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(users).set({ passwordHash }).where(eq(users.openId, openId));
}
async function addCoachVenue(coachId, venueId, isPreferred = false) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(coachVenues).values({ coachId, venueId, isPreferred }).onDuplicateKeyUpdate({ set: { isPreferred } });
}
async function removeCoachVenue(coachId, venueId) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(coachVenues).where(
    and(eq(coachVenues.coachId, coachId), eq(coachVenues.venueId, venueId))
  );
}
async function setCoachVenuePreferred(coachId, venueId, isPreferred) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(coachVenues).set({ isPreferred }).where(and(eq(coachVenues.coachId, coachId), eq(coachVenues.venueId, venueId)));
}
async function getAllVenues() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(venues).where(eq(venues.isActive, true)).orderBy(venues.area, venues.name);
}
async function getReviewByBookingId(bookingId) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(reviews).where(eq(reviews.bookingId, bookingId)).limit(1);
  return rows[0] ?? null;
}
async function addCoachReservedSlot(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await db.select({
    id: coachAvailability.id,
    specificDate: coachAvailability.specificDate,
    startTime: coachAvailability.startTime,
    endTime: coachAvailability.endTime
  }).from(coachAvailability).where(
    and(
      eq(coachAvailability.coachId, data.coachId),
      eq(coachAvailability.specificDate, data.specificDate),
      eq(coachAvailability.isAvailable, true)
    )
  );
  const conflict = existing.find((slot) => {
    return data.startTime < slot.endTime && data.endTime > slot.startTime;
  });
  if (conflict) {
    throw new Error(`\u65F6\u95F4\u51B2\u7A81\uFF1A\u8BE5\u65E5\u671F ${data.specificDate} \u5DF2\u6709\u65F6\u6BB5 ${conflict.startTime}\u2013${conflict.endTime}\uFF0C\u4E0E\u65B0\u589E\u65F6\u6BB5\u91CD\u53E0\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9\u65F6\u95F4`);
  }
  const [result] = await db.insert(coachAvailability).values({
    coachId: data.coachId,
    specificDate: data.specificDate,
    startTime: data.startTime,
    endTime: data.endTime,
    venueId: data.venueId,
    courtNo: data.courtNo ?? null,
    venueNote: data.venueNote ?? null,
    isAvailable: true
  });
  return result;
}
async function removeCoachReservedSlot(slotId, coachId) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(coachAvailability).where(
    and(eq(coachAvailability.id, slotId), eq(coachAvailability.coachId, coachId))
  );
}
async function getCoachReservedSlots(coachId) {
  const db = await getDb();
  if (!db) return [];
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
    venueMapUrl: venues.mapUrl
  }).from(coachAvailability).leftJoin(venues, eq(coachAvailability.venueId, venues.id)).where(
    and(
      eq(coachAvailability.coachId, coachId),
      eq(coachAvailability.isAvailable, true),
      // only slots that have a venue reserved
      isNotNull(coachAvailability.venueId)
    )
  ).orderBy(coachAvailability.specificDate, coachAvailability.startTime);
  return slots;
}
async function getCoachReservedSlotsPublic(coachId) {
  const db = await getDb();
  if (!db) return [];
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
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
    venueMapUrl: venues.mapUrl
  }).from(coachAvailability).leftJoin(venues, eq(coachAvailability.venueId, venues.id)).where(
    and(
      eq(coachAvailability.coachId, coachId),
      eq(coachAvailability.isAvailable, true),
      isNotNull(coachAvailability.venueId),
      gte(coachAvailability.specificDate, today)
    )
  ).orderBy(coachAvailability.specificDate, coachAvailability.startTime);
  return slots;
}
async function getCoachLocations(coachId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(coachLocations).where(eq(coachLocations.coachId, coachId)).orderBy(desc(coachLocations.isPrimary), coachLocations.createdAt);
}
async function addCoachLocation(coachId, data) {
  const db = await getDb();
  if (!db) return;
  if (data.isPrimary) {
    await db.update(coachLocations).set({ isPrimary: false }).where(eq(coachLocations.coachId, coachId));
  }
  await db.insert(coachLocations).values({ coachId, ...data });
}
async function removeCoachLocation(coachId, locationId) {
  const db = await getDb();
  if (!db) return;
  await db.delete(coachLocations).where(and(eq(coachLocations.id, locationId), eq(coachLocations.coachId, coachId)));
}
async function setPrimaryCoachLocation(coachId, locationId) {
  const db = await getDb();
  if (!db) return;
  await db.update(coachLocations).set({ isPrimary: false }).where(eq(coachLocations.coachId, coachId));
  await db.update(coachLocations).set({ isPrimary: true }).where(and(eq(coachLocations.id, locationId), eq(coachLocations.coachId, coachId)));
}
async function getTennisMatches(opts) {
  const db = await getDb();
  if (!db) return [];
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
    updatedAt: tennisMatches.updatedAt
  };
  const conditions = [];
  if (opts?.status) conditions.push(eq(tennisMatches.status, opts.status));
  if (opts?.matchType) conditions.push(eq(tennisMatches.matchType, opts.matchType));
  if (opts?.levelRequired) conditions.push(eq(tennisMatches.levelRequired, opts.levelRequired));
  if (opts?.dateFrom) conditions.push(gte(tennisMatches.matchDate, opts.dateFrom));
  if (opts?.dateTo) conditions.push(lte(tennisMatches.matchDate, opts.dateTo));
  if (opts?.city) conditions.push(eq(tennisMatches.city, opts.city));
  function sortMatches(rows) {
    function statusPriority(status) {
      if (status === "open") return 0;
      if (status === "full") return 1;
      return 2;
    }
    return rows.sort((a, b) => {
      const aPri = statusPriority(a.status);
      const bPri = statusPriority(b.status);
      if (aPri !== bPri) return aPri - bPri;
      const aKey = `${a.matchDate}T${a.startTime}`;
      const bKey = `${b.matchDate}T${b.startTime}`;
      return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
    });
  }
  try {
    const fullSelect = { ...safeSelect, circleId: tennisMatches.circleId, circleOnly: tennisMatches.circleOnly };
    const publicConditions = [...conditions, eq(tennisMatches.circleOnly, false)];
    const query = db.select(fullSelect).from(tennisMatches).$dynamic();
    query.where(and(...publicConditions));
    query.orderBy(asc(tennisMatches.matchDate), asc(tennisMatches.startTime));
    if (opts?.limit) query.limit(opts.limit);
    if (opts?.offset) query.offset(opts.offset);
    const results = await query;
    let filtered = results;
    if (!opts?.status) {
      filtered = filtered.filter((m) => m.status !== "cancelled");
    }
    if (opts?.onlyAvailable) {
      filtered = filtered.filter((m) => m.status === "open" && m.currentParticipants < m.maxParticipants);
    }
    if (opts?.ntrpMin !== void 0) {
      filtered = filtered.filter((m) => m.ntrpMax === null || Number(m.ntrpMax) >= opts.ntrpMin);
    }
    if (opts?.ntrpMax !== void 0) {
      filtered = filtered.filter((m) => m.ntrpMin === null || Number(m.ntrpMin) <= opts.ntrpMax);
    }
    return sortMatches(filtered);
  } catch {
    const query = db.select(safeSelect).from(tennisMatches).$dynamic();
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
    let filtered = results;
    if (!opts?.status) {
      filtered = filtered.filter((m) => m.status !== "cancelled");
    }
    if (opts?.onlyAvailable) {
      filtered = filtered.filter((m) => m.status === "open" && m.currentParticipants < m.maxParticipants);
    }
    if (opts?.ntrpMin !== void 0) {
      filtered = filtered.filter((m) => m.ntrpMax === null || Number(m.ntrpMax) >= opts.ntrpMin);
    }
    if (opts?.ntrpMax !== void 0) {
      filtered = filtered.filter((m) => m.ntrpMin === null || Number(m.ntrpMin) <= opts.ntrpMax);
    }
    return sortMatches(filtered);
  }
}
async function getTennisMatchById(id) {
  const db = await getDb();
  if (!db) return null;
  try {
    const rows = await db.select().from(tennisMatches).where(eq(tennisMatches.id, id)).limit(1);
    return {
      ...rows[0] ?? {},
      circleOnly: rows[0]?.circleOnly ?? false,
      feeRequired: rows[0]?.feeRequired ?? false
    };
  } catch (error) {
    console.warn(`[Database] getTennisMatchById failed for id ${id}, attempting fallback:`, error);
    const safeFields = {
      // 确保在降级模式下，新字段默认值为 false
      circleOnly: sql`COALESCE(${tennisMatches.circleOnly}, FALSE)`,
      feeRequired: sql`COALESCE(${tennisMatches.feeRequired}, FALSE)`,
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
      updatedAt: tennisMatches.updatedAt
    };
    try {
      const rows = await db.select(safeFields).from(tennisMatches).where(eq(tennisMatches.id, id)).limit(1);
      return {
        ...rows[0] ?? {},
        circleOnly: rows[0]?.circleOnly ?? false,
        feeRequired: rows[0]?.feeRequired ?? false
      };
    } catch (fallbackError) {
      console.error(`[Database] getTennisMatchById fallback also failed for id ${id}:`, fallbackError);
      return null;
    }
  }
}
async function createTennisMatch(data) {
  const db = await getDb();
  if (!db) return null;
  try {
    const [result] = await db.insert(tennisMatches).values(data).$returningId();
    return {
      ...result,
      circleOnly: result?.circleOnly ?? false,
      feeRequired: result?.feeRequired ?? false
    };
  } catch (error) {
    console.warn("[Database] createTennisMatch full insert failed, attempting safe insert:", error);
    const safeData = {
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
      bringOwnBall: data.bringOwnBall
      // 注意：courtTotalFee 为新列，安全降级路径不写入（旧库可能无此列）
    };
    try {
      const [result] = await db.insert(tennisMatches).values(safeData).$returningId();
      return {
        ...result,
        circleOnly: result?.circleOnly ?? false,
        feeRequired: result?.feeRequired ?? false
      };
    } catch (fallbackError) {
      console.error("[Database] createTennisMatch safe insert also failed:", fallbackError);
      throw fallbackError;
    }
  }
}
async function updateTennisMatchStatus(id, status) {
  const db = await getDb();
  if (!db) return;
  await db.update(tennisMatches).set({ status }).where(eq(tennisMatches.id, id));
}
async function updateTennisMatchParticipantCount(id, delta) {
  const db = await getDb();
  if (!db) return;
  await db.update(tennisMatches).set({ currentParticipants: sql`${tennisMatches.currentParticipants} + ${delta}` }).where(eq(tennisMatches.id, id));
}
async function getMatchParticipants(matchId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(matchParticipants).where(eq(matchParticipants.matchId, matchId)).orderBy(matchParticipants.createdAt);
}
async function getMatchParticipant(matchId, userId) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(matchParticipants).where(and(eq(matchParticipants.matchId, matchId), eq(matchParticipants.userId, userId))).limit(1);
  return rows[0] ?? null;
}
async function joinTennisMatch(matchId, userId, message, paymentStatus) {
  const db = await getDb();
  if (!db) return;
  const values = { matchId, userId, status: "confirmed", message };
  if (paymentStatus) values.paymentStatus = paymentStatus;
  await db.insert(matchParticipants).values(values);
}
async function leaveTennisMatch(matchId, userId) {
  const db = await getDb();
  if (!db) return;
  await db.update(matchParticipants).set({ status: "cancelled" }).where(and(eq(matchParticipants.matchId, matchId), eq(matchParticipants.userId, userId)));
}
async function addCreditLog(userId, delta, reason, matchId) {
  const db = await getDb();
  if (!db) return;
  await db.insert(creditLogs).values({ userId, delta, reason, matchId: matchId ?? null });
  await db.execute(sql`UPDATE users SET creditScore = GREATEST(0, LEAST(100, creditScore + ${delta})) WHERE id = ${userId}`);
}
async function getCreditLogs(userId, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(creditLogs).where(eq(creditLogs.userId, userId)).orderBy(desc(creditLogs.createdAt)).limit(limit);
}
async function recordAttendAndCheckRestore(userId, matchId) {
  const db = await getDb();
  if (!db) return false;
  const userRows = await db.select({ creditScore: users.creditScore, consecutiveAttendCount: users.consecutiveAttendCount }).from(users).where(eq(users.id, userId)).limit(1);
  const user = userRows[0];
  if (!user) return false;
  const newCount = (user.consecutiveAttendCount ?? 0) + 1;
  if (newCount >= 3 && user.creditScore < 100) {
    await db.execute(sql`UPDATE users SET creditScore = 100, consecutiveAttendCount = 0, creditRestoreApplied = false WHERE id = ${userId}`);
    await db.insert(creditLogs).values({ userId, delta: 100 - user.creditScore, reason: "\u8FDE\u7EED3\u6B21\u6309\u65F6\u53C2\u52A0\u7403\u5C40\uFF0C\u4FE1\u7528\u5206\u6062\u590D\u6EE1\u5206", matchId });
    return true;
  } else {
    const newScore = Math.min(100, user.creditScore + 20);
    const actualDelta = newScore - user.creditScore;
    await db.execute(sql`UPDATE users SET consecutiveAttendCount = ${newCount}, creditScore = ${newScore} WHERE id = ${userId}`);
    if (actualDelta > 0) {
      await db.insert(creditLogs).values({ userId, delta: actualDelta, reason: "\u6309\u65F6\u53C2\u52A0\u7403\u5C40\uFF0C\u83B7\u5F97\u53C2\u4E0E\u5956\u52B1", matchId });
    }
    return false;
  }
}
async function recordOrganizerReward(userId, matchId) {
  const db = await getDb();
  if (!db) return;
  const userRows = await db.select({ creditScore: users.creditScore }).from(users).where(eq(users.id, userId)).limit(1);
  const user = userRows[0];
  if (!user) return;
  const newScore = Math.min(100, user.creditScore + 50);
  const actualDelta = newScore - user.creditScore;
  if (actualDelta > 0) {
    await db.execute(sql`UPDATE users SET creditScore = ${newScore} WHERE id = ${userId}`);
    await db.insert(creditLogs).values({ userId, delta: actualDelta, reason: "\u6210\u529F\u7EC4\u7EC7\u7403\u5C40\u5B8C\u6210\uFF0C\u83B7\u5F97\u7EC4\u7EC7\u5956\u52B1", matchId });
  }
}
async function applyCreditRestore(userId) {
  const db = await getDb();
  if (!db) return;
  await db.execute(sql`UPDATE users SET creditRestoreApplied = true WHERE id = ${userId}`);
}
async function approveCreditRestore(userId) {
  const db = await getDb();
  if (!db) return;
  const userRows = await db.select({ creditScore: users.creditScore }).from(users).where(eq(users.id, userId)).limit(1);
  const user = userRows[0];
  if (!user) return;
  await db.execute(sql`UPDATE users SET creditScore = 100, consecutiveAttendCount = 0, creditRestoreApplied = false WHERE id = ${userId}`);
  await db.insert(creditLogs).values({ userId, delta: 100 - user.creditScore, reason: "\u7BA1\u7406\u5458\u5BA1\u6838\u901A\u8FC7\u7533\u8BF7\uFF0C\u4FE1\u7528\u5206\u6062\u590D\u6EE1\u5206" });
}
async function getPendingCreditRestoreList() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: users.id,
    name: users.name,
    phone: users.phone,
    avatar: users.avatar,
    creditScore: users.creditScore,
    consecutiveAttendCount: users.consecutiveAttendCount
  }).from(users).where(eq(users.creditRestoreApplied, true));
}
async function getUserTennisMatches(userId) {
  const db = await getDb();
  if (!db) return { authored: [], joined: [] };
  const authored = await db.select().from(tennisMatches).where(eq(tennisMatches.authorId, userId)).orderBy(desc(tennisMatches.createdAt));
  const joinedRows = await db.select({ matchId: matchParticipants.matchId }).from(matchParticipants).where(and(eq(matchParticipants.userId, userId), eq(matchParticipants.status, "confirmed")));
  const joinedIds = joinedRows.map((r) => r.matchId).filter((id) => !authored.some((a) => a.id === id));
  const joined = joinedIds.length > 0 ? await db.select().from(tennisMatches).where(inArray(tennisMatches.id, joinedIds)).orderBy(desc(tennisMatches.createdAt)) : [];
  return { authored, joined };
}
async function getLessonPackagesByCoach(coachId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lessonPackages).where(and(eq(lessonPackages.coachId, coachId), eq(lessonPackages.isActive, true))).orderBy(lessonPackages.createdAt);
}
async function getLessonPackageById(id) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(lessonPackages).where(eq(lessonPackages.id, id)).limit(1);
  return rows[0] ?? null;
}
async function createLessonPackage(data) {
  const db = await getDb();
  if (!db) return;
  await db.insert(lessonPackages).values(data);
}
async function deleteLessonPackage(id, coachId) {
  const db = await getDb();
  if (!db) return;
  await db.update(lessonPackages).set({ isActive: false }).where(and(eq(lessonPackages.id, id), eq(lessonPackages.coachId, coachId)));
}
async function createStudentPackage(data) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(studentPackages).values({ ...data, status: "pending_payment" });
  return result;
}
async function getStudentPackages(studentId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(studentPackages).where(eq(studentPackages.studentId, studentId)).orderBy(desc(studentPackages.createdAt));
}
async function getStudentPackagesByCoach(coachId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(studentPackages).where(eq(studentPackages.coachId, coachId)).orderBy(desc(studentPackages.createdAt));
}
async function getStudentPackageById(id) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(studentPackages).where(eq(studentPackages.id, id)).limit(1);
  return rows[0] ?? null;
}
async function activateStudentPackage(id) {
  const db = await getDb();
  if (!db) return;
  await db.update(studentPackages).set({ status: "active", paidAt: /* @__PURE__ */ new Date() }).where(eq(studentPackages.id, id));
}
async function deductStudentPackageLesson(id, deductedBy, bookingId, note) {
  const db = await getDb();
  if (!db) return;
  const pkg = await getStudentPackageById(id);
  if (!pkg || pkg.remainingLessons <= 0) throw new Error("\u8BFE\u65F6\u4E0D\u8DB3");
  const newRemaining = pkg.remainingLessons - 1;
  await db.update(studentPackages).set({
    remainingLessons: newRemaining,
    status: newRemaining === 0 ? "exhausted" : "active"
  }).where(eq(studentPackages.id, id));
  await db.insert(packageDeductions).values({ studentPackageId: id, deductedBy, bookingId, note });
}
async function requestStudentPackageRefund(id, studentId, note) {
  const db = await getDb();
  if (!db) return;
  await db.update(studentPackages).set({ status: "refund_requested", refundNote: note }).where(and(eq(studentPackages.id, id), eq(studentPackages.studentId, studentId)));
}
async function getPackageDeductions(studentPackageId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(packageDeductions).where(eq(packageDeductions.studentPackageId, studentPackageId)).orderBy(desc(packageDeductions.createdAt));
}
async function createMatchReview(data) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(matchReviews).values(data).$returningId();
  const avgScore = (data.punctualityScore + data.friendlinessScore + data.levelMatchScore) / 3;
  const creditDelta = Math.round((avgScore - 3) * 5);
  if (creditDelta !== 0) {
    await db.execute(sql`UPDATE users SET creditScore = GREATEST(0, LEAST(100, creditScore + ${creditDelta})) WHERE id = ${data.revieweeId}`);
  }
  return result;
}
async function getMatchReviews(matchId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(matchReviews).where(eq(matchReviews.matchId, matchId)).orderBy(matchReviews.createdAt);
}
async function getUserReviews(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(matchReviews).where(eq(matchReviews.revieweeId, userId)).orderBy(desc(matchReviews.createdAt));
}
async function hasUserReviewed(matchId, reviewerId, revieweeId) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select({ id: matchReviews.id }).from(matchReviews).where(and(eq(matchReviews.matchId, matchId), eq(matchReviews.reviewerId, reviewerId), eq(matchReviews.revieweeId, revieweeId))).limit(1);
  return rows.length > 0;
}
async function getRecentMatchOrders(limit = 5) {
  const db = await getDb();
  if (!db) return [];
  const { matchOrders: matchOrders2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  return db.select().from(matchOrders2).orderBy(desc(matchOrders2.id)).limit(limit);
}
async function createFeedback(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(feedbacks).values({
    userId: data.userId,
    content: data.content,
    contact: data.contact ?? null,
    category: data.category ?? "other"
  });
  return result;
}
async function getFeedbacksByUser(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(feedbacks).where(eq(feedbacks.userId, userId)).orderBy(desc(feedbacks.createdAt)).limit(50);
}
async function getAllFeedbacks(opts) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select({
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
    userAvatar: users.avatar
  }).from(feedbacks).leftJoin(users, eq(feedbacks.userId, users.id)).$dynamic();
  if (opts?.status) {
    query = query.where(eq(feedbacks.status, opts.status));
  }
  return query.orderBy(desc(feedbacks.createdAt)).limit(opts?.limit ?? 100).offset(opts?.offset ?? 0);
}
async function getFeedbackById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(feedbacks).where(eq(feedbacks.id, id)).limit(1);
  return result[0];
}
async function replyFeedback(id, adminReply) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(feedbacks).set({ adminReply, status: "replied", repliedAt: /* @__PURE__ */ new Date() }).where(eq(feedbacks.id, id));
}
async function getPendingFeedbackCount() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: count() }).from(feedbacks).where(eq(feedbacks.status, "pending"));
  return result[0]?.count ?? 0;
}
var _db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    init_env();
    _db = null;
  }
});

// server/storage.ts
var storage_exports = {};
__export(storage_exports, {
  getStorageDir: () => getStorageDir,
  resolveSafePath: () => resolveSafePath,
  storageGet: () => storageGet,
  storageGetSignedUrl: () => storageGetSignedUrl,
  storagePut: () => storagePut
});
import crypto from "crypto";
import fs from "fs";
import path from "path";
function getStorageDir() {
  return process.env.STORAGE_DIR || path.resolve(process.cwd(), "storage-data");
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
function resolveSafePath(relKey) {
  const base = getStorageDir();
  const target = path.resolve(base, normalizeKey(relKey));
  if (target !== base && !target.startsWith(base + path.sep)) {
    throw new Error("Invalid storage key (path traversal)");
  }
  return target;
}
function appendHashSuffix(relKey) {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}
async function storagePut(relKey, data, _contentType = "application/octet-stream") {
  const key = appendHashSuffix(normalizeKey(relKey));
  const target = resolveSafePath(key);
  await fs.promises.mkdir(path.dirname(target), { recursive: true });
  const buffer = typeof data === "string" ? Buffer.from(data) : Buffer.isBuffer(data) ? data : Buffer.from(data);
  await fs.promises.writeFile(target, buffer);
  return { key, url: `/manus-storage/${key}` };
}
async function storageGet(relKey) {
  const key = normalizeKey(relKey);
  return { key, url: `/manus-storage/${key}` };
}
async function storageGetSignedUrl(relKey) {
  const key = normalizeKey(relKey);
  return `/manus-storage/${key}`;
}
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
  }
});

// server/_core/notification.ts
var notification_exports = {};
__export(notification_exports, {
  notifyOwner: () => notifyOwner
});
import { TRPCError } from "@trpc/server";
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}
var TITLE_MAX_LENGTH, CONTENT_MAX_LENGTH, trimValue, isNonEmptyString2, buildEndpointUrl, validatePayload;
var init_notification = __esm({
  "server/_core/notification.ts"() {
    "use strict";
    init_env();
    TITLE_MAX_LENGTH = 1200;
    CONTENT_MAX_LENGTH = 2e4;
    trimValue = (value) => value.trim();
    isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
    buildEndpointUrl = (baseUrl) => {
      const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
      return new URL(
        "webdevtoken.v1.WebDevService/SendNotification",
        normalizedBase
      ).toString();
    };
    validatePayload = (input) => {
      if (!isNonEmptyString2(input.title)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Notification title is required."
        });
      }
      if (!isNonEmptyString2(input.content)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Notification content is required."
        });
      }
      const title = trimValue(input.title);
      const content = trimValue(input.content);
      if (title.length > TITLE_MAX_LENGTH) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
        });
      }
      if (content.length > CONTENT_MAX_LENGTH) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
        });
      }
      return { title, content };
    };
  }
});

// server/wxpay.ts
var wxpay_exports = {};
__export(wxpay_exports, {
  createPrepay: () => createPrepay,
  decryptNotifyData: () => decryptNotifyData,
  generateOrderId: () => generateOrderId,
  getVerifyPublicKey: () => getVerifyPublicKey,
  isWxpayConfigured: () => isWxpayConfigured,
  queryOrder: () => queryOrder,
  refundOrder: () => refundOrder,
  transferToUser: () => transferToUser,
  verifyNotifySignature: () => verifyNotifySignature,
  wxpayConfig: () => wxpayConfig
});
import crypto2 from "crypto";
function generateNonce(len = 32) {
  return crypto2.randomBytes(len).toString("hex").slice(0, len);
}
function getTimestamp() {
  return Math.floor(Date.now() / 1e3).toString();
}
function signMessage(message) {
  const sign = crypto2.createSign("RSA-SHA256");
  sign.update(message);
  return sign.sign(wxpayConfig.privateKey, "base64");
}
function buildAuthHeader(method, url, body) {
  const nonce = generateNonce();
  const ts = getTimestamp();
  const urlObj = new URL(url);
  const canonicalUrl = urlObj.pathname + (urlObj.search || "");
  const message = `${method}
${canonicalUrl}
${ts}
${nonce}
${body}
`;
  const signature = signMessage(message);
  return `WECHATPAY2-SHA256-RSA2048 mchid="${wxpayConfig.mchId}",nonce_str="${nonce}",timestamp="${ts}",serial_no="${wxpayConfig.serialNo}",signature="${signature}"`;
}
async function wxpayRequest(method, path5, body) {
  const url = `https://api.mch.weixin.qq.com${path5}`;
  const bodyStr = body ? JSON.stringify(body) : "";
  const authHeader = buildAuthHeader(method, url, bodyStr);
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: authHeader
    },
    body: bodyStr || void 0
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`WxPay API error ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}
function generateOrderId() {
  const now = /* @__PURE__ */ new Date();
  const ymd = now.getFullYear().toString() + String(now.getMonth() + 1).padStart(2, "0") + String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 1e6).toString().padStart(6, "0");
  return `MO${ymd}${rand}`;
}
async function createPrepay(params) {
  if (!isWxpayConfigured()) {
    const ts2 = getTimestamp();
    const nonce2 = generateNonce(16);
    return {
      prepayId: `mock_prepay_${params.orderId}`,
      timeStamp: ts2,
      nonceStr: nonce2,
      packageStr: `prepay_id=mock_prepay_${params.orderId}`,
      signType: "RSA",
      paySign: "MOCK_SIGN"
    };
  }
  const notifyUrl = params.notifyUrl || wxpayConfig.notifyUrl;
  const resp = await wxpayRequest(
    "POST",
    "/v3/pay/transactions/jsapi",
    {
      appid: wxpayConfig.appId,
      mchid: wxpayConfig.mchId,
      description: params.description,
      out_trade_no: params.orderId,
      notify_url: notifyUrl,
      amount: { total: params.amountFen, currency: "CNY" },
      payer: { openid: params.openid }
    }
  );
  const ts = getTimestamp();
  const nonce = generateNonce(16);
  const packageStr = `prepay_id=${resp.prepay_id}`;
  const signMsg = `${wxpayConfig.appId}
${ts}
${nonce}
${packageStr}
`;
  const paySign = signMessage(signMsg);
  return {
    prepayId: resp.prepay_id,
    timeStamp: ts,
    nonceStr: nonce,
    packageStr,
    signType: "RSA",
    paySign
  };
}
async function queryOrder(orderId) {
  if (!isWxpayConfigured()) return null;
  try {
    const resp = await wxpayRequest(
      "GET",
      `/v3/pay/transactions/out-trade-no/${orderId}?mchid=${wxpayConfig.mchId}`,
      void 0
    );
    return resp;
  } catch {
    return null;
  }
}
async function refundOrder(params) {
  if (!isWxpayConfigured()) {
    return { refundId: `mock_refund_${params.refundId}`, status: "SUCCESS" };
  }
  const resp = await wxpayRequest(
    "POST",
    "/v3/refund/domestic/refunds",
    {
      out_trade_no: params.orderId,
      out_refund_no: params.refundId,
      reason: params.reason,
      amount: {
        refund: params.refundFen,
        total: params.totalFen,
        currency: "CNY"
      }
    }
  );
  return { refundId: resp.refund_id, status: resp.status };
}
async function transferToUser(params) {
  if (!isWxpayConfigured()) {
    return { batchId: `mock_batch_${params.batchId}`, status: "ACCEPTED" };
  }
  const resp = await wxpayRequest(
    "POST",
    "/v3/transfer/batches",
    {
      appid: wxpayConfig.appId,
      out_batch_no: params.batchId,
      batch_name: "\u7403\u5C40\u573A\u5730\u8D39\u7ED3\u7B97",
      batch_remark: params.remark,
      total_amount: params.amountFen,
      total_num: 1,
      transfer_detail_list: [
        {
          out_detail_no: `${params.batchId}_001`,
          transfer_amount: params.amountFen,
          transfer_remark: params.remark,
          openid: params.openid
        }
      ]
    }
  );
  return { batchId: resp.batch_id, status: "ACCEPTED" };
}
function verifyNotifySignature(timestamp2, nonce, body, signature, publicKeyOrCert) {
  try {
    const message = `${timestamp2}
${nonce}
${body}
`;
    const verify = crypto2.createVerify("RSA-SHA256");
    verify.update(message);
    return verify.verify(publicKeyOrCert, signature, "base64");
  } catch {
    return false;
  }
}
function getVerifyPublicKey() {
  return wxpayConfig.publicKey;
}
function decryptNotifyData(ciphertext, nonce, associatedData) {
  const key = Buffer.from(wxpayConfig.apiV3Key, "utf8");
  const iv = Buffer.from(nonce, "utf8");
  const cipherBuf = Buffer.from(ciphertext, "base64");
  const authTag = cipherBuf.slice(cipherBuf.length - 16);
  const data = cipherBuf.slice(0, cipherBuf.length - 16);
  const decipher = crypto2.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  decipher.setAAD(Buffer.from(associatedData, "utf8"));
  return decipher.update(data, void 0, "utf8") + decipher.final("utf8");
}
var wxpayConfig, isWxpayConfigured;
var init_wxpay = __esm({
  "server/wxpay.ts"() {
    "use strict";
    wxpayConfig = {
      appId: process.env.WECHAT_APP_ID || "",
      mchId: process.env.WXPAY_MCH_ID || "",
      apiV3Key: process.env.WXPAY_API_V3_KEY || "",
      serialNo: process.env.WXPAY_SERIAL_NO || "",
      privateKey: (process.env.WXPAY_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
      notifyUrl: process.env.WXPAY_NOTIFY_URL || "",
      // 微信支付公钥模式（新商户默认使用）
      publicKeyId: process.env.WXPAY_PUBLIC_KEY_ID || "",
      publicKey: (process.env.WXPAY_PUBLIC_KEY || "").replace(/\\n/g, "\n")
    };
    isWxpayConfigured = () => !!(wxpayConfig.mchId && wxpayConfig.apiV3Key && wxpayConfig.serialNo && wxpayConfig.privateKey);
  }
});

// server/_core/wechat.ts
var wechat_exports = {};
__export(wechat_exports, {
  code2Session: () => code2Session,
  getAccessToken: () => getAccessToken,
  getWxacode: () => getWxacode
});
async function getAccessToken() {
  const now = Date.now();
  if (_accessToken && now < _tokenExpiry - 5 * 60 * 1e3) {
    return _accessToken;
  }
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${ENV.wechatAppId}&secret=${ENV.wechatAppSecret}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`[WeChat] getAccessToken failed: ${JSON.stringify(data)}`);
  }
  _accessToken = data.access_token;
  _tokenExpiry = now + (data.expires_in ?? 7200) * 1e3;
  return _accessToken;
}
async function code2Session(code) {
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${ENV.wechatAppId}&secret=${ENV.wechatAppSecret}&js_code=${code}&grant_type=authorization_code`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.errcode) {
    throw new Error(`[WeChat] code2Session failed: ${data.errmsg} (${data.errcode})`);
  }
  if (!data.openid) {
    throw new Error("[WeChat] code2Session: missing openid in response");
  }
  return { openid: data.openid, session_key: data.session_key, unionid: data.unionid };
}
async function getWxacode(opts) {
  const token = await getAccessToken();
  const url = `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${token}`;
  const body = {
    scene: opts.scene,
    page: opts.page ?? "pages/index/index",
    width: opts.width ?? 430,
    env_version: opts.env_version ?? (ENV.isProduction ? "release" : "trial"),
    check_path: false
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const err = await res.json();
    throw new Error(`[WeChat] getWxacode failed: ${err.errmsg} (${err.errcode})`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
var _accessToken, _tokenExpiry;
var init_wechat = __esm({
  "server/_core/wechat.ts"() {
    "use strict";
    init_env();
    _accessToken = null;
    _tokenExpiry = 0;
  }
});

// server/wechat-notify.ts
var wechat_notify_exports = {};
__export(wechat_notify_exports, {
  sendMatchCancelledToParticipant: () => sendMatchCancelledToParticipant,
  wxNotifyBookingToCoach: () => wxNotifyBookingToCoach,
  wxNotifyBookingToStudent: () => wxNotifyBookingToStudent,
  wxNotifyCircleMatch: () => wxNotifyCircleMatch,
  wxNotifyCoachApproved: () => wxNotifyCoachApproved,
  wxNotifyCoachContactToStudent: () => wxNotifyCoachContactToStudent,
  wxNotifyCoachRejected: () => wxNotifyCoachRejected,
  wxNotifyMatchJoin: () => wxNotifyMatchJoin,
  wxNotifyStudentContactToCoach: () => wxNotifyStudentContactToCoach
});
async function getToken() {
  try {
    return await getAccessToken();
  } catch (e) {
    console.warn("[WxNotify] \u83B7\u53D6 access_token \u5931\u8D25\uFF0C\u8DF3\u8FC7\u63A8\u9001:", e);
    return null;
  }
}
async function sendSubscribeMessage(toUser, templateId, data, page) {
  if (!toUser) {
    console.warn("[WxNotify] \u76EE\u6807\u7528\u6237 openid \u4E3A\u7A7A\uFF0C\u8DF3\u8FC7\u63A8\u9001");
    return false;
  }
  if (!templateId || templateId === "TPL_PENDING") {
    console.warn("[WxNotify] \u6A21\u677F ID \u672A\u914D\u7F6E\uFF0C\u8DF3\u8FC7\u63A8\u9001\u5230", toUser);
    return false;
  }
  const token = await getToken();
  if (!token) return false;
  const body = {
    touser: toUser,
    template_id: templateId,
    page: page ?? "pages/index/index",
    data
  };
  try {
    const res = await fetch(
      `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }
    );
    const result = await res.json();
    if (result.errcode === 0) {
      console.log(`[WxNotify] \u63A8\u9001\u6210\u529F \u2192 ${toUser} (${templateId})`);
      return true;
    }
    if (result.errcode === 43101) {
      console.warn(`[WxNotify] \u7528\u6237\u672A\u8BA2\u9605 ${templateId}\uFF0C\u8DF3\u8FC7\u63A8\u9001 \u2192 ${toUser}`);
      return false;
    }
    console.error(`[WxNotify] \u63A8\u9001\u5931\u8D25 \u2192 ${toUser}: ${result.errcode} ${result.errmsg}`);
    return false;
  } catch (e) {
    console.error("[WxNotify] \u63A8\u9001\u5F02\u5E38:", e);
    return false;
  }
}
async function wxNotifyBookingToStudent(params) {
  return sendSubscribeMessage(
    params.openid,
    TEMPLATES2.BOOKING_STUDENT,
    {
      thing1: { value: params.coachName.slice(0, 20) },
      time2: { value: `${params.lessonDate} ${params.startTime}` },
      thing3: { value: params.venueName.slice(0, 20) }
    },
    "pages/bookings/index"
  );
}
async function wxNotifyBookingToCoach(params) {
  return sendSubscribeMessage(
    params.openid,
    TEMPLATES2.BOOKING_COACH,
    {
      thing1: { value: params.studentName.slice(0, 20) },
      time2: { value: `${params.lessonDate} ${params.startTime}` },
      thing3: { value: params.venueName.slice(0, 20) }
    },
    "pages/coach-portal/index"
  );
}
async function wxNotifyCoachContactToStudent(params) {
  return sendSubscribeMessage(
    params.openid,
    TEMPLATES2.CONTACT_INFO,
    {
      thing1: { value: params.coachName.slice(0, 20) },
      phone_number2: { value: params.coachPhone }
    },
    "pages/bookings/index"
  );
}
async function wxNotifyStudentContactToCoach(params) {
  return sendSubscribeMessage(
    params.openid,
    TEMPLATES2.CONTACT_INFO,
    {
      thing1: { value: params.studentName.slice(0, 20) },
      phone_number2: { value: params.studentPhone }
    },
    "pages/coach-portal/index"
  );
}
async function wxNotifyCoachApproved(params) {
  return sendSubscribeMessage(
    params.openid,
    TEMPLATES2.COACH_APPROVED,
    {
      thing1: { value: params.coachName.slice(0, 20) },
      thing2: { value: "\u60A8\u7684\u6559\u7EC3\u7533\u8BF7\u5DF2\u5BA1\u6838\u901A\u8FC7\uFF0C\u53EF\u4EE5\u5F00\u59CB\u63A5\u5355\u4E86\uFF01" }
    },
    "pages/coach-portal/index"
  );
}
async function wxNotifyCoachRejected(params) {
  return sendSubscribeMessage(
    params.openid,
    TEMPLATES2.COACH_REJECTED,
    {
      thing1: { value: params.coachName.slice(0, 20) },
      thing2: { value: (params.reason || "\u8D44\u8D28\u6750\u6599\u4E0D\u7B26\u5408\u8981\u6C42").slice(0, 20) }
    },
    "pages/coach-apply/index"
  );
}
async function wxNotifyCircleMatch(params) {
  return sendSubscribeMessage(
    params.openid,
    TEMPLATES2.CIRCLE_MATCH,
    {
      thing1: { value: params.circleName.slice(0, 20) },
      time2: { value: `${params.matchDate} ${params.startTime}` },
      thing3: { value: params.venueName.slice(0, 20) }
    },
    "pages/matches/index"
  );
}
async function wxNotifyMatchJoin(params) {
  return sendSubscribeMessage(
    params.openid,
    TEMPLATES2.MATCH_JOIN,
    {
      thing1: { value: params.matchTitle.slice(0, 20) },
      thing2: { value: params.joinerName.slice(0, 20) }
    },
    "pages/matches/index"
  );
}
async function sendMatchCancelledToParticipant(openid, matchTitle, matchDate, startTime) {
  return sendSubscribeMessage(
    openid,
    TEMPLATES2.MATCH_CANCELLED,
    {
      thing1: { value: matchTitle.slice(0, 20) },
      time2: { value: `${matchDate} ${startTime}` },
      thing3: { value: "\u53D1\u5E03\u4EBA\u5DF2\u53D6\u6D88\u7403\u5C40" }
    },
    "pages/matches/index"
  );
}
var TEMPLATES2;
var init_wechat_notify = __esm({
  "server/wechat-notify.ts"() {
    "use strict";
    init_wechat();
    TEMPLATES2 = {
      /** 预约成功通知（学员） */
      BOOKING_STUDENT: process.env.WX_TPL_BOOKING_STUDENT ?? "TPL_PENDING",
      /** 新预约通知（教练） */
      BOOKING_COACH: process.env.WX_TPL_BOOKING_COACH ?? "TPL_PENDING",
      /** 预约确认后互发联系方式 */
      CONTACT_INFO: process.env.WX_TPL_CONTACT_INFO ?? "TPL_PENDING",
      /** 教练审核通过 */
      COACH_APPROVED: process.env.WX_TPL_COACH_APPROVED ?? "TPL_PENDING",
      /** 教练审核拒绝 */
      COACH_REJECTED: process.env.WX_TPL_COACH_REJECTED ?? "TPL_PENDING",
      /** 圈子新球局通知 */
      CIRCLE_MATCH: process.env.WX_TPL_CIRCLE_MATCH ?? "TPL_PENDING",
      /** 球局报名通知（发布人） */
      MATCH_JOIN: process.env.WX_TPL_MATCH_JOIN ?? "TPL_PENDING",
      /** 球局取消通知（参与者） */
      MATCH_CANCELLED: process.env.WX_TPL_MATCH_CANCELLED ?? "TPL_PENDING"
    };
  }
});

// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "\u8BF7\u5148\u767B\u5F55\u540E\u518D\u64CD\u4F5C";
var NOT_ADMIN_ERR_MSG = "\u6743\u9650\u4E0D\u8DB3\uFF0C\u9700\u8981\u7BA1\u7406\u5458\u8EAB\u4EFD";

// server/_core/oauth.ts
init_db();

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
init_db();
init_env();
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    let sessionToken;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      sessionToken = authHeader.slice(7).trim();
    } else {
      const cookies = this.parseCookies(req.headers.cookie);
      sessionToken = cookies.get(COOKIE_NAME);
    }
    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    const isLocalLogin = sessionUserId.startsWith("phone_") || sessionUserId.startsWith("email_") || sessionUserId.startsWith("wx_");
    if (!user && !isLocalLogin && ENV.oAuthServerUrl) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var CRON_OPEN_ID_PREFIX = "cron_";
function buildCronUser(userInfo) {
  const now = /* @__PURE__ */ new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? void 0,
    isCron: true
  };
}
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/storageProxy.ts
init_storage();
import fs2 from "fs";
import path2 from "path";
var CONTENT_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".pdf": "application/pdf"
};
function registerStorageProxy(app) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    let filePath;
    try {
      filePath = resolveSafePath(key);
    } catch {
      res.status(400).send("Invalid storage key");
      return;
    }
    try {
      const stat = await fs2.promises.stat(filePath);
      if (!stat.isFile()) {
        res.status(404).send("Not found");
        return;
      }
      const ext = path2.extname(filePath).toLowerCase();
      const contentType = CONTENT_TYPES[ext] || "application/octet-stream";
      res.set("Content-Type", contentType);
      res.set("Cache-Control", "public, max-age=31536000, immutable");
      fs2.createReadStream(filePath).pipe(res);
    } catch {
      res.status(404).send("Not found");
    }
  });
  fs2.promises.mkdir(getStorageDir(), { recursive: true }).catch(() => {
  });
}

// server/routers.ts
import { z as z2 } from "zod";
import bcrypt from "bcryptjs";
init_env();

// server/_core/systemRouter.ts
init_notification();
import { z } from "zod";

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var isDev = process.env.NODE_ENV !== "production";
var t = initTRPC.context().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const isSensitiveMessage = error.message?.includes("Failed query") || error.message?.includes("select ") || error.message?.includes("insert ") || error.message?.includes("update ") || error.message?.includes("delete ") || error.message?.includes("ECONNREFUSED") || error.message?.includes("ER_") || error.message?.includes("Access denied");
    const isInternalError = shape.data.code === "INTERNAL_SERVER_ERROR";
    const safeMessage = isSensitiveMessage || !isDev && isInternalError ? "\u670D\u52A1\u5668\u5185\u90E8\u9519\u8BEF\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5" : shape.message;
    if (isSensitiveMessage) {
      console.error("[tRPC] Masked sensitive error:", error.message);
    }
    if (isInternalError) {
      console.error("[tRPC] INTERNAL_SERVER_ERROR at", shape.data.path, ":", error.message, error.cause);
    }
    return {
      ...shape,
      message: safeMessage,
      data: {
        ...shape.data,
        // Never expose stack traces in production
        stack: isDev ? shape.data.stack : void 0
      }
    };
  }
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  if (ctx.user.status === "banned" && ctx.user.role !== "admin") {
    const reason = ctx.user.banReason;
    throw new TRPCError2({
      code: "FORBIDDEN",
      message: reason ? `\u60A8\u7684\u8D26\u53F7\u5DF2\u88AB\u5C01\u7981\u3002\u5C01\u7981\u539F\u56E0\uFF1A${reason}` : "\u60A8\u7684\u8D26\u53F7\u5DF2\u88AB\u5C01\u7981\uFF0C\u5982\u6709\u5F02\u8BAE\u8BF7\u8054\u7CFB\u5E73\u53F0\u5BA2\u670D\u3002"
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
init_db();
init_wxpay();
init_notification();
import { TRPCError as TRPCError3 } from "@trpc/server";
import { nanoid } from "nanoid";

// server/sms.ts
import * as _DysmsapiModule from "@alicloud/dysmsapi20170525";
import * as _OpenApiClientModule from "@alicloud/openapi-client";
var Dysmsapi20170525 = _DysmsapiModule.default?.default ?? _DysmsapiModule.default ?? _DysmsapiModule;
var SendSmsRequest2 = _DysmsapiModule.SendSmsRequest ?? _DysmsapiModule.default?.SendSmsRequest;
var OpenApiConfig = _OpenApiClientModule.Config ?? _OpenApiClientModule.default?.Config ?? _OpenApiClientModule.default?.default?.Config;
var TEMPLATES = {
  VERIFY_CODE: process.env.SMS_TPL_VERIFY_CODE ?? "SMS_PENDING",
  BOOKING_STUDENT: process.env.SMS_TPL_BOOKING_STUDENT ?? "SMS_PENDING",
  BOOKING_COACH: process.env.SMS_TPL_BOOKING_COACH ?? "SMS_PENDING",
  COACH_APPROVED: process.env.SMS_TPL_COACH_APPROVED ?? "SMS_PENDING",
  COACH_REJECTED: process.env.SMS_TPL_COACH_REJECTED ?? "SMS_PENDING"
};
var SIGN_NAME = "AceBook";
function createClient() {
  const accessKeyId = process.env.ALIYUN_SMS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIYUN_SMS_ACCESS_KEY_SECRET;
  if (!accessKeyId || !accessKeySecret) {
    console.warn("[SMS] AccessKey not configured, SMS disabled.");
    return null;
  }
  const config = new OpenApiConfig({ accessKeyId, accessKeySecret });
  config.endpoint = "dysmsapi.aliyuncs.com";
  return new Dysmsapi20170525(config);
}
async function sendSms(phone, templateCode, templateParam = {}) {
  if (!phone || phone.trim() === "") {
    console.warn("[SMS] No phone number provided, skipping.");
    return false;
  }
  if (templateCode === "SMS_PENDING") {
    console.warn("[SMS] Template code not configured yet, skipping send to", phone);
    return false;
  }
  const client = createClient();
  if (!client) return false;
  try {
    const req = new SendSmsRequest2({
      phoneNumbers: phone,
      signName: SIGN_NAME,
      templateCode,
      templateParam: JSON.stringify(templateParam)
    });
    const resp = await client.sendSms(req);
    const code = resp.body?.code;
    if (code === "OK") {
      console.log(`[SMS] Sent to ${phone} via ${templateCode}`);
      return true;
    } else {
      console.error(`[SMS] Failed to ${phone}: ${code} - ${resp.body?.message}`);
      return false;
    }
  } catch (err) {
    console.error("[SMS] Exception:", err);
    return false;
  }
}
async function smsSendVerifyCode(params) {
  return sendSms(params.phone, TEMPLATES.VERIFY_CODE, { code: params.code });
}

// server/routers.ts
init_wechat_notify();
var coachProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "coach" && ctx.user.role !== "admin") {
    throw new TRPCError3({ code: "FORBIDDEN", message: "\u4EC5\u6559\u7EC3\u53EF\u64CD\u4F5C" });
  }
  return next({ ctx });
});
var adminProcedure2 = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError3({ code: "FORBIDDEN", message: "\u4EC5\u7BA1\u7406\u5458\u53EF\u64CD\u4F5C" });
  }
  return next({ ctx });
});
var SHENZHEN_VENUE_PHOTOS = {
  // 南山区
  "\u6DF1\u4E91\u6587\u4F53\u516C\u56ED": "/manus-storage/shenyun_wentigongyuan_b1ebf798.jpg",
  "\u6DF1\u4E91": "/manus-storage/shenyun_wentigongyuan_b1ebf798.jpg",
  "\u5927\u6C99\u6CB3\u7F51\u7403": "/manus-storage/dashahe_wangqiu_89abde6b.jpg",
  "\u5927\u6C99\u6CB3\u56FD\u9645": "/manus-storage/dashahe_wangqiu_89abde6b.jpg",
  "\u5F18\u91D1\u5730": "/manus-storage/hongjindi_wangqiu_f76502f1.jpg",
  "\u5F18\u91D1\u5730\u7F51\u7403": "/manus-storage/hongjindi_wangqiu_f76502f1.jpg",
  "\u5F18\u91D1\u5730\u8D39\u96F7\u7F57": "/manus-storage/hongjindi_wangqiu_f76502f1.jpg",
  "\u6DF1\u5733\u6E7E\u4F53\u80B2\u4E2D\u5FC3": "/manus-storage/shenzhenwang_tiyuzhongxin_f968f210.jpg",
  "\u6DF1\u5733\u6E7E\u4F53\u80B2": "/manus-storage/shenzhenwang_tiyuzhongxin_f968f210.jpg",
  "\u6625\u8327": "/manus-storage/shenzhenwang_tiyuzhongxin_f968f210.jpg",
  "\u6DF1\u5733\u6E7E\u8BAD\u7EC3\u57FA\u5730": "/manus-storage/shenzhenwan_xunlian_8f6ed075.jpg",
  // 福田区
  "\u9999\u871C\u4F53\u80B2\u4E2D\u5FC3": "/manus-storage/xiangmi_tiyuzhongxin_1a956f13.jpg",
  "\u9999\u871C\u516C\u56ED\u4F53\u80B2": "/manus-storage/xiangmi_tiyuzhongxin_1a956f13.jpg",
  "\u9999\u871C\u516C\u56ED": "/manus-storage/xiangmi_tiyuzhongxin_1a956f13.jpg",
  "\u9999\u871C\u7F51\u7403": "/manus-storage/xiangmi_tiyuzhongxin_1a956f13.jpg",
  "\u6DF1\u5733\u5E02\u4F53\u80B2\u4E2D\u5FC3\u7F51\u7403": "/manus-storage/shenzhen_tiyuzhongxin_ef3eb9dd.jpg",
  "\u5E02\u4F53\u80B2\u4E2D\u5FC3\u7F51\u7403": "/manus-storage/shenzhen_tiyuzhongxin_ef3eb9dd.jpg",
  "\u5E02\u4F53\u80B2\u4E2D\u5FC3": "/manus-storage/shenzhen_tiyuzhongxin_ef3eb9dd.jpg",
  "\u5F53\u4EE3\u8F66\u8F86\u6BB5": "/manus-storage/meilin_wentigongyuan_4f4e70d8.jpg",
  // 福田/龙华区
  "\u4E0B\u6885\u6797\u6587\u4F53\u516C\u56ED": "/manus-storage/meilin_wentigongyuan_4f4e70d8.jpg",
  "\u4E0B\u6885\u6797": "/manus-storage/meilin_wentigongyuan_4f4e70d8.jpg",
  "\u6885\u6797\u6587\u4F53": "/manus-storage/meilin_wentigongyuan_4f4e70d8.jpg",
  "\u6885\u6797\u7F51\u7403": "/manus-storage/meilin_wentigongyuan_4f4e70d8.jpg",
  // 南山/荔香区
  "\u8354\u9999\u516C\u56ED\u7F51\u7403": "/manus-storage/lixiang_gongyuan_848849e7.jpg",
  "\u8354\u9999\u516C\u56ED": "/manus-storage/lixiang_gongyuan_848849e7.jpg",
  "\u8354\u9999\u7F51\u7403": "/manus-storage/lixiang_gongyuan_848849e7.jpg",
  // 龙岗区
  "\u5927\u8FD0\u4E2D\u5FC3\u7F51\u7403": "/manus-storage/dayun_zhongxin_a5fa7b24.jpg",
  "\u5927\u8FD0\u4E2D\u5FC3": "/manus-storage/dayun_zhongxin_a5fa7b24.jpg",
  "\u5927\u8FD0\u7F51\u7403": "/manus-storage/dayun_zhongxin_a5fa7b24.jpg",
  "\u9F99\u5C97\u5927\u8FD0": "/manus-storage/dayun_zhongxin_a5fa7b24.jpg",
  // 罗湖区
  "\u7F57\u6E56\u7F51\u7403\u4E2D\u5FC3": "/manus-storage/luohu_wangqiu_d7d5cf3e.jpg",
  "\u7F57\u6E56\u7F51\u7403": "/manus-storage/luohu_wangqiu_d7d5cf3e.jpg",
  "\u7F57\u6E56\u4F53\u80B2\u9986": "/manus-storage/luohu_wangqiu_d7d5cf3e.jpg",
  // 网羽中心
  "\u7F51\u7FBD\u4E2D\u5FC3": "/manus-storage/shenzhen_tiyuzhongxin_ef3eb9dd.jpg",
  "\u6DF1\u5733\u5E02\u7F51\u7FBD\u4E2D\u5FC3": "/manus-storage/shenzhen_tiyuzhongxin_ef3eb9dd.jpg"
};
var FALLBACK_VENUE_PHOTOS = [
  "/manus-storage/shenyun_wentigongyuan_b1ebf798.jpg",
  // 深云文体公园鸟瞰
  "/manus-storage/dayun_zhongxin_a5fa7b24.jpg",
  // 大运中心鸟瞰
  "/manus-storage/shenzhenwang_tiyuzhongxin_f968f210.jpg",
  // 深圳湾体育中心
  "/manus-storage/xiangmi_tiyuzhongxin_1a956f13.jpg",
  // 香蜜体育中心
  "/manus-storage/dashahe_wangqiu_89abde6b.jpg"
  // 大沙河网球中心
];
function getVenuePhoto(venueName) {
  if (!venueName) return FALLBACK_VENUE_PHOTOS[0];
  for (const [keyword, photoUrl] of Object.entries(SHENZHEN_VENUE_PHOTOS)) {
    if (venueName.includes(keyword)) {
      return photoUrl;
    }
  }
  return FALLBACK_VENUE_PHOTOS[Math.floor(Math.random() * FALLBACK_VENUE_PHOTOS.length)];
}
async function sendNotification(userId, type, title, content, relatedId) {
  try {
    await createNotification({ userId, type, title, content, relatedId });
  } catch (e) {
    console.warn("Notification failed:", e);
  }
}
async function tryPromoteFromWaitlist(matchId, matchTitle) {
  try {
    const dbInst = await getDb();
    if (!dbInst) return false;
    const match = await getTennisMatchById(matchId);
    if (!match) return false;
    if (match.status !== "open" || match.currentParticipants >= match.maxParticipants) return false;
    const { matchParticipants: mp, matchMessages: mm } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const { eq: eq2, and: and2, asc: asc2 } = await import("drizzle-orm");
    const waiters = await dbInst.select().from(mp).where(and2(eq2(mp.matchId, matchId), eq2(mp.status, "waitlist"))).orderBy(asc2(mp.createdAt));
    if (!waiters.length) return false;
    const needsPayment = !!(match.feeRequired && match.feePerPerson && Number(match.feePerPerson) > 0);
    if (!needsPayment) {
      const first = waiters[0];
      await dbInst.update(mp).set({ status: "confirmed", paymentStatus: "not_required" }).where(and2(eq2(mp.matchId, matchId), eq2(mp.userId, first.userId)));
      await updateTennisMatchParticipantCount(matchId, 1);
      if (match.currentParticipants + 1 >= match.maxParticipants) {
        await updateTennisMatchStatus(matchId, "full");
      }
      await sendNotification(
        first.userId,
        "system",
        "\u5019\u8865\u6210\u529F \u{1F3BE}",
        `\u6709\u4EBA\u9000\u51FA\uFF0C\u60A8\u5DF2\u4ECE\u5019\u8865\u540D\u5355\u8865\u4F4D\u6210\u529F\uFF0C\u8FDB\u5165\u7403\u5C40\u300C${matchTitle}\u300D\u3002\u8BF7\u51C6\u65F6\u5230\u573A\uFF01`,
        matchId
      );
      try {
        const u = await getUserById(first.userId);
        if (u?.wechatOpenid) {
          await wxNotifyMatchJoin({ openid: u.wechatOpenid, matchTitle, joinerName: "\u60A8" }).catch(() => {
          });
        }
      } catch {
      }
      try {
        const u2 = await getUserById(first.userId);
        await dbInst.insert(mm).values({ matchId, userId: first.userId, content: `${u2?.name ?? "\u5019\u8865\u7403\u53CB"} \u4ECE\u5019\u8865\u540D\u5355\u8865\u4F4D\u6210\u529F \u{1F3BE}`, msgType: "system" });
      } catch {
      }
      return true;
    }
    for (const w of waiters) {
      await sendNotification(
        w.userId,
        "system",
        "\u7403\u5C40\u6709\u7A7A\u4F4D\u5566 \u{1F3BE}",
        `\u60A8\u5019\u8865\u7684\u7403\u5C40\u300C${matchTitle}\u300D\u51FA\u73B0\u7A7A\u4F4D\uFF0C\u5148\u5230\u5148\u5F97\uFF01\u8BF7\u5C3D\u5FEB\u8FDB\u5165\u7403\u5C40\u5B8C\u6210\u62A5\u540D\u4E0E\u652F\u4ED8\uFF08\u540D\u989D\u6709\u9650\uFF0C\u53EF\u80FD\u88AB\u4ED6\u4EBA\u62A2\u5148\uFF09\u3002`,
        matchId
      );
      try {
        const u = await getUserById(w.userId);
        if (u?.wechatOpenid) {
          await wxNotifyMatchJoin({ openid: u.wechatOpenid, matchTitle, joinerName: "\u5019\u8865\u63D0\u9192" }).catch(() => {
          });
        }
      } catch {
      }
    }
    return false;
  } catch (e) {
    console.warn("[tryPromoteFromWaitlist] failed:", e?.message || e);
    return false;
  }
}
var appRouter = router({
  system: systemRouter,
  // ─── Auth ──────────────────────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    }),
    // ─── Phone + SMS login ───────────────────────────────────────────────────────
    sendSmsCode: publicProcedure.input(z2.object({ phone: z2.string().regex(/^1[3-9]\d{9}$/, "\u8BF7\u8F93\u5165\u6B63\u786E\u7684\u624B\u673A\u53F7") })).mutation(async ({ input }) => {
      const { phone } = input;
      const code = Math.floor(1e5 + Math.random() * 9e5).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1e3);
      await createSmsCode(phone, code, expiresAt);
      smsSendVerifyCode({ phone, code }).catch(console.error);
      if (process.env.NODE_ENV !== "production") {
        console.log(`[SMS Dev] \u624B\u673A\u53F7: ${phone}, \u9A8C\u8BC1\u7801: ${code} (\u6709\u6548\u671F10\u5206\u949F)`);
      }
      return { success: true, message: "\u9A8C\u8BC1\u7801\u5DF2\u53D1\u9001" };
    }),
    loginWithPhone: publicProcedure.input(z2.object({
      phone: z2.string().regex(/^1[3-9]\d{9}$/, "\u8BF7\u8F93\u5165\u6B63\u786E\u7684\u624B\u673A\u53F7"),
      code: z2.string().length(6, "\u9A8C\u8BC1\u7801\u5FC5\u987B\u4E3A6\u4F4D")
    })).mutation(async ({ input, ctx }) => {
      const { phone, code } = input;
      const smsRecord = await getValidSmsCode(phone, code);
      if (!smsRecord) {
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: "\u9A8C\u8BC1\u7801\u9519\u8BEF\u6216\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u91CD\u65B0\u83B7\u53D6"
        });
      }
      await markSmsCodeUsed(smsRecord.id);
      const openId = `phone_${phone}`;
      await upsertUser({
        openId,
        phone,
        name: phone,
        // default name is phone number, user can update later
        loginMethod: "phone",
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const user = await getUserByOpenId(openId);
      if (!user) {
        throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "\u7528\u6237\u521B\u5EFA\u5931\u8D25" });
      }
      const sessionToken = await sdk.signSession({
        openId,
        appId: ENV.appId,
        name: user.name || phone
      });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);
      return {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          avatar: user.avatar
        }
      };
    }),
    // ─── Email register/login ────────────────────────────────────────────────
    registerWithEmail: publicProcedure.input(z2.object({
      email: z2.string().email("\u8BF7\u8F93\u5165\u6B63\u786E\u7684\u90AE\u7B46\u5730\u5740"),
      password: z2.string().min(8, "\u5BC6\u7801\u81F3\u5C118\u4F4D").max(64, "\u5BC6\u7801\u6700\u593064\u4F4D"),
      name: z2.string().min(1, "\u8BF7\u8F93\u5165\u59D3\u540D").max(50).optional(),
      phone: z2.string().regex(/^1[3-9]\d{9}$/, "\u8BF7\u8F93\u5165\u6B63\u786E\u7684\u624B\u673A\u53F7").optional(),
      wechatId: z2.string().min(1).max(100).optional()
    })).mutation(async ({ input, ctx }) => {
      const { email, password, name, phone, wechatId } = input;
      const existing = await getUserByEmail(email);
      if (existing) {
        throw new TRPCError3({ code: "CONFLICT", message: "\u8BE5\u90AE\u7BB1\u5DF2\u6CE8\u518C\uFF0C\u8BF7\u76F4\u63A5\u767B\u5F55" });
      }
      const passwordHash = await bcrypt.hash(password, 8);
      const openId = `email_${email}`;
      await upsertUser({
        openId,
        email,
        name: name || email.split("@")[0],
        phone: phone || void 0,
        wechatId: wechatId || void 0,
        loginMethod: "email",
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      await setUserPasswordHash(openId, passwordHash);
      const user = await getUserByOpenId(openId);
      if (!user) {
        throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "\u6CE8\u518C\u5931\u8D25" });
      }
      const sessionToken = await sdk.signSession({
        openId,
        appId: ENV.appId,
        name: user.name || email
      });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);
      return {
        success: true,
        user: { id: user.id, name: user.name, email: user.email, role: user.role }
      };
    }),
    loginWithEmail: publicProcedure.input(z2.object({
      email: z2.string().email("\u8BF7\u8F93\u5165\u6B63\u786E\u7684\u90AE\u7BB1\u5730\u5740"),
      password: z2.string().min(1, "\u8BF7\u8F93\u5165\u5BC6\u7801")
    })).mutation(async ({ input, ctx }) => {
      const { email, password } = input;
      const user = await getUserByEmail(email);
      if (!user || !user.passwordHash) {
        throw new TRPCError3({ code: "UNAUTHORIZED", message: "\u90AE\u7BB1\u6216\u5BC6\u7801\u9519\u8BEF" });
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        throw new TRPCError3({ code: "UNAUTHORIZED", message: "\u90AE\u7BB1\u6216\u5BC6\u7801\u9519\u8BEF" });
      }
      await upsertUser({
        openId: user.openId,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.signSession({
        openId: user.openId,
        appId: ENV.appId,
        name: user.name || email
      });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);
      return {
        success: true,
        user: { id: user.id, name: user.name, email: user.email, role: user.role }
      };
    }),
    // ─── Phone + Password register/login ────────────────────────────────
    registerWithPhone: publicProcedure.input(z2.object({
      phone: z2.string().regex(/^1[3-9]\d{9}$/, "\u8BF7\u8F93\u5165\u6B63\u786E\u7684\u624B\u673A\u53F7"),
      password: z2.string().min(8, "\u5BC6\u7801\u81F3\u5C118\u4F4D").max(64, "\u5BC6\u7801\u6700\u591064\u4F4D"),
      name: z2.string().min(1, "\u8BF7\u8F93\u5165\u59D3\u540D").max(50).optional(),
      code: z2.string().length(6, "\u9A8C\u8BC1\u7801\u5FC5\u987B\u4E3A6\u4F4D")
    })).mutation(async ({ input, ctx }) => {
      const { phone, password, name, code } = input;
      const smsRecord = await getValidSmsCode(phone, code);
      if (!smsRecord) throw new TRPCError3({ code: "BAD_REQUEST", message: "\u9A8C\u8BC1\u7801\u9519\u8BEF\u6216\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u91CD\u65B0\u83B7\u53D6" });
      await markSmsCodeUsed(smsRecord.id);
      const openId = `phone_${phone}`;
      const existing = await getUserByOpenId(openId);
      if (existing) throw new TRPCError3({ code: "CONFLICT", message: "\u8BE5\u624B\u673A\u53F7\u5DF2\u6CE8\u518C\uFF0C\u8BF7\u76F4\u63A5\u767B\u5F55" });
      const passwordHash = await bcrypt.hash(password, 8);
      await upsertUser({ openId, phone, name: name || phone, loginMethod: "phone_password", lastSignedIn: /* @__PURE__ */ new Date() });
      await setUserPasswordHash(openId, passwordHash);
      const user = await getUserByOpenId(openId);
      if (!user) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "\u6CE8\u518C\u5931\u8D25" });
      const sessionToken = await sdk.signSession({ openId, appId: ENV.appId, name: user.name || phone });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);
      return { success: true, user: { id: user.id, name: user.name, phone: user.phone, role: user.role } };
    }),
    loginWithPassword: publicProcedure.input(z2.object({
      phone: z2.string().regex(/^1[3-9]\d{9}$/, "\u8BF7\u8F93\u5165\u6B63\u786E\u7684\u624B\u673A\u53F7"),
      password: z2.string().min(1, "\u8BF7\u8F93\u5165\u5BC6\u7801")
    })).mutation(async ({ input, ctx }) => {
      const { phone, password } = input;
      const openId = `phone_${phone}`;
      const user = await getUserByOpenId(openId);
      if (!user || !user.passwordHash) throw new TRPCError3({ code: "UNAUTHORIZED", message: "\u624B\u673A\u53F7\u6216\u5BC6\u7801\u9519\u8BEF" });
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) throw new TRPCError3({ code: "UNAUTHORIZED", message: "\u624B\u673A\u53F7\u6216\u5BC6\u7801\u9519\u8BEF" });
      await upsertUser({ openId, lastSignedIn: /* @__PURE__ */ new Date() });
      const sessionToken = await sdk.signSession({ openId, appId: ENV.appId, name: user.name || phone });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);
      return { success: true, user: { id: user.id, name: user.name, phone: user.phone, role: user.role } };
    }),
    // ─── 微信小程序登录 ──────────────────────────────────────────────────────────────────────────────
    // 小程序前端调用 wx.login() 获取 code，传到后端换取 openid 并建立会话
    loginWithWechat: publicProcedure.input(z2.object({
      code: z2.string().min(1, "\u5FAE\u4FE1\u767B\u5F55 code \u4E0D\u80FD\u4E3A\u7A7A"),
      nickName: z2.string().optional(),
      avatarUrl: z2.string().optional(),
      phoneCode: z2.string().optional()
      // getPhoneNumber 返回的动态令牌，传了则登录时绑定手机号
    })).mutation(async ({ input, ctx }) => {
      const { code, nickName, avatarUrl, phoneCode } = input;
      const { code2Session: code2Session2 } = await Promise.resolve().then(() => (init_wechat(), wechat_exports));
      let sessionData;
      try {
        sessionData = await code2Session2(code);
      } catch (err) {
        console.error("[loginWithWechat] code2Session failed:", err?.message || String(err));
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: "\u5FAE\u4FE1\u767B\u5F55\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5"
        });
      }
      const { openid: wechatOpenid } = sessionData;
      let user = await getUserByWechatOpenid(wechatOpenid);
      if (!user) {
        user = await createUserByWechat(wechatOpenid, nickName, avatarUrl);
      } else {
        await upsertUser({ openId: user.openId, lastSignedIn: /* @__PURE__ */ new Date() });
      }
      if (!user) {
        throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "\u7528\u6237\u521B\u5EFA\u5931\u8D25" });
      }
      if (phoneCode && !user.phone) {
        try {
          const { getPhoneNumberByCode } = await Promise.resolve().then(() => (init_wechat(), wechat_exports));
          const phone = await getPhoneNumberByCode(phoneCode);
          if (phone) {
            await upsertUser({ openId: user.openId, phone });
            user = { ...user, phone };
          }
        } catch (err) {
          console.error("[loginWithWechat] bind phone failed:", err?.message || String(err));
        }
      }
      const sessionToken = await sdk.signSession({
        openId: user.openId,
        appId: ENV.appId,
        name: user.name || "\u5FAE\u4FE1\u7528\u6237"
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
          ntrpLevel: user.ntrpLevel,
          createdAt: user.createdAt ? new Date(user.createdAt).getTime() : Date.now(),
          isNewUser: !user.phone
          // 新用户尚未绑定手机号
        }
      };
    }),
    // ─── 微信登录绑定手机号 ──────────────────────────────────────────────────────────────────────────────
    // 微信登录后如果是新用户，引导绑定手机号（可选）
    bindPhoneToWechat: protectedProcedure.input(z2.object({
      phone: z2.string().regex(/^1[3-9]\d{9}$/, "\u8BF7\u8F93\u5165\u6B63\u786E\u7684\u624B\u673A\u53F7"),
      code: z2.string().length(6, "\u9A8C\u8BC1\u7801\u5FC5\u987B\u4E3A6\u4F4D")
    })).mutation(async ({ input, ctx }) => {
      const { phone, code } = input;
      const smsRecord = await getValidSmsCode(phone, code);
      if (!smsRecord) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u9A8C\u8BC1\u7801\u9519\u8BEF\u6216\u5DF2\u8FC7\u671F" });
      }
      await markSmsCodeUsed(smsRecord.id);
      const db2 = await Promise.resolve().then(() => (init_db(), db_exports));
      await db2.upsertUser({ openId: ctx.user.openId, phone, lastSignedIn: /* @__PURE__ */ new Date() });
      return { success: true };
    }),
    // ─── 小程序专用：邮箱密码登录（返回JWT token，不依赖Cookie）─────────────────────────────
    miniLoginWithEmail: publicProcedure.input(z2.object({
      email: z2.string().email("\u8BF7\u8F93\u5165\u6B63\u786E\u7684\u90AE\u7BB1\u5730\u5740"),
      password: z2.string().min(1, "\u8BF7\u8F93\u5165\u5BC6\u7801")
    })).mutation(async ({ input }) => {
      const { email, password } = input;
      let user = await getUserByEmail(email);
      if (!user) {
        if (password.length < 6) {
          throw new TRPCError3({ code: "BAD_REQUEST", message: "\u5BC6\u7801\u81F3\u5C116\u4F4D" });
        }
        const passwordHash = await bcrypt.hash(password, 8);
        const openId = `email_${email}`;
        await upsertUser({ openId, email, name: email.split("@")[0], loginMethod: "email", lastSignedIn: /* @__PURE__ */ new Date() });
        await setUserPasswordHash(openId, passwordHash);
        user = await getUserByOpenId(openId);
        if (!user) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "\u6CE8\u518C\u5931\u8D25" });
      } else {
        if (!user.passwordHash) {
          throw new TRPCError3({ code: "UNAUTHORIZED", message: "\u8BE5\u90AE\u7BB1\u672A\u8BBE\u7F6E\u5BC6\u7801\uFF0C\u8BF7\u901A\u8FC7\u7F51\u9875\u7AEF\u767B\u5F55" });
        }
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          throw new TRPCError3({ code: "UNAUTHORIZED", message: "\u90AE\u7BB1\u6216\u5BC6\u7801\u9519\u8BEF" });
        }
        await upsertUser({ openId: user.openId, lastSignedIn: /* @__PURE__ */ new Date() });
        user = await getUserByOpenId(user.openId);
        if (!user) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "\u7528\u6237\u4E0D\u5B58\u5728" });
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
          createdAt: user.createdAt ? new Date(user.createdAt).getTime() : Date.now()
        }
      };
    }),
    // ─── 小程序专用：手机号验证码登录（返回JWT token）─────────────────────────────────────
    miniLoginWithPhone: publicProcedure.input(z2.object({
      phone: z2.string().regex(/^1[3-9]\d{9}$/, "\u8BF7\u8F93\u5165\u6B63\u786E\u7684\u624B\u673A\u53F7"),
      code: z2.string().length(6, "\u9A8C\u8BC1\u7801\u5FC5\u987B\u4E3A6\u4F4D")
    })).mutation(async ({ input }) => {
      const { phone, code } = input;
      const smsRecord = await getValidSmsCode(phone, code);
      if (!smsRecord) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u9A8C\u8BC1\u7801\u9519\u8BEF\u6216\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u91CD\u65B0\u83B7\u53D6" });
      }
      await markSmsCodeUsed(smsRecord.id);
      const openId = `phone_${phone}`;
      await upsertUser({ openId, phone, name: phone, loginMethod: "phone", lastSignedIn: /* @__PURE__ */ new Date() });
      const user = await getUserByOpenId(openId);
      if (!user) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "\u7528\u6237\u521B\u5EFA\u5931\u8D25" });
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
          createdAt: user.createdAt ? new Date(user.createdAt).getTime() : Date.now()
        }
      };
    }),
    // ─── 小程序专用：手机号+密码登录（返回JWT token）────────────────────────────────
    miniLoginWithPassword: publicProcedure.input(z2.object({
      phone: z2.string().regex(/^1[3-9]\d{9}$/, "\u8BF7\u8F93\u5165\u6B63\u786E\u7684\u624B\u673A\u53F7"),
      password: z2.string().min(1, "\u8BF7\u8F93\u5165\u5BC6\u7801")
    })).mutation(async ({ input }) => {
      const { phone, password } = input;
      const openId = `phone_${phone}`;
      const user = await getUserByOpenId(openId);
      if (!user || !user.passwordHash) {
        throw new TRPCError3({ code: "UNAUTHORIZED", message: "\u624B\u673A\u53F7\u6216\u5BC6\u7801\u9519\u8BEF" });
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) throw new TRPCError3({ code: "UNAUTHORIZED", message: "\u624B\u673A\u53F7\u6216\u5BC6\u7801\u9519\u8BEF" });
      await upsertUser({ openId, lastSignedIn: /* @__PURE__ */ new Date() });
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
          createdAt: user.createdAt ? new Date(user.createdAt).getTime() : Date.now()
        }
      };
    }),
    // ─── 小程序专用：保存微信 openid（静默绑定，用于订阅消息推送）────────────────────────────────
    saveWechatOpenid: protectedProcedure.input(z2.object({
      code: z2.string().min(1, "wx.login code \u4E0D\u80FD\u4E3A\u7A7A")
    })).mutation(async ({ input, ctx }) => {
      const { code2Session: code2Session2 } = await Promise.resolve().then(() => (init_wechat(), wechat_exports));
      const session = await code2Session2(input.code);
      if (!session.openid) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u65E0\u6CD5\u83B7\u53D6\u5FAE\u4FE1 openid" });
      }
      await bindWechatOpenid(ctx.user.id, session.openid);
      return { success: true };
    }),
    // ─── 小程序专用：手机号+密码注册（返回JWT token）────────────────────────────────
    miniRegisterWithPassword: publicProcedure.input(z2.object({
      phone: z2.string().regex(/^1[3-9]\d{9}$/, "\u8BF7\u8F93\u5165\u6B63\u786E\u7684\u624B\u673A\u53F7"),
      password: z2.string().min(6, "\u5BC6\u7801\u81F36\u4F4D").max(64),
      name: z2.string().min(1).max(50).optional()
    })).mutation(async ({ input }) => {
      const { phone, password, name } = input;
      const openId = `phone_${phone}`;
      const existing = await getUserByOpenId(openId);
      if (existing) throw new TRPCError3({ code: "CONFLICT", message: "\u8BE5\u624B\u673A\u53F7\u5DF2\u6CE8\u518C\uFF0C\u8BF7\u76F4\u63A5\u767B\u5F55" });
      const passwordHash = await bcrypt.hash(password, 8);
      await upsertUser({ openId, phone, name: name || phone, loginMethod: "phone_password", lastSignedIn: /* @__PURE__ */ new Date() });
      await setUserPasswordHash(openId, passwordHash);
      const user = await getUserByOpenId(openId);
      if (!user) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "\u6CE8\u518C\u5931\u8D25" });
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
          createdAt: user.createdAt ? new Date(user.createdAt).getTime() : Date.now()
        }
      };
    }),
    // 通过手机号查找用户（供替代人选功能使用）
    findUserByPhone: protectedProcedure.input(z2.object({ phone: z2.string().regex(/^1[3-9]\d{9}$/, "\u8BF7\u8F93\u5165\u6B63\u786E\u7684\u624B\u673A\u53F7") })).query(async ({ input }) => {
      const user = await getUserByPhone(input.phone);
      if (!user) return null;
      return { id: user.id, name: user.name, avatar: user.avatar };
    }),
    // ─── 临时调试：微信支付配置状态 ───────────────────────────────────────────
    wxpayDebug: publicProcedure.mutation(async () => {
      const { isWxpayConfigured: isWxpayConfigured2, wxpayConfig: wxpayConfig2 } = await Promise.resolve().then(() => (init_wxpay(), wxpay_exports));
      const configured = isWxpayConfigured2();
      let recentOrders = [];
      let ordersError = null;
      try {
        recentOrders = await getRecentMatchOrders(5);
      } catch (e) {
        ordersError = e?.message || String(e);
      }
      const publicKeyPreview = wxpayConfig2.publicKey ? wxpayConfig2.publicKey.substring(0, 60) + "..." : "EMPTY";
      const privateKeyPreview = wxpayConfig2.privateKey ? wxpayConfig2.privateKey.substring(0, 60) + "..." : "EMPTY";
      return {
        isWxpayConfigured: configured,
        appId: wxpayConfig2.appId ? wxpayConfig2.appId.substring(0, 8) + "..." : "EMPTY",
        mchId: wxpayConfig2.mchId ? wxpayConfig2.mchId : "EMPTY",
        hasApiV3Key: !!wxpayConfig2.apiV3Key,
        apiV3KeyLength: wxpayConfig2.apiV3Key?.length || 0,
        hasSerialNo: !!wxpayConfig2.serialNo,
        serialNo: wxpayConfig2.serialNo || "EMPTY",
        privateKeyLength: wxpayConfig2.privateKey?.length || 0,
        privateKeyPreview,
        hasPublicKey: !!wxpayConfig2.publicKey,
        publicKeyId: wxpayConfig2.publicKeyId || "EMPTY",
        publicKeyPreview,
        notifyUrl: wxpayConfig2.notifyUrl,
        recentOrders,
        ordersError
      };
    })
  }),
  // ─── Coaches ───────────────────────────────────────────────────────────────
  coach: router({
    list: publicProcedure.input(z2.object({
      limit: z2.number().optional(),
      offset: z2.number().optional(),
      /** Filter by weekly availability: 0=Sun,1=Mon,...,6=Sat */
      dayOfWeek: z2.number().min(0).max(6).optional(),
      startTime: z2.string().optional(),
      endTime: z2.string().optional()
    }).optional()).query(async ({ input }) => {
      let coaches = await getCoachProfiles(input);
      if (input?.dayOfWeek !== void 0 && input.startTime && input.endTime) {
        const availableIds = await getCoachIdsByWeeklyAvailability(
          input.dayOfWeek,
          input.startTime,
          input.endTime
        );
        coaches = coaches.filter((c) => availableIds.includes(c.id));
      }
      const withVenues = await Promise.all(
        coaches.map(async (c) => {
          const venues2 = await getCoachVenues(c.id);
          const availability = await getCoachAvailability(c.id);
          const teachingLocations = await getCoachLocations(c.id);
          return { ...c, venues: venues2, availability, teachingLocations };
        })
      );
      return withVenues;
    }),
    getById: publicProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      const coach = await getCoachProfileById(input.id);
      if (!coach) throw new TRPCError3({ code: "NOT_FOUND" });
      const reviews2 = await getCoachReviews(input.id);
      const venues2 = await getCoachVenues(input.id);
      const availability = await getCoachAvailability(input.id);
      const reservedSlots = await getCoachReservedSlotsPublic(input.id);
      return { coach, reviews: reviews2, venues: venues2, availability, reservedSlots };
    }),
    getBySlug: publicProcedure.input(z2.object({ slug: z2.string() })).query(async ({ input }) => {
      const coach = await getCoachProfileBySlug(input.slug);
      if (!coach) throw new TRPCError3({ code: "NOT_FOUND" });
      const reviews2 = await getCoachReviews(coach.id);
      const venues2 = await getCoachVenues(coach.id);
      const reservedSlots = await getCoachReservedSlotsPublic(coach.id);
      return { coach, reviews: reviews2, venues: venues2, reservedSlots };
    }),
    checkMyApplication: protectedProcedure.query(async ({ ctx }) => {
      const profile = await getCoachProfileByUserId(ctx.user.id);
      if (!profile) return { exists: false, profile: null };
      return { exists: true, profile };
    }),
    myProfile: coachProcedure.query(async ({ ctx }) => {
      const profile = await getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError3({ code: "NOT_FOUND", message: "\u6559\u7EC3\u6863\u6848\u4E0D\u5B58\u5728" });
      const venues2 = await getCoachVenues(profile.id);
      const availability = await getCoachAvailability(profile.id);
      return { profile, venues: venues2, availability };
    }),
    createProfile: protectedProcedure.input(z2.object({
      displayName: z2.string().min(2),
      tagline: z2.string().optional(),
      bio: z2.string().optional(),
      phone: z2.string().optional(),
      // coach contact phone
      yearsExperience: z2.number().optional(),
      certifications: z2.array(z2.string()).optional(),
      certificationImages: z2.array(z2.string()).optional(),
      // uploaded cert image URLs
      specialties: z2.array(z2.string()).optional(),
      achievements: z2.array(z2.string()).optional(),
      pricePerHour: z2.string().optional(),
      socialLinks: z2.object({
        xiaohongshu: z2.string().optional(),
        wechat: z2.string().optional(),
        weibo: z2.string().optional(),
        douyin: z2.string().optional(),
        other: z2.string().optional()
      }).optional(),
      videoUrl: z2.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const existing = await getCoachProfileByUserId(ctx.user.id);
      if (existing) throw new TRPCError3({ code: "CONFLICT", message: "\u6559\u7EC3\u6863\u6848\u5DF2\u5B58\u5728" });
      const inviteCode = nanoid(8).toUpperCase();
      const shareSlug = input.displayName.replace(/\s+/g, "-").toLowerCase() + "-" + nanoid(4);
      await createCoachProfile({
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
        verificationStatus: "pending"
        // 直接进入待审核队列
      });
      await notifyOwner({
        title: `\u65B0\u6559\u7EC3\u5165\u9A7B\u7533\u8BF7 \u{1F3BE}`,
        content: `${ctx.user.name ?? ctx.user.email ?? "\u672A\u77E5\u7528\u6237"} \u63D0\u4EA4\u4E86\u6559\u7EC3\u5165\u9A7B\u7533\u8BF7\uFF0C\u8BF7\u5230\u7BA1\u7406\u540E\u53F0\u5BA1\u6838\u3002`
      });
      return { success: true, inviteCode, shareSlug };
    }),
    updateProfile: coachProcedure.input(z2.object({
      displayName: z2.string().optional(),
      tagline: z2.string().optional(),
      bio: z2.string().optional(),
      phone: z2.string().optional(),
      // coach contact phone
      avatar: z2.string().optional(),
      coverImage: z2.string().optional(),
      yearsExperience: z2.number().optional(),
      certifications: z2.array(z2.string()).optional(),
      certificationImages: z2.array(z2.string()).optional(),
      specialties: z2.array(z2.string()).optional(),
      achievements: z2.array(z2.string()).optional(),
      pricePerHour: z2.string().optional(),
      socialLinks: z2.object({
        xiaohongshu: z2.string().optional(),
        wechat: z2.string().optional(),
        weibo: z2.string().optional(),
        douyin: z2.string().optional(),
        other: z2.string().optional()
      }).optional(),
      videoUrl: z2.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const profile = await getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError3({ code: "NOT_FOUND" });
      const hasPromoContent = input.socialLinks !== void 0 || input.videoUrl !== void 0;
      const updateData = { ...input };
      if (hasPromoContent) {
        updateData.contentReviewStatus = "pending";
        updateData.contentReviewNote = null;
      }
      await updateCoachProfile(profile.id, updateData);
      return { success: true, contentReviewReset: hasPromoContent };
    }),
    setAvailability: coachProcedure.input(z2.object({
      slots: z2.array(z2.object({
        dayOfWeek: z2.number().optional(),
        specificDate: z2.string().optional(),
        startTime: z2.string(),
        endTime: z2.string()
      }))
    })).mutation(async ({ ctx, input }) => {
      const profile = await getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError3({ code: "NOT_FOUND" });
      await setCoachAvailability(profile.id, input.slots);
      return { success: true };
    }),
    // ── Weekly availability: add/remove individual slots ─────────────────────
    addWeeklySlot: coachProcedure.input(z2.object({
      dayOfWeek: z2.number().min(0).max(6),
      startTime: z2.string().regex(/^\d{2}:\d{2}$/),
      endTime: z2.string().regex(/^\d{2}:\d{2}$/),
      specificDate: z2.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const profile = await getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError3({ code: "NOT_FOUND", message: "\u6559\u7EC3\u6863\u6848\u4E0D\u5B58\u5728" });
      if (input.startTime >= input.endTime)
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u7ED3\u675F\u65F6\u95F4\u5FC5\u987B\u665A\u4E8E\u5F00\u59CB\u65F6\u95F4" });
      await addCoachWeeklySlot(profile.id, input.dayOfWeek, input.startTime, input.endTime, input.specificDate);
      return { success: true };
    }),
    removeWeeklySlot: coachProcedure.input(z2.object({ slotId: z2.number() })).mutation(async ({ ctx, input }) => {
      const profile = await getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError3({ code: "NOT_FOUND", message: "\u6559\u7EC3\u6863\u6848\u4E0D\u5B58\u5728" });
      await removeCoachWeeklySlot(profile.id, input.slotId);
      return { success: true };
    }),
    // ── Price per hour ────────────────────────────────────────────────────────
    /** Minimum price: 300 CNY/hr to protect platform's premium positioning */
    updatePricePerHour: coachProcedure.input(z2.object({
      pricePerHour: z2.string().refine((v) => {
        const n = parseFloat(v);
        return !isNaN(n) && n >= 300;
      }, { message: "\u8BFE\u65F6\u5355\u4EF7\u4E0D\u80FD\u4F4E\u4E8E\u5E73\u53F0\u6700\u4F4E\u6807\u51C6 300 \u5143/\u5C0F\u65F6" })
    })).mutation(async ({ ctx, input }) => {
      const profile = await getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError3({ code: "NOT_FOUND", message: "\u6559\u7EC3\u6863\u6848\u4E0D\u5B58\u5728" });
      await updateCoachProfile(profile.id, { pricePerHour: input.pricePerHour });
      return { success: true };
    }),
    bindVenue: coachProcedure.input(z2.object({ venueId: z2.number(), isPreferred: z2.boolean().optional() })).mutation(async ({ ctx, input }) => {
      let profile = await getCoachProfileByUserId(ctx.user.id);
      if (!profile) {
        const inviteCode = nanoid(8).toUpperCase();
        const shareSlug = (ctx.user.name ?? "coach").replace(/\s+/g, "-").toLowerCase() + "-" + nanoid(4);
        await createCoachProfile({
          userId: ctx.user.id,
          displayName: ctx.user.name ?? "\u6559\u7EC3",
          inviteCode,
          shareSlug
        });
        profile = await getCoachProfileByUserId(ctx.user.id);
        if (!profile) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "\u65E0\u6CD5\u521B\u5EFA\u6559\u7EC3\u6863\u6848" });
      }
      await addCoachVenue(profile.id, input.venueId, input.isPreferred ?? false);
      return { success: true };
    }),
    unbindVenue: coachProcedure.input(z2.object({ venueId: z2.number() })).mutation(async ({ ctx, input }) => {
      const profile = await getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError3({ code: "NOT_FOUND", message: "\u6559\u7EC3\u6863\u6848\u4E0D\u5B58\u5728" });
      await removeCoachVenue(profile.id, input.venueId);
      return { success: true };
    }),
    setVenuePreferred: coachProcedure.input(z2.object({ venueId: z2.number(), isPreferred: z2.boolean() })).mutation(async ({ ctx, input }) => {
      const profile = await getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError3({ code: "NOT_FOUND", message: "\u6559\u7EC3\u6863\u6848\u4E0D\u5B58\u5728" });
      await setCoachVenuePreferred(profile.id, input.venueId, input.isPreferred);
      return { success: true };
    }),
    allVenues: coachProcedure.query(async () => {
      return getAllVenues();
    }),
    // ── Reserved slots (coach has pre-booked a venue) ──────────────────────────
    reservedSlots: coachProcedure.query(async ({ ctx }) => {
      const profile = await getCoachProfileByUserId(ctx.user.id);
      if (!profile) return [];
      return getCoachReservedSlots(profile.id);
    }),
    addReservedSlot: coachProcedure.input(z2.object({
      specificDate: z2.string().regex(/^\d{4}-\d{2}-\d{2}$/, "\u65E5\u671F\u683C\u5F0F\u5E94\u4E3A YYYY-MM-DD"),
      startTime: z2.string().regex(/^\d{2}:\d{2}$/, "\u65F6\u95F4\u683C\u5F0F\u5E94\u4E3A HH:MM"),
      endTime: z2.string().regex(/^\d{2}:\d{2}$/, "\u65F6\u95F4\u683C\u5F0F\u5E94\u4E3A HH:MM"),
      venueId: z2.number(),
      courtNo: z2.string().optional(),
      venueNote: z2.string().max(200).optional()
    })).mutation(async ({ ctx, input }) => {
      let profile = await getCoachProfileByUserId(ctx.user.id);
      if (!profile) {
        const inviteCode = nanoid(8).toUpperCase();
        const shareSlug = (ctx.user.name ?? "coach").replace(/\s+/g, "-").toLowerCase() + "-" + nanoid(4);
        await createCoachProfile({
          userId: ctx.user.id,
          displayName: ctx.user.name ?? "\u6559\u7EC3",
          inviteCode,
          shareSlug
        });
        profile = await getCoachProfileByUserId(ctx.user.id);
        if (!profile) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "\u65E0\u6CD5\u521B\u5EFA\u6559\u7EC3\u6863\u6848" });
      }
      await addCoachReservedSlot({ coachId: profile.id, ...input });
      return { success: true };
    }),
    removeReservedSlot: coachProcedure.input(z2.object({ slotId: z2.number() })).mutation(async ({ ctx, input }) => {
      const profile = await getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError3({ code: "NOT_FOUND", message: "\u6559\u7EC3\u6863\u6848\u4E0D\u5B58\u5728" });
      await removeCoachReservedSlot(input.slotId, profile.id);
      return { success: true };
    }),
    // Submit coach profile for admin review
    submitForReview: coachProcedure.mutation(async ({ ctx }) => {
      const profile = await getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError3({ code: "NOT_FOUND", message: "\u8BF7\u5148\u521B\u5EFA\u6559\u7EC3\u6863\u6848" });
      if (profile.verificationStatus === "approved") {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u8D44\u8D28\u5DF2\u901A\u8FC7\u5BA1\u6838" });
      }
      if (profile.verificationStatus === "pending") {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u5DF2\u63D0\u4EA4\u5BA1\u6838\uFF0C\u8BF7\u7B49\u5F85\u7BA1\u7406\u5458\u5904\u7406" });
      }
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { coachProfiles: coachProfiles2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2 } = await import("drizzle-orm");
      await dbInstance.update(coachProfiles2).set({ verificationStatus: "pending" }).where(eq2(coachProfiles2.id, profile.id));
      return { success: true };
    }),
    stats: coachProcedure.query(async ({ ctx }) => {
      const profile = await getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError3({ code: "NOT_FOUND" });
      const stats = await getCoachStats(profile.id);
      const earnings = await getCoachEarnings(profile.id);
      return { ...stats, ...earnings };
    }),
    students: coachProcedure.query(async ({ ctx }) => {
      const profile = await getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError3({ code: "NOT_FOUND" });
      return getCoachStudents(profile.id);
    }),
    bookings: coachProcedure.input(z2.object({ status: z2.string().optional() }).optional()).query(async ({ ctx }) => {
      const profile = await getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError3({ code: "NOT_FOUND" });
      const bookingList = await getBookingsByCoach(profile.id);
      const enriched = await Promise.all(bookingList.map(async (b) => {
        const student = await getUserById(b.studentId);
        const venue = b.venueId ? await getVenueById(b.venueId) : null;
        return { ...b, student, venue };
      }));
      return enriched;
    }),
    confirmBooking: coachProcedure.input(z2.object({ bookingId: z2.number() })).mutation(async ({ ctx, input }) => {
      const profile = await getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError3({ code: "NOT_FOUND" });
      const booking = await getBookingById(input.bookingId);
      if (!booking || booking.coachId !== profile.id) throw new TRPCError3({ code: "FORBIDDEN" });
      if (booking.status !== "pending") throw new TRPCError3({ code: "BAD_REQUEST", message: "\u9884\u7EA6\u72B6\u6001\u4E0D\u6B63\u786E" });
      await updateBookingStatus(input.bookingId, "confirmed", { confirmedAt: /* @__PURE__ */ new Date() });
      await sendNotification(
        booking.studentId,
        "booking_confirmed",
        "\u9884\u7EA6\u5DF2\u786E\u8BA4 \u2705",
        `\u60A8\u7684\u8BFE\u7A0B\u9884\u7EA6\u5DF2\u88AB\u6559\u7EC3\u786E\u8BA4\uFF01\u65F6\u95F4\uFF1A${booking.lessonDate} ${booking.startTime}-${booking.endTime}`,
        input.bookingId
      );
      try {
        const [studentUser, coachUser] = await Promise.all([
          getUserById(booking.studentId),
          getUserById(profile.userId)
        ]);
        const coachPhone = profile.phone;
        const studentPhone = studentUser?.phone;
        if (studentUser?.wechatOpenid && coachPhone) {
          wxNotifyCoachContactToStudent({
            openid: studentUser.wechatOpenid,
            coachName: profile.displayName,
            coachPhone
          }).catch(console.error);
        }
        if (coachUser?.wechatOpenid && studentPhone) {
          wxNotifyStudentContactToCoach({
            openid: coachUser.wechatOpenid,
            studentName: studentUser?.name ?? "\u5B66\u5458",
            studentPhone
          }).catch(console.error);
        }
      } catch (wxErr) {
        console.error("[WxNotify] Failed to send contact info:", wxErr);
      }
      return { success: true };
    }),
    rejectBooking: coachProcedure.input(z2.object({ bookingId: z2.number(), reason: z2.string().optional() })).mutation(async ({ ctx, input }) => {
      const profile = await getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError3({ code: "NOT_FOUND" });
      const booking = await getBookingById(input.bookingId);
      if (!booking || booking.coachId !== profile.id) throw new TRPCError3({ code: "FORBIDDEN" });
      await updateBookingStatus(input.bookingId, "rejected", {
        cancelReason: input.reason,
        cancelledAt: /* @__PURE__ */ new Date()
      });
      await updatePaymentStatus(input.bookingId, "refunded");
      await sendNotification(
        booking.studentId,
        "booking_rejected",
        "\u9884\u7EA6\u88AB\u62D2\u7EDD",
        `\u60A8\u7684\u8BFE\u7A0B\u9884\u7EA6\u88AB\u6559\u7EC3\u62D2\u7EDD\u3002\u539F\u56E0\uFF1A${input.reason ?? "\u6559\u7EC3\u65F6\u95F4\u51B2\u7A81"}\u3002\u8D39\u7528\u5C06\u9000\u56DE\u539F\u652F\u4ED8\u65B9\u5F0F\u3002`,
        input.bookingId
      );
      return { success: true };
    }),
    cancelBooking: coachProcedure.input(z2.object({ bookingId: z2.number(), reason: z2.string().optional() })).mutation(async ({ ctx, input }) => {
      const profile = await getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError3({ code: "NOT_FOUND" });
      const booking = await getBookingById(input.bookingId);
      if (!booking || booking.coachId !== profile.id) throw new TRPCError3({ code: "FORBIDDEN" });
      await updateBookingStatus(input.bookingId, "cancelled_by_coach", {
        cancelReason: input.reason,
        cancelledAt: /* @__PURE__ */ new Date()
      });
      await updatePaymentStatus(input.bookingId, "refunded");
      await sendNotification(
        booking.studentId,
        "booking_cancelled",
        "\u8BFE\u7A0B\u5DF2\u53D6\u6D88",
        `\u6559\u7EC3\u53D6\u6D88\u4E86\u60A8\u7684\u8BFE\u7A0B\uFF08${booking.lessonDate} ${booking.startTime}\uFF09\u3002\u8D39\u7528\u5C06\u9000\u56DE\u539F\u652F\u4ED8\u65B9\u5F0F\u3002`,
        input.bookingId
      );
      return { success: true };
    }),
    coupons: coachProcedure.query(async ({ ctx }) => {
      const profile = await getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError3({ code: "NOT_FOUND" });
      return getCoachCoupons(profile.id);
    }),
    createCoupon: coachProcedure.input(z2.object({
      name: z2.string(),
      type: z2.enum(["fixed", "percent"]),
      discountValue: z2.string(),
      minOrderAmount: z2.string().optional(),
      maxUsageCount: z2.number().optional(),
      isFirstLesson: z2.boolean().optional(),
      validDays: z2.number().default(30)
    })).mutation(async ({ ctx, input }) => {
      const profile = await getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError3({ code: "NOT_FOUND" });
      const code = nanoid(8).toUpperCase();
      const validFrom = /* @__PURE__ */ new Date();
      const validUntil = new Date(Date.now() + input.validDays * 864e5);
      await createCoupon({
        coachId: profile.id,
        code,
        name: input.name,
        type: input.type,
        discountValue: input.discountValue,
        minOrderAmount: input.minOrderAmount,
        maxUsageCount: input.maxUsageCount,
        isFirstLesson: input.isFirstLesson,
        validFrom,
        validUntil
      });
      return { success: true, code };
    }),
    // ── Coach Locations ──────────────────────────────────────────────────────────────────
    myLocations: coachProcedure.query(async ({ ctx }) => {
      const profile = await getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError3({ code: "NOT_FOUND" });
      return getCoachLocations(profile.id);
    }),
    addLocation: coachProcedure.input(z2.object({
      name: z2.string().min(1),
      address: z2.string().min(1),
      latitude: z2.string().optional(),
      longitude: z2.string().optional(),
      isPrimary: z2.boolean().optional()
    })).mutation(async ({ ctx, input }) => {
      const profile = await getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError3({ code: "NOT_FOUND" });
      const locations = await getCoachLocations(profile.id);
      if (locations.length >= 5) throw new TRPCError3({ code: "BAD_REQUEST", message: "\u6700\u591A\u6DFB\u52A05\u4E2A\u5E38\u7528\u6559\u5B66\u5730\u70B9" });
      await addCoachLocation(profile.id, input);
      return { success: true };
    }),
    removeLocation: coachProcedure.input(z2.object({ locationId: z2.number() })).mutation(async ({ ctx, input }) => {
      const profile = await getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError3({ code: "NOT_FOUND" });
      await removeCoachLocation(profile.id, input.locationId);
      return { success: true };
    }),
    setPrimaryLocation: coachProcedure.input(z2.object({ locationId: z2.number() })).mutation(async ({ ctx, input }) => {
      const profile = await getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError3({ code: "NOT_FOUND" });
      await setPrimaryCoachLocation(profile.id, input.locationId);
      return { success: true };
    }),
    // ── PKU Discount ──────────────────────────────────────────────────────────────────────
    setPkuDiscount: coachProcedure.input(z2.object({
      pkuDiscount: z2.number().min(0).max(99)
      // 0=不折扣, 90=9折, 85=8.5折
    })).mutation(async ({ ctx, input }) => {
      const profile = await getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError3({ code: "NOT_FOUND" });
      await updateCoachProfile(profile.id, { pkuDiscount: input.pkuDiscount });
      return { success: true };
    }),
    // ── Lesson Packages ──────────────────────────────────────────────────────────────────
    myPackages: coachProcedure.query(async ({ ctx }) => {
      const profile = await getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError3({ code: "NOT_FOUND" });
      return getLessonPackagesByCoach(profile.id);
    }),
    createPackage: coachProcedure.input(z2.object({
      name: z2.string().min(1),
      totalLessons: z2.number().min(1).max(100),
      price: z2.string(),
      originalPrice: z2.string().optional(),
      description: z2.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const profile = await getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError3({ code: "NOT_FOUND" });
      await createLessonPackage({ coachId: profile.id, ...input });
      return { success: true };
    }),
    deletePackage: coachProcedure.input(z2.object({ packageId: z2.number() })).mutation(async ({ ctx, input }) => {
      const profile = await getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError3({ code: "NOT_FOUND" });
      await deleteLessonPackage(input.packageId, profile.id);
      return { success: true };
    }),
    studentPackages: coachProcedure.query(async ({ ctx }) => {
      const profile = await getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError3({ code: "NOT_FOUND" });
      const pkgs = await getStudentPackagesByCoach(profile.id);
      return Promise.all(pkgs.map(async (p) => {
        const student = await getUserById(p.studentId);
        const pkg = await getLessonPackageById(p.packageId);
        return { ...p, student, packageName: pkg?.name };
      }));
    }),
    deductLesson: coachProcedure.input(z2.object({
      studentPackageId: z2.number(),
      bookingId: z2.number().optional(),
      note: z2.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const pkg = await getStudentPackageById(input.studentPackageId);
      if (!pkg) throw new TRPCError3({ code: "NOT_FOUND", message: "\u8BFE\u65F6\u5305\u4E0D\u5B58\u5728" });
      const profile = await getCoachProfileByUserId(ctx.user.id);
      if (!profile || pkg.coachId !== profile.id) throw new TRPCError3({ code: "FORBIDDEN" });
      if (pkg.status !== "active") throw new TRPCError3({ code: "BAD_REQUEST", message: "\u8BFE\u65F6\u5305\u72B6\u6001\u5F02\u5E38" });
      await deductStudentPackageLesson(input.studentPackageId, ctx.user.id, input.bookingId, input.note);
      await sendNotification(
        pkg.studentId,
        "system",
        "\u8BFE\u65F6\u5DF2\u6263\u51CF",
        `\u6559\u7EC3\u5DF2\u786E\u8BA4\u5B8C\u6210\u4E00\u8282\u8BFE\uFF0C\u5269\u4F59\u8BFE\u65F6\uFF1A${pkg.remainingLessons - 1}\u8282\u3002`,
        void 0
      );
      return { success: true, remainingLessons: pkg.remainingLessons - 1 };
    })
  }),
  // ─── Tennis Match (约球) ──────────────────────────────────────────────────────────────────
  match: router({
    list: publicProcedure.input(z2.object({
      status: z2.string().optional(),
      matchType: z2.string().optional(),
      levelRequired: z2.string().optional(),
      dateFrom: z2.string().optional(),
      dateTo: z2.string().optional(),
      onlyAvailable: z2.boolean().optional(),
      city: z2.string().optional(),
      ntrpMin: z2.number().optional(),
      ntrpMax: z2.number().optional(),
      limit: z2.number().optional(),
      offset: z2.number().optional(),
      nearbyLat: z2.number().optional(),
      nearbyLng: z2.number().optional(),
      nearbyRadiusKm: z2.number().optional()
    }).optional()).query(async ({ input }) => {
      const matches = await getTennisMatches(input);
      function haversineKm(lat1, lng1, lat2, lng2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      }
      const enriched = await Promise.all(matches.map(async (m) => {
        const author = await getUserById(m.authorId);
        let distanceKm = null;
        if (input?.nearbyLat != null && input?.nearbyLng != null && m.latitude != null && m.longitude != null) {
          distanceKm = Math.round(haversineKm(input.nearbyLat, input.nearbyLng, Number(m.latitude), Number(m.longitude)) * 10) / 10;
        }
        return {
          ...m,
          organizerName: author?.name ?? null,
          organizerAvatar: author?.avatar ?? null,
          distanceKm
        };
      }));
      if (input?.nearbyLat != null && input?.nearbyLng != null) {
        const radius = input.nearbyRadiusKm ?? 15;
        return enriched.filter((m) => m.distanceKm != null && m.distanceKm <= radius).sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
      }
      return enriched;
    }),
    getById: publicProcedure.input(z2.object({ id: z2.number() })).query(async ({ input, ctx }) => {
      const match = await getTennisMatchById(input.id);
      if (!match) throw new TRPCError3({ code: "NOT_FOUND" });
      const safeMatch = { ...match, circleOnly: match.circleOnly ?? false, feeRequired: match.feeRequired ?? false };
      if (safeMatch.circleOnly && safeMatch.circleId) {
        if (!ctx.user) throw new TRPCError3({ code: "UNAUTHORIZED", message: "\u8BE5\u7403\u5C40\u4EC5\u9650\u5708\u5185\u6210\u5458\u67E5\u770B\uFF0C\u8BF7\u5148\u767B\u5F55" });
        const dbInstance = await getDb();
        if (dbInstance) {
          const { circleMembers: circleMembers2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
          const { eq: eq2, and: and2 } = await import("drizzle-orm");
          const [membership] = await dbInstance.select().from(circleMembers2).where(and2(eq2(circleMembers2.circleId, safeMatch.circleId), eq2(circleMembers2.userId, ctx.user.id))).limit(1);
          if (!membership) throw new TRPCError3({ code: "FORBIDDEN", message: "\u8BE5\u7403\u5C40\u4EC5\u9650\u5708\u5185\u6210\u5458\u67E5\u770B" });
        }
      }
      const participants = await getMatchParticipants(input.id);
      const author = await getUserById(match.authorId);
      const enrichedParticipants = await Promise.all(
        participants.map(async (p) => {
          const user = await getUserById(p.userId);
          return { ...p, user: user ? { id: user.id, name: user.name, avatar: user.avatar, ntrpLevel: user.ntrpLevel, creditScore: user.creditScore } : null };
        })
      );
      const confirmedParticipants = enrichedParticipants.filter((p) => p.status === "confirmed" && p.userId !== match.authorId);
      const waitlistParticipants = enrichedParticipants.filter((p) => p.status === "waitlist").sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      let myParticipation = null;
      if (ctx.user) {
        const mine = enrichedParticipants.find((p) => p.userId === ctx.user.id);
        if (mine) myParticipation = { status: mine.status, paymentStatus: mine.paymentStatus };
      }
      const realCurrent = 1 + confirmedParticipants.length;
      const maxP = match.maxParticipants ?? realCurrent;
      let correctedStatus = match.status;
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
        author: author ? { id: author.id, name: author.name, avatar: author.avatar, ntrpLevel: author.ntrpLevel, creditScore: author.creditScore } : null
      };
    }),
    create: protectedProcedure.input(z2.object({
      title: z2.string().min(2).max(100),
      matchType: z2.enum(["singles", "doubles", "mixed_doubles", "practice", "group"]),
      levelRequired: z2.enum(["itf1", "itf2", "itf3", "itf4", "itf5", "itf6", "itf7", "itf8", "itf9", "itf10", "any"]).default("any"),
      matchDate: z2.string(),
      startTime: z2.string(),
      endTime: z2.string().optional(),
      venueName: z2.string().min(1),
      venueAddress: z2.string().optional(),
      courtNo: z2.string().max(50).optional(),
      latitude: z2.number().optional(),
      longitude: z2.number().optional(),
      maxParticipants: z2.number().min(2).max(20),
      description: z2.string().optional(),
      contactInfo: z2.string().optional(),
      costPerPerson: z2.number().optional(),
      imageUrl: z2.string().optional(),
      city: z2.string().default("shenzhen"),
      ntrpMin: z2.number().min(1).max(6).optional(),
      ntrpMax: z2.number().min(1).max(6).optional(),
      costSplitType: z2.enum(["free", "aa", "host_pays", "custom"]).default("aa"),
      bringOwnBall: z2.boolean().default(false),
      feeRequired: z2.boolean().default(false),
      feePerPerson: z2.number().optional(),
      paymentDeadline: z2.number().optional(),
      circleId: z2.number().optional(),
      circleOnly: z2.boolean().optional()
    })).mutation(async ({ ctx, input }) => {
      const resolvedImageUrl = input.imageUrl || getVenuePhoto(input.venueName);
      let courtTotalFee = void 0;
      if (input.feeRequired && input.feePerPerson && input.feePerPerson > 0 && input.maxParticipants > 0) {
        courtTotalFee = Math.round(input.feePerPerson * input.maxParticipants * 100) / 100;
      }
      const newMatch = await createTennisMatch({ authorId: ctx.user.id, ...input, courtTotalFee, imageUrl: resolvedImageUrl });
      if (input.circleId) {
        try {
          const dbInst = await getDb();
          if (dbInst) {
            const { circleMembers: circleMembers2, circles: circles2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
            const { eq: eq2 } = await import("drizzle-orm");
            const [circle] = await dbInst.select().from(circles2).where(eq2(circles2.id, input.circleId)).limit(1);
            const members = await dbInst.select().from(circleMembers2).where(eq2(circleMembers2.circleId, input.circleId));
            const author = await getUserById(ctx.user.id);
            for (const m of members) {
              if (m.userId === ctx.user.id) continue;
              await sendNotification(m.userId, "circle_match", "\u5708\u5185\u65B0\u7403\u5C40", `${author?.name || "\u6709\u4EBA"} \u5728\u5708\u5B50\u300C${circle?.name || ""}\u300D\u53D1\u8D77\u4E86\u7403\u5C40\u300C${input.title}\u300D`, newMatch?.id ?? void 0);
            }
          }
        } catch (e) {
          console.warn("circle match notify failed", e);
        }
      }
      return { success: true, matchId: newMatch?.id ?? 0 };
    }),
    join: protectedProcedure.input(z2.object({ matchId: z2.number(), message: z2.string().optional() })).mutation(async ({ ctx, input }) => {
      const match = await getTennisMatchById(input.matchId);
      if (!match) throw new TRPCError3({ code: "NOT_FOUND" });
      const safeMatch = { ...match, circleOnly: match.circleOnly ?? false, feeRequired: match.feeRequired ?? false };
      if (match.status !== "open") throw new TRPCError3({ code: "BAD_REQUEST", message: "\u8BE5\u7EA6\u7403\u5DF2\u4E0D\u53EF\u62A5\u540D" });
      if (match.authorId === ctx.user.id) throw new TRPCError3({ code: "BAD_REQUEST", message: "\u4E0D\u80FD\u62A5\u540D\u81EA\u5DF1\u53D1\u5E03\u7684\u7EA6\u7403" });
      if ((/* @__PURE__ */ new Date(`${match.matchDate}T${match.startTime}:00+08:00`)).getTime() <= Date.now()) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u8BE5\u7403\u5C40\u5DF2\u5F00\u59CB\uFF0C\u65E0\u6CD5\u62A5\u540D" });
      }
      const joiningUser = await getUserById(ctx.user.id);
      if (joiningUser && joiningUser.creditScore <= 0) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "CREDIT_ZERO" });
      }
      const existing = await getMatchParticipant(input.matchId, ctx.user.id);
      if (existing && existing.status === "confirmed") throw new TRPCError3({ code: "BAD_REQUEST", message: "\u5DF2\u7ECF\u62A5\u540D" });
      if (match.currentParticipants >= match.maxParticipants) throw new TRPCError3({ code: "BAD_REQUEST", message: "\u4EBA\u6570\u5DF2\u6EE1" });
      const needsPayment = !!(match.feeRequired && match.feePerPerson && Number(match.feePerPerson) > 0);
      if (needsPayment) {
        const dbInst = await getDb();
        if (dbInst) {
          const { matchParticipants: mp } = await Promise.resolve().then(() => (init_schema(), schema_exports));
          const { eq: eq2, and: and2 } = await import("drizzle-orm");
          if (existing) {
            await dbInst.update(mp).set({ status: "pending", paymentStatus: "pending" }).where(and2(eq2(mp.matchId, input.matchId), eq2(mp.userId, ctx.user.id)));
          } else {
            await dbInst.insert(mp).values({ matchId: input.matchId, userId: ctx.user.id, message: input.message, status: "pending", paymentStatus: "pending" });
          }
        }
        return { success: true, needsPayment: true };
      }
      if (existing) {
        const dbInst = await getDb();
        if (dbInst) {
          const { matchParticipants: mp } = await Promise.resolve().then(() => (init_schema(), schema_exports));
          const { eq: eq2, and: and2 } = await import("drizzle-orm");
          await dbInst.update(mp).set({ status: "confirmed", paymentStatus: "not_required" }).where(and2(eq2(mp.matchId, input.matchId), eq2(mp.userId, ctx.user.id)));
        }
      } else {
        await joinTennisMatch(input.matchId, ctx.user.id, input.message, "not_required");
      }
      await updateTennisMatchParticipantCount(input.matchId, 1);
      if (match.currentParticipants + 1 >= match.maxParticipants) {
        await updateTennisMatchStatus(input.matchId, "full");
      }
      const joiner = await getUserById(ctx.user.id);
      await sendNotification(match.authorId, "system", "\u65B0\u7684\u62A5\u540D", `${joiner?.name ?? "\u6709\u4EBA"}\u62A5\u540D\u4E86\u60A8\u7684\u7EA6\u7403\u300C${match.title}\u300D\u3002`, void 0);
      try {
        const author = await getUserById(match.authorId);
        if (author?.wechatOpenid) {
          await wxNotifyMatchJoin({
            openid: author.wechatOpenid,
            matchTitle: match.title,
            joinerName: joiner?.name ?? "\u5C0F\u4F19\u4F34"
          });
        }
      } catch (_e) {
      }
      try {
        const { matchMessages: _mm } = await Promise.resolve().then(() => (init_schema(), schema_exports));
        const _dbInst = await getDb();
        if (_dbInst) {
          await _dbInst.insert(_mm).values({
            matchId: input.matchId,
            userId: ctx.user.id,
            content: `${joiner?.name ?? "\u5C0F\u4F19\u4F34"} \u52A0\u5165\u4E86\u7403\u5C40 \u{1F3BE}`,
            msgType: "system"
          });
        }
      } catch (_e) {
      }
      return { success: true };
    }),
    leave: protectedProcedure.input(z2.object({ matchId: z2.number() })).mutation(async ({ ctx, input }) => {
      const match = await getTennisMatchById(input.matchId);
      if (!match) throw new TRPCError3({ code: "NOT_FOUND" });
      const safeMatch = { ...match, circleOnly: match.circleOnly ?? false, feeRequired: match.feeRequired ?? false };
      const participant = await getMatchParticipant(input.matchId, ctx.user.id);
      if (!participant || participant.status !== "confirmed" && participant.status !== "pending") throw new TRPCError3({ code: "BAD_REQUEST", message: "\u60A8\u5C1A\u672A\u62A5\u540D\u6B64\u7EA6\u7403" });
      if (participant.status === "pending") {
        await leaveTennisMatch(input.matchId, ctx.user.id);
        return { success: true, penalized: false, refunded: false, refundMessage: "" };
      }
      const matchDateTime = /* @__PURE__ */ new Date(`${match.matchDate}T${match.startTime}:00+08:00`);
      const now = /* @__PURE__ */ new Date();
      const diffMs = matchDateTime.getTime() - now.getTime();
      const diffHours = diffMs / (1e3 * 60 * 60);
      const isPastDeadline = diffHours < 2 && diffHours > -24;
      const refundRatio = diffHours >= 2 ? 1 : diffHours >= 1 ? 0.5 : 0;
      const organizerRatio = 1 - refundRatio;
      let refunded = false;
      let refundMessage = "";
      if (participant.paymentStatus === "paid" || participant.paymentStatus === "pending") {
        try {
          const dbInst = await getDb();
          if (dbInst) {
            const { matchOrders: matchOrders2, matchParticipants: mp } = await Promise.resolve().then(() => (init_schema(), schema_exports));
            const { eq: eq2, and: and2, inArray: inArray2 } = await import("drizzle-orm");
            let resolvedOrderId = participant.orderId;
            if (!resolvedOrderId) {
              const fallback = await dbInst.select().from(matchOrders2).where(and2(
                eq2(matchOrders2.matchId, input.matchId),
                eq2(matchOrders2.userId, ctx.user.id),
                inArray2(matchOrders2.status, ["paid", "pending"])
              )).limit(1);
              if (fallback.length > 0) resolvedOrderId = fallback[0].orderId;
            }
            const [order] = resolvedOrderId ? await dbInst.select().from(matchOrders2).where(eq2(matchOrders2.orderId, resolvedOrderId)).limit(1) : [];
            if (order && order.status === "pending") {
              const { queryOrder: queryOrder2 } = await Promise.resolve().then(() => (init_wxpay(), wxpay_exports));
              const wxOrder = await queryOrder2(resolvedOrderId);
              if (wxOrder?.trade_state === "SUCCESS") {
                order.status = "paid";
              } else {
                console.log(`[leave] \u8BA2\u5355\u672A\u5B9E\u9645\u652F\u4ED8\uFF0C\u8DF3\u8FC7\u5904\u7406: orderId=${resolvedOrderId} wxState=${wxOrder?.trade_state}`);
                order.status = "refunded";
              }
            }
            if (order && order.status === "paid") {
              const totalFen = Math.round(Number(order.amount) * 100);
              if (refundRatio > 0) {
                const refundFen = Math.floor(totalFen * refundRatio);
                const refundAmount = (refundFen / 100).toFixed(2);
                const refundId = `RF${resolvedOrderId}`;
                await refundOrder({
                  orderId: resolvedOrderId,
                  refundId,
                  totalFen,
                  refundFen,
                  reason: `\u7528\u6237\u53D6\u6D88\u62A5\u540D-${match.title} ${match.matchDate} ${match.startTime}`.slice(0, 80)
                });
                await dbInst.update(matchOrders2).set({ status: "refunded", refundId, refundReason: "\u7528\u6237\u53D6\u6D88\u62A5\u540D", refundedAt: /* @__PURE__ */ new Date() }).where(eq2(matchOrders2.orderId, resolvedOrderId));
                await dbInst.update(mp).set({ paymentStatus: "refunded" }).where(and2(eq2(mp.matchId, input.matchId), eq2(mp.userId, ctx.user.id)));
                refunded = true;
                if (refundRatio === 1) {
                  refundMessage = `\xA5${order.amount} \u9000\u6B3E\u5DF2\u53D1\u8D77\uFF0C\u9884\u8BA11-3\u4E2A\u5DE5\u4F5C\u65E5\u5230\u8D26`;
                } else {
                  refundMessage = `\u5F00\u7403\u524D1-2\u5C0F\u65F6\u53D6\u6D88\uFF0C\u9000\u8FD8 50%\uFF08\xA5${refundAmount}\uFF09\uFF0C\u5269\u4F59 50% \u7531\u5E73\u53F0\u6258\u7BA1\uFF0C\u7403\u5C40\u7ED3\u675F\u540E\u7ED3\u7B97\u7ED9\u7EC4\u7EC7\u8005`;
                }
                console.log(`[leave] \u9000\u6B3E\u6210\u529F userId=${ctx.user.id} orderId=${resolvedOrderId} refundFen=${refundFen} refundRatio=${refundRatio}`);
              } else {
                await dbInst.update(mp).set({ paymentStatus: "refunded", status: "cancelled" }).where(and2(eq2(mp.matchId, input.matchId), eq2(mp.userId, ctx.user.id)));
                refundMessage = "\u5F00\u7403\u524D1\u5C0F\u65F6\u5185\u53D6\u6D88\uFF0C\u573A\u5730\u8D39\u4E0D\u4E88\u9000\u8FD8\uFF0C\u7403\u5C40\u7ED3\u675F\u540E\u5C06\u7ED3\u7B97\u7ED9\u7EC4\u7EC7\u8005";
              }
            } else if (!order) {
              console.warn(`[leave] \u672A\u627E\u5230\u8BA2\u5355 userId=${ctx.user.id} matchId=${input.matchId}`);
              refundMessage = "\u672A\u627E\u5230\u652F\u4ED8\u8BA2\u5355\uFF0C\u8BF7\u8054\u7CFB\u5BA2\u670D\u5904\u7406";
            } else {
              console.warn(`[leave] \u8BA2\u5355\u72B6\u6001\u4E0D\u652F\u6301\u5904\u7406: orderId=${resolvedOrderId} status=${order.status}`);
            }
          }
        } catch (e) {
          console.error("[leave] \u9000\u6B3E/\u7ED3\u7B97\u5931\u8D25:", e?.message || e);
          refundMessage = "\u9000\u6B3E\u5904\u7406\u4E2D\uFF0C\u5982\u6709\u95EE\u9898\u8BF7\u8054\u7CFB\u5BA2\u670D";
        }
      }
      await leaveTennisMatch(input.matchId, ctx.user.id);
      await updateTennisMatchParticipantCount(input.matchId, -1);
      const wasFull = match.status === "full";
      if (wasFull) await updateTennisMatchStatus(input.matchId, "open");
      let promoted = false;
      try {
        promoted = await tryPromoteFromWaitlist(input.matchId, match.title);
      } catch (e) {
        console.warn("[leave] waitlist promote failed:", e?.message || e);
      }
      const shouldPenalize = isPastDeadline && wasFull && !promoted;
      if (shouldPenalize) {
        await addCreditLog(
          ctx.user.id,
          -10,
          `\u8D85\u65F6\u53D6\u6D88\u62A5\u540D\u300C${match.title}\u300D\uFF08\u5F00\u7403\u524D\u4E0D\u52302\u5C0F\u65F6\uFF09`,
          input.matchId
        );
        const dbInst2 = await getDb();
        if (dbInst2) {
          const { users: usersTable } = await Promise.resolve().then(() => (init_schema(), schema_exports));
          const { eq: eq2 } = await import("drizzle-orm");
          await dbInst2.update(usersTable).set({ consecutiveAttendCount: 0 }).where(eq2(usersTable.id, ctx.user.id));
        }
        try {
          const { matchMessages: _mm2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
          const _dbInst2 = await getDb();
          const leaver = await getUserById(ctx.user.id);
          if (_dbInst2) {
            await _dbInst2.insert(_mm2).values({
              matchId: input.matchId,
              userId: ctx.user.id,
              content: `${leaver?.name ?? "\u6709\u4EBA"} \u9000\u51FA\u4E86\u7403\u5C40`,
              msgType: "system"
            });
          }
        } catch (_e2) {
        }
        return { success: true, penalized: true, deducted: 10, refunded, refundMessage };
      }
      try {
        const { matchMessages: _mm3 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
        const _dbInst3 = await getDb();
        const leaver2 = await getUserById(ctx.user.id);
        if (_dbInst3) {
          await _dbInst3.insert(_mm3).values({
            matchId: input.matchId,
            userId: ctx.user.id,
            content: `${leaver2?.name ?? "\u6709\u4EBA"} \u9000\u51FA\u4E86\u7403\u5C40`,
            msgType: "system"
          });
        }
      } catch (_e3) {
      }
      return { success: true, penalized: false, deducted: 0, refunded, refundMessage, promoted };
    }),
    // ─── 候补名单：加入候补（球局已满时） ──────────────────────────────────────
    joinWaitlist: protectedProcedure.input(z2.object({ matchId: z2.number(), message: z2.string().optional() })).mutation(async ({ ctx, input }) => {
      const match = await getTennisMatchById(input.matchId);
      if (!match) throw new TRPCError3({ code: "NOT_FOUND" });
      if (match.authorId === ctx.user.id) throw new TRPCError3({ code: "BAD_REQUEST", message: "\u4E0D\u80FD\u5019\u8865\u81EA\u5DF1\u53D1\u5E03\u7684\u7403\u5C40" });
      if (match.status === "cancelled" || match.status === "completed") {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u8BE5\u7403\u5C40\u5DF2\u7ED3\u675F\uFF0C\u65E0\u6CD5\u5019\u8865" });
      }
      if ((/* @__PURE__ */ new Date(`${match.matchDate}T${match.startTime}:00+08:00`)).getTime() <= Date.now()) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u8BE5\u7403\u5C40\u5DF2\u5F00\u59CB\uFF0C\u65E0\u6CD5\u52A0\u5165\u5019\u8865" });
      }
      const joiningUser = await getUserById(ctx.user.id);
      if (joiningUser && joiningUser.creditScore <= 0) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "CREDIT_ZERO" });
      }
      if (match.currentParticipants < match.maxParticipants && match.status === "open") {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u7403\u5C40\u8FD8\u6709\u7A7A\u4F4D\uFF0C\u8BF7\u76F4\u63A5\u62A5\u540D" });
      }
      const existing = await getMatchParticipant(input.matchId, ctx.user.id);
      if (existing && existing.status === "confirmed") throw new TRPCError3({ code: "BAD_REQUEST", message: "\u60A8\u5DF2\u62A5\u540D\u8BE5\u7403\u5C40" });
      if (existing && existing.status === "waitlist") throw new TRPCError3({ code: "BAD_REQUEST", message: "\u60A8\u5DF2\u5728\u5019\u8865\u540D\u5355\u4E2D" });
      const dbInst = await getDb();
      if (!dbInst) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { matchParticipants: mp } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2 } = await import("drizzle-orm");
      if (existing) {
        await dbInst.update(mp).set({ status: "waitlist", paymentStatus: "not_required", message: input.message, createdAt: /* @__PURE__ */ new Date() }).where(and2(eq2(mp.matchId, input.matchId), eq2(mp.userId, ctx.user.id)));
      } else {
        await dbInst.insert(mp).values({ matchId: input.matchId, userId: ctx.user.id, status: "waitlist", paymentStatus: "not_required", message: input.message });
      }
      const waiters = await dbInst.select().from(mp).where(and2(eq2(mp.matchId, input.matchId), eq2(mp.status, "waitlist"))).orderBy(mp.createdAt);
      const position = waiters.findIndex((w) => w.userId === ctx.user.id) + 1;
      const waiter = await getUserById(ctx.user.id);
      await sendNotification(
        match.authorId,
        "system",
        "\u65B0\u7684\u5019\u8865",
        `${waiter?.name ?? "\u6709\u4EBA"} \u52A0\u5165\u4E86\u60A8\u7403\u5C40\u300C${match.title}\u300D\u7684\u5019\u8865\u540D\u5355\uFF0C\u5982\u6709\u4EBA\u9000\u51FA\u5C06\u81EA\u52A8\u8865\u4F4D\u3002`,
        input.matchId
      );
      return { success: true, position };
    }),
    // 退出候补名单
    leaveWaitlist: protectedProcedure.input(z2.object({ matchId: z2.number() })).mutation(async ({ ctx, input }) => {
      const dbInst = await getDb();
      if (!dbInst) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { matchParticipants: mp } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2 } = await import("drizzle-orm");
      const p = await getMatchParticipant(input.matchId, ctx.user.id);
      if (!p || p.status !== "waitlist") throw new TRPCError3({ code: "BAD_REQUEST", message: "\u60A8\u4E0D\u5728\u5019\u8865\u540D\u5355\u4E2D" });
      await dbInst.update(mp).set({ status: "cancelled" }).where(and2(eq2(mp.matchId, input.matchId), eq2(mp.userId, ctx.user.id)));
      return { success: true };
    }),
    // ─── 发起人同意候补者加入：名额+1、重算人均退差价、免费局转正/收费局置待支付 ───
    approveWaitlist: protectedProcedure.input(z2.object({ matchId: z2.number(), userId: z2.number() })).mutation(async ({ ctx, input }) => {
      const match = await getTennisMatchById(input.matchId);
      if (!match) throw new TRPCError3({ code: "NOT_FOUND", message: "\u7403\u5C40\u4E0D\u5B58\u5728" });
      if (match.authorId !== ctx.user.id) throw new TRPCError3({ code: "FORBIDDEN", message: "\u53EA\u6709\u53D1\u8D77\u4EBA\u53EF\u540C\u610F\u5019\u8865\u52A0\u5165" });
      if (match.status === "cancelled") throw new TRPCError3({ code: "BAD_REQUEST", message: "\u7403\u5C40\u5DF2\u53D6\u6D88" });
      if (match.status === "completed") throw new TRPCError3({ code: "BAD_REQUEST", message: "\u7403\u5C40\u5DF2\u7ED3\u675F\uFF0C\u65E0\u6CD5\u8C03\u6574" });
      try {
        const dbChk = await getDb();
        if (dbChk) {
          const { matchSettlements: matchSettlements2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
          const { eq: eq3 } = await import("drizzle-orm");
          const [st] = await dbChk.select().from(matchSettlements2).where(eq3(matchSettlements2.matchId, input.matchId)).limit(1);
          if (st && (st.status === "confirming" || st.status === "settled")) {
            throw new TRPCError3({ code: "BAD_REQUEST", message: "\u7403\u5C40\u5DF2\u786E\u8BA4\u5B8C\u6210\u6216\u5DF2\u7ED3\u7B97\uFF0C\u65E0\u6CD5\u518D\u52A0\u4EBA" });
          }
        }
      } catch (e) {
        if (e instanceof TRPCError3) throw e;
      }
      const dbInst = await getDb();
      if (!dbInst) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { tennisMatches: tennisMatches2, matchOrders: matchOrders2, matchParticipants: mp, matchMessages: mm } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2 } = await import("drizzle-orm");
      const target = await getMatchParticipant(input.matchId, input.userId);
      if (!target || target.status !== "waitlist") {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u8BE5\u7528\u6237\u4E0D\u5728\u5019\u8865\u540D\u5355\u4E2D" });
      }
      const targetUser = await getUserById(input.userId);
      const isFeeMatch = !!(match.feeRequired && match.feePerPerson && Number(match.feePerPerson) > 0);
      const oldMax = match.maxParticipants;
      const newMax = oldMax + 1;
      let newFeePerPerson = null;
      let refundedCount = 0;
      if (!isFeeMatch) {
        await dbInst.update(tennisMatches2).set({ maxParticipants: newMax }).where(eq2(tennisMatches2.id, input.matchId));
      } else {
        const totalFee = match.courtTotalFee && Number(match.courtTotalFee) > 0 ? Number(match.courtTotalFee) : Math.round(Number(match.feePerPerson) * oldMax * 100) / 100;
        const newFeeFen = Math.ceil(totalFee * 100 / newMax);
        newFeePerPerson = Math.round(newFeeFen) / 100;
        await dbInst.update(tennisMatches2).set({ maxParticipants: newMax, feePerPerson: String(newFeePerPerson.toFixed(2)) }).where(eq2(tennisMatches2.id, input.matchId));
        const paidParticipants = await dbInst.select().from(mp).where(and2(eq2(mp.matchId, input.matchId), eq2(mp.paymentStatus, "paid")));
        for (const p of paidParticipants) {
          try {
            let orderId = p.orderId;
            if (!orderId) {
              const [fb] = await dbInst.select().from(matchOrders2).where(and2(eq2(matchOrders2.matchId, input.matchId), eq2(matchOrders2.userId, p.userId), eq2(matchOrders2.status, "paid"))).limit(1);
              if (fb) orderId = fb.orderId;
            }
            if (!orderId) continue;
            const [order] = await dbInst.select().from(matchOrders2).where(eq2(matchOrders2.orderId, orderId)).limit(1);
            if (!order || order.status !== "paid") continue;
            const paidFen = Math.round(Number(order.amount) * 100);
            const userDiffFen = paidFen - newFeeFen;
            if (userDiffFen <= 0) continue;
            const refundId = `RFADD${orderId}${Date.now().toString().slice(-6)}`.slice(0, 60);
            await refundOrder({ orderId, refundId, totalFen: paidFen, refundFen: userDiffFen, reason: `\u540C\u610F\u5019\u8865\u52A0\u4EBA\u9000\u5DEE\u4EF7-${match.title}`.slice(0, 80) });
            await dbInst.update(matchOrders2).set({ amount: String(newFeePerPerson.toFixed(2)), refundId, refundReason: "\u540C\u610F\u5019\u8865\u9000\u5DEE\u4EF7", refundedAt: /* @__PURE__ */ new Date() }).where(eq2(matchOrders2.orderId, orderId));
            refundedCount += 1;
            await sendNotification(
              p.userId,
              "system",
              "\u4EBA\u6570\u589E\u52A0\xB7\u5DF2\u9000\u5DEE\u4EF7",
              `\u7403\u5C40\u300C${match.title}\u300D\u589E\u52A0\u4E86\u4E00\u4F4D\u7403\u53CB\uFF0C\u4EBA\u5747\u964D\u4E3A \xA5${newFeePerPerson.toFixed(2)}\uFF0C\u5DF2\u4E3A\u60A8\u9000\u8FD8\u5DEE\u4EF7 \xA5${(userDiffFen / 100).toFixed(2)}\uFF0C\u9884\u8BA11-3\u4E2A\u5DE5\u4F5C\u65E5\u5230\u8D26\u3002`,
              input.matchId
            );
          } catch (refErr) {
            console.error(`[approveWaitlist] \u9000\u5DEE\u4EF7\u5931\u8D25 userId=${p.userId}: ${refErr?.message || refErr}`);
          }
        }
      }
      if (!isFeeMatch) {
        await dbInst.update(mp).set({ status: "confirmed", paymentStatus: "not_required" }).where(and2(eq2(mp.matchId, input.matchId), eq2(mp.userId, input.userId)));
        await updateTennisMatchParticipantCount(input.matchId, 1);
        const cur = await getTennisMatchById(input.matchId);
        if (cur && cur.currentParticipants + 1 >= cur.maxParticipants) {
          await updateTennisMatchStatus(input.matchId, "full");
        } else {
          await updateTennisMatchStatus(input.matchId, "open");
        }
        await sendNotification(
          input.userId,
          "system",
          "\u5019\u8865\u6210\u529F \u{1F3BE}",
          `\u53D1\u8D77\u4EBA\u5DF2\u540C\u610F\u60A8\u52A0\u5165\u7403\u5C40\u300C${match.title}\u300D\uFF0C\u60A8\u5DF2\u6210\u529F\u62A5\u540D\uFF0C\u8BF7\u51C6\u65F6\u5230\u573A\uFF01`,
          input.matchId
        );
        try {
          const u = await getUserById(input.userId);
          if (u?.wechatOpenid) await wxNotifyMatchJoin({ openid: u.wechatOpenid, matchTitle: match.title, joinerName: "\u5019\u8865\u6210\u529F" }).catch(() => {
          });
        } catch {
        }
        try {
          await dbInst.insert(mm).values({ matchId: input.matchId, userId: input.userId, content: `${targetUser?.name ?? "\u7403\u53CB"} \u7ECF\u53D1\u8D77\u4EBA\u540C\u610F\u4ECE\u5019\u8865\u52A0\u5165\u7403\u5C40 \u{1F3BE}`, msgType: "system" });
        } catch {
        }
      } else {
        await dbInst.update(mp).set({ status: "pending", paymentStatus: "pending" }).where(and2(eq2(mp.matchId, input.matchId), eq2(mp.userId, input.userId)));
        await updateTennisMatchStatus(input.matchId, "open");
        await sendNotification(
          input.userId,
          "system",
          "\u53D1\u8D77\u4EBA\u5DF2\u540C\u610F\u60A8\u52A0\u5165 \u{1F3BE}",
          `\u53D1\u8D77\u4EBA\u5DF2\u540C\u610F\u60A8\u52A0\u5165\u7403\u5C40\u300C${match.title}\u300D\uFF0C\u8BF7\u5C3D\u5FEB\u8FDB\u5165\u7403\u5C40\u652F\u4ED8 \xA5${newFeePerPerson.toFixed(2)} \u5B8C\u6210\u62A5\u540D\uFF08\u652F\u4ED8\u6210\u529F\u540E\u624D\u6B63\u5F0F\u5360\u4F4D\uFF09\u3002`,
          input.matchId
        );
        try {
          const u = await getUserById(input.userId);
          if (u?.wechatOpenid) await wxNotifyMatchJoin({ openid: u.wechatOpenid, matchTitle: match.title, joinerName: "\u540C\u610F\u52A0\u5165\xB7\u5F85\u652F\u4ED8" }).catch(() => {
          });
        } catch {
        }
      }
      if (isFeeMatch && newFeePerPerson != null) {
        try {
          await dbInst.insert(mm).values({
            matchId: input.matchId,
            userId: ctx.user.id,
            content: `\u53D1\u8D77\u4EBA\u540C\u610F\u589E\u52A0\u4E00\u4F4D\u7403\u53CB\uFF0C\u4EBA\u5747\u964D\u4E3A \xA5${newFeePerPerson.toFixed(2)}\uFF0C\u5DF2\u4ED8\u6B3E\u7684\u5C0F\u4F19\u4F34\u5C06\u81EA\u52A8\u6536\u5230\u5DEE\u4EF7\u9000\u6B3E \u{1F3BE}`,
            msgType: "system"
          });
        } catch {
        }
      }
      return { success: true, isFeeMatch, newMaxParticipants: newMax, newFeePerPerson, refunded: refundedCount };
    }),
    // 查询我的候补状态与排位
    myWaitlistPosition: protectedProcedure.input(z2.object({ matchId: z2.number() })).query(async ({ ctx, input }) => {
      const dbInst = await getDb();
      if (!dbInst) return { onWaitlist: false, position: 0, total: 0 };
      const { matchParticipants: mp } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2 } = await import("drizzle-orm");
      const waiters = await dbInst.select().from(mp).where(and2(eq2(mp.matchId, input.matchId), eq2(mp.status, "waitlist"))).orderBy(mp.createdAt);
      const idx = waiters.findIndex((w) => w.userId === ctx.user.id);
      return {
        onWaitlist: idx >= 0,
        position: idx >= 0 ? idx + 1 : 0,
        total: waiters.length
      };
    }),
    // 替代人选：将自己的报名转让给另一个用户（免扣信用分）
    replaceSelf: protectedProcedure.input(z2.object({ matchId: z2.number(), replacerId: z2.number() })).mutation(async ({ ctx, input }) => {
      const match = await getTennisMatchById(input.matchId);
      if (!match) throw new TRPCError3({ code: "NOT_FOUND" });
      const safeMatch = { ...match, circleOnly: match.circleOnly ?? false, feeRequired: match.feeRequired ?? false };
      const participant = await getMatchParticipant(input.matchId, ctx.user.id);
      if (!participant || participant.status !== "confirmed") throw new TRPCError3({ code: "BAD_REQUEST", message: "\u60A8\u5C1A\u672A\u62A5\u540D\u6B64\u7EA6\u7403" });
      const existing = await getMatchParticipant(input.matchId, input.replacerId);
      if (existing && existing.status === "confirmed") throw new TRPCError3({ code: "BAD_REQUEST", message: "\u8BE5\u7528\u6237\u5DF2\u662F\u53C2\u4E0E\u8005" });
      await leaveTennisMatch(input.matchId, ctx.user.id);
      if (existing && existing.status === "cancelled") {
        await joinTennisMatch(input.matchId, input.replacerId);
      } else {
        await joinTennisMatch(input.matchId, input.replacerId);
      }
      return { success: true };
    }),
    // ─── 寻找替代者：生成替代邀请 token ──────────────────────────────────────
    createReplaceInvite: protectedProcedure.input(z2.object({ matchId: z2.number() })).mutation(async ({ ctx, input }) => {
      const match = await getTennisMatchById(input.matchId);
      if (!match) throw new TRPCError3({ code: "NOT_FOUND" });
      const safeMatch = { ...match, circleOnly: match.circleOnly ?? false, feeRequired: match.feeRequired ?? false };
      const isAuthor = match.authorId === ctx.user.id;
      const participant = await getMatchParticipant(input.matchId, ctx.user.id);
      if (!isAuthor && (!participant || participant.status !== "confirmed")) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u60A8\u5C1A\u672A\u62A5\u540D\u6B64\u7EA6\u7403" });
      }
      if (match.status === "completed" || match.status === "cancelled") {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u7403\u5C40\u5DF2\u7ED3\u675F\u6216\u5DF2\u53D6\u6D88\uFF0C\u65E0\u6CD5\u8F6C\u8BA9" });
      }
      const dbInst = await getDb();
      if (!dbInst) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { matchReplaceInvites: matchReplaceInvites2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2 } = await import("drizzle-orm");
      const existingInvites = await dbInst.select().from(matchReplaceInvites2).where(and2(
        eq2(matchReplaceInvites2.matchId, input.matchId),
        eq2(matchReplaceInvites2.fromUserId, ctx.user.id),
        eq2(matchReplaceInvites2.status, "pending")
      ));
      if (existingInvites.length > 0) {
        return { token: existingInvites[0].token, inviteId: existingInvites[0].id };
      }
      const token = nanoid(32);
      const expiresAt = /* @__PURE__ */ new Date(`${match.matchDate}T${match.startTime}:00+08:00`);
      await dbInst.insert(matchReplaceInvites2).values({
        matchId: input.matchId,
        fromUserId: ctx.user.id,
        token,
        expiresAt
      });
      return { token, inviteId: null };
    }),
    // ─── 查询替代邀请信息（供接受页面展示）──────────────────────────────────
    getReplaceInvite: publicProcedure.input(z2.object({ token: z2.string() })).query(async ({ input }) => {
      const dbInst = await getDb();
      if (!dbInst) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { matchReplaceInvites: matchReplaceInvites2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2 } = await import("drizzle-orm");
      const invites = await dbInst.select().from(matchReplaceInvites2).where(eq2(matchReplaceInvites2.token, input.token));
      if (invites.length === 0) throw new TRPCError3({ code: "NOT_FOUND", message: "\u9080\u8BF7\u4E0D\u5B58\u5728" });
      const invite = invites[0];
      if (invite.status === "accepted") {
        return { invite, match: null, fromUser: null, status: "accepted" };
      }
      const now = /* @__PURE__ */ new Date();
      if (invite.status === "expired" || now > invite.expiresAt) {
        if (invite.status === "pending") {
          await dbInst.update(matchReplaceInvites2).set({ status: "expired" }).where(eq2(matchReplaceInvites2.token, input.token));
        }
        return { invite, match: null, fromUser: null, status: "expired" };
      }
      const match = await getTennisMatchById(invite.matchId);
      const fromUser = await getUserById(invite.fromUserId);
      return {
        invite,
        match,
        fromUser: fromUser ? { id: fromUser.id, name: fromUser.name, avatar: fromUser.avatar } : null,
        status: "pending"
      };
    }),
    // ─── 接受替代邀请 ─────────────────────────────────────────────────────────
    acceptReplaceInvite: protectedProcedure.input(z2.object({ token: z2.string() })).mutation(async ({ ctx, input }) => {
      const dbInst = await getDb();
      if (!dbInst) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { matchReplaceInvites: matchReplaceInvites2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2 } = await import("drizzle-orm");
      const invites = await dbInst.select().from(matchReplaceInvites2).where(eq2(matchReplaceInvites2.token, input.token));
      if (invites.length === 0) throw new TRPCError3({ code: "NOT_FOUND", message: "\u9080\u8BF7\u4E0D\u5B58\u5728" });
      const invite = invites[0];
      if (invite.status !== "pending") {
        throw new TRPCError3({ code: "BAD_REQUEST", message: invite.status === "accepted" ? "\u9080\u8BF7\u5DF2\u88AB\u63A5\u53D7" : "\u9080\u8BF7\u5DF2\u8FC7\u671F" });
      }
      const now = /* @__PURE__ */ new Date();
      if (now > invite.expiresAt) {
        await dbInst.update(matchReplaceInvites2).set({ status: "expired" }).where(eq2(matchReplaceInvites2.token, input.token));
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u9080\u8BF7\u5DF2\u8FC7\u671F\uFF08\u7403\u5C40\u5DF2\u5F00\u59CB\uFF09" });
      }
      if (invite.fromUserId === ctx.user.id) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u4E0D\u80FD\u63A5\u53D7\u81EA\u5DF1\u53D1\u51FA\u7684\u9080\u8BF7" });
      }
      const match = await getTennisMatchById(invite.matchId);
      if (!match) throw new TRPCError3({ code: "NOT_FOUND", message: "\u7403\u5C40\u4E0D\u5B58\u5728" });
      if (match.status === "cancelled") throw new TRPCError3({ code: "BAD_REQUEST", message: "\u7403\u5C40\u5DF2\u53D6\u6D88" });
      const acceptorParticipant = await getMatchParticipant(invite.matchId, ctx.user.id);
      if (acceptorParticipant && acceptorParticipant.status === "confirmed") {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u60A8\u5DF2\u662F\u6B64\u7403\u5C40\u7684\u53C2\u4E0E\u8005" });
      }
      const fromParticipant = await getMatchParticipant(invite.matchId, invite.fromUserId);
      if (fromParticipant && fromParticipant.status === "confirmed") {
        if (fromParticipant.paymentStatus === "paid" || fromParticipant.paymentStatus === "pending") {
          try {
            const { matchOrders: matchOrders2, matchParticipants: mp } = await Promise.resolve().then(() => (init_schema(), schema_exports));
            const { and: andOp, inArray: inArray2 } = await import("drizzle-orm");
            let resolvedOrderId = fromParticipant.orderId;
            if (!resolvedOrderId) {
              const fallback = await dbInst.select().from(matchOrders2).where(andOp(eq2(matchOrders2.matchId, invite.matchId), eq2(matchOrders2.userId, invite.fromUserId), inArray2(matchOrders2.status, ["paid", "pending"]))).limit(1);
              if (fallback.length > 0) resolvedOrderId = fallback[0].orderId;
            }
            const [order] = resolvedOrderId ? await dbInst.select().from(matchOrders2).where(eq2(matchOrders2.orderId, resolvedOrderId)).limit(1) : [];
            if (order && (order.status === "paid" || order.status === "pending")) {
              const amountFen = Math.round(Number(order.amount) * 100);
              const refundId = `RFRE${resolvedOrderId}`;
              const { refundOrder: doRefund } = await Promise.resolve().then(() => (init_wxpay(), wxpay_exports));
              await doRefund({
                orderId: resolvedOrderId,
                refundId,
                totalFen: amountFen,
                refundFen: amountFen,
                reason: `\u627E\u5230\u66FF\u4EE3\u8005-\u5168\u989D\u9000\u6B3E-${match.title}`.slice(0, 80)
              });
              await dbInst.update(matchOrders2).set({ status: "refunded", refundId, refundReason: "\u627E\u5230\u66FF\u4EE3\u8005\u5168\u989D\u9000\u6B3E", refundedAt: now }).where(eq2(matchOrders2.orderId, resolvedOrderId));
              await dbInst.update(mp).set({ paymentStatus: "refunded" }).where(andOp(eq2(mp.matchId, invite.matchId), eq2(mp.userId, invite.fromUserId)));
              console.log(`[acceptReplace] \u539F\u53C2\u4E0E\u8005\u9000\u6B3E\u6210\u529F userId=${invite.fromUserId} orderId=${resolvedOrderId}`);
            }
          } catch (refundErr) {
            console.error(`[acceptReplace] \u539F\u53C2\u4E0E\u8005\u9000\u6B3E\u5931\u8D25: ${refundErr?.message}`);
          }
        }
        await leaveTennisMatch(invite.matchId, invite.fromUserId);
        await updateTennisMatchParticipantCount(invite.matchId, -1);
      }
      await joinTennisMatch(invite.matchId, ctx.user.id);
      await updateTennisMatchParticipantCount(invite.matchId, 1);
      await dbInst.update(matchReplaceInvites2).set({
        status: "accepted",
        toUserId: ctx.user.id,
        acceptedAt: now
      }).where(eq2(matchReplaceInvites2.token, input.token));
      const isAuthorTransfer = invite.fromUserId === match.authorId;
      if (isAuthorTransfer) {
        try {
          const { tennisMatches: tm } = await Promise.resolve().then(() => (init_schema(), schema_exports));
          await dbInst.update(tm).set({ authorId: ctx.user.id }).where(eq2(tm.id, invite.matchId));
          const { matchMessages: mmT } = await Promise.resolve().then(() => (init_schema(), schema_exports));
          const newAuthor = await getUserById(ctx.user.id);
          await dbInst.insert(mmT).values({
            matchId: invite.matchId,
            userId: ctx.user.id,
            content: `${newAuthor?.name ?? "\u65B0\u961F\u957F"} \u5DF2\u63A5\u624B\u6210\u4E3A\u672C\u5C40\u53D1\u8D77\u4EBA\uFF08\u961F\u957F\uFF09\u{1F3BE}`,
            msgType: "system"
          });
        } catch (transErr) {
          console.error(`[acceptReplace] \u53D1\u8D77\u4EBA\u8F6C\u8BA9\u5931\u8D25 matchId=${invite.matchId}: ${transErr?.message || transErr}`);
        }
      }
      try {
        const acceptor = await getUserById(ctx.user.id);
        await sendNotification(
          invite.fromUserId,
          "system",
          isAuthorTransfer ? "\u7403\u5C40\u5DF2\u8F6C\u8BA9" : "\u5DF2\u627E\u5230\u66FF\u8865",
          `${acceptor?.name ?? "\u5BF9\u65B9"} \u5DF2${isAuthorTransfer ? "\u63A5\u624B\u60A8\u7684\u7403\u5C40" : "\u9876\u66FF\u60A8\u7684\u4F4D\u7F6E"}\u300C${match.title}\u300D\uFF0C${fromParticipant && (fromParticipant.paymentStatus === "paid" || fromParticipant.paymentStatus === "pending") ? "\u5DF2\u4E3A\u60A8\u53D1\u8D77\u5168\u989D\u9000\u6B3E\uFF0C\u9884\u8BA11-3\u4E2A\u5DE5\u4F5C\u65E5\u5230\u8D26\u3002" : "\u65E0\u9700\u6263\u8D39\u3002"}\u672C\u6B21\u4E0D\u6263\u4FE1\u7528\u5206\u3002`,
          invite.matchId
        );
      } catch (_e) {
      }
      const needsPay = !!(match.feeRequired && Number(match.feePerPerson) > 0);
      return { success: true, matchId: invite.matchId, needsPay, isAuthorTransfer };
    }),
    cancel: protectedProcedure.input(z2.object({ matchId: z2.number() })).mutation(async ({ ctx, input }) => {
      const match = await getTennisMatchById(input.matchId);
      if (!match) throw new TRPCError3({ code: "NOT_FOUND" });
      const safeMatch = { ...match, circleOnly: match.circleOnly ?? false, feeRequired: match.feeRequired ?? false };
      if (match.authorId !== ctx.user.id) throw new TRPCError3({ code: "FORBIDDEN", message: "\u53EA\u6709\u53D1\u5E03\u8005\u53EF\u53D6\u6D88" });
      if (match.status === "cancelled") throw new TRPCError3({ code: "BAD_REQUEST", message: "\u7403\u5C40\u5DF2\u662F\u53D6\u6D88\u72B6\u6001" });
      if (match.status === "completed") throw new TRPCError3({ code: "BAD_REQUEST", message: "\u7403\u5C40\u5DF2\u7ED3\u675F\uFF0C\u65E0\u6CD5\u53D6\u6D88" });
      const matchDateTime = /* @__PURE__ */ new Date(`${match.matchDate}T${match.startTime}:00+08:00`);
      const now = /* @__PURE__ */ new Date();
      const diffHours = (matchDateTime.getTime() - now.getTime()) / (1e3 * 60 * 60);
      const isPastDeadline = diffHours < 2 && diffHours > -24;
      await updateTennisMatchStatus(input.matchId, "cancelled");
      let penalized = false;
      if (isPastDeadline) {
        await addCreditLog(
          ctx.user.id,
          -10,
          `\u8D85\u65F6\u53D6\u6D88\u7403\u5C40\u300C${match.title}\u300D\uFF08\u5F00\u7403\u524D\u4E0D\u52302\u5C0F\u65F6\uFF09`,
          input.matchId
        );
        const dbInst0 = await getDb();
        if (dbInst0) {
          const { users: usersTable } = await Promise.resolve().then(() => (init_schema(), schema_exports));
          const { eq: eq2 } = await import("drizzle-orm");
          await dbInst0.update(usersTable).set({ consecutiveAttendCount: 0 }).where(eq2(usersTable.id, ctx.user.id));
        }
        penalized = true;
      }
      let refundCount = 0;
      let refundFailCount = 0;
      try {
        const dbInst = await getDb();
        if (dbInst) {
          const { matchOrders: matchOrders2, matchParticipants: mp } = await Promise.resolve().then(() => (init_schema(), schema_exports));
          const { eq: eq2, and: and2, inArray: inArray2 } = await import("drizzle-orm");
          const participants = await getMatchParticipants(input.matchId);
          for (const p of participants) {
            if (p.status !== "confirmed") continue;
            if (p.paymentStatus !== "paid" && p.paymentStatus !== "pending") continue;
            let orderId = p.orderId;
            if (!orderId) {
              const fallbackOrders = await dbInst.select().from(matchOrders2).where(and2(
                eq2(matchOrders2.matchId, input.matchId),
                eq2(matchOrders2.userId, p.userId),
                inArray2(matchOrders2.status, ["paid", "pending"])
              )).limit(1);
              if (fallbackOrders.length > 0) orderId = fallbackOrders[0].orderId;
            }
            if (!orderId) {
              console.warn(`[cancel] \u672A\u627E\u5230\u8BA2\u5355 userId=${p.userId} matchId=${input.matchId}`);
              continue;
            }
            try {
              const [order] = await dbInst.select().from(matchOrders2).where(eq2(matchOrders2.orderId, orderId)).limit(1);
              if (order && (order.status === "paid" || order.status === "pending")) {
                const refundId = `RF${orderId}`;
                const amountFen = Math.round(Number(order.amount) * 100);
                await refundOrder({ orderId, refundId, totalFen: amountFen, refundFen: amountFen, reason: `\u7EC4\u7EC7\u8005\u53D6\u6D88\u7403\u5C40-${match.title} ${match.matchDate} ${match.startTime}`.slice(0, 80) });
                await dbInst.update(matchOrders2).set({ status: "refunded", refundId, refundReason: "\u7403\u5C40\u53D6\u6D88", refundedAt: /* @__PURE__ */ new Date() }).where(eq2(matchOrders2.orderId, orderId));
                await dbInst.update(mp).set({ paymentStatus: "refunded" }).where(and2(eq2(mp.matchId, input.matchId), eq2(mp.userId, p.userId)));
                refundCount++;
                console.log(`[cancel] \u9000\u6B3E\u6210\u529F userId=${p.userId} orderId=${orderId} amount=${order.amount} orderStatus=${order.status}`);
              } else {
                console.warn(`[cancel] \u8BA2\u5355\u72B6\u6001\u4E0D\u652F\u6301\u9000\u6B3E: userId=${p.userId} orderId=${orderId} status=${order?.status}`);
              }
            } catch (refundErr) {
              refundFailCount++;
              console.error(`[cancel] \u9000\u6B3E\u5931\u8D25 userId=${p.userId} orderId=${orderId}:`, refundErr.message);
            }
          }
        }
      } catch (refundBatchErr) {
        console.error(`[cancel] \u6279\u91CF\u9000\u6B3E\u5F02\u5E38:`, refundBatchErr.message);
      }
      try {
        const participants = await getMatchParticipants(input.matchId);
        const { sendMatchCancelledToParticipant: sendMatchCancelledToParticipant2 } = await Promise.resolve().then(() => (init_wechat_notify(), wechat_notify_exports));
        for (const p of participants) {
          if (p.userId === ctx.user.id || p.status !== "confirmed") continue;
          await sendNotification(p.userId, "match_cancelled", "\u7403\u5C40\u5DF2\u53D6\u6D88", `\u4F60\u62A5\u540D\u7684\u7403\u5C40\u300C${match.title}\u300D\uFF08${match.matchDate} ${match.startTime}\uFF09\u5DF2\u88AB\u53D1\u8D77\u4EBA\u53D6\u6D88\u3002`, input.matchId);
          const pUser = await getUserById(p.userId);
          if (pUser?.wechatOpenid) {
            await sendMatchCancelledToParticipant2(pUser.wechatOpenid, match.title, match.matchDate, match.startTime).catch(() => {
            });
          }
        }
      } catch (_) {
      }
      return { success: true, penalized, deducted: penalized ? 10 : 0, refundCount, refundFailCount };
    }),
    update: protectedProcedure.input(z2.object({
      matchId: z2.number(),
      title: z2.string().min(2).max(100).optional(),
      matchType: z2.enum(["singles", "doubles", "mixed_doubles", "practice", "group"]).optional(),
      levelRequired: z2.enum(["itf1", "itf2", "itf3", "itf4", "itf5", "itf6", "itf7", "itf8", "itf9", "itf10", "any"]).optional(),
      matchDate: z2.string().optional(),
      startTime: z2.string().optional(),
      endTime: z2.string().optional(),
      venueName: z2.string().min(1).optional(),
      venueAddress: z2.string().optional(),
      courtNo: z2.string().max(50).optional(),
      maxParticipants: z2.number().min(2).max(20).optional(),
      description: z2.string().optional(),
      contactInfo: z2.string().optional(),
      costPerPerson: z2.number().optional(),
      costSplitType: z2.enum(["free", "aa", "host_pays", "custom"]).optional(),
      bringOwnBall: z2.boolean().optional()
    })).mutation(async ({ ctx, input }) => {
      const match = await getTennisMatchById(input.matchId);
      if (!match) throw new TRPCError3({ code: "NOT_FOUND" });
      const safeMatch = { ...match, circleOnly: match.circleOnly ?? false, feeRequired: match.feeRequired ?? false };
      if (match.authorId !== ctx.user.id) throw new TRPCError3({ code: "FORBIDDEN", message: "\u53EA\u6709\u53D1\u5E03\u8005\u53EF\u7F16\u8F91" });
      if (match.status === "cancelled") throw new TRPCError3({ code: "BAD_REQUEST", message: "\u5DF2\u53D6\u6D88\u7684\u7403\u5C40\u65E0\u6CD5\u7F16\u8F91" });
      const { matchId, ...fields } = input;
      const dbInst = await getDb();
      if (!dbInst) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { tennisMatches: tennisMatches2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2 } = await import("drizzle-orm");
      const updateData = {};
      if (fields.title !== void 0) updateData.title = fields.title;
      if (fields.matchType !== void 0) updateData.matchType = fields.matchType;
      if (fields.levelRequired !== void 0) updateData.levelRequired = fields.levelRequired;
      if (fields.matchDate !== void 0) updateData.matchDate = fields.matchDate;
      if (fields.startTime !== void 0) updateData.startTime = fields.startTime;
      if (fields.endTime !== void 0) updateData.endTime = fields.endTime;
      if (fields.venueName !== void 0) updateData.venueName = fields.venueName;
      if (fields.venueAddress !== void 0) updateData.venueAddress = fields.venueAddress;
      if (fields.courtNo !== void 0) updateData.courtNo = fields.courtNo;
      if (fields.maxParticipants !== void 0) {
        if (fields.maxParticipants < match.currentParticipants) {
          throw new TRPCError3({ code: "BAD_REQUEST", message: `\u4EBA\u6570\u4E0A\u9650\u4E0D\u80FD\u4F4E\u4E8E\u5F53\u524D\u4EBA\u6570 (${match.currentParticipants})` });
        }
        updateData.maxParticipants = fields.maxParticipants;
      }
      if (fields.description !== void 0) updateData.description = fields.description;
      if (fields.contactInfo !== void 0) updateData.contactInfo = fields.contactInfo;
      if (fields.costPerPerson !== void 0) updateData.costPerPerson = fields.costPerPerson;
      if (fields.costSplitType !== void 0) updateData.costSplitType = fields.costSplitType;
      if (fields.bringOwnBall !== void 0) updateData.bringOwnBall = fields.bringOwnBall;
      await dbInst.update(tennisMatches2).set(updateData).where(eq2(tennisMatches2.id, matchId));
      return { success: true };
    }),
    // ─── 增加名额：只增不减，重算人均，对已付款者立即退差价 ──────────────────────
    increaseCapacity: protectedProcedure.input(z2.object({ matchId: z2.number(), newMaxParticipants: z2.number().min(2).max(20) })).mutation(async ({ ctx, input }) => {
      const match = await getTennisMatchById(input.matchId);
      if (!match) throw new TRPCError3({ code: "NOT_FOUND" });
      const safeMatch = { ...match, feeRequired: match.feeRequired ?? false };
      if (match.authorId !== ctx.user.id) throw new TRPCError3({ code: "FORBIDDEN", message: "\u53EA\u6709\u53D1\u8D77\u4EBA\u53EF\u8C03\u6574\u4EBA\u6570" });
      if (match.status === "cancelled") throw new TRPCError3({ code: "BAD_REQUEST", message: "\u7403\u5C40\u5DF2\u53D6\u6D88" });
      if (match.status === "completed") throw new TRPCError3({ code: "BAD_REQUEST", message: "\u7403\u5C40\u5DF2\u7ED3\u675F\uFF0C\u65E0\u6CD5\u8C03\u6574\u4EBA\u6570" });
      try {
        const dbChk = await getDb();
        if (dbChk) {
          const { matchSettlements: matchSettlements2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
          const { eq: eq3 } = await import("drizzle-orm");
          const [st] = await dbChk.select().from(matchSettlements2).where(eq3(matchSettlements2.matchId, input.matchId)).limit(1);
          if (st && (st.status === "confirming" || st.status === "settled")) {
            throw new TRPCError3({ code: "BAD_REQUEST", message: "\u7403\u5C40\u5DF2\u786E\u8BA4\u5B8C\u6210\u6216\u5DF2\u7ED3\u7B97\uFF0C\u65E0\u6CD5\u518D\u8C03\u6574\u4EBA\u6570" });
          }
        }
      } catch (e) {
        if (e instanceof TRPCError3) throw e;
      }
      const oldMax = match.maxParticipants;
      if (input.newMaxParticipants <= oldMax) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: `\u4EBA\u6570\u53EA\u80FD\u589E\u52A0\uFF0C\u5F53\u524D\u4E0A\u9650\u4E3A ${oldMax} \u4EBA` });
      }
      const dbInst = await getDb();
      if (!dbInst) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { tennisMatches: tennisMatches2, matchOrders: matchOrders2, matchParticipants: mp } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2 } = await import("drizzle-orm");
      const isFeeMatch = !!(safeMatch.feeRequired && match.feePerPerson && Number(match.feePerPerson) > 0);
      if (!isFeeMatch) {
        await dbInst.update(tennisMatches2).set({ maxParticipants: input.newMaxParticipants }).where(eq2(tennisMatches2.id, input.matchId));
        if (match.status === "full" && match.currentParticipants < input.newMaxParticipants) {
          await updateTennisMatchStatus(input.matchId, "open");
        }
        return { success: true, refunded: 0, newFeePerPerson: null };
      }
      const totalFee = match.courtTotalFee && Number(match.courtTotalFee) > 0 ? Number(match.courtTotalFee) : Math.round(Number(match.feePerPerson) * oldMax * 100) / 100;
      const newFeeFen = Math.ceil(totalFee * 100 / input.newMaxParticipants);
      const newFeePerPerson = Math.round(newFeeFen) / 100;
      const oldFeeFen = Math.round(Number(match.feePerPerson) * 100);
      await dbInst.update(tennisMatches2).set({ maxParticipants: input.newMaxParticipants, feePerPerson: String(newFeePerPerson.toFixed(2)) }).where(eq2(tennisMatches2.id, input.matchId));
      if (match.status === "full" && match.currentParticipants < input.newMaxParticipants) {
        await updateTennisMatchStatus(input.matchId, "open");
      }
      const diffFen = oldFeeFen - newFeeFen;
      let refundedCount = 0;
      if (diffFen > 0) {
        const paidParticipants = await dbInst.select().from(mp).where(and2(eq2(mp.matchId, input.matchId), eq2(mp.paymentStatus, "paid")));
        for (const p of paidParticipants) {
          try {
            let orderId = p.orderId;
            if (!orderId) {
              const [fb] = await dbInst.select().from(matchOrders2).where(and2(eq2(matchOrders2.matchId, input.matchId), eq2(matchOrders2.userId, p.userId), eq2(matchOrders2.status, "paid"))).limit(1);
              if (fb) orderId = fb.orderId;
            }
            if (!orderId) continue;
            const [order] = await dbInst.select().from(matchOrders2).where(eq2(matchOrders2.orderId, orderId)).limit(1);
            if (!order || order.status !== "paid") continue;
            const paidFen = Math.round(Number(order.amount) * 100);
            const userDiffFen = paidFen - newFeeFen;
            if (userDiffFen <= 0) continue;
            const refundId = `RFDIFF${orderId}${Date.now().toString().slice(-6)}`.slice(0, 60);
            await refundOrder({
              orderId,
              refundId,
              totalFen: paidFen,
              refundFen: userDiffFen,
              reason: `\u6269\u5458\u9000\u5DEE\u4EF7-${match.title}`.slice(0, 80)
            });
            await dbInst.update(matchOrders2).set({ amount: String(newFeePerPerson.toFixed(2)), refundId, refundReason: "\u6269\u5458\u9000\u5DEE\u4EF7", refundedAt: /* @__PURE__ */ new Date() }).where(eq2(matchOrders2.orderId, orderId));
            refundedCount += 1;
            await sendNotification(
              p.userId,
              "system",
              "\u4EBA\u6570\u589E\u52A0\xB7\u5DF2\u9000\u5DEE\u4EF7",
              `\u7403\u5C40\u300C${match.title}\u300D\u4EBA\u6570\u589E\u52A0\uFF0C\u4EBA\u5747\u964D\u4E3A \xA5${newFeePerPerson.toFixed(2)}\uFF0C\u5DF2\u4E3A\u60A8\u9000\u8FD8\u5DEE\u4EF7 \xA5${(userDiffFen / 100).toFixed(2)}\uFF0C\u9884\u8BA11-3\u4E2A\u5DE5\u4F5C\u65E5\u5230\u8D26\u3002`,
              input.matchId
            );
          } catch (refErr) {
            console.error(`[increaseCapacity] \u9000\u5DEE\u4EF7\u5931\u8D25 userId=${p.userId} matchId=${input.matchId}: ${refErr?.message || refErr}`);
          }
        }
        try {
          const { matchMessages: matchMessages2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
          await dbInst.insert(matchMessages2).values({
            matchId: input.matchId,
            userId: ctx.user.id,
            content: `\u53D1\u8D77\u4EBA\u5C06\u4EBA\u6570\u589E\u52A0\u5230 ${input.newMaxParticipants} \u4EBA\uFF0C\u4EBA\u5747\u964D\u4E3A \xA5${newFeePerPerson.toFixed(2)}\uFF0C\u5DF2\u4ED8\u6B3E\u7684\u5C0F\u4F19\u4F34\u5C06\u81EA\u52A8\u6536\u5230\u5DEE\u4EF7\u9000\u6B3E \u{1F3BE}`,
            msgType: "system"
          });
        } catch (_e) {
        }
      }
      try {
        await tryPromoteFromWaitlist(input.matchId, match.title);
      } catch (e) {
        console.warn("[increaseCapacity] waitlist promote failed:", e?.message || e);
      }
      return { success: true, refunded: refundedCount, newFeePerPerson };
    }),
    myMatches: protectedProcedure.query(async ({ ctx }) => {
      return getUserTennisMatches(ctx.user.id);
    }),
    review: protectedProcedure.input(z2.object({
      matchId: z2.number(),
      revieweeId: z2.number(),
      punctualityScore: z2.number().min(1).max(5),
      friendlinessScore: z2.number().min(1).max(5),
      levelMatchScore: z2.number().min(1).max(5),
      comment: z2.string().max(300).optional()
    })).mutation(async ({ ctx, input }) => {
      const match = await getTennisMatchById(input.matchId);
      if (!match) throw new TRPCError3({ code: "NOT_FOUND" });
      const safeMatch = { ...match, circleOnly: match.circleOnly ?? false, feeRequired: match.feeRequired ?? false };
      const participants = await getMatchParticipants(input.matchId);
      const isParticipant = participants.some((p) => p.userId === ctx.user.id && p.status === "confirmed") || match.authorId === ctx.user.id;
      if (!isParticipant) throw new TRPCError3({ code: "FORBIDDEN", message: "\u53EA\u6709\u53C2\u4E0E\u8005\u53EF\u4EE5\u8BC4\u4EF7" });
      const alreadyReviewed = await hasUserReviewed(input.matchId, ctx.user.id, input.revieweeId);
      if (alreadyReviewed) throw new TRPCError3({ code: "BAD_REQUEST", message: "\u5DF2\u7ECF\u8BC4\u4EF7\u8FC7\u8BE5\u7528\u6237" });
      await createMatchReview({ ...input, reviewerId: ctx.user.id });
      return { success: true };
    }),
    getReviews: publicProcedure.input(z2.object({ matchId: z2.number() })).query(async ({ input }) => {
      return getMatchReviews(input.matchId);
    }),
    getUserReviews: publicProcedure.input(z2.object({ userId: z2.number() })).query(async ({ input }) => {
      return getUserReviews(input.userId);
    }),
    // ─── 支付：创建预付订单 ──────────────────────────────────────────────────
    createPayOrder: protectedProcedure.input(z2.object({
      matchId: z2.number()
      // openid 由后端从 ctx.user.wechatOpenid 获取，不再依赖前端传入（安全）
    })).mutation(async ({ ctx, input }) => {
      const match = await getTennisMatchById(input.matchId);
      if (!match) throw new TRPCError3({ code: "NOT_FOUND" });
      const safeMatch = { ...match, circleOnly: match.circleOnly ?? false, feeRequired: match.feeRequired ?? false };
      if (!match.feeRequired || !match.feePerPerson) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u8BE5\u7403\u5C40\u65E0\u9700\u9884\u4ED8\u8D39\u7528" });
      }
      if (match.authorId === ctx.user.id) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u4E0D\u80FD\u62A5\u540D\u81EA\u5DF1\u53D1\u5E03\u7684\u7403\u5C40" });
      }
      if ((/* @__PURE__ */ new Date(`${match.matchDate}T${match.startTime}:00+08:00`)).getTime() <= Date.now()) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u8BE5\u7403\u5C40\u5DF2\u5F00\u59CB\uFF0C\u65E0\u6CD5\u652F\u4ED8" });
      }
      const participant = await getMatchParticipant(input.matchId, ctx.user.id);
      if (!participant || participant.status !== "pending" && participant.status !== "confirmed") {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u8BF7\u5148\u62A5\u540D\u518D\u652F\u4ED8" });
      }
      if (participant.paymentStatus === "paid") {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u5DF2\u652F\u4ED8\uFF0C\u8BF7\u52FF\u91CD\u590D\u652F\u4ED8" });
      }
      const userRecord = await getUserById(ctx.user.id);
      const openid = userRecord?.wechatOpenid;
      if (!openid && isWxpayConfigured()) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u672A\u7ED1\u5B9A\u5FAE\u4FE1\u8D26\u53F7\uFF0C\u65E0\u6CD5\u53D1\u8D77\u652F\u4ED8" });
      }
      const orderId = generateOrderId();
      const amountFen = Math.round(Number(match.feePerPerson) * 100);
      const dbInst = await getDb();
      if (!dbInst) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { matchOrders: matchOrders2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      await dbInst.insert(matchOrders2).values({
        orderId,
        matchId: input.matchId,
        userId: ctx.user.id,
        amount: String(match.feePerPerson),
        status: "pending"
      });
      const { matchParticipants: mp } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2 } = await import("drizzle-orm");
      await dbInst.update(mp).set({ orderId, paymentStatus: "pending" }).where(and2(eq2(mp.matchId, input.matchId), eq2(mp.userId, ctx.user.id)));
      let prepay;
      try {
        prepay = await createPrepay({
          orderId,
          description: `\u7403\u5C40\u573A\u5730\u8D39-${match.title}`,
          amountFen,
          openid: openid || "mock_openid"
          // Mock 模式下 openid 不重要
        });
      } catch (prepayErr) {
        console.error(`[createPayOrder] createPrepay \u5931\u8D25 orderId=${orderId}:`, prepayErr.message);
        throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: `\u5FAE\u4FE1\u652F\u4ED8\u9884\u4E0B\u5355\u5931\u8D25: ${prepayErr.message}` });
      }
      if (prepay.prepayId) {
        await dbInst.update(matchOrders2).set({ wxPrepayId: prepay.prepayId }).where(eq2(matchOrders2.orderId, orderId));
      }
      console.log(`[createPayOrder] \u9884\u4E0B\u5355\u6210\u529F orderId=${orderId} prepayId=${prepay.prepayId} userId=${ctx.user.id} matchId=${input.matchId}`);
      return { orderId, ...prepay, isMockMode: !isWxpayConfigured() };
    }),
    // ─── 支付：支付成功回调（微信服务器主动通知）─────────────────────────────
    // 注意：此接口由微信服务器调用，需在 index.ts 中注册为 POST /api/wxpay/notify
    // 这里提供一个内部处理函数，由 index.ts 路由调用
    confirmPayment: protectedProcedure.input(z2.object({ orderId: z2.string(), matchId: z2.number() })).mutation(async ({ ctx, input }) => {
      if (isWxpayConfigured()) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "\u751F\u4EA7\u73AF\u5883\u652F\u4ED8\u7531\u5FAE\u4FE1\u56DE\u8C03\u5904\u7406" });
      }
      const dbInst = await getDb();
      if (!dbInst) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { matchOrders: matchOrders2, matchParticipants: mp, tennisMatches: tm } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2, sql: sql2 } = await import("drizzle-orm");
      await dbInst.update(matchOrders2).set({ status: "paid", paidAt: /* @__PURE__ */ new Date() }).where(eq2(matchOrders2.orderId, input.orderId));
      const partRows = await dbInst.select().from(mp).where(and2(eq2(mp.matchId, input.matchId), eq2(mp.userId, ctx.user.id)));
      const wasPending = partRows.length > 0 && partRows[0].status === "pending";
      await dbInst.update(mp).set({ status: "confirmed", paymentStatus: "paid", orderId: input.orderId }).where(and2(eq2(mp.matchId, input.matchId), eq2(mp.userId, ctx.user.id)));
      if (wasPending) {
        await dbInst.update(tm).set({ currentParticipants: sql2`${tm.currentParticipants} + 1` }).where(eq2(tm.id, input.matchId));
        const matchRows = await dbInst.select().from(tm).where(eq2(tm.id, input.matchId));
        if (matchRows.length > 0) {
          const m = matchRows[0];
          if ((m.currentParticipants ?? 0) >= (m.maxParticipants ?? 0) && m.status === "open") {
            await dbInst.update(tm).set({ status: "full" }).where(eq2(tm.id, input.matchId));
          }
          const joiner = await getUserById(ctx.user.id);
          await sendNotification(m.authorId, "system", "\u65B0\u7684\u62A5\u540D", `${joiner?.name ?? "\u6709\u4EBA"}\u5DF2\u4ED8\u8D39\u62A5\u540D\u60A8\u7684\u7EA6\u7403\u300C${m.title}\u300D\u3002`, void 0);
        }
      }
      return { success: true };
    }),
    // ─── 支付：发起者确认球局完成，触发结算流程 ──────────────────────────────
    confirmMatchComplete: protectedProcedure.input(z2.object({ matchId: z2.number() })).mutation(async ({ ctx, input }) => {
      const match = await getTennisMatchById(input.matchId);
      if (!match) throw new TRPCError3({ code: "NOT_FOUND" });
      const safeMatch = { ...match, circleOnly: match.circleOnly ?? false, feeRequired: match.feeRequired ?? false };
      if (match.authorId !== ctx.user.id) throw new TRPCError3({ code: "FORBIDDEN", message: "\u53EA\u6709\u53D1\u5E03\u8005\u53EF\u786E\u8BA4" });
      if (match.status === "completed") throw new TRPCError3({ code: "BAD_REQUEST", message: "\u5DF2\u786E\u8BA4\u5B8C\u6210" });
      const dbInst = await getDb();
      if (!dbInst) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { matchOrders: matchOrders2, matchSettlements: matchSettlements2, tennisMatches: tennisMatches2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2, inArray: inArray2 } = await import("drizzle-orm");
      await dbInst.update(tennisMatches2).set({ status: "completed" }).where(eq2(tennisMatches2.id, input.matchId));
      const paidOrders = await dbInst.select().from(matchOrders2).where(and2(eq2(matchOrders2.matchId, input.matchId), inArray2(matchOrders2.status, ["paid"])));
      const totalAmount = paidOrders.reduce((sum, o) => sum + Number(o.amount), 0);
      if (totalAmount <= 0) return { success: true, totalAmount: 0, message: "\u65E0\u9700\u7ED3\u7B97" };
      const existing = await dbInst.select().from(matchSettlements2).where(eq2(matchSettlements2.matchId, input.matchId));
      let settlementRow = existing[0];
      if (!settlementRow) {
        await dbInst.insert(matchSettlements2).values({
          matchId: input.matchId,
          organizerId: ctx.user.id,
          totalAmount: String(totalAmount),
          platformFee: "0.00",
          netAmount: String(totalAmount),
          status: "confirming",
          confirmedAt: /* @__PURE__ */ new Date()
        });
        const reread = await dbInst.select().from(matchSettlements2).where(eq2(matchSettlements2.matchId, input.matchId));
        settlementRow = reread[0];
      }
      if (settlementRow && settlementRow.status === "settled") {
        return { success: true, totalAmount, settled: true, message: "\u8BE5\u7403\u5C40\u5DF2\u7ED3\u7B97" };
      }
      let settled = false;
      let settleMessage = `\u5171 ${totalAmount} \u5143\u5C06\u7ED3\u7B97\u7ED9\u60A8`;
      try {
        const organizer = await getUserById(ctx.user.id);
        const payeeOpenid = organizer?.wechatOpenid;
        if (!payeeOpenid) {
          settleMessage = "\u7ED3\u7B97\u5F85\u5904\u7406\uFF1A\u672A\u83B7\u53D6\u5230\u60A8\u7684\u5FAE\u4FE1\u6536\u6B3E\u4FE1\u606F\uFF0C\u8BF7\u8054\u7CFB\u5E73\u53F0";
          await notifyOwner({
            title: "\u7ED3\u7B97\u6253\u6B3E\u7F3A\u5C11 openid",
            content: `\u7403\u5C40 ${input.matchId} \u786E\u8BA4\u5B8C\u6210\uFF0C\u4F46\u53D1\u8D77\u4EBA(\u7528\u6237 ${ctx.user.id})\u7F3A\u5C11 wechatOpenid\uFF0C\u65E0\u6CD5\u81EA\u52A8\u6253\u6B3E\uFF0C\u8BF7\u4EBA\u5DE5\u5904\u7406\u3002`
          });
        } else {
          const amountFen = Math.round(totalAmount * 100);
          const batchId = generateOrderId();
          const transfer = await transferToUser({
            batchId,
            openid: payeeOpenid,
            amountFen,
            remark: `\u7403\u5C40\u300C${safeMatch.title}\u300D\u573A\u5730\u8D39\u7ED3\u7B97`
          });
          await dbInst.update(matchSettlements2).set({
            status: "settled",
            settledAt: /* @__PURE__ */ new Date(),
            wxBatchId: transfer.batchId
          }).where(eq2(matchSettlements2.matchId, input.matchId));
          await dbInst.update(matchOrders2).set({ status: "settled", settledAt: /* @__PURE__ */ new Date() }).where(and2(eq2(matchOrders2.matchId, input.matchId), eq2(matchOrders2.status, "paid")));
          settled = true;
          settleMessage = `\u5171 ${totalAmount} \u5143\u5DF2\u7ED3\u7B97\u5230\u60A8\u7684\u5FAE\u4FE1\u96F6\u94B1`;
        }
      } catch (e) {
        console.error("transferToUser failed:", e?.message || e);
        settleMessage = `\u7403\u5C40\u5DF2\u786E\u8BA4\u5B8C\u6210\uFF0C\u7ED3\u7B97\u6B63\u5728\u5904\u7406\u4E2D\uFF08${totalAmount} \u5143\uFF09`;
        await notifyOwner({
          title: "\u7ED3\u7B97\u6253\u6B3E\u5931\u8D25\uFF0C\u5F85\u91CD\u8BD5",
          content: `\u7403\u5C40 ${input.matchId} \u81EA\u52A8\u6253\u6B3E\u5931\u8D25\uFF1A${e?.message || e}\u3002\u5DF2\u4FDD\u7559\u5F85\u7ED3\u7B97\u72B6\u6001\uFF0C\u7B49\u5F85\u91CD\u8BD5\u6216\u4EBA\u5DE5\u5904\u7406\u3002`
        });
      }
      const participants = await getMatchParticipants(input.matchId);
      for (const p of participants) {
        if (p.paymentStatus === "paid") {
          await sendNotification(
            p.userId,
            "system",
            "\u7403\u5C40\u5DF2\u5B8C\u6210",
            `\u300C${safeMatch.title}\u300D\u5DF2\u7531\u53D1\u8D77\u4EBA\u786E\u8BA4\u5B8C\u6210\uFF0C\u573A\u5730\u8D39\u5DF2\u5168\u989D\u7ED3\u7B97\u7ED9\u53D1\u8D77\u4EBA\u3002\u5982\u5BF9\u8D39\u7528\u6709\u5F02\u8BAE\uFF0C\u8BF7\u5728\u7403\u5C40\u7FA4\u5185\u4E0E\u53D1\u8D77\u4EBA\u79C1\u4E0B\u534F\u5546\uFF0C\u5E73\u53F0\u4E0D\u4ECB\u5165\u8D44\u91D1\u7EA0\u7EB7\u3002`,
            input.matchId
          );
        }
      }
      return { success: true, totalAmount, settled, message: settleMessage };
    }),
    // ─── 支付：参与者申请异议（球局未举行等情况）────────────────────────────
    disputeSettlement: protectedProcedure.input(z2.object({ matchId: z2.number(), reason: z2.string().min(5, "\u8BF7\u63CF\u8FF0\u5F02\u8BAE\u539F\u56E0\uFF08\u81F3\u5C115\u5B57\uFF09") })).mutation(async ({ ctx, input }) => {
      const dbInst = await getDb();
      if (!dbInst) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { matchSettlements: matchSettlements2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2 } = await import("drizzle-orm");
      const settlements = await dbInst.select().from(matchSettlements2).where(eq2(matchSettlements2.matchId, input.matchId));
      if (settlements.length === 0) throw new TRPCError3({ code: "NOT_FOUND", message: "\u672A\u627E\u5230\u7ED3\u7B97\u8BB0\u5F55" });
      const settlement = settlements[0];
      if (settlement.status !== "confirming") throw new TRPCError3({ code: "BAD_REQUEST", message: "\u8BE5\u7ED3\u7B97\u5DF2\u5904\u7406\uFF0C\u65E0\u6CD5\u7533\u8BF7\u5F02\u8BAE" });
      const confirmedAt = settlement.confirmedAt ? new Date(settlement.confirmedAt) : /* @__PURE__ */ new Date();
      const diffHours = (Date.now() - confirmedAt.getTime()) / (1e3 * 60 * 60);
      if (diffHours > 24) throw new TRPCError3({ code: "BAD_REQUEST", message: "\u5F02\u8BAE\u7533\u8BF7\u5DF2\u8D85\u8FC724\u5C0F\u65F6\u622A\u6B62\u65F6\u95F4" });
      await dbInst.update(matchSettlements2).set({
        status: "disputed",
        disputeReason: input.reason,
        disputeUserId: ctx.user.id
      }).where(eq2(matchSettlements2.matchId, input.matchId));
      await notifyOwner({
        title: "\u7ED3\u7B97\u5F02\u8BAE\u7533\u8BF7",
        content: `\u7528\u6237 ${ctx.user.id} \u5BF9\u7403\u5C40 ${input.matchId} \u7684\u7ED3\u7B97\u63D0\u51FA\u5F02\u8BAE\uFF1A${input.reason}\uFF0C\u8BF7\u4ECB\u5165\u5904\u7406\u3002`
      });
      return { success: true };
    }),
    // ─── 支付：查询我的钱包（待结算、已结算、退款记录）────────────────────
    myWallet: protectedProcedure.query(async ({ ctx }) => {
      const dbInst = await getDb();
      if (!dbInst) return { pendingOrders: [], settledOrders: [], refundedOrders: [], pendingSettlements: [] };
      const { matchOrders: matchOrders2, matchSettlements: matchSettlements2, tennisMatches: tennisMatches2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2, inArray: inArray2 } = await import("drizzle-orm");
      const myOrders = await dbInst.select({
        orderId: matchOrders2.orderId,
        matchId: matchOrders2.matchId,
        amount: matchOrders2.amount,
        status: matchOrders2.status,
        paidAt: matchOrders2.paidAt,
        refundedAt: matchOrders2.refundedAt,
        matchTitle: tennisMatches2.title,
        matchDate: tennisMatches2.matchDate
      }).from(matchOrders2).leftJoin(tennisMatches2, eq2(matchOrders2.matchId, tennisMatches2.id)).where(eq2(matchOrders2.userId, ctx.user.id));
      const mySettlements = await dbInst.select({
        matchId: matchSettlements2.matchId,
        totalAmount: matchSettlements2.totalAmount,
        netAmount: matchSettlements2.netAmount,
        status: matchSettlements2.status,
        confirmedAt: matchSettlements2.confirmedAt,
        settledAt: matchSettlements2.settledAt,
        matchTitle: tennisMatches2.title,
        matchDate: tennisMatches2.matchDate
      }).from(matchSettlements2).leftJoin(tennisMatches2, eq2(matchSettlements2.matchId, tennisMatches2.id)).where(eq2(matchSettlements2.organizerId, ctx.user.id));
      return {
        pendingOrders: myOrders.filter((o) => o.status === "pending"),
        paidOrders: myOrders.filter((o) => o.status === "paid" || o.status === "settled"),
        refundedOrders: myOrders.filter((o) => o.status === "refunded"),
        pendingSettlements: mySettlements.filter((s) => s.status === "confirming"),
        settledSettlements: mySettlements.filter((s) => s.status === "settled"),
        disputedSettlements: mySettlements.filter((s) => s.status === "disputed")
      };
    }),
    // ─── 球局群聊 ──────────────────────────────────────────────────────────────
    // 获取群聊消息列表（分页 + 轮询增量）
    getMessages: protectedProcedure.input(z2.object({
      matchId: z2.number(),
      afterId: z2.number().optional(),
      // 轮询时传上次最后一条消息的 id
      limit: z2.number().min(1).max(100).default(50)
    })).query(async ({ ctx, input }) => {
      const { matchMessages: matchMessages2, matchParticipants: matchParticipants2, users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2, gt, desc: desc2, asc: asc2 } = await import("drizzle-orm");
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const match = await getTennisMatchById(input.matchId);
      if (!match) throw new TRPCError3({ code: "NOT_FOUND", message: "\u7403\u5C40\u4E0D\u5B58\u5728" });
      const participantRows = await dbInstance.select().from(matchParticipants2).where(and2(
        eq2(matchParticipants2.matchId, input.matchId),
        eq2(matchParticipants2.userId, ctx.user.id),
        eq2(matchParticipants2.status, "confirmed")
      ));
      const isParticipant = match.authorId === ctx.user.id || participantRows.length > 0;
      if (!isParticipant) throw new TRPCError3({ code: "FORBIDDEN", message: "\u4EC5\u7403\u5C40\u6210\u5458\u53EF\u67E5\u770B\u7FA4\u804A" });
      const conditions = [eq2(matchMessages2.matchId, input.matchId)];
      if (input.afterId) conditions.push(gt(matchMessages2.id, input.afterId));
      const msgs = await dbInstance.select({
        id: matchMessages2.id,
        content: matchMessages2.content,
        msgType: matchMessages2.msgType,
        createdAt: matchMessages2.createdAt,
        userId: matchMessages2.userId,
        userName: users2.name,
        userAvatar: users2.avatar
      }).from(matchMessages2).leftJoin(users2, eq2(matchMessages2.userId, users2.id)).where(and2(...conditions)).orderBy(input.afterId ? asc2(matchMessages2.id) : desc2(matchMessages2.id)).limit(input.limit);
      return { messages: input.afterId ? msgs : msgs.reverse() };
    }),
    // 发送群聊消息
    sendMessage: protectedProcedure.input(z2.object({
      matchId: z2.number(),
      content: z2.string().min(1).max(2e3),
      msgType: z2.enum(["text", "image"]).optional()
    })).mutation(async ({ ctx, input }) => {
      const { matchMessages: matchMessages2, matchParticipants: matchParticipants2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2 } = await import("drizzle-orm");
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const match = await getTennisMatchById(input.matchId);
      if (!match) throw new TRPCError3({ code: "NOT_FOUND", message: "\u7403\u5C40\u4E0D\u5B58\u5728" });
      if (match.status === "cancelled") throw new TRPCError3({ code: "BAD_REQUEST", message: "\u7403\u5C40\u5DF2\u53D6\u6D88\uFF0C\u65E0\u6CD5\u53D1\u9001\u6D88\u606F" });
      const participantRows = await dbInstance.select().from(matchParticipants2).where(and2(
        eq2(matchParticipants2.matchId, input.matchId),
        eq2(matchParticipants2.userId, ctx.user.id),
        eq2(matchParticipants2.status, "confirmed")
      ));
      const isParticipant = match.authorId === ctx.user.id || participantRows.length > 0;
      if (!isParticipant) throw new TRPCError3({ code: "FORBIDDEN", message: "\u4EC5\u7403\u5C40\u6210\u5458\u53EF\u53D1\u9001\u6D88\u606F" });
      const msgType = input.msgType ?? "text";
      const [result] = await dbInstance.insert(matchMessages2).values({
        matchId: input.matchId,
        userId: ctx.user.id,
        content: input.content.trim(),
        msgType
      });
      const newId = result?.insertId ?? 0;
      return { success: true, messageId: Number(newId) };
    }),
    // 获取未读消息数
    getUnreadCount: protectedProcedure.input(z2.object({
      matchId: z2.number(),
      lastReadId: z2.number().default(0)
      // 上次读到的最后一条消息 id
    })).query(async ({ ctx, input }) => {
      const { matchMessages: matchMessages2, matchParticipants: matchParticipants2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2, gt } = await import("drizzle-orm");
      const dbInstance = await getDb();
      if (!dbInstance) return { count: 0 };
      const match = await getTennisMatchById(input.matchId);
      if (!match) return { count: 0 };
      const participantRows = await dbInstance.select().from(matchParticipants2).where(and2(
        eq2(matchParticipants2.matchId, input.matchId),
        eq2(matchParticipants2.userId, ctx.user.id),
        eq2(matchParticipants2.status, "confirmed")
      ));
      const isParticipant = match.authorId === ctx.user.id || participantRows.length > 0;
      if (!isParticipant) return { count: 0 };
      const rows = await dbInstance.select({ id: matchMessages2.id }).from(matchMessages2).where(and2(
        eq2(matchMessages2.matchId, input.matchId),
        gt(matchMessages2.id, input.lastReadId)
      ));
      return { count: rows.length };
    })
  }),
  // ─── Lesson Packages (Student side) ───────────────────────────────────────────────────────
  package: router({
    listByCoach: publicProcedure.input(z2.object({ coachId: z2.number() })).query(async ({ input }) => {
      return getLessonPackagesByCoach(input.coachId);
    }),
    buy: protectedProcedure.input(z2.object({ packageId: z2.number() })).mutation(async ({ ctx, input }) => {
      const pkg = await getLessonPackageById(input.packageId);
      if (!pkg || !pkg.isActive) throw new TRPCError3({ code: "NOT_FOUND", message: "\u8BFE\u65F6\u5305\u4E0D\u5B58\u5728" });
      await createStudentPackage({
        packageId: pkg.id,
        studentId: ctx.user.id,
        coachId: pkg.coachId,
        totalLessons: pkg.totalLessons,
        remainingLessons: pkg.totalLessons,
        pricePaid: pkg.price
      });
      const student = await getUserById(ctx.user.id);
      const coach = await getCoachProfileById(pkg.coachId);
      if (coach) {
        await sendNotification(
          coach.userId,
          "system",
          "\u5B66\u5458\u8D2D\u4E70\u4E86\u8BFE\u65F6\u5305",
          `${student?.name ?? "\u5B66\u5458"}\u8D2D\u4E70\u4E86\u60A8\u7684\u300C${pkg.name}\u300D\uFF08${pkg.totalLessons}\u8282\u8BFE\uFF09\uFF0C\u8BF7\u786E\u8BA4\u6536\u6B3E\u5E76\u5B89\u6392\u8BFE\u7A0B\u3002`,
          void 0
        );
      }
      return { success: true, message: "\u8BFE\u65F6\u5305\u8D2D\u4E70\u6210\u529F\uFF0C\u8BF7\u5B8C\u6210\u652F\u4ED8\u540E\u8054\u7CFB\u6559\u7EC3\u6FC0\u6D3B" };
    }),
    myPackages: protectedProcedure.query(async ({ ctx }) => {
      const pkgs = await getStudentPackages(ctx.user.id);
      return Promise.all(pkgs.map(async (p) => {
        const pkg = await getLessonPackageById(p.packageId);
        const coach = await getCoachProfileById(p.coachId);
        const deductions = await getPackageDeductions(p.id);
        return { ...p, packageName: pkg?.name, coachName: coach?.displayName, coachAvatar: coach?.avatar, deductions };
      }));
    }),
    requestRefund: protectedProcedure.input(z2.object({ studentPackageId: z2.number(), note: z2.string().optional() })).mutation(async ({ ctx, input }) => {
      const pkg = await getStudentPackageById(input.studentPackageId);
      if (!pkg) throw new TRPCError3({ code: "NOT_FOUND" });
      if (pkg.studentId !== ctx.user.id) throw new TRPCError3({ code: "FORBIDDEN" });
      if (!["active", "pending_payment"].includes(pkg.status)) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u8BE5\u8BFE\u65F6\u5305\u72B6\u6001\u4E0D\u652F\u6301\u9000\u6B3E" });
      }
      await requestStudentPackageRefund(input.studentPackageId, ctx.user.id, input.note);
      const coach = await getCoachProfileById(pkg.coachId);
      if (coach) {
        await sendNotification(
          coach.userId,
          "system",
          "\u5B66\u5458\u7533\u8BF7\u9000\u6B3E",
          `\u5B66\u5458\u7533\u8BF7\u5BF9\u8BFE\u65F6\u5305\u8FDB\u884C\u9000\u6B3E\uFF0C\u8BF7\u53CA\u65F6\u5904\u7406\u3002\u5907\u6CE8\uFF1A${input.note ?? "\u65E0"}`,
          void 0
        );
      }
      return { success: true };
    })
  }),
  // ─── User (PKU Alumni) ─────────────────────────────────────────────────────────────────────
  user: router({
    myStats: protectedProcedure.query(async ({ ctx }) => {
      const dbInstance = await getDb();
      if (!dbInstance) return { matchCount: 0, bookingCount: 0, coachLessons: 0 };
      const { matchParticipants: matchParticipants2, bookings: bookings2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, count: count2 } = await import("drizzle-orm");
      const [matchCountResult] = await dbInstance.select({ count: count2() }).from(matchParticipants2).where(eq2(matchParticipants2.userId, ctx.user.id));
      const [bookingCountResult] = await dbInstance.select({ count: count2() }).from(bookings2).where(eq2(bookings2.studentId, ctx.user.id));
      return {
        matchCount: Number(matchCountResult?.count ?? 0),
        bookingCount: Number(bookingCountResult?.count ?? 0),
        coachLessons: Number(bookingCountResult?.count ?? 0)
        // 暂时对齐 bookingCount
      };
    }),
    applyPkuAlumni: protectedProcedure.input(z2.object({
      year: z2.string().optional(),
      school: z2.string().optional(),
      studentId: z2.string().optional(),
      note: z2.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const dbInst = await getDb();
      if (!dbInst) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { users: usersTable } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2 } = await import("drizzle-orm");
      await dbInst.update(usersTable).set({
        pkuAlumni: true,
        pkuInfo: { year: input.year, school: input.school, studentId: input.studentId, note: input.note }
      }).where(eq2(usersTable.id, ctx.user.id));
      return { success: true };
    }),
    revokePkuAlumni: protectedProcedure.mutation(async ({ ctx }) => {
      const dbInst = await getDb();
      if (!dbInst) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { users: usersTable } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2 } = await import("drizzle-orm");
      await dbInst.update(usersTable).set({ pkuAlumni: false, pkuInfo: null }).where(eq2(usersTable.id, ctx.user.id));
      return { success: true };
    }),
    // 更新 NTRP 水平
    updateNtrpLevel: protectedProcedure.input(z2.object({
      ntrpLevel: z2.number().min(1).max(6)
    })).mutation(async ({ ctx, input }) => {
      const dbInst = await getDb();
      if (!dbInst) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { users: usersTable } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2 } = await import("drizzle-orm");
      await dbInst.update(usersTable).set({ ntrpLevel: String(input.ntrpLevel) }).where(eq2(usersTable.id, ctx.user.id));
      return { success: true };
    }),
    // 更新联系方式（手机号 + 微信号）
    updateContact: protectedProcedure.input(z2.object({
      phone: z2.string().regex(/^1[3-9]\d{9}$/, "\u8BF7\u8F93\u5165\u6B63\u786E\u7684\u624B\u673A\u53F7").optional(),
      wechatId: z2.string().min(1).max(100).optional()
    }).refine((data) => !!(data.phone || data.wechatId), {
      message: "\u624B\u673A\u53F7\u548C\u5FAE\u4FE1\u53F7\u81F3\u5C11\u586B\u5199\u4E00\u9879",
      path: ["phone"]
    })).mutation(async ({ ctx, input }) => {
      const dbInst = await getDb();
      if (!dbInst) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { users: usersTable } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2 } = await import("drizzle-orm");
      const updates = {};
      if (input.phone !== void 0) updates.phone = input.phone;
      if (input.wechatId !== void 0) updates.wechatId = input.wechatId;
      await dbInst.update(usersTable).set(updates).where(eq2(usersTable.id, ctx.user.id));
      return { success: true };
    }),
    // 更新个人资料（昵称、头像、性别、城市、网球水平）
    updateProfile: protectedProcedure.input(z2.object({
      name: z2.string().min(1).max(50).optional(),
      avatar: z2.string().optional(),
      gender: z2.enum(["male", "female"]).nullable().optional(),
      city: z2.string().max(50).nullable().optional(),
      tennisLevel: z2.number().int().min(1).max(5).nullable().optional()
    })).mutation(async ({ ctx, input }) => {
      const dbInst = await getDb();
      if (!dbInst) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { users: usersTable } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2 } = await import("drizzle-orm");
      const updates = {};
      if (input.name !== void 0) updates.name = input.name;
      if (input.avatar !== void 0) updates.avatar = input.avatar;
      if (input.gender !== void 0) updates.gender = input.gender;
      if (input.city !== void 0) updates.city = input.city;
      if (input.tennisLevel !== void 0) updates.tennisLevel = input.tennisLevel;
      await dbInst.update(usersTable).set(updates).where(eq2(usersTable.id, ctx.user.id));
      return { success: true };
    }),
    // 获取用户公开主页（NTRP、信用分、评价历史）
    getPublicProfile: publicProcedure.input(z2.object({ userId: z2.number() })).query(async ({ input }) => {
      const user = await getUserById(input.userId);
      if (!user) throw new TRPCError3({ code: "NOT_FOUND" });
      const reviews2 = await getUserReviews(input.userId);
      return {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        ntrpLevel: user.ntrpLevel,
        creditScore: user.creditScore,
        createdAt: user.createdAt,
        reviews: reviews2
      };
    }),
    // ─── 小程序码生成 ──────────────────────────────────────────────────────────────────────────────
    // 生成小程序码（球局分享 / 教练分享页用）
    getWxacode: publicProcedure.input(z2.object({
      scene: z2.string().max(32, "scene \u6700\u591A 32 \u4E2A\u5B57\u7B26"),
      // 如 "matchId=123" 或 "coachId=5"
      page: z2.string().optional(),
      // 小程序页面路径
      width: z2.number().min(280).max(1280).optional()
    })).query(async ({ input }) => {
      const { getWxacode: getWxacode2 } = await Promise.resolve().then(() => (init_wechat(), wechat_exports));
      try {
        const buf = await getWxacode2({
          scene: input.scene,
          page: input.page,
          width: input.width ?? 430
        });
        return { base64: `data:image/png;base64,${buf.toString("base64")}` };
      } catch (err) {
        throw new TRPCError3({
          code: "INTERNAL_SERVER_ERROR",
          message: "\u5C0F\u7A0B\u5E8F\u7801\u751F\u6210\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5"
        });
      }
    }),
    // 查询当前用户的信用分变动记录
    getCreditLogs: protectedProcedure.input(z2.object({ limit: z2.number().optional() }).optional()).query(async ({ ctx, input }) => {
      const logs = await getCreditLogs(ctx.user.id, input?.limit ?? 30);
      const userInfo = await getUserById(ctx.user.id);
      return {
        creditScore: userInfo?.creditScore ?? ctx.user.creditScore,
        consecutiveAttendCount: userInfo?.consecutiveAttendCount ?? 0,
        creditRestoreApplied: userInfo?.creditRestoreApplied ?? false,
        logs
      };
    }),
    // 申请信用分恢复（信用分为0时可用）
    applyCreditRestore: protectedProcedure.mutation(async ({ ctx }) => {
      const userInfo = await getUserById(ctx.user.id);
      if (!userInfo) throw new TRPCError3({ code: "NOT_FOUND" });
      if (userInfo.creditScore > 0) throw new TRPCError3({ code: "BAD_REQUEST", message: "\u4FE1\u7528\u5206\u5927\u4E8E0\uFF0C\u65E0\u9700\u7533\u8BF7" });
      if (userInfo.creditRestoreApplied) throw new TRPCError3({ code: "BAD_REQUEST", message: "\u5DF2\u63D0\u4EA4\u7533\u8BF7\uFF0C\u8BF7\u7B49\u5F85\u5BA1\u6838" });
      await applyCreditRestore(ctx.user.id);
      const { notifyOwner: notifyOwner2 } = await Promise.resolve().then(() => (init_notification(), notification_exports));
      await notifyOwner2({ title: "\u4FE1\u7528\u5206\u6062\u590D\u7533\u8BF7", content: `\u7528\u6237 ${userInfo.name ?? userInfo.phone ?? userInfo.id} \u63D0\u4EA4\u4E86\u4FE1\u7528\u5206\u6062\u590D\u7533\u8BF7\uFF0C\u8BF7\u524D\u5F80\u7BA1\u7406\u540E\u53F0\u5BA1\u6838\u3002` });
      return { success: true };
    })
  }),
  // ─── Venues ────────────────────────────────────────────────────────────────
  venue: router({
    list: publicProcedure.input(z2.object({ area: z2.string().optional(), search: z2.string().optional(), limit: z2.number().optional() }).optional()).query(async ({ input }) => {
      return getVenues({ area: input?.area, search: input?.search, limit: input?.limit });
    }),
    getById: publicProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      const venue = await getVenueById(input.id);
      if (!venue) throw new TRPCError3({ code: "NOT_FOUND" });
      return venue;
    }),
    create: adminProcedure2.input(z2.object({
      name: z2.string(),
      area: z2.enum(["\u5927\u5B66\u57CE", "\u5357\u5C71", "\u798F\u7530", "\u5176\u4ED6"]),
      address: z2.string(),
      description: z2.string().optional(),
      courtCount: z2.number().optional(),
      pricePerHour: z2.string().optional(),
      openTime: z2.string().optional(),
      closeTime: z2.string().optional(),
      phone: z2.string().optional()
    })).mutation(async ({ input }) => {
      await createVenue(input);
      return { success: true };
    })
  }),
  // ─── Bookings ──────────────────────────────────────────────────────────────
  booking: router({
    myBookings: protectedProcedure.query(async ({ ctx }) => {
      const bookingList = await getBookingsByStudent(ctx.user.id);
      const enriched = await Promise.all(bookingList.map(async (b) => {
        const coach = await getCoachProfileById(b.coachId);
        const venue = b.venueId ? await getVenueById(b.venueId) : null;
        const existingReview = await getReviewByBookingId(b.id);
        return { ...b, coach, venue, hasReviewed: !!existingReview };
      }));
      return enriched;
    }),
    getById: protectedProcedure.input(z2.object({ id: z2.number() })).query(async ({ ctx, input }) => {
      const booking = await getBookingById(input.id);
      if (!booking) throw new TRPCError3({ code: "NOT_FOUND" });
      if (booking.studentId !== ctx.user.id && ctx.user.role !== "coach" && ctx.user.role !== "admin") {
        throw new TRPCError3({ code: "FORBIDDEN" });
      }
      const coach = await getCoachProfileById(booking.coachId);
      const venue = booking.venueId ? await getVenueById(booking.venueId) : null;
      const payment = await getPaymentByBookingId(booking.id);
      return { ...booking, coach, venue, payment };
    }),
    create: protectedProcedure.input(z2.object({
      coachId: z2.number(),
      venueId: z2.number().optional(),
      // null/undefined for custom venue
      customVenueName: z2.string().optional(),
      // student-supplied venue name
      customVenueAddress: z2.string().optional(),
      // student-supplied address
      lessonDate: z2.string(),
      startTime: z2.string(),
      endTime: z2.string(),
      durationHours: z2.string().optional(),
      couponCode: z2.string().optional(),
      studentNote: z2.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const coach = await getCoachProfileById(input.coachId);
      if (!coach) throw new TRPCError3({ code: "NOT_FOUND", message: "\u6559\u7EC3\u4E0D\u5B58\u5728" });
      const duration = parseFloat(input.durationHours ?? "1");
      const pricePerHour = parseFloat(coach.pricePerHour ?? "600");
      const totalAmount = (pricePerHour * duration).toFixed(2);
      let discountAmount = "0.00";
      let couponId;
      if (input.couponCode) {
        const coupon = await getCouponByCode(input.couponCode);
        if (coupon && /* @__PURE__ */ new Date() <= new Date(coupon.validUntil)) {
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
      await createBooking({
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
        status: "confirmed"
      });
      const allBookings = await getBookingsByStudent(ctx.user.id);
      const newBooking = allBookings[0];
      await createPayment({
        bookingId: newBooking.id,
        studentId: ctx.user.id,
        coachId: input.coachId,
        amount: finalAmount
      });
      await updatePaymentStatus(newBooking.id, "paid");
      let venueInfo = "";
      if (input.venueId) {
        const venue = await getVenueById(input.venueId);
        if (venue) {
          venueInfo = `
\u{1F4CD} \u4E0A\u8BFE\u5730\u70B9\uFF1A${venue.name}
\u{1F3E0} \u5730\u5740\uFF1A${venue.address}${venue.mapUrl ? `
\u{1F5FA}\uFE0F \u5BFC\u822A\uFF1A${venue.mapUrl}` : ""}${venue.bookingNote ? `
\u{1F4DD} \u9884\u7EA6\u8BF4\u660E\uFF1A${venue.bookingNote}` : ""}`;
        }
      } else if (input.customVenueName) {
        venueInfo = `
\u{1F4CD} \u4E0A\u8BFE\u5730\u70B9\uFF1A${input.customVenueName}${input.customVenueAddress ? `
\u{1F3E0} \u5730\u5740\uFF1A${input.customVenueAddress}` : ""}`;
      }
      const coachUser = await getUserById(coach.userId);
      if (coachUser) {
        await sendNotification(
          coachUser.id,
          "booking_created",
          "\u65B0\u9884\u7EA6\u5DF2\u786E\u8BA4 \u{1F3BE}",
          `${ctx.user.name ?? "\u5B66\u5458"} \u5DF2\u9884\u7EA6\u60A8\u7684\u8BFE\u7A0B\uFF1A${input.lessonDate} ${input.startTime}-${input.endTime}\uFF0C\u8BF7\u51C6\u65F6\u5230\u573A\u3002${venueInfo}`,
          newBooking.id
        );
      }
      await sendNotification(
        ctx.user.id,
        "payment_success",
        "\u9884\u7EA6\u5DF2\u786E\u8BA4 \u{1F3BE}",
        `\u8BFE\u7A0B\u9884\u7EA6\u5DF2\u786E\u8BA4\uFF01\u4E0A\u8BFE\u65F6\u95F4\uFF1A${input.lessonDate} ${input.startTime}-${input.endTime}\uFF0C\u91D1\u989D\uFF1A\xA5${finalAmount}\u3002${venueInfo}`,
        newBooking.id
      );
      const venueNotifyName = input.customVenueName ?? (input.venueId ? (await getVenueById(input.venueId))?.name ?? "\u5F85\u786E\u8BA4" : "\u5F85\u786E\u8BA4");
      if (ctx.user.wechatOpenid) {
        wxNotifyBookingToStudent({
          openid: ctx.user.wechatOpenid,
          coachName: coach.displayName,
          lessonDate: input.lessonDate,
          startTime: input.startTime,
          venueName: venueNotifyName
        }).catch(console.error);
      }
      if (coachUser?.wechatOpenid) {
        wxNotifyBookingToCoach({
          openid: coachUser.wechatOpenid,
          studentName: ctx.user.name ?? "\u5B66\u5458",
          lessonDate: input.lessonDate,
          startTime: input.startTime,
          venueName: venueNotifyName
        }).catch(console.error);
      }
      const coachPhone = coach.phone;
      const studentPhone = ctx.user.phone;
      if (ctx.user.wechatOpenid && coachPhone) {
        wxNotifyCoachContactToStudent({
          openid: ctx.user.wechatOpenid,
          coachName: coach.displayName,
          coachPhone
        }).catch(console.error);
      }
      if (coachUser?.wechatOpenid && studentPhone) {
        wxNotifyStudentContactToCoach({
          openid: coachUser.wechatOpenid,
          studentName: ctx.user.name ?? "\u5B66\u5458",
          studentPhone
        }).catch(console.error);
      }
      return { success: true, bookingId: newBooking.id, bookingNo, finalAmount };
    }),
    cancel: protectedProcedure.input(z2.object({ bookingId: z2.number(), reason: z2.string().optional() })).mutation(async ({ ctx, input }) => {
      const booking = await getBookingById(input.bookingId);
      if (!booking) throw new TRPCError3({ code: "NOT_FOUND" });
      if (booking.studentId !== ctx.user.id) throw new TRPCError3({ code: "FORBIDDEN" });
      if (!["pending", "confirmed"].includes(booking.status)) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u5F53\u524D\u72B6\u6001\u65E0\u6CD5\u53D6\u6D88" });
      }
      await updateBookingStatus(input.bookingId, "cancelled_by_student", {
        cancelReason: input.reason,
        cancelledAt: /* @__PURE__ */ new Date()
      });
      await updatePaymentStatus(input.bookingId, "refunded");
      const coach = await getCoachProfileById(booking.coachId);
      if (coach) {
        const coachUser = await getUserById(coach.userId);
        if (coachUser) {
          await sendNotification(
            coachUser.id,
            "booking_cancelled",
            "\u5B66\u5458\u53D6\u6D88\u9884\u7EA6",
            `${ctx.user.name ?? "\u5B66\u5458"} \u53D6\u6D88\u4E86 ${booking.lessonDate} ${booking.startTime} \u7684\u8BFE\u7A0B\u3002`,
            input.bookingId
          );
        }
      }
      return { success: true };
    }),
    submitReview: protectedProcedure.input(z2.object({
      bookingId: z2.number(),
      rating: z2.number().min(1).max(5),
      content: z2.string().optional(),
      tags: z2.array(z2.string()).optional()
    })).mutation(async ({ ctx, input }) => {
      const booking = await getBookingById(input.bookingId);
      if (!booking || booking.studentId !== ctx.user.id) throw new TRPCError3({ code: "FORBIDDEN" });
      if (booking.status !== "completed") throw new TRPCError3({ code: "BAD_REQUEST", message: "\u8BFE\u7A0B\u672A\u5B8C\u6210" });
      const existingReview = await getReviewByBookingId(input.bookingId);
      if (existingReview) throw new TRPCError3({ code: "BAD_REQUEST", message: "\u8BE5\u8BFE\u7A0B\u5DF2\u8BC4\u4EF7\uFF0C\u4E0D\u53EF\u91CD\u590D\u63D0\u4EA4" });
      await createReview({
        bookingId: input.bookingId,
        studentId: ctx.user.id,
        coachId: booking.coachId,
        rating: input.rating,
        content: input.content,
        tags: input.tags
      });
      const coach = await getCoachProfileById(booking.coachId);
      if (coach) {
        const coachUser = await getUserById(coach.userId);
        if (coachUser) {
          await sendNotification(
            coachUser.id,
            "review_received",
            "\u6536\u5230\u65B0\u8BC4\u4EF7 \u2B50",
            `${ctx.user.name ?? "\u5B66\u5458"} \u7ED9\u60A8\u7559\u4E0B\u4E86 ${input.rating} \u661F\u8BC4\u4EF7\u3002`,
            input.bookingId
          );
        }
      }
      return { success: true };
    })
  }),
  // ─── Notifications ─────────────────────────────────────────────────────────
  notification: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getNotifications(ctx.user.id);
    }),
    markRead: protectedProcedure.input(z2.object({ ids: z2.array(z2.number()).optional() })).mutation(async ({ ctx, input }) => {
      await markNotificationsRead(ctx.user.id, input.ids);
      return { success: true };
    }),
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await markNotificationsRead(ctx.user.id);
      return { success: true };
    }),
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      const count2 = await getUnreadNotificationCount(ctx.user.id);
      return { count: count2 };
    }),
    delete: protectedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ ctx, input }) => {
      await deleteNotification(ctx.user.id, input.id);
      return { success: true };
    })
  }),
  // ─── Coupons (public) ──────────────────────────────────────────────────────
  coupon: router({
    validate: protectedProcedure.input(z2.object({ code: z2.string(), coachId: z2.number(), amount: z2.string() })).query(async ({ input }) => {
      const coupon = await getCouponByCode(input.code);
      if (!coupon) return { valid: false, message: "\u4F18\u60E0\u5238\u4E0D\u5B58\u5728" };
      if (/* @__PURE__ */ new Date() > new Date(coupon.validUntil)) return { valid: false, message: "\u4F18\u60E0\u5238\u5DF2\u8FC7\u671F" };
      if (coupon.usedCount >= (coupon.maxUsageCount ?? 100)) return { valid: false, message: "\u4F18\u60E0\u5238\u5DF2\u7528\u5B8C" };
      if (coupon.coachId && coupon.coachId !== input.coachId) return { valid: false, message: "\u8BE5\u4F18\u60E0\u5238\u4E0D\u9002\u7528\u4E8E\u6B64\u6559\u7EC3" };
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
        finalAmount: (parseFloat(input.amount) - discount).toFixed(2)
      };
    })
  }),
  // ─── Admin ─────────────────────────────────────────────────────────────────
  admin: router({
    stats: adminProcedure2.query(async () => {
      const base = await getPlatformStats();
      const dbInstance = await getDb();
      if (!dbInstance) return { ...base, totalMatches: 0, weekMatches: 0, weekParticipants: 0 };
      const { tennisMatches: tennisMatches2, matchParticipants: matchParticipants2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { sql: sqlFn, gte: gteOp } = await import("drizzle-orm");
      const [matchCount] = await dbInstance.select({ count: sqlFn`count(*)` }).from(tennisMatches2);
      const weekStart = /* @__PURE__ */ new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      const weekStartStr = weekStart.toISOString().slice(0, 10);
      const [weekMatchCount] = await dbInstance.select({ count: sqlFn`count(*)` }).from(tennisMatches2).where(gteOp(tennisMatches2.matchDate, weekStartStr));
      const [weekParticipantCount] = await dbInstance.select({ count: sqlFn`count(*)` }).from(matchParticipants2).where(gteOp(matchParticipants2.createdAt, weekStart));
      return {
        ...base,
        totalMatches: Number(matchCount?.count ?? 0),
        weekMatches: Number(weekMatchCount?.count ?? 0),
        weekParticipants: Number(weekParticipantCount?.count ?? 0)
      };
    }),
    coaches: adminProcedure2.query(async () => {
      return getCoachProfiles({ limit: 100 });
    }),
    venues: adminProcedure2.query(async () => {
      return getVenues();
    }),
    seedVenues: adminProcedure2.mutation(async () => {
      const venueData = [
        {
          name: "\u6DF1\u5733\u5927\u5B66\u57CE\u4F53\u80B2\u4E2D\u5FC3\u7F51\u7403\u573A",
          area: "\u5927\u5B66\u57CE",
          address: "\u6DF1\u5733\u5E02\u5357\u5C71\u533A\u7559\u4ED9\u5927\u90532032\u53F7",
          description: "\u5927\u5B66\u57CE\u6838\u5FC3\u533A\u57DF\uFF0C\u73AF\u5883\u4F18\u7F8E\uFF0C\u8BBE\u65BD\u5B8C\u5584\uFF0C\u62E5\u6709\u591A\u7247\u6807\u51C6\u7F51\u7403\u573A\u5730\uFF0C\u706F\u5149\u7167\u660E\u6EE1\u8DB3\u591C\u95F4\u8BAD\u7EC3\u9700\u6C42\u3002",
          courtCount: 6,
          pricePerHour: "80.00",
          openTime: "08:00",
          closeTime: "22:00",
          phone: "0755-26536888"
        },
        {
          name: "\u6DF1\u5733\u5927\u5B66\u7CA4\u6D77\u6821\u533A\u7F51\u7403\u573A",
          area: "\u5927\u5B66\u57CE",
          address: "\u6DF1\u5733\u5E02\u5357\u5C71\u533A\u5357\u6D77\u5927\u90533688\u53F7",
          description: "\u6DF1\u5733\u5927\u5B66\u6821\u5185\u7F51\u7403\u573A\uFF0C\u786C\u5730\u7403\u573A\uFF0C\u73AF\u5883\u5B89\u9759\uFF0C\u9002\u5408\u4E13\u4E1A\u8BAD\u7EC3\u3002",
          courtCount: 4,
          pricePerHour: "60.00",
          openTime: "08:00",
          closeTime: "22:00",
          phone: "0755-26534000"
        },
        {
          name: "\u5357\u5C71\u7CA4\u6D77\u6587\u4F53\u4E2D\u5FC3\uFF08UPTennis\uFF09",
          area: "\u5357\u5C71",
          address: "\u6DF1\u5733\u5E02\u5357\u5C71\u533A\u9AD8\u65B0\u5357\u73AF\u8DEF1\u53F7",
          description: "\u5357\u5C71\u79D1\u6280\u56ED\u6838\u5FC3\u5730\u5E26\uFF0C\u5BA4\u5185\u7F51\u7403\u573A\uFF0C\u4E0D\u53D7\u5929\u6C14\u5F71\u54CD\uFF0C\u4E13\u4E1A\u7EA7\u573A\u5730\u8BBE\u65BD\u3002",
          courtCount: 8,
          pricePerHour: "120.00",
          openTime: "07:00",
          closeTime: "23:00",
          phone: "0755-86000888"
        },
        {
          name: "\u86C7\u53E3\u4F53\u80B2\u4E2D\u5FC3\u7F51\u7403\u573A",
          area: "\u5357\u5C71",
          address: "\u6DF1\u5733\u5E02\u5357\u5C71\u533A\u86C7\u53E3\u5DE5\u4E1A\u8DEF109\u53F7",
          description: "\u86C7\u53E3\u8001\u533A\u56FD\u9645\u5316\u793E\u533A\uFF0C\u6C1B\u56F4\u8F7B\u677E\uFF0C\u5468\u8FB9\u914D\u5957\u5B8C\u5584\uFF0C\u9002\u5408\u4F11\u95F2\u4E0E\u4E13\u4E1A\u8BAD\u7EC3\u3002",
          courtCount: 4,
          pricePerHour: "90.00",
          openTime: "08:00",
          closeTime: "22:00",
          phone: "0755-26851888"
        },
        {
          name: "\u6DF1\u5733\u6E7E\u4F53\u80B2\u4E2D\u5FC3\u7F51\u7403\u573A",
          area: "\u5357\u5C71",
          address: "\u6DF1\u5733\u5E02\u5357\u5C71\u533A\u767D\u77F3\u8DEF6\u53F7",
          description: "\u6DF1\u5733\u6E7E\u7554\uFF0C\u666F\u8272\u4F18\u7F8E\uFF0C\u4E13\u4E1A\u7EA7\u7F51\u7403\u573A\u5730\uFF0C\u66FE\u627F\u529E\u591A\u9879\u56FD\u9645\u8D5B\u4E8B\u3002",
          courtCount: 10,
          pricePerHour: "140.00",
          openTime: "07:00",
          closeTime: "22:00",
          phone: "0755-86999888"
        },
        {
          name: "\u9999\u871C\u4F53\u80B2\u4E2D\u5FC3\u7F51\u7403\u573A",
          area: "\u798F\u7530",
          address: "\u6DF1\u5733\u5E02\u798F\u7530\u533A\u9999\u871C\u516C\u56ED\u897F\u5317\u90E8",
          description: "\u798F\u7530\u533A\u6700\u5927\u4E13\u4E1A\u7F51\u7403\u573A\u5730\uFF0C7\u7247\u6807\u51C6\u7F51\u7403\u573A\uFF0C\u573A\u5730\u6807\u51C6\u9AD8\uFF0C\u706F\u5149\u7167\u660E\u6EE1\u8DB3\u4E13\u4E1A\u8BAD\u7EC3\u548C\u4E1A\u4F59\u6BD4\u8D5B\u9700\u6C42\u3002",
          courtCount: 7,
          pricePerHour: "100.00",
          openTime: "07:00",
          closeTime: "22:00",
          phone: "0755-83789888"
        },
        {
          name: "\u4E2D\u5FC3\u516C\u56ED\u4F53\u80B2\u4E2D\u5FC3\u7F51\u7403\u573A",
          area: "\u798F\u7530",
          address: "\u6DF1\u5733\u5E02\u798F\u7530\u533A\u4E2D\u5FC3\u516C\u56EDD1\u533A",
          description: "\u798F\u7530CBD\u6838\u5FC3\uFF0C\u505C\u8F66\u4FBF\u5229\uFF0C\u89C6\u91CE\u5F00\u9614\uFF0C\u63D0\u4F9B\u6559\u7EC3\u57F9\u8BAD\u8BFE\u7A0B\u53CA\u5668\u6750\u79DF\u501F\u670D\u52A1\u3002",
          courtCount: 2,
          pricePerHour: "80.00",
          openTime: "08:00",
          closeTime: "21:00",
          phone: "0755-83521888"
        },
        {
          name: "\u9ED1\u9A6C\u7F51\u7403\u4FF1\u4E50\u90E8\uFF08\u9999\u683C\u91CC\u62C9\u5E97\uFF09",
          area: "\u798F\u7530",
          address: "\u6DF1\u5733\u5E02\u798F\u7530\u533ACBD\u9999\u683C\u91CC\u62C9\u5927\u9152\u5E974\u697C",
          description: "CBD\u6838\u5FC3\u5730\u5E26\uFF0C\u9AD8\u7AEF\u5BA4\u5185\u7F51\u7403\u573A\uFF0C\u73AF\u5883\u4F18\u96C5\uFF0C\u9002\u5408\u5546\u52A1\u4EBA\u58EB\u548C\u9AD8\u7AEF\u5B66\u5458\u3002",
          courtCount: 3,
          pricePerHour: "150.00",
          openTime: "07:00",
          closeTime: "23:00",
          phone: "0755-82888888"
        }
      ];
      for (const v of venueData) {
        await createVenue(v);
      }
      return { success: true, count: venueData.length };
    }),
    pendingCoaches: adminProcedure2.query(async () => {
      const dbInstance = await getDb();
      if (!dbInstance) return [];
      const { coachProfiles: coachProfiles2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2 } = await import("drizzle-orm");
      return dbInstance.select().from(coachProfiles2).where(eq2(coachProfiles2.verificationStatus, "pending")).limit(100);
    }),
    allCoaches: adminProcedure2.input(z2.object({
      sortBy: z2.enum(["totalLessons", "avgRating", "totalStudents", "sortWeight", "createdAt"]).optional(),
      filterSpecialty: z2.string().optional(),
      filterCategory: z2.string().optional()
    }).optional()).query(async ({ input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) return [];
      const { coachProfiles: coachProfiles2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { desc: desc2, asc: asc2 } = await import("drizzle-orm");
      const sortField = input?.sortBy ?? "sortWeight";
      const orderFn = sortField === "createdAt" ? asc2 : desc2;
      const rows = await dbInstance.select().from(coachProfiles2).orderBy(orderFn(coachProfiles2[sortField])).limit(200);
      let result = rows;
      if (input?.filterSpecialty) {
        result = result.filter((r) => (r.specialties ?? []).includes(input.filterSpecialty));
      }
      if (input?.filterCategory) {
        result = result.filter((r) => (r.categoryTags ?? []).includes(input.filterCategory));
      }
      return result;
    }),
    reorderCoaches: adminProcedure2.input(z2.object({
      // Array of { coachId, sortWeight } pairs to update in batch
      orders: z2.array(z2.object({ coachId: z2.number(), sortWeight: z2.number() }))
    })).mutation(async ({ input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { coachProfiles: coachProfiles2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2 } = await import("drizzle-orm");
      await Promise.all(
        input.orders.map(
          ({ coachId, sortWeight }) => dbInstance.update(coachProfiles2).set({ sortWeight }).where(eq2(coachProfiles2.id, coachId))
        )
      );
      return { success: true };
    }),
    updateCoachMeta: adminProcedure2.input(z2.object({
      coachId: z2.number(),
      categoryTags: z2.array(z2.string()).optional(),
      sortWeight: z2.number().optional()
    })).mutation(async ({ input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { coachProfiles: coachProfiles2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2 } = await import("drizzle-orm");
      const updates = {};
      if (input.categoryTags !== void 0) updates.categoryTags = input.categoryTags;
      if (input.sortWeight !== void 0) updates.sortWeight = input.sortWeight;
      if (Object.keys(updates).length === 0) return { success: true };
      await dbInstance.update(coachProfiles2).set(updates).where(eq2(coachProfiles2.id, input.coachId));
      return { success: true };
    }),
    approveCoach: adminProcedure2.input(z2.object({ coachId: z2.number() })).mutation(async ({ input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { coachProfiles: coachProfiles2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2 } = await import("drizzle-orm");
      const [coach] = await dbInstance.select().from(coachProfiles2).where(eq2(coachProfiles2.id, input.coachId)).limit(1);
      if (!coach) throw new TRPCError3({ code: "NOT_FOUND" });
      await dbInstance.update(coachProfiles2).set({ isVerified: true, isActive: true, verificationStatus: "approved", reviewNote: null }).where(eq2(coachProfiles2.id, input.coachId));
      const { users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      await dbInstance.update(users2).set({ role: "coach" }).where(eq2(users2.id, coach.userId));
      await sendNotification(
        coach.userId,
        "coach_approved",
        "\u6559\u7EC3\u5165\u9A7B\u7533\u8BF7\u5DF2\u901A\u8FC7 \u2705",
        "\u606D\u559C\uFF01\u60A8\u7684\u6559\u7EC3\u5165\u9A7B\u7533\u8BF7\u5DF2\u901A\u8FC7\u5BA1\u6838\uFF0C\u73B0\u5728\u53EF\u4EE5\u767B\u5F55\u6559\u7EC3\u5DE5\u4F5C\u53F0\u5E76\u63A5\u53D7\u5B66\u5458\u9884\u7EA6\u3002",
        input.coachId
      );
      const coachUserApprove = await getUserById(coach.userId);
      if (coachUserApprove?.wechatOpenid) {
        wxNotifyCoachApproved({
          openid: coachUserApprove.wechatOpenid,
          coachName: coach.displayName
        }).catch(console.error);
      }
      return { success: true };
    }),
    rejectCoach: adminProcedure2.input(z2.object({ coachId: z2.number(), reason: z2.string().optional() })).mutation(async ({ input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { coachProfiles: coachProfiles2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2 } = await import("drizzle-orm");
      const [coach] = await dbInstance.select().from(coachProfiles2).where(eq2(coachProfiles2.id, input.coachId)).limit(1);
      if (!coach) throw new TRPCError3({ code: "NOT_FOUND" });
      await dbInstance.update(coachProfiles2).set({ isActive: false, verificationStatus: "rejected", reviewNote: input.reason ?? null }).where(eq2(coachProfiles2.id, input.coachId));
      await sendNotification(
        coach.userId,
        "coach_rejected",
        "\u6559\u7EC3\u8D44\u8D28\u5BA1\u6838\u672A\u901A\u8FC7",
        `\u60A8\u7684\u6559\u7EC3\u6863\u6848\u5BA1\u6838\u672A\u901A\u8FC7\u3002${input.reason ? "\u539F\u56E0\uFF1A" + input.reason : ""}\u8BF7\u5B8C\u5584\u8D44\u6599\u540E\u91CD\u65B0\u63D0\u4EA4\u3002`,
        input.coachId
      );
      const coachUserReject = await getUserById(coach.userId);
      if (coachUserReject?.wechatOpenid) {
        wxNotifyCoachRejected({
          openid: coachUserReject.wechatOpenid,
          coachName: coach.displayName,
          reason: input.reason ?? "\u8D44\u8D28\u6750\u6599\u4E0D\u7B26\u5408\u8981\u6C42"
        }).catch(console.error);
      }
      return { success: true };
    }),
    submitForReview: adminProcedure2.input(z2.object({ coachId: z2.number() })).mutation(async ({ input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { coachProfiles: coachProfiles2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2 } = await import("drizzle-orm");
      await dbInstance.update(coachProfiles2).set({ verificationStatus: "pending" }).where(eq2(coachProfiles2.id, input.coachId));
      return { success: true };
    }),
    // ── Content review: approve/reject coach's self-promotion content ──────────
    reviewCoachContent: adminProcedure2.input(z2.object({
      coachId: z2.number(),
      status: z2.enum(["approved", "rejected"]),
      note: z2.string().optional()
    })).mutation(async ({ input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { coachProfiles: coachProfiles2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2 } = await import("drizzle-orm");
      const [coach] = await dbInstance.select().from(coachProfiles2).where(eq2(coachProfiles2.id, input.coachId)).limit(1);
      if (!coach) throw new TRPCError3({ code: "NOT_FOUND" });
      await dbInstance.update(coachProfiles2).set({ contentReviewStatus: input.status, contentReviewNote: input.note ?? null }).where(eq2(coachProfiles2.id, input.coachId));
      if (input.status === "approved") {
        await sendNotification(
          coach.userId,
          "system",
          "\u4E2A\u4EBA\u4E3B\u9875\u5185\u5BB9\u5BA1\u6838\u901A\u8FC7 \u2705",
          "\u60A8\u7684\u4E2A\u4EBA\u4ECB\u7ECD\u3001\u793E\u4EA4\u5A92\u4F53\u94FE\u63A5\u548C\u89C6\u9891\u5185\u5BB9\u5DF2\u901A\u8FC7\u5BA1\u6838\uFF0C\u73B0\u5DF2\u5728\u6559\u7EC3\u8BE6\u60C5\u9875\u516C\u5F00\u5C55\u793A\u3002",
          input.coachId
        );
      } else {
        await sendNotification(
          coach.userId,
          "system",
          "\u4E2A\u4EBA\u4E3B\u9875\u5185\u5BB9\u5BA1\u6838\u672A\u901A\u8FC7",
          `\u60A8\u7684\u4E2A\u4EBA\u4E3B\u9875\u5185\u5BB9\u5BA1\u6838\u672A\u901A\u8FC7\u3002${input.note ? "\u539F\u56E0\uFF1A" + input.note : "\u8BF7\u4FEE\u6539\u540E\u91CD\u65B0\u63D0\u4EA4\u3002"}`,
          input.coachId
        );
      }
      return { success: true };
    }),
    // ── Get coaches pending content review ────────────────────────────────────
    pendingContentReview: adminProcedure2.query(async () => {
      const dbInstance = await getDb();
      if (!dbInstance) return [];
      const { coachProfiles: coachProfiles2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2 } = await import("drizzle-orm");
      return dbInstance.select().from(coachProfiles2).where(eq2(coachProfiles2.contentReviewStatus, "pending")).limit(100);
    }),
    allStudents: adminProcedure2.input(z2.object({
      search: z2.string().optional(),
      sortBy: z2.enum(["createdAt", "totalBookings", "totalSpent", "lastSignedIn"]).optional()
    }).optional()).query(async ({ input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) return [];
      const { users: users2, bookings: bookings2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2, or: or2, like: like2, sql: sql2, desc: desc2, asc: asc2, ne } = await import("drizzle-orm");
      let query = dbInstance.select({
        id: users2.id,
        name: users2.name,
        email: users2.email,
        phone: users2.phone,
        avatar: users2.avatar,
        createdAt: users2.createdAt,
        lastSignedIn: users2.lastSignedIn
      }).from(users2).where(eq2(users2.role, "user"));
      const rows = await query.limit(500);
      const statsRows = await dbInstance.select({
        studentId: bookings2.studentId,
        totalBookings: sql2`count(*)`,
        completedBookings: sql2`sum(case when ${bookings2.status} = 'completed' then 1 else 0 end)`,
        totalSpent: sql2`sum(case when ${bookings2.status} = 'completed' then cast(${bookings2.finalAmount} as decimal) else 0 end)`,
        lastBookingDate: sql2`max(${bookings2.lessonDate})`
      }).from(bookings2).groupBy(bookings2.studentId);
      const statsMap = new Map(statsRows.map((s) => [s.studentId, s]));
      let result = rows.map((u) => ({
        ...u,
        totalBookings: Number(statsMap.get(u.id)?.totalBookings ?? 0),
        completedBookings: Number(statsMap.get(u.id)?.completedBookings ?? 0),
        totalSpent: Number(statsMap.get(u.id)?.totalSpent ?? 0),
        lastBookingDate: statsMap.get(u.id)?.lastBookingDate ?? null
      }));
      if (input?.search) {
        const q = input.search.toLowerCase();
        result = result.filter(
          (u) => (u.name ?? "").toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q) || (u.phone ?? "").includes(q)
        );
      }
      const sortBy = input?.sortBy ?? "createdAt";
      result.sort((a, b) => {
        if (sortBy === "totalBookings") return b.totalBookings - a.totalBookings;
        if (sortBy === "totalSpent") return b.totalSpent - a.totalSpent;
        if (sortBy === "lastSignedIn") return new Date(b.lastSignedIn).getTime() - new Date(a.lastSignedIn).getTime();
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      return result;
    }),
    studentBookings: adminProcedure2.input(z2.object({ studentId: z2.number() })).query(async ({ input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) return [];
      const { bookings: bookings2, coachProfiles: coachProfiles2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2 } = await import("drizzle-orm");
      const rows = await dbInstance.select({
        id: bookings2.id,
        bookingNo: bookings2.bookingNo,
        lessonDate: bookings2.lessonDate,
        startTime: bookings2.startTime,
        endTime: bookings2.endTime,
        status: bookings2.status,
        finalAmount: bookings2.finalAmount,
        coachId: bookings2.coachId,
        customVenueName: bookings2.customVenueName,
        studentNote: bookings2.studentNote,
        createdAt: bookings2.createdAt,
        coachName: coachProfiles2.displayName
      }).from(bookings2).leftJoin(coachProfiles2, eq2(bookings2.coachId, coachProfiles2.id)).where(eq2(bookings2.studentId, input.studentId)).orderBy(bookings2.createdAt).limit(200);
      return rows.reverse();
    }),
    // ─── User Moderation ────────────────────────────────────────────────────
    listUsers: adminProcedure2.input(z2.object({
      search: z2.string().optional(),
      limit: z2.number().optional(),
      offset: z2.number().optional()
    }).optional()).query(async ({ input }) => {
      const userList = await listUsers(input);
      const total = await countUsers(input?.search);
      return { users: userList, total };
    }),
    warnUser: adminProcedure2.input(z2.object({
      userId: z2.number(),
      reason: z2.string().min(1, "\u8BF7\u586B\u5199\u8B66\u544A\u539F\u56E0")
    })).mutation(async ({ input }) => {
      const user = await getUserById(input.userId);
      if (!user) throw new TRPCError3({ code: "NOT_FOUND", message: "\u7528\u6237\u4E0D\u5B58\u5728" });
      if (user.role === "admin") throw new TRPCError3({ code: "FORBIDDEN", message: "\u4E0D\u80FD\u5BF9\u7BA1\u7406\u5458\u6267\u884C\u6B64\u64CD\u4F5C" });
      const history = Array.isArray(user.warningHistory) ? user.warningHistory : [];
      history.push({ reason: input.reason, createdAt: (/* @__PURE__ */ new Date()).toISOString() });
      const newCount = (user.warningCount ?? 0) + 1;
      await updateUserModeration(input.userId, {
        status: "warned",
        warningCount: newCount,
        warningHistory: history
      });
      await sendNotification(
        input.userId,
        "system",
        "\u8FDD\u89C4\u8B66\u544A\u901A\u77E5",
        `\u60A8\u7684\u8D26\u53F7\u56E0\u8FDD\u89C4\u884C\u4E3A\u6536\u5230\u7BA1\u7406\u5458\u8B66\u544A\uFF08\u7B2C ${newCount} \u6B21\uFF09\u3002\u8FDD\u89C4\u539F\u56E0\uFF1A${input.reason}\u3002\u8BF7\u7ACB\u5373\u6574\u6539\uFF0C\u82E5\u7EE7\u7EED\u8FDD\u89C4\u5C06\u88AB\u5C01\u53F7\u3002`,
        void 0
      );
      return { success: true };
    }),
    banUser: adminProcedure2.input(z2.object({
      userId: z2.number(),
      reason: z2.string().min(1, "\u8BF7\u586B\u5199\u5C01\u53F7\u539F\u56E0")
    })).mutation(async ({ input }) => {
      const user = await getUserById(input.userId);
      if (!user) throw new TRPCError3({ code: "NOT_FOUND", message: "\u7528\u6237\u4E0D\u5B58\u5728" });
      if (user.role === "admin") throw new TRPCError3({ code: "FORBIDDEN", message: "\u4E0D\u80FD\u5BF9\u7BA1\u7406\u5458\u6267\u884C\u6B64\u64CD\u4F5C" });
      await updateUserModeration(input.userId, {
        status: "banned",
        banReason: input.reason
      });
      await sendNotification(
        input.userId,
        "system",
        "\u8D26\u53F7\u5DF2\u88AB\u5C01\u7981",
        `\u60A8\u7684\u8D26\u53F7\u56E0\u8FDD\u89C4\u884C\u4E3A\u5DF2\u88AB\u7BA1\u7406\u5458\u5C01\u7981\u3002\u5C01\u7981\u539F\u56E0\uFF1A${input.reason}\u3002\u5982\u6709\u5F02\u8BAE\u8BF7\u8054\u7CFB\u5E73\u53F0\u5BA2\u670D\u3002`,
        void 0
      );
      return { success: true };
    }),
    unbanUser: adminProcedure2.input(z2.object({ userId: z2.number() })).mutation(async ({ input }) => {
      const user = await getUserById(input.userId);
      if (!user) throw new TRPCError3({ code: "NOT_FOUND", message: "\u7528\u6237\u4E0D\u5B58\u5728" });
      await updateUserModeration(input.userId, {
        status: "active",
        banReason: null
      });
      await sendNotification(
        input.userId,
        "system",
        "\u8D26\u53F7\u5C01\u7981\u5DF2\u89E3\u9664",
        "\u60A8\u7684\u8D26\u53F7\u5C01\u7981\u5DF2\u88AB\u7BA1\u7406\u5458\u89E3\u9664\uFF0C\u73B0\u5728\u53EF\u4EE5\u6B63\u5E38\u4F7F\u7528\u5E73\u53F0\u6240\u6709\u529F\u80FD\u3002",
        void 0
      );
      return { success: true };
    }),
    deleteUser: adminProcedure2.input(z2.object({ userId: z2.number() })).mutation(async ({ input }) => {
      const user = await getUserById(input.userId);
      if (!user) throw new TRPCError3({ code: "NOT_FOUND", message: "\u7528\u6237\u4E0D\u5B58\u5728" });
      if (user.role === "admin") throw new TRPCError3({ code: "FORBIDDEN", message: "\u4E0D\u80FD\u5220\u9664\u7BA1\u7406\u5458\u8D26\u6237" });
      await deleteUserById(input.userId);
      return { success: true };
    }),
    // ─── Match Management ───────────────────────────────────────────────────
    allMatches: adminProcedure2.input(z2.object({
      status: z2.string().optional(),
      search: z2.string().optional(),
      dateFrom: z2.string().optional(),
      dateTo: z2.string().optional(),
      limit: z2.number().default(50),
      offset: z2.number().default(0)
    })).query(async ({ input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) return { matches: [], total: 0 };
      const { tennisMatches: tennisMatches2, users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eqOp, gte: gteOp, lte: lteOp, desc: descOp, and: andOp, or: orOp, sql: sqlFn } = await import("drizzle-orm");
      const conditions = [];
      if (input.status) conditions.push(eqOp(tennisMatches2.status, input.status));
      if (input.dateFrom) conditions.push(gteOp(tennisMatches2.matchDate, input.dateFrom));
      if (input.dateTo) conditions.push(lteOp(tennisMatches2.matchDate, input.dateTo));
      if (input.search) {
        const like2 = `%${input.search}%`;
        conditions.push(orOp(
          sqlFn`${tennisMatches2.title} LIKE ${like2}`,
          sqlFn`${users2.name} LIKE ${like2}`
        ));
      }
      const whereClause = conditions.length > 0 ? andOp(...conditions) : void 0;
      const rows = await dbInstance.select({
        id: tennisMatches2.id,
        title: tennisMatches2.title,
        matchType: tennisMatches2.matchType,
        matchDate: tennisMatches2.matchDate,
        startTime: tennisMatches2.startTime,
        venueName: tennisMatches2.venueName,
        status: tennisMatches2.status,
        currentParticipants: tennisMatches2.currentParticipants,
        maxParticipants: tennisMatches2.maxParticipants,
        authorId: tennisMatches2.authorId,
        createdAt: tennisMatches2.createdAt,
        authorName: users2.name,
        authorEmail: users2.email
      }).from(tennisMatches2).leftJoin(users2, eqOp(tennisMatches2.authorId, users2.id)).where(whereClause).orderBy(descOp(tennisMatches2.createdAt));
      const total = rows.length;
      const matches = rows.slice(input.offset, input.offset + input.limit);
      return { matches, total };
    }),
    cancelMatch: adminProcedure2.input(z2.object({
      matchId: z2.number(),
      reason: z2.string().min(1, "\u8BF7\u586B\u5199\u53D6\u6D88\u539F\u56E0")
    })).mutation(async ({ input }) => {
      const match = await getTennisMatchById(input.matchId);
      if (!match) throw new TRPCError3({ code: "NOT_FOUND", message: "\u7403\u5C40\u4E0D\u5B58\u5728" });
      if (match.status === "cancelled") throw new TRPCError3({ code: "BAD_REQUEST", message: "\u7403\u5C40\u5DF2\u53D6\u6D88" });
      await updateTennisMatchStatus(input.matchId, "cancelled");
      const participants = await getMatchParticipants(input.matchId);
      for (const p of participants) {
        if (p.status === "confirmed") {
          await sendNotification(
            p.userId,
            "system",
            "\u7403\u5C40\u5DF2\u88AB\u53D6\u6D88",
            `\u60A8\u62A5\u540D\u7684\u7403\u5C40\u300C${match.title}\u300D\u5DF2\u88AB\u7BA1\u7406\u5458\u53D6\u6D88\u3002\u539F\u56E0\uFF1A${input.reason}`,
            void 0
          );
        }
      }
      await sendNotification(
        match.authorId,
        "system",
        "\u60A8\u7684\u7403\u5C40\u5DF2\u88AB\u7BA1\u7406\u5458\u53D6\u6D88",
        `\u60A8\u53D1\u5E03\u7684\u7403\u5C40\u300C${match.title}\u300D\u5DF2\u88AB\u7BA1\u7406\u5458\u5F3A\u5236\u53D6\u6D88\u3002\u539F\u56E0\uFF1A${input.reason}`,
        void 0
      );
      return { success: true };
    }),
    deleteMatch: adminProcedure2.input(z2.object({ matchId: z2.number() })).mutation(async ({ input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { tennisMatches: tennisMatches2, matchParticipants: matchParticipants2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eqOp } = await import("drizzle-orm");
      await dbInstance.delete(matchParticipants2).where(eqOp(matchParticipants2.matchId, input.matchId));
      await dbInstance.delete(tennisMatches2).where(eqOp(tennisMatches2.id, input.matchId));
      return { success: true };
    }),
    // ─── Permission Management ───────────────────────────────────────────────
    allAdmins: adminProcedure2.query(async () => {
      const dbInstance = await getDb();
      if (!dbInstance) return [];
      const { users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eqOp } = await import("drizzle-orm");
      return dbInstance.select({
        id: users2.id,
        name: users2.name,
        email: users2.email,
        phone: users2.phone,
        avatar: users2.avatar,
        openId: users2.openId,
        createdAt: users2.createdAt,
        lastSignedIn: users2.lastSignedIn
      }).from(users2).where(eqOp(users2.role, "admin"));
    }),
    grantAdmin: protectedProcedure.input(z2.object({ userId: z2.number() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.openId !== ENV.ownerOpenId) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "\u53EA\u6709\u8D85\u7EA7\u7BA1\u7406\u5458\u53EF\u4EE5\u6388\u6743\u7BA1\u7406\u5458\u6743\u9650" });
      }
      const targetUser = await getUserById(input.userId);
      if (!targetUser) throw new TRPCError3({ code: "NOT_FOUND", message: "\u7528\u6237\u4E0D\u5B58\u5728" });
      if (targetUser.role === "admin") throw new TRPCError3({ code: "BAD_REQUEST", message: "\u8BE5\u7528\u6237\u5DF2\u662F\u7BA1\u7406\u5458" });
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eqOp } = await import("drizzle-orm");
      await dbInstance.update(users2).set({ role: "admin" }).where(eqOp(users2.id, input.userId));
      await sendNotification(
        input.userId,
        "system",
        "\u60A8\u5DF2\u83B7\u5F97\u7BA1\u7406\u5458\u6743\u9650",
        "\u5E73\u53F0\u8D85\u7EA7\u7BA1\u7406\u5458\u5DF2\u6388\u4E88\u60A8\u7BA1\u7406\u5458\u6743\u9650\uFF0C\u60A8\u73B0\u5728\u53EF\u4EE5\u8BBF\u95EE\u7BA1\u7406\u540E\u53F0\u3002",
        void 0
      );
      return { success: true };
    }),
    revokeAdmin: protectedProcedure.input(z2.object({ userId: z2.number() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.openId !== ENV.ownerOpenId) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "\u53EA\u6709\u8D85\u7EA7\u7BA1\u7406\u5458\u53EF\u4EE5\u64A4\u9500\u7BA1\u7406\u5458\u6743\u9650" });
      }
      if (ctx.user.id === input.userId) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u4E0D\u80FD\u64A4\u9500\u81EA\u5DF1\u7684\u7BA1\u7406\u5458\u6743\u9650" });
      }
      const targetUser = await getUserById(input.userId);
      if (!targetUser) throw new TRPCError3({ code: "NOT_FOUND", message: "\u7528\u6237\u4E0D\u5B58\u5728" });
      if (targetUser.openId === ENV.ownerOpenId) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "\u4E0D\u80FD\u64A4\u9500\u8D85\u7EA7\u7BA1\u7406\u5458\u7684\u6743\u9650" });
      }
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eqOp } = await import("drizzle-orm");
      await dbInstance.update(users2).set({ role: "user" }).where(eqOp(users2.id, input.userId));
      await sendNotification(
        input.userId,
        "system",
        "\u7BA1\u7406\u5458\u6743\u9650\u5DF2\u88AB\u64A4\u9500",
        "\u60A8\u7684\u7BA1\u7406\u5458\u6743\u9650\u5DF2\u88AB\u8D85\u7EA7\u7BA1\u7406\u5458\u64A4\u9500\u3002",
        void 0
      );
      return { success: true };
    }),
    searchUsersForAdmin: adminProcedure2.input(z2.object({ query: z2.string().min(1) })).query(async ({ input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) return [];
      const { users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { or: orOp, sql: sqlFn } = await import("drizzle-orm");
      const like2 = `%${input.query}%`;
      return dbInstance.select({
        id: users2.id,
        name: users2.name,
        email: users2.email,
        phone: users2.phone,
        avatar: users2.avatar,
        role: users2.role,
        openId: users2.openId
      }).from(users2).where(
        orOp(
          sqlFn`${users2.name} LIKE ${like2}`,
          sqlFn`${users2.email} LIKE ${like2}`,
          sqlFn`${users2.phone} LIKE ${like2}`
        )
      ).limit(20);
    }),
    seedCoach: adminProcedure2.mutation(async ({ ctx }) => {
      const existing = await getCoachProfileByUserId(ctx.user.id);
      if (existing) return { success: true, message: "\u5DF2\u5B58\u5728" };
      const inviteCode = "TENNIS2024";
      const shareSlug = "coach-zhang-wei";
      await createCoachProfile({
        userId: ctx.user.id,
        displayName: "\u5F20\u5A01\u6559\u7EC3",
        tagline: "\u524DATP\u804C\u4E1A\u7403\u5458 \xB7 12\u5E74\u6267\u6559\u7ECF\u9A8C \xB7 \u6DF1\u5733\u9876\u7EA7\u79C1\u6559",
        bio: "\u66FE\u53C2\u52A0ATP\u5DE1\u56DE\u8D5B\uFF0C\u5177\u5907\u4E30\u5BCC\u7684\u804C\u4E1A\u6BD4\u8D5B\u7ECF\u9A8C\u3002\u6267\u655912\u5E74\uFF0C\u57F9\u517B\u51FA\u591A\u540D\u7701\u7EA7\u51A0\u519B\u5B66\u5458\u3002\u64C5\u957F\u6280\u672F\u4F53\u7CFB\u5316\u8BAD\u7EC3\uFF0C\u4ECE\u57FA\u7840\u5230\u9AD8\u9636\u5168\u7A0B\u6307\u5BFC\uFF0C\u8BFE\u7A0B\u56E0\u4EBA\u800C\u5F02\uFF0C\u7CBE\u51C6\u63D0\u5347\u6BCF\u4F4D\u5B66\u5458\u7684\u7ADE\u6280\u6C34\u5E73\u3002",
        yearsExperience: 12,
        certifications: ["ITF\u56FD\u9645\u7F51\u7403\u8054\u5408\u4F1A\u8BA4\u8BC1\u6559\u7EC3", "\u4E2D\u56FD\u7F51\u7403\u534F\u4F1A\u4E00\u7EA7\u6559\u7EC3", "ATP\u804C\u4E1A\u7403\u5458\u8BA4\u8BC1"],
        specialties: ["\u53D1\u7403\u6280\u672F", "\u5E95\u7EBF\u5BF9\u6297", "\u7F51\u524D\u622A\u51FB", "\u9752\u5C11\u5E74\u57F9\u8BAD", "\u7ADE\u6280\u63D0\u5347"],
        achievements: ["\u524DATP\u4E16\u754C\u6392\u540D\u524D200", "\u5E7F\u4E1C\u7701\u7F51\u7403\u51A0\u519B", "\u6DF1\u5733\u5E02\u6700\u4F73\u6559\u7EC3\u5956"],
        pricePerHour: "700.00",
        inviteCode,
        shareSlug,
        isVerified: true,
        totalLessons: 856,
        totalStudents: 128,
        avgRating: "4.97"
      });
      const dbInstance = await getDb();
      if (dbInstance) {
        const { users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
        const { eq: eq2 } = await import("drizzle-orm");
        await dbInstance.update(users2).set({ role: "coach" }).where(eq2(users2.id, ctx.user.id));
      }
      return { success: true };
    }),
    // 信用分恢复申请列表
    creditRestoreList: adminProcedure2.query(async () => {
      return getPendingCreditRestoreList();
    }),
    // 审核通过信用分恢复申请
    approveCreditRestore: adminProcedure2.input(z2.object({ userId: z2.number() })).mutation(async ({ input }) => {
      await approveCreditRestore(input.userId);
      return { success: true };
    })
  }),
  // ─── Feedback routes（意见反馈）───────────────────────────────────────────
  feedback: router({
    // 用户提交意见反馈
    submit: protectedProcedure.input(z2.object({
      content: z2.string().min(1).max(1e3),
      contact: z2.string().max(100).optional(),
      category: z2.enum(["suggestion", "bug", "other"]).optional()
    })).mutation(async ({ ctx, input }) => {
      await createFeedback({
        userId: ctx.user.id,
        content: input.content,
        contact: input.contact,
        category: input.category
      });
      return { success: true };
    }),
    // 用户查看自己的反馈与回复
    myList: protectedProcedure.query(async ({ ctx }) => {
      return getFeedbacksByUser(ctx.user.id);
    }),
    // 管理员查看全部反馈
    adminList: adminProcedure2.input(z2.object({
      status: z2.enum(["pending", "replied", "closed"]).optional()
    }).optional()).query(async ({ input }) => {
      return getAllFeedbacks({ status: input?.status });
    }),
    // 管理员待处理反馈数量
    pendingCount: adminProcedure2.query(async () => {
      const count2 = await getPendingFeedbackCount();
      return { count: count2 };
    }),
    // 管理员回复反馈（并通知用户）
    reply: adminProcedure2.input(z2.object({
      id: z2.number(),
      reply: z2.string().min(1).max(1e3)
    })).mutation(async ({ input }) => {
      const fb = await getFeedbackById(input.id);
      if (!fb) throw new TRPCError3({ code: "NOT_FOUND", message: "\u53CD\u9988\u4E0D\u5B58\u5728" });
      await replyFeedback(input.id, input.reply);
      await sendNotification(fb.userId, "system", "\u60A8\u7684\u53CD\u9988\u5DF2\u56DE\u590D", input.reply, input.id);
      return { success: true };
    })
  }),
  // ─── Circle routes ───────────────────────────────────────────────────────
  circle: router({
    // 创建圈子
    create: protectedProcedure.input(z2.object({
      name: z2.string().min(2).max(50),
      description: z2.string().max(200).optional(),
      joinPolicy: z2.enum(["invite_only", "approval", "open"]).optional()
    })).mutation(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { circles: circles2, circleMembers: circleMembers2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      let inviteCode = "";
      let tries = 0;
      while (tries < 10) {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        const existing = await dbInstance.select().from(circles2).where((await import("drizzle-orm")).eq(circles2.inviteCode, code)).limit(1);
        if (existing.length === 0) {
          inviteCode = code;
          break;
        }
        tries++;
      }
      if (!inviteCode) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "\u751F\u6210\u9080\u8BF7\u7801\u5931\u8D25" });
      const [result] = await dbInstance.insert(circles2).values({
        name: input.name,
        description: input.description || null,
        inviteCode,
        ownerId: ctx.user.id,
        maxMembers: 50,
        memberCount: 1,
        isPrivate: (input.joinPolicy || "approval") === "invite_only",
        joinPolicy: input.joinPolicy || "approval"
      });
      const circleId = result.insertId;
      await dbInstance.insert(circleMembers2).values({
        circleId,
        userId: ctx.user.id,
        role: "owner"
      });
      return { success: true, circleId, inviteCode };
    }),
    // 查询我加入的所有圈子
    myCircles: protectedProcedure.query(async ({ ctx }) => {
      const dbInstance = await getDb();
      if (!dbInstance) return [];
      const { circles: circles2, circleMembers: circleMembers2, users: users2, tennisMatches: tennisMatches2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, inArray: inArray2, and: and2, gte: gte2 } = await import("drizzle-orm");
      const myMemberships = await dbInstance.select({ circleId: circleMembers2.circleId, role: circleMembers2.role }).from(circleMembers2).where(eq2(circleMembers2.userId, ctx.user.id));
      if (myMemberships.length === 0) return [];
      const circleIds = myMemberships.map((m) => m.circleId);
      const circleList = await dbInstance.select().from(circles2).where(inArray2(circles2.id, circleIds));
      const ownerIds = Array.from(new Set(circleList.map((c) => c.ownerId)));
      const ownerList = await dbInstance.select({ id: users2.id, name: users2.name, avatar: users2.avatar }).from(users2).where(inArray2(users2.id, ownerIds));
      const ownerMap = Object.fromEntries(ownerList.map((u) => [u.id, u]));
      const roleMap = Object.fromEntries(myMemberships.map((m) => [m.circleId, m.role]));
      const allMembers = await dbInstance.select({
        circleId: circleMembers2.circleId,
        userId: circleMembers2.userId,
        name: users2.name,
        avatar: users2.avatar
      }).from(circleMembers2).leftJoin(users2, eq2(circleMembers2.userId, users2.id)).where(inArray2(circleMembers2.circleId, circleIds));
      const membersByCircle = {};
      for (const m of allMembers) {
        if (!membersByCircle[m.circleId]) membersByCircle[m.circleId] = [];
        membersByCircle[m.circleId].push({ userId: m.userId, name: m.name, avatar: m.avatar });
      }
      const activeCountByCircle = {};
      try {
        const todayStr = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
        const matchRows = await dbInstance.select({ circleId: tennisMatches2.circleId, status: tennisMatches2.status, matchDate: tennisMatches2.matchDate }).from(tennisMatches2).where(and2(inArray2(tennisMatches2.circleId, circleIds), gte2(tennisMatches2.matchDate, todayStr)));
        for (const r of matchRows) {
          if (r.circleId == null) continue;
          if (r.status && r.status !== "open") continue;
          activeCountByCircle[r.circleId] = (activeCountByCircle[r.circleId] || 0) + 1;
        }
      } catch (e) {
      }
      return circleList.map((c) => {
        const members = membersByCircle[c.id] || [];
        return {
          ...c,
          myRole: roleMap[c.id] || "member",
          owner: ownerMap[c.ownerId] || null,
          memberCount: members.length,
          memberAvatars: members.slice(0, 5).map((m) => ({ name: m.name, avatar: m.avatar })),
          activeGames: activeCountByCircle[c.id] || 0
        };
      });
    }),
    // 通过邀请码预览圈子（小程序使用此名称）
    previewByCode: protectedProcedure.input(z2.object({ code: z2.string().min(4).max(12) })).query(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { circles: circles2, circleMembers: circleMembers2, users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2 } = await import("drizzle-orm");
      const [circle] = await dbInstance.select().from(circles2).where(eq2(circles2.inviteCode, input.code.toUpperCase())).limit(1);
      if (!circle) throw new TRPCError3({ code: "NOT_FOUND", message: "\u9080\u8BF7\u7801\u65E0\u6548" });
      const [owner] = await dbInstance.select({ id: users2.id, name: users2.name, avatar: users2.avatar }).from(users2).where(eq2(users2.id, circle.ownerId)).limit(1);
      const alreadyJoined = (await dbInstance.select().from(circleMembers2).where(eq2(circleMembers2.userId, ctx.user.id)).limit(50)).some((m) => m.circleId === circle.id);
      return { ...circle, owner: owner || null, alreadyJoined };
    }),
    // 通过邀请码查询圈子信息（加入前预览）
    getByCode: protectedProcedure.input(z2.object({ code: z2.string().min(4).max(12) })).query(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { circles: circles2, circleMembers: circleMembers2, users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2 } = await import("drizzle-orm");
      const [circle] = await dbInstance.select().from(circles2).where(eq2(circles2.inviteCode, input.code.toUpperCase())).limit(1);
      if (!circle) throw new TRPCError3({ code: "NOT_FOUND", message: "\u9080\u8BF7\u7801\u65E0\u6548" });
      const [owner] = await dbInstance.select({ id: users2.id, name: users2.name, avatar: users2.avatar }).from(users2).where(eq2(users2.id, circle.ownerId)).limit(1);
      const [membership] = await dbInstance.select().from(circleMembers2).where(eq2(circleMembers2.circleId, circle.id)).limit(50);
      const alreadyJoined = (await dbInstance.select().from(circleMembers2).where(eq2(circleMembers2.userId, ctx.user.id)).limit(50)).some((m) => m.circleId === circle.id);
      return { ...circle, owner: owner || null, alreadyJoined };
    }),
    // 通过邀请码加入圈子
    join: protectedProcedure.input(z2.object({ code: z2.string().min(4).max(12) })).mutation(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { circles: circles2, circleMembers: circleMembers2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2 } = await import("drizzle-orm");
      const [circle] = await dbInstance.select().from(circles2).where(eq2(circles2.inviteCode, input.code.toUpperCase())).limit(1);
      if (!circle) throw new TRPCError3({ code: "NOT_FOUND", message: "\u9080\u8BF7\u7801\u65E0\u6548" });
      const existing = await dbInstance.select().from(circleMembers2).where(eq2(circleMembers2.userId, ctx.user.id));
      if (existing.some((m) => m.circleId === circle.id)) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u60A8\u5DF2\u5728\u8BE5\u5708\u5B50\u4E2D" });
      }
      if (circle.memberCount >= circle.maxMembers) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u5708\u5B50\u5DF2\u6EE1" });
      }
      await dbInstance.insert(circleMembers2).values({
        circleId: circle.id,
        userId: ctx.user.id,
        role: "member"
      });
      await dbInstance.update(circles2).set({ memberCount: circle.memberCount + 1 }).where(eq2(circles2.id, circle.id));
      try {
        if (circle.ownerId && circle.ownerId !== ctx.user.id) {
          const joiner = await getUserById(ctx.user.id);
          await sendNotification(circle.ownerId, "circle_joined", "\u65B0\u6210\u5458\u52A0\u5165", `${joiner?.name || "\u6709\u4EBA"} \u52A0\u5165\u4E86\u4F60\u7684\u5708\u5B50\u300C${circle.name}\u300D`, circle.id);
        }
      } catch (e) {
        console.warn("circle join notify failed", e);
      }
      return { success: true, circleId: circle.id, circleName: circle.name };
    }),
    // 退出圈子
    leave: protectedProcedure.input(z2.object({ circleId: z2.number() })).mutation(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { circles: circles2, circleMembers: circleMembers2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2 } = await import("drizzle-orm");
      const [circle] = await dbInstance.select().from(circles2).where(eq2(circles2.id, input.circleId)).limit(1);
      if (!circle) throw new TRPCError3({ code: "NOT_FOUND", message: "\u5708\u5B50\u4E0D\u5B58\u5728" });
      if (circle.ownerId === ctx.user.id) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u521B\u5EFA\u8005\u4E0D\u80FD\u9000\u51FA\u5708\u5B50\uFF0C\u8BF7\u5148\u8F6C\u8BA9\u6216\u89E3\u6563" });
      }
      await dbInstance.delete(circleMembers2).where(and2(eq2(circleMembers2.circleId, input.circleId), eq2(circleMembers2.userId, ctx.user.id)));
      if (circle.memberCount > 1) {
        await dbInstance.update(circles2).set({ memberCount: circle.memberCount - 1 }).where(eq2(circles2.id, input.circleId));
      }
      return { success: true };
    }),
    // 圈内发布公告
    createPost: protectedProcedure.input(z2.object({
      circleId: z2.number(),
      content: z2.string().min(1).max(500)
    })).mutation(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { circleMembers: circleMembers2, circlePosts: circlePosts2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2 } = await import("drizzle-orm");
      const [member] = await dbInstance.select().from(circleMembers2).where(and2(eq2(circleMembers2.circleId, input.circleId), eq2(circleMembers2.userId, ctx.user.id))).limit(1);
      if (!member) throw new TRPCError3({ code: "FORBIDDEN", message: "\u4EC5\u5708\u5185\u6210\u5458\u53EF\u53D1\u5E03\u516C\u544A" });
      const [result] = await dbInstance.insert(circlePosts2).values({
        circleId: input.circleId,
        authorId: ctx.user.id,
        content: input.content,
        isPinned: member.role === "owner" || member.role === "admin"
      });
      try {
        if (member.role === "owner" || member.role === "admin") {
          const { circles: circles2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
          const [circle] = await dbInstance.select().from(circles2).where(eq2(circles2.id, input.circleId)).limit(1);
          const allMembers = await dbInstance.select().from(circleMembers2).where(eq2(circleMembers2.circleId, input.circleId));
          for (const m of allMembers) {
            if (m.userId === ctx.user.id) continue;
            await sendNotification(m.userId, "circle_announcement", "\u5708\u5B50\u516C\u544A", `\u5708\u5B50\u300C${circle?.name || ""}\u300D\u53D1\u5E03\u4E86\u65B0\u516C\u544A\uFF1A${input.content.slice(0, 30)}`, input.circleId);
          }
        }
      } catch (e) {
        console.warn("announcement notify failed", e);
      }
      return { success: true, postId: result.insertId };
    }),
    // 获取圈内公告列表
    getPosts: protectedProcedure.input(z2.object({ circleId: z2.number() })).query(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { circleMembers: circleMembers2, circlePosts: circlePosts2, circlePostComments: circlePostComments2, users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2, desc: desc2, inArray: inArray2, sql: sql2 } = await import("drizzle-orm");
      const [member] = await dbInstance.select().from(circleMembers2).where(and2(eq2(circleMembers2.circleId, input.circleId), eq2(circleMembers2.userId, ctx.user.id))).limit(1);
      if (!member) throw new TRPCError3({ code: "FORBIDDEN", message: "\u4EC5\u5708\u5185\u6210\u5458\u53EF\u67E5\u770B" });
      const posts = await dbInstance.select({
        id: circlePosts2.id,
        content: circlePosts2.content,
        isPinned: circlePosts2.isPinned,
        createdAt: circlePosts2.createdAt,
        authorId: circlePosts2.authorId,
        authorName: users2.name,
        authorAvatar: users2.avatar
      }).from(circlePosts2).leftJoin(users2, eq2(circlePosts2.authorId, users2.id)).where(eq2(circlePosts2.circleId, input.circleId)).orderBy(desc2(circlePosts2.isPinned), desc2(circlePosts2.createdAt)).limit(50);
      const postIds = posts.map((p) => p.id);
      let cmtMap = /* @__PURE__ */ new Map();
      if (postIds.length) {
        try {
          const counts = await dbInstance.select({
            postId: circlePostComments2.postId,
            count: sql2`count(*)`
          }).from(circlePostComments2).where(inArray2(circlePostComments2.postId, postIds)).groupBy(circlePostComments2.postId);
          cmtMap = new Map(counts.map((c) => [c.postId, Number(c.count)]));
        } catch {
        }
      }
      return posts.map((p) => ({ ...p, commentCount: cmtMap.get(p.id) || 0 }));
    }),
    // 圈内排行榜（按参与球局数量排名）
    leaderboard: protectedProcedure.input(z2.object({ circleId: z2.number() })).query(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { circleMembers: circleMembers2, tennisMatches: tennisMatches2, matchParticipants: matchParticipants2, users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2, sql: sql2 } = await import("drizzle-orm");
      const [member] = await dbInstance.select().from(circleMembers2).where(and2(eq2(circleMembers2.circleId, input.circleId), eq2(circleMembers2.userId, ctx.user.id))).limit(1);
      if (!member) throw new TRPCError3({ code: "FORBIDDEN", message: "\u4EC5\u5708\u5185\u6210\u5458\u53EF\u67E5\u770B" });
      const members = await dbInstance.select({
        userId: circleMembers2.userId,
        role: circleMembers2.role,
        joinedAt: circleMembers2.joinedAt,
        name: users2.name,
        avatar: users2.avatar
      }).from(circleMembers2).leftJoin(users2, eq2(circleMembers2.userId, users2.id)).where(eq2(circleMembers2.circleId, input.circleId));
      let matchCounts = [];
      try {
        matchCounts = await dbInstance.select({
          userId: matchParticipants2.userId,
          count: sql2`count(*)`
        }).from(matchParticipants2).innerJoin(tennisMatches2, eq2(matchParticipants2.matchId, tennisMatches2.id)).where(eq2(tennisMatches2.circleId, input.circleId)).groupBy(matchParticipants2.userId);
      } catch {
      }
      const countMap = new Map(matchCounts.map((r) => [r.userId, Number(r.count)]));
      return members.map((m) => ({
        ...m,
        matchCount: countMap.get(m.userId) || 0
      })).sort((a, b) => b.matchCount - a.matchCount);
    }),
    // 获取圈内球局列表
    getMatches: protectedProcedure.input(z2.object({ circleId: z2.number() })).query(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { circleMembers: circleMembers2, tennisMatches: tennisMatches2, users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2, desc: desc2, ne } = await import("drizzle-orm");
      const [member] = await dbInstance.select().from(circleMembers2).where(and2(eq2(circleMembers2.circleId, input.circleId), eq2(circleMembers2.userId, ctx.user.id))).limit(1);
      if (!member) throw new TRPCError3({ code: "FORBIDDEN", message: "\u4EC5\u5708\u5185\u6210\u5458\u53EF\u67E5\u770B" });
      let matches = [];
      try {
        matches = await dbInstance.select({
          id: tennisMatches2.id,
          title: tennisMatches2.title,
          matchDate: tennisMatches2.matchDate,
          startTime: tennisMatches2.startTime,
          venueName: tennisMatches2.venueName,
          levelRequired: tennisMatches2.levelRequired,
          maxParticipants: tennisMatches2.maxParticipants,
          currentParticipants: tennisMatches2.currentParticipants,
          status: tennisMatches2.status,
          imageUrl: tennisMatches2.imageUrl,
          authorId: tennisMatches2.authorId,
          authorName: users2.name,
          authorAvatar: users2.avatar
        }).from(tennisMatches2).leftJoin(users2, eq2(tennisMatches2.authorId, users2.id)).where(and2(eq2(tennisMatches2.circleId, input.circleId), ne(tennisMatches2.status, "cancelled"))).orderBy(desc2(tennisMatches2.createdAt)).limit(30);
      } catch {
        matches = [];
      }
      return matches;
    }),
    // 点赞动态
    likePost: protectedProcedure.input(z2.object({ postId: z2.number() })).mutation(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { circlePostLikes: circlePostLikes2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2 } = await import("drizzle-orm");
      const existing = await dbInstance.select().from(circlePostLikes2).where(and2(eq2(circlePostLikes2.postId, input.postId), eq2(circlePostLikes2.userId, ctx.user.id))).limit(1);
      if (existing.length > 0) {
        await dbInstance.delete(circlePostLikes2).where(and2(eq2(circlePostLikes2.postId, input.postId), eq2(circlePostLikes2.userId, ctx.user.id)));
        return { liked: false };
      }
      await dbInstance.insert(circlePostLikes2).values({ postId: input.postId, userId: ctx.user.id });
      try {
        const { circlePosts: circlePosts2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
        const { eq: eq3 } = await import("drizzle-orm");
        const [post] = await dbInstance.select().from(circlePosts2).where(eq3(circlePosts2.id, input.postId)).limit(1);
        if (post && post.authorId !== ctx.user.id) {
          await sendNotification(post.authorId, "post_liked", "\u52A8\u6001\u88AB\u70B9\u8D5E", `${ctx.user.name || "\u6709\u4EBA"} \u70B9\u8D5E\u4E86\u4F60\u7684\u52A8\u6001`, input.postId);
        }
      } catch (e) {
        console.warn("like notify failed", e);
      }
      return { liked: true };
    }),
    // 获取动态评论列表
    getComments: protectedProcedure.input(z2.object({ postId: z2.number() })).query(async ({ input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { circlePostComments: circlePostComments2, users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, asc: asc2 } = await import("drizzle-orm");
      const comments = await dbInstance.select({
        id: circlePostComments2.id,
        postId: circlePostComments2.postId,
        parentId: circlePostComments2.parentId,
        content: circlePostComments2.content,
        createdAt: circlePostComments2.createdAt,
        authorId: circlePostComments2.authorId,
        authorName: users2.name,
        authorAvatar: users2.avatar
      }).from(circlePostComments2).leftJoin(users2, eq2(circlePostComments2.authorId, users2.id)).where(eq2(circlePostComments2.postId, input.postId)).orderBy(asc2(circlePostComments2.createdAt)).limit(200);
      return comments;
    }),
    // 发表评论/回复
    createComment: protectedProcedure.input(z2.object({
      postId: z2.number(),
      circleId: z2.number(),
      content: z2.string().min(1).max(500),
      parentId: z2.number().optional()
    })).mutation(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { circleMembers: circleMembers2, circlePosts: circlePosts2, circlePostComments: circlePostComments2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2 } = await import("drizzle-orm");
      const [member] = await dbInstance.select().from(circleMembers2).where(and2(eq2(circleMembers2.circleId, input.circleId), eq2(circleMembers2.userId, ctx.user.id))).limit(1);
      if (!member) throw new TRPCError3({ code: "FORBIDDEN", message: "\u4EC5\u5708\u5185\u6210\u5458\u53EF\u8BC4\u8BBA" });
      const [result] = await dbInstance.insert(circlePostComments2).values({
        postId: input.postId,
        circleId: input.circleId,
        authorId: ctx.user.id,
        content: input.content,
        parentId: input.parentId ?? null
      });
      try {
        if (input.parentId) {
          const [parent] = await dbInstance.select().from(circlePostComments2).where(eq2(circlePostComments2.id, input.parentId)).limit(1);
          if (parent && parent.authorId !== ctx.user.id) {
            await sendNotification(parent.authorId, "comment_replied", "\u8BC4\u8BBA\u88AB\u56DE\u590D", `${ctx.user.name || "\u6709\u4EBA"} \u56DE\u590D\u4E86\u4F60\uFF1A${input.content.slice(0, 30)}`, input.postId);
          }
        } else {
          const [post] = await dbInstance.select().from(circlePosts2).where(eq2(circlePosts2.id, input.postId)).limit(1);
          if (post && post.authorId !== ctx.user.id) {
            await sendNotification(post.authorId, "post_commented", "\u52A8\u6001\u88AB\u8BC4\u8BBA", `${ctx.user.name || "\u6709\u4EBA"} \u8BC4\u8BBA\u4E86\u4F60\u7684\u52A8\u6001\uFF1A${input.content.slice(0, 30)}`, input.postId);
          }
        }
      } catch (e) {
        console.warn("comment notify failed", e);
      }
      return { success: true, commentId: result.insertId };
    }),
    // 打卡
    checkin: protectedProcedure.input(z2.object({
      circleId: z2.number(),
      content: z2.string().max(200).optional(),
      trainingMinutes: z2.number().min(0).max(600).optional()
    })).mutation(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { circleMembers: circleMembers2, circleCheckins: circleCheckins2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2 } = await import("drizzle-orm");
      const [member] = await dbInstance.select().from(circleMembers2).where(and2(eq2(circleMembers2.circleId, input.circleId), eq2(circleMembers2.userId, ctx.user.id))).limit(1);
      if (!member) throw new TRPCError3({ code: "FORBIDDEN", message: "\u4EC5\u5708\u5185\u6210\u5458\u53EF\u6253\u5361" });
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const existing = await dbInstance.select().from(circleCheckins2).where(and2(eq2(circleCheckins2.circleId, input.circleId), eq2(circleCheckins2.userId, ctx.user.id), eq2(circleCheckins2.checkinDate, today))).limit(1);
      if (existing.length > 0) throw new TRPCError3({ code: "BAD_REQUEST", message: "\u4ECA\u65E5\u5DF2\u6253\u5361" });
      await dbInstance.insert(circleCheckins2).values({
        circleId: input.circleId,
        userId: ctx.user.id,
        content: input.content || null,
        trainingMinutes: input.trainingMinutes || 0,
        checkinDate: today
      });
      try {
        const { circlePosts: circlePosts2, users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
        const [userRow] = await dbInstance.select({ name: users2.name }).from(users2).where(eq2(users2.id, ctx.user.id)).limit(1);
        const userName = userRow?.name || "\u7403\u53CB";
        const minutesLabel = input.trainingMinutes ? `\u3000\u23F1 ${input.trainingMinutes}\u5206\u949F` : "";
        const contentLabel = input.content ? `
\u201C${input.content}\u201D` : "";
        const postContent = `\u{1F3BE} ${userName} \u5B8C\u6210\u4E86\u4ECA\u65E5\u6253\u5361\uFF01${minutesLabel}${contentLabel}`;
        await dbInstance.insert(circlePosts2).values({
          circleId: input.circleId,
          authorId: ctx.user.id,
          content: postContent,
          isPinned: false
        });
      } catch (e) {
        console.warn("[checkin] \u81EA\u52A8\u53D1\u5E03\u52A8\u6001\u5931\u8D25", e);
      }
      return { success: true };
    }),
    // 获取圈内打卡列表
    getCheckins: protectedProcedure.input(z2.object({ circleId: z2.number(), limit: z2.number().default(20) })).query(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) return [];
      const { circleCheckins: circleCheckins2, users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, desc: desc2 } = await import("drizzle-orm");
      const rows = await dbInstance.select({
        id: circleCheckins2.id,
        userId: circleCheckins2.userId,
        content: circleCheckins2.content,
        trainingMinutes: circleCheckins2.trainingMinutes,
        checkinDate: circleCheckins2.checkinDate,
        createdAt: circleCheckins2.createdAt,
        userName: users2.name,
        userAvatar: users2.avatar
      }).from(circleCheckins2).leftJoin(users2, eq2(circleCheckins2.userId, users2.id)).where(eq2(circleCheckins2.circleId, input.circleId)).orderBy(desc2(circleCheckins2.createdAt)).limit(input.limit);
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const myCheckinToday = rows.some((r) => r.userId === ctx.user.id && r.checkinDate === today);
      return { items: rows, myCheckinToday };
    }),
    // 创建圈内活动
    createActivity: protectedProcedure.input(z2.object({
      circleId: z2.number(),
      title: z2.string().min(2).max(100),
      description: z2.string().max(500).optional(),
      activityDate: z2.string(),
      startTime: z2.string().optional(),
      endTime: z2.string().optional(),
      venueName: z2.string().max(100).optional(),
      maxParticipants: z2.number().min(2).max(200).default(20),
      repeatWeeks: z2.number().min(0).max(8).default(0),
      // 0=不重复, 1-8=重复周数
      feeMode: z2.enum(["free", "aa"]).default("free")
      // free=纯免费, aa=赛后AA平摊
    })).mutation(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { circleMembers: circleMembers2, circleActivities: circleActivities2, notifications: notifications2, circles: circles2, users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2, ne } = await import("drizzle-orm");
      const [member] = await dbInstance.select().from(circleMembers2).where(and2(eq2(circleMembers2.circleId, input.circleId), eq2(circleMembers2.userId, ctx.user.id))).limit(1);
      if (!member) throw new TRPCError3({ code: "FORBIDDEN", message: "\u4EC5\u5708\u5185\u6210\u5458\u53EF\u53D1\u8D77\u6D3B\u52A8" });
      const [circleRow] = await dbInstance.select({ name: circles2.name }).from(circles2).where(eq2(circles2.id, input.circleId)).limit(1);
      const [creatorRow] = await dbInstance.select({ name: users2.name }).from(users2).where(eq2(users2.id, ctx.user.id)).limit(1);
      const circleName = circleRow?.name ?? "\u5708\u5B50";
      const creatorName = creatorRow?.name ?? "\u7403\u53CB";
      const dates = [input.activityDate];
      if (input.repeatWeeks > 0) {
        const base = /* @__PURE__ */ new Date(input.activityDate + "T00:00:00");
        for (let w = 1; w <= input.repeatWeeks; w++) {
          const next = new Date(base.getTime() + w * 7 * 24 * 60 * 60 * 1e3);
          dates.push(next.toISOString().slice(0, 10));
        }
      }
      const [firstResult] = await dbInstance.insert(circleActivities2).values({
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
        seriesId: null
      });
      const parentId = firstResult.insertId;
      for (let i = 1; i < dates.length; i++) {
        await dbInstance.insert(circleActivities2).values({
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
          seriesId: parentId
        });
      }
      const allMembers = await dbInstance.select({ userId: circleMembers2.userId }).from(circleMembers2).where(and2(eq2(circleMembers2.circleId, input.circleId), ne(circleMembers2.userId, ctx.user.id)));
      const dateLabel = dates.length > 1 ? `${dates[0]} \u8D77\uFF0C\u5171 ${dates.length} \u5468` : dates[0];
      const timeLabel = input.startTime ? input.endTime ? ` ${input.startTime}-${input.endTime}` : ` ${input.startTime}` : "";
      const venueLabel = input.venueName ? `\u3000\u{1F4CD} ${input.venueName}` : "";
      if (allMembers.length > 0) {
        const notifValues = allMembers.map((m) => ({
          userId: m.userId,
          type: "circle_activity",
          title: `\u3010${circleName}\u3011\u65B0\u6D3B\u52A8\uFF1A${input.title}`,
          content: `${creatorName} \u53D1\u8D77\u4E86\u4E00\u4E2A\u6D3B\u52A8\u3002\u{1F4C5} ${dateLabel}${timeLabel}${venueLabel}\uFF0C\u5FEB\u53BB\u62A5\u540D\uFF01`,
          relatedId: parentId
        }));
        await dbInstance.insert(notifications2).values(notifValues);
      }
      return { success: true, activityId: parentId, totalCreated: dates.length };
    }),
    // 获取圈内活动列表
    getActivities: protectedProcedure.input(z2.object({ circleId: z2.number() })).query(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) return [];
      const { circleActivities: circleActivities2, circleActivitySignups: circleActivitySignups2, users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, desc: desc2 } = await import("drizzle-orm");
      const activities = await dbInstance.select({
        id: circleActivities2.id,
        title: circleActivities2.title,
        description: circleActivities2.description,
        activityDate: circleActivities2.activityDate,
        startTime: circleActivities2.startTime,
        endTime: circleActivities2.endTime,
        venueName: circleActivities2.venueName,
        maxParticipants: circleActivities2.maxParticipants,
        currentParticipants: circleActivities2.currentParticipants,
        status: circleActivities2.status,
        feeMode: circleActivities2.feeMode,
        settleStatus: circleActivities2.settleStatus,
        totalCost: circleActivities2.totalCost,
        creatorId: circleActivities2.creatorId,
        createdAt: circleActivities2.createdAt,
        creatorName: users2.name,
        creatorAvatar: users2.avatar
      }).from(circleActivities2).leftJoin(users2, eq2(circleActivities2.creatorId, users2.id)).where(eq2(circleActivities2.circleId, input.circleId)).orderBy(desc2(circleActivities2.activityDate)).limit(20);
      const mySignups = await dbInstance.select({ activityId: circleActivitySignups2.activityId }).from(circleActivitySignups2).where(eq2(circleActivitySignups2.userId, ctx.user.id));
      const mySignupSet = new Set(mySignups.map((s) => s.activityId));
      const activityIds = activities.map((a) => a.id);
      let signupAvatarMap = {};
      if (activityIds.length > 0) {
        const { inArray: inArray2 } = await import("drizzle-orm");
        const allSignups = await dbInstance.select({
          activityId: circleActivitySignups2.activityId,
          avatar: users2.avatar,
          name: users2.name
        }).from(circleActivitySignups2).leftJoin(users2, eq2(circleActivitySignups2.userId, users2.id)).where(inArray2(circleActivitySignups2.activityId, activityIds)).orderBy(circleActivitySignups2.createdAt);
        for (const s of allSignups) {
          if (!signupAvatarMap[s.activityId]) signupAvatarMap[s.activityId] = [];
          if (signupAvatarMap[s.activityId].length < 5) {
            signupAvatarMap[s.activityId].push({ avatar: s.avatar, name: s.name });
          }
        }
      }
      return activities.map((a) => ({
        ...a,
        isSigned: mySignupSet.has(a.id),
        signupAvatars: signupAvatarMap[a.id] || []
      }));
    }),
    // 报名/取消报名活动
    signupActivity: protectedProcedure.input(z2.object({ activityId: z2.number() })).mutation(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { circleActivities: circleActivities2, circleActivitySignups: circleActivitySignups2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2 } = await import("drizzle-orm");
      const [activity] = await dbInstance.select().from(circleActivities2).where(eq2(circleActivities2.id, input.activityId)).limit(1);
      if (!activity) throw new TRPCError3({ code: "NOT_FOUND" });
      const existing = await dbInstance.select().from(circleActivitySignups2).where(and2(eq2(circleActivitySignups2.activityId, input.activityId), eq2(circleActivitySignups2.userId, ctx.user.id))).limit(1);
      if (existing.length > 0) {
        await dbInstance.delete(circleActivitySignups2).where(and2(eq2(circleActivitySignups2.activityId, input.activityId), eq2(circleActivitySignups2.userId, ctx.user.id)));
        await dbInstance.update(circleActivities2).set({ currentParticipants: Math.max(0, (activity.currentParticipants ?? 0) - 1) }).where(eq2(circleActivities2.id, input.activityId));
        return { signed: false };
      }
      const curCount = activity.currentParticipants ?? 0;
      if (curCount >= (activity.maxParticipants || 20)) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u6D3B\u52A8\u4EBA\u6570\u5DF2\u6EE1" });
      }
      await dbInstance.insert(circleActivitySignups2).values({ activityId: input.activityId, userId: ctx.user.id });
      await dbInstance.update(circleActivities2).set({ currentParticipants: curCount + 1 }).where(eq2(circleActivities2.id, input.activityId));
      return { signed: true };
    }),
    // 圈内发布球局并推送短信通知给圈内成员
    notifyMembers: protectedProcedure.input(z2.object({ circleId: z2.number(), matchId: z2.number() })).mutation(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { circles: circles2, circleMembers: circleMembers2, tennisMatches: tennisMatches2, users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2, ne } = await import("drizzle-orm");
      const [member] = await dbInstance.select().from(circleMembers2).where(and2(eq2(circleMembers2.circleId, input.circleId), eq2(circleMembers2.userId, ctx.user.id))).limit(1);
      if (!member) throw new TRPCError3({ code: "FORBIDDEN" });
      const [match] = await dbInstance.select().from(tennisMatches2).where(eq2(tennisMatches2.id, input.matchId)).limit(1);
      if (!match) throw new TRPCError3({ code: "NOT_FOUND" });
      const safeMatch = { ...match, circleOnly: match.circleOnly ?? false, feeRequired: match.feeRequired ?? false };
      const [circle] = await dbInstance.select().from(circles2).where(eq2(circles2.id, input.circleId)).limit(1);
      const members = await dbInstance.select({
        userId: circleMembers2.userId,
        phone: users2.phone,
        name: users2.name,
        wechatOpenid: users2.wechatOpenid
      }).from(circleMembers2).leftJoin(users2, eq2(circleMembers2.userId, users2.id)).where(and2(eq2(circleMembers2.circleId, input.circleId), ne(circleMembers2.userId, ctx.user.id)));
      let notified = 0;
      for (const m of members) {
        if (!m.wechatOpenid) continue;
        try {
          const ok = await wxNotifyCircleMatch({
            openid: m.wechatOpenid,
            circleName: circle?.name || "\u5708\u5B50",
            matchDate: match.matchDate,
            startTime: match.startTime,
            venueName: match.venueName
          });
          if (ok) notified++;
        } catch (e) {
          console.error("[circle.notifyMembers] \u5FAE\u4FE1\u901A\u77E5\u5931\u8D25", m.userId, e);
        }
      }
      return { success: true, notified, total: members.length };
    }),
    // 获取圈内成员列表（圈主/管理员可用）
    getMembers: protectedProcedure.input(z2.object({ circleId: z2.number() })).query(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) return [];
      const { circleMembers: circleMembers2, circles: circles2, users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2 } = await import("drizzle-orm");
      const [me] = await dbInstance.select().from(circleMembers2).where(and2(eq2(circleMembers2.circleId, input.circleId), eq2(circleMembers2.userId, ctx.user.id))).limit(1);
      if (!me) throw new TRPCError3({ code: "FORBIDDEN", message: "\u4EC5\u5708\u5185\u6210\u5458\u53EF\u67E5\u770B" });
      const rows = await dbInstance.select({
        memberId: circleMembers2.id,
        userId: circleMembers2.userId,
        role: circleMembers2.role,
        joinedAt: circleMembers2.joinedAt,
        name: users2.name,
        avatar: users2.avatar,
        phone: users2.phone
      }).from(circleMembers2).leftJoin(users2, eq2(circleMembers2.userId, users2.id)).where(eq2(circleMembers2.circleId, input.circleId));
      return rows.map((r) => ({ ...r, isMe: r.userId === ctx.user.id }));
    }),
    // 踢出成员（圈主或管理员可操作）
    kickMember: protectedProcedure.input(z2.object({ circleId: z2.number(), targetUserId: z2.number() })).mutation(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { circles: circles2, circleMembers: circleMembers2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2 } = await import("drizzle-orm");
      const [me] = await dbInstance.select().from(circleMembers2).where(and2(eq2(circleMembers2.circleId, input.circleId), eq2(circleMembers2.userId, ctx.user.id))).limit(1);
      if (!me || me.role !== "owner" && me.role !== "admin") {
        throw new TRPCError3({ code: "FORBIDDEN", message: "\u4EC5\u5708\u4E3B\u6216\u7BA1\u7406\u5458\u53EF\u8E22\u51FA\u6210\u5458" });
      }
      if (input.targetUserId === ctx.user.id) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u4E0D\u80FD\u8E22\u51FA\u81EA\u5DF1" });
      }
      const [circle] = await dbInstance.select().from(circles2).where(eq2(circles2.id, input.circleId)).limit(1);
      if (circle?.ownerId === input.targetUserId) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u4E0D\u80FD\u8E22\u51FA\u5708\u4E3B" });
      }
      const [target] = await dbInstance.select().from(circleMembers2).where(and2(eq2(circleMembers2.circleId, input.circleId), eq2(circleMembers2.userId, input.targetUserId))).limit(1);
      if (!target) throw new TRPCError3({ code: "NOT_FOUND", message: "\u8BE5\u6210\u5458\u4E0D\u5728\u5708\u5185" });
      if (me.role === "admin" && target.role === "admin") {
        throw new TRPCError3({ code: "FORBIDDEN", message: "\u7BA1\u7406\u5458\u4E0D\u80FD\u8E22\u51FA\u5176\u4ED6\u7BA1\u7406\u5458" });
      }
      await dbInstance.delete(circleMembers2).where(and2(eq2(circleMembers2.circleId, input.circleId), eq2(circleMembers2.userId, input.targetUserId)));
      if (circle && circle.memberCount > 1) {
        await dbInstance.update(circles2).set({ memberCount: circle.memberCount - 1 }).where(eq2(circles2.id, input.circleId));
      }
      return { success: true };
    }),
    // 转让圈主权限（仅圈主可操作）
    transferOwner: protectedProcedure.input(z2.object({ circleId: z2.number(), targetUserId: z2.number() })).mutation(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { circles: circles2, circleMembers: circleMembers2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2 } = await import("drizzle-orm");
      const [circle] = await dbInstance.select().from(circles2).where(eq2(circles2.id, input.circleId)).limit(1);
      if (!circle) throw new TRPCError3({ code: "NOT_FOUND", message: "\u5708\u5B50\u4E0D\u5B58\u5728" });
      if (circle.ownerId !== ctx.user.id) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "\u4EC5\u5708\u4E3B\u53EF\u8F6C\u8BA9\u6743\u9650" });
      }
      const [target] = await dbInstance.select().from(circleMembers2).where(and2(eq2(circleMembers2.circleId, input.circleId), eq2(circleMembers2.userId, input.targetUserId))).limit(1);
      if (!target) throw new TRPCError3({ code: "NOT_FOUND", message: "\u8BE5\u6210\u5458\u4E0D\u5728\u5708\u5185" });
      await dbInstance.update(circles2).set({ ownerId: input.targetUserId }).where(eq2(circles2.id, input.circleId));
      await dbInstance.update(circleMembers2).set({ role: "owner" }).where(and2(eq2(circleMembers2.circleId, input.circleId), eq2(circleMembers2.userId, input.targetUserId)));
      await dbInstance.update(circleMembers2).set({ role: "member" }).where(and2(eq2(circleMembers2.circleId, input.circleId), eq2(circleMembers2.userId, ctx.user.id)));
      return { success: true };
    }),
    // 圈主修改入圈策略 / 简介
    updateSettings: protectedProcedure.input(z2.object({
      circleId: z2.number(),
      joinPolicy: z2.enum(["invite_only", "approval", "open"]).optional(),
      description: z2.string().max(200).optional(),
      avatar: z2.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { circles: circles2, circleMembers: circleMembers2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2 } = await import("drizzle-orm");
      const [me] = await dbInstance.select().from(circleMembers2).where(and2(eq2(circleMembers2.circleId, input.circleId), eq2(circleMembers2.userId, ctx.user.id))).limit(1);
      if (!me || me.role !== "owner" && me.role !== "admin") {
        throw new TRPCError3({ code: "FORBIDDEN", message: "\u4EC5\u5708\u4E3B/\u7BA1\u7406\u5458\u53EF\u4FEE\u6539\u8BBE\u7F6E" });
      }
      const patch = {};
      if (input.joinPolicy) {
        patch.joinPolicy = input.joinPolicy;
        patch.isPrivate = input.joinPolicy === "invite_only";
      }
      if (input.description !== void 0) patch.description = input.description || null;
      if (input.avatar !== void 0) patch.avatar = input.avatar || null;
      if (Object.keys(patch).length > 0) {
        await dbInstance.update(circles2).set(patch).where(eq2(circles2.id, input.circleId));
      }
      return { success: true };
    }),
    // 发现公开圈子（approval / open，可搜索）
    discover: protectedProcedure.input(z2.object({ keyword: z2.string().optional() }).optional()).query(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) return [];
      const { circles: circles2, circleMembers: circleMembers2, circleJoinRequests: circleJoinRequests2, users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { inArray: inArray2, like: like2, and: and2, or: or2, eq: eq2, ne } = await import("drizzle-orm");
      let rows = await dbInstance.select().from(circles2).where(or2(eq2(circles2.joinPolicy, "approval"), eq2(circles2.joinPolicy, "open"))).limit(100);
      const kw = (input && input.keyword || "").trim();
      if (kw) rows = rows.filter((c) => (c.name || "").includes(kw) || (c.description || "").includes(kw));
      const myMems = await dbInstance.select({ circleId: circleMembers2.circleId }).from(circleMembers2).where(eq2(circleMembers2.userId, ctx.user.id));
      const joinedSet = new Set(myMems.map((m) => m.circleId));
      const myReqs = await dbInstance.select({ circleId: circleJoinRequests2.circleId, status: circleJoinRequests2.status }).from(circleJoinRequests2).where(and2(eq2(circleJoinRequests2.userId, ctx.user.id), eq2(circleJoinRequests2.status, "pending")));
      const pendingSet = new Set(myReqs.map((r) => r.circleId));
      const ownerIds = Array.from(new Set(rows.map((c) => c.ownerId)));
      let ownerMap = {};
      if (ownerIds.length) {
        const owners = await dbInstance.select({ id: users2.id, name: users2.name, avatar: users2.avatar }).from(users2).where(inArray2(users2.id, ownerIds));
        ownerMap = Object.fromEntries(owners.map((u) => [u.id, u]));
      }
      return rows.map((c) => ({
        ...c,
        owner: ownerMap[c.ownerId] || null,
        alreadyJoined: joinedSet.has(c.id),
        requestPending: pendingSet.has(c.id)
      })).sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0));
    }),
    // 申请加入圈子（approval 策略）
    applyToJoin: protectedProcedure.input(z2.object({ circleId: z2.number(), message: z2.string().max(200).optional() })).mutation(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { circles: circles2, circleMembers: circleMembers2, circleJoinRequests: circleJoinRequests2, notifications: notifications2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2 } = await import("drizzle-orm");
      const [circle] = await dbInstance.select().from(circles2).where(eq2(circles2.id, input.circleId)).limit(1);
      if (!circle) throw new TRPCError3({ code: "NOT_FOUND", message: "\u5708\u5B50\u4E0D\u5B58\u5728" });
      const mem = await dbInstance.select().from(circleMembers2).where(and2(eq2(circleMembers2.circleId, input.circleId), eq2(circleMembers2.userId, ctx.user.id))).limit(1);
      if (mem.length > 0) throw new TRPCError3({ code: "BAD_REQUEST", message: "\u60A8\u5DF2\u5728\u8BE5\u5708\u5B50\u4E2D" });
      if (circle.joinPolicy === "open") {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u8BE5\u5708\u5B50\u53EF\u76F4\u63A5\u52A0\u5165\uFF0C\u65E0\u9700\u7533\u8BF7" });
      }
      if (circle.joinPolicy === "invite_only") {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u8BE5\u5708\u5B50\u4EC5\u51ED\u9080\u8BF7\u7801\u52A0\u5165" });
      }
      if (circle.memberCount >= circle.maxMembers) throw new TRPCError3({ code: "BAD_REQUEST", message: "\u5708\u5B50\u5DF2\u6EE1" });
      const exist = await dbInstance.select().from(circleJoinRequests2).where(and2(eq2(circleJoinRequests2.circleId, input.circleId), eq2(circleJoinRequests2.userId, ctx.user.id), eq2(circleJoinRequests2.status, "pending"))).limit(1);
      if (exist.length > 0) throw new TRPCError3({ code: "BAD_REQUEST", message: "\u7533\u8BF7\u5DF2\u63D0\u4EA4\uFF0C\u8BF7\u7B49\u5F85\u5BA1\u6838" });
      await dbInstance.insert(circleJoinRequests2).values({
        circleId: input.circleId,
        userId: ctx.user.id,
        message: input.message || null,
        status: "pending"
      });
      try {
        await dbInstance.insert(notifications2).values({
          userId: circle.ownerId,
          type: "circle_activity",
          title: `\u3010${circle.name}\u3011\u6709\u65B0\u7684\u5165\u5708\u7533\u8BF7`,
          content: `${ctx.user.name || "\u4E00\u4F4D\u7403\u53CB"} \u7533\u8BF7\u52A0\u5165\u4F60\u7684\u5708\u5B50\uFF0C\u8BF7\u53BB\u5BA1\u6838\u3002`,
          relatedId: input.circleId
        });
      } catch (e) {
        console.error("[circle.applyToJoin] notify owner failed", e);
      }
      return { success: true };
    }),
    // 我的入圈申请状态
    myJoinRequests: protectedProcedure.query(async ({ ctx }) => {
      const dbInstance = await getDb();
      if (!dbInstance) return [];
      const { circleJoinRequests: circleJoinRequests2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, desc: desc2 } = await import("drizzle-orm");
      return await dbInstance.select().from(circleJoinRequests2).where(eq2(circleJoinRequests2.userId, ctx.user.id)).orderBy(desc2(circleJoinRequests2.createdAt)).limit(50);
    }),
    // 圈主查看待审核申请列表
    listJoinRequests: protectedProcedure.input(z2.object({ circleId: z2.number() })).query(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) return [];
      const { circleMembers: circleMembers2, circleJoinRequests: circleJoinRequests2, users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2, desc: desc2 } = await import("drizzle-orm");
      const [me] = await dbInstance.select().from(circleMembers2).where(and2(eq2(circleMembers2.circleId, input.circleId), eq2(circleMembers2.userId, ctx.user.id))).limit(1);
      if (!me || me.role !== "owner" && me.role !== "admin") {
        throw new TRPCError3({ code: "FORBIDDEN", message: "\u4EC5\u5708\u4E3B/\u7BA1\u7406\u5458\u53EF\u67E5\u770B" });
      }
      return await dbInstance.select({
        id: circleJoinRequests2.id,
        userId: circleJoinRequests2.userId,
        message: circleJoinRequests2.message,
        status: circleJoinRequests2.status,
        createdAt: circleJoinRequests2.createdAt,
        name: users2.name,
        avatar: users2.avatar,
        gender: users2.gender,
        ntrpLevel: users2.ntrpLevel
      }).from(circleJoinRequests2).leftJoin(users2, eq2(circleJoinRequests2.userId, users2.id)).where(and2(eq2(circleJoinRequests2.circleId, input.circleId), eq2(circleJoinRequests2.status, "pending"))).orderBy(desc2(circleJoinRequests2.createdAt)).limit(50);
    }),
    // 圈主审核（通过/拒绝）
    reviewJoinRequest: protectedProcedure.input(z2.object({ requestId: z2.number(), approve: z2.boolean() })).mutation(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { circles: circles2, circleMembers: circleMembers2, circleJoinRequests: circleJoinRequests2, notifications: notifications2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2 } = await import("drizzle-orm");
      const [req] = await dbInstance.select().from(circleJoinRequests2).where(eq2(circleJoinRequests2.id, input.requestId)).limit(1);
      if (!req) throw new TRPCError3({ code: "NOT_FOUND", message: "\u7533\u8BF7\u4E0D\u5B58\u5728" });
      if (req.status !== "pending") throw new TRPCError3({ code: "BAD_REQUEST", message: "\u8BE5\u7533\u8BF7\u5DF2\u5904\u7406" });
      const [me] = await dbInstance.select().from(circleMembers2).where(and2(eq2(circleMembers2.circleId, req.circleId), eq2(circleMembers2.userId, ctx.user.id))).limit(1);
      if (!me || me.role !== "owner" && me.role !== "admin") {
        throw new TRPCError3({ code: "FORBIDDEN", message: "\u4EC5\u5708\u4E3B/\u7BA1\u7406\u5458\u53EF\u5BA1\u6838" });
      }
      const [circle] = await dbInstance.select().from(circles2).where(eq2(circles2.id, req.circleId)).limit(1);
      if (!circle) throw new TRPCError3({ code: "NOT_FOUND" });
      if (input.approve) {
        const mem = await dbInstance.select().from(circleMembers2).where(and2(eq2(circleMembers2.circleId, req.circleId), eq2(circleMembers2.userId, req.userId))).limit(1);
        if (mem.length === 0) {
          if (circle.memberCount >= circle.maxMembers) throw new TRPCError3({ code: "BAD_REQUEST", message: "\u5708\u5B50\u5DF2\u6EE1" });
          await dbInstance.insert(circleMembers2).values({ circleId: req.circleId, userId: req.userId, role: "member" });
          await dbInstance.update(circles2).set({ memberCount: circle.memberCount + 1 }).where(eq2(circles2.id, req.circleId));
        }
        await dbInstance.update(circleJoinRequests2).set({ status: "approved", reviewedBy: ctx.user.id }).where(eq2(circleJoinRequests2.id, input.requestId));
      } else {
        await dbInstance.update(circleJoinRequests2).set({ status: "rejected", reviewedBy: ctx.user.id }).where(eq2(circleJoinRequests2.id, input.requestId));
      }
      try {
        await dbInstance.insert(notifications2).values({
          userId: req.userId,
          type: "circle_activity",
          title: input.approve ? `\u3010${circle.name}\u3011\u5DF2\u901A\u8FC7\u4F60\u7684\u5165\u5708\u7533\u8BF7` : `\u3010${circle.name}\u3011\u672A\u901A\u8FC7\u4F60\u7684\u5165\u5708\u7533\u8BF7`,
          content: input.approve ? `\u6B22\u8FCE\u52A0\u5165\u5708\u5B50\uFF0C\u5FEB\u53BB\u770B\u770B\u5708\u5185\u7403\u5C40\u5427\uFF01` : `\u5F88\u9057\u61BE\uFF0C\u672C\u6B21\u7533\u8BF7\u672A\u901A\u8FC7\u3002`,
          relatedId: req.circleId
        });
      } catch (e) {
        console.error("[circle.reviewJoinRequest] notify failed", e);
      }
      return { success: true, approved: input.approve };
    }),
    // 待审核申请计数（圈主红点用）
    pendingRequestCount: protectedProcedure.input(z2.object({ circleId: z2.number() })).query(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) return { count: 0 };
      const { circleMembers: circleMembers2, circleJoinRequests: circleJoinRequests2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2 } = await import("drizzle-orm");
      const [me] = await dbInstance.select().from(circleMembers2).where(and2(eq2(circleMembers2.circleId, input.circleId), eq2(circleMembers2.userId, ctx.user.id))).limit(1);
      if (!me || me.role !== "owner" && me.role !== "admin") return { count: 0 };
      const rows = await dbInstance.select().from(circleJoinRequests2).where(and2(eq2(circleJoinRequests2.circleId, input.circleId), eq2(circleJoinRequests2.status, "pending")));
      return { count: rows.length };
    }),
    // ═══════════════════════════════════════════════════════════════
    // 圈子完善：活动模板 / 解散圈子 / 赛后AA平摊结算（路线一，新增）
    // ═══════════════════════════════════════════════════════════════
    // ── 活动模板：列表 ──
    getTemplates: protectedProcedure.input(z2.object({ circleId: z2.number() })).query(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) return [];
      const { activityTemplates: activityTemplates2, circleMembers: circleMembers2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2, desc: desc2 } = await import("drizzle-orm");
      const [me] = await dbInstance.select().from(circleMembers2).where(and2(eq2(circleMembers2.circleId, input.circleId), eq2(circleMembers2.userId, ctx.user.id))).limit(1);
      if (!me) return [];
      return await dbInstance.select().from(activityTemplates2).where(eq2(activityTemplates2.circleId, input.circleId)).orderBy(desc2(activityTemplates2.createdAt));
    }),
    // ── 活动模板：创建（仅圈主/管理员）──
    createTemplate: protectedProcedure.input(z2.object({
      circleId: z2.number(),
      title: z2.string().min(2).max(100),
      startTime: z2.string().optional(),
      endTime: z2.string().optional(),
      venueName: z2.string().max(100).optional(),
      maxParticipants: z2.number().min(2).max(200).default(20),
      feeMode: z2.enum(["free", "aa"]).default("free"),
      description: z2.string().max(500).optional()
    })).mutation(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { circleMembers: circleMembers2, activityTemplates: activityTemplates2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2 } = await import("drizzle-orm");
      const [me] = await dbInstance.select().from(circleMembers2).where(and2(eq2(circleMembers2.circleId, input.circleId), eq2(circleMembers2.userId, ctx.user.id))).limit(1);
      if (!me || me.role !== "owner" && me.role !== "admin") {
        throw new TRPCError3({ code: "FORBIDDEN", message: "\u4EC5\u5708\u4E3B\u6216\u7BA1\u7406\u5458\u53EF\u521B\u5EFA\u6A21\u677F" });
      }
      const [result] = await dbInstance.insert(activityTemplates2).values({
        circleId: input.circleId,
        title: input.title,
        startTime: input.startTime || null,
        endTime: input.endTime || null,
        venueName: input.venueName || null,
        maxParticipants: input.maxParticipants,
        feeMode: input.feeMode,
        description: input.description || null
      });
      return { success: true, templateId: result.insertId };
    }),
    // ── 活动模板：删除（仅圈主/管理员）──
    deleteTemplate: protectedProcedure.input(z2.object({ templateId: z2.number() })).mutation(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { activityTemplates: activityTemplates2, circleMembers: circleMembers2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2 } = await import("drizzle-orm");
      const [tpl] = await dbInstance.select().from(activityTemplates2).where(eq2(activityTemplates2.id, input.templateId)).limit(1);
      if (!tpl) throw new TRPCError3({ code: "NOT_FOUND" });
      const [me] = await dbInstance.select().from(circleMembers2).where(and2(eq2(circleMembers2.circleId, tpl.circleId), eq2(circleMembers2.userId, ctx.user.id))).limit(1);
      if (!me || me.role !== "owner" && me.role !== "admin") {
        throw new TRPCError3({ code: "FORBIDDEN", message: "\u4EC5\u5708\u4E3B\u6216\u7BA1\u7406\u5458\u53EF\u5220\u9664\u6A21\u677F" });
      }
      await dbInstance.delete(activityTemplates2).where(eq2(activityTemplates2.id, input.templateId));
      return { success: true };
    }),
    // ── 解散圈子（仅圈主，物理删除全部关联数据）──
    dismissCircle: protectedProcedure.input(z2.object({ circleId: z2.number(), confirmName: z2.string() })).mutation(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const {
        circles: circles2,
        circleMembers: circleMembers2,
        circlePosts: circlePosts2,
        circlePostLikes: circlePostLikes2,
        circlePostComments: circlePostComments2,
        circleActivities: circleActivities2,
        circleActivitySignups: circleActivitySignups2,
        activityTemplates: activityTemplates2,
        circleCheckins: circleCheckins2,
        circleJoinRequests: circleJoinRequests2
      } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, inArray: inArray2 } = await import("drizzle-orm");
      const [circle] = await dbInstance.select().from(circles2).where(eq2(circles2.id, input.circleId)).limit(1);
      if (!circle) throw new TRPCError3({ code: "NOT_FOUND", message: "\u5708\u5B50\u4E0D\u5B58\u5728" });
      if (circle.ownerId !== ctx.user.id) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "\u4EC5\u5708\u4E3B\u53EF\u89E3\u6563\u5708\u5B50" });
      }
      if (circle.name !== input.confirmName) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u5708\u5B50\u540D\u79F0\u4E0D\u5339\u914D\uFF0C\u89E3\u6563\u5931\u8D25" });
      }
      const activities = await dbInstance.select({ id: circleActivities2.id }).from(circleActivities2).where(eq2(circleActivities2.circleId, input.circleId));
      if (activities.length > 0) {
        await dbInstance.delete(circleActivitySignups2).where(inArray2(circleActivitySignups2.activityId, activities.map((a) => a.id)));
      }
      await dbInstance.delete(circleActivities2).where(eq2(circleActivities2.circleId, input.circleId));
      await dbInstance.delete(activityTemplates2).where(eq2(activityTemplates2.circleId, input.circleId));
      const posts = await dbInstance.select({ id: circlePosts2.id }).from(circlePosts2).where(eq2(circlePosts2.circleId, input.circleId));
      if (posts.length > 0) {
        const postIds = posts.map((p) => p.id);
        await dbInstance.delete(circlePostLikes2).where(inArray2(circlePostLikes2.postId, postIds));
        await dbInstance.delete(circlePostComments2).where(inArray2(circlePostComments2.postId, postIds));
      }
      await dbInstance.delete(circlePosts2).where(eq2(circlePosts2.circleId, input.circleId));
      await dbInstance.delete(circleCheckins2).where(eq2(circleCheckins2.circleId, input.circleId));
      await dbInstance.delete(circleJoinRequests2).where(eq2(circleJoinRequests2.circleId, input.circleId));
      await dbInstance.delete(circleMembers2).where(eq2(circleMembers2.circleId, input.circleId));
      await dbInstance.delete(circles2).where(eq2(circles2.id, input.circleId));
      return { success: true };
    }),
    // ── 赛后结算：发起人填实际总开销+到场名单，系统按到场人数平摊生成账单（方案A：默认全员到场）──
    settleActivity: protectedProcedure.input(z2.object({
      activityId: z2.number(),
      totalCost: z2.number().min(0),
      // 实际总开销（元）
      absentUserIds: z2.array(z2.number()).default([])
      // 未到场成员（从默认全员到场中剔除）
    })).mutation(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { circleActivities: circleActivities2, circleActivitySignups: circleActivitySignups2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2 } = await import("drizzle-orm");
      const [activity] = await dbInstance.select().from(circleActivities2).where(eq2(circleActivities2.id, input.activityId)).limit(1);
      if (!activity) throw new TRPCError3({ code: "NOT_FOUND", message: "\u6D3B\u52A8\u4E0D\u5B58\u5728" });
      if (activity.creatorId !== ctx.user.id) throw new TRPCError3({ code: "FORBIDDEN", message: "\u4EC5\u53D1\u8D77\u4EBA\u53EF\u7ED3\u7B97" });
      if (activity.feeMode !== "aa") throw new TRPCError3({ code: "BAD_REQUEST", message: "\u8BE5\u6D3B\u52A8\u4E3A\u514D\u8D39\u6D3B\u52A8\uFF0C\u65E0\u9700\u7ED3\u7B97" });
      if (activity.settleStatus === "settled") throw new TRPCError3({ code: "BAD_REQUEST", message: "\u8BE5\u6D3B\u52A8\u5DF2\u7ED3\u7B97\u5B8C\u6210" });
      const signups = await dbInstance.select().from(circleActivitySignups2).where(eq2(circleActivitySignups2.activityId, input.activityId));
      if (signups.length === 0) throw new TRPCError3({ code: "BAD_REQUEST", message: "\u65E0\u4EBA\u62A5\u540D\uFF0C\u65E0\u9700\u7ED3\u7B97" });
      const absentSet = new Set(input.absentUserIds);
      const attendees = signups.filter((s) => !absentSet.has(s.userId));
      if (attendees.length === 0) throw new TRPCError3({ code: "BAD_REQUEST", message: "\u5230\u573A\u4EBA\u6570\u4E3A 0\uFF0C\u65E0\u6CD5\u7ED3\u7B97" });
      const totalFen = Math.round(input.totalCost * 100);
      const baseShare = Math.floor(totalFen / attendees.length);
      let remainder = totalFen - baseShare * attendees.length;
      for (const s of signups) {
        const isAbsent = absentSet.has(s.userId);
        if (isAbsent) {
          await dbInstance.update(circleActivitySignups2).set({
            attended: false,
            shareAmount: 0,
            payStatus: "none"
          }).where(and2(eq2(circleActivitySignups2.activityId, input.activityId), eq2(circleActivitySignups2.userId, s.userId)));
        } else {
          const isCreator = s.userId === ctx.user.id;
          let share = baseShare;
          if (remainder > 0) {
            share += 1;
            remainder -= 1;
          }
          await dbInstance.update(circleActivitySignups2).set({
            attended: true,
            shareAmount: share,
            payStatus: isCreator ? "paid" : "unpaid",
            paidAt: isCreator ? /* @__PURE__ */ new Date() : null
          }).where(and2(eq2(circleActivitySignups2.activityId, input.activityId), eq2(circleActivitySignups2.userId, s.userId)));
          if (!isCreator) {
            await sendNotification(
              s.userId,
              "system",
              "\u6D3B\u52A8\u8D39\u7528\u5F85\u652F\u4ED8",
              `\u300C${activity.title}\u300D\u5DF2\u7ED3\u7B97\uFF0C\u60A8\u5E94\u5206\u644A \xA5${(share / 100).toFixed(2)}\uFF0C\u8BF7\u5728\u5C0F\u7A0B\u5E8F\u5185\u652F\u4ED8\u7ED9\u53D1\u8D77\u4EBA\u3002`,
              input.activityId
            );
          }
        }
      }
      await dbInstance.update(circleActivities2).set({
        totalCost: totalFen,
        settleStatus: "settling",
        status: "completed"
      }).where(eq2(circleActivities2.id, input.activityId));
      const attendeeCount = attendees.length;
      return { success: true, attendeeCount, perPerson: Math.round(totalFen / attendeeCount) / 100, totalCost: input.totalCost };
    }),
    // ── 查看某活动的结算/账单（已付未付清单）──
    getActivitySettlement: protectedProcedure.input(z2.object({ activityId: z2.number() })).query(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) return null;
      const { circleActivities: circleActivities2, circleActivitySignups: circleActivitySignups2, users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2 } = await import("drizzle-orm");
      const [activity] = await dbInstance.select().from(circleActivities2).where(eq2(circleActivities2.id, input.activityId)).limit(1);
      if (!activity) return null;
      const rows = await dbInstance.select({
        userId: circleActivitySignups2.userId,
        attended: circleActivitySignups2.attended,
        shareAmount: circleActivitySignups2.shareAmount,
        payStatus: circleActivitySignups2.payStatus,
        name: users2.name,
        avatar: users2.avatar
      }).from(circleActivitySignups2).leftJoin(users2, eq2(circleActivitySignups2.userId, users2.id)).where(eq2(circleActivitySignups2.activityId, input.activityId));
      const paidCount = rows.filter((r) => r.payStatus === "paid").length;
      const unpaidCount = rows.filter((r) => r.payStatus === "unpaid").length;
      return {
        activityId: activity.id,
        title: activity.title,
        feeMode: activity.feeMode,
        totalCost: activity.totalCost,
        settleStatus: activity.settleStatus,
        creatorId: activity.creatorId,
        isCreator: activity.creatorId === ctx.user.id,
        paidCount,
        unpaidCount,
        bills: rows.map((r) => ({ ...r, isMe: r.userId === ctx.user.id }))
      };
    }),
    // ── 成员支付自己那份AA费用（微信支付下单，收款后由发起人结清打款）──
    payActivityShare: protectedProcedure.input(z2.object({ activityId: z2.number() })).mutation(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { circleActivities: circleActivities2, circleActivitySignups: circleActivitySignups2, matchOrders: matchOrders2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2 } = await import("drizzle-orm");
      const [activity] = await dbInstance.select().from(circleActivities2).where(eq2(circleActivities2.id, input.activityId)).limit(1);
      if (!activity) throw new TRPCError3({ code: "NOT_FOUND", message: "\u6D3B\u52A8\u4E0D\u5B58\u5728" });
      const [signup] = await dbInstance.select().from(circleActivitySignups2).where(and2(eq2(circleActivitySignups2.activityId, input.activityId), eq2(circleActivitySignups2.userId, ctx.user.id))).limit(1);
      if (!signup) throw new TRPCError3({ code: "BAD_REQUEST", message: "\u60A8\u672A\u62A5\u540D\u8BE5\u6D3B\u52A8" });
      if (signup.payStatus === "paid") throw new TRPCError3({ code: "BAD_REQUEST", message: "\u60A8\u5DF2\u652F\u4ED8\uFF0C\u8BF7\u52FF\u91CD\u590D\u652F\u4ED8" });
      if (signup.payStatus !== "unpaid" || signup.shareAmount <= 0) throw new TRPCError3({ code: "BAD_REQUEST", message: "\u6682\u65E0\u5F85\u652F\u4ED8\u8D39\u7528" });
      const userRecord = await getUserById(ctx.user.id);
      const openid = userRecord?.wechatOpenid;
      if (!openid && isWxpayConfigured()) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u672A\u7ED1\u5B9A\u5FAE\u4FE1\u8D26\u53F7\uFF0C\u65E0\u6CD5\u53D1\u8D77\u652F\u4ED8" });
      }
      const orderId = generateOrderId();
      const amountFen = signup.shareAmount;
      await dbInstance.insert(matchOrders2).values({
        orderId,
        matchId: -input.activityId,
        userId: ctx.user.id,
        amount: String((amountFen / 100).toFixed(2)),
        status: "pending"
      });
      await dbInstance.update(circleActivitySignups2).set({ orderId }).where(and2(eq2(circleActivitySignups2.activityId, input.activityId), eq2(circleActivitySignups2.userId, ctx.user.id)));
      let prepay;
      try {
        prepay = await createPrepay({
          orderId,
          description: `\u5708\u5B50\u6D3B\u52A8AA-${activity.title}`,
          amountFen,
          openid: openid || "mock_openid"
        });
      } catch (prepayErr) {
        throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: `\u5FAE\u4FE1\u652F\u4ED8\u9884\u4E0B\u5355\u5931\u8D25: ${prepayErr.message}` });
      }
      if (prepay.prepayId) {
        await dbInstance.update(matchOrders2).set({ wxPrepayId: prepay.prepayId }).where(eq2(matchOrders2.orderId, orderId));
      }
      return { orderId, ...prepay, isMockMode: !isWxpayConfigured() };
    }),
    // ── 成员AA支付成功确认（Mock模式前端调用；生产由微信回调统一处理）──
    confirmActivityPayment: protectedProcedure.input(z2.object({ orderId: z2.string(), activityId: z2.number() })).mutation(async ({ ctx, input }) => {
      if (isWxpayConfigured()) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "\u751F\u4EA7\u73AF\u5883\u652F\u4ED8\u7531\u5FAE\u4FE1\u56DE\u8C03\u5904\u7406" });
      }
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { circleActivities: circleActivities2, circleActivitySignups: circleActivitySignups2, matchOrders: matchOrders2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2 } = await import("drizzle-orm");
      await dbInstance.update(matchOrders2).set({ status: "paid", paidAt: /* @__PURE__ */ new Date() }).where(eq2(matchOrders2.orderId, input.orderId));
      await dbInstance.update(circleActivitySignups2).set({ payStatus: "paid", paidAt: /* @__PURE__ */ new Date() }).where(and2(eq2(circleActivitySignups2.activityId, input.activityId), eq2(circleActivitySignups2.userId, ctx.user.id)));
      const remaining = await dbInstance.select().from(circleActivitySignups2).where(and2(eq2(circleActivitySignups2.activityId, input.activityId), eq2(circleActivitySignups2.payStatus, "unpaid")));
      if (remaining.length === 0) {
        await dbInstance.update(circleActivities2).set({ settleStatus: "settled", settledAt: /* @__PURE__ */ new Date() }).where(eq2(circleActivities2.id, input.activityId));
      }
      return { success: true, allPaid: remaining.length === 0 };
    })
  }),
  coachPortal: router({
    // 教练工作台统计数据
    stats: coachProcedure.query(async ({ ctx }) => {
      const profile = await getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError3({ code: "NOT_FOUND", message: "\u6559\u7EC3\u6863\u6848\u4E0D\u5B58\u5728" });
      const stats = await getCoachStats(profile.id);
      const earnings = await getCoachEarnings(profile.id);
      const dbInstance = await getDb();
      const { bookings: bookings2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2, gte: gte2, lte: lte2 } = await import("drizzle-orm");
      const today = /* @__PURE__ */ new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(todayStart.getTime() + 864e5);
      const todayBookings = dbInstance ? await dbInstance.select().from(bookings2).where(
        and2(eq2(bookings2.coachId, profile.id), gte2(bookings2.lessonDate, todayStart.toISOString().split("T")[0]), lte2(bookings2.lessonDate, todayEnd.toISOString().split("T")[0]))
      ) : [];
      return {
        todayBookings: todayBookings.length,
        monthIncome: earnings.total || 0,
        totalStudents: stats.totalStudents || 0,
        pendingBookings: 0,
        totalLessons: stats.totalLessons || 0
      };
    }),
    // 今日排课
    todaySchedule: coachProcedure.query(async ({ ctx }) => {
      const profile = await getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError3({ code: "NOT_FOUND", message: "\u6559\u7EC3\u6863\u6848\u4E0D\u5B58\u5728" });
      const dbInstance = await getDb();
      if (!dbInstance) return { items: [] };
      const { bookings: bookings2, users: users2, venues: venues2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2 } = await import("drizzle-orm");
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const todayBookings = await dbInstance.select().from(bookings2).where(and2(eq2(bookings2.coachId, profile.id), eq2(bookings2.lessonDate, today))).orderBy(bookings2.startTime);
      const enriched = await Promise.all(todayBookings.map(async (b) => {
        const student = await getUserById(b.studentId);
        const venue = b.venueId ? await getVenueById(b.venueId) : null;
        return { ...b, student, venue };
      }));
      return { items: enriched };
    }),
    // 按日期查预约
    bookingsByDate: coachProcedure.input(z2.object({ date: z2.string() })).query(async ({ ctx, input }) => {
      const profile = await getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError3({ code: "NOT_FOUND", message: "\u6559\u7EC3\u6863\u6848\u4E0D\u5B58\u5728" });
      const dbInstance = await getDb();
      if (!dbInstance) return { items: [] };
      const { bookings: bookings2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2 } = await import("drizzle-orm");
      const dayBookings = await dbInstance.select().from(bookings2).where(and2(eq2(bookings2.coachId, profile.id), eq2(bookings2.lessonDate, input.date))).orderBy(bookings2.startTime);
      const enriched = await Promise.all(dayBookings.map(async (b) => {
        const student = await getUserById(b.studentId);
        const venue = b.venueId ? await getVenueById(b.venueId) : null;
        return { ...b, student, venue };
      }));
      return { items: enriched };
    }),
    // 确认预约
    confirmBooking: coachProcedure.input(z2.object({ bookingId: z2.number() })).mutation(async ({ ctx, input }) => {
      const profile = await getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError3({ code: "NOT_FOUND", message: "\u6559\u7EC3\u6863\u6848\u4E0D\u5B58\u5728" });
      const booking = await getBookingById(input.bookingId);
      if (!booking || booking.coachId !== profile.id) throw new TRPCError3({ code: "FORBIDDEN" });
      await updateBookingStatus(input.bookingId, "confirmed");
      return { success: true };
    }),
    // 添加可用时段（小程序传 date 字段，自动计算 dayOfWeek）
    addAvailableSlot: coachProcedure.input(z2.object({
      date: z2.string().optional(),
      // YYYY-MM-DD（小程序传此字段）
      startTime: z2.string(),
      endTime: z2.string(),
      venueId: z2.number().optional(),
      specificDate: z2.string().optional(),
      // 兼容旧调用
      dayOfWeek: z2.number().min(0).max(6).optional()
      // 兼容旧调用
    })).mutation(async ({ ctx, input }) => {
      const profile = await getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError3({ code: "NOT_FOUND", message: "\u6559\u7EC3\u6863\u6848\u4E0D\u5B58\u5728" });
      const specificDate = input.date || input.specificDate;
      const dayOfWeek = input.dayOfWeek ?? (specificDate ? (/* @__PURE__ */ new Date(specificDate + "T00:00:00")).getDay() : 0);
      await addCoachWeeklySlot(profile.id, dayOfWeek, input.startTime, input.endTime, specificDate);
      return { success: true };
    }),
    // 查询某日已添加的可用时段
    getSlotsByDate: coachProcedure.input(z2.object({ date: z2.string() })).query(async ({ ctx, input }) => {
      const profile = await getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError3({ code: "NOT_FOUND", message: "\u6559\u7EC3\u6863\u6848\u4E0D\u5B58\u5728" });
      const dbInstance = await getDb();
      if (!dbInstance) return { items: [] };
      const { coachAvailability: coachAvailability2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2, or: or2 } = await import("drizzle-orm");
      const dow = (/* @__PURE__ */ new Date(input.date + "T00:00:00")).getDay();
      const slots = await dbInstance.select().from(coachAvailability2).where(and2(
        eq2(coachAvailability2.coachId, profile.id),
        eq2(coachAvailability2.isAvailable, true),
        or2(
          eq2(coachAvailability2.specificDate, input.date),
          and2(eq2(coachAvailability2.dayOfWeek, dow))
        )
      )).orderBy(coachAvailability2.startTime);
      return { items: slots };
    }),
    // 删除可用时段
    removeSlot: coachProcedure.input(z2.object({ slotId: z2.number() })).mutation(async ({ ctx, input }) => {
      const profile = await getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError3({ code: "NOT_FOUND", message: "\u6559\u7EC3\u6863\u6848\u4E0D\u5B58\u5728" });
      await removeCoachWeeklySlot(profile.id, input.slotId);
      return { success: true };
    }),
    // 月收入统计
    incomeByMonth: coachProcedure.input(z2.object({ month: z2.string() })).query(async ({ ctx, input }) => {
      const profile = await getCoachProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError3({ code: "NOT_FOUND", message: "\u6559\u7EC3\u6863\u6848\u4E0D\u5B58\u5728" });
      const dbInstance = await getDb();
      if (!dbInstance) return { total: 0, lessons: 0, items: [] };
      const { bookings: bookings2, payments: payments2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2, like: like2 } = await import("drizzle-orm");
      const monthBookings = await dbInstance.select().from(bookings2).where(and2(eq2(bookings2.coachId, profile.id), eq2(bookings2.status, "completed"), like2(bookings2.lessonDate, `${input.month}%`)));
      const enriched = await Promise.all(monthBookings.map(async (b) => {
        const student = await getUserById(b.studentId);
        const payment = await getPaymentByBookingId(b.id);
        return { ...b, student, amount: payment?.coachEarnings || b.finalAmount };
      }));
      const total = enriched.reduce((s, b) => s + parseFloat(b.amount || "0"), 0);
      return { total, lessons: enriched.length, items: enriched };
    })
  }),
  // ─── Partner Venue Router（合作场馆 + 空场时段）────────────────────────────
  partnerVenue: router({
    // 获取所有上线合作场馆列表
    list: publicProcedure.query(async () => {
      const { partnerVenues: partnerVenues2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, desc: desc2 } = await import("drizzle-orm");
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      return dbInstance.select().from(partnerVenues2).where(eq2(partnerVenues2.isActive, true)).orderBy(desc2(partnerVenues2.sortOrder));
    }),
    // 获取单个场馆详情
    detail: publicProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      const { partnerVenues: partnerVenues2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2 } = await import("drizzle-orm");
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await dbInstance.select().from(partnerVenues2).where(eq2(partnerVenues2.id, input.id));
      if (!rows.length) throw new TRPCError3({ code: "NOT_FOUND", message: "\u573A\u9986\u4E0D\u5B58\u5728" });
      return rows[0];
    }),
    // 获取场馆空场时段（按日期）
    slots: publicProcedure.input(z2.object({ venueId: z2.number(), date: z2.string().optional() })).query(async ({ input }) => {
      const { venueAvailableSlots: venueAvailableSlots2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2 } = await import("drizzle-orm");
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const targetDate = input.date || today;
      return dbInstance.select().from(venueAvailableSlots2).where(and2(
        eq2(venueAvailableSlots2.venueId, input.venueId),
        eq2(venueAvailableSlots2.slotDate, targetDate),
        eq2(venueAvailableSlots2.isBooked, false)
      )).orderBy(venueAvailableSlots2.startTime);
    }),
    // 获取首页展示：各场馆今日/明日空场数量摘要
    todaySummary: publicProcedure.query(async () => {
      const { partnerVenues: partnerVenues2, venueAvailableSlots: venueAvailableSlots2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, and: and2, sql: sql2 } = await import("drizzle-orm");
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const tomorrow = new Date(Date.now() + 864e5).toISOString().split("T")[0];
      const venues2 = await dbInstance.select().from(partnerVenues2).where(eq2(partnerVenues2.isActive, true)).orderBy(sql2`${partnerVenues2.sortOrder} desc`);
      const result = await Promise.all(venues2.map(async (v) => {
        const todaySlots = await dbInstance.select().from(venueAvailableSlots2).where(and2(eq2(venueAvailableSlots2.venueId, v.id), eq2(venueAvailableSlots2.slotDate, today), eq2(venueAvailableSlots2.isBooked, false)));
        const tomorrowSlots = await dbInstance.select().from(venueAvailableSlots2).where(and2(eq2(venueAvailableSlots2.venueId, v.id), eq2(venueAvailableSlots2.slotDate, tomorrow), eq2(venueAvailableSlots2.isBooked, false)));
        return { ...v, todayCount: todaySlots.length, tomorrowCount: tomorrowSlots.length, todaySlots: todaySlots.slice(0, 3) };
      }));
      return result;
    }),
    // 管理员：新增场馆
    adminCreate: protectedProcedure.input(z2.object({
      name: z2.string().min(1),
      address: z2.string().optional(),
      district: z2.string().optional(),
      phone: z2.string().optional(),
      imageUrl: z2.string().optional(),
      bookingUrl: z2.string().optional(),
      description: z2.string().optional(),
      courtCount: z2.number().default(0),
      priceRange: z2.string().optional(),
      amenities: z2.array(z2.string()).default([]),
      sortOrder: z2.number().default(0)
    })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError3({ code: "FORBIDDEN" });
      const { partnerVenues: partnerVenues2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      await dbInstance.insert(partnerVenues2).values({ ...input, isActive: true });
      return { success: true };
    }),
    // 管理员：更新场馆
    adminUpdate: protectedProcedure.input(z2.object({
      id: z2.number(),
      name: z2.string().optional(),
      address: z2.string().optional(),
      district: z2.string().optional(),
      phone: z2.string().optional(),
      imageUrl: z2.string().optional(),
      bookingUrl: z2.string().optional(),
      description: z2.string().optional(),
      courtCount: z2.number().optional(),
      priceRange: z2.string().optional(),
      amenities: z2.array(z2.string()).optional(),
      isActive: z2.boolean().optional(),
      sortOrder: z2.number().optional()
    })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError3({ code: "FORBIDDEN" });
      const { partnerVenues: partnerVenues2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2 } = await import("drizzle-orm");
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await dbInstance.update(partnerVenues2).set(data).where(eq2(partnerVenues2.id, id));
      return { success: true };
    }),
    // 管理员/场馆方：添加空场时段
    addSlot: protectedProcedure.input(z2.object({
      venueId: z2.number(),
      slotDate: z2.string(),
      startTime: z2.string(),
      endTime: z2.string(),
      courtName: z2.string().optional(),
      courtType: z2.enum(["hard", "clay", "grass", "indoor"]).optional(),
      price: z2.number().optional(),
      remark: z2.string().optional()
    })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError3({ code: "FORBIDDEN" });
      const { venueAvailableSlots: venueAvailableSlots2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      await dbInstance.insert(venueAvailableSlots2).values({
        ...input,
        price: input.price ? String(input.price) : void 0,
        isBooked: false
      });
      return { success: true };
    }),
    // 管理员：批量添加空场时段
    addSlotsBatch: protectedProcedure.input(z2.object({
      venueId: z2.number(),
      slotDate: z2.string(),
      slots: z2.array(z2.object({
        startTime: z2.string(),
        endTime: z2.string(),
        courtName: z2.string().optional(),
        courtType: z2.enum(["hard", "clay", "grass", "indoor"]).optional(),
        price: z2.number().optional()
      }))
    })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError3({ code: "FORBIDDEN" });
      const { venueAvailableSlots: venueAvailableSlots2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      const rows = input.slots.map((s) => ({
        venueId: input.venueId,
        slotDate: input.slotDate,
        startTime: s.startTime,
        endTime: s.endTime,
        courtName: s.courtName,
        courtType: s.courtType || "hard",
        price: s.price ? String(s.price) : void 0,
        isBooked: false
      }));
      if (rows.length > 0) await dbInstance.insert(venueAvailableSlots2).values(rows);
      return { success: true, count: rows.length };
    }),
    // 管理员：删除空场时段
    deleteSlot: protectedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError3({ code: "FORBIDDEN" });
      const { venueAvailableSlots: venueAvailableSlots2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2 } = await import("drizzle-orm");
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
      await dbInstance.delete(venueAvailableSlots2).where(eq2(venueAvailableSlots2.id, input.id));
      return { success: true };
    })
  })
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express from "express";
import fs4 from "fs";
import { nanoid as nanoid2 } from "nanoid";
import path4 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs3 from "node:fs";
import path3 from "node:path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
var PROJECT_ROOT = import.meta.dirname;
var LOG_DIR = path3.join(PROJECT_ROOT, ".manus-logs");
var MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024;
var TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6);
function ensureLogDir() {
  if (!fs3.existsSync(LOG_DIR)) {
    fs3.mkdirSync(LOG_DIR, { recursive: true });
  }
}
function trimLogFile(logPath, maxSize) {
  try {
    if (!fs3.existsSync(logPath) || fs3.statSync(logPath).size <= maxSize) {
      return;
    }
    const lines = fs3.readFileSync(logPath, "utf-8").split("\n");
    const keptLines = [];
    let keptBytes = 0;
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}
`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }
    fs3.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
  }
}
function writeToLogFile(source, entries) {
  if (entries.length === 0) return;
  ensureLogDir();
  const logPath = path3.join(LOG_DIR, `${source}.log`);
  const lines = entries.map((entry) => {
    const ts = (/* @__PURE__ */ new Date()).toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });
  fs3.appendFileSync(logPath, `${lines.join("\n")}
`, "utf-8");
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}
function vitePluginManusDebugCollector() {
  return {
    name: "manus-debug-collector",
    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true
            },
            injectTo: "head"
          }
        ]
      };
    },
    configureServer(server) {
      server.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }
        const handlePayload = (payload) => {
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };
        const reqBody = req.body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    }
  };
}
var plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime(), vitePluginManusDebugCollector()];
var vite_config_default = defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path3.resolve(import.meta.dirname, "client", "src"),
      "@shared": path3.resolve(import.meta.dirname, "shared"),
      "@assets": path3.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path3.resolve(import.meta.dirname),
  root: path3.resolve(import.meta.dirname, "client"),
  publicDir: path3.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path3.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1"
    ],
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path4.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs4.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid2()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = process.env.NODE_ENV === "development" ? path4.resolve(import.meta.dirname, "../..", "dist", "public") : path4.resolve(import.meta.dirname, "public");
  if (!fs4.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path4.resolve(distPath, "index.html"));
  });
}

// server/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  const app = express2();
  const server = createServer(app);
  app.use("/api/wxpay/notify", express2.raw({ type: "application/json", limit: "1mb" }));
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  app.post("/api/upload", async (req, res) => {
    try {
      const busboy = (await import("busboy")).default;
      const bb = busboy({ headers: req.headers, limits: { fileSize: 10 * 1024 * 1024 } });
      let fileBuffer = null;
      let mimeType = "application/octet-stream";
      let fileName = "upload";
      bb.on("file", (_name, file, info) => {
        mimeType = info.mimeType || "application/octet-stream";
        fileName = info.filename || "upload";
        const chunks = [];
        file.on("data", (chunk) => chunks.push(chunk));
        file.on("end", () => {
          fileBuffer = Buffer.concat(chunks);
        });
      });
      bb.on("finish", async () => {
        try {
          if (!fileBuffer) return res.status(400).json({ error: "No file" });
          const { storagePut: storagePut2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
          const ext = fileName.split(".").pop() ?? "bin";
          const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { url, key: storedKey } = await storagePut2(key, fileBuffer, mimeType);
          res.json({ url, key: storedKey });
        } catch (err) {
          res.status(500).json({ error: err.message });
        }
      });
      req.pipe(bb);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/scheduled/lesson-reminders", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron) return res.status(403).json({ error: "cron-only" });
      const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { bookings: bookings2, notifications: notifications2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { and: and2, eq: eq2, gte: gte2, lte: lte2 } = await import("drizzle-orm");
      const db = await getDb2();
      if (!db) return res.json({ ok: true, skipped: "no-db" });
      const now = /* @__PURE__ */ new Date();
      const in20h = new Date(now.getTime() + 20 * 60 * 60 * 1e3);
      const in28h = new Date(now.getTime() + 28 * 60 * 60 * 1e3);
      const tomorrow20 = in20h.toISOString().split("T")[0];
      const tomorrow28 = in28h.toISOString().split("T")[0];
      const upcomingBookings = await db.select().from(bookings2).where(
        and2(
          eq2(bookings2.status, "confirmed"),
          gte2(bookings2.lessonDate, tomorrow20),
          lte2(bookings2.lessonDate, tomorrow28)
        )
      );
      let reminded = 0;
      for (const booking of upcomingBookings) {
        await db.insert(notifications2).values({
          userId: booking.studentId,
          type: "lesson_reminder",
          title: "\u4E0A\u8BFE\u63D0\u9192 \u23F0",
          content: `\u660E\u5929 ${booking.lessonDate} ${booking.startTime}-${booking.endTime} \u60A8\u6709\u4E00\u8282\u7F51\u7403\u8BFE\uFF0C\u8BF7\u51C6\u65F6\u5230\u573A\uFF01`,
          relatedId: booking.id
        });
        await db.insert(notifications2).values({
          userId: booking.coachId,
          type: "lesson_reminder",
          title: "\u4E0A\u8BFE\u63D0\u9192 \u23F0",
          content: `\u660E\u5929 ${booking.lessonDate} ${booking.startTime}-${booking.endTime} \u60A8\u6709\u4E00\u8282\u8BFE\u7A0B\uFF0C\u8BF7\u505A\u597D\u51C6\u5907\u3002`,
          relatedId: booking.id
        });
        reminded++;
      }
      res.json({ ok: true, reminded });
    } catch (err) {
      res.status(500).json({ error: err.message, stack: err.stack, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
    }
  });
  app.post("/api/scheduled/circle-activity-reminders", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron) return res.status(403).json({ error: "cron-only" });
      const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { circleActivities: circleActivities2, circleActivitySignups: circleActivitySignups2, circleMembers: circleMembers2, circles: circles2, notifications: notifications2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { and: and2, eq: eq2, inArray: inArray2, ne } = await import("drizzle-orm");
      const db = await getDb2();
      if (!db) return res.json({ ok: true, skipped: "no-db" });
      const now = /* @__PURE__ */ new Date();
      const target = new Date(now.getTime() + (3 * 24 + 8) * 60 * 60 * 1e3);
      const targetDate = target.toISOString().split("T")[0];
      const activities = await db.select().from(circleActivities2).where(and2(eq2(circleActivities2.activityDate, targetDate), inArray2(circleActivities2.status, ["open", "full"])));
      let reminded = 0;
      for (const act of activities) {
        const [circleRow] = await db.select({ name: circles2.name }).from(circles2).where(eq2(circles2.id, act.circleId)).limit(1);
        const circleName = circleRow?.name ?? "\u5708\u5B50";
        const members = await db.select({ userId: circleMembers2.userId }).from(circleMembers2).where(eq2(circleMembers2.circleId, act.circleId));
        const signups = await db.select({ userId: circleActivitySignups2.userId }).from(circleActivitySignups2).where(eq2(circleActivitySignups2.activityId, act.id));
        const signedSet = new Set(signups.map((s) => s.userId));
        const timeLabel = act.startTime ? ` ${act.startTime}${act.endTime ? "-" + act.endTime : ""}` : "";
        const venueLabel = act.venueName ? `\uFF0C\u{1F4CD}${act.venueName}` : "";
        for (const m of members) {
          if (signedSet.has(m.userId)) continue;
          await db.insert(notifications2).values({
            userId: m.userId,
            type: "circle_activity",
            title: `\u3010${circleName}\u3011\u6D3B\u52A8\u63D0\u9192 \u23F0`,
            content: `\u300C${act.title}\u300D\u5C06\u4E8E3\u5929\u540E\uFF08${act.activityDate}${timeLabel}\uFF09\u4E3E\u884C${venueLabel}\uFF0C\u8FD8\u6CA1\u62A5\u540D\u54E6\uFF0C\u5FEB\u53BB\u62A2\u540D\u989D\uFF01`,
            relatedId: act.id
          });
          reminded++;
        }
      }
      res.json({ ok: true, activities: activities.length, reminded });
    } catch (err) {
      res.status(500).json({ error: err.message, stack: err.stack, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
    }
  });
  app.post("/api/scheduled/cleanup-expired-slots", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron) return res.status(403).json({ error: "cron-only" });
      const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { coachAvailability: coachAvailability2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { and: and2, eq: eq2, lt: lt2 } = await import("drizzle-orm");
      const db = await getDb2();
      if (!db) return res.json({ ok: true, skipped: "no-db" });
      const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      const result = await db.delete(coachAvailability2).where(
        and2(
          lt2(coachAvailability2.specificDate, today),
          eq2(coachAvailability2.isAvailable, true)
        )
      );
      const deleted = result?.rowsAffected ?? 0;
      console.log(`[cleanup-expired-slots] Deleted ${deleted} expired reserved slots before ${today}`);
      res.json({ ok: true, deleted, before: today });
    } catch (err) {
      res.status(500).json({ error: err.message, stack: err.stack, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
    }
  });
  app.post("/api/scheduled/close-expired-matches", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron) return res.status(403).json({ error: "cron-only" });
      const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { tennisMatches: tennisMatches2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { and: and2, eq: eq2, lt: lt2, or: or2, sql: sql2 } = await import("drizzle-orm");
      const db = await getDb2();
      if (!db) return res.json({ ok: true, skipped: "no-db" });
      const now = /* @__PURE__ */ new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const cst = new Date(now.getTime() + 8 * 3600 * 1e3);
      const todayCSTStr = cst.toISOString().slice(0, 10);
      const currentTimeStr = cst.toISOString().slice(11, 16);
      const result = await db.update(tennisMatches2).set({ status: "completed" }).where(
        and2(
          or2(
            eq2(tennisMatches2.status, "open"),
            eq2(tennisMatches2.status, "full")
          ),
          or2(
            lt2(tennisMatches2.matchDate, todayCSTStr),
            and2(
              eq2(tennisMatches2.matchDate, todayCSTStr),
              sql2`${tennisMatches2.startTime} <= ${currentTimeStr}`
            )
          )
        )
      );
      const closed = result?.rowsAffected ?? 0;
      console.log(`[close-expired-matches] Closed ${closed} expired matches at ${now.toISOString()} (CST ${todayCSTStr} ${currentTimeStr})`);
      if (closed > 0) {
        try {
          const { matchParticipants: matchParticipants2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
          const { and: andOp, eq: eqOp, or: orOp, lt: ltOp, sql: sqlExpr } = await import("drizzle-orm");
          const { recordAttendAndCheckRestore: recordAttendAndCheckRestore2 } = await Promise.resolve().then(() => (init_db(), db_exports));
          const justClosedMatches = await db.select({ id: tennisMatches2.id }).from(tennisMatches2).where(
            andOp(
              eqOp(tennisMatches2.status, "completed"),
              orOp(
                ltOp(tennisMatches2.matchDate, todayCSTStr),
                andOp(
                  eqOp(tennisMatches2.matchDate, todayCSTStr),
                  sqlExpr`${tennisMatches2.startTime} <= ${currentTimeStr}`
                )
              )
            )
          );
          const { recordOrganizerReward: recordOrganizerReward2 } = await Promise.resolve().then(() => (init_db(), db_exports));
          let attendRecorded = 0;
          let creditRestored = 0;
          let organizerRewarded = 0;
          for (const match of justClosedMatches) {
            const participants = await db.select({ userId: matchParticipants2.userId }).from(matchParticipants2).where(andOp(eqOp(matchParticipants2.matchId, match.id), eqOp(matchParticipants2.status, "confirmed")));
            for (const p of participants) {
              const restored = await recordAttendAndCheckRestore2(p.userId, match.id);
              attendRecorded++;
              if (restored) creditRestored++;
            }
            const matchRow = await db.select({ authorId: tennisMatches2.authorId }).from(tennisMatches2).where(eqOp(tennisMatches2.id, match.id)).limit(1);
            if (matchRow[0]?.authorId) {
              await recordOrganizerReward2(matchRow[0].authorId, match.id);
              organizerRewarded++;
            }
          }
          console.log(`[close-expired-matches] Recorded ${attendRecorded} attendances, ${creditRestored} credit scores restored, ${organizerRewarded} organizers rewarded`);
        } catch (attendErr) {
          console.error(`[close-expired-matches] Attendance recording failed:`, attendErr.message);
        }
      }
      res.json({ ok: true, closed });
    } catch (err) {
      res.status(500).json({ error: err.message, stack: err.stack, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
    }
  });
  app.post("/api/scheduled/expire-replace-invites", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron) return res.status(403).json({ error: "cron-only" });
      const { getDb: getDb2, addCreditLog: addCreditLog2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { matchReplaceInvites: matchReplaceInvites2, matchParticipants: matchParticipants2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { and: and2, eq: eq2, lte: lte2 } = await import("drizzle-orm");
      const db = await getDb2();
      if (!db) return res.json({ ok: true, skipped: "no-db" });
      const now = /* @__PURE__ */ new Date();
      const expiredInvites = await db.select({
        id: matchReplaceInvites2.id,
        matchId: matchReplaceInvites2.matchId,
        fromUserId: matchReplaceInvites2.fromUserId
      }).from(matchReplaceInvites2).where(
        and2(
          eq2(matchReplaceInvites2.status, "pending"),
          lte2(matchReplaceInvites2.expiresAt, now)
        )
      );
      let expiredCount = 0;
      let deductedCount = 0;
      for (const invite of expiredInvites) {
        await db.update(matchReplaceInvites2).set({ status: "expired" }).where(eq2(matchReplaceInvites2.id, invite.id));
        expiredCount++;
        const participant = await db.select({ status: matchParticipants2.status }).from(matchParticipants2).where(
          and2(
            eq2(matchParticipants2.matchId, invite.matchId),
            eq2(matchParticipants2.userId, invite.fromUserId),
            eq2(matchParticipants2.status, "confirmed")
          )
        ).limit(1);
        if (participant.length > 0) {
          await addCreditLog2(
            invite.fromUserId,
            -10,
            "\u5F00\u7403\u524D\u672A\u627E\u5230\u66FF\u4EE3\u8005\uFF0C\u6263\u9664\u4FE1\u7528\u5206",
            invite.matchId
          );
          await db.update(matchParticipants2).set({ status: "cancelled" }).where(
            and2(
              eq2(matchParticipants2.matchId, invite.matchId),
              eq2(matchParticipants2.userId, invite.fromUserId)
            )
          );
          deductedCount++;
        }
      }
      console.log(
        `[expire-replace-invites] Expired ${expiredCount} invites, deducted credit for ${deductedCount} users at ${now.toISOString()}`
      );
      res.json({ ok: true, expiredCount, deductedCount });
    } catch (err) {
      res.status(500).json({
        error: err.message,
        stack: err.stack,
        context: { url: req.url },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  });
  app.post("/api/scheduled/auto-settle-matches", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron) return res.status(403).json({ error: "cron-only" });
      const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const db = await getDb2();
      if (!db) return res.json({ ok: true, settledCount: 0, skipped: "no-db" });
      const { matchSettlements: matchSettlements2, matchOrders: matchOrders2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq2, lte: lte2, and: and2 } = await import("drizzle-orm");
      const now = /* @__PURE__ */ new Date();
      const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1e3);
      const pendingSettlements = await db.select().from(matchSettlements2).where(and2(
        eq2(matchSettlements2.status, "confirming"),
        lte2(matchSettlements2.confirmedAt, cutoff)
      ));
      let settledCount = 0;
      for (const settlement of pendingSettlements) {
        try {
          await db.update(matchSettlements2).set({ status: "settled", settledAt: now }).where(eq2(matchSettlements2.id, settlement.id));
          await db.update(matchOrders2).set({ status: "settled" }).where(and2(
            eq2(matchOrders2.matchId, settlement.matchId),
            eq2(matchOrders2.status, "paid")
          ));
          settledCount++;
          console.log(`[auto-settle] Settled matchId=${settlement.matchId}, amount=${settlement.netAmount}`);
        } catch (innerErr) {
          console.error(`[auto-settle] Failed to settle matchId=${settlement.matchId}:`, innerErr.message);
        }
      }
      console.log(`[auto-settle] Processed ${pendingSettlements.length} settlements, settled ${settledCount} at ${now.toISOString()}`);
      res.json({ ok: true, settledCount, total: pendingSettlements.length });
    } catch (err) {
      res.status(500).json({
        error: err.message,
        stack: err.stack,
        context: { url: req.url },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  });
  app.post("/api/wxpay/notify", async (req, res) => {
    try {
      const timestamp2 = req.headers["wechatpay-timestamp"] || "";
      const nonce = req.headers["wechatpay-nonce"] || "";
      const signature = req.headers["wechatpay-signature"] || "";
      const serial = req.headers["wechatpay-serial"] || "";
      const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      const notifyBody = JSON.parse(rawBody);
      console.log(`[wxpay/notify] received, rawBody length=${rawBody.length}, event_type=${notifyBody.event_type || "unknown"}`);
      const { verifyNotifySignature: verifyNotifySignature2, getVerifyPublicKey: getVerifyPublicKey2, decryptNotifyData: decryptNotifyData2, isWxpayConfigured: isWxpayConfigured2 } = await Promise.resolve().then(() => (init_wxpay(), wxpay_exports));
      if (isWxpayConfigured2()) {
        const pubKey = getVerifyPublicKey2();
        if (pubKey) {
          const valid = verifyNotifySignature2(timestamp2, nonce, rawBody, signature, pubKey);
          if (!valid) {
            console.warn(`[wxpay/notify] Signature verification failed, serial=${serial}`);
            return res.status(401).json({ code: "SIGN_ERROR", message: "\u7B7E\u540D\u9A8C\u8BC1\u5931\u8D25" });
          }
        } else {
          console.warn(`[wxpay/notify] WXPAY_PUBLIC_KEY not configured, skipping signature verification`);
        }
      }
      if (!notifyBody.resource) {
        console.warn(`[wxpay/notify] Missing resource field, body=${rawBody.substring(0, 200)}`);
        return res.status(400).json({ code: "PARAM_ERROR", message: "\u7F3A\u5C11 resource \u5B57\u6BB5" });
      }
      const decrypted = decryptNotifyData2(
        notifyBody.resource.ciphertext,
        notifyBody.resource.nonce,
        notifyBody.resource.associated_data
      );
      const payResult = JSON.parse(decrypted);
      console.log(`[wxpay/notify] event=${notifyBody.event_type}, trade_no=${payResult.out_trade_no}, state=${payResult.trade_state}`);
      if (payResult.trade_state === "SUCCESS") {
        const dbMod = await Promise.resolve().then(() => (init_db(), db_exports));
        const { getDb: getDb2 } = dbMod;
        const db = await getDb2();
        if (db) {
          const { matchOrders: matchOrders2, matchParticipants: matchParticipants2, tennisMatches: tennisMatches2, matchMessages: matchMessages2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
          const { eq: eq2, and: and2, sql: sql2 } = await import("drizzle-orm");
          await db.update(matchOrders2).set({ status: "paid", paidAt: /* @__PURE__ */ new Date(), wxTransactionId: payResult.transaction_id }).where(eq2(matchOrders2.orderId, payResult.out_trade_no));
          const orders = await db.select().from(matchOrders2).where(eq2(matchOrders2.orderId, payResult.out_trade_no));
          if (orders.length > 0) {
            const order = orders[0];
            const partRows = await db.select().from(matchParticipants2).where(and2(eq2(matchParticipants2.matchId, order.matchId), eq2(matchParticipants2.userId, order.userId)));
            const wasPending = partRows.length > 0 && partRows[0].status === "pending";
            await db.update(matchParticipants2).set({ status: "confirmed", paymentStatus: "paid", orderId: order.orderId }).where(and2(eq2(matchParticipants2.matchId, order.matchId), eq2(matchParticipants2.userId, order.userId)));
            if (wasPending) {
              try {
                await db.update(tennisMatches2).set({ currentParticipants: sql2`${tennisMatches2.currentParticipants} + 1` }).where(eq2(tennisMatches2.id, order.matchId));
                const matchRows = await db.select().from(tennisMatches2).where(eq2(tennisMatches2.id, order.matchId));
                if (matchRows.length > 0) {
                  const m = matchRows[0];
                  if ((m.currentParticipants ?? 0) + 1 >= (m.maxParticipants ?? 0) && m.status === "open") {
                    await db.update(tennisMatches2).set({ status: "full" }).where(eq2(tennisMatches2.id, order.matchId));
                  }
                  try {
                    const joiner = await dbMod.getUserById(order.userId);
                    await dbMod.createNotification({ userId: m.authorId, type: "system", title: "\u65B0\u7684\u62A5\u540D", content: `${joiner?.name ?? "\u6709\u4EBA"}\u5DF2\u4ED8\u8D39\u62A5\u540D\u60A8\u7684\u7EA6\u7403\u300C${m.title}\u300D\u3002` });
                    await db.insert(matchMessages2).values({
                      matchId: order.matchId,
                      userId: order.userId,
                      content: `${joiner?.name ?? "\u5C0F\u4F19\u4F34"} \u52A0\u5165\u4E86\u7403\u5C40 \u{1F3BE}`,
                      msgType: "system"
                    });
                  } catch (_notifyErr) {
                  }
                }
              } catch (_incErr) {
                console.error(`[wxpay/notify] \u652F\u4ED8\u6210\u529F\u540E\u5360\u4F4D\u5904\u7406\u5931\u8D25 order=${order.orderId}:`, _incErr?.message);
              }
            }
          }
        }
      }
      res.status(200).json({ code: "SUCCESS", message: "\u6210\u529F" });
    } catch (err) {
      console.error(`[wxpay/notify] Error processing notify:`, err.message, err.stack);
      if (!res.headersSent) {
        res.status(500).json({ code: "FAIL", message: "\u5904\u7406\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5" });
      }
    }
  });
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
    try {
      await seedDemoData();
    } catch (e) {
      console.error("[seed] Failed to seed demo data:", e);
    }
    try {
      const { startSettlementCron } = await import("../settlement-cron");
      startSettlementCron();
    } catch (e) {
      console.error("[settlement-cron] Failed to start:", e);
    }
  });
}
async function seedDemoData() {
  const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
  const db = await getDb2();
  if (!db) return;
  const { users: users2, coachProfiles: coachProfiles2, venues: venues2, coachVenues: coachVenues2, coachAvailability: coachAvailability2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  const { eq: eq2, count: count2 } = await import("drizzle-orm");
  const existing = await db.select({ c: count2() }).from(coachProfiles2).where(eq2(coachProfiles2.inviteCode, "CHENWEI2024"));
  if ((existing[0]?.c ?? 0) > 0) {
    console.log("[seed] Demo coaches already exist, skipping.");
    return;
  }
  console.log("[seed] Seeding demo coaches...");
  const venueData = [
    { id: 30001, name: "\u6DF1\u5733\u5927\u5B66\u57CE\u4F53\u80B2\u4E2D\u5FC3\u7F51\u7403\u573A", area: "\u5927\u5B66\u57CE", address: "\u6DF1\u5733\u5E02\u5357\u5C71\u533A\u7559\u4ED9\u5927\u90532032\u53F7", description: "\u5750\u843D\u4E8E\u5858\u6717\u5C71\u4E0B\u3001\u5927\u6C99\u6CB3\u7554\uFF0C\u517111\u7247\u6807\u51C6\u5BA4\u5916\u786C\u5730\u7F51\u7403\u573A\uFF0C\u706F\u5149\u8BBE\u5907\u9F50\u5168\uFF0C\u53EF\u627F\u529E\u5927\u578B\u7F51\u7403\u6BD4\u8D5B\u6D3B\u52A8\u3002", facilities: ["\u706F\u5149\u7167\u660E", "\u505C\u8F66\u573A", "\u66F4\u8863\u5BA4", "\u6DCB\u6D74\u95F4"], courtCount: 11, courtTypes: ["\u786C\u5730"], pricePerHour: "80.00", openTime: "07:00", closeTime: "22:00", phone: "0755-26030304", mapUrl: "https://ditu.amap.com/place/B02F37VC3Q", bookingNote: '\u8BF7\u5728\u5FAE\u4FE1\u5C0F\u7A0B\u5E8F\u300Ci\u6DF1\u4F53\u300D\u4E2D\u641C\u7D22"\u5927\u5B66\u57CE\u4F53\u80B2\u4E2D\u5FC3"\u8FDB\u884C\u573A\u5730\u9884\u7EA6\uFF0C\u63D0\u524D1-2\u5929\u9884\u8BA2\u3002', isActive: true },
    { id: 30002, name: "\u6DF1\u5733\u6E7E\u4F53\u80B2\u4E2D\u5FC3\u5BA4\u5916\u7F51\u7403\u573A", area: "\u5357\u5C71", address: "\u6DF1\u5733\u5E02\u5357\u5C71\u533A\u767D\u77F3\u8DEF1\u53F7", description: "\u6DF1\u5733\u6E7E\u4F53\u80B2\u4E2D\u5FC3\u914D\u5957\u7F51\u7403\u573A\uFF0C\u73AF\u5883\u4F18\u7F8E\uFF0C\u6BD7\u90BB\u6DF1\u5733\u6E7E\u6D77\u5CB8\u7EBF\uFF0C\u51716\u7247\u5BA4\u5916\u786C\u5730\u7403\u573A\u3002", facilities: ["\u706F\u5149\u7167\u660E", "\u505C\u8F66\u573A", "\u66F4\u8863\u5BA4"], courtCount: 6, courtTypes: ["\u786C\u5730"], pricePerHour: "100.00", openTime: "07:00", closeTime: "22:00", phone: null, mapUrl: "https://ditu.amap.com/place/B0FFHZRQK5", bookingNote: "\u8BF7\u63D0\u524D\u901A\u8FC7\u5B98\u65B9\u5C0F\u7A0B\u5E8F\u6216\u7535\u8BDD\u9884\u7EA6\uFF0C\u5468\u672B\u573A\u5730\u7D27\u5F20\uFF0C\u5EFA\u8BAE\u63D0\u524D3\u5929\u9884\u8BA2\u3002", isActive: true },
    { id: 30003, name: "TT\u7F51\u7403\u86C7\u53E3\u5BA4\u5916\u573A", area: "\u5357\u5C71", address: "\u6DF1\u5733\u5E02\u5357\u5C71\u533A\u86C7\u53E3\u8857\u9053\u671B\u6D77\u8DEF1\u53F7\u6D77\u4E0A\u4E16\u754C\u5E7F\u573A", description: "TT\u7F51\u7403\u4FF1\u4E50\u90E8\u86C7\u53E3\u5206\u90E8\uFF0C\u4F4D\u4E8E\u6D77\u4E0A\u4E16\u754C\u5546\u4E1A\u533A\uFF0C\u51714\u7247\u5BA4\u5916\u786C\u5730\u7403\u573A\uFF0C\u914D\u5957\u8BBE\u65BD\u5B8C\u5584\u3002", facilities: ["\u706F\u5149\u7167\u660E", "\u505C\u8F66\u573A", "\u66F4\u8863\u5BA4", "\u6DCB\u6D74\u95F4", "\u7403\u5177\u79DF\u8D41"], courtCount: 4, courtTypes: ["\u786C\u5730"], pricePerHour: "120.00", openTime: "08:00", closeTime: "22:00", phone: null, mapUrl: "https://ditu.amap.com/search?query=TT\u7F51\u7403\u86C7\u53E3&city=\u6DF1\u5733", bookingNote: "\u8BF7\u901A\u8FC7TT\u7F51\u7403APP\u9884\u7EA6\uFF0C\u4F1A\u5458\u4EAB\u53D7\u4F18\u5148\u9884\u7EA6\u6743\u3002", isActive: true },
    { id: 30006, name: "\u79D1\u6280\u56ED\u7F51\u7403\u4E2D\u5FC3", area: "\u5357\u5C71", address: "\u6DF1\u5733\u5E02\u5357\u5C71\u533A\u897F\u4E3D\u8857\u9053\u9AD8\u65B0\u5317\u4E09\u8DEF\u4E0E\u79D1\u6280\u5317\u4E09\u8DEF\u4EA4\u53C9\u8DEF\u53E3\u5317\u4FA7", description: "\u4F4D\u4E8E\u79D1\u6280\u56ED\u6838\u5FC3\u533A\uFF0C\u4EA4\u901A\u4FBF\u5229\uFF0C\u9002\u5408\u5468\u8FB9\u4E0A\u73ED\u65CF\u548C\u79D1\u6280\u56ED\u5458\u5DE5\u4F7F\u7528\u3002", facilities: ["\u706F\u5149\u7167\u660E", "\u505C\u8F66\u573A", "\u66F4\u8863\u5BA4"], courtCount: 6, courtTypes: ["\u786C\u5730"], pricePerHour: "90.00", openTime: "08:00", closeTime: "22:00", phone: null, mapUrl: "https://ditu.amap.com/search?query=\u79D1\u6280\u56ED\u7F51\u7403\u4E2D\u5FC3&city=\u6DF1\u5733", bookingNote: "\u8BF7\u63D0\u524D\u7535\u8BDD\u6216\u5728\u7EBF\u9884\u7EA6\uFF0C\u5EFA\u8BAE\u63D0\u524D1\u5929\u9884\u8BA2\u3002", isActive: true },
    { id: 30004, name: "\u6C99\u6CB3\u516C\u56ED\u7F51\u7403\u573A", area: "\u5357\u5C71", address: "\u6DF1\u5733\u5E02\u5357\u5C71\u533A\u6C99\u6CB3\u8857\u9053\u6C99\u6CB3\u516C\u56ED\u5185", description: "\u6C99\u6CB3\u516C\u56ED\u5185\u914D\u5957\u7F51\u7403\u573A\uFF0C\u73AF\u5883\u6E05\u5E7D\uFF0C\u7EFF\u6811\u6210\u836B\uFF0C\u51714\u7247\u5BA4\u5916\u786C\u5730\u7403\u573A\uFF0C\u4EF7\u683C\u5B9E\u60E0\u3002", facilities: ["\u706F\u5149\u7167\u660E", "\u505C\u8F66\u573A"], courtCount: 4, courtTypes: ["\u786C\u5730"], pricePerHour: "60.00", openTime: "07:00", closeTime: "21:00", phone: null, mapUrl: "https://ditu.amap.com/search?query=\u6C99\u6CB3\u516C\u56ED\u7F51\u7403\u573A&city=\u6DF1\u5733", bookingNote: "\u73B0\u573A\u9884\u7EA6\uFF0C\u5148\u5230\u5148\u5F97\uFF0C\u5EFA\u8BAE\u5DE5\u4F5C\u65E5\u524D\u5F80\u907F\u5F00\u9AD8\u5CF0\u3002", isActive: true }
  ];
  for (const v of venueData) {
    const existing2 = await db.select({ c: count2() }).from(venues2).where(eq2(venues2.id, v.id));
    if ((existing2[0]?.c ?? 0) === 0) {
      await db.insert(venues2).values(v);
    }
  }
  const demoUsers = [
    { id: 1590041, openId: "demo_coach_chenwei_001", name: "\u9648\u5A01", role: "coach", loginMethod: "demo" },
    { id: 1590042, openId: "demo_coach_lina_002", name: "\u674E\u5A1C", role: "coach", loginMethod: "demo" },
    { id: 1590043, openId: "demo_coach_zhanghao_003", name: "\u5F20\u6D69", role: "coach", loginMethod: "demo" },
    { id: 1590044, openId: "demo_coach_wangfang_004", name: "\u738B\u82B3", role: "coach", loginMethod: "demo" }
  ];
  for (const u of demoUsers) {
    const existingUser = await db.select({ c: count2() }).from(users2).where(eq2(users2.id, u.id));
    if ((existingUser[0]?.c ?? 0) === 0) {
      await db.insert(users2).values(u);
    }
  }
  const demoCoaches = [
    {
      id: 150001,
      userId: 1590041,
      displayName: "\u9648\u5A01\u6559\u7EC3",
      tagline: "\u524D\u7701\u961F\u4E13\u4E1A\u7403\u5458\uFF0C\u4E13\u6CE8\u6210\u4EBA\u6280\u672F\u63D0\u5347",
      bio: "\u524D\u5E7F\u4E1C\u7701\u7F51\u7403\u961F\u961F\u5458\uFF0C\u804C\u4E1A\u751F\u6DAF\u53C2\u52A0\u8FC7\u591A\u9879\u5168\u56FD\u6027\u8D5B\u4E8B\u3002\u9000\u5F79\u540E\u4E13\u6CE8\u9752\u5C11\u5E74\u53CA\u6210\u4EBA\u7F51\u7403\u6559\u5B66\uFF0C\u64C5\u957F\u6B63\u624B\u6280\u672F\u4F53\u7CFB\u548C\u6BD4\u8D5B\u6218\u672F\u8BAD\u7EC3\u3002\u73B0\u5E38\u9A7B\u6DF1\u5733\u5357\u5C71\u533A\uFF0C\u5DF2\u57F9\u517B\u5B66\u5458\u8D85\u8FC7200\u4EBA\uFF0C\u591A\u540D\u5B66\u5458\u8FBE\u5230\u4E1A\u4F594.0\u6C34\u5E73\u3002",
      yearsExperience: 12,
      certifications: ["\u56FD\u5BB6\u4E8C\u7EA7\u8FD0\u52A8\u5458\u8BC1\u4E66", "ITF Level 2\u6559\u7EC3\u8BA4\u8BC1", "\u4E2D\u56FD\u7F51\u7403\u534F\u4F1A\u6CE8\u518C\u6559\u7EC3"],
      specialties: ["\u6B63\u624B\u6280\u672F", "\u6BD4\u8D5B\u6218\u672F", "\u9752\u5C11\u5E74\u57F9\u8BAD"],
      achievements: ["\u5E7F\u4E1C\u7701\u9752\u5C11\u5E74\u7F51\u7403\u9526\u6807\u8D5B\u4E9A\u519B\uFF082015\uFF09", "\u6DF1\u5733\u5E02\u7F51\u7403\u516C\u5F00\u8D5B\u51A0\u519B\uFF082018\uFF09"],
      pricePerHour: "680.00",
      inviteCode: "CHENWEI2024",
      shareSlug: "chen-wei-coach",
      isActive: true,
      isVerified: true,
      verificationStatus: "approved",
      contentReviewStatus: "approved",
      sortWeight: 90,
      totalLessons: 248,
      totalStudents: 67,
      avgRating: "4.90"
    },
    {
      id: 150002,
      userId: 1590042,
      displayName: "\u674E\u5A1C\u6559\u7EC3",
      tagline: "WTA\u804C\u4E1A\u7403\u5458\u80CC\u666F\uFF0C\u5973\u5B50\u4E13\u9879\u6559\u5B66\u4E13\u5BB6",
      bio: "\u66FE\u53C2\u52A0WTA\u5916\u5361\u8D5B\u4E8B\uFF0C\u62E5\u6709\u4E30\u5BCC\u7684\u804C\u4E1A\u8D5B\u573A\u7ECF\u9A8C\u3002\u4E13\u6CE8\u5973\u5B50\u7F51\u7403\u6559\u5B66\uFF0C\u64C5\u957F\u5E2E\u52A9\u5973\u6027\u7403\u5458\u5EFA\u7ACB\u6B63\u786E\u6280\u672F\u6846\u67B6\uFF0C\u8BFE\u7A0B\u6C1B\u56F4\u8F7B\u677E\u6109\u5FEB\uFF0C\u7279\u522B\u9002\u5408\u521D\u5B66\u8005\u548C\u5E0C\u671B\u63D0\u9AD8\u53CC\u6253\u6280\u672F\u7684\u7403\u5458\u3002",
      yearsExperience: 9,
      certifications: ["WTA\u7403\u5458\u8D44\u8D28\u8BC1\u660E", "ITF Level 1\u6559\u7EC3\u8BA4\u8BC1", "\u5E7F\u4E1C\u7701\u7F51\u7403\u534F\u4F1A\u6CE8\u518C\u6559\u7EC3"],
      specialties: ["\u5973\u5B50\u4E13\u9879", "\u521D\u5B66\u8005\u5165\u95E8", "\u53CC\u6253\u6280\u672F"],
      achievements: ["\u5E7F\u4E1C\u7701\u5973\u5B50\u7F51\u7403\u9526\u6807\u8D5B\u5B63\u519B\uFF082017\uFF09", "\u57F9\u517B\u591A\u540D\u5B66\u5458\u53C2\u52A0\u6DF1\u5733\u5E02\u4E1A\u4F59\u8054\u8D5B"],
      pricePerHour: "580.00",
      inviteCode: "LINA2024",
      shareSlug: "li-na-coach",
      isActive: true,
      isVerified: true,
      verificationStatus: "approved",
      contentReviewStatus: "approved",
      sortWeight: 88,
      totalLessons: 186,
      totalStudents: 54,
      avgRating: "4.80"
    },
    {
      id: 150003,
      userId: 1590043,
      displayName: "\u5F20\u6D69\u6559\u7EC3",
      tagline: "\u4F53\u80FD\u4E0E\u6280\u672F\u53CC\u4FEE\uFF0C\u7ADE\u6280\u63D0\u5347\u9996\u9009",
      bio: "\u4F53\u80B2\u5B66\u9662\u7F51\u7403\u4E13\u4E1A\u6BD5\u4E1A\uFF0C\u66FE\u4EFB\u6DF1\u5733\u67D0\u77E5\u540D\u7F51\u7403\u4FF1\u4E50\u90E8\u9996\u5E2D\u6559\u7EC3\u3002\u64C5\u957F\u7ED3\u5408\u8FD0\u52A8\u79D1\u5B66\u8FDB\u884C\u4F53\u80FD\u8BAD\u7EC3\u4E0E\u6280\u672F\u6539\u9020\uFF0C\u5C24\u5176\u64C5\u957F\u5E2E\u52A9\u6709\u4E00\u5B9A\u57FA\u7840\u7684\u7403\u5458\u7A81\u7834\u74F6\u9888\u3001\u63D0\u5347\u7ADE\u6280\u6C34\u5E73\u3002\u8BFE\u7A0B\u5305\u542B\u89C6\u9891\u5206\u6790\u548C\u4E2A\u6027\u5316\u8BAD\u7EC3\u8BA1\u5212\u3002",
      yearsExperience: 8,
      certifications: ["\u4F53\u80B2\u5B66\u9662\u7F51\u7403\u4E13\u4E1A\u5B66\u58EB", "ITF Level 1\u8BA4\u8BC1", "USPTA\u804C\u4E1A\u7F51\u7403\u6559\u7EC3\u8BA4\u8BC1"],
      specialties: ["\u6280\u672F\u6539\u9020", "\u4F53\u80FD\u8BAD\u7EC3", "\u7ADE\u6280\u63D0\u5347"],
      achievements: ["\u6DF1\u5733\u5E02\u7F51\u7403\u4FF1\u4E50\u90E8\u8054\u8D5B\u56E2\u4F53\u51A0\u519B\u6559\u7EC3\uFF082020\u30012022\uFF09", "\u57F9\u517B\u591A\u540D\u5B66\u5458\u8FDB\u5165\u6DF1\u5733\u5E02\u961F"],
      pricePerHour: "750.00",
      inviteCode: "ZHANGHAO2024",
      shareSlug: "zhang-hao-coach",
      isActive: true,
      isVerified: true,
      verificationStatus: "approved",
      contentReviewStatus: "approved",
      sortWeight: 85,
      totalLessons: 312,
      totalStudents: 89,
      avgRating: "4.70"
    },
    {
      id: 150004,
      userId: 1590044,
      displayName: "\u738B\u82B3\u6559\u7EC3",
      tagline: "\u4EB2\u5B50\u7F51\u7403\u4E13\u5BB6\uFF0C\u5BD3\u6559\u4E8E\u4E50",
      bio: "\u4E13\u6CE8\u4EB2\u5B50\u7F51\u7403\u6559\u5B6610\u5E74\uFF0C\u62E5\u6709\u513F\u7AE5\u4F53\u80B2\u6559\u80B2\u80CC\u666F\u3002\u8BFE\u7A0B\u8BBE\u8BA1\u751F\u52A8\u6709\u8DA3\uFF0C\u5584\u4E8E\u6FC0\u53D1\u5B69\u5B50\u5BF9\u7F51\u7403\u7684\u5174\u8DA3\uFF0C\u540C\u65F6\u517C\u987E\u5BB6\u957F\u53C2\u4E0E\uFF0C\u6253\u9020\u4EB2\u5B50\u5171\u540C\u6210\u957F\u7684\u8FD0\u52A8\u4F53\u9A8C\u3002\u5DF2\u6210\u529F\u5E26\u9886\u591A\u4E2A\u5BB6\u5EAD\u4ECE\u96F6\u5F00\u59CB\u7231\u4E0A\u7F51\u7403\u3002",
      yearsExperience: 10,
      certifications: ["\u513F\u7AE5\u4F53\u80B2\u6559\u80B2\u8D44\u683C\u8BC1", "ITF Level 1\u6559\u7EC3\u8BA4\u8BC1", "\u6DF1\u5733\u5E02\u7F51\u7403\u534F\u4F1A\u9752\u5C11\u5E74\u6559\u7EC3\u8D44\u8D28"],
      specialties: ["\u4EB2\u5B50\u7F51\u7403", "\u513F\u7AE5\u542F\u8499", "\u5BB6\u5EAD\u8BFE\u7A0B"],
      achievements: ["\u6DF1\u5733\u5E02\u4F18\u79C0\u9752\u5C11\u5E74\u7F51\u7403\u6559\u7EC3\u79F0\u53F7\uFF082021\uFF09", "\u5E26\u9886\u5B66\u5458\u53C2\u52A0\u5168\u56FD\u9752\u5C11\u5E74\u7F51\u7403\u5DE1\u56DE\u8D5B"],
      pricePerHour: "500.00",
      inviteCode: "WANGFANG2024",
      shareSlug: "wang-fang-coach",
      isActive: true,
      isVerified: true,
      verificationStatus: "approved",
      contentReviewStatus: "approved",
      sortWeight: 87,
      totalLessons: 421,
      totalStudents: 112,
      avgRating: "4.90"
    }
  ];
  for (const c of demoCoaches) {
    const existingCoach = await db.select({ c: count2() }).from(coachProfiles2).where(eq2(coachProfiles2.id, c.id));
    if ((existingCoach[0]?.c ?? 0) === 0) {
      await db.insert(coachProfiles2).values(c);
    }
  }
  const coachVenueBindings = [
    { coachId: 150001, venueId: 30001, isPreferred: true },
    { coachId: 150001, venueId: 30002, isPreferred: false },
    { coachId: 150002, venueId: 30002, isPreferred: true },
    { coachId: 150002, venueId: 30003, isPreferred: false },
    { coachId: 150003, venueId: 30001, isPreferred: true },
    { coachId: 150003, venueId: 30006, isPreferred: false },
    { coachId: 150004, venueId: 30003, isPreferred: true },
    { coachId: 150004, venueId: 30004, isPreferred: false }
  ];
  for (const b of coachVenueBindings) {
    const existingBind = await db.select({ c: count2() }).from(coachVenues2).where(eq2(coachVenues2.coachId, b.coachId));
    if ((existingBind[0]?.c ?? 0) === 0) {
      await db.insert(coachVenues2).values(b);
    }
  }
  const availabilityData = [
    // 陈威: 周二、周四 18-20, 周六 09-11
    { coachId: 150001, dayOfWeek: 2, startTime: "18:00", endTime: "20:00", isAvailable: true },
    { coachId: 150001, dayOfWeek: 4, startTime: "18:00", endTime: "20:00", isAvailable: true },
    { coachId: 150001, dayOfWeek: 6, startTime: "09:00", endTime: "11:00", isAvailable: true },
    // 李娜: 周一、周三 09-11, 周五 14-16, 周日 10-12
    { coachId: 150002, dayOfWeek: 1, startTime: "09:00", endTime: "11:00", isAvailable: true },
    { coachId: 150002, dayOfWeek: 3, startTime: "09:00", endTime: "11:00", isAvailable: true },
    { coachId: 150002, dayOfWeek: 5, startTime: "14:00", endTime: "16:00", isAvailable: true },
    { coachId: 150002, dayOfWeek: 0, startTime: "10:00", endTime: "12:00", isAvailable: true },
    // 张浩: 周一至周五 18-20, 周六 09-11
    { coachId: 150003, dayOfWeek: 1, startTime: "18:00", endTime: "20:00", isAvailable: true },
    { coachId: 150003, dayOfWeek: 2, startTime: "18:00", endTime: "20:00", isAvailable: true },
    { coachId: 150003, dayOfWeek: 3, startTime: "18:00", endTime: "20:00", isAvailable: true },
    { coachId: 150003, dayOfWeek: 4, startTime: "18:00", endTime: "20:00", isAvailable: true },
    { coachId: 150003, dayOfWeek: 5, startTime: "18:00", endTime: "20:00", isAvailable: true },
    { coachId: 150003, dayOfWeek: 6, startTime: "09:00", endTime: "11:00", isAvailable: true },
    // 王芳: 周三、周五 15-17, 周六、周日 09-11
    { coachId: 150004, dayOfWeek: 3, startTime: "15:00", endTime: "17:00", isAvailable: true },
    { coachId: 150004, dayOfWeek: 5, startTime: "15:00", endTime: "17:00", isAvailable: true },
    { coachId: 150004, dayOfWeek: 6, startTime: "09:00", endTime: "11:00", isAvailable: true },
    { coachId: 150004, dayOfWeek: 0, startTime: "09:00", endTime: "11:00", isAvailable: true }
  ];
  const existingAvail = await db.select({ c: count2() }).from(coachAvailability2).where(eq2(coachAvailability2.coachId, 150001));
  if ((existingAvail[0]?.c ?? 0) === 0) {
    await db.insert(coachAvailability2).values(availabilityData);
  }
  console.log("[seed] Demo coaches seeded successfully.");
}
startServer().catch(console.error);

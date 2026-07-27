/**
 * 微信小程序订阅消息通知模块
 *
 * 替代阿里云短信，通过微信官方订阅消息接口向用户推送通知。
 * 前提：用户已通过 wx.requestSubscribeMessage 授权对应模板。
 *
 * 官方文档：https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/mp-message-management/subscribe-message/sendMessage.html
 */

import { getAccessToken } from "./_core/wechat";

// ─── Access Token 获取（复用 wechat.ts 缓存）────────────────────────────────
async function getToken(): Promise<string | null> {
  try {
    return await getAccessToken();
  } catch (e) {
    console.warn("[WxNotify] 获取 access_token 失败，跳过推送:", e);
    return null;
  }
}

// ─── 核心发送函数 ─────────────────────────────────────────────────────────────
async function sendSubscribeMessage(
  toUser: string,
  templateId: string,
  data: Record<string, { value: string }>,
  page?: string
): Promise<boolean> {
  if (!toUser) {
    console.warn("[WxNotify] 目标用户 openid 为空，跳过推送");
    return false;
  }
  if (!templateId || templateId === "TPL_PENDING") {
    console.warn("[WxNotify] 模板 ID 未配置，跳过推送到", toUser);
    return false;
  }
  const token = await getToken();
  if (!token) return false;

  const body = {
    touser: toUser,
    template_id: templateId,
    page: page ?? "pages/index/index",
    data,
  };

  try {
    const res = await fetch(
      `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    const result = (await res.json()) as { errcode: number; errmsg: string };
    if (result.errcode === 0) {
      console.log(`[WxNotify] 推送成功 → ${toUser} (${templateId})`);
      return true;
    }
    // errcode 43101 = 用户未订阅该消息，属于正常情况，降级为 warn
    if (result.errcode === 43101) {
      console.warn(`[WxNotify] 用户未订阅 ${templateId}，跳过推送 → ${toUser}`);
      return false;
    }
    console.error(`[WxNotify] 推送失败 → ${toUser}: ${result.errcode} ${result.errmsg}`);
    return false;
  } catch (e) {
    console.error("[WxNotify] 推送异常:", e);
    return false;
  }
}

// ─── 模板 ID（从环境变量读取，未配置时跳过发送）────────────────────────────────
const TEMPLATES = {
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
  MATCH_CANCELLED: process.env.WX_TPL_MATCH_CANCELLED ?? "TPL_PENDING",
} as const;

// ─── 业务封装函数 ──────────────────────────────────────────────────────────────

/**
 * 预约成功通知 → 发给学员
 */
export async function wxNotifyBookingToStudent(params: {
  openid: string;
  coachName: string;
  lessonDate: string;
  startTime: string;
  venueName: string;
}) {
  return sendSubscribeMessage(
    params.openid,
    TEMPLATES.BOOKING_STUDENT,
    {
      thing1: { value: params.coachName.slice(0, 20) },
      time2: { value: `${params.lessonDate} ${params.startTime}` },
      thing3: { value: params.venueName.slice(0, 20) },
    },
    "pages/bookings/index"
  );
}

/**
 * 新预约通知 → 发给教练
 */
export async function wxNotifyBookingToCoach(params: {
  openid: string;
  studentName: string;
  lessonDate: string;
  startTime: string;
  venueName: string;
}) {
  return sendSubscribeMessage(
    params.openid,
    TEMPLATES.BOOKING_COACH,
    {
      thing1: { value: params.studentName.slice(0, 20) },
      time2: { value: `${params.lessonDate} ${params.startTime}` },
      thing3: { value: params.venueName.slice(0, 20) },
    },
    "pages/coach-portal/index"
  );
}

/**
 * 预约确认后将教练联系方式发给学员
 */
export async function wxNotifyCoachContactToStudent(params: {
  openid: string;
  coachName: string;
  coachPhone: string;
}) {
  return sendSubscribeMessage(
    params.openid,
    TEMPLATES.CONTACT_INFO,
    {
      thing1: { value: params.coachName.slice(0, 20) },
      phone_number2: { value: params.coachPhone },
    },
    "pages/bookings/index"
  );
}

/**
 * 预约确认后将学员联系方式发给教练
 */
export async function wxNotifyStudentContactToCoach(params: {
  openid: string;
  studentName: string;
  studentPhone: string;
}) {
  return sendSubscribeMessage(
    params.openid,
    TEMPLATES.CONTACT_INFO,
    {
      thing1: { value: params.studentName.slice(0, 20) },
      phone_number2: { value: params.studentPhone },
    },
    "pages/coach-portal/index"
  );
}

/**
 * 教练审核通过通知
 */
export async function wxNotifyCoachApproved(params: { openid: string; coachName: string }) {
  return sendSubscribeMessage(
    params.openid,
    TEMPLATES.COACH_APPROVED,
    {
      thing1: { value: params.coachName.slice(0, 20) },
      thing2: { value: "您的教练申请已审核通过，可以开始接单了！" },
    },
    "pages/coach-portal/index"
  );
}

/**
 * 教练审核拒绝通知
 */
export async function wxNotifyCoachRejected(params: {
  openid: string;
  coachName: string;
  reason: string;
}) {
  return sendSubscribeMessage(
    params.openid,
    TEMPLATES.COACH_REJECTED,
    {
      thing1: { value: params.coachName.slice(0, 20) },
      thing2: { value: (params.reason || "资质材料不符合要求").slice(0, 20) },
    },
    "pages/coach-apply/index"
  );
}

/**
 * 圈子新球局通知 → 发给圈内成员
 */
export async function wxNotifyCircleMatch(params: {
  openid: string;
  circleName: string;
  matchDate: string;
  startTime: string;
  venueName: string;
}) {
  return sendSubscribeMessage(
    params.openid,
    TEMPLATES.CIRCLE_MATCH,
    {
      thing1: { value: params.circleName.slice(0, 20) },
      time2: { value: `${params.matchDate} ${params.startTime}` },
      thing3: { value: params.venueName.slice(0, 20) },
    },
    "pages/matches/index"
  );
}

/**
 * 球局有新报名 → 通知发布人
 */
export async function wxNotifyMatchJoin(params: {
  openid: string;
  matchTitle: string;
  joinerName: string;
}) {
  return sendSubscribeMessage(
    params.openid,
    TEMPLATES.MATCH_JOIN,
    {
      thing1: { value: params.matchTitle.slice(0, 20) },
      thing2: { value: params.joinerName.slice(0, 20) },
    },
    "pages/matches/index"
  );
}

/**
 * 球局取消通知 → 发给已报名的参与者
 */
export async function sendMatchCancelledToParticipant(
  openid: string,
  matchTitle: string,
  matchDate: string,
  startTime: string
) {
  return sendSubscribeMessage(
    openid,
    TEMPLATES.MATCH_CANCELLED,
    {
      thing1: { value: matchTitle.slice(0, 20) },
      time2: { value: `${matchDate} ${startTime}` },
      thing3: { value: "发布人已取消球局" },
    },
    "pages/matches/index"
  );
}

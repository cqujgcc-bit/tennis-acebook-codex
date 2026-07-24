/**
 * 阿里云短信服务工具
 * 签名：AceBook
 *
 * 模板 Code 说明（审核通过后填入）：
 *   SMS_TPL_VERIFY_CODE     - 登录/注册验证码
 *   SMS_TPL_BOOKING_STUDENT - 预约成功通知（发给学员）
 *   SMS_TPL_BOOKING_COACH   - 新预约通知（发给教练）
 *   SMS_TPL_COACH_APPROVED  - 教练审核通过通知
 *   SMS_TPL_COACH_REJECTED  - 教练审核拒绝通知
 *
 * 模板变量：
 *   验证码:             code
 *   预约成功（学员）:   coachName, lessonDate, startTime, venueName
 *   新预约（教练）:     studentName, lessonDate, startTime, venueName
 *   审核通过:           （无变量）
 *   审核拒绝:           reason
 */

import * as _DysmsapiModule from "@alicloud/dysmsapi20170525";
import * as _OpenApiClientModule from "@alicloud/openapi-client";
// 兼容 CJS/ESM 双层 default 导出（阿里云 SDK 是 CJS，tsx 运行时 import* 后 default 是模块对象，真正的 Client 在 default.default）
const Dysmsapi20170525: any = (_DysmsapiModule as any).default?.default ?? (_DysmsapiModule as any).default ?? _DysmsapiModule;
const SendSmsRequest: any = (_DysmsapiModule as any).SendSmsRequest ?? (_DysmsapiModule as any).default?.SendSmsRequest;
const OpenApiConfig: any = (_OpenApiClientModule as any).Config ?? (_OpenApiClientModule as any).default?.Config ?? (_OpenApiClientModule as any).default?.default?.Config;

// ─── Template Codes（审核通过后通过环境变量注入）────────────────────────────
const TEMPLATES = {
  VERIFY_CODE:     process.env.SMS_TPL_VERIFY_CODE     ?? "SMS_PENDING",
  BOOKING_STUDENT: process.env.SMS_TPL_BOOKING_STUDENT ?? "SMS_PENDING",
  BOOKING_COACH:   process.env.SMS_TPL_BOOKING_COACH   ?? "SMS_PENDING",
  COACH_APPROVED:  process.env.SMS_TPL_COACH_APPROVED  ?? "SMS_PENDING",
  COACH_REJECTED:  process.env.SMS_TPL_COACH_REJECTED  ?? "SMS_PENDING",
} as const;

const SIGN_NAME = "AceBook";

// ─── Client factory ───────────────────────────────────────────────────────────
function createClient(): any | null {
  const accessKeyId     = process.env.ALIYUN_SMS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIYUN_SMS_ACCESS_KEY_SECRET;
  if (!accessKeyId || !accessKeySecret) {
    console.warn("[SMS] AccessKey not configured, SMS disabled.");
    return null;
  }
  const config = new OpenApiConfig({ accessKeyId, accessKeySecret });
  config.endpoint = "dysmsapi.aliyuncs.com";
  return new Dysmsapi20170525(config);
}

// ─── Core send function ───────────────────────────────────────────────────────
async function sendSms(
  phone: string,
  templateCode: string,
  templateParam: Record<string, string> = {}
): Promise<boolean> {
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
    const req = new SendSmsRequest({
      phoneNumbers:  phone,
      signName:      SIGN_NAME,
      templateCode,
      templateParam: JSON.stringify(templateParam),
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

// ─── Business helpers ─────────────────────────────────────────────────────────

/** 登录/注册验证码 */
export async function smsSendVerifyCode(params: {
  phone: string;
  code: string;
}) {
  return sendSms(params.phone, TEMPLATES.VERIFY_CODE, { code: params.code });
}

/** 预约成功通知 → 发给学员 */
export async function smsBookingToStudent(params: {
  phone: string;
  coachName: string;
  lessonDate: string;   // YYYY-MM-DD
  startTime: string;    // HH:MM
  venueName: string;
}) {
  return sendSms(params.phone, TEMPLATES.BOOKING_STUDENT, {
    coachName:  params.coachName,
    lessonDate: params.lessonDate,
    startTime:  params.startTime,
    venueName:  params.venueName,
  });
}

/** 新预约通知 → 发给教练 */
export async function smsBookingToCoach(params: {
  phone: string;
  studentName: string;
  lessonDate: string;
  startTime: string;
  venueName: string;
}) {
  return sendSms(params.phone, TEMPLATES.BOOKING_COACH, {
    studentName: params.studentName,
    lessonDate:  params.lessonDate,
    startTime:   params.startTime,
    venueName:   params.venueName,
  });
}

/** 教练审核通过通知 */
export async function smsCoachApproved(params: { phone: string }) {
  return sendSms(params.phone, TEMPLATES.COACH_APPROVED, {});
}

/** 教练审核拒绝通知 */
export async function smsCoachRejected(params: { phone: string; reason: string }) {
  return sendSms(params.phone, TEMPLATES.COACH_REJECTED, {
    reason: params.reason || "资质材料不符合要求",
  });
}

/**
 * 预约确认后将教练手机号发给学员
 * 模板变量: coachName, coachPhone
 */
export async function smsSendCoachPhoneToStudent(params: {
  studentPhone: string;
  coachName: string;
  coachPhone: string;
}) {
  // Reuse BOOKING_STUDENT template with extra variables if template supports it,
  // otherwise send a plain text via a generic template.
  // For now we send a separate SMS using the booking_student template channel.
  // The template must include ${coachPhone} variable.
  return sendSms(params.studentPhone, TEMPLATES.BOOKING_STUDENT, {
    coachName:  params.coachName,
    coachPhone: params.coachPhone,
  });
}

/**
 * 预约确认后将学员手机号发给教练
 * 模板变量: studentName, studentPhone
 */
export async function smsSendStudentPhoneToCoach(params: {
  coachPhone: string;
  studentName: string;
  studentPhone: string;
}) {
  return sendSms(params.coachPhone, TEMPLATES.BOOKING_COACH, {
    studentName:  params.studentName,
    studentPhone: params.studentPhone,
  });
}

/**
 * 微信小程序 API 工具模块
 * - getAccessToken: 获取并缓存 access_token（有效期 2 小时，提前 5 分钟刷新）
 * - code2Session: 小程序登录 code 换取 openid + session_key
 * - getWxacode: 生成小程序码（wxacode.getUnlimited）
 */

import { ENV } from "./env";

// ─── Access Token 缓存 ────────────────────────────────────────────────────────
let _accessToken: string | null = null;
let _tokenExpiry = 0; // Unix timestamp (ms)

export async function getAccessToken(): Promise<string> {
  const now = Date.now();
  // 提前 5 分钟刷新
  if (_accessToken && now < _tokenExpiry - 5 * 60 * 1000) {
    return _accessToken;
  }

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${ENV.wechatAppId}&secret=${ENV.wechatAppSecret}`;
  const res = await fetch(url);
  const data = (await res.json()) as { access_token?: string; expires_in?: number; errcode?: number; errmsg?: string };

  if (!data.access_token) {
    throw new Error(`[WeChat] getAccessToken failed: ${JSON.stringify(data)}`);
  }

  _accessToken = data.access_token;
  _tokenExpiry = now + (data.expires_in ?? 7200) * 1000;
  return _accessToken;
}

// ─── code2Session ─────────────────────────────────────────────────────────────
export interface Code2SessionResult {
  openid: string;
  session_key: string;
  unionid?: string;
}

export async function code2Session(code: string): Promise<Code2SessionResult> {
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${ENV.wechatAppId}&secret=${ENV.wechatAppSecret}&js_code=${code}&grant_type=authorization_code`;
  const res = await fetch(url);
  const data = (await res.json()) as Code2SessionResult & { errcode?: number; errmsg?: string };

  if (data.errcode) {
    throw new Error(`[WeChat] code2Session failed: ${data.errmsg} (${data.errcode})`);
  }
  if (!data.openid) {
    throw new Error("[WeChat] code2Session: missing openid in response");
  }

  return { openid: data.openid, session_key: data.session_key, unionid: data.unionid };
}

// ─── 小程序码生成 ─────────────────────────────────────────────────────────────
export interface WxacodeOptions {
  scene: string;       // 最多 32 个可见字符，如 "matchId=123"
  page?: string;       // 小程序页面路径，如 "pages/match/detail"
  width?: number;      // 二维码宽度，默认 430px
  env_version?: "release" | "trial" | "develop";
}

/**
 * 生成小程序码（无限制），返回 PNG 图片的 Buffer
 * 使用 wxacode.getUnlimited 接口
 */
export async function getWxacode(opts: WxacodeOptions): Promise<Buffer> {
  const token = await getAccessToken();
  const url = `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${token}`;

  const body = {
    scene: opts.scene,
    page: opts.page ?? "pages/index/index",
    width: opts.width ?? 430,
    env_version: opts.env_version ?? (ENV.isProduction ? "release" : "trial"),
    check_path: false,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    // 返回 JSON 说明出错
    const err = (await res.json()) as { errcode: number; errmsg: string };
    throw new Error(`[WeChat] getWxacode failed: ${err.errmsg} (${err.errcode})`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

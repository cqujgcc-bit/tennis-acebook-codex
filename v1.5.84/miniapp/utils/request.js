// utils/request.js - tRPC 请求封装（适配 TennisPro 后端）
// 后端协议：tRPC + superjson
//   query   : GET  /api/trpc/{path}?input={JSON}
//   mutation: POST /api/trpc/{path}  body: { json: {...} }
//   返回成功: { result: { data: { json: <实际数据> } } }
//   返回失败: { error: { json: { message, code, ... } } }
//
// 登录态策略（尽量长、无感）：
//   - token 长期存于本地 storage（后端有效期 1 年）
//   - 任意请求遇到「未授权/登录失效」时，自动用 wx.login 静默重新登录拿到新 token，并重试本次请求
//   - 仅当静默重登也失败时才视为真正未登录（由页面决定是否跳登录页）

const BASE_URL = 'https://tennispro.cn';
const TRPC_PREFIX = '/api/trpc';

function getToken() {
  return wx.getStorageSync('token') || '';
}

function buildHeader() {
  const header = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) {
    header['Authorization'] = 'Bearer ' + token;
  }
  return header;
}

// 判断错误是否为「未授权/登录失效」
function isAuthError(statusCode, data) {
  if (statusCode === 401) return true;
  if (data && data.error) {
    const code =
      (data.error.json && (data.error.json.code || (data.error.json.data && data.error.json.data.code))) ||
      data.error.code;
    const httpStatus =
      data.error.json && data.error.json.data && data.error.json.data.httpStatus;
    if (code === 'UNAUTHORIZED' || httpStatus === 401) return true;
    const msg = (data.error.json && data.error.json.message) || data.error.message || '';
    if (typeof msg === 'string' && (msg.indexOf('未登录') >= 0 || msg.indexOf('登录') >= 0 && msg.indexOf('失效') >= 0)) {
      return true;
    }
  }
  return false;
}

// 静默重新登录：用 wx.login 拿 code 换取新 token（无需用户交互）
// 返回 Promise<boolean>，true 表示重登成功
let _reloginPromise = null;
function silentRelogin() {
  // 合并并发的重登请求，避免短时间内多次 wx.login
  if (_reloginPromise) return _reloginPromise;
  _reloginPromise = new Promise((resolve) => {
    wx.login({
      success: (loginRes) => {
        if (!loginRes || !loginRes.code) {
          resolve(false);
          return;
        }
        wx.request({
          url: BASE_URL + TRPC_PREFIX + '/auth.loginWithWechat',
          method: 'POST',
          header: { 'Content-Type': 'application/json' },
          data: { json: { code: loginRes.code } },
          success: (res) => {
            let token = '';
            let user = null;
            try {
              const d = res.data && res.data.result && res.data.result.data;
              const payload = d && (d.json !== undefined ? d.json : d);
              if (payload && payload.token) {
                token = payload.token;
                user = payload.user || null;
              }
            } catch (e) {}
            if (token) {
              wx.setStorageSync('token', token);
              if (user) wx.setStorageSync('userInfo', user);
              try {
                const app = getApp();
                if (app && app.globalData) {
                  app.globalData.isLogin = true;
                  if (user) app.globalData.userInfo = user;
                }
              } catch (e) {}
              resolve(true);
            } else {
              resolve(false);
            }
          },
          fail: () => resolve(false),
        });
      },
      fail: () => resolve(false),
    });
  }).then((ok) => {
    _reloginPromise = null;
    return ok;
  });
  return _reloginPromise;
}

// 统一解析 tRPC 响应
function parseTrpcResponse(statusCode, data, resolve, reject) {
  // tRPC 即使业务错误也可能返回 200，错误体在 data.error
  if (data && data.error) {
    const msg =
      (data.error.json && data.error.json.message) ||
      data.error.message ||
      '请求失败';
    reject({ message: msg, raw: data.error });
    return;
  }
  if (statusCode >= 200 && statusCode < 300) {
    // 剥掉 result.data.json 外壳
    if (data && data.result && data.result.data) {
      const d = data.result.data;
      resolve(d.json !== undefined ? d.json : d);
    } else {
      resolve(data);
    }
    return;
  }
  reject({ message: 'HTTP ' + statusCode, raw: data });
}

// 底层请求执行（单次）
function doRequest(method, url, body) {
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method,
      header: buildHeader(),
      data: body,
      success: (res) => {
        // 把 statusCode + data 一并交给上层，便于判断 auth 错误
        resolve({ statusCode: res.statusCode, data: res.data });
      },
      fail: (err) => reject({ __network: true, message: '网络异常，请检查网络', raw: err }),
    });
  });
}

// 带静默重登重试的请求包装
function requestWithRetry(method, url, body) {
  return new Promise((resolve, reject) => {
    const run = (allowRelogin) => {
      doRequest(method, url, body)
        .then((res) => {
          // 若是未授权且本地有 token（说明 token 失效），尝试静默重登并重试一次
          if (allowRelogin && isAuthError(res.statusCode, res.data) && getToken()) {
            silentRelogin().then((ok) => {
              if (ok) {
                run(false); // 重登成功后重试一次（不再递归重登）
              } else {
                // 重登失败：清掉失效 token，交由页面处理（视为未登录）
                wx.removeStorageSync('token');
                parseTrpcResponse(res.statusCode, res.data, resolve, reject);
              }
            });
            return;
          }
          parseTrpcResponse(res.statusCode, res.data, resolve, reject);
        })
        .catch((err) => reject(err && err.message ? err : { message: '网络异常，请检查网络', raw: err }));
    };
    run(true);
  });
}

// query：GET 请求
function query(path, input) {
  let url = BASE_URL + TRPC_PREFIX + '/' + path;
  // 后端启用 superjson transformer，input 需包裹为 { json: ... }
  if (input !== undefined && input !== null) {
    url += '?input=' + encodeURIComponent(JSON.stringify({ json: input }));
  }
  // 防缓存：追加时间戳，避免微信/CDN 对相同 GET URL 返回旧数据（导致退出/支付后头像、人数不刷新）
  url += (url.indexOf('?') >= 0 ? '&' : '?') + '_t=' + Date.now();
  return requestWithRetry('GET', url, undefined);
}

// mutation：POST 请求
function mutation(path, input) {
  const url = BASE_URL + TRPC_PREFIX + '/' + path;
  return requestWithRetry('POST', url, { json: input === undefined ? {} : input });
}

module.exports = {
  BASE_URL,
  getToken,
  silentRelogin,
  query,
  mutation,
};

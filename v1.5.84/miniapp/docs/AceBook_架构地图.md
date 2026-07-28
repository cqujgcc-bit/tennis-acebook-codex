# AceBook 架构地图（代码索引）

> 用途：这是 AceBook 项目的"知识地图"，让定位 bug 从"盲查半小时"变成"查图几分钟"。
> 维护者：架构师角色。每次新增/改动功能后必须同步更新本图。
> 现状基线：后端 routers.ts 6023 行；小程序权威源码 `/home/ubuntu/miniapp`；体验版 v1.5.11。

---

## 一、系统全景

```
┌─────────────────────────────────────────────────────────┐
│  微信小程序（用户端，核心场景）                              │
│  权威源码：云电脑 /home/ubuntu/miniapp（微信原生）          │
│  请求封装：utils/request.js（tRPC 封装） → utils/api.js     │
└───────────────────────────┬─────────────────────────────┘
                            │ HTTPS  https://tennispro.cn/api/trpc/{path}
                            ▼
┌─────────────────────────────────────────────────────────┐
│  阿里云 ECS  120.78.0.96                                    │
│  反代：Nginx tennispro.cn → 127.0.0.1:3001                 │
│  应用：PM2 进程 tennispro-new（端口 3001，fork 模式）        │
│  目录：/var/www/tennispro-new                              │
│    ├─ dist/index.js     （esbuild 打包产物，实际运行）       │
│    ├─ server/routers.ts （后端唯一权威源码，6023 行）        │
│    └─ drizzle/schema.ts （38 张表定义）                     │
│  旧版保留：PM2 tennispro（端口 3000，勿动，可秒级回滚）       │
└───────────────────────────┬─────────────────────────────┘
                            ▼
                   MySQL 数据库 tennispro（新旧版共用）
```

**关键事实（排错前必读）**
- 后端运行的是 `dist/index.js`（esbuild 产物），改 `server/routers.ts` 后必须重新 build 才生效。
- 构建命令关键参数：`--packages=external --format=esm --outdir=dist`（漏了会把前端依赖打进来报错）。
- ECS 内存约 1.8G 且无 swap，**全量 tsc 会 OOM（exit 137）**；类型检查不要在 ECS 跑全量。
- tRPC + superjson：GET 带参 `?input={"json":{...}}`；POST body `{"json":{...}}`；返回剥壳 `result.data.json`。
- 受保护接口需 `Authorization: Bearer <jwt>`。

---

## 二、小程序页面清单（18 个）

| 页面目录 | 作用 | tabBar |
|---|---|---|
| index | 首页（hero、征集中球局入口） | ✅ 首页 |
| booking | 约球列表（球局浏览/筛选） | ✅ 约球 |
| courses | 约课列表 | ✅ 约课 |
| circle | 圈子列表（我的圈子） | ✅ 圈子 |
| profile | 我的（资料、信用分、钱包入口） | ✅ 我的 |
| login | 微信登录 + 绑手机号 + 头像/性别 | |
| game-detail | 球局详情（报名、候补、群聊入口、支付确认） | |
| create-game | 发起球局 | |
| chat | 局内群聊 | |
| circle-detail | 圈子详情（动态、成员、入圈审核、解散） | |
| circle-activities | 圈子活动列表（报名活动） | |
| activity-create | 发起圈子活动（含模板、批量多周） | |
| activity-settle | 活动赛后 AA 结算 | |
| notifications | 通知中心 | |
| wallet | 钱包 | |
| replace | 替补转让（接受邀请、支付） | |
| about | 关于 | |
| venues | 找场地（官方小程序预订平台跳转清单） | |

---

## 三、页面 ↔ 接口 ↔ 数据表 三向映射（核心索引）

> 排错时：先确定现象在哪个**页面** → 查它调用的**接口** → 接口操作的**表**，逐层缩小。

| 页面 | 调用的后端接口 | 主要相关数据表 |
|---|---|---|
| booking | match.list | tennis_matches, match_participants |
| game-detail | match.getById / join / leave / joinWaitlist / leaveWaitlist / myWaitlistPosition / confirmPayment / createReplaceInvite | tennis_matches, match_participants, match_orders, match_replace_invites, payments |
| create-game | match.create | tennis_matches |
| chat | match.getMessages / sendMessage | match_messages |
| replace | match.getReplaceInvite / acceptReplaceInvite / createPayOrder / confirmPayment | match_replace_invites, match_orders, payments |
| circle | circle.myCircles | circles, circle_members |
| circle-detail | circle.listJoinRequests / pendingRequestCount / reviewJoinRequest（动态/成员/解散等） | circles, circle_members, circle_posts, circle_join_requests |
| circle-activities | circle.getActivities / signupActivity | circle_activities, circle_activity_signups |
| activity-create | circle.getTemplates / createTemplate / deleteTemplate / createActivity | activity_templates, circle_activities |
| activity-settle | circle.getActivitySettlement / settleActivity / payActivityShare / confirmActivityPayment | circle_activities, circle_activity_signups, match_settlements, payments |
| login | auth.loginWithWechat / user.updateNtrpLevel | users, sms_codes |
| profile | user.updateProfile / myStats / getCreditLogs | users, credit_logs |
| notifications | notification.list / markRead / markAllRead | notifications |
| courses | coach.list / package.* | coach_profiles, lesson_packages, student_packages |
| venues | （纯前端跳转，无后端） | — |

---

## 四、后端路由命名空间（14 个）速查

| 命名空间 | 主要方法 | 行号锚点(routers.ts) |
|---|---|---|
| auth | me, loginWithWechat, miniLoginWith*, sendSmsCode, saveWechatOpenid | ~193 |
| coach | list, getById, getBySlug, createProfile | ~742 |
| match | list, getById, create, join, leave, joinWaitlist, approveWaitlist, replaceSelf, createReplaceInvite, acceptReplaceInvite, cancel, createPayOrder, confirmPayment, confirmMatchComplete, disputeSettlement, getMessages, sendMessage | ~1346 |
| package | listByCoach, buy, myPackages, requestRefund | ~2959 |
| user | myStats, updateNtrpLevel, updateProfile, getPublicProfile, getCreditLogs, getWxacode | ~3029 |
| venue | list, getById, create | ~3210 |
| booking | myBookings, getById, create | ~3244 |
| notification | list, markRead, markAllRead, unreadCount, delete | ~3490 |
| coupon | validate | ~3521 |
| admin | （后台管理系列） | ~3548 |
| feedback | submit, myList, adminList, pendingCount, reply | ~4265 |
| circle | create, myCircles, join, leave, createPost, getPosts, getActivities, createActivity, signupActivity, settleActivity, payActivityShare, confirmActivityPayment, getTemplates, dismissCircle, reviewJoinRequest 等（最大模块） | 4317–5687 |
| coachPortal | （教练端） | 5687 |
| partnerVenue | （合作场馆） | 5835 |

---

## 五、数据表清单（38 张）按域归类

- **用户/账户**：users, sms_codes, credit_logs, coupons, coupon_usages, invite_usages
- **球局（约球）**：tennis_matches, match_participants, match_messages, match_orders, match_settlements, match_replace_invites, match_reviews, reviews
- **支付**：payments
- **圈子**：circles, circle_members, circle_posts, circle_post_likes, circle_post_comments, circle_checkins, circle_join_requests, circle_activities, circle_activity_signups, activity_templates
- **教练/课程**：coach_profiles, coach_availability, coach_locations, coach_venues, lesson_packages, student_packages, package_deductions
- **场馆/预订**：venues, venue_available_slots, partner_venues, bookings
- **通知/反馈**：notifications, feedbacks

---

## 六、关键文件锚点（高频排错位置）

### 小程序 booking 页（约球列表，本次修复重灾区）
文件：`/home/ubuntu/miniapp/pages/booking/booking.js`

| 函数 | 行号 | 作用 | 排错提示 |
|---|---|---|---|
| isSameNaturalDay | 5 | 判断是否同一自然日 | 控制"当天可见" |
| computeCountdown | 16 | 算倒计时/状态（含"今日已打"） | 状态文案异常看这里 |
| decorate | 61 | 给列表项加展示字段 | 字段缺失看这里 |
| onLoad / onShow | 153 / 157 | onShow 每次刷新 | "列表不更新"看这里 |
| refreshCountdown | 185 | 60秒刷新文案并重过滤 | |
| loadMatches | 203 | 拉取 match.list | "拉不到数据"看这里 |
| applyFilter / isHistory | 271 / 277 | tab 过滤、历史判定 | **"球局消失"看这里** |

### 请求层
- `/home/ubuntu/miniapp/utils/request.js`：tRPC 封装、BASE_URL
- `/home/ubuntu/miniapp/utils/api.js`：所有业务接口定义
- `/home/ubuntu/miniapp/app.js`：globalData.apiBaseUrl
- `/home/ubuntu/miniapp/app.json`：页面注册、tabBar、`lazyCodeLoading`（勿删，否则真机白屏）

---

## 七、常见问题定位速查表（最实用）

| 现象 | 第一嫌疑位置 | 说明 |
|---|---|---|
| 球局/活动从列表"消失" | booking.js `isHistory`(277) / `computeCountdown`(16) | 多为按时间归入历史；当天的局当天可见 |
| 刚发布的内容看不到、状态不更新 | booking.js `onShow`(157) 是否刷新 | onShow 应每次 loadMatches |
| 真机白屏、`__wxAppCode__` 报错 | app.json `lazyCodeLoading` 是否存在 | 该配置勿删 |
| 接口报"请先登录"但已登录 | 请求未带 Authorization / token 失效 | 检查 request.js 注入 jwt |
| 带参 GET 接口报参数错误 | input 未包 `json` 层 | tRPC+superjson 要求 `?input={"json":{...}}` |
| 改了 routers.ts 不生效 | 未重新 build dist/index.js | esbuild 重建 + pm2 restart |
| 构建报缺 vite/tailwind 依赖 | esbuild 漏了 `--packages=external` | 用完整构建参数 |
| 后端构建被 kill(137) | ECS 内存不足 OOM | 别在 ECS 跑全量 tsc |
| 报名/付款记录在但前端看不到 | 多为前端展示过滤，先查库确认数据未丢 | 数据在 = 前端问题 |
| settlement-cron 启动报错 | 历史遗留，try/catch 兜底 | 无害，与业务无关 |

---

## 八、部署与发布速查

| 事项 | 命令/位置 |
|---|---|
| ECS 登录 | root@120.78.0.96 / Tennis@Ace2026 |
| 后端目录 | /var/www/tennispro-new |
| 重启后端 | `pm2 restart tennispro-new` |
| 后端构建 | esbuild + `--packages=external --format=esm --outdir=dist` |
| 小程序权威源码 | 云电脑 /home/ubuntu/miniapp |
| 上传体验版 | 云电脑 `node upload_v15xx.js`（私钥 /home/ubuntu/private.wx517c76b146302fe5.key） |
| 生成预览码 | 云电脑 `node preview_v15xx.js` |
| 小程序仓库 | github.com/cqujgcc-bit/acebook-miniapp（沙箱 gh 推送） |
| 后端仓库 | github.com/cqujgcc-bit/TennisPro-Monorepo |
| 运维记录 | 云电脑 /home/ubuntu/AGENTS.md（每次变更必登记） |

---

## 九、铁律（防止重蹈覆辙）

1. **数据先于代码**：报"消失/丢失"先查数据库确认数据是否真在，再判断前端/后端。
2. **改后端必重建 dist**：源码改了不 build 等于没改。
3. **改完必测**：用真实数据复现多个时刻/场景（如这次球局修复验证 5 个时刻）。
4. **部署后必 commit 回 GitHub**：避免仓库落后于线上（曾出现 routers.ts 仓库 5726 行 / 线上 6023 行的错位）。
5. **不误伤**：明确改动边界，不动 tabBar、支付、无关页面。

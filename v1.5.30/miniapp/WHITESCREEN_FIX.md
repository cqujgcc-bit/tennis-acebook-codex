# 真机白屏问题复盘与修复说明

## 问题现象
- 开发者工具模拟器（含基础库 3.16.1）一切正常，能加载真实后端数据；
- 真机（iOS 26.5.1 / 微信 8.0.74 / 基础库 3.16.1）打开小程序后**整页白屏**。

## 真机报错（vConsole 实测）
```
SystemError (jsEngineScriptError)
Can't find variable: __wxAppCode__
ReferenceError: Can't find variable: __wxAppCode__
  at recurseUsingComponents (WASubContext.js:1:426771)
  at injectComponentsRecursively (WASubContext.js:1:430607)
  ...
routeDone with a webviewId 344 is not found
undefined is not an object (evaluating 'e.webviewId')
timeout
```

## 根本原因
本项目为**纯原生、无分包、无自定义组件**。微信新版基础库（3.16.1）在**未启用「按需注入」**时，对页面组件进行递归注入（`recurseUsingComponents` / `injectComponentsRecursively`）存在兼容性 bug：真机加载首页时承载 `__wxAppCode__` 的框架注入代码未能正确生成/加载，导致整页白屏，并连锁触发 `routeDone webviewId not found`、`timeout` 等错误。

模拟器与真机是两套代码注入实现，因此模拟器不复现，只有真机白屏。

## 修复方案（已生效）
在 `app.json` 中加入以下配置，启用「按需注入」，绕过该注入 bug：

```json
"lazyCodeLoading": "requiredComponents"
```

真机扫码验证：首页、推荐球局列表、底部 5 个 tab、真实后端数据均正常渲染，白屏消失。

## 重要提醒（请勿误删）
- **`app.json` 中的 `"lazyCodeLoading": "requiredComponents"` 是白屏修复的关键配置，任何情况下都不要删除。**
- 若后续新增「自定义组件」，按需注入模式下需确保组件在使用它的页面 `usingComponents` 里正确声明（本项目当前无自定义组件，不受影响）。

## 排查中排除的非根因（备查）
- JS 语法 / 模块加载阶段抛错：无；
- WXML 未声明组件标签：无；
- app.wxss / 各页面 wxss 真机不兼容写法：无；
- 编译产物（含 ES6→ES5 babel 转换、@babel/runtime helper）：正常；
- 关闭 es6 转换链路：真机仍白屏（排除编译转换假设）；
- project.config.json：合法完整；
- tabBar 图标格式：非根因。

修复日期：2026-06-22

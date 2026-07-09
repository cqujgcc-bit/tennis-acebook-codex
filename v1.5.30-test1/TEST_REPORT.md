# v1.5.30-test1 — activity-create 功能验证报告

> 日期：2026-07-09
> 范围：仅 v1.5.30 activity-create 页面
> 测试方法：代码审查（静态逻辑分析）

## 审查项与结论

| # | 审查项 | 结论 | 说明 |
|---|--------|------|------|
| 1 | 人数步进器边界（2–30） | ⚠️ 发现问题 → 已修复 | `onStepMax` 边界正确；但模板填充 `onPickTemplate` 未 clamp，可超出范围 |
| 2 | 费用模式切换（free/aa） | ✅ 正常 | `onFeeMode` 读取 `data-mode`，切换与提示文案均正确 |
| 3 | 快捷日期高亮 | ⚠️ 发现问题 → 已修复 | 初始 `activityDate`=今天但 `quickDate` 为空，"今天"不高亮 |
| 4 | 日期 picker 显示 | ⚠️ 发现问题 → 已修复 | 选中今天时显示"选其他日期"而非日期值 |
| 5 | 重复发布周数映射 | ✅ 正常 | index 0→0周, 1→2周…7→8周，逻辑正确 |
| 6 | 提交校验（标题≥2字/日期） | ✅ 正常 | 校验顺序与防重复提交均正确 |
| 7 | 模板填充一致性 | ⚠️ 部分问题 → 已修复 | 人数未 clamp 已修；其余字段填充正确 |
| 8 | `onLoad` quickDate 初始化 | ⚠️ 死代码 → 已修复 | `today === options.prefill ? '' : ''` 无论条件均为空串 |

## 修复详情

### Fix 1 — onLoad quickDate 初始化（activity-create.js:37）
```diff
- quickDate: today === options.prefill ? '' : '',
+ quickDate: 'today',
```
**原因**：初始 `activityDate` 设为今天，`quickDate` 应同步为 `'today'` 使"今天"按钮高亮。原三元表达式两分支均为空串，是无效死代码。

### Fix 2 — onMaxChange clamp（activity-create.js:62-66）
```diff
- onMaxChange: function (e) { this.setData({ maxParticipants: Number(e.detail.value) || 20 }); },
+ onMaxChange: function (e) {
+   var v = Number(e.detail.value) || 20;
+   v = Math.max(2, Math.min(30, v));
+   this.setData({ maxParticipants: v });
+ },
```
**原因**：防御性修复，确保任何路径设置人数都在 2–30 范围内。

### Fix 3 — onPickTemplate 人数 clamp（activity-create.js:105）
```diff
- maxParticipants: t.maxParticipants || 20,
+ maxParticipants: Math.max(2, Math.min(30, t.maxParticipants || 20)),
```
**原因**：模板数据可能包含超出 2–30 的值（如旧数据或后端未校验），填充时需 clamp。

### Fix 4 — 日期 picker 显示文案（activity-create.wxml:53）
```diff
- {{activityDate && activityDate !== todayDate ? activityDate : '选其他日期 ▾'}}
+ {{activityDate || '选其他日期 ▾'}}
```
**原因**：原逻辑在选中今天时显示"选其他日期"而非日期值，状态不直观。修复后始终显示已选日期，仅在无值时显示提示。

## 未修改项（已确认正确）

- **费用模式切换**：`onFeeMode` + WXML `fee-on` class 切换，AA/免费提示文案，逻辑完整
- **步进器按钮**：`onStepMax` 中 `Math.min(val+1, 30)` / `Math.max(val-1, 2)`，边界正确
- **重复发布**：`onRepeatChange` 的 index→weeks 映射，提交时 `repeatWeeks` 传参正确
- **提交防重**：`submitting` 标志位 + 提前 return，正确
- **模板删除**：`catchtap` 阻止冒泡 + `showModal` 确认，正确

## 验证

- JS 括号平衡检查：open=184 close=184 ✅
- 文件完整性：activity-create.js/wxml/wxss/json 均在 ✅

## 存档内容

```
v1.5.30-test1/
├── TEST_REPORT.md      ← 本文件
└── miniapp/            ← 修复后完整源码
```

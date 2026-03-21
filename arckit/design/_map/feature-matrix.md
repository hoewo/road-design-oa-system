# 设计线框图矩阵

与 INDEX.md 同步维护；状态变更时同步更新本表与 INDEX。

| 路径 | 简述 | 状态 | 行数 |
|------|------|------|------|
| auth/default.html | 登录页：分栏品牌/表单、Segmented、验证码态、错误、处理中、小屏堆叠 | ✅ | 241 |
| project-list/default.html | 项目列表：列表、搜索筛选、新建入口 | ✅ | 195 |
| project-detail/basic.html | 基本信息标签页：项目信息、负责人、甲方 | ✅ | 253 |
| project-detail/business.html | 经营信息标签页：合同、支付、开票、招投标、奖金 | ✅ | 295 |
| project-detail/production.html | 生产信息标签页：生产人员、阶段文件、成本、委托 | ✅ | 355 |
| company-revenue/default.html | 公司收入页：总应收、发票/支付汇总、管理费 | ✅ | 537 |
| file-management/default.html | 文件管理页：按项目/类型/时间搜索、上传下载 | ✅ | 734 |
| approval-audit/default.html | 批复审计页：报告上传、金额录入、历史记录 | 🟡 | 613 |
| stage-files/scheme.html | 方案阶段：方案文件、校审单、评分 | 🟡 | 379 |
| stage-files/preliminary-design.html | 初步设计阶段：初设文件、校审单、评分 | 🟡 | 379 |
| stage-files/construction-drawing.html | 施工图设计阶段：施工图文件、校审单、评分 | 🟡 | 396 |
| stage-files/change-negotiation.html | 变更洽商阶段：变更洽商文件上传 | 🟡 | 306 |
| stage-files/completion-acceptance.html | 竣工验收阶段：竣工验收文件上传 | 🟡 | 307 |
| production-cost/default.html | 生产成本页：打车/住宿/公共交通、统计 | 🟡 | 351 |
| external-commission/default.html | 对外委托页：委托类型、评分、合同、支付 | 🟡 | 401 |
| production-bonus/default.html | 生产奖金页：发放人员、金额、时间 | 🟡 | 366 |

状态：✅ 已完成 | 🟡 进行中 | ⚪ 计划中 | 🔴 已废弃

**说明**：company-revenue/default.html(537)、file-management/default.html(734)、approval-audit/default.html(613) 超过 500 行，建议按区域/状态拆分子视图后再续改。

# 设计索引

✅ 已完成 | 🟡 进行中 | ⚪ 计划中 | 🔴 已废弃

- auth/ 认证流程：验证码登录页面、错误状态、加载状态。✅
  - default.html 登录页：验证码输入、加载状态、错误提示。✅ (119行)
- project-list/ 项目列表：项目列表正常态、空态、加载态。✅
  - default.html 项目列表页：列表展示、搜索筛选、新建入口。✅ (195行)
- project-detail/ 项目详情：基本信息、经营信息、生产信息三个标签页。✅
  - basic.html 基本信息标签页：项目基本信息、负责人配置、甲方信息。✅ (253行)
  - business.html 经营信息标签页：合同、支付、开票、招投标、奖金等。✅ (295行)
  - production.html 生产信息标签页：生产人员、阶段文件、成本、委托等。✅ (355行)
- company-revenue/ 公司收入管理：有权限/无权限/空状态。✅
  - default.html 公司收入页：总应收、发票汇总、支付汇总、管理费设置。✅ (537行)
- file-management/ 文件管理：文件列表正常态、空态、错误态。✅
  - default.html 文件管理页：按项目/类型/时间搜索、上传下载。✅ (734行)
- approval-audit/ 批复审计管理：批复/审计信息录入与查看。🟡
  - default.html 批复审计页：报告上传、金额录入、历史记录。🟡 (613行)
- stage-files/ 生产阶段文件管理：各阶段文件上传与管理。🟡
  - scheme.html 方案阶段：方案文件、校审单、评分。🟡 (379行)
  - preliminary-design.html 初步设计阶段：初步设计文件、校审单、评分。🟡 (379行)
  - construction-drawing.html 施工图设计阶段：施工图文件、校审单、评分。🟡 (396行)
  - change-negotiation.html 变更洽商阶段：变更洽商文件上传。🟡 (306行)
  - completion-acceptance.html 竣工验收阶段：竣工验收文件上传。🟡 (307行)
- production-cost/ 生产成本管理：成本录入与发票上传。🟡
  - default.html 生产成本页：打车/住宿/公共交通成本记录、统计。🟡 (351行)
- external-commission/ 对外委托管理：委托信息与支付记录。🟡
  - default.html 对外委托页：委托类型、评分、委托合同、支付记录。🟡 (401行)
- production-bonus/ 生产奖金分配：奖金发放记录。🟡
  - default.html 生产奖金页：发放人员、金额、时间记录。🟡 (366行)

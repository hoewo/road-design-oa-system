/**
 * 全站品牌展示常量（登录页品牌区、已登录壳层 Header 等共用单源）。
 * 合规锚点：arckit/spec/login-page-branding.md §1；素材说明：frontend/public/branding/README.md
 */
export const COMPANY_FULL_NAME = '北京京宏勘察设计有限公司'

/** public/ 下路径，开发与生产均从站点根路径提供 */
export const BRAND_LOGO_SRC = '/branding/jinghong-logo.png'

/**
 * Logo 的 img `alt`。在已并列展示 `COMPANY_FULL_NAME`（登录区 Title 或顶栏内联文案）的场景下须为空字符串，
 * 避免辅读软件重复朗读同一组织名（HTML / WCAG：冗余图像与邻近文本替代）。
 * 若未来存在「仅 Logo、无公司名字面文案」的界面，应另设语义化替代文本，而非复用本常量在彼处凑合。
 */
export const BRAND_LOGO_ALT = ''

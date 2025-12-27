import SwiftUI

// MARK: - iOS 系统风格设计令牌
// 本文件定义了复刻 iOS 系统应用所需的所有设计令牌

/// iOS 设计令牌命名空间
enum DesignTokens {
    
    // MARK: - 颜色系统
    enum Colors {
        
        /// 文本颜色（自动适配深浅色模式）
        enum Text {
            static let primary = Color(uiColor: .label)           // 主要文本
            static let secondary = Color(uiColor: .secondaryLabel)       // 次要文本
            static let tertiary = Color(uiColor: .tertiaryLabel)         // 三级文本
            
            // 使用系统标签颜色
            static let label = Color(uiColor: .label)
            static let secondaryLabel = Color(uiColor: .secondaryLabel)
            static let tertiaryLabel = Color(uiColor: .tertiaryLabel)
            static let quaternaryLabel = Color(uiColor: .quaternaryLabel)
        }
        
        /// 背景颜色
        enum Background {
            static let primary = Color(uiColor: .systemBackground)
            static let secondary = Color(uiColor: .secondarySystemBackground)
            static let tertiary = Color(uiColor: .tertiarySystemBackground)
            
            // 分组背景
            static let grouped = Color(uiColor: .systemGroupedBackground)
            static let secondaryGrouped = Color(uiColor: .secondarySystemGroupedBackground)
            static let tertiaryGrouped = Color(uiColor: .tertiarySystemGroupedBackground)
        }
        
        /// 健康 App 渐变色
        enum HealthGradient {
            static let pinkStart = Color(red: 0.99, green: 0.75, blue: 0.79)
            static let blueEnd = Color(red: 0.74, green: 0.89, blue: 1.0)
            
            static var gradient: LinearGradient {
                LinearGradient(
                    colors: [pinkStart, blueEnd],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            }
        }
        
        /// iOS 系统蓝色
        enum SystemBlue {
            static let primary = Color(red: 0.11, green: 0.46, blue: 0.98)
            static let light = Color(red: 0.31, green: 0.71, blue: 1.0)
            static let dark = Color(red: 0.05, green: 0.45, blue: 0.94)
        }
    }
    
    // MARK: - 字体系统
    enum Typography {
        
        /// 页面标题
        static let pageTitle = Font.system(size: 38, weight: .bold)
        
        /// 卡片标题
        static let cardTitle = Font.system(size: 20, weight: .semibold)
        
        /// 次级标题
        static let subtitle = Font.system(size: 18, weight: .semibold)
        
        /// 正文
        static let body = Font.system(size: 17, weight: .regular)
        
        /// 说明文字
        static let caption = Font.system(size: 15, weight: .regular)
        
        /// 按钮文字
        static let button = Font.system(size: 15, weight: .semibold)
        
        /// 小文字
        static let footnote = Font.system(size: 13, weight: .regular)
        
        /// 标签文字
        static let label = Font.system(size: 12, weight: .regular)
        
        /// 动态字体（推荐）
        enum Dynamic {
            static let largeTitle = Font.largeTitle
            static let title = Font.title
            static let title2 = Font.title2
            static let title3 = Font.title3
            static let headline = Font.headline
            static let body = Font.body
            static let callout = Font.callout
            static let subheadline = Font.subheadline
            static let footnote = Font.footnote
            static let caption = Font.caption
            static let caption2 = Font.caption2
        }
    }
    
    // MARK: - 间距系统
    enum Spacing {
        
        /// 最小间距
        static let xs: CGFloat = 4
        
        /// 小间距
        static let sm: CGFloat = 8
        
        /// 中等间距
        static let md: CGFloat = 12
        
        /// 标准间距
        static let base: CGFloat = 16
        
        /// 大间距
        static let lg: CGFloat = 20
        
        /// 超大间距
        static let xl: CGFloat = 24
        
        /// 巨大间距
        static let xxl: CGFloat = 32
        
        /// 页面级间距
        enum Page {
            static let horizontal: CGFloat = 24
            static let vertical: CGFloat = 20
            static let bottom: CGFloat = 80  // 避开 TabBar
        }
        
        /// 卡片间距
        enum Card {
            static let padding: CGFloat = 20
            static let spacing: CGFloat = 20  // 卡片之间
            
            /// 通知卡片横幅内边距
            static let bannerPadding: CGFloat = 16
            
            /// 卡片四周等宽边距（用于图标、按钮等）
            static let uniformPadding: CGFloat = 16
        }
        
        /// 元素间距
        enum Element {
            static let compact: CGFloat = 8
            static let regular: CGFloat = 12
            static let relaxed: CGFloat = 16
        }
    }
    
    // MARK: - 圆角系统
    enum CornerRadius {
        
        /// 小圆角
        static let sm: CGFloat = 10
        
        /// 中等圆角
        static let md: CGFloat = 12
        
        /// 按钮圆角
        static let button: CGFloat = 14
        
        /// 卡片圆角
        static let card: CGFloat = 16
        
        /// 大卡片圆角
        static let largeCard: CGFloat = 20
        
        /// 超大圆角
        static let xl: CGFloat = 28
        
        /// 创建连续曲线圆角形状（iOS 标准）
        static func continuous(_ radius: CGFloat) -> RoundedRectangle {
            RoundedRectangle(cornerRadius: radius, style: .continuous)
        }
    }
    
    // MARK: - 阴影系统
    enum Shadow {
        
        /// 轻微阴影
        static let light = ShadowStyle(
            color: .black.opacity(0.05),
            radius: 10,
            x: 0,
            y: 5
        )
        
        /// 标准阴影
        static let medium = ShadowStyle(
            color: .black.opacity(0.08),
            radius: 15,
            x: 0,
            y: 8
        )
        
        /// 较强阴影
        static let heavy = ShadowStyle(
            color: .black.opacity(0.12),
            radius: 20,
            x: 0,
            y: 10
        )
        
        /// 卡片阴影
        static let card = medium
        
        /// 浮动按钮阴影
        static let floating = ShadowStyle(
            color: .black.opacity(0.1),
            radius: 12,
            x: 0,
            y: 6
        )
    }
    
    // MARK: - 阴影样式结构
    struct ShadowStyle {
        let color: Color
        let radius: CGFloat
        let x: CGFloat
        let y: CGFloat
    }
}

// MARK: - View Extension - 便捷应用设计令牌

extension View {
    
    /// 应用标准卡片样式
    func cardStyle(
        padding: CGFloat = DesignTokens.Spacing.Card.padding,
        cornerRadius: CGFloat = DesignTokens.CornerRadius.largeCard
    ) -> some View {
        self
            .padding(padding)
            .background(
                DesignTokens.CornerRadius.continuous(cornerRadius)
                    .fill(DesignTokens.Colors.Background.primary)
            )
            .applyShadow(DesignTokens.Shadow.card)
    }
    
    /// 应用阴影
    func applyShadow(_ style: DesignTokens.ShadowStyle) -> some View {
        self.shadow(
            color: style.color,
            radius: style.radius,
            x: style.x,
            y: style.y
        )
    }
    
    /// 应用标准按钮样式
    func buttonStyle(
        foreground: Color = .white,
        background: Color = DesignTokens.Colors.SystemBlue.primary,
        cornerRadius: CGFloat = DesignTokens.CornerRadius.button
    ) -> some View {
        self
            .font(DesignTokens.Typography.button)
            .foregroundStyle(foreground)
            .padding(.horizontal, 18)
            .padding(.vertical, 9)
            .background(
                DesignTokens.CornerRadius.continuous(cornerRadius)
                    .fill(background)
            )
    }
}

// MARK: - 卡片组件库

/// 通知卡片（带黄色横幅和关闭按钮）
struct NotificationCard<Content: View>: View {
    let title: String
    let date: String
    let onClose: () -> Void
    @ViewBuilder let content: Content
    
    var body: some View {
        VStack(spacing: 0) {
            // 黄色横幅标题栏
            HStack(spacing: 0) {
                // 左侧图标和标题
                HStack(spacing: 8) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(.orange)
                    
                    Text(title)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(DesignTokens.Colors.Text.primary)
                }
                .padding(.leading, DesignTokens.Spacing.Card.uniformPadding)
                
                Spacer()
                
                // 右侧日期和关闭按钮 - 等宽边距
                HStack(spacing: 12) {
                    Text(date)
                        .font(.system(size: 15))
                        .foregroundStyle(DesignTokens.Colors.Text.secondary)
                    
                    // 圆形关闭按钮
                    Button(action: onClose) {
                        Image(systemName: "xmark")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(DesignTokens.Colors.Text.secondary)
                            .frame(width: 28, height: 28)
                            .background(
                                Circle()
                                    .fill(Color.black.opacity(0.05))
                            )
                    }
                    .buttonStyle(.plain)
                }
                .padding(.trailing, DesignTokens.Spacing.Card.uniformPadding)
            }
            .frame(height: 44)
            .background(Color.yellow)
            
            // 白色内容区
            content
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(DesignTokens.Colors.Background.primary)
        }
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .applyShadow(DesignTokens.Shadow.card)
    }
}

/// 常规卡片（标准白色卡片）
struct RegularCard<Content: View>: View {
    let padding: CGFloat
    @ViewBuilder let content: Content
    
    init(padding: CGFloat = DesignTokens.Spacing.Card.padding, @ViewBuilder content: () -> Content) {
        self.padding = padding
        self.content = content()
    }
    
    var body: some View {
        content
            .padding(padding)
            .background(
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .fill(DesignTokens.Colors.Background.primary)
            )
            .applyShadow(DesignTokens.Shadow.card)
    }
}

/// 弹窗卡片（居中显示，带圆角图标）
struct DialogCard<Content: View>: View {
    let icon: String
    let iconColor: Color
    @ViewBuilder let content: Content
    
    var body: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            // 圆角图标
            Image(systemName: icon)
                .font(.system(size: 48))
                .foregroundStyle(iconColor)
                .frame(width: 80, height: 80)
                .background(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .fill(iconColor.opacity(0.15))
                )
            
            content
        }
        .padding(DesignTokens.Spacing.xl)
        .background(
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .fill(DesignTokens.Colors.Background.primary)
        )
        .applyShadow(DesignTokens.Shadow.heavy)
    }
}

/// 列表项卡片
struct ListItemCard: View {
    let icon: String?
    let title: String
    let subtitle: String?
    let iconColor: Color
    let showChevron: Bool
    let action: () -> Void
    
    init(
        icon: String? = nil,
        title: String,
        subtitle: String? = nil,
        iconColor: Color = .blue,
        showChevron: Bool = true,
        action: @escaping () -> Void = {}
    ) {
        self.icon = icon
        self.title = title
        self.subtitle = subtitle
        self.iconColor = iconColor
        self.showChevron = showChevron
        self.action = action
    }
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: DesignTokens.Spacing.base) {
                // 左侧图标（等宽边距）
                if let icon = icon {
                    Image(systemName: icon)
                        .font(.system(size: 28))
                        .foregroundStyle(iconColor)
                        .frame(width: 48, height: 48)
                        .background(
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .fill(iconColor.opacity(0.15))
                        )
                }
                
                // 标题和副标题
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(DesignTokens.Colors.Text.primary)
                    
                    if let subtitle = subtitle {
                        Text(subtitle)
                            .font(.system(size: 14))
                            .foregroundStyle(DesignTokens.Colors.Text.secondary)
                            .lineLimit(2)
                    }
                }
                
                Spacer()
                
                // 右侧箭头（等宽边距）
                if showChevron {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(DesignTokens.Colors.Text.tertiary)
                }
            }
            .padding(DesignTokens.Spacing.Card.uniformPadding)
        }
        .buttonStyle(.plain)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(DesignTokens.Colors.Background.primary)
        )
        .applyShadow(DesignTokens.Shadow.light)
    }
}

// MARK: - 使用示例

#Preview("设计令牌示例") {
    ScrollView {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
            
            // 页面标题
            Text("设计令牌示例")
                .font(DesignTokens.Typography.pageTitle)
                .foregroundStyle(DesignTokens.Colors.Text.primary)
            
            // 标准卡片
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                Text("卡片标题")
                    .font(DesignTokens.Typography.cardTitle)
                    .foregroundStyle(DesignTokens.Colors.Text.primary)
                
                Text("这是一段描述文字，使用次要文本颜色。")
                    .font(DesignTokens.Typography.caption)
                    .foregroundStyle(DesignTokens.Colors.Text.secondary)
                
                Button(action: {}) {
                    Text("操作按钮")
                        .buttonStyle()
                }
                .buttonStyle(.plain)
            }
            .cardStyle()
            
            // 带图标的卡片
            HStack(alignment: .top, spacing: DesignTokens.Spacing.base) {
                Image(systemName: "heart.fill")
                    .font(.system(size: 42))
                    .foregroundStyle(DesignTokens.Colors.SystemBlue.primary)
                
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                    Text("图标卡片")
                        .font(DesignTokens.Typography.subtitle)
                    
                    Text("左侧带有图标的卡片样式")
                        .font(DesignTokens.Typography.caption)
                        .foregroundStyle(DesignTokens.Colors.Text.secondary)
                }
            }
            .cardStyle()
            
            // 颜色展示
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                Text("颜色系统")
                    .font(DesignTokens.Typography.cardTitle)
                
                HStack(spacing: DesignTokens.Spacing.sm) {
                    colorSwatch("主要", DesignTokens.Colors.SystemBlue.primary)
                    colorSwatch("浅色", DesignTokens.Colors.SystemBlue.light)
                    colorSwatch("深色", DesignTokens.Colors.SystemBlue.dark)
                }
            }
            .cardStyle()
        }
        .padding(DesignTokens.Spacing.Page.horizontal)
    }
    .background(DesignTokens.Colors.Background.secondary)
}

// 辅助视图：颜色色块
private func colorSwatch(_ title: String, _ color: Color) -> some View {
    VStack(spacing: 4) {
        RoundedRectangle(cornerRadius: 8, style: .continuous)
            .fill(color)
            .frame(width: 60, height: 60)
        
        Text(title)
            .font(.system(size: 12))
            .foregroundStyle(.secondary)
    }
}


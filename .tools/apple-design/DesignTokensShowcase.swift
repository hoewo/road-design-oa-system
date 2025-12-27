import SwiftUI

// MARK: - 设计令牌展示页面
// 可以查看所有设计令牌的实际效果

struct DesignTokensShowcase: View {
    @State private var searchText = ""
    
    var body: some View {
        TabView {
            Tab("颜色", systemImage: "paintpalette.fill") {
                ColorsShowcase()
            }
            
            Tab("字体", systemImage: "textformat") {
                TypographyShowcase()
            }
            
            Tab("卡片", systemImage: "rectangle.stack.fill") {
                CardsShowcase()
            }
            
            Tab("组件", systemImage: "square.grid.2x2.fill") {
                ComponentsShowcase()
            }
            
            // 搜索标签示例（iOS 标准方式）
            TabSection {
                Tab(role: .search) {
                    TabBarSearchDemo(searchText: $searchText)
                }
            }
        }
    }
}

// MARK: - 颜色系统展示

struct ColorsShowcase: View {
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xl) {
                    
                    // 文本颜色
                    colorSection(
                        title: "文本颜色",
                        description: "自动适配深浅色模式",
                        items: [
                            ("Primary", DesignTokens.Colors.Text.primary),
                            ("Secondary", DesignTokens.Colors.Text.secondary),
                            ("Tertiary", DesignTokens.Colors.Text.tertiary),
                            ("Label", DesignTokens.Colors.Text.label),
                            ("Secondary Label", DesignTokens.Colors.Text.secondaryLabel),
                            ("Tertiary Label", DesignTokens.Colors.Text.tertiaryLabel)
                        ]
                    )
                    
                    // 背景颜色
                    colorSection(
                        title: "背景颜色",
                        description: "系统标准背景色",
                        items: [
                            ("Primary", DesignTokens.Colors.Background.primary),
                            ("Secondary", DesignTokens.Colors.Background.secondary),
                            ("Tertiary", DesignTokens.Colors.Background.tertiary),
                            ("Grouped", DesignTokens.Colors.Background.grouped),
                            ("Secondary Grouped", DesignTokens.Colors.Background.secondaryGrouped),
                            ("Tertiary Grouped", DesignTokens.Colors.Background.tertiaryGrouped)
                        ]
                    )
                    
                    // 系统蓝色
                    colorSection(
                        title: "iOS 系统蓝色",
                        description: "健康 App 常用配色",
                        items: [
                            ("Primary", DesignTokens.Colors.SystemBlue.primary),
                            ("Light", DesignTokens.Colors.SystemBlue.light),
                            ("Dark", DesignTokens.Colors.SystemBlue.dark)
                        ]
                    )
                    
                    // 健康渐变色
                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                        Text("健康 App 渐变")
                            .font(DesignTokens.Typography.subtitle)
                        
                        Text("摘要页面背景渐变")
                            .font(DesignTokens.Typography.caption)
                            .foregroundStyle(DesignTokens.Colors.Text.secondary)
                        
                        RoundedRectangle(cornerRadius: 20, style: .continuous)
                            .fill(DesignTokens.Colors.HealthGradient.gradient)
                            .frame(height: 200)
                            .overlay(
                                Text("渐变效果")
                                    .font(DesignTokens.Typography.cardTitle)
                                    .foregroundStyle(.white)
                            )
                    }
                    .cardStyle()
                    
                    Spacer(minLength: 80)
                }
                .padding(DesignTokens.Spacing.Page.horizontal)
            }
            .background(DesignTokens.Colors.Background.secondary)
            .navigationTitle("颜色系统")
        }
    }
    
    private func colorSection(title: String, description: String, items: [(String, Color)]) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text(title)
                .font(DesignTokens.Typography.subtitle)
            
            Text(description)
                .font(DesignTokens.Typography.caption)
                .foregroundStyle(DesignTokens.Colors.Text.secondary)
            
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: DesignTokens.Spacing.md) {
                ForEach(items, id: \.0) { item in
                    colorSwatch(item.0, item.1)
                }
            }
        }
        .cardStyle()
    }
    
    private func colorSwatch(_ title: String, _ color: Color) -> some View {
        VStack(spacing: 8) {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(color)
                .frame(height: 80)
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .strokeBorder(Color.gray.opacity(0.2), lineWidth: 1)
                )
            
            Text(title)
                .font(.system(size: 11))
                .foregroundStyle(DesignTokens.Colors.Text.secondary)
                .multilineTextAlignment(.center)
                .lineLimit(2)
        }
    }
}

// MARK: - 字体系统展示

struct TypographyShowcase: View {
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xl) {
                    
                    // 固定字体
                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                        Text("固定字体系统")
                            .font(DesignTokens.Typography.subtitle)
                        
                        Text("固定大小，不随用户字体设置变化")
                            .font(DesignTokens.Typography.caption)
                            .foregroundStyle(DesignTokens.Colors.Text.secondary)
                        
                        VStack(alignment: .leading, spacing: DesignTokens.Spacing.base) {
                            fontSample("页面标题 (38pt, Bold)", DesignTokens.Typography.pageTitle)
                            fontSample("卡片标题 (20pt, Semibold)", DesignTokens.Typography.cardTitle)
                            fontSample("次级标题 (18pt, Semibold)", DesignTokens.Typography.subtitle)
                            fontSample("正文 (17pt, Regular)", DesignTokens.Typography.body)
                            fontSample("说明文字 (15pt, Regular)", DesignTokens.Typography.caption)
                            fontSample("按钮文字 (15pt, Semibold)", DesignTokens.Typography.button)
                            fontSample("小文字 (13pt, Regular)", DesignTokens.Typography.footnote)
                            fontSample("标签文字 (12pt, Regular)", DesignTokens.Typography.label)
                        }
                    }
                    .cardStyle()
                    
                    // 动态字体
                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                        Text("动态字体系统")
                            .font(DesignTokens.Typography.subtitle)
                        
                        Text("推荐使用，自动适配用户字体大小偏好")
                            .font(DesignTokens.Typography.caption)
                            .foregroundStyle(DesignTokens.Colors.Text.secondary)
                        
                        VStack(alignment: .leading, spacing: DesignTokens.Spacing.base) {
                            fontSample("Large Title", DesignTokens.Typography.Dynamic.largeTitle)
                            fontSample("Title", DesignTokens.Typography.Dynamic.title)
                            fontSample("Title 2", DesignTokens.Typography.Dynamic.title2)
                            fontSample("Title 3", DesignTokens.Typography.Dynamic.title3)
                            fontSample("Headline", DesignTokens.Typography.Dynamic.headline)
                            fontSample("Body", DesignTokens.Typography.Dynamic.body)
                            fontSample("Callout", DesignTokens.Typography.Dynamic.callout)
                            fontSample("Subheadline", DesignTokens.Typography.Dynamic.subheadline)
                            fontSample("Footnote", DesignTokens.Typography.Dynamic.footnote)
                            fontSample("Caption", DesignTokens.Typography.Dynamic.caption)
                            fontSample("Caption 2", DesignTokens.Typography.Dynamic.caption2)
                        }
                    }
                    .cardStyle()
                    
                    Spacer(minLength: 80)
                }
                .padding(DesignTokens.Spacing.Page.horizontal)
            }
            .background(DesignTokens.Colors.Background.secondary)
            .navigationTitle("字体系统")
        }
    }
    
    private func fontSample(_ title: String, _ font: Font) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.system(size: 11))
                .foregroundStyle(DesignTokens.Colors.Text.tertiary)
            
            Text("快速的棕色狐狸跳过懒狗 Aa")
                .font(font)
                .foregroundStyle(DesignTokens.Colors.Text.primary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 4)
    }
}

// MARK: - 卡片样式展示

struct CardsShowcase: View {
    @State private var showDialog = false
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xl) {
                    
                    Text("卡片组件库")
                        .font(DesignTokens.Typography.pageTitle)
                    
                    // 1. 通知卡片
                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                        Text("通知卡片")
                            .font(DesignTokens.Typography.subtitle)
                        Text("带黄色横幅和圆形关闭按钮，四周等宽边距设计")
                            .font(DesignTokens.Typography.caption)
                            .foregroundStyle(DesignTokens.Colors.Text.secondary)
                    }
                    
                    NotificationCard(title: "噪声通知", date: "11月6日", onClose: {}) {
                        VStack(alignment: .leading, spacing: DesignTokens.Spacing.base) {
                            HStack(alignment: .top, spacing: DesignTokens.Spacing.base) {
                                Image(systemName: "ear.fill")
                                    .font(.system(size: 42))
                                    .foregroundStyle(DesignTokens.Colors.SystemBlue.primary)
                                
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("音量达到 100 分贝。")
                                        .font(.system(size: 20, weight: .semibold))
                                    
                                    Text("置身于此音量中几分钟就可能导致暂时性听力损伤。")
                                        .font(.system(size: 15))
                                        .foregroundStyle(DesignTokens.Colors.Text.secondary)
                                }
                            }
                            .padding(DesignTokens.Spacing.Card.uniformPadding)
                        }
                    }
                    
                    // 2. 常规卡片
                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                        Text("常规卡片")
                            .font(DesignTokens.Typography.subtitle)
                        Text("标准白色卡片，适用于大多数场景")
                            .font(DesignTokens.Typography.caption)
                            .foregroundStyle(DesignTokens.Colors.Text.secondary)
                    }
                    
                    RegularCard {
                        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                            Text("卡片标题")
                                .font(DesignTokens.Typography.cardTitle)
                            
                            Text("这是一个标准的常规卡片，使用白色背景、圆角和轻微阴影。")
                                .font(DesignTokens.Typography.caption)
                                .foregroundStyle(DesignTokens.Colors.Text.secondary)
                            
                            Button(action: {}) {
                                Text("操作按钮")
                                    .buttonStyle()
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    
                    // 3. 弹窗卡片
                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                        Text("弹窗卡片")
                            .font(DesignTokens.Typography.subtitle)
                        Text("居中显示，带圆角图标，用于提示和确认")
                            .font(DesignTokens.Typography.caption)
                            .foregroundStyle(DesignTokens.Colors.Text.secondary)
                    }
                    
                    DialogCard(icon: "pills.fill", iconColor: Color(red: 0.3, green: 0.7, blue: 0.9)) {
                        VStack(spacing: DesignTokens.Spacing.md) {
                            Text("设置用药情况")
                                .font(.system(size: 22, weight: .bold))
                            
                            Text("所有药品，一目了然。设置定时，查询药品相互作用信息，并跟踪用药。")
                                .font(.system(size: 15))
                                .foregroundStyle(DesignTokens.Colors.Text.secondary)
                                .multilineTextAlignment(.center)
                            
                            Button(action: {}) {
                                Text("添加用药")
                                    .buttonStyle()
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    
                    // 4. 列表项卡片
                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                        Text("列表项卡片")
                            .font(DesignTokens.Typography.subtitle)
                        Text("App 推荐列表，左侧图标+标题副标题+右侧箭头")
                            .font(DesignTokens.Typography.caption)
                            .foregroundStyle(DesignTokens.Colors.Text.secondary)
                    }
                    
                    VStack(spacing: DesignTokens.Spacing.md) {
                        ListItemCard(
                            icon: "figure.run",
                            title: "Seven - 7分钟锻炼挑战",
                            subtitle: "快速高效锻炼",
                            iconColor: .blue
                        )
                        
                        ListItemCard(
                            icon: "drop.fill",
                            title: "WaterMinder® · Water Tracker",
                            subtitle: "喝水时间啦！健康喝水提醒助手·每日补水喝水打卡",
                            iconColor: .cyan
                        )
                        
                        ListItemCard(
                            icon: "figure.walk",
                            title: "Wakeout: 随时1分钟运动",
                            subtitle: "为真实生活而设计的运动",
                            iconColor: .green
                        )
                    }
                    
                    // 5. 数据展示卡片
                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                        Text("数据展示卡片")
                            .font(DesignTokens.Typography.subtitle)
                        Text("用于显示健康数据和测量结果")
                            .font(DesignTokens.Typography.caption)
                            .foregroundStyle(DesignTokens.Colors.Text.secondary)
                    }
                    
                    RegularCard(padding: DesignTokens.Spacing.base) {
                        HStack {
                            // 左侧图标和标题
                            HStack(spacing: 12) {
                                Image(systemName: "figure.arms.open")
                                    .font(.system(size: 24))
                                    .foregroundStyle(.purple)
                                
                                Text("手腕温度")
                                    .font(.system(size: 17, weight: .semibold))
                            }
                            
                            Spacer()
                            
                            // 右侧时间和数据
                            HStack(spacing: 12) {
                                Text("08:00")
                                    .font(.system(size: 15))
                                    .foregroundStyle(DesignTokens.Colors.Text.secondary)
                                
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundStyle(DesignTokens.Colors.Text.tertiary)
                            }
                        }
                    }
                    
                    Spacer(minLength: 80)
                }
                .padding(DesignTokens.Spacing.Page.horizontal)
            }
            .background(DesignTokens.Colors.Background.secondary)
            .navigationTitle("卡片组件库")
        }
    }
}

// MARK: - 组件展示

struct ComponentsShowcase: View {
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xl) {
                    
                    Text("UI 组件")
                        .font(DesignTokens.Typography.pageTitle)
                    
                    // 按钮
                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                        Text("按钮样式")
                            .font(DesignTokens.Typography.subtitle)
                        
                        VStack(spacing: DesignTokens.Spacing.md) {
                            Button(action: {}) {
                                Text("主要按钮")
                                    .buttonStyle()
                            }
                            .buttonStyle(.plain)
                            
                            Button(action: {}) {
                                Text("次要按钮")
                                    .buttonStyle(
                                        foreground: DesignTokens.Colors.SystemBlue.primary,
                                        background: DesignTokens.Colors.SystemBlue.primary.opacity(0.1)
                                    )
                            }
                            .buttonStyle(.plain)
                            
                            Button(action: {}) {
                                Text("红色按钮")
                                    .buttonStyle(background: .red)
                            }
                            .buttonStyle(.plain)
                            
                            Button(action: {}) {
                                Text("绿色按钮")
                                    .buttonStyle(background: .green)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .cardStyle()
                    
                    // 圆角对比
                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                        Text("圆角样式对比")
                            .font(DesignTokens.Typography.subtitle)
                        
                        Text(".continuous vs .circular")
                            .font(DesignTokens.Typography.caption)
                            .foregroundStyle(DesignTokens.Colors.Text.secondary)
                        
                        HStack(spacing: DesignTokens.Spacing.base) {
                            VStack(spacing: 8) {
                                RoundedRectangle(cornerRadius: 30, style: .continuous)
                                    .fill(DesignTokens.Colors.SystemBlue.primary)
                                    .frame(width: 120, height: 120)
                                
                                Text(".continuous")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundStyle(.green)
                                
                                Text("iOS 标准")
                                    .font(.system(size: 11))
                                    .foregroundStyle(DesignTokens.Colors.Text.secondary)
                            }
                            
                            VStack(spacing: 8) {
                                RoundedRectangle(cornerRadius: 30, style: .circular)
                                    .fill(Color.gray)
                                    .frame(width: 120, height: 120)
                                
                                Text(".circular")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundStyle(.red)
                                
                                Text("不推荐")
                                    .font(.system(size: 11))
                                    .foregroundStyle(DesignTokens.Colors.Text.secondary)
                            }
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .cardStyle()
                    
                    // 阴影对比
                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                        Text("阴影样式")
                            .font(DesignTokens.Typography.subtitle)
                        
                        VStack(spacing: DesignTokens.Spacing.lg) {
                            shadowDemo("轻微阴影 (Light)", DesignTokens.Shadow.light)
                            shadowDemo("标准阴影 (Medium)", DesignTokens.Shadow.medium)
                            shadowDemo("较强阴影 (Heavy)", DesignTokens.Shadow.heavy)
                        }
                    }
                    .cardStyle()
                    
                    // 间距展示
                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                        Text("间距系统")
                            .font(DesignTokens.Typography.subtitle)
                        
                        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                            spacingDemo("xs", DesignTokens.Spacing.xs)
                            spacingDemo("sm", DesignTokens.Spacing.sm)
                            spacingDemo("md", DesignTokens.Spacing.md)
                            spacingDemo("base", DesignTokens.Spacing.base)
                            spacingDemo("lg", DesignTokens.Spacing.lg)
                            spacingDemo("xl", DesignTokens.Spacing.xl)
                            spacingDemo("xxl", DesignTokens.Spacing.xxl)
                        }
                    }
                    .cardStyle()
                    
                    // 图标使用
                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                        Text("SF Symbols 图标")
                            .font(DesignTokens.Typography.subtitle)
                        
                        LazyVGrid(columns: [
                            GridItem(.flexible()),
                            GridItem(.flexible()),
                            GridItem(.flexible()),
                            GridItem(.flexible())
                        ], spacing: DesignTokens.Spacing.base) {
                            iconDemo("heart.fill", .red)
                            iconDemo("star.fill", .yellow)
                            iconDemo("bell.fill", .orange)
                            iconDemo("person.fill", .blue)
                            iconDemo("envelope.fill", .green)
                            iconDemo("phone.fill", .purple)
                            iconDemo("message.fill", .pink)
                            iconDemo("cart.fill", .cyan)
                        }
                    }
                    .cardStyle()
                    
                    Spacer(minLength: 80)
                }
                .padding(DesignTokens.Spacing.Page.horizontal)
            }
            .background(DesignTokens.Colors.Background.secondary)
            .navigationTitle("UI 组件")
        }
    }
    
    private func shadowDemo(_ title: String, _ shadow: DesignTokens.ShadowStyle) -> some View {
        VStack(spacing: 8) {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(DesignTokens.Colors.Background.primary)
                .frame(height: 80)
                .applyShadow(shadow)
                .overlay(
                    Text(title)
                        .font(DesignTokens.Typography.caption)
                )
        }
    }
    
    private func spacingDemo(_ title: String, _ spacing: CGFloat) -> some View {
        HStack(spacing: DesignTokens.Spacing.base) {
            Text(title)
                .font(.system(size: 13, weight: .medium))
                .frame(width: 50, alignment: .leading)
            
            Rectangle()
                .fill(DesignTokens.Colors.SystemBlue.primary)
                .frame(width: spacing, height: 20)
            
            Text("\(Int(spacing))pt")
                .font(.system(size: 12))
                .foregroundStyle(DesignTokens.Colors.Text.secondary)
        }
    }
    
    private func iconDemo(_ name: String, _ color: Color) -> some View {
        VStack(spacing: 8) {
            Image(systemName: name)
                .font(.system(size: 32))
                .foregroundStyle(color)
                .frame(width: 60, height: 60)
                .background(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(color.opacity(0.1))
                )
            
            Text(name)
                .font(.system(size: 9))
                .foregroundStyle(DesignTokens.Colors.Text.tertiary)
                .lineLimit(2)
                .multilineTextAlignment(.center)
        }
    }
}

// MARK: - TabBar 搜索标签演示

struct TabBarSearchDemo: View {
    @Binding var searchText: String
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // 说明卡片
                ScrollView {
                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.xl) {
                        
                        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                            Label("TabBar 搜索标签", systemImage: "magnifyingglass")
                                .font(DesignTokens.Typography.pageTitle)
                                .foregroundStyle(DesignTokens.Colors.SystemBlue.primary)
                            
                            Text("这是 iOS 18+ TabView 的标准搜索实现")
                                .font(DesignTokens.Typography.caption)
                                .foregroundStyle(DesignTokens.Colors.Text.secondary)
                        }
                        
                        // 规则说明
                        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                            Text("搜索标签规则")
                                .font(DesignTokens.Typography.subtitle)
                            
                            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                                ruleItem("1", "必须使用 Tab(role: .search)", true)
                                ruleItem("2", "包装在 TabSection 中", true)
                                ruleItem("3", "自动显示放大镜图标", true)
                                ruleItem("4", "位置固定在最右侧", true)
                                ruleItem("5", "配合 .searchable() 使用", true)
                            }
                        }
                        .cardStyle()
                        
                        // 代码示例
                        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                            Text("正确写法")
                                .font(DesignTokens.Typography.subtitle)
                            
                            Text("""
TabSection {
    Tab(role: .search) {
        SearchView()
            .searchable(text: $searchText)
    }
}
""")
                                .font(.system(size: 13, design: .monospaced))
                                .padding(DesignTokens.Spacing.base)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(
                                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                                        .fill(Color.green.opacity(0.1))
                                )
                        }
                        .cardStyle()
                        
                        // 错误示例
                        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                            Text("错误写法")
                                .font(DesignTokens.Typography.subtitle)
                            
                            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                                wrongExample(
                                    "手动创建搜索标签",
                                    """
Tab("搜索", systemImage: "magnifyingglass") {
    SearchView()
}
"""
                                )
                                
                                wrongExample(
                                    "没有使用 TabSection",
                                    """
Tab(role: .search) {
    SearchView()
}
"""
                                )
                            }
                        }
                        .cardStyle()
                        
                        // 实际搜索演示
                        if !searchText.isEmpty {
                            VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                                Text("搜索结果")
                                    .font(DesignTokens.Typography.subtitle)
                                
                                Text("搜索关键词: \(searchText)")
                                    .font(DesignTokens.Typography.body)
                                
                                Text("这里可以显示实际的搜索结果...")
                                    .font(DesignTokens.Typography.caption)
                                    .foregroundStyle(DesignTokens.Colors.Text.secondary)
                            }
                            .cardStyle()
                        }
                        
                        Spacer(minLength: 80)
                    }
                    .padding(DesignTokens.Spacing.Page.horizontal)
                }
                
                // 空状态
                if searchText.isEmpty {
                    ContentUnavailableView.search
                        .frame(maxHeight: .infinity)
                }
            }
            .navigationTitle("搜索示例")
            .searchable(text: $searchText, prompt: "输入搜索内容")
        }
    }
    
    private func ruleItem(_ number: String, _ text: String, _ isCorrect: Bool) -> some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Text(number)
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 24, height: 24)
                .background(
                    Circle()
                        .fill(isCorrect ? Color.green : Color.red)
                )
            
            Text(text)
                .font(DesignTokens.Typography.caption)
                .foregroundStyle(DesignTokens.Colors.Text.primary)
            
            Spacer()
            
            Image(systemName: isCorrect ? "checkmark.circle.fill" : "xmark.circle.fill")
                .foregroundStyle(isCorrect ? .green : .red)
        }
    }
    
    private func wrongExample(_ title: String, _ code: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "xmark.circle.fill")
                    .foregroundStyle(.red)
                Text(title)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.red)
            }
            
            Text(code)
                .font(.system(size: 12, design: .monospaced))
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .fill(Color.red.opacity(0.1))
                )
        }
    }
}

// MARK: - Preview

#Preview("设计令牌展示") {
    DesignTokensShowcase()
}

#Preview("搜索标签演示") {
    TabBarSearchDemo(searchText: .constant(""))
}


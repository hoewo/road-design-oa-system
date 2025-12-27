# iOS 代码风格模板

> **目的**：为 AI 代码生成提供符合 Constitution 规范的代码模板，确保生成的代码遵循架构和代码风格规范。

> **使用方法**：在执行 `arckit.implement` 命令时，AI 必须参考此模板生成代码。

## 规范要求摘要

根据 Constitution 原则 I，所有 iOS 代码必须遵循：

1. **Struct/Class/Enum 规范使用**
2. **状态管理规范**（@State vs @Observable）
3. **Service 层规范**（View 外部服务）
4. **并发编程规范**（Swift 并发模型，禁止 OC 线程管理）
5. **文件组织规范**（一个文件一个 View + Preview）
6. **协议和泛型使用规范**
7. **设计令牌规范**（颜色必须使用 Asset Catalog，禁止直接色值）

---

## 1. Struct/Class/Enum 规范模板

### ✅ 优先使用 Struct（值语义）

```swift
// ✅ 推荐：使用 struct 实现值语义
struct UserProfile {
    var name: String
    var age: Int
    var email: String
    
    // ✅ 简单计算属性
    var displayName: String {
        name.isEmpty ? "未设置" : name
    }
    
    // ✅ 基于自身数据的业务逻辑
    var isValid: Bool {
        !name.isEmpty && age > 0 && email.contains("@")
    }
}

// ❌ 错误：不必要的 class
// class UserProfile { ... }
```

### ✅ 仅在需要引用语义时使用 Class

```swift
// ✅ 仅在需要引用语义时使用 class（如 @Observable、@Model）
import Observation

@Observable
final class UserSession {
    var currentUser: UserProfile?
    var isAuthenticated: Bool = false
    
    // ✅ 基于自身状态的业务逻辑
    var canAccessPremium: Bool {
        isAuthenticated && currentUser?.isPremium == true
    }
}

// ❌ 错误：如果不需要引用语义，应使用 struct
```

### ✅ 使用 Enum 表示状态机、选项集合和错误类型

```swift
// ✅ 状态机
enum LoadingState {
    case idle
    case loading
    case loaded([Item])
    case error(Error)
}

// ✅ 选项集合
enum UserRole {
    case admin
    case user
    case guest
}

// ✅ 错误类型
enum DataError: Error {
    case notFound
    case invalidFormat
    case networkError(underlying: Error)
}
```

---

## 2. 状态管理规范模板

### ✅ 简单状态使用 @State

```swift
// ✅ 简单 UI 状态直接用 @State 管理
struct LoginView: View {
    @State private var username: String = ""
    @State private var password: String = ""
    @State private var isLoading: Bool = false
    @State private var showAlert: Bool = false
    @State private var errorMessage: String?
    
    var body: some View {
        VStack {
            TextField("用户名", text: $username)
            SecureField("密码", text: $password)
            
            Button("登录") {
                Task { await login() }
            }
            .disabled(isLoading)
            
            if isLoading {
                ProgressView()
            }
        }
        .alert("错误", isPresented: $showAlert) {
            Button("确定", role: .cancel) { }
        } message: {
            if let errorMessage {
                Text(errorMessage)
            }
        }
    }
    
    private func login() async {
        isLoading = true
        defer { isLoading = false }
        
        // 业务逻辑...
        // 如果出错，设置 errorMessage 和 showAlert
    }
}
```

### ✅ 复杂状态使用 @Observable

```swift
// ✅ 复杂状态模型使用 @Observable
import Observation

@Observable
final class SearchViewModel {
    // 搜索状态
    var query: String = ""
    var searchResults: [Item] = []
    var isSearching: Bool = false
    
    // 过滤选项
    var selectedCategory: Category?
    var priceRange: ClosedRange<Double> = 0...1000
    var sortOrder: SortOrder = .relevance
    
    // 错误处理
    var error: Error?
    
    // ✅ 基于自身状态的计算属性
    var hasActiveFilters: Bool {
        selectedCategory != nil || priceRange != 0...1000 || sortOrder != .relevance
    }
    
    var filteredResults: [Item] {
        searchResults.filter { item in
            // 基于过滤条件的逻辑
            if let category = selectedCategory, item.category != category {
                return false
            }
            return item.price >= priceRange.lowerBound && item.price <= priceRange.upperBound
        }
    }
}

// ✅ View 中使用复杂状态模型
struct SearchView: View {
    @State private var viewModel = SearchViewModel()
    @Environment(\.searchService) private var searchService
    
    var body: some View {
        VStack {
            SearchBar(text: $viewModel.query)
                .onSubmit {
                    Task { await performSearch() }
                }
            
            FilterOptionsView(
                selectedCategory: $viewModel.selectedCategory,
                priceRange: $viewModel.priceRange,
                sortOrder: $viewModel.sortOrder
            )
            
            if viewModel.isSearching {
                ProgressView()
            } else {
                ResultsListView(items: viewModel.filteredResults)
            }
        }
    }
    
    private func performSearch() async {
        viewModel.isSearching = true
        defer { viewModel.isSearching = false }
        
        do {
            let results = try await searchService.search(
                query: viewModel.query,
                category: viewModel.selectedCategory
            )
            viewModel.searchResults = results
        } catch {
            viewModel.error = error
        }
    }
}
```

### ❌ 错误的状态管理

```swift
// ❌ 错误：状态模型依赖 Service
@Observable
final class BadViewModel {
    @Environment(\.dataService) var dataService  // ❌ Observable 不应依赖 Service
    
    func loadData() async {
        // ❌ 状态模型不应该调用 Service
        let data = try? await dataService.fetch()
    }
}

// ❌ 错误：在 View 中过度使用 @State 管理复杂状态
struct BadView: View {
    @State private var query: String = ""
    @State private var searchResults: [Item] = []
    @State private var isSearching: Bool = false
    @State private var selectedCategory: Category?
    @State private var priceRange: ClosedRange<Double> = 0...1000
    @State private var sortOrder: SortOrder = .relevance
    @State private var error: Error?
    // ❌ 太多独立的 @State，应该用 @Observable 统一管理
    
    var body: some View {
        // ...
    }
}
```

---

## 3. Service 层规范模板

### ✅ Service 作为 View 外部服务

```swift
// ✅ Service 协议定义（数据通道）
protocol DataServiceProtocol: Sendable {
    func fetch() async throws -> [Item]
    func save(_ item: Item) async throws
}

// ✅ Service 协议定义（系统服务封装）
protocol CameraServiceProtocol: Sendable {
    func capturePhoto() async throws -> UIImage
    func requestPermission() async -> Bool
}

// ✅ Service 协议定义（复杂算法）
protocol OCRServiceProtocol: Sendable {
    func recognizeText(in image: UIImage) async throws -> String
}

// ✅ Service 实现（不包含业务逻辑）
struct VisionOCRService: OCRServiceProtocol {
    func recognizeText(in image: UIImage) async throws -> String {
        // ✅ 纯技术实现，不包含业务判断
        let request = VNRecognizeTextRequest()
        let handler = VNImageRequestHandler(cgImage: image.cgImage!)
        try handler.perform([request])
        
        guard let observations = request.results else {
            throw OCRError.noTextFound
        }
        
        return observations
            .compactMap { $0.topCandidates(1).first?.string }
            .joined(separator: "\n")
    }
}

// ✅ Service 环境注入
private struct OCRServiceKey: EnvironmentKey {
    nonisolated(unsafe) static let defaultValue: any OCRServiceProtocol = VisionOCRService()
}

extension EnvironmentValues {
    var ocrService: any OCRServiceProtocol {
        get { self[OCRServiceKey.self] }
        set { self[OCRServiceKey.self] = newValue }
    }
}

// ✅ View 中使用 Service
struct PhotoProcessingView: View {
    @Environment(\.ocrService) private var ocrService
    @State private var image: UIImage?
    @State private var recognizedText: String = ""
    @State private var isProcessing: Bool = false
    
    var body: some View {
        VStack {
            if let image {
                Image(uiImage: image)
            }
            
            Button("识别文字") {
                Task { await processImage() }
            }
            .disabled(isProcessing || image == nil)
            
            if isProcessing {
                ProgressView()
            }
            
            Text(recognizedText)
        }
    }
    
    // ✅ View 决定何时调用 Service，处理业务逻辑
    private func processImage() async {
        guard let image else { return }
        
        isProcessing = true
        defer { isProcessing = false }
        
        do {
            recognizedText = try await ocrService.recognizeText(in: image)
            
            // ✅ 业务逻辑在 View 中处理
            if recognizedText.isEmpty {
                // 显示提示信息
            } else {
                // 保存结果
            }
        } catch {
            // 错误处理
        }
    }
}
```

### ❌ 错误的 Service 使用

```swift
// ❌ 错误：Service 包含业务逻辑判断
struct BadOCRService: OCRServiceProtocol {
    func recognizeText(in image: UIImage) async throws -> String {
        let text = // ... OCR 实现
        
        // ❌ 业务逻辑不应在 Service 中
        if text.isEmpty {
            throw OCRError.noTextFound
        }
        
        // ❌ 业务规则不应在 Service 中
        if text.count < 10 {
            return "文本太短，请重新拍摄"
        }
        
        return text
    }
}
```

---

## 4. 并发编程规范模板

### ✅ 使用 Swift 并发模型

```swift
import SwiftUI

// ✅ 使用 @MainActor 确保 UI 更新在主线程
@MainActor
class DataLoader: ObservableObject {
    @Published var items: [Item] = []
    @Published var isLoading: Bool = false
    
    // ✅ 异步操作使用 async/await
    func loadData() async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            // ✅ 使用 Task 执行异步操作
            let data = try await fetchDataFromNetwork()
            self.items = data
        } catch {
            // ✅ 错误处理在主线程
            print("加载失败: \(error)")
        }
    }
    
    // ✅ 异步函数使用 async throws
    private func fetchDataFromNetwork() async throws -> [Item] {
        // 模拟网络请求
        try await Task.sleep(nanoseconds: 1_000_000_000)
        return []
    }
}

// ✅ 使用 actor 保护共享可变状态
actor Counter {
    private var value: Int = 0
    
    func increment() {
        value += 1
    }
    
    func getValue() -> Int {
        value
    }
}

// ✅ View 中使用异步操作
struct DataView: View {
    @StateObject private var loader = DataLoader()
    
    var body: some View {
        List(loader.items) { item in
            Text(item.name)
        }
        .task {
            // ✅ 使用 .task 修饰符执行异步操作
            await loader.loadData()
        }
    }
}
```

### ❌ 禁止使用 Objective-C 线程管理

```swift
// ❌ 禁止：NSThread
// NSThread.detachNewThread { ... }

// ❌ 禁止：performSelector:onThread:
// self.perform(#selector(loadData), on: thread, with: nil, waitUntilDone: false)

// ❌ 禁止：dispatch_async（除非与现有 OC 代码交互）
// DispatchQueue.main.async { ... }

// ❌ 禁止：DispatchQueue（除非与现有 OC 代码交互）
// let queue = DispatchQueue(label: "com.example.queue")
// queue.async { ... }
```

### ✅ 正确的异步操作模式

```swift
import SwiftUI

struct NetworkService {
    // ✅ 使用 async/await
    func fetchData() async throws -> Data {
        let url = URL(string: "https://api.example.com/data")!
        let (data, _) = try await URLSession.shared.data(from: url)
        return data
    }
}

struct ContentView: View {
    @State private var data: Data?
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    var body: some View {
        VStack {
            if isLoading {
                ProgressView()
            } else if let errorMessage = errorMessage {
                Text("错误: \(errorMessage)")
            } else {
                Text("数据已加载")
            }
        }
        .task {
            // ✅ 使用 .task 修饰符执行异步操作
            await loadData()
        }
    }
    
    // ✅ 异步函数使用 async
    @MainActor
    private func loadData() async {
        isLoading = true
        errorMessage = nil
        
        do {
            let service = NetworkService()
            data = try await service.fetchData()
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
}
```

---

## 5. 文件组织规范模板

### ✅ 一个文件一个 View + Preview

```swift
// ✅ 正确：ManualListView.swift
// 此文件只包含 ManualListView 和其 Preview

import SwiftUI
import SwiftData

struct ManualListView: View {
    @Query private var manuals: [Manual]
    
    var body: some View {
        List(manuals) { manual in
            ManualListItemView(manual: manual)
        }
    }
}

// ✅ Preview 必须在同一个文件中
#Preview {
    ManualListView()
        .modelContainer(for: Manual.self, inMemory: true)
}
```

### ❌ 错误：一个文件多个 View

```swift
// ❌ 错误：不要在同一个文件中定义多个 View
struct ManualListView: View { ... }
struct ManualDetailView: View { ... }  // ❌ 错误！
struct ManualEditView: View { ... }    // ❌ 错误！
```

### ✅ 辅助类型放在独立文件

```swift
// ✅ 正确：ManualListItemView.swift（独立的组件文件）
import SwiftUI

struct ManualListItemView: View {
    let manual: Manual
    
    var body: some View {
        HStack {
            Text(manual.title)
            Spacer()
        }
    }
}

#Preview {
    ManualListItemView(manual: Manual(title: "示例手册"))
}
```

---

## 6. 协议和泛型使用规范模板

### ✅ 合理使用协议定义服务接口

```swift
// ✅ 使用协议定义服务接口，支持依赖注入
protocol StorageServiceProtocol: Sendable {
    func save(_ data: Data, key: String) async throws
    func load(key: String) async throws -> Data?
}

// ✅ 实现协议
struct FileStorageService: StorageServiceProtocol {
    func save(_ data: Data, key: String) async throws {
        // 实现保存逻辑
    }
    
    func load(key: String) async throws -> Data? {
        // 实现加载逻辑
        return nil
    }
}

// ✅ 通过环境注入使用
private struct StorageServiceKey: EnvironmentKey {
    nonisolated(unsafe) static let defaultValue: any StorageServiceProtocol = FileStorageService()
}

extension EnvironmentValues {
    var storageService: any StorageServiceProtocol {
        get { self[StorageServiceKey.self] }
        set { self[StorageServiceKey.self] = newValue }
    }
}
```

### ✅ 合理使用泛型提高代码复用性

```swift
// ✅ 使用泛型实现类型安全的容器
struct Repository<T: Identifiable> {
    private var items: [T] = []
    
    mutating func add(_ item: T) {
        items.append(item)
    }
    
    func find(id: T.ID) -> T? {
        items.first { $0.id == id }
    }
}

// ✅ 使用泛型约束
protocol Cacheable {
    associatedtype Key: Hashable
    var cacheKey: Key { get }
}

func cache<T: Cacheable>(_ item: T) {
    // 使用 item.cacheKey 进行缓存
}
```

### ❌ 避免过度抽象

```swift
// ❌ 错误：为了使用协议而使用协议
protocol StringConvertible {
    func toString() -> String
}
extension String: StringConvertible {
    func toString() -> String { self }  // 不必要的抽象
}

// ✅ 正确：直接使用 String
let text: String = "Hello"
```

---

## 7. 设计令牌（Design Tokens）使用规范

### ✅ 颜色必须使用 Asset Catalog

```swift
// ✅ 正确：在 Asset Catalog 中创建颜色资源
// 路径：Resources/[PackageName]Assets.xcassets/Colors/Primary.colorset/

// DesignTokens.swift
extension DesignTokens {
    enum Colors {
        // ✅ 语义颜色：从 Asset Catalog 加载
        static let primary = Color("Primary", bundle: .module)
        static let secondary = Color("Secondary", bundle: .module)
        static let background = Color("Background", bundle: .module)
        static let textPrimary = Color("TextPrimary", bundle: .module)
        static let textSecondary = Color("TextSecondary", bundle: .module)
        static let error = Color("Error", bundle: .module)
        static let success = Color("Success", bundle: .module)
        
        // ✅ 例外：系统颜色可以直接引用
        static let systemBlue = Color.blue
        static let systemRed = Color.red
        static let systemGreen = Color.green
    }
}
```

### ✅ Asset Catalog 颜色配置示例

```json
// Primary.colorset/Contents.json
{
  "colors" : [
    {
      "color" : {
        "color-space" : "srgb",
        "components" : {
          "alpha" : "1.000",
          "blue" : "0.800",
          "green" : "0.400",
          "red" : "0.200"
        }
      },
      "idiom" : "universal"
    },
    {
      "appearances" : [
        {
          "appearance" : "luminosity",
          "value" : "dark"
        }
      ],
      "color" : {
        "color-space" : "srgb",
        "components" : {
          "alpha" : "1.000",
          "blue" : "0.900",
          "green" : "0.500",
          "red" : "0.300"
        }
      },
      "idiom" : "universal"
    }
  ],
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
```

### ✅ 在 View 中使用设计令牌

```swift
// ✅ 正确：使用设计令牌
struct LoginView: View {
    var body: some View {
        VStack {
            Text("欢迎登录")
                .foregroundStyle(DesignTokens.Colors.textPrimary)
                .font(DesignTokens.Typography.headline)
            
            Button("登录") {
                // 登录逻辑
            }
            .foregroundStyle(DesignTokens.Colors.primary)
            .background(DesignTokens.Colors.background)
        }
    }
}

// ✅ 正确：使用系统颜色
struct InfoView: View {
    var body: some View {
        Text("提示信息")
            .foregroundStyle(DesignTokens.Colors.systemBlue)
    }
}
```

### ❌ 禁止直接使用色值

```swift
// ❌ 错误：直接使用十六进制色值
extension DesignTokens.Colors {
    static let primary = Color(hex: "#3498db")  // ❌ 禁止！
    static let secondary = Color(red: 0.5, green: 0.5, blue: 0.5)  // ❌ 禁止！
}

// ❌ 错误：在 View 中直接使用色值
struct BadView: View {
    var body: some View {
        Text("错误示例")
            .foregroundStyle(Color(hex: "#FF0000"))  // ❌ 禁止！
    }
}
```

### ✅ 完整的设计令牌文件示例

```swift
// DesignTokens.swift
import SwiftUI

enum DesignTokens {
    // MARK: - Colors
    enum Colors {
        // 主色调
        static let primary = Color("Primary", bundle: .module)
        static let primaryVariant = Color("PrimaryVariant", bundle: .module)
        
        // 辅助色
        static let secondary = Color("Secondary", bundle: .module)
        static let secondaryVariant = Color("SecondaryVariant", bundle: .module)
        
        // 背景色
        static let background = Color("Background", bundle: .module)
        static let surface = Color("Surface", bundle: .module)
        
        // 文本色
        static let textPrimary = Color("TextPrimary", bundle: .module)
        static let textSecondary = Color("TextSecondary", bundle: .module)
        static let textDisabled = Color("TextDisabled", bundle: .module)
        
        // 状态色
        static let error = Color("Error", bundle: .module)
        static let success = Color("Success", bundle: .module)
        static let warning = Color("Warning", bundle: .module)
        static let info = Color("Info", bundle: .module)
        
        // 系统颜色（例外情况）
        static let systemBlue = Color.blue
        static let systemRed = Color.red
        static let systemGreen = Color.green
        static let systemOrange = Color.orange
        static let systemGray = Color.gray
    }
    
    // MARK: - Typography
    enum Typography {
        static let largeTitle = Font.system(size: 34, weight: .bold)
        static let title1 = Font.system(size: 28, weight: .bold)
        static let title2 = Font.system(size: 22, weight: .bold)
        static let title3 = Font.system(size: 20, weight: .semibold)
        static let headline = Font.system(size: 17, weight: .semibold)
        static let body = Font.system(size: 17, weight: .regular)
        static let callout = Font.system(size: 16, weight: .regular)
        static let subheadline = Font.system(size: 15, weight: .regular)
        static let footnote = Font.system(size: 13, weight: .regular)
        static let caption1 = Font.system(size: 12, weight: .regular)
        static let caption2 = Font.system(size: 11, weight: .regular)
    }
    
    // MARK: - Spacing
    enum Spacing {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 16
        static let lg: CGFloat = 24
        static let xl: CGFloat = 32
        static let xxl: CGFloat = 48
    }
    
    // MARK: - Corner Radius
    enum CornerRadius {
        static let sm: CGFloat = 4
        static let md: CGFloat = 8
        static let lg: CGFloat = 12
        static let xl: CGFloat = 16
    }
}
```

### ✅ Asset Catalog 目录结构

```
Resources/
└── [PackageName]Assets.xcassets/
    ├── Colors/
    │   ├── Primary.colorset/
    │   │   └── Contents.json
    │   ├── Secondary.colorset/
    │   │   └── Contents.json
    │   ├── Background.colorset/
    │   │   └── Contents.json
    │   ├── TextPrimary.colorset/
    │   │   └── Contents.json
    │   ├── Error.colorset/
    │   │   └── Contents.json
    │   └── Success.colorset/
    │       └── Contents.json
    └── Contents.json
```

---

## 8. 完整示例：符合所有规范的 View

```swift
// ✅ 符合所有规范的完整示例
// 文件名：ManualDetailView.swift（一个文件一个 View + Preview）

import SwiftUI
import SwiftData

// ✅ 使用 struct（值语义）
struct ManualDetailView: View {
    // ✅ 持久化数据使用 @Query
    @Query private var manuals: [Manual]
    @Environment(\.modelContext) private var modelContext
    
    // ✅ 业务数据使用 @Observable（独立 Model）
    @State private var viewModel = ManualDetailViewModel()
    
    // ✅ Service 通过环境注入
    @Environment(\.ocrService) private var ocrService
    
    // ✅ UI 状态使用 @State
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    let manual: Manual
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                // ✅ 使用子 View 拆分复杂逻辑
                ManualHeaderView(manual: manual)
                ManualContent-view(manual: manual, viewModel: viewModel)
                
                if isLoading {
                    ProgressView()
                }
                
                if let errorMessage = errorMessage {
                    Text("错误: \(errorMessage)")
                        .foregroundColor(.red)
                }
            }
            .padding()
        }
        .task {
            // ✅ 使用 .task 执行异步操作
            await loadManualDetails()
        }
    }
    
    // ✅ 异步函数使用 async，UI 更新在 @MainActor
    @MainActor
    private func loadManualDetails() async {
        isLoading = true
        errorMessage = nil
        
        do {
            // ✅ 使用 async/await，不使用 DispatchQueue
            let result = try await ocrService.processImage(manual.coverImage)
            viewModel.update(with: result)
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
}

// ✅ Preview 在同一个文件中
#Preview {
    let config = ModelConfiguration(isStoredInMemoryOnly: true)
    let container = try! ModelContainer(for: Manual.schema, configurations: config)
    let manual = Manual(title: "示例手册")
    container.mainContext.insert(manual)
    
    return ManualDetailView(manual: manual)
        .modelContainer(container)
}
```

---

## 代码生成检查清单

在生成 iOS 代码时，必须验证：

- [ ] **Struct/Class/Enum**：
  - [ ] 优先使用 `struct`，仅在需要引用语义时使用 `class`
  - [ ] 使用 `enum` 表示状态机、选项集合和错误类型
  - [ ] 遵循值语义优先原则

- [ ] **状态管理**：
  - [ ] 简单状态使用 `@State`（loading、showAlert、selectedTab 等）
  - [ ] 复杂状态使用独立的 `@Observable` 模型
  - [ ] 状态模型不依赖 Service 或其他 Model
  - [ ] 避免在 View 中过度使用独立的 `@State` 变量

- [ ] **Service 层**：
  - [ ] Service 作为 View 外部服务层（数据通道、系统服务、复杂算法等）
  - [ ] Service 不包含业务逻辑判断和业务规则
  - [ ] Service 通过协议抽象，环境注入
  - [ ] View 决定何时调用 Service，处理业务逻辑

- [ ] **并发编程**：
  - [ ] UI 更新使用 `@MainActor`
  - [ ] 异步操作使用 `async/await`
  - [ ] 使用 `Task` 执行异步操作
  - [ ] 禁止使用 `NSThread`、`dispatch_async`、`DispatchQueue`（除非与 OC 代码交互）

- [ ] **文件组织**：
  - [ ] 每个文件只包含一个 View 和对应的 Preview
  - [ ] View 和 Preview 在同一个文件中
  - [ ] 辅助类型放在独立文件中

- [ ] **协议和泛型**：
  - [ ] 协议用于服务接口定义，支持依赖注入
  - [ ] 泛型用于提高代码复用性和类型安全
  - [ ] 避免过度抽象

- [ ] **设计令牌（Design Tokens）**：
  - [ ] 所有语义颜色必须在 Asset Catalog 中定义
  - [ ] 颜色访问格式：`Color("ColorName", bundle: .module)`
  - [ ] 禁止在设计令牌中直接使用色值（如 `Color(hex: "#123123")`）
  - [ ] 禁止在设计令牌中使用 RGB 构造器（如 `Color(red:, green:, blue:)`）
  - [ ] 例外：系统颜色可以直接引用（如 `Color.blue`）
  - [ ] 所有颜色必须通过 `DesignTokens.Colors` 访问
  - [ ] 支持暗黑模式：在 Asset Catalog 中配置 Appearance Variants

- [ ] **View 拆分规范**：
  - [ ] **拆分动机检查**（考虑拆分的信号）：
    - [ ] 代码长度：`body` 超过 150 行时应考虑拆分（非强制规则）
    - [ ] 职责复杂度：View 同时处理多个不相关的业务功能
    - [ ] 复用需求：UI 模式需要在多处使用
    - [ ] 逻辑独立性：存在可以独立理解和测试的逻辑单元
    - [ ] UI 区域划分：存在清晰的视觉或功能边界
    - [ ] 嵌套复杂度：条件渲染或控制流嵌套层次过深（3层以上）
  
  - [ ] **拆分决策平衡**：
    - [ ] 应该拆分：当拆分能显著提升代码清晰度、可维护性或可复用性
    - [ ] 谨慎判断：权衡拆分带来的复杂度和收益，避免过度工程化
    - [ ] 不应拆分：简单的 UI 元素或拆分会增加理解成本
  
  - [ ] **父 View 职责**：
    - [ ] 持有所有数据（@Query、@Observable、@State）
    - [ ] 访问所有 Service（@Environment）
    - [ ] 协调多个 Model 的数据，组合业务逻辑
    - [ ] 管理 UI 状态（loading、error）
    - [ ] 通过方法处理业务逻辑，将结果传递给子 View
    - [ ] 负责子 View 之间的数据传递和协调
  
  - [ ] **子 View 职责**：
    - [ ] 接收父 View 传递的数据（通过参数）
    - [ ] 负责自己的展示逻辑（基于传入的数据）
    - [ ] 可以包含简单的业务逻辑判断（基于传入的数据）
    - [ ] 通过闭包回调通知父 View 用户操作
    - [ ] 不直接持有数据（不使用 @Query、@Observable）
    - [ ] 不直接访问 Service（不使用 @Environment 注入 Service）
    - [ ] 不直接操作持久化数据（不使用 modelContext）

---

## 参考资源

- Constitution: `.arckit/memory/constitution.md`
- iOS 架构模板: `.arckit/templates/ios-architecture-template.md`


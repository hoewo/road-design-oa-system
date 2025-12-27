#!/bin/bash

# 用法: ./create_package.sh MyApp

set -e

PROJECT_NAME="$(basename "$PWD")"
PACKAGE_NAME="${PROJECT_NAME}Package"

# 1. 创建主目录
mkdir -p "$PACKAGE_NAME"

cd "$PACKAGE_NAME"

# 2. 初始化 Swift Package（存在则跳过，保证可重复执行）
if [ ! -f Package.swift ]; then
swift package init --type library 
fi

# 3. 创建目录结构及占位文件
SRC_DIR="Sources/$PACKAGE_NAME"
for dir in App Utils Models Resources Services Views; do
  mkdir -p "$SRC_DIR/$dir"
  # 除App和Views外，其他目录生成与目录同名的占位swift文件
  if [[ "$dir" != "App" && "$dir" != "Views" && "$dir" != "Resources" ]]; then
    touch "$SRC_DIR/$dir/${dir}.swift"
  fi
done

# 4. 创建 xcassets 资源和粉色颜色
ASSETS_DIR="$SRC_DIR/Resources/${PACKAGE_NAME}Assets.xcassets"
COLORSET_DIR="$ASSETS_DIR/Colors.colorset"
mkdir -p "$COLORSET_DIR"
cat > "$COLORSET_DIR/Contents.json" <<EOF
{
  "info": { "version": 1, "author": "xcode" },
  "colors": [
    {
      "idiom": "universal",
      "color": {
        "color-space": "srgb",
        "components": { "red": "1.0", "green": "0.0", "blue": "0.5", "alpha": "1.0" }
      }
    }
  ]
}
EOF

# 5. 创建默认@main App入口
cat > "$SRC_DIR/App/${PROJECT_NAME}App.swift" <<EOF
import SwiftUI

@main
struct ${PROJECT_NAME}App: App {
    var body: some Scene {
        WindowGroup {
            MainView()
        }
    }
}
EOF

# 6. 创建默认视图和预览
cat > "$SRC_DIR/Views/MainView.swift" <<EOF
import SwiftUI

struct MainView: View {
    var body: some View {
        Text("Hello, ${PROJECT_NAME}!")
            .foregroundColor(Color.pink)
            .padding()
    }
}

#Preview {
    MainView()
}
EOF

# 7. 更新 Package.swift
cat > Package.swift <<EOF
// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "$PACKAGE_NAME",
    platforms: [
        .iOS(.v18),
        .macOS(.v15),
        .watchOS(.v11),
        .tvOS(.v18),
        .visionOS(.v2)
    ],
    products: [
        .library(
            name: "$PACKAGE_NAME",
            targets: ["$PACKAGE_NAME"]),
    ],
    targets: [
        .target(
            name: "$PACKAGE_NAME",
            resources: [
                .process("Resources")
            ]
        ),
        .testTarget(
            name: "${PACKAGE_NAME}Tests",
            dependencies: ["$PACKAGE_NAME"]
        )
    ]
)
EOF

# 8. 生成工作区文件
# mkdir -p ..
# cat > ../${PROJECT_NAME}.code-workspace <<EOF
# {
# 	"folders": [
# 		{
# 			"path": "$PACKAGE_NAME"
# 		}
# 	],
# 	"settings": {}
# }
# EOF

cd ..
echo "✅ $PACKAGE_NAME Swift Package 初始化完成！"

# 自动用 Cursor 打开生成的 workspace 文件
# open -a "Cursor" "${PROJECT_NAME}.code-workspace"
# 自动创建并推送 GitHub 远程仓库

# bash create_github_repo.sh
# curl -fsSL "https://raw.githubusercontent.com/hoewo/StartSwiftUIMain/refs/heads/main/create_github_repo.sh" | bash



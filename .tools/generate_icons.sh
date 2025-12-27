#!/bin/bash

# macOS AppIcon 图标生成脚本
# 输入: 1024x1024 的图标文件路径
# 输出: AppIcon.appiconset 需要的所有尺寸

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 使用说明
usage() {
    echo "用法: $0 <1024x1024图标文件路径> [输出目录]"
    echo ""
    echo "示例:"
    echo "  $0 logo_new.jpg"
    echo "  $0 /path/to/icon.png"
    exit 1
}

# 检查参数
if [ $# -lt 1 ]; then
    usage
fi

INPUT_FILE="$1"
OUTPUT_DIR="${2:-./PhotoRanker/Assets.xcassets/AppIcon.appiconset}"

# 检查输入文件是否存在
if [ ! -f "$INPUT_FILE" ]; then
    echo -e "${RED}错误: 文件不存在: $INPUT_FILE${NC}"
    exit 1
fi

# 创建输出目录
mkdir -p "$OUTPUT_DIR"

echo -e "${GREEN}开始生成图标...${NC}"
echo "输入文件: $INPUT_FILE"
echo "输出目录: $OUTPUT_DIR"

# 检查是否有 sips 命令（macOS 内置）
if command -v sips &> /dev/null; then
    echo -e "${GREEN}使用 sips 处理图片${NC}"
    
    # 定义图标尺寸配置 (size, filename)
    # 格式: "size:filename"
    icons=(
        "16:icon-16.png"
        "32:icon-16@2x.png"
        "32:icon-32.png"
        "64:icon-32@2x.png"
        "128:icon-128.png"
        "256:icon-128@2x.png"
        "256:icon-256.png"
        "512:icon-256@2x.png"
        "512:icon-512.png"
        "1024:icon-512@2x.png"
    )
    
    for icon_config in "${icons[@]}"; do
        IFS=':' read -r size filename <<< "$icon_config"
        output_path="$OUTPUT_DIR/$filename"
        
        echo "生成 ${size}x${size} -> $filename"
        sips -z "$size" "$size" "$INPUT_FILE" --out "$output_path" > /dev/null 2>&1
        
        if [ $? -eq 0 ]; then
            echo -e "  ${GREEN}✓${NC} 成功"
        else
            echo -e "  ${RED}✗${NC} 失败"
            exit 1
        fi
    done

# 如果没有 sips，尝试使用 convert（ImageMagick）
elif command -v convert &> /dev/null; then
    echo -e "${GREEN}使用 ImageMagick 处理图片${NC}"
    
    icons=(
        "16:icon-16.png"
        "32:icon-16@2x.png"
        "32:icon-32.png"
        "64:icon-32@2x.png"
        "128:icon-128.png"
        "256:icon-128@2x.png"
        "256:icon-256.png"
        "512:icon-256@2x.png"
        "512:icon-512.png"
        "1024:icon-512@2x.png"
    )
    
    for icon_config in "${icons[@]}"; do
        IFS=':' read -r size filename <<< "$icon_config"
        output_path="$OUTPUT_DIR/$filename"
        
        echo "生成 ${size}x${size} -> $filename"
        convert "$INPUT_FILE" -resize "${size}x${size}" "$output_path"
        
        if [ $? -eq 0 ]; then
            echo -e "  ${GREEN}✓${NC} 成功"
        else
            echo -e "  ${RED}✗${NC} 失败"
            exit 1
        fi
    done

else
    echo -e "${RED}错误: 未找到图片处理工具${NC}"
    echo -e "${YELLOW}请安装以下任一工具:${NC}"
    echo "  1. ImageMagick: brew install imagemagick"
    echo "  2. sips 是 macOS 内置工具，应该总是可用"
    exit 1
fi

# 检查是否需要生成 Contents.json
if [ ! -f "$OUTPUT_DIR/Contents.json" ]; then
    echo -e "${YELLOW}生成 Contents.json${NC}"
    cat > "$OUTPUT_DIR/Contents.json" << 'EOF'
{
    "images": [
        {
            "size": "16x16",
            "idiom": "mac",
            "filename": "icon-16.png",
            "scale": "1x"
        },
        {
            "size": "16x16",
            "idiom": "mac",
            "filename": "icon-16@2x.png",
            "scale": "2x"
        },
        {
            "size": "32x32",
            "idiom": "mac",
            "filename": "icon-32.png",
            "scale": "1x"
        },
        {
            "size": "32x32",
            "idiom": "mac",
            "filename": "icon-32@2x.png",
            "scale": "2x"
        },
        {
            "size": "128x128",
            "idiom": "mac",
            "filename": "icon-128.png",
            "scale": "1x"
        },
        {
            "size": "128x128",
            "idiom": "mac",
            "filename": "icon-128@2x.png",
            "scale": "2x"
        },
        {
            "size": "256x256",
            "idiom": "mac",
            "filename": "icon-256.png",
            "scale": "1x"
        },
        {
            "size": "256x256",
            "idiom": "mac",
            "filename": "icon-256@2x.png",
            "scale": "2x"
        },
        {
            "size": "512x512",
            "idiom": "mac",
            "filename": "icon-512.png",
            "scale": "1x"
        },
        {
            "size": "512x512",
            "idiom": "mac",
            "filename": "icon-512@2x.png",
            "scale": "2x"
        }
    ],
    "info": {
        "version": 1,
        "author": "icon.wuruihong.com"
    }
}
EOF
    echo -e "  ${GREEN}✓${NC} 成功"
fi

echo ""
echo -e "${GREEN}所有图标已成功生成到: $OUTPUT_DIR${NC}"
echo ""
echo "生成的文件:"
ls -lh "$OUTPUT_DIR"/*.png 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'


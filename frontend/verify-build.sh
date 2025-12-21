#!/bin/bash
# 验证构建产物中环境变量的替换情况

echo "=========================================="
echo "验证构建产物中环境变量的替换情况"
echo "=========================================="
echo ""

# 检查 .env.production 文件
if [ ! -f ".env.production" ]; then
    echo "❌ .env.production 文件不存在"
    exit 1
fi

echo "📋 .env.production 中的关键环境变量:"
grep "^VITE_API_BASE_URL\|^VITE_NEBULA_AUTH_URL" .env.production | head -2
echo ""

# 检查构建产物
if [ ! -d "dist/assets" ]; then
    echo "❌ dist/assets 目录不存在，请先运行构建"
    exit 1
fi

JS_FILE=$(find dist/assets -name "*.js" | head -1)
if [ -z "$JS_FILE" ]; then
    echo "❌ 未找到构建后的 JS 文件"
    exit 1
fi

echo "📦 检查构建产物: $JS_FILE"
echo ""

# 1. 检查环境变量值是否被替换
echo "1️⃣  检查环境变量值是否被替换:"
API_URL=$(grep -o "http://8.130.39.106:8080/project-oa/v1" "$JS_FILE" | head -1)
AUTH_URL=$(grep -o "http://8.130.39.106:8080" "$JS_FILE" | head -1)

if [ -n "$API_URL" ]; then
    echo "   ✅ VITE_API_BASE_URL 已被替换为: $API_URL"
else
    echo "   ❌ VITE_API_BASE_URL 未被替换"
fi

if [ -n "$AUTH_URL" ]; then
    echo "   ✅ VITE_NEBULA_AUTH_URL 已被替换为: $AUTH_URL"
else
    echo "   ❌ VITE_NEBULA_AUTH_URL 未被替换"
fi
echo ""

# 2. 检查是否还有未替换的环境变量引用
echo "2️⃣  检查是否还有未替换的环境变量引用:"
if grep -q "import\.meta\.env\.VITE_API_BASE_URL\|import\.meta\.env\.VITE_NEBULA_AUTH_URL" "$JS_FILE"; then
    echo "   ❌ 发现未替换的环境变量引用"
    grep -o "import\.meta\.env\.VITE_API_BASE_URL\|import\.meta\.env\.VITE_NEBULA_AUTH_URL" "$JS_FILE" | head -3
else
    echo "   ✅ 未发现未替换的环境变量引用"
fi
echo ""

# 3. 检查警告信息
echo "3️⃣  检查警告信息:"
WARN_COUNT=$(grep -o "VITE_API_BASE_URL not set\|VITE_NEBULA_AUTH_URL not set" "$JS_FILE" | wc -l | tr -d ' ')
if [ "$WARN_COUNT" -gt 0 ]; then
    echo "   ⚠️  发现 $WARN_COUNT 个警告信息（这是正常的，因为警告信息是字符串，即使环境变量被替换了，警告字符串仍然存在）"
    echo "   💡 提示: 如果环境变量值已被正确替换（见步骤1），那么警告信息只是字符串残留，不会实际执行"
else
    echo "   ✅ 未发现警告信息"
fi
echo ""

# 4. 总结
echo "=========================================="
echo "验证总结:"
echo "=========================================="
if [ -n "$API_URL" ] && [ -n "$AUTH_URL" ]; then
    echo "✅ 环境变量已被正确替换到构建产物中"
    echo "✅ 修复成功！"
    if [ "$WARN_COUNT" -gt 0 ]; then
        echo "⚠️  警告信息仍然存在，但这是正常的（字符串残留）"
        echo "   实际运行时不会触发警告，因为环境变量已被正确替换"
    fi
else
    echo "❌ 环境变量未被正确替换"
    echo "   请检查构建配置和 .env.production 文件"
fi


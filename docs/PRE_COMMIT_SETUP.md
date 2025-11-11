# Pre-commit Hooks 配置说明

本文档说明如何设置和使用项目的 Git hooks 和 pre-commit 配置。

## 概述

项目使用 [pre-commit](https://pre-commit.com/) 框架来管理 Git hooks，确保代码质量和一致性。

## 已配置的 Hooks

### 通用文件检查
- **trailing-whitespace**: 移除行尾空白
- **end-of-file-fixer**: 确保文件以换行符结尾
- **check-yaml**: 验证 YAML 文件格式
- **check-json**: 验证 JSON 文件格式
- **check-added-large-files**: 检查大文件（最大 10MB）
- **check-merge-conflict**: 检测合并冲突标记
- **check-case-conflict**: 检测文件名大小写冲突
- **detect-private-key**: 检测私钥文件
- **mixed-line-ending**: 统一行尾符为 LF

### Go 后端检查
- **go-fmt**: 自动格式化 Go 代码
- **go-vet**: 运行 Go 静态分析工具
- **go-mod-tidy**: 整理 Go 模块依赖

### 前端检查
- **prettier-frontend**: 使用 Prettier 格式化前端代码（TypeScript/JavaScript/CSS）
- **eslint-frontend**: 使用 ESLint 检查前端代码

### 提交消息检查
- **commitizen**: 验证提交消息格式（可选）

## 安装步骤

### 1. 安装 pre-commit

如果项目使用 Python 虚拟环境：

```bash
# 激活虚拟环境
source venv/bin/activate

# 安装 pre-commit
pip install pre-commit
```

或者使用系统 Python：

```bash
pip3 install pre-commit --user
```

### 2. 安装 Git Hooks

在项目根目录运行：

```bash
pre-commit install
```

这会安装 `pre-commit` hook。如果需要安装 `commit-msg` hook（用于提交消息检查）：

```bash
pre-commit install --hook-type commit-msg
```

### 3. 验证安装

运行所有 hooks 来验证配置：

```bash
pre-commit run --all-files
```

## 使用方法

### 自动运行

安装 hooks 后，每次执行 `git commit` 时，hooks 会自动运行：

```bash
git add .
git commit -m "Your commit message"
```

如果任何 hook 失败，提交将被阻止。修复问题后重新提交即可。

### 手动运行

#### 运行所有 hooks（针对所有文件）

```bash
pre-commit run --all-files
```

#### 运行特定 hook

```bash
pre-commit run <hook-id>
```

例如：

```bash
pre-commit run go-fmt
pre-commit run prettier-frontend
```

#### 只运行针对暂存文件的 hooks

```bash
pre-commit run
```

### 跳过 Hooks

如果需要跳过 hooks（不推荐），使用 `--no-verify` 标志：

```bash
git commit --no-verify -m "Your commit message"
```

## 更新 Hooks

定期更新 hooks 到最新版本：

```bash
pre-commit autoupdate
```

这会更新 `.pre-commit-config.yaml` 中的 hook 版本。

## 故障排除

### 问题：Go hooks 失败

**症状**: `go vet` 或 `go fmt` 失败

**解决方案**:
1. 确保在 `backend/` 目录下有 `go.mod` 文件
2. 确保 Go 已正确安装：`go version`
3. 运行 `cd backend && go mod tidy` 确保依赖正确

### 问题：前端 hooks 失败

**症状**: Prettier 或 ESLint 失败

**解决方案**:
1. 确保前端依赖已安装：`cd frontend && npm install`
2. 确保 `frontend/node_modules` 目录存在
3. 手动运行检查：`cd frontend && npm run lint`

### 问题：pre-commit 未运行

**症状**: 提交时 hooks 没有执行

**解决方案**:
1. 检查 hooks 是否已安装：`ls -la .git/hooks/pre-commit`
2. 重新安装：`pre-commit install`
3. 检查 `.pre-commit-config.yaml` 文件是否存在且格式正确

### 问题：Node.js 环境问题

**症状**: 前端 hooks 无法找到 Node.js

**解决方案**:
1. 确保 Node.js 已安装：`node --version`
2. 如果使用 nvm，确保在项目目录中 Node.js 可用
3. 前端 hooks 会在 `node_modules` 不存在时自动跳过

## 配置自定义 Hooks

如果需要添加自定义 hooks，编辑 `.pre-commit-config.yaml` 文件。

示例：添加自定义 shell 脚本检查

```yaml
- repo: local
  hooks:
    - id: custom-check
      name: Custom Check
      entry: bash -c './scripts/custom-check.sh'
      language: system
      files: ^.*\.sh$
```

## 最佳实践

1. **提交前运行检查**: 在提交前运行 `pre-commit run --all-files` 确保所有检查通过
2. **保持 hooks 更新**: 定期运行 `pre-commit autoupdate` 获取最新版本
3. **不要跳过 hooks**: 除非有特殊原因，不要使用 `--no-verify`
4. **修复而不是忽略**: 如果 hook 失败，修复问题而不是禁用 hook

## 相关文件

- `.pre-commit-config.yaml`: Pre-commit 配置文件
- `.git/hooks/pre-commit`: 安装的 pre-commit hook（自动生成）
- `.git/hooks/commit-msg`: 安装的 commit-msg hook（如果启用）

## 参考资源

- [Pre-commit 官方文档](https://pre-commit.com/)
- [Pre-commit Hooks 仓库](https://github.com/pre-commit/pre-commit-hooks)
- [Go Pre-commit Hooks](https://github.com/dnephin/pre-commit-golang)


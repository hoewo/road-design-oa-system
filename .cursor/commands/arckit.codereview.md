---
description: Review implemented code, identify issues, and fix them layer by layer following architecture patterns.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Setup**: Run `.arckit/scripts/bash/setup-codereview.sh --json` from repo root and parse JSON for:
   - FEATURE_DIR, IMPL_PLAN, TASKS, PROJECT_STRUCTURE, CONSTITUTION
   - DESIGN_DIR (if exists), CODEREVIEW_DIR, CODEREVIEW_REPORT, CODEREVIEW_TEMPLATE

2. **Identify review scope and generate feature name**:
   - **Determine review scope**: From `$ARGUMENTS` (files/dirs) or git status, determine which tiers need review
   - **Generate FEATURE_NAME**: Extract from `$ARGUMENTS`, file paths, plan.md, or fallback to "feature"
   - **Store**: Review scope, FEATURE_NAME, and target tiers

3. **Pre-review Git Commit** (if HAS_GIT is true):
   - Get current branch and check for uncommitted changes
   - If changes exist: Auto-commit with message `feat: Pre-codereview snapshot - [FEATURE_NAME]`
   - Record commit hash as pre-review snapshot
   - **Store for report**: Branch name and commit hash

4. **Create Review Report Document**:
   - Copy `CODEREVIEW_TEMPLATE` to `CODEREVIEW_REPORT` with unique filename `codereview-YYYYMMDD-HHMMSS.md`
   - Replace placeholders: FEATURE_NAME, DATE, TIME, BRANCH, COMMIT_HASH
   - Remove checklist sections for non-existent tiers (based on PROJECT_STRUCTURE)
   - Write initial report file

5. **Load context**:
   - Read IMPL_PLAN (tech stack, architecture), TASKS (features), CONSTITUTION (compliance)
   - If DESIGN_DIR exists: Read overview.md and summary.md
   - Parse PROJECT_STRUCTURE to identify tiers (backend/frontend/client)

6. **Execute layered code review** (自底向上，逐层审查修复):
   
   **CRITICAL**: Each stage must be completed and report updated BEFORE moving to next stage. For each stage:
   1. Review checklist items → 2. Fix issues immediately → 3. **Update report immediately** → 4. Mark items completed → 5. Update stage status/counts → 6. Add timestamp → 7. **Save report** → 8. Proceed to next stage
   
   **Stage execution order**:
   
   - **阶段 0：基础设施层（Foundation Layer）**:
     - Work through CR00X items: Build config, dependencies, shared utilities, code standards
     - Fix issues → Update report with findings/fixes → Mark `- [ ]` → `- [X]` → Update status "PENDING" → "COMPLETED"
     - Add timestamp `- [TIME] - 阶段 0 completed` → **Save report** → Compile/build verification
   
   - **阶段 1：服务端（Backend - if exists in PROJECT_STRUCTURE）**:
     - Work through CR1XX, CR2XX, CR3XX items
     - **Focus**: 功能支撑是否满足 (Does backend provide what client/frontend needs?)
       - 1.1 数据层 (CR1XX): Models, validation, persistence
       - 1.2 业务层 (CR2XX): Business logic, state, error handling
       - 1.3 接口层 (CR3XX): API completeness, spec compliance
     - Fix issues → Update report immediately → Mark completed → Update status/counts
     - Add timestamp `- [TIME] - 阶段 1 completed` → **Save report** → Backend compilation (CR390, CR391)
   
   - **阶段 2：客户端层（Client Layer - if "client" or "frontend" exists）**:
     - Determine client type from PROJECT_STRUCTURE: mobile/client (iOS, Android) or web frontend
     - Work through CR4XX, CR5XX, CR6XX items (apply to detected client type(s))
     - **Focus**: 接口和数据结构对齐 (Data/API alignment with backend)
       - 2.1 数据层 (CR4XX): Data structure alignment, parsing
       - 2.2 业务层 (CR5XX): API calls, response handling
       - 2.3 UI层 (CR6XX): UI compliance, error display, state completeness
     - Fix issues → Update report immediately → Mark completed → Update status/counts
     - Add timestamp `- [TIME] - 阶段 2 completed` → **Save report** → Client compilation (CR690, CR691)

7. **Finalize review report**:
   - **Note**: Most sections already updated during stage execution. This step is for final summary.
   - Update Executive Summary: Total issues, fixed/pending counts, compilation status per tier
   - Update Issue Categories Summary, Compilation & Runtime Status
   - Add Recommendations based on issues found
   - Update Review Status: "IN PROGRESS" → "COMPLETED", add final timestamp and "Next Steps"
   - **Save final report** to `CODEREVIEW_REPORT`

8. **Report completion**:
   - Display report file path and summary statistics (total/fixed/pending issues, compilation status per tier)
   - If pending issues: List with priority, suggest manual review
   - If all fixed: "All issues resolved! Code review completed successfully."
   - Suggest next steps: Run `git diff [COMMIT_HASH]` (if git repo), review report, run tests, commit changes

## Review Rules

### Core Principles

1. **Layered approach**: Review 自底向上 (Foundation → Backend → Client Layer)
2. **Update report immediately**: After each stage completion, update report BEFORE next stage
3. **Fix immediately**: Fix issues as found, document all fixes in report immediately
4. **Compilation checkpoints**: After each tier, compile and fix compilation errors
5. **Context-aware**: Reference spec.md, plan.md, Constitution, design docs

### Review Focus by Tier

- **Foundation**: Build config, dependencies, shared code
- **Backend**: 功能支撑是否满足 (Does it provide what client/frontend needs?)
- **Client Layer**: 接口和数据结构对齐 (Data/API alignment with backend). Applies to mobile clients and web frontends.

### Issue Priority

- **P0**: Compilation failures, data structure mismatches
- **P1**: Business logic gaps, API issues, error handling
- **P2**: Architecture violations, code standards, design compliance
- **P3**: Security, performance, accessibility, i18n improvements

## Notes

- Run after `implement` phase for systematic code review following architecture layers
- Report updated immediately after each stage - do NOT wait until all stages done
- Client layer applies to both mobile clients (iOS, Android) and web frontends

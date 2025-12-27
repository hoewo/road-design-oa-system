---
description: Execute the implementation plan by processing and executing all tasks defined in tasks.md
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. Run `.arckit/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` from repo root and parse the output variables. All paths are returned as absolute paths. Key variables include:
   - **FEATURE_DIR**: Absolute path to feature directory
   - **AVAILABLE_DOCS**: List of available documentation files
   - **Design Resources**: DESIGN_DIR (if exists - absolute path to design documentation: specs/main/design/)
     - Contains: overview.md, summary.md, visual-design.md, interaction-design.md, components/, wireframes/
   - **Templates**: IOS_ARCH_TEMPLATE, IOS_STYLE_TEMPLATE (absolute paths to iOS architecture and style templates)
   
   For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").

2. **Check checklists status** (if FEATURE_DIR/checklists/ exists):
   - Scan all checklist files in the checklists/ directory
   - For each checklist, count:
     - Total items: All lines matching `- [ ]` or `- [X]` or `- [x]`
     - Completed items: Lines matching `- [X]` or `- [x]`
     - Incomplete items: Lines matching `- [ ]`
   - Create a status table:

     ```text
     | Checklist | Total | Completed | Incomplete | Status |
     |-----------|-------|-----------|------------|--------|
     | ux.md     | 12    | 12        | 0          | ✓ PASS |
     | test.md   | 8     | 5         | 3          | ✗ FAIL |
     | security.md | 6   | 6         | 0          | ✓ PASS |
     ```

   - Calculate overall status:
     - **PASS**: All checklists have 0 incomplete items
     - **FAIL**: One or more checklists have incomplete items

   - **If any checklist is incomplete**:
     - Display the table with incomplete item counts
     - **STOP** and ask: "Some checklists are incomplete. Do you want to proceed with implementation anyway? (yes/no)"
     - Wait for user response before continuing
     - If user says "no" or "wait" or "stop", halt execution
     - If user says "yes" or "proceed" or "continue", proceed to step 3

   - **If all checklists are complete**:
     - Display the table showing all checklists passed
     - Automatically proceed to step 3

3. Load and analyze the implementation context:
   - **REQUIRED**: Read `$TASKS` (tasks.md) for the complete task list and execution plan
   - **REQUIRED**: Read `$IMPL_PLAN` (plan.md) for tech stack, architecture, and file structure
   - **IF iOS PROJECT**: Read `$IOS_ARCH_TEMPLATE` for iOS architecture patterns (absolute path from step 1)
   - **IF iOS PROJECT**: Read `$IOS_STYLE_TEMPLATE` for iOS code style templates (absolute path from step 1)
   - **IF EXISTS**: Read `$DATA_MODEL` (data-model.md) for entities and relationships
   - **IF EXISTS**: Read `$CONTRACTS_DIR` (contracts/) for API specifications and test requirements
   - **IF EXISTS**: Read `$RESEARCH` (research.md) for technical decisions and constraints
   - **IF EXISTS**: Read `$QUICKSTART` (quickstart.md) for integration scenarios
   - **IF $DESIGN_DIR EXISTS**: Load design documents based on current task phase:
     - **Foundational phase**: Visual tasks → visual-design.md | Interaction tasks → interaction-design.md | Component tasks → components/{name}.md
     - **User Story phase**: Page tasks → wireframes/{page}.html (load ALL states, extract UI/components/interactions)
     - **Polish phase**: Constitution compliance → overview.md
     - **Rule**: Load specific docs only when task requires them, never all at once

4. **Project Setup Verification**:
   - **REQUIRED**: Create/verify ignore files based on actual project setup:

   **Detection & Creation Logic**:
   - Check if the following command succeeds to determine if the repository is a git repo (create/verify .gitignore if so):

     ```sh
     git rev-parse --git-dir 2>/dev/null
     ```

   - Check if Dockerfile* exists or Docker in plan.md → create/verify .dockerignore
   - Check if .eslintrc*or eslint.config.* exists → create/verify .eslintignore
   - Check if .prettierrc* exists → create/verify .prettierignore
   - Check if .npmrc or package.json exists → create/verify .npmignore (if publishing)
   - Check if terraform files (*.tf) exist → create/verify .terraformignore
   - Check if .helmignore needed (helm charts present) → create/verify .helmignore

   **If ignore file already exists**: Verify it contains essential patterns, append missing critical patterns only
   **If ignore file missing**: Create with full pattern set for detected technology

   **Common Patterns by Technology** (from plan.md tech stack):
   - **Node.js/JavaScript/TypeScript**: `node_modules/`, `dist/`, `build/`, `*.log`, `.env*`
   - **Python**: `__pycache__/`, `*.pyc`, `.venv/`, `venv/`, `dist/`, `*.egg-info/`
   - **Java**: `target/`, `*.class`, `*.jar`, `.gradle/`, `build/`
   - **C#/.NET**: `bin/`, `obj/`, `*.user`, `*.suo`, `packages/`
   - **Go**: `*.exe`, `*.test`, `vendor/`, `*.out`
   - **Ruby**: `.bundle/`, `log/`, `tmp/`, `*.gem`, `vendor/bundle/`
   - **PHP**: `vendor/`, `*.log`, `*.cache`, `*.env`
   - **Rust**: `target/`, `debug/`, `release/`, `*.rs.bk`, `*.rlib`, `*.prof*`, `.idea/`, `*.log`, `.env*`
   - **Kotlin**: `build/`, `out/`, `.gradle/`, `.idea/`, `*.class`, `*.jar`, `*.iml`, `*.log`, `.env*`
   - **C++**: `build/`, `bin/`, `obj/`, `out/`, `*.o`, `*.so`, `*.a`, `*.exe`, `*.dll`, `.idea/`, `*.log`, `.env*`
   - **C**: `build/`, `bin/`, `obj/`, `out/`, `*.o`, `*.a`, `*.so`, `*.exe`, `Makefile`, `config.log`, `.idea/`, `*.log`, `.env*`
   - **Swift**: `.build/`, `DerivedData/`, `*.swiftpm/`, `Packages/`
   - **R**: `.Rproj.user/`, `.Rhistory`, `.RData`, `.Ruserdata`, `*.Rproj`, `packrat/`, `renv/`
   - **Universal**: `.DS_Store`, `Thumbs.db`, `*.tmp`, `*.swp`, `.vscode/`, `.idea/`

   **Tool-Specific Patterns**:
   - **Docker**: `node_modules/`, `.git/`, `Dockerfile*`, `.dockerignore`, `*.log*`, `.env*`, `coverage/`
   - **ESLint**: `node_modules/`, `dist/`, `build/`, `coverage/`, `*.min.js`
   - **Prettier**: `node_modules/`, `dist/`, `build/`, `coverage/`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`
   - **Terraform**: `.terraform/`, `*.tfstate*`, `*.tfvars`, `.terraform.lock.hcl`
   - **Kubernetes/k8s**: `*.secret.yaml`, `secrets/`, `.kube/`, `kubeconfig*`, `*.key`, `*.crt`

5. Parse tasks.md structure and extract:
   - **Task phases**: Setup, Tests, Core, Integration, Polish
   - **Task dependencies**: Sequential vs parallel execution rules
   - **Task details**: ID, description, file paths, parallel markers [P]
   - **Execution flow**: Order and dependency requirements

6. **Constitution Compliance Check** (before code generation):
   - **Design Resources Check** (if $DESIGN_DIR exists):
     - ✅ Verify core design documents exist:
       - Check `$DESIGN_DIR/overview.md` (design system overview and index)
       - Check `$DESIGN_DIR/summary.md` (aggregated summary for quick reference)
     - ✅ Verify specifications exist (based on current task):
       - For visual tasks: Check `$DESIGN_DIR/visual-design.md` (DesignTokens system)
       - For interaction tasks: Check `$DESIGN_DIR/interaction-design.md` (interaction patterns)
      - For component tasks: Check `$DESIGN_DIR/components/{component-name}.md`
      - For page tasks: Check `$WIREFRAMES_DIR/{page-name}.html`
     - ✅ Verify all states are defined:
       - Component specs must include at least: Normal, Pressed, Disabled states
       - Wireframe HTML must include at least: Loading, Success, Empty, Error states
     - ✅ Verify DesignTokens usage:
       - All design values must use `DesignTokens.Category.property` format
       - No hardcoded colors, sizes, or fonts in specifications
     - ⚠️ If design resources incomplete, WARN and suggest: "Run: design {scope}"
   - **For iOS projects**: Verify compliance with Constitution principles:
     - **Architecture**: Model independence (含状态管理分层 @State vs @Observable), Service as View external services (数据通道、系统服务、复杂算法), View as coordinator
     - **Code Style**: Struct/Class/Enum usage, Swift concurrency (no OC threading), file organization (one View + Preview per file), protocols/generics usage
     - **View Splitting**: 代码长度 >150 行时考虑拆分（非强制），基于可读性、可维护性和可测试性判断
     - **Reference templates**: Use `$IOS_ARCH_TEMPLATE` and `$IOS_STYLE_TEMPLATE` (absolute paths from step 1)
     - **Reference design docs**: Use `$DESIGN_DIR` for UI/UX implementation guidance
   - **For all projects**: Verify compliance with general Constitution principles
   - **Before generating any code**: Review the Constitution requirements and ensure generated code will comply
   - **Code generation rules**:
     - ✅ MUST use templates from `$IOS_STYLE_TEMPLATE` for iOS code (absolute path)
     - ✅ MUST follow architecture patterns from `$IOS_ARCH_TEMPLATE` for iOS (absolute path)
     - ✅ MUST verify compliance with Constitution before writing code
     - ✅ MUST verify design resources are complete before starting UI implementation (check $DESIGN_DIR)
     - ❌ MUST NOT generate code that violates Constitution principles

7. Execute implementation following the task plan:
   - **Phase-by-phase execution**: Complete each phase before moving to the next
   - **Respect dependencies**: Run sequential tasks in order, parallel tasks [P] can run together  
   - **Follow TDD approach**: Execute test tasks before their corresponding implementation tasks
   - **File-based coordination**: Tasks affecting the same files must run sequentially
   - **Validation checkpoints**: Verify each phase completion before proceeding
   - **Constitution compliance**: Before generating code, reference appropriate templates and verify compliance

8. Implementation execution rules:
   - **Setup first**: Initialize project structure, dependencies, configuration
   - **Tests before code**: If you need to write tests for contracts, entities, and integration scenarios
   - **Core development**: Implement models, services, CLI commands, endpoints
     - **For iOS**: Use templates from `.arckit/templates/ios-code-style-templates.md` when generating code
     - **For iOS**: Ensure each Swift file contains only one View and its Preview
     - **For iOS**: Use Swift concurrency (`@MainActor`, `async/await`, `Task`), never OC threading
     - **For iOS**: Follow struct-first approach, use class only when reference semantics needed
   - **Integration work**: Database connections, middleware, logging, external services
   - **Polish and validation**: Unit tests, performance optimization, documentation

9. Progress tracking and error handling:
   - Report progress after each completed task
   - Halt execution if any non-parallel task fails
   - For parallel tasks [P], continue with successful tasks, report failed ones
   - Provide clear error messages with context for debugging
   - Suggest next steps if implementation cannot proceed
   - **IMPORTANT** For completed tasks, make sure to mark the task off as [X] in the tasks file.

10. Completion validation:
   - Verify all required tasks are completed
   - Check that implemented features match the original specification
   - Validate that tests pass and coverage meets requirements
   - Confirm the implementation follows the technical plan
   - Report final status with summary of completed work

Note: This command assumes a complete task breakdown exists in tasks.md. If tasks are incomplete or missing, suggest running `/arckit.tasks` first to regenerate the task list.

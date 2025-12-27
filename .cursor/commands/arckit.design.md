---
description: Create or update complete design documentation including specifications, components, and wireframes.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Setup**: Run `.arckit/scripts/bash/setup-design.sh --json` from repo root and parse JSON output. All paths are absolute. For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").
   
   **Output variables**:
   - **DESIGN_DIR**: Design documentation root directory (specs/main/design/)
   - **OVERVIEW_FILE**: overview.md path
   - **SUMMARY_FILE**: summary.md path
   - **VISUAL_DESIGN_FILE**: visual-design.md path
   - **INTERACTION_DESIGN_FILE**: interaction-design.md path
   - **COMPONENTS_DIR**: components/ directory path
   - **WIREFRAMES_DIR**: wireframes/ directory path
   - **OVERVIEW_TEMPLATE**: Template for overview.md
   - **SUMMARY_TEMPLATE**: Template for summary.md
   - **VISUAL_DESIGN_TEMPLATE**: Template for visual-design.md
   - **INTERACTION_DESIGN_TEMPLATE**: Template for interaction-design.md
   - **COMPONENT_TEMPLATE**: Template for component files
   - **WIREFRAME_PAGE_TEMPLATE**: Template for wireframe HTML files
   - **FEATURE_SPEC**: Feature spec.md path (for context)
   - **BRANCH**: Current git branch name
   - **HAS_GIT**: "true" if git repo, "false" otherwise

2. **Parse user intent from $ARGUMENTS**:
   - Empty or "all" → Generate all design documents (default)
   - "visual" → visual-design.md only
   - "interaction" → interaction-design.md only
   - "components [Names]" → Specific components only
   - "wireframes [ViewNames]" → Specific wireframes only
   - "summary" → Regenerate summary.md only

3. **Check existing files and determine mode**:
   - **If OVERVIEW_FILE exists** → UPDATE mode
     - Preserve existing overview.md structure and manual edits
     - Only update aggregated sections (document index)
     - Add new items, don't remove existing items
     - Warn if conflicts detected (e.g., template structure changed)
   - **If OVERVIEW_FILE missing** → CREATE mode
     - Fresh generation from templates
     - Generate complete structure
   - **For specific scopes** (visual/interaction/components/wireframes):
     - If target file exists → UPDATE (merge new content)
     - If target file missing → CREATE (fresh generation)
   - **Always regenerate** summary.md (it's purely aggregated data)

4. **Check dependencies**:
   - "visual" / "interaction" / "all" → Requires spec.md
   - "components" → Requires spec.md + visual-design.md + interaction-design.md
   - "wireframes" → Requires spec.md + components (basic components)
   - If missing → ERROR with command to run

5. **Load context**:
   - Read FEATURE_SPEC for: feature name, platform, user stories with priorities, design requirements
   - IF EXISTS: Read `.arckit/memory/constitution.md` for design principles (Accessibility, Performance, i18n)
   - Load relevant templates based on scope

6. **Execute generation** (for "all", follow this order):
   1. Generate overview.md (skeleton with placeholders)
   2. Generate visual-design.md (DesignTokens: Colors, Typography, Spacing, CornerRadius, Shadows, Animations)
   3. Generate interaction-design.md (patterns: editing, deleting, list ops, navigation, gestures, feedback)
   4. Generate components (from spec.md user stories: basic → composite → page-level, standard set: Button, TextField, Label, LoadingView, ErrorView, EmptyStateView)
   5. Generate wireframes (from spec.md user stories, by priority P1→P2→P3, minimum 4 states each)
   6. Generate summary.md (aggregate all info from above)
   7. Update overview.md (complete document index)

7. **For partial generation**: Generate requested items only, then update summary.md

8. **Generate overview.md**:
   - Read OVERVIEW_TEMPLATE
   - Replace placeholders: [PRODUCT NAME], [DATE]
   - Fill design principles (extract from `.arckit/memory/constitution.md` if exists, else use template defaults)
   - Fill platform requirements (from spec.md)
   - Write to OVERVIEW_FILE

9. **Generate visual-design.md**:
   - Read VISUAL_DESIGN_TEMPLATE
   - Replace placeholders: [FEATURE NAME], [DATE], [PLATFORM]
   - Define DesignTokens: Colors (primary 2, semantic 5, neutral 10, system 5), Typography (8 levels, 4 weights), Spacing (7 levels: xs 4pt to 3xl 48pt), CornerRadius (4), Shadows (3), Icons (3 sizes), Animations (3: fast 0.2s, standard 0.3s, slow 0.5s)
   - Fill SwiftUI implementation examples
   - Write to VISUAL_DESIGN_FILE

10. **Generate interaction-design.md**:
    - Read INTERACTION_DESIGN_TEMPLATE
    - Replace placeholders
    - Define patterns: Editing (Sheet/Modal), Deleting (Confirmation), List ops (iOS swipe, macOS right-click)
    - Define navigation: iOS (NavigationStack), macOS (NavigationSplitView 3-column)
    - Define gestures, animations (use DesignTokens), feedback (haptic/sound), response times (<100ms)
    - Write to INTERACTION_DESIGN_FILE

11. **Generate components** (if in scope):
    - Identify from spec.md user stories
    - For "all": Generate standard set (Button, TextField, Label, LoadingView, ErrorView, EmptyStateView) + spec.md components
    - For each component:
      - Read COMPONENT_TEMPLATE
      - Replace placeholders, define visual specs (all use DesignTokens), states (min: Normal, Pressed, Disabled), interactions, accessibility
      - Write to COMPONENTS_DIR/{component-name}.md (kebab-case)
    - Priority: Basic (no deps) → Composite (deps on basic) → Page-level

12. **Generate wireframes** (if in scope):
    - Identify from spec.md user stories with priorities
    - For each page:
      - Read WIREFRAME_PAGE_TEMPLATE
      - Generate kebab-case filename (HomeView → home-view.html)
      - Replace placeholders: {{PAGE_NAME}}, {{VIEW_NAME}}, {{PLATFORM}}, {{NAV_LEVEL}}
      - Customize content: all states (min 4: 加载中, 成功, 空状态, 错误), component lists, interactions
      - Write to WIREFRAMES_DIR/{page-name}.html

13. **Generate summary.md** (always at end):
    - Aggregate from all files:
      - Visual specs: count colors, typography, spacing, etc.
      - Interaction specs: extract patterns, navigation, timings
      - Components: scan COMPONENTS_DIR, extract name/type/complexity/states/deps, count by type
      - Pages: scan WIREFRAMES_DIR, extract name/ViewName/states/components/complexity/priority, count by priority
    - Read SUMMARY_TEMPLATE
    - Fill all sections, replace placeholders
    - Write to SUMMARY_FILE

14. **Update overview.md**:
    - Re-read OVERVIEW_FILE
    - Update component and wireframe document lists
    - Write back

15. **Validation** (before reporting):
    
    **File existence check**:
    - Verify all requested files exist in DESIGN_DIR
    - For "all": Check overview.md, summary.md, visual-design.md, interaction-design.md, components/, wireframes/
    - For partial scopes: Check only requested files
    
    **Placeholder check**:
    - Search for patterns: `\[.*\]`, `\{.*\}`, `<!-- ACTION REQUIRED -->`
    - ✅ PASS: No unresolved placeholders found
    - ❌ FAIL: Report files with placeholders, list line numbers
    
    **DesignTokens compliance check**:
    - Scan all .md files in components/ and design root directory
    - ✅ Search for: `DesignTokens\.` pattern (positive check)
    - ❌ Search for hardcoded patterns:
      - Colors: `#[0-9a-fA-F]{6}`, `Color\.red`, `Color\.blue`, etc.
      - Sizes: `\.padding\(\d+\)`, `\.frame\(width: \d+`, etc.
      - Fonts: `\.font\(\.system\(size: \d+`, etc.
    - ✅ PASS: All design values use DesignTokens format
    - ❌ FAIL: Report files with hardcoded values, list line numbers
    
    **Wireframe states check**:
    - For each .html file in wireframes/
    - Count `<details` elements (each represents one state)
    - ✅ PASS: Count ≥ 4 states per wireframe
    - ❌ FAIL: Report wireframes with < 4 states
    
    **Summary aggregation check**:
    - Count component .md files in COMPONENTS_DIR
    - Count wireframe .html files in WIREFRAMES_DIR
    - Compare with counts in summary.md
    - ✅ PASS: Counts match
    - ❌ FAIL: Report mismatch with actual counts
    
    **Overview index check**:
    - Read overview.md document index
    - Compare with actual files in components/ and wireframes/
    - ✅ PASS: All files listed in index
    - ❌ FAIL: Report missing files from index
    
    **If any validation fails**:
    - Report all failures with specific details
    - Attempt auto-fix for minor issues (placeholders, index updates)
    - For major issues (hardcoded values): WARN and suggest manual review

16. **Report**: Branch, DESIGN_DIR path, generated file list, next steps: "Review design documents, then run tasks"

## Key Rules

### DesignTokens Requirement
- ALL design values MUST use DesignTokens format: `DesignTokens.Category.property`
- NO hardcoded: colors (#FF0000, Color.red), sizes (.padding(16)), fonts (.font(.system(size: 16)))
- Examples: DesignTokens.Colors.primary, DesignTokens.Spacing.md, DesignTokens.Typography.body

### File Naming
- Components: kebab-case (button.md, text-field.md, loading-view.md)
- Wireframes: kebab-case (home-view.html, detail-view.html)

### Constitution Compliance
- Accessibility: VoiceOver, Dynamic Type
- Performance: 60fps UI, <100ms response
- Internationalization: Multi-language, text adaptation
- Platform-specific: iOS (single window, NavigationStack), macOS (3-column, NavigationSplitView)

### Standard Components (for "all")
Always include: Button, TextField, Label, LoadingView, ErrorView, EmptyStateView + components from spec.md

---

**NOTE**: Replaces separate design-wireframes and design-specifications commands. Always generates overview.md + summary.md for consistency.

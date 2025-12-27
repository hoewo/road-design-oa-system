#!/usr/bin/env bash

set -e

# Parse command line arguments
JSON_MODE=false
ARGS=()

for arg in "$@"; do
    case "$arg" in
        --json) 
            JSON_MODE=true 
            ;;
        --help|-h) 
            echo "Usage: $0 [--json]"
            echo "  --json    Output results in JSON format"
            echo "  --help    Show this help message"
            exit 0 
            ;;
        *) 
            ARGS+=("$arg") 
            ;;
    esac
done

# Get script directory and load common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

# Get all paths and variables from common functions
eval $(get_feature_paths)

# Check if we're on a proper feature branch (only for git repos)
check_feature_branch "$CURRENT_BRANCH" "$HAS_GIT" || exit 1

# Ensure the feature directory exists
if [[ ! -d "$FEATURE_DIR" ]]; then
    echo "ERROR: Feature directory not found: $FEATURE_DIR" >&2
    exit 1
fi

# Check required files
if [[ ! -f "$IMPL_PLAN" ]]; then
    echo "ERROR: Implementation plan not found: $IMPL_PLAN" >&2
    echo "Run '/arckit.plan' first to create implementation plan" >&2
    exit 1
fi

if [[ ! -f "$TASKS" ]]; then
    echo "ERROR: Tasks file not found: $TASKS" >&2
    echo "Run '/arckit.tasks' first to create task list" >&2
    exit 1
fi

# Detect project structure (backend, frontend, client)
detect_project_structure() {
    local structure=""
    
    # Check for backend indicators
    if [[ -f "$REPO_ROOT/package.json" ]] || \
       [[ -f "$REPO_ROOT/requirements.txt" ]] || \
       [[ -f "$REPO_ROOT/Cargo.toml" ]] || \
       [[ -f "$REPO_ROOT/go.mod" ]] || \
       [[ -f "$REPO_ROOT/pom.xml" ]] || \
       [[ -f "$REPO_ROOT/build.gradle" ]] || \
       [[ -d "$REPO_ROOT/src" ]]; then
        structure="${structure}backend,"
    fi
    
    # Check for frontend indicators
    if [[ -d "$REPO_ROOT/frontend" ]] || \
       [[ -d "$REPO_ROOT/web" ]] || \
       [[ -f "$REPO_ROOT/index.html" ]] || \
       [[ -d "$REPO_ROOT/public" ]]; then
        structure="${structure}frontend,"
    fi
    
    # Check for client/mobile indicators
    if [[ -d "$REPO_ROOT/ios" ]] || \
       [[ -d "$REPO_ROOT/android" ]] || \
       [[ -f "$REPO_ROOT/Package.swift" ]] || \
       [[ -d "$REPO_ROOT/mobile" ]]; then
        structure="${structure}client,"
    fi
    
    # Remove trailing comma
    structure="${structure%,}"
    
    # Default to backend if nothing detected
    if [[ -z "$structure" ]]; then
        structure="backend"
    fi
    
    echo "$structure"
}

PROJECT_STRUCTURE=$(detect_project_structure)

# Check for design directory (DESIGN_DIR is already set by get_feature_paths from common.sh)
# DESIGN_DIR is defined in common.sh as: $repo_root/specs/main/design
if [[ ! -d "$DESIGN_DIR" ]]; then
    DESIGN_DIR=""
fi

# Constitution file path
CONSTITUTION="$REPO_ROOT/.arckit/memory/constitution.md"
if [[ ! -f "$CONSTITUTION" ]]; then
    CONSTITUTION=""
fi

# Code review directory and report paths
CODEREVIEW_DIR="$FEATURE_DIR/codereview"
mkdir -p "$CODEREVIEW_DIR"

# Generate unique report filename with timestamp
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
CODEREVIEW_REPORT="$CODEREVIEW_DIR/codereview-$TIMESTAMP.md"

# Template path
CODEREVIEW_TEMPLATE="$REPO_ROOT/.arckit/templates/codereview-report-template.md"

# Output results
if $JSON_MODE; then
    printf '{"FEATURE_DIR":"%s","IMPL_PLAN":"%s","TASKS":"%s","PROJECT_STRUCTURE":"%s","CONSTITUTION":"%s","DESIGN_DIR":"%s","CODEREVIEW_DIR":"%s","CODEREVIEW_REPORT":"%s","CODEREVIEW_TEMPLATE":"%s","BRANCH":"%s","HAS_GIT":"%s","REPO_ROOT":"%s"}\n' \
        "$FEATURE_DIR" "$IMPL_PLAN" "$TASKS" "$PROJECT_STRUCTURE" "$CONSTITUTION" "$DESIGN_DIR" "$CODEREVIEW_DIR" "$CODEREVIEW_REPORT" "$CODEREVIEW_TEMPLATE" "$CURRENT_BRANCH" "$HAS_GIT" "$REPO_ROOT"
else
    echo "FEATURE_DIR: $FEATURE_DIR"
    echo "IMPL_PLAN: $IMPL_PLAN"
    echo "TASKS: $TASKS"
    echo "PROJECT_STRUCTURE: $PROJECT_STRUCTURE"
    echo "CONSTITUTION: $CONSTITUTION"
    echo "DESIGN_DIR: $DESIGN_DIR"
    echo "CODEREVIEW_DIR: $CODEREVIEW_DIR"
    echo "CODEREVIEW_REPORT: $CODEREVIEW_REPORT"
    echo "CODEREVIEW_TEMPLATE: $CODEREVIEW_TEMPLATE"
    echo "BRANCH: $CURRENT_BRANCH"
    echo "HAS_GIT: $HAS_GIT"
    echo "REPO_ROOT: $REPO_ROOT"
fi


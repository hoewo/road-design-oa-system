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
mkdir -p "$FEATURE_DIR"

# Check if plan.md already exists
PLAN_EXISTS=false
if [[ -f "$IMPL_PLAN" ]]; then
    PLAN_EXISTS=true
    if [[ "$JSON_MODE" == "false" ]]; then
        echo "Plan file already exists at $IMPL_PLAN, will update in place"
    fi
fi

# Copy plan template only if it doesn't exist
if [[ "$PLAN_EXISTS" == "false" ]]; then
    TEMPLATE="$REPO_ROOT/.arckit/templates/plan-template.md"
    if [[ -f "$TEMPLATE" ]]; then
        cp "$TEMPLATE" "$IMPL_PLAN"
        if [[ "$JSON_MODE" == "false" ]]; then
            echo "Copied plan template to $IMPL_PLAN"
        fi
    else
        echo "Warning: Plan template not found at $TEMPLATE"
        # Create a basic plan file if template doesn't exist
        touch "$IMPL_PLAN"
    fi
fi

# Output results
if $JSON_MODE; then
    # Convert boolean to lowercase for JSON
    plan_exists_lower=$(echo "$PLAN_EXISTS" | tr '[:upper:]' '[:lower:]')
    printf '{"FEATURE_SPEC":"%s","IMPL_PLAN":"%s","SPECS_DIR":"%s","BRANCH":"%s","HAS_GIT":"%s","PLAN_EXISTS":%s}\n' \
        "$FEATURE_SPEC" "$IMPL_PLAN" "$FEATURE_DIR" "$CURRENT_BRANCH" "$HAS_GIT" "$plan_exists_lower"
else
    echo "FEATURE_SPEC: $FEATURE_SPEC"
    echo "IMPL_PLAN: $IMPL_PLAN" 
    echo "SPECS_DIR: $FEATURE_DIR"
    echo "BRANCH: $CURRENT_BRANCH"
    echo "HAS_GIT: $HAS_GIT"
    echo "PLAN_EXISTS: $PLAN_EXISTS"
fi


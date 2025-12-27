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

# Ensure the feature directory exists
mkdir -p "$FEATURE_DIR"

# Check if spec.md exists
SPEC_EXISTS=false
if [[ -f "$FEATURE_SPEC" ]]; then
    SPEC_EXISTS=true
else
    # Copy spec template if it exists
    TEMPLATE="$REPO_ROOT/.arckit/templates/spec-template.md"
    if [[ -f "$TEMPLATE" ]]; then
        cp "$TEMPLATE" "$FEATURE_SPEC"
        echo "Copied spec template to $FEATURE_SPEC"
    else
        echo "Warning: Spec template not found at $TEMPLATE"
        # Create a basic spec file if template doesn't exist
        touch "$FEATURE_SPEC"
    fi
fi

# Output results
if $JSON_MODE; then
    printf '{"FEATURE_DIR":"%s","SPEC_FILE":"%s","SPEC_EXISTS":"%s","BRANCH":"%s","HAS_GIT":"%s"}\n' \
        "$FEATURE_DIR" "$FEATURE_SPEC" "$SPEC_EXISTS" "$CURRENT_BRANCH" "$HAS_GIT"
else
    echo "FEATURE_DIR: $FEATURE_DIR"
    echo "SPEC_FILE: $FEATURE_SPEC"
    echo "SPEC_EXISTS: $SPEC_EXISTS"
    echo "BRANCH: $CURRENT_BRANCH"
    echo "HAS_GIT: $HAS_GIT"
fi


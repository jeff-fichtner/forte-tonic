#!/bin/bash

# Version Management Script
# Handles version increments for the Tonic application
#
# This script manages semantic versioning (MAJOR.MINOR.PATCH) for the project.
# It's used both for manual version bumps and automated version management.
#
# Usage:
#   ./scripts/version-manager.sh auto              # Auto-increment patch version for development builds
#   ./scripts/version-manager.sh bump [type]       # Manual version bump with confirmation
#   ./scripts/version-manager.sh check-overflow    # Check for version overflow (99.99.99) and handle
#   ./scripts/version-manager.sh [patch|minor|major] # Direct version increment
#
# Examples:
#   ./scripts/version-manager.sh patch             # 1.1.8 → 1.1.9
#   ./scripts/version-manager.sh minor             # 1.1.8 → 1.2.0
#   ./scripts/version-manager.sh major             # 1.1.8 → 2.0.0
#
# Note: This script updates package.json and is used by CI/CD for automated releases

set -e

# Default mode
MODE=${1:-auto}

# Color codes for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
check_environment() {
    if [ ! -f "package.json" ]; then
        log_error "package.json not found. Run this script from the project root."
        exit 1
    fi
}

# Get and parse current version
get_version_info() {
    CURRENT_VERSION=$(node -p "require('./package.json').version")
    IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
    MAJOR=${VERSION_PARTS[0]}
    MINOR=${VERSION_PARTS[1]}
    PATCH=${VERSION_PARTS[2]}
    
    log_info "Current version: $CURRENT_VERSION (Major=$MAJOR, Minor=$MINOR, Patch=$PATCH)"
}

# Check for version overflow and handle if needed
handle_overflow() {
    if [ $PATCH -ge 999 ]; then
        log_warning "PATCH VERSION OVERFLOW DETECTED!"
        log_warning "Current patch: $PATCH (limit: 999)"
        echo ""
        log_info "Auto-incrementing minor version and resetting patch to 0..."
        
        NEW_MINOR=$((MINOR + 1))
        NEW_VERSION="$MAJOR.$NEW_MINOR.0"
        
        log_info "Version change: $CURRENT_VERSION → $NEW_VERSION"
        
        # Update package.json
        npm version $NEW_VERSION --no-git-tag-version --allow-same-version
        
        # Verify the change
        UPDATED_VERSION=$(node -p "require('./package.json').version")
        log_success "Version updated to: $UPDATED_VERSION"
        
        # Create special tag for overflow handling
        OVERFLOW_TAG="overflow-reset-v$NEW_VERSION-$(date +%Y%m%d-%H%M%S)"
        log_info "Overflow tag: $OVERFLOW_TAG"
        
        echo ""
        echo "📧 NOTIFICATION: Version overflow handled automatically"
        echo "   Old: $CURRENT_VERSION"
        echo "   New: $NEW_VERSION"
        echo "   Reason: Patch version reached maximum (999)"
        
        return 0
    elif [ $PATCH -ge 990 ]; then
        log_warning "Patch version approaching limit"
        log_warning "Current: $PATCH/999 (${PATCH}% of limit)"
        log_warning "Consider manually incrementing minor version soon"
        return 1
    else
        log_success "Version is within normal range ($PATCH/999)"
        return 1
    fi
}

# Auto-increment for dev builds
auto_increment() {
    echo "🔢 Auto-incrementing patch version for dev build..."
    
    get_version_info
    
    # Check if this is a dev branch build
    if [ "$BRANCH_NAME" = "dev" ] || [ "$NODE_ENV" = "staging" ]; then
        log_info "Dev branch detected - auto-incrementing patch version..."
        
        # Check for overflow first and handle if needed
        if handle_overflow; then
            log_success "Overflow handled, no further increment needed"
            return 0
        fi
        
        # Normal increment
        NEW_PATCH=$((PATCH + 1))
        NEW_VERSION="$MAJOR.$MINOR.$NEW_PATCH"
        
        log_info "Incrementing version: $CURRENT_VERSION → $NEW_VERSION"
        
        # Update package.json
        npm version $NEW_VERSION --no-git-tag-version --allow-same-version
        
        # Verify the change
        UPDATED_VERSION=$(node -p "require('./package.json').version")
        log_success "Version updated to: $UPDATED_VERSION"
        
        # Create build tag for tracking
        BUILD_TAG="auto-build-v$NEW_VERSION-$(date +%Y%m%d-%H%M%S)"
        log_info "Build tag: $BUILD_TAG"
        
        # Log for debugging
        echo "📊 Build Info:"
        echo "  - Branch: ${BRANCH_NAME:-unknown}"
        echo "  - Commit: ${COMMIT_SHA:-unknown}"
        echo "  - Environment: ${NODE_ENV:-unknown}"
        echo "  - Build Time: $(date)"
        
    else
        log_info "Not a dev branch build - skipping auto-increment"
        log_info "Branch: ${BRANCH_NAME:-unknown}"
        log_info "Environment: ${NODE_ENV:-unknown}"
    fi
}

# Manual version bump
manual_bump() {
    local version_type=${1:-patch}
    
    echo "🔢 Manual version bump: $version_type"
    
    get_version_info
    
    # Increment version
    npm version $version_type --no-git-tag-version
    
    # Get new version
    NEW_VERSION=$(node -p "require('./package.json').version")
    log_success "New version: $NEW_VERSION"
    
    # Show the diff
    if command -v git &> /dev/null; then
        echo ""
        echo "📝 Changes made:"
        git diff package.json || true
        
        echo ""
        echo "Version bumped from $CURRENT_VERSION to $NEW_VERSION"
        echo "Run 'git add package.json && git commit -m \"chore: bump version to $NEW_VERSION\"' to commit the change."
    fi
}

# Check overflow only
check_overflow() {
    echo "🔍 Checking for version overflow..."
    
    get_version_info
    handle_overflow
    
    log_success "Version overflow check complete"
}

# Show usage
show_usage() {
    echo "Version Manager - Consolidated version management script"
    echo ""
    echo "Usage:"
    echo "  $0 auto                    # Auto-increment for dev builds"
    echo "  $0 bump [patch|minor|major] # Manual version bump (default: patch)"
    echo "  $0 check-overflow          # Check and handle version overflow"
    echo "  $0 patch|minor|major       # Direct version increment"
    echo "  $0 help                    # Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 auto                    # Used by CI/CD for dev builds"
    echo "  $0 bump minor              # Manually bump minor version"
    echo "  $0 major                   # Directly increment major version"
    echo "  $0 check-overflow          # Check if patch version needs overflow handling"
}

# Main script logic
main() {
    check_environment
    
    case $MODE in
        auto)
            auto_increment
            ;;
        bump)
            manual_bump $2
            ;;
        check-overflow)
            check_overflow
            ;;
        patch|minor|major)
            manual_bump $MODE
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            log_error "Unknown mode: $MODE"
            echo ""
            show_usage
            exit 1
            ;;
    esac
    
    echo ""
    log_success "Version management complete"
}

# Run main function
main "$@"

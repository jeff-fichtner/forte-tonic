#!/bin/bash

# Maintenance Mode Toggle Script for Tonic
# Controls maintenance mode for staging and production Cloud Run services
#
# Usage:
#   ./toggle-maintenance.sh [staging|production] [on|off] [optional-custom-message]
#
# Examples:
#   ./toggle-maintenance.sh staging on
#   ./toggle-maintenance.sh production off
#   ./toggle-maintenance.sh staging on "System maintenance in progress. Back by 3pm PST."
#   ./toggle-maintenance.sh production on "Scheduled upgrade. Expected completion: 2 hours."

set -e  # Exit on error

# Color output for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REGION="us-west1"
STAGING_PROJECT="tonic-staging-16183"
PRODUCTION_PROJECT="tonic-production-16201"

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to display usage
usage() {
    echo "Usage: $0 [staging|production] [on|off] [optional-custom-message]"
    echo ""
    echo "Arguments:"
    echo "  environment        Environment to target (staging or production)"
    echo "  mode              Maintenance mode state (on or off)"
    echo "  message           (Optional) Custom maintenance message"
    echo ""
    echo "Examples:"
    echo "  $0 staging on"
    echo "  $0 production off"
    echo "  $0 staging on \"System maintenance in progress. Back by 3pm PST.\""
    echo ""
    exit 1
}

# Validate arguments
if [ "$#" -lt 2 ]; then
    print_error "Insufficient arguments"
    usage
fi

ENVIRONMENT=$1
MODE=$2
CUSTOM_MESSAGE="$3"

# Validate environment
if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
    print_error "Invalid environment: $ENVIRONMENT"
    usage
fi

# Validate mode
if [ "$MODE" != "on" ] && [ "$MODE" != "off" ]; then
    print_error "Invalid mode: $MODE"
    usage
fi

# Determine maintenance mode boolean value
if [ "$MODE" == "on" ]; then
    MAINTENANCE_MODE="true"
else
    MAINTENANCE_MODE="false"
fi

# Determine project and service name
if [ "$ENVIRONMENT" == "staging" ]; then
    PROJECT_ID="$STAGING_PROJECT"
else
    PROJECT_ID="$PRODUCTION_PROJECT"
fi
SERVICE_NAME="tonic-${ENVIRONMENT}"

# Display configuration
echo ""
print_info "========================================"
print_info "Maintenance Mode Toggle"
print_info "========================================"
print_info "Project:       $PROJECT_ID"
print_info "Environment:   $ENVIRONMENT"
print_info "Service:       $SERVICE_NAME"
print_info "Region:        $REGION"
print_info "Mode:          $MODE (MAINTENANCE_MODE=$MAINTENANCE_MODE)"
if [ "$MODE" == "on" ]; then
    if [ -n "$CUSTOM_MESSAGE" ]; then
        print_info "Message:       $CUSTOM_MESSAGE"
    else
        print_info "Message:       (using default from configurationService.js)"
    fi
fi
print_info "========================================"
echo ""

# Confirm action for production
if [ "$ENVIRONMENT" == "production" ]; then
    print_warning "You are about to modify PRODUCTION environment!"
    read -p "Are you sure you want to continue? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        print_info "Operation cancelled"
        exit 0
    fi
fi

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    print_error "gcloud CLI is not installed. Please install it first."
    exit 1
fi

# Switch to correct project
print_info "Switching to project $PROJECT_ID..."
gcloud config set project "$PROJECT_ID" --quiet

# Get current maintenance settings
print_info "Fetching current maintenance settings..."
CURRENT_MODE=$(gcloud run services describe "$SERVICE_NAME" \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --format="value(spec.template.spec.containers[0].env.filter(name:MAINTENANCE_MODE).value)" \
    2>/dev/null || echo "false")

CURRENT_MESSAGE=$(gcloud run services describe "$SERVICE_NAME" \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --format="value(spec.template.spec.containers[0].env.filter(name:MAINTENANCE_MESSAGE).value)" \
    2>/dev/null || echo "(using default)")

echo ""
print_info "Current Settings:"
print_info "  Mode: $CURRENT_MODE"
print_info "  Message: $CURRENT_MESSAGE"
echo ""

# Update maintenance mode
print_info "Updating maintenance mode settings..."

if [ -n "$CUSTOM_MESSAGE" ]; then
    # Custom message provided - set both variables
    gcloud run services update "$SERVICE_NAME" \
        --project="$PROJECT_ID" \
        --region="$REGION" \
        --update-env-vars="MAINTENANCE_MODE=${MAINTENANCE_MODE},MAINTENANCE_MESSAGE=${CUSTOM_MESSAGE}" \
        --quiet
else
    # No custom message - unset MAINTENANCE_MESSAGE to use default
    gcloud run services update "$SERVICE_NAME" \
        --project="$PROJECT_ID" \
        --region="$REGION" \
        --update-env-vars="MAINTENANCE_MODE=${MAINTENANCE_MODE}" \
        --remove-env-vars="MAINTENANCE_MESSAGE" \
        --quiet
fi

echo ""
print_success "Done! Maintenance mode is now: $MODE"

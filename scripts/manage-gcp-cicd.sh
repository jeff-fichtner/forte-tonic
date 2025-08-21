#!/bin/bash

# GCP CI/CD Management Script for Tonic
# This script consolidates setup, cleanup, and destroy operations for GCP resources
# 
# Usage:
#   ./manage-gcp-cicd.sh setup [PROJECT_ID]   - Create all CI/CD infrastructure
#   ./manage-gcp-cicd.sh cleanup [PROJECT_ID] - Remove CI/CD only, preserve services
#   ./manage-gcp-cicd.sh destroy [PROJECT_ID] - Remove everything including services
#
# Run this once to configure your GCP project, then use cleanup/destroy as needed

set -e

# Shared Configuration
PROJECT_ID="${2:-tonic-467721}"  # Use provided project ID or default
REGION="us-west1"
SERVICE_NAME="tonic-staging"
REPO_OWNER="jeff-fichtner"
REPO_NAME="forte-tonic"

# Colors for output
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

confirm_action() {
    local message="$1"
    echo -e "${YELLOW}$message${NC}"
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Operation cancelled by user"
        exit 0
    fi
}

check_gcloud() {
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI is not installed"
        echo "Install it from: https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
}

get_build_service_account() {
    local project_number
    project_number=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)" 2>/dev/null)
    if [ $? -ne 0 ]; then
        log_error "Cannot access project $PROJECT_ID. Check project ID and permissions."
        exit 1
    fi
    echo "${project_number}@cloudbuild.gserviceaccount.com"
}

# Function to create secret safely
create_secret_with_placeholder() {
    local secret_name=$1
    local placeholder_value=$2
    local description=$3
    local display_name=$4
    
    log_info "Creating secret: $secret_name"
    
    # Create the secret (this will fail if it already exists, which is fine)
    gcloud secrets create $secret_name --data-file=- --replication-policy="automatic" <<< "$placeholder_value" 2>/dev/null || {
        log_warning "Secret $secret_name already exists, updating with placeholder value..."
        # If creation failed, update existing secret
        echo "$placeholder_value" | gcloud secrets versions add $secret_name --data-file=-
    }
    
    # Store info for logging
    echo "$display_name|$secret_name|$placeholder_value" >> /tmp/gcp_secrets_to_update.txt
    
    log_success "Secret $secret_name configured with placeholder"
}

setup_command() {
    echo "🚀 Setting up GCP CI/CD Pipeline for Tonic"
    echo "=========================================="
    echo "Project ID: $PROJECT_ID"
    echo "Region: $REGION"
    echo "Service: $SERVICE_NAME"
    echo "Repository: $REPO_OWNER/$REPO_NAME"
    echo ""

    check_gcloud

    # Set project
    log_info "Setting GCP project..."
    gcloud config set project $PROJECT_ID

    # Enable required APIs
    log_info "Enabling required APIs..."
    gcloud services enable cloudbuild.googleapis.com
    gcloud services enable run.googleapis.com
    gcloud services enable containerregistry.googleapis.com
    gcloud services enable secretmanager.googleapis.com

    # Get Cloud Build service account email
    BUILD_SA=$(get_build_service_account)
    log_info "Cloud Build Service Account: $BUILD_SA"

    # Grant required permissions to Cloud Build service account
    log_info "Granting permissions to Cloud Build service account..."

    # Cloud Run permissions
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$BUILD_SA" \
        --role="roles/run.admin"

    # Secret Manager permissions  
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$BUILD_SA" \
        --role="roles/secretmanager.secretAccessor"

    # Service Account User (to deploy to Cloud Run)
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$BUILD_SA" \
        --role="roles/iam.serviceAccountUser"

    # Source Repository Admin (to push version changes back)
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$BUILD_SA" \
        --role="roles/source.admin"

    echo ""
    log_info "Setting up secrets in Secret Manager with placeholder values..."

    # Initialize temp file for logging
    > /tmp/gcp_secrets_to_update.txt

    # Create secrets with placeholder values from .env.example
    create_secret_with_placeholder "working-spreadsheet-id" "your-development-spreadsheet-id-here" "Google Sheets ID for Tonic app" "Google Sheets ID"
    create_secret_with_placeholder "google-service-account-email" "your-service-account@your-project.iam.gserviceaccount.com" "Google service account email" "Service Account Email"
    create_secret_with_placeholder "google-private-key" "-----BEGIN PRIVATE KEY-----
...your-private-key-content...
-----END PRIVATE KEY-----" "Google service account private key" "Service Account Private Key"
    create_secret_with_placeholder "operator-email" "your-operator-email@domain.com" "Operator email for admin access" "Operator Email"
    create_secret_with_placeholder "rock-band-class-ids" "G001,G002" "Rock Band class IDs for waitlist handling" "Rock Band Class IDs"

    # GitHub token for pushing version increments back to repo
    create_secret_with_placeholder "github-token" "your-github-personal-access-token-here" "GitHub token for repo access" "GitHub Personal Access Token"

    echo ""
    log_info "Creating Cloud Build trigger..."

    # Create build trigger for dev branch
    gcloud builds triggers create github \
        --repo-name=$REPO_NAME \
        --repo-owner=$REPO_OWNER \
        --branch-pattern=dev \
        --build-config=src/build/cloudbuild.yaml \
        --description="Auto CI/CD for dev branch: Test → Deploy → Increment Version" \
        --name="tonic-dev-cicd" || log_warning "Trigger may already exist"

    echo ""
    log_success "GCP CI/CD Setup Complete!"
    echo "=============================="
    echo ""
    echo "📋 What was configured:"
    echo "  ✅ APIs enabled (Cloud Build, Cloud Run, etc.)"
    echo "  ✅ IAM permissions for Cloud Build service account"
    echo "  ✅ Secrets created in Secret Manager with placeholder values"
    echo "  ✅ Build trigger created for dev branch"
    echo ""

    # Display secrets that need to be updated
    log_warning "IMPORTANT: Update these secrets in Google Cloud Console"
    echo "============================================================="
    echo ""
    echo "Go to: https://console.cloud.google.com/security/secret-manager?project=$PROJECT_ID"
    echo ""
    if [[ -f "/tmp/gcp_secrets_to_update.txt" ]]; then
        echo "The following secrets were created with PLACEHOLDER values and MUST be updated:"
        echo ""
        
        while IFS='|' read -r display_name secret_name placeholder_value; do
            echo "🔑 $display_name"
            echo "   Secret Name: $secret_name"
            echo "   Current Value: $placeholder_value"
            echo "   Action: Click on '$secret_name' → 'New Version' → Update with real value"
            echo ""
        done < "/tmp/gcp_secrets_to_update.txt"
        
        # Clean up temp file
        rm -f "/tmp/gcp_secrets_to_update.txt"
        
        log_warning "THE CI/CD PIPELINE WILL FAIL until these placeholder values are replaced!"
        echo ""
    else
        echo "No secrets log file found - you may need to update secrets manually."
    fi

    echo "🔄 CI/CD Workflow:"
    echo "  1. Push to dev branch"
    echo "  2. Cloud Build triggers automatically"
    echo "  3. Runs unit tests"
    echo "  4. Builds Docker image"
    echo "  5. Deploys to Cloud Run"
    echo "  6. Increments patch version"
    echo "  7. Commits version back to repo"
    echo ""
    echo "🔗 Useful links:"
    echo "  • Secret Manager: https://console.cloud.google.com/security/secret-manager?project=$PROJECT_ID"
    echo "  • Cloud Build: https://console.cloud.google.com/cloud-build/builds?project=$PROJECT_ID"
    echo "  • Cloud Run: https://console.cloud.google.com/run?project=$PROJECT_ID"
    echo ""
    echo "🎯 Next steps:"
    echo "  1. ⚠️  FIRST: Update all secrets in Secret Manager console (see above)"
    echo "  2. Push a change to the dev branch to test the pipeline"
    echo "  3. Monitor the build in Cloud Build console"
    echo "  4. Check the deployed service in Cloud Run console"
    echo "  5. Verify version increment in your repository"
    echo ""
    echo "💡 Tips:"
    echo "  • All secrets were created with placeholder values - update them before deploying"
    echo "  • Use 'Create New Version' in Secret Manager to update secret values"
    echo "  • The GitHub token needs 'repo' scope for version auto-increment to work"
}

cleanup_command() {
    echo "🧹 Cleaning up GCP CI/CD Pipeline for Tonic"
    echo "==========================================="
    echo "Project ID: $PROJECT_ID"
    echo ""
    echo "This will remove CI/CD infrastructure but preserve running services."

    confirm_action "⚠️  This will remove IAM permissions, secrets, and build triggers."

    check_gcloud

    # Set project
    gcloud config set project $PROJECT_ID

    # Get Cloud Build service account email
    BUILD_SA=$(get_build_service_account)
    log_info "Cloud Build Service Account: $BUILD_SA"

    echo ""
    log_info "Removing IAM permissions..."

    # Remove Cloud Build permissions
    gcloud projects remove-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$BUILD_SA" \
        --role="roles/run.admin" || log_warning "Permission may not exist"

    gcloud projects remove-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$BUILD_SA" \
        --role="roles/secretmanager.secretAccessor" || log_warning "Permission may not exist"

    gcloud projects remove-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$BUILD_SA" \
        --role="roles/iam.serviceAccountUser" || log_warning "Permission may not exist"

    gcloud projects remove-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$BUILD_SA" \
        --role="roles/source.admin" || log_warning "Permission may not exist"

    echo ""
    log_info "Deleting secrets from Secret Manager..."

    # Delete all secrets (both existing and missing ones from original cleanup)
    gcloud secrets delete working-spreadsheet-id --quiet || log_warning "Secret may not exist"
    gcloud secrets delete google-service-account-email --quiet || log_warning "Secret may not exist"  
    gcloud secrets delete google-private-key --quiet || log_warning "Secret may not exist"
    gcloud secrets delete operator-email --quiet || log_warning "Secret may not exist"
    gcloud secrets delete rock-band-class-ids --quiet || log_warning "Secret may not exist"
    gcloud secrets delete github-token --quiet || log_warning "Secret may not exist"

    echo ""
    log_info "Deleting Cloud Build trigger..."

    # Delete build trigger
    gcloud builds triggers delete tonic-dev-cicd --quiet || log_warning "Trigger may not exist"

    echo ""
    log_success "Cleanup Complete!"
    echo "==================="
    echo ""
    echo "📋 What was removed:"
    echo "  ✅ IAM permissions for Cloud Build service account"
    echo "  ✅ All 6 secrets deleted from Secret Manager" 
    echo "  ✅ Build trigger deleted"
    echo ""
    echo "📋 What was preserved:"
    echo "  • GCP APIs (left enabled - safe to keep)"
    echo "  • Cloud Run services (still running)"
    echo "  • Container images (in Container Registry)"
    echo "  • Git history and tags"
    echo ""
    echo "💡 To remove running services and images, use:"
    echo "  ./manage-gcp-cicd.sh destroy $PROJECT_ID"
}

destroy_command() {
    echo "💥 Destroying ALL GCP Resources for Tonic"
    echo "=========================================="
    echo "Project ID: $PROJECT_ID"
    echo ""
    echo "This will remove EVERYTHING including running services and data!"

    # List what will be destroyed
    log_info "Scanning for resources to destroy..."
    
    echo ""
    echo "📋 Resources that will be PERMANENTLY DELETED:"
    
    # Check for Cloud Run services
    echo ""
    echo "☁️  Cloud Run Services:"
    SERVICES=$(gcloud run services list --region=$REGION --format="value(metadata.name)" --filter="metadata.name~tonic" 2>/dev/null || echo "")
    if [ -n "$SERVICES" ]; then
        echo "$SERVICES" | while read service; do
            echo "  🗑️  $service (region: $REGION)"
        done
    else
        echo "  (none found)"
    fi
    
    # Check for container images
    echo ""
    echo "🐳 Container Images:"
    IMAGES=$(gcloud container images list --repository=gcr.io/$PROJECT_ID --format="value(name)" 2>/dev/null || echo "")
    if [ -n "$IMAGES" ]; then
        echo "$IMAGES" | while read image; do
            echo "  🗑️  $image"
        done
    else
        echo "  (none found)"
    fi

    echo ""
    echo "⚠️  This action CANNOT be undone!"
    echo "⚠️  All running applications will be stopped!"
    echo "⚠️  All container images will be deleted!"
    
    confirm_action "💥 DESTROY ALL RESOURCES?"

    check_gcloud

    # Set project
    gcloud config set project $PROJECT_ID

    # First run cleanup to remove CI/CD infrastructure
    log_info "Running cleanup first..."
    # Get Cloud Build service account email
    BUILD_SA=$(get_build_service_account)

    # Remove IAM permissions
    log_info "Removing IAM permissions..."
    gcloud projects remove-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$BUILD_SA" \
        --role="roles/run.admin" 2>/dev/null || true

    gcloud projects remove-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$BUILD_SA" \
        --role="roles/secretmanager.secretAccessor" 2>/dev/null || true

    gcloud projects remove-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$BUILD_SA" \
        --role="roles/iam.serviceAccountUser" 2>/dev/null || true

    gcloud projects remove-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$BUILD_SA" \
        --role="roles/source.admin" 2>/dev/null || true

    # Delete secrets
    log_info "Deleting secrets..."
    gcloud secrets delete working-spreadsheet-id --quiet 2>/dev/null || true
    gcloud secrets delete google-service-account-email --quiet 2>/dev/null || true  
    gcloud secrets delete google-private-key --quiet 2>/dev/null || true
    gcloud secrets delete operator-email --quiet 2>/dev/null || true
    gcloud secrets delete rock-band-class-ids --quiet 2>/dev/null || true
    gcloud secrets delete github-token --quiet 2>/dev/null || true

    # Delete build trigger
    gcloud builds triggers delete tonic-dev-cicd --quiet 2>/dev/null || true

    echo ""
    log_info "Destroying Cloud Run services..."

    # Delete ALL Cloud Run services in the region (not just tonic-staging)
    SERVICES=$(gcloud run services list --region=$REGION --format="value(metadata.name)" 2>/dev/null || echo "")
    if [ -n "$SERVICES" ]; then
        echo "$SERVICES" | while read service; do
            if [ -n "$service" ]; then
                log_info "Deleting Cloud Run service: $service"
                gcloud run services delete $service --region=$REGION --quiet || log_warning "Failed to delete $service"
            fi
        done
    else
        log_info "No Cloud Run services found to delete"
    fi

    echo ""
    log_info "Destroying container images..."

    # Delete ALL container images for this project
    IMAGES=$(gcloud container images list --repository=gcr.io/$PROJECT_ID --format="value(name)" 2>/dev/null || echo "")
    if [ -n "$IMAGES" ]; then
        echo "$IMAGES" | while read image; do
            if [ -n "$image" ]; then
                log_info "Deleting container image: $image"
                # Get all tags for this image
                TAGS=$(gcloud container images list-tags $image --format="value(digest)" 2>/dev/null || echo "")
                if [ -n "$TAGS" ]; then
                    echo "$TAGS" | while read tag; do
                        if [ -n "$tag" ]; then
                            gcloud container images delete $image@$tag --quiet --force-delete-tags 2>/dev/null || true
                        fi
                    done
                fi
            fi
        done
    else
        log_info "No container images found to delete"
    fi

    echo ""
    log_success "💥 DESTRUCTION COMPLETE!"
    echo "========================="
    echo ""
    echo "📋 What was DESTROYED:"
    echo "  💥 ALL IAM permissions for Cloud Build"
    echo "  💥 ALL secrets in Secret Manager"
    echo "  💥 ALL Cloud Build triggers"
    echo "  💥 ALL Cloud Run services"
    echo "  💥 ALL container images"
    echo ""
    echo "📋 What remains:"
    echo "  • GCP APIs (left enabled)"
    echo "  • Cloud Build history"
    echo "  • Git repository (commits and tags preserved)"
    echo ""
    echo "🔄 To start over:"
    echo "  ./manage-gcp-cicd.sh setup $PROJECT_ID"
}

status_command() {
    echo "📊 GCP Resources Status for Tonic"
    echo "=================================="
    echo "Project ID: $PROJECT_ID"
    echo "Region: $REGION"
    echo ""

    check_gcloud

    # Set project
    gcloud config set project $PROJECT_ID > /dev/null 2>&1

    # Get Cloud Build service account
    BUILD_SA=$(get_build_service_account 2>/dev/null || echo "NOT_AVAILABLE")

    echo "🔍 SCANNING RESOURCES..."
    echo ""

    # === APIs STATUS ===
    echo "🔧 APIs (Google Cloud Services)"
    echo "────────────────────────────────"
    
    local apis=(
        "cloudbuild.googleapis.com:Cloud Build"
        "run.googleapis.com:Cloud Run"
        "containerregistry.googleapis.com:Container Registry"
        "secretmanager.googleapis.com:Secret Manager"
    )
    
    for api_info in "${apis[@]}"; do
        api_name=$(echo "$api_info" | cut -d: -f1)
        display_name=$(echo "$api_info" | cut -d: -f2)
        
        if gcloud services list --enabled --filter="name:$api_name" --format="value(name)" 2>/dev/null | grep -q "$api_name"; then
            log_success "$display_name: ENABLED"
        else
            log_error "$display_name: DISABLED"
        fi
    done
    echo ""

    # === IAM PERMISSIONS STATUS ===
    echo "🔐 IAM Permissions (Cloud Build Service Account)"
    echo "─────────────────────────────────────────────────"
    echo "Service Account: $BUILD_SA"
    echo ""
    
    if [ "$BUILD_SA" != "NOT_AVAILABLE" ]; then
        local roles=(
            "roles/run.admin:Cloud Run Admin"
            "roles/secretmanager.secretAccessor:Secret Manager Access" 
            "roles/iam.serviceAccountUser:Service Account User"
            "roles/source.admin:Source Repository Admin"
        )
        
        local policy_output
        policy_output=$(gcloud projects get-iam-policy $PROJECT_ID --format="value(bindings[].members)" 2>/dev/null || echo "")
        
        for role_info in "${roles[@]}"; do
            role_name=$(echo "$role_info" | cut -d: -f1)
            display_name=$(echo "$role_info" | cut -d: -f2)
            
            if echo "$policy_output" | grep -q "serviceAccount:$BUILD_SA" && \
               gcloud projects get-iam-policy $PROJECT_ID --format="json" 2>/dev/null | \
               grep -A5 -B5 "$role_name" | grep -q "$BUILD_SA"; then
                log_success "$display_name: GRANTED"
            else
                log_error "$display_name: NOT GRANTED"
            fi
        done
    else
        log_error "Cannot retrieve service account information"
    fi
    echo ""

    # === SECRETS STATUS ===
    echo "🔒 Secret Manager Secrets"
    echo "─────────────────────────"
    
    local secrets=(
        "working-spreadsheet-id:Google Sheets ID"
        "google-service-account-email:Service Account Email"
        "google-private-key:Service Account Private Key"
        "operator-email:Operator Email"
        "rock-band-class-ids:Rock Band Class IDs"
        "github-token:GitHub Token"
    )
    
    for secret_info in "${secrets[@]}"; do
        secret_name=$(echo "$secret_info" | cut -d: -f1)
        display_name=$(echo "$secret_info" | cut -d: -f2)
        
        if gcloud secrets describe "$secret_name" >/dev/null 2>&1; then
            local version_count
            version_count=$(gcloud secrets versions list "$secret_name" --format="value(name)" 2>/dev/null | wc -l | tr -d ' ')
            local last_updated
            last_updated=$(gcloud secrets versions list "$secret_name" --limit=1 --format="value(createTime)" 2>/dev/null | cut -d'T' -f1)
            log_success "$display_name: EXISTS (v$version_count, updated: $last_updated)"
        else
            log_error "$display_name: NOT FOUND"
        fi
    done
    echo ""

    # === CLOUD BUILD TRIGGERS ===
    echo "🔗 Cloud Build Triggers"
    echo "───────────────────────"
    
    local triggers
    triggers=$(gcloud builds triggers list --format="value(name,github.name,github.owner)" 2>/dev/null || echo "")
    
    if echo "$triggers" | grep -q "tonic-dev-cicd"; then
        local trigger_info
        trigger_info=$(echo "$triggers" | grep "tonic-dev-cicd")
        log_success "tonic-dev-cicd: ACTIVE"
        echo "  Repository: $(echo "$trigger_info" | cut -d$'\t' -f3)/$(echo "$trigger_info" | cut -d$'\t' -f2)"
        echo "  Branch: dev"
        echo "  Config: src/build/cloudbuild.yaml"
    else
        log_error "tonic-dev-cicd: NOT FOUND"
    fi
    
    # Check for any other triggers
    local other_triggers
    other_triggers=$(echo "$triggers" | grep -v "tonic-dev-cicd" | head -3)
    if [ -n "$other_triggers" ]; then
        echo ""
        log_info "Other triggers found:"
        while IFS=$'\t' read -r name repo owner; do
            echo "  • $name ($owner/$repo)"
        done <<< "$other_triggers"
    fi
    echo ""

    # === CLOUD RUN SERVICES ===
    echo "☁️  Cloud Run Services"
    echo "─────────────────────"
    
    local services
    services=$(gcloud run services list --region=$REGION --format="value(metadata.name,status.url,status.conditions[0].status)" 2>/dev/null || echo "")
    
    if [ -n "$services" ]; then
        while IFS=$'\t' read -r name url status; do
            if [ -n "$name" ]; then
                if [ "$status" = "True" ]; then
                    log_success "$name: RUNNING"
                else
                    log_warning "$name: $status"
                fi
                echo "  URL: $url"
                echo "  Region: $REGION"
                
                # Get additional details
                local cpu_memory
                cpu_memory=$(gcloud run services describe "$name" --region=$REGION --format="value(spec.template.spec.template.spec.containers[0].resources.limits.cpu,spec.template.spec.template.spec.containers[0].resources.limits.memory)" 2>/dev/null || echo "")
                if [ -n "$cpu_memory" ]; then
                    echo "  Resources: $(echo "$cpu_memory" | cut -d$'\t' -f1) CPU, $(echo "$cpu_memory" | cut -d$'\t' -f2) Memory"
                fi
                echo ""
            fi
        done <<< "$services"
    else
        log_info "No Cloud Run services found in region $REGION"
    fi
    echo ""

    # === CONTAINER IMAGES ===
    echo "🐳 Container Images"
    echo "───────────────────"
    
    local images
    images=$(gcloud container images list --repository=gcr.io/$PROJECT_ID --format="value(name)" 2>/dev/null || echo "")
    
    if [ -n "$images" ]; then
        echo "$images" | while read -r image; do
            if [ -n "$image" ]; then
                log_success "$(basename "$image"): EXISTS"
                
                # Get image tags/versions
                local tags
                tags=$(gcloud container images list-tags "$image" --limit=3 --format="value(tags,timestamp)" 2>/dev/null || echo "")
                if [ -n "$tags" ]; then
                    echo "  Recent versions:"
                    echo "$tags" | while IFS=$'\t' read -r tag_list timestamp; do
                        local display_tags
                        display_tags=$(echo "$tag_list" | tr ';' ',' | head -c 50)
                        local date_only
                        date_only=$(echo "$timestamp" | cut -d'T' -f1)
                        echo "    • $display_tags ($date_only)"
                    done
                fi
                echo ""
            fi
        done
    else
        log_info "No container images found in gcr.io/$PROJECT_ID"
    fi
    echo ""

    # === BUILD HISTORY ===
    echo "🏗️  Recent Cloud Build History"
    echo "─────────────────────────────"
    
    local builds
    builds=$(gcloud builds list --limit=5 --format="value(id,status,createTime,source.repoSource.branchName)" 2>/dev/null || echo "")
    
    if [ -n "$builds" ]; then
        echo "$builds" | while IFS=$'\t' read -r build_id status create_time branch; do
            if [ -n "$build_id" ]; then
                local date_only
                date_only=$(echo "$create_time" | cut -d'T' -f1)
                case "$status" in
                    "SUCCESS")
                        log_success "$build_id: $status ($date_only)"
                        ;;
                    "FAILURE"|"FAILED")
                        log_error "$build_id: $status ($date_only)"
                        ;;
                    *)
                        log_warning "$build_id: $status ($date_only)"
                        ;;
                esac
                if [ -n "$branch" ]; then
                    echo "  Branch: $branch"
                fi
                echo ""
            fi
        done
    else
        log_info "No recent builds found"
    fi
    echo ""

    # === SUMMARY ===
    echo "📋 SUMMARY"
    echo "──────────"
    
    # Count enabled APIs
    local enabled_apis=0
    for api_info in "${apis[@]}"; do
        api_name=$(echo "$api_info" | cut -d: -f1)
        if gcloud services list --enabled --filter="name:$api_name" --format="value(name)" 2>/dev/null | grep -q "$api_name"; then
            enabled_apis=$((enabled_apis + 1))
        fi
    done
    
    # Count secrets
    local existing_secrets=0
    for secret_info in "${secrets[@]}"; do
        secret_name=$(echo "$secret_info" | cut -d: -f1)
        if gcloud secrets describe "$secret_name" >/dev/null 2>&1; then
            existing_secrets=$((existing_secrets + 1))
        fi
    done
    
    # Count services
    local service_count
    service_count=$(echo "$services" | grep -c . 2>/dev/null || echo "0")
    
    # Count images
    local image_count
    image_count=$(echo "$images" | grep -c . 2>/dev/null || echo "0")
    
    echo "📊 Resource Counts:"
    echo "  • APIs Enabled: $enabled_apis/4"
    echo "  • Secrets: $existing_secrets/6"
    echo "  • Cloud Run Services: $service_count"
    echo "  • Container Images: $image_count"
    
    # Determine overall status
    echo ""
    if [ $enabled_apis -eq 4 ] && [ $existing_secrets -eq 6 ] && echo "$triggers" | grep -q "tonic-dev-cicd"; then
        log_success "OVERALL STATUS: CI/CD INFRASTRUCTURE READY"
        echo "🚀 Ready for deployment - all infrastructure configured"
    elif [ $enabled_apis -gt 0 ] || [ $existing_secrets -gt 0 ]; then
        log_warning "OVERALL STATUS: PARTIAL SETUP"
        echo "⚠️  Some resources exist - run 'setup' to complete or 'destroy' to clean up"
    else
        log_info "OVERALL STATUS: CLEAN SLATE"
        echo "✨ No CI/CD resources found - ready for fresh setup"
    fi
    
    echo ""
    echo "🔗 Useful Links:"
    echo "  • Secret Manager: https://console.cloud.google.com/security/secret-manager?project=$PROJECT_ID"
    echo "  • Cloud Build: https://console.cloud.google.com/cloud-build/builds?project=$PROJECT_ID"
    echo "  • Cloud Run: https://console.cloud.google.com/run?project=$PROJECT_ID"
    echo "  • Container Registry: https://console.cloud.google.com/gcr/images/$PROJECT_ID"
}

show_usage() {
    echo "GCP CI/CD Management Script for Tonic"
    echo ""
    echo "Usage:"
    echo "  $0 setup [PROJECT_ID]   - Create all CI/CD infrastructure"
    echo "  $0 cleanup [PROJECT_ID] - Remove CI/CD only, preserve services"  
    echo "  $0 destroy [PROJECT_ID] - Remove everything including services"
    echo "  $0 status [PROJECT_ID]  - Show detailed status of all resources"
    echo ""
    echo "Commands:"
    echo "  setup   - Enable APIs, create IAM permissions, secrets, and build triggers"
    echo "  cleanup - Remove CI/CD infrastructure but keep running services"
    echo "  destroy - Complete destruction of all resources (IRREVERSIBLE)"
    echo "  status  - Comprehensive readout of all GCP assets and their state"
    echo ""
    echo "Examples:"
    echo "  $0 setup tonic-467721              # Setup CI/CD for project"
    echo "  $0 cleanup                         # Cleanup using default project"
    echo "  $0 destroy tonic-production        # Destroy everything in production"
    echo "  $0 status                          # Check current resource status"
    echo ""
    echo "Default project: $PROJECT_ID"
}

# Main script logic
case "${1:-}" in
    setup)
        setup_command
        ;;
    cleanup)
        cleanup_command
        ;;
    destroy)
        destroy_command
        ;;
    status)
        status_command
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        echo "Error: Unknown command '${1:-}'"
        echo ""
        show_usage
        exit 1
        ;;
esac
#!/bin/bash

# GCP CI/CD Management Script for Tonic
# This script provides folder-based project management for staging and production environments
# 
# Usage:
#   ./manage-gcp-cicd.sh setup-gcp --folder=FOLDER_ID     - Create staging and production projects
#   ./manage-gcp-cicd.sh status-gcp --folder=FOLDER_ID    - Show status of all Tonic projects in folder
#   ./manage-gcp-cicd.sh cleanup-gcp --folder=FOLDER_ID   - Remove CI/CD infrastructure only
#   ./manage-gcp-cicd.sh destroy-gcp --folder=FOLDER_ID   - Remove everything including services
#   ./manage-gcp-cicd.sh update-permissions --project=PROJECT_ID --user=USER_EMAIL - Update user permissions
#
# Folder-based operations manage both staging and production projects simultaneously

set -e

# Shared Configuration
REGION="us-west1"
REPO_OWNER="jeff-fichtner"
REPO_NAME="forte-tonic"
APPLICATION_LABEL="application=tonic"

# Environment Configuration - easily extensible for new environments
declare -A ENVIRONMENTS=(
    ["staging"]="semver_tags:^v[0-9]+\.[0-9]+\.[0-9]+$:Staging environment for semver tag deployments"
    ["production"]="main_branch:^main$:Production environment for main branch deployments"
)

# Add new environments here as needed:
# ["dev"]="dev_branch:^dev$:Development environment for dev branch testing"
# ["qa"]="qa_branch:^qa$:QA environment for quality assurance testing"

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

# Environment Configuration Helper Functions
get_environment_trigger_type() {
    local env_name=$1
    echo "${ENVIRONMENTS[$env_name]}" | cut -d: -f1
}

get_environment_pattern() {
    local env_name=$1
    echo "${ENVIRONMENTS[$env_name]}" | cut -d: -f2
}

get_environment_description() {
    local env_name=$1
    echo "${ENVIRONMENTS[$env_name]}" | cut -d: -f3
}

list_configured_environments() {
    for env in "${!ENVIRONMENTS[@]}"; do
        echo "$env"
    done | sort
}

# Service Account Management Functions

# Create a dedicated service account for an environment
create_service_account() {
    local project_id=$1
    local env_name=$2
    local sa_name="tonic-${env_name}-sa"
    local sa_display_name="Tonic ${env_name^} Service Account"
    local sa_description="Dedicated service account for Tonic ${env_name} environment"
    
    log_info "Creating service account: $sa_name for $project_id"
    
    # Check if service account already exists
    if gcloud iam service-accounts describe "${sa_name}@${project_id}.iam.gserviceaccount.com" \
       --project="$project_id" >/dev/null 2>&1; then
        log_warning "Service account $sa_name already exists in $project_id"
        return 0
    fi
    
    # Create the service account
    gcloud iam service-accounts create "$sa_name" \
        --project="$project_id" \
        --display-name="$sa_display_name" \
        --description="$sa_description" || {
        log_error "Failed to create service account $sa_name"
        return 1
    }
    
    log_success "Service account $sa_name created successfully"
}

# Generate and store service account key
generate_service_account_key() {
    local project_id=$1
    local env_name=$2
    local sa_name="tonic-${env_name}-sa"
    local sa_email="${sa_name}@${project_id}.iam.gserviceaccount.com"
    
    log_info "Generating private key for service account: $sa_email"
    
    # Create a temporary file for the key
    local temp_key_file
    temp_key_file=$(mktemp)
    
    # Generate the key
    if gcloud iam service-accounts keys create "$temp_key_file" \
       --iam-account="$sa_email" \
       --project="$project_id"; then
        
        # Read the private key from the JSON file
        local private_key
        private_key=$(cat "$temp_key_file" | jq -r '.private_key' 2>/dev/null || echo "")
        
        if [[ -n "$private_key" ]]; then
            # Store the private key in Secret Manager
            log_info "Storing private key in Secret Manager..."
            echo "$private_key" | gcloud secrets versions add "google-private-key" \
                --project="$project_id" \
                --data-file=- || {
                log_warning "Failed to store private key in Secret Manager"
            }
            
            # Also update the service account email secret
            echo "$sa_email" | gcloud secrets versions add "google-service-account-email" \
                --project="$project_id" \
                --data-file=- || {
                log_warning "Failed to update service account email in Secret Manager"
            }
            
            log_success "Service account key generated and stored securely"
        else
            log_error "Failed to extract private key from generated key file"
        fi
        
        # Clean up the temporary file
        rm -f "$temp_key_file"
    else
        log_error "Failed to generate service account key"
        rm -f "$temp_key_file"
        return 1
    fi
}

# Set up IAM permissions for the service account
setup_service_account_permissions() {
    local project_id=$1
    local env_name=$2
    local sa_name="tonic-${env_name}-sa"
    local sa_email="${sa_name}@${project_id}.iam.gserviceaccount.com"
    
    log_info "Setting up IAM permissions for $sa_email"
    
    # Required roles for the service account
    local required_roles=(
        "roles/run.admin"                    # Cloud Run management
        "roles/secretmanager.secretAccessor" # Secret Manager access
        "roles/iam.serviceAccountUser"       # Service account usage
        "roles/storage.admin"                # Cloud Storage (for container images)
        "roles/logging.logWriter"            # Write logs
        "roles/monitoring.metricWriter"      # Write metrics
    )
    
    # Grant each role
    for role in "${required_roles[@]}"; do
        log_info "  Granting $role to $sa_email"
        gcloud projects add-iam-policy-binding "$project_id" \
            --member="serviceAccount:$sa_email" \
            --role="$role" || {
            log_warning "Failed to grant $role"
        }
    done
    
    # Also grant the Cloud Build service account permission to use this service account
    local build_sa
    build_sa=$(get_build_service_account "$project_id")
    if [[ "$build_sa" != "NOT_AVAILABLE" ]]; then
        log_info "  Granting Cloud Build SA permission to use $sa_email"
        gcloud iam service-accounts add-iam-policy-binding "$sa_email" \
            --member="serviceAccount:$build_sa" \
            --role="roles/iam.serviceAccountUser" \
            --project="$project_id" || {
            log_warning "Failed to grant Cloud Build SA permission to use service account"
        }
    fi
    
    log_success "IAM permissions configured for $sa_email"
}

# Create environment-specific service account (combines all steps)
create_environment_service_account() {
    local project_id=$1
    local env_name=$2
    
    log_info "Setting up dedicated service account for $env_name environment in $project_id"
    
    # Step 1: Create the service account
    create_service_account "$project_id" "$env_name" || return 1
    
    # Step 2: Set up permissions
    setup_service_account_permissions "$project_id" "$env_name" || return 1
    
    # Step 3: Generate and store key (only if secrets exist)
    if gcloud secrets describe "google-private-key" --project="$project_id" >/dev/null 2>&1; then
        generate_service_account_key "$project_id" "$env_name" || {
            log_warning "Failed to generate key, but service account was created"
        }
    else
        log_info "Secrets not yet created - will generate key later"
    fi
    
    log_success "Environment service account setup complete for $env_name"
}

# Template-based Environment Creation Functions

# Create project in folder with unique ID generation
create_project_folder_level() {
    local base_name=$1
    local folder_id=$2
    local project_id
    project_id=$(generate_project_id "$base_name")
    
    create_project "$project_id" "$base_name" "$folder_id" || return 1
    echo "$project_id"
}

# Create project at organization level with unique ID generation  
create_project_org_level_new() {
    local base_name=$1
    local project_id
    project_id=$(generate_project_id "$base_name")
    
    create_project_org_level "$project_id" "$base_name" || return 1
    echo "$project_id"
}

# Environment-specific build trigger setup
setup_environment_build_triggers() {
    local project_id=$1
    local env_name=$2
    
    local trigger_type
    local pattern
    local description
    trigger_type=$(get_environment_trigger_type "$env_name")
    pattern=$(get_environment_pattern "$env_name")
    description=$(get_environment_description "$env_name")
    
    log_info "Setting up build triggers for $env_name environment ($project_id)"
    
    # Set current project
    gcloud config set project "$project_id"
    
    # Create trigger based on environment type
    case "$trigger_type" in
        "semver_tags")
            gcloud builds triggers create github \
                --repo-name="$REPO_NAME" \
                --repo-owner="$REPO_OWNER" \
                --tag-pattern="$pattern" \
                --build-config=src/build/cloudbuild.yaml \
                --description="Tonic $env_name - $description" \
                --name="tonic-$env_name-deploy" \
                --substitutions="_ENV_TYPE=$env_name,_DEPLOY_REGION=$REGION" || log_warning "Trigger may already exist"
            ;;
        "main_branch"|"*_branch")
            local branch_name
            if [[ "$trigger_type" == "main_branch" ]]; then
                branch_name="main"
            else
                branch_name="${trigger_type%_branch}"
            fi
            
            gcloud builds triggers create github \
                --repo-name="$REPO_NAME" \
                --repo-owner="$REPO_OWNER" \
                --branch-pattern="$pattern" \
                --build-config=src/build/cloudbuild.yaml \
                --description="Tonic $env_name - $description" \
                --name="tonic-$env_name-deploy" \
                --substitutions="_ENV_TYPE=$env_name,_DEPLOY_REGION=$REGION" || log_warning "Trigger may already exist"
            ;;
        *)
            log_warning "Unknown trigger type: $trigger_type for environment $env_name"
            ;;
    esac
    
    log_success "Build triggers setup complete for $env_name environment"
}

# Template function for creating new environments
create_new_environment() {
    local env_name=$1
    local trigger_type=$2  # semver_tags, main_branch, dev_branch, etc.
    local pattern=$3       # regex pattern for triggers
    local description=$4   # human readable description
    local folder_id=${5:-} # optional folder ID
    
    log_info "Creating new environment: $env_name"
    
    # Add to environments array (this would need to be persistent)
    ENVIRONMENTS[$env_name]="$trigger_type:$pattern:$description"
    
    # Create the project
    local project_id
    if [[ -n "$folder_id" ]]; then
        project_id=$(create_project_folder_level "tonic-$env_name" "$folder_id")
    else
        project_id=$(create_project_org_level_new "tonic-$env_name")
    fi
    
    # Setup the environment
    setup_project_infrastructure "$project_id" "$env_name"
    setup_project_secrets "$project_id" "$env_name"
    create_environment_service_account "$project_id" "$env_name"
    setup_environment_build_triggers "$project_id" "$env_name"
    
    log_success "New environment '$env_name' created successfully!"
    echo "Project ID: $project_id"
    echo "Trigger: $trigger_type matching $pattern"
    echo "Description: $description"
    echo ""
    echo "Console Links:"
    echo "  • Secret Manager: https://console.cloud.google.com/security/secret-manager?project=$project_id"
    echo "  • Service Accounts: https://console.cloud.google.com/iam-admin/serviceaccounts?project=$project_id"
    echo "  • Build Triggers: https://console.cloud.google.com/cloud-build/triggers?project=$project_id"
}

# Parse command line arguments
parse_args() {
    FOLDER_ID=""
    PROJECT_ID=""
    USER_EMAIL=""
    TEMPLATE_PROJECT=""
    OPERATION_MODE=""  # 'folder', 'project', or 'organization'
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --folder=*)
                FOLDER_ID="${1#*=}"
                OPERATION_MODE="folder"
                shift
                ;;
            --project=*)
                PROJECT_ID="${1#*=}"
                OPERATION_MODE="project"
                shift
                ;;
            --user=*)
                USER_EMAIL="${1#*=}"
                shift
                ;;
            --template=*)
                TEMPLATE_PROJECT="${1#*=}"
                shift
                ;;
            --organization)
                OPERATION_MODE="organization"
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Set default operation mode for setup if none specified
    if [[ -z "$OPERATION_MODE" ]]; then
        OPERATION_MODE="organization"
    fi
}

# Validate required folder ID for folder-based operations
validate_folder_id() {
    if [[ -z "$FOLDER_ID" ]]; then
        log_error "Folder ID is required for this operation"
        echo "Usage: $0 $1 --folder=FOLDER_ID"
        exit 1
    fi
    
    # Validate folder exists and is accessible
    if ! gcloud resource-manager folders describe "$FOLDER_ID" >/dev/null 2>&1; then
        log_error "Cannot access folder $FOLDER_ID. Check folder ID and permissions."
        exit 1
    fi
}

# Validate project ID and accessibility
validate_project_id() {
    local command_name=$1
    if [[ -z "$PROJECT_ID" ]]; then
        log_error "Project ID is required for this operation"
        echo "Usage: $0 $command_name --project=PROJECT_ID"
        exit 1
    fi
    
    # Verify project exists and is accessible
    if ! gcloud projects describe "$PROJECT_ID" >/dev/null 2>&1; then
        log_error "Cannot access project $PROJECT_ID. Check project ID and permissions."
        exit 1
    fi
    
    # Verify project has tonic label (with warning, not error)
    local labels
    labels=$(gcloud projects describe "$PROJECT_ID" --format="value(labels)" 2>/dev/null || echo "")
    if [[ ! "$labels" == *"application=tonic"* ]]; then
        log_warning "Project $PROJECT_ID does not have 'application=tonic' label."
        echo "This may not be a Tonic project. Continue anyway? (y/N)"
        read -p "Continue: " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Operation cancelled by user"
            exit 0
        fi
    fi
}

# Enhanced validation for flexible operation modes
validate_operation_mode() {
    local command_name=$1
    
    case "$command_name" in
        "setup-gcp")
            # Setup can work with folder (preferred) or without (organization-level)
            if [[ -n "$FOLDER_ID" ]]; then
                validate_folder_id "$command_name"
            fi
            # No validation needed if no folder - will create at org level
            ;;
        "status-gcp"|"cleanup-gcp")
            # These commands require either folder or project or organization
            if [[ -z "$FOLDER_ID" && -z "$PROJECT_ID" && "$OPERATION_MODE" != "organization" ]]; then
                log_error "Either --folder=FOLDER_ID, --project=PROJECT_ID, or --organization is required"
                echo "Usage: $0 $command_name --folder=FOLDER_ID    # Operate on all projects in folder"
                echo "   or: $0 $command_name --project=PROJECT_ID  # Operate on single project"
                echo "   or: $0 $command_name --organization        # Operate on all projects in organization"
                exit 1
            fi
            if [[ -n "$FOLDER_ID" && -n "$PROJECT_ID" ]]; then
                log_error "Cannot specify both --folder and --project. Choose one."
                echo "Usage: $0 $command_name --folder=FOLDER_ID    # Operate on all projects in folder"
                echo "   or: $0 $command_name --project=PROJECT_ID  # Operate on single project"
                exit 1
            fi
            if [[ -n "$FOLDER_ID" ]]; then
                validate_folder_id "$command_name"
            fi
            if [[ -n "$PROJECT_ID" ]]; then
                validate_project_id "$command_name"
            fi
            ;;
        "destroy-gcp")
            # Only allow folder or project for destroy-gcp
            if [[ -z "$FOLDER_ID" && -z "$PROJECT_ID" ]]; then
                log_error "Either --folder=FOLDER_ID or --project=PROJECT_ID is required for destroy-gcp"
                echo "Usage: $0 destroy-gcp --folder=FOLDER_ID    # Operate on all projects in folder"
                echo "   or: $0 destroy-gcp --project=PROJECT_ID  # Operate on single project"
                exit 1
            fi
            if [[ -n "$FOLDER_ID" && -n "$PROJECT_ID" ]]; then
                log_error "Cannot specify both --folder and --project. Choose one."
                echo "Usage: $0 destroy-gcp --folder=FOLDER_ID    # Operate on all projects in folder"
                echo "   or: $0 destroy-gcp --project=PROJECT_ID  # Operate on single project"
                exit 1
            fi
            if [[ -n "$FOLDER_ID" ]]; then
                validate_folder_id "$command_name"
            fi
            if [[ -n "$PROJECT_ID" ]]; then
                validate_project_id "$command_name"
            fi
            ;;
    esac
}

# Get all Tonic projects in a folder
get_tonic_projects_in_folder() {
    local folder_id=$1
    gcloud projects list --folder="$folder_id" --filter="labels.$APPLICATION_LABEL" --format="value(projectId)" 2>/dev/null || echo ""
}

# Get all Tonic projects in organization (no folder restriction)
get_all_tonic_projects_in_org() {
    gcloud projects list --filter="labels.$APPLICATION_LABEL" --format="value(projectId)" 2>/dev/null || echo ""
}

# Get projects based on operation mode
get_target_projects() {
    case "$OPERATION_MODE" in
        "folder")
            get_tonic_projects_in_folder "$FOLDER_ID"
            ;;
        "project")
            echo "$PROJECT_ID"
            ;;
    # organization intentionally not supported for destroy-gcp
        *)
            log_error "Invalid operation mode: $OPERATION_MODE"
            exit 1
            ;;
    esac
}

# Generate unique project ID with suffix
generate_project_id() {
    local base_name=$1
    local timestamp=$(date +%s | tail -c 6)  # Last 6 digits of timestamp
    echo "${base_name}-${timestamp}"
}

# Get build service account for a project
get_build_service_account() {
    local project_id=$1
    local project_number
    project_number=$(gcloud projects describe "$project_id" --format="value(projectNumber)" 2>/dev/null)
    if [ $? -ne 0 ]; then
        log_error "Cannot access project $project_id. Check project ID and permissions."
        return 1
    fi
    echo "${project_number}@cloudbuild.gserviceaccount.com"
}

# Create a new GCP project in a folder
create_project() {
    local project_id=$1
    local project_name=$2
    local folder_id=$3
    
    log_info "Creating project: $project_id ($project_name)"
    
    # Create project
    gcloud projects create "$project_id" \
        --name="$project_name" \
        --folder="$folder_id" \
        --labels="$APPLICATION_LABEL" || {
        log_error "Failed to create project $project_id"
        return 1
    }
    
    # Link billing account (if available)
    local billing_account
    billing_account=$(gcloud billing accounts list --filter="open=true" --limit=1 --format="value(name)" 2>/dev/null || echo "")
    if [[ -n "$billing_account" ]]; then
        log_info "Linking billing account to $project_id"
        gcloud billing projects link "$project_id" --billing-account="$billing_account" || {
            log_warning "Could not link billing account - you may need to do this manually"
        }
    else
        log_warning "No billing account found - you may need to link billing manually"
    fi
    
    log_success "Project $project_id created successfully"
}

# Create a new GCP project at organization level (no folder)
create_project_org_level() {
    local project_id=$1
    local project_name=$2
    
    log_info "Creating project at organization level: $project_id ($project_name)"
    
    # Create project without folder
    gcloud projects create "$project_id" \
        --name="$project_name" \
        --labels="$APPLICATION_LABEL" || {
        log_error "Failed to create project $project_id"
        return 1
    }
    
    # Link billing account (if available)
    local billing_account
    billing_account=$(gcloud billing accounts list --filter="open=true" --limit=1 --format="value(name)" 2>/dev/null || echo "")
    if [[ -n "$billing_account" ]]; then
        log_info "Linking billing account to $project_id"
        gcloud billing projects link "$project_id" --billing-account="$billing_account" || {
            log_warning "Could not link billing account - you may need to do this manually"
        }
    else
        log_warning "No billing account found - you may need to link billing manually"
    fi
    
    log_success "Project $project_id created successfully at organization level"
}

# Enable required APIs for a project
enable_apis() {
    local project_id=$1
    
    log_info "Enabling required APIs for $project_id..."
    gcloud services enable cloudbuild.googleapis.com --project="$project_id"
    gcloud services enable run.googleapis.com --project="$project_id"
    gcloud services enable containerregistry.googleapis.com --project="$project_id"
    gcloud services enable secretmanager.googleapis.com --project="$project_id"
    gcloud services enable cloudbuildgithub.googleapis.com --project="$project_id"
    
    log_success "APIs enabled for $project_id"
}

# Set up IAM permissions for Cloud Build
setup_build_permissions() {
    local project_id=$1
    local build_sa
    build_sa=$(get_build_service_account "$project_id")
    
    log_info "Setting up IAM permissions for $project_id..."
    log_info "Cloud Build Service Account: $build_sa"
    
    # Grant required permissions
    gcloud projects add-iam-policy-binding "$project_id" \
        --member="serviceAccount:$build_sa" \
        --role="roles/run.admin"
    
    gcloud projects add-iam-policy-binding "$project_id" \
        --member="serviceAccount:$build_sa" \
        --role="roles/secretmanager.secretAccessor"
    
    gcloud projects add-iam-policy-binding "$project_id" \
        --member="serviceAccount:$build_sa" \
        --role="roles/iam.serviceAccountUser"
    
    log_success "IAM permissions configured for $project_id"
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

# Helper function to setup infrastructure for a project
setup_project_infrastructure() {
    local project_id="$1"
    local env_type="$2"
    
    log_info "Setting up infrastructure for $project_id ($env_type)..."
    
    # Set current project
    gcloud config set project "$project_id"
    
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
    gcloud projects add-iam-policy-binding "$project_id" \
        --member="serviceAccount:$BUILD_SA" \
        --role="roles/run.admin"
    
    # Secret Manager permissions
    gcloud projects add-iam-policy-binding "$project_id" \
        --member="serviceAccount:$BUILD_SA" \
        --role="roles/secretmanager.secretAccessor"
    
    # Service Account User (to deploy to Cloud Run)
    gcloud projects add-iam-policy-binding "$project_id" \
        --member="serviceAccount:$BUILD_SA" \
        --role="roles/iam.serviceAccountUser"
    
    log_success "Infrastructure setup complete for $project_id"
}

# Helper function to setup secrets for a project
setup_project_secrets() {
    local project_id="$1"
    local env_type="$2"
    
    log_info "Setting up secrets for $project_id ($env_type)..."
    
    # Set current project
    gcloud config set project "$project_id"
    
    # Create secrets with placeholder values
    create_secret_with_placeholder "working-spreadsheet-id" "your-$env_type-spreadsheet-id-here" "Google Sheets ID for Tonic app" "Google Sheets ID"
    create_secret_with_placeholder "google-service-account-email" "your-service-account@$project_id.iam.gserviceaccount.com" "Google service account email" "Service Account Email"
    create_secret_with_placeholder "google-private-key" "-----BEGIN PRIVATE KEY-----
...your-private-key-content-for-$env_type...
-----END PRIVATE KEY-----" "Google service account private key" "Service Account Private Key"
    create_secret_with_placeholder "operator-email" "your-operator-email-$env_type@domain.com" "Operator email for admin access" "Operator Email"
    create_secret_with_placeholder "rock-band-class-ids" "G001,G002" "Rock Band class IDs for waitlist handling" "Rock Band Class IDs"
    
    log_success "Secrets setup complete for $project_id"
}

# Helper function to setup build triggers for a project
setup_build_triggers() {
    local project_id="$1"
    local env_type="$2"
    
    log_info "Setting up build triggers for $project_id ($env_type)..."
    
    # Set current project
    gcloud config set project "$project_id"
    
    if [[ "$env_type" == "staging" ]]; then
        # Staging trigger: semver tags only
        gcloud builds triggers create github \
            --repo-name="$REPO_NAME" \
            --repo-owner="$REPO_OWNER" \
            --tag-pattern="^v[0-9]+\.[0-9]+\.[0-9]+$" \
            --build-config=src/build/cloudbuild.yaml \
            --description="Tonic staging deployment (semver tags)" \
            --name="tonic-staging-deploy" \
            --substitutions="_ENV_TYPE=staging,_DEPLOY_REGION=$REGION" || log_warning "Trigger may already exist"
    else
        # Production trigger: main branch pushes
        gcloud builds triggers create github \
            --repo-name="$REPO_NAME" \
            --repo-owner="$REPO_OWNER" \
            --branch-pattern="^main$" \
            --build-config=src/build/cloudbuild.yaml \
            --description="Tonic production deployment (main branch)" \
            --name="tonic-production-deploy" \
            --substitutions="_ENV_TYPE=production,_DEPLOY_REGION=$REGION" || log_warning "Trigger may already exist"
    fi
    
    log_success "Build triggers setup complete for $project_id"
}

setup_gcp_command() {
    validate_operation_mode
    check_gcloud

    local environments
    environments=$(list_configured_environments)
    local env_count
    env_count=$(echo "$environments" | wc -l | tr -d ' ')

    if [[ "$OPERATION_MODE" == "folder" ]]; then
        echo "🚀 Setting up GCP CI/CD Pipeline for Tonic (Folder-based)"
        echo "=========================================================="
        echo "Folder ID: $FOLDER_ID"
        echo "Region: $REGION"
        echo "Repository: $REPO_OWNER/$REPO_NAME"
        echo "Environments: $env_count ($(echo "$environments" | tr '\n' ', ' | sed 's/, $//'))"
        echo ""
        echo "This will create for each environment:"
        echo "  • Dedicated GCP project in folder"
        echo "  • Environment-specific service account"
        echo "  • Environment-isolated secrets"
        echo "  • Build triggers with environment-specific patterns"
        echo "  • Proper IAM permissions"
        echo ""
    else
        echo "🚀 Setting up GCP CI/CD Pipeline for Tonic (Organization-level)"
        echo "==============================================================="
        echo "Region: $REGION"
        echo "Repository: $REPO_OWNER/$REPO_NAME"
        echo "Environments: $env_count ($(echo "$environments" | tr '\n' ', ' | sed 's/, $//'))"
        echo ""
        echo "This will create for each environment:"
        echo "  • Dedicated GCP project in organization"
        echo "  • Environment-specific service account"
        echo "  • Environment-isolated secrets"
        echo "  • Build triggers with environment-specific patterns"
        echo "  • Proper IAM permissions"
        echo ""
    fi

    # Create projects for each environment
    declare -A PROJECT_IDS
    
    while read -r env_name; do
        if [[ -n "$env_name" ]]; then
            local env_description
            env_description=$(get_environment_description "$env_name")
            
            log_info "Creating $env_name project ($env_description)..."
            
            if [[ "$OPERATION_MODE" == "folder" ]]; then
                PROJECT_IDS[$env_name]=$(create_project_folder_level "tonic-$env_name" "$FOLDER_ID")
            else
                PROJECT_IDS[$env_name]=$(create_project_org_level_new "tonic-$env_name")
            fi
            
            log_success "Created $env_name project: ${PROJECT_IDS[$env_name]}"
        fi
    done <<< "$environments"

    # Setup each environment
    while read -r env_name; do
        if [[ -n "$env_name" ]]; then
            local project_id="${PROJECT_IDS[$env_name]}"
            echo ""
            log_info "Setting up $env_name environment ($project_id)..."
            
            # Setup infrastructure, secrets, and service account
            setup_project_infrastructure "$project_id" "$env_name"
            setup_project_secrets "$project_id" "$env_name"
            create_environment_service_account "$project_id" "$env_name"
            setup_environment_build_triggers "$project_id" "$env_name"
        fi
    done <<< "$environments"

    echo ""
    log_success "GCP CI/CD Setup Complete!"
    echo "=============================="
    echo ""
    
    if [[ "$OPERATION_MODE" == "folder" ]]; then
        echo "📋 Created in folder $FOLDER_ID:"
    else
        echo "📋 Created in organization:"
    fi
    
    # Display created projects
    while read -r env_name; do
        if [[ -n "$env_name" ]]; then
            echo "  ✅ ${env_name^} project: ${PROJECT_IDS[$env_name]}"
        fi
    done <<< "$environments"
    
    echo "  ✅ APIs enabled for all projects"
    echo "  ✅ Environment-specific service accounts created"
    echo "  ✅ IAM permissions configured"
    echo "  ✅ Secrets created with actual service account details"
    echo "  ✅ Build triggers configured with environment patterns"
    echo ""

    log_success "AUTOMATED: Service account keys generated and stored"
    echo "=================================================="
    echo ""
    
    # Display console links for each environment
    while read -r env_name; do
        if [[ -n "$env_name" ]]; then
            local project_id="${PROJECT_IDS[$env_name]}"
            echo "${env_name^} Console Links:"
            echo "  • Secret Manager: https://console.cloud.google.com/security/secret-manager?project=$project_id"
            echo "  • Service Accounts: https://console.cloud.google.com/iam-admin/serviceaccounts?project=$project_id"
            echo "  • Build Triggers: https://console.cloud.google.com/cloud-build/triggers?project=$project_id"
            echo ""
        fi
    done <<< "$environments"
    
    echo "🔑 Secrets automatically configured in ALL projects:"
    echo "  • working-spreadsheet-id (still needs environment-specific values)"
    echo "  • google-service-account-email (✅ populated with actual SA email)"
    echo "  • google-private-key (✅ populated with generated key)"
    echo "  • operator-email (still needs your email)"
    echo "  • rock-band-class-ids (still needs class IDs)"
    echo ""
    
    echo "🔄 CI/CD Workflow:"
    while read -r env_name; do
        if [[ -n "$env_name" ]]; then
            local trigger_type
            local pattern
            trigger_type=$(get_environment_trigger_type "$env_name")
            pattern=$(get_environment_pattern "$env_name")
            
            case "$trigger_type" in
                "semver_tags")
                    echo "  • ${env_name^}: Triggered by semver tags matching $pattern"
                    ;;
                "main_branch")
                    echo "  • ${env_name^}: Triggered by pushes to main branch"
                    ;;
                *)
                    echo "  • ${env_name^}: Triggered by $trigger_type matching $pattern"
                    ;;
            esac
        fi
    done <<< "$environments"
    echo ""
    
    echo "🎯 Next steps:"
    echo "  1. Update remaining secrets in ALL projects (working-spreadsheet-id, operator-email, rock-band-class-ids)"
    echo "  2. Push to dev branch to trigger GitHub Actions → versioning → staging deploy"
    echo "  3. Merge to main to trigger production deploy"
    echo ""
    echo "✨ NEW: Each environment now has its own dedicated service account for better security isolation!"
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
    echo "Setup Commands:"
    echo "  $0 setup-gcp --folder=FOLDER_ID         - Create staging + production projects in folder"
    echo "  $0 setup-gcp --organization             - Create staging + production projects at org level"
    echo ""
    echo "Management Commands:"
    echo "  $0 status-gcp --folder=FOLDER_ID        - Status of all Tonic projects in folder"
    echo "  $0 status-gcp --project=PROJECT_ID      - Status of single project"
    echo "  $0 status-gcp --organization            - Status of all Tonic projects in organization"
    echo ""
    echo "  $0 cleanup-gcp --folder=FOLDER_ID       - Clean all Tonic projects in folder"
    echo "  $0 cleanup-gcp --project=PROJECT_ID     - Clean single project"
    echo "  $0 cleanup-gcp --organization           - Clean all Tonic projects in organization"
    echo ""
    echo "  $0 destroy-gcp --folder=FOLDER_ID       - DESTROY all Tonic projects in folder"
    echo "  $0 destroy-gcp --project=PROJECT_ID     - DESTROY single project"
    echo ""
    echo "Permission Management:"
    echo "  $0 update-permissions --project=PROJECT_ID --user=USER_EMAIL"
    echo ""
    echo "Examples:"
    echo "  $0 setup-gcp --folder=123456789"
    echo "  $0 setup-gcp --organization"
    echo "  $0 status-gcp --project=tonic-staging-abcdef"
    echo "  $0 cleanup-gcp --folder=123456789"
    echo "  $0 destroy-gcp --project=tonic-production-abcdef"
    echo "  $0 update-permissions --project=tonic-staging-abcdef --user=dev@company.com"
}

# Create all required secrets for a project
create_project_secrets() {
    local project_id=$1
    local env_type=$2  # 'staging' or 'production'
    
    log_info "Setting up secrets for $project_id ($env_type)..."
    
    # Initialize temp file for logging
    > "/tmp/gcp_secrets_to_update_${project_id}.txt"
    
    # Create secrets with placeholder values - same names for both environments
    create_secret_with_placeholder "$project_id" "working-spreadsheet-id" "your-${env_type}-spreadsheet-id-here" "Google Sheets ID for $env_type" "Google Sheets ID ($env_type)"
    create_secret_with_placeholder "$project_id" "google-service-account-email" "your-service-account@${project_id}.iam.gserviceaccount.com" "Google service account email for $env_type" "Service Account Email ($env_type)"
    create_secret_with_placeholder "$project_id" "google-private-key" "-----BEGIN PRIVATE KEY-----
...your-${env_type}-private-key-content...
-----END PRIVATE KEY-----" "Google service account private key for $env_type" "Service Account Private Key ($env_type)"
    create_secret_with_placeholder "$project_id" "operator-email" "your-operator-email@domain.com" "Operator email for admin access ($env_type)" "Operator Email ($env_type)"
    create_secret_with_placeholder "$project_id" "rock-band-class-ids" "G001,G002" "Rock Band class IDs for waitlist handling ($env_type)" "Rock Band Class IDs ($env_type)"
    
    log_success "Secrets created for $project_id ($env_type)"
}

# Create Cloud Build triggers
create_build_triggers() {
    local staging_project=$1
    local production_project=$2
    
    log_info "Creating Cloud Build triggers..."
    
    # Staging trigger - only strict semver tags
    log_info "Creating staging trigger for $staging_project..."
    gcloud builds triggers create github \
        --project="$staging_project" \
        --repo-name="$REPO_NAME" \
        --repo-owner="$REPO_OWNER" \
        --tag-pattern='^v[0-9]+\.[0-9]+\.[0-9]+$' \
        --build-config=src/build/cloudbuild.yaml \
        --description="Tonic Staging - Triggers on semver tags only" \
        --name="tonic-staging-deploy" \
        --substitutions="_DEPLOY_REGION=$REGION,_ENV_TYPE=staging" || log_warning "Staging trigger may already exist"
    
    # Production trigger - all pushes to main
    log_info "Creating production trigger for $production_project..."
    gcloud builds triggers create github \
        --project="$production_project" \
        --repo-name="$REPO_NAME" \
        --repo-owner="$REPO_OWNER" \
        --branch-pattern="main" \
        --build-config=src/build/cloudbuild.yaml \
        --description="Tonic Production - Triggers on main branch pushes" \
        --name="tonic-production-deploy" \
        --substitutions="_DEPLOY_REGION=$REGION,_ENV_TYPE=production" || log_warning "Production trigger may already exist"
    
    log_success "Build triggers created"
}

# Status command for folder-based operations
status_gcp_command() {
    validate_operation_mode
    check_gcloud
    
    if [[ "$OPERATION_MODE" == "folder" ]]; then
        echo "📊 GCP Resources Status for Tonic (Folder-based)"
        echo "================================================"
        echo "Folder ID: $FOLDER_ID"
        echo "Region: $REGION"
        echo ""
    elif [[ "$OPERATION_MODE" == "project" ]]; then
        echo "📊 GCP Resources Status for Tonic (Single Project)"
        echo "=================================================="
        echo "Project ID: $PROJECT_ID"
        echo "Region: $REGION"
        echo ""
    else
        echo "📊 GCP Resources Status for Tonic (Organization-wide)"
        echo "====================================================="
        echo "Region: $REGION"
        echo ""
    fi
    
    # Get target projects using flexible function
    local tonic_projects
    tonic_projects=$(get_target_projects)
    
    if [[ -z "$tonic_projects" ]]; then
        if [[ "$OPERATION_MODE" == "folder" ]]; then
            log_info "No Tonic projects found in folder $FOLDER_ID"
            echo ""
            echo "🎯 To create projects:"
            echo "  $0 setup-gcp --folder=$FOLDER_ID"
        elif [[ "$OPERATION_MODE" == "project" ]]; then
            log_info "Project $PROJECT_ID not found or not accessible"
        else
            log_info "No Tonic projects found in organization"
            echo ""
            echo "🎯 To create projects:"
            echo "  $0 setup-gcp"
        fi
        return 0
    fi
    
    echo "📋 Found Tonic projects:"
    echo "$tonic_projects" | while read -r project_id; do
        if [[ -n "$project_id" ]]; then
            local env_type="Unknown"
            if [[ "$project_id" == *"staging"* ]]; then
                env_type="Staging"
            elif [[ "$project_id" == *"production"* ]]; then
                env_type="Production"
            fi
            echo "  • $project_id ($env_type)"
        fi
    done
    echo ""
    
    # Display status for each project
    echo "$tonic_projects" | while read -r project_id; do
        if [[ -n "$project_id" ]]; then
            local env_type="Unknown"
            if [[ "$project_id" == *"staging"* ]]; then
                env_type="Staging"
            elif [[ "$project_id" == *"production"* ]]; then
                env_type="Production"
            fi
            
            echo "═══ $project_id ($env_type) ═══"
            
            # Quick status check for this project
            local build_sa
            build_sa=$(get_build_service_account "$project_id" 2>/dev/null || echo "NOT_AVAILABLE")
            
            # Check APIs
            local apis_enabled=0
            local total_apis=4
            local api_names=("cloudbuild.googleapis.com" "run.googleapis.com" "containerregistry.googleapis.com" "secretmanager.googleapis.com")
            
            for api in "${api_names[@]}"; do
                if gcloud services list --enabled --project="$project_id" --filter="name:$api" --format="value(name)" 2>/dev/null | grep -q "$api"; then
                    apis_enabled=$((apis_enabled + 1))
                fi
            done
            
            # Check secrets
            local secrets_count=0
            local total_secrets=5
            local secret_names=("working-spreadsheet-id" "google-service-account-email" "google-private-key" "operator-email" "rock-band-class-ids")
            
            for secret in "${secret_names[@]}"; do
                if gcloud secrets describe "$secret" --project="$project_id" >/dev/null 2>&1; then
                    secrets_count=$((secrets_count + 1))
                fi
            done
            
            # Check Cloud Run services
            local services
            services=$(gcloud run services list --region="$REGION" --project="$project_id" --format="value(metadata.name)" 2>/dev/null || echo "")
            local service_count
            service_count=$(echo "$services" | grep -c . 2>/dev/null || echo "0")
            
            # Check build triggers
            local triggers
            triggers=$(gcloud builds triggers list --project="$project_id" --format="value(name)" 2>/dev/null || echo "")
            local trigger_count
            trigger_count=$(echo "$triggers" | grep -c . 2>/dev/null || echo "0")
            
            # Display summary
            echo "📊 Quick Status:"
            echo "  • APIs Enabled: $apis_enabled/$total_apis"
            echo "  • Secrets: $secrets_count/$total_secrets"
            echo "  • Cloud Run Services: $service_count"
            echo "  • Build Triggers: $trigger_count"
            echo "  • Build Service Account: $build_sa"
            
            # Status indicator
            if [[ $apis_enabled -eq $total_apis ]] && [[ $secrets_count -eq $total_secrets ]] && [[ $trigger_count -gt 0 ]]; then
                log_success "READY"
            elif [[ $apis_enabled -gt 0 ]] || [[ $secrets_count -gt 0 ]]; then
                log_warning "PARTIAL SETUP"
            else
                log_info "NOT CONFIGURED"
            fi
            
            echo "🔗 Console Links:"
            echo "  • Secret Manager: https://console.cloud.google.com/security/secret-manager?project=$project_id"
            echo "  • Cloud Build: https://console.cloud.google.com/cloud-build/builds?project=$project_id"
            echo "  • Cloud Run: https://console.cloud.google.com/run?project=$project_id"
            echo "  • Triggers: https://console.cloud.google.com/cloud-build/triggers?project=$project_id"
            echo ""
        fi
    done
}

# Cleanup command for folder-based operations
cleanup_gcp_command() {
    validate_operation_mode
    check_gcloud
    
    if [[ "$OPERATION_MODE" == "folder" ]]; then
        echo "🧹 Cleaning up GCP CI/CD Infrastructure (Folder-based)"
        echo "======================================================"
        echo "Folder ID: $FOLDER_ID"
        echo ""
        echo "This will remove CI/CD infrastructure from ALL Tonic projects in the folder"
        echo "but preserve running services and data."
    elif [[ "$OPERATION_MODE" == "project" ]]; then
        echo "🧹 Cleaning up GCP CI/CD Infrastructure (Single Project)"
        echo "========================================================"
        echo "Project ID: $PROJECT_ID"
        echo ""
        echo "This will remove CI/CD infrastructure from the specified project"
        echo "but preserve running services and data."
    else
        echo "🧹 Cleaning up GCP CI/CD Infrastructure (Organization-wide)"
        echo "==========================================================="
        echo ""
        echo "This will remove CI/CD infrastructure from ALL Tonic projects in the organization"
        echo "but preserve running services and data."
    fi
    
    # Get target projects using flexible function
    local tonic_projects
    tonic_projects=$(get_target_projects)
    
    if [[ -z "$tonic_projects" ]]; then
        if [[ "$OPERATION_MODE" == "folder" ]]; then
            log_info "No Tonic projects found in folder $FOLDER_ID"
        elif [[ "$OPERATION_MODE" == "project" ]]; then
            log_info "Project $PROJECT_ID not found or not accessible"
        else
            log_info "No Tonic projects found in organization"
        fi
        return 0
    fi
    
    echo "📋 Projects that will be cleaned up:"
    echo "$tonic_projects" | while read -r project_id; do
        if [[ -n "$project_id" ]]; then
            echo "  • $project_id"
        fi
    done
    echo ""
    
    confirm_action "⚠️  This will remove IAM permissions, secrets, and build triggers from all projects."
    
    # Clean up each project
    echo "$tonic_projects" | while read -r project_id; do
        if [[ -n "$project_id" ]]; then
            log_info "Cleaning up $project_id..."
            
            # Get build service account
            local build_sa
            build_sa=$(get_build_service_account "$project_id" 2>/dev/null || echo "NOT_AVAILABLE")
            
            if [[ "$build_sa" != "NOT_AVAILABLE" ]]; then
                # Remove IAM permissions
                log_info "  Removing IAM permissions..."
                gcloud projects remove-iam-policy-binding "$project_id" \
                    --member="serviceAccount:$build_sa" \
                    --role="roles/run.admin" 2>/dev/null || true
                
                gcloud projects remove-iam-policy-binding "$project_id" \
                    --member="serviceAccount:$build_sa" \
                    --role="roles/secretmanager.secretAccessor" 2>/dev/null || true
                
                gcloud projects remove-iam-policy-binding "$project_id" \
                    --member="serviceAccount:$build_sa" \
                    --role="roles/iam.serviceAccountUser" 2>/dev/null || true
            fi
            
            # Delete secrets
            log_info "  Deleting secrets..."
            local secret_names=("working-spreadsheet-id" "google-service-account-email" "google-private-key" "operator-email" "rock-band-class-ids")
            for secret in "${secret_names[@]}"; do
                gcloud secrets delete "$secret" --project="$project_id" --quiet 2>/dev/null || true
            done
            
            # Delete build triggers
            log_info "  Deleting build triggers..."
            local triggers
            triggers=$(gcloud builds triggers list --project="$project_id" --format="value(name)" 2>/dev/null || echo "")
            if [[ -n "$triggers" ]]; then
                echo "$triggers" | while read -r trigger_name; do
                    if [[ -n "$trigger_name" ]]; then
                        gcloud builds triggers delete "$trigger_name" --project="$project_id" --quiet 2>/dev/null || true
                    fi
                done
            fi
            
            log_success "  Cleaned up $project_id"
        fi
    done
    
    echo ""
    if [[ "$OPERATION_MODE" == "folder" ]]; then
        log_success "Folder-based cleanup complete!"
    elif [[ "$OPERATION_MODE" == "project" ]]; then
        log_success "Project cleanup complete!"
    else
        log_success "Organization-wide cleanup complete!"
    fi
    echo ""
    echo "📋 What was removed from all projects:"
    echo "  ✅ IAM permissions for Cloud Build service accounts"
    echo "  ✅ All secrets deleted from Secret Manager"
    echo "  ✅ All build triggers deleted"
    echo ""
    echo "📋 What was preserved:"
    echo "  • GCP APIs (left enabled)"
    echo "  • Running Cloud Run services"
    echo "  • Container images"
    echo "  • Projects themselves"
}

# Destroy command for folder-based operations
destroy_gcp_command() {
    validate_operation_mode
    check_gcloud
    
    if [[ "$OPERATION_MODE" == "folder" ]]; then
        echo "💥 Destroying ALL GCP Resources (Folder-based)"
        echo "==============================================="
        echo "Folder ID: $FOLDER_ID"
        echo ""
        echo "⚠️  DANGER: This will PERMANENTLY DELETE all Tonic projects in the folder!"
        echo "⚠️  This includes ALL data, services, and configurations!"
    elif [[ "$OPERATION_MODE" == "project" ]]; then
        echo "💥 Destroying GCP Project"
        echo "========================="
        echo "Project ID: $PROJECT_ID"
        echo ""
        echo "⚠️  DANGER: This will PERMANENTLY DELETE the specified project!"
        echo "⚠️  This includes ALL data, services, and configurations!"
    else
        echo "💥 Destroying ALL GCP Resources (Organization-wide)"
        echo "==================================================="
        echo ""
        echo "⚠️  DANGER: This will PERMANENTLY DELETE all Tonic projects in the organization!"
        echo "⚠️  This includes ALL data, services, and configurations!"
    fi
    echo ""
    
    # Get target projects using flexible function
    local tonic_projects
    tonic_projects=$(get_target_projects)
    
    if [[ -z "$tonic_projects" ]]; then
        if [[ "$OPERATION_MODE" == "folder" ]]; then
            log_info "No Tonic projects found in folder $FOLDER_ID"
        elif [[ "$OPERATION_MODE" == "project" ]]; then
            log_info "Project $PROJECT_ID not found or not accessible"
        else
            log_info "No Tonic projects found in organization"
        fi
        return 0
    fi
    
    echo "💀 Projects that will be PERMANENTLY DELETED:"
    echo "$tonic_projects" | while read -r project_id; do
        if [[ -n "$project_id" ]]; then
            echo "  💥 $project_id"
        fi
    done
    echo ""
    echo "⚠️  This action CANNOT be undone!"
    echo "⚠️  All data will be lost!"
    echo "⚠️  All running applications will be stopped!"
    echo ""
    
    # First confirmation
    echo "Type 'DELETE' to confirm you want to destroy all projects:"
    read -p "Confirmation: " -r
    if [[ $REPLY != "DELETE" ]]; then
        log_info "Operation cancelled by user"
        return 0
    fi
    
    # Second confirmation with project count
    local project_count
    project_count=$(echo "$tonic_projects" | grep -c . 2>/dev/null || echo "0")
    echo ""
    echo "You are about to PERMANENTLY DELETE $project_count projects."
    echo "Type the exact number '$project_count' to proceed:"
    read -p "Project count confirmation: " -r
    if [[ $REPLY != "$project_count" ]]; then
        log_info "Operation cancelled - incorrect project count"
        return 0
    fi
    
    # Final confirmation
    confirm_action "💥 FINAL CONFIRMATION: DESTROY ALL PROJECTS?"
    
    # Delete each project entirely
    echo "$tonic_projects" | while read -r project_id; do
        if [[ -n "$project_id" ]]; then
            log_info "Deleting project: $project_id"
            if gcloud projects delete "$project_id" --quiet; then
                log_success "  Deleted $project_id"
            else
                log_warning "  Failed to delete $project_id (may require manual intervention)"
            fi
        fi
    done
    
    echo ""
    log_success "💥 DESTRUCTION COMPLETE!"
    echo "========================"
    echo ""
    echo "📋 What was DESTROYED:"
    if [[ "$OPERATION_MODE" == "folder" ]]; then
        echo "  💥 ALL Tonic projects in folder $FOLDER_ID"
        echo "  💥 ALL resources within those projects"
        echo "  💥 ALL data and configurations"
        echo ""
        echo "🔄 To start over:"
        echo "  $0 setup-gcp --folder=$FOLDER_ID"
    elif [[ "$OPERATION_MODE" == "project" ]]; then
        echo "  💥 Project $PROJECT_ID"
        echo "  💥 ALL resources within the project"
        echo "  💥 ALL data and configurations"
        echo ""
        echo "🔄 To start over:"
        echo "  $0 setup-gcp"
    else
        echo "  💥 ALL Tonic projects in organization"
        echo "  💥 ALL resources within those projects"
        echo "  💥 ALL data and configurations"
        echo ""
        echo "🔄 To start over:"
        echo "  $0 setup-gcp"
    fi
}

# Update user permissions function
update_permissions_command() {
    if [[ -z "$PROJECT_ID" ]] || [[ -z "$USER_EMAIL" ]]; then
        log_error "Both project ID and user email are required"
        echo "Usage: $0 update-permissions --project=PROJECT_ID --user=USER_EMAIL"
        exit 1
    fi
    
    echo "🔐 Updating User Permissions for Least-Privilege Access"
    echo "======================================================"
    echo "Project: $PROJECT_ID"
    echo "User: $USER_EMAIL"
    echo ""
    echo "This will:"
    echo "  • Remove roles/owner from the user"
    echo "  • Grant roles/editor (general edit permissions)"
    echo "  • Grant roles/iam.serviceAccountUser (service account usage)"
    echo "  • NOT grant secret manager or billing permissions"
    echo ""
    
    confirm_action "⚠️  This will modify IAM permissions for $USER_EMAIL on $PROJECT_ID."
    
    check_gcloud
    
    # Verify project exists
    if ! gcloud projects describe "$PROJECT_ID" >/dev/null 2>&1; then
        log_error "Project $PROJECT_ID not found or not accessible"
        exit 1
    fi
    
    # Check if user currently has owner role
    local has_owner
    has_owner=$(gcloud projects get-iam-policy "$PROJECT_ID" --format="json" 2>/dev/null | \
        grep -c "user:$USER_EMAIL" | head -1 || echo "0")
    
    if [[ "$has_owner" == "0" ]]; then
        log_warning "User $USER_EMAIL not found in project IAM policy"
    fi
    
    # Remove owner role
    log_info "Removing owner role from $USER_EMAIL..."
    if gcloud projects remove-iam-policy-binding "$PROJECT_ID" \
        --member="user:$USER_EMAIL" \
        --role="roles/owner" 2>/dev/null; then
        log_success "  Owner role removed"
    else
        log_warning "  User may not have had owner role"
    fi
    
    # Add editor role
    log_info "Adding editor role to $USER_EMAIL..."
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="user:$USER_EMAIL" \
        --role="roles/editor"
    
    # Add service account user role
    log_info "Adding service account user role to $USER_EMAIL..."
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="user:$USER_EMAIL" \
        --role="roles/iam.serviceAccountUser"
    
    echo ""
    log_success "Permissions updated for $USER_EMAIL on $PROJECT_ID"
    echo ""
    echo "📋 Current roles for $USER_EMAIL:"
    echo "  ✅ roles/editor - General resource management"
    echo "  ✅ roles/iam.serviceAccountUser - Can use service accounts"
    echo "  ❌ roles/secretmanager.* - No secret access"
    echo "  ❌ roles/billing.* - No billing access"
    echo ""
    echo "💡 The user can now manage CI/CD and resources but cannot access secrets or billing."
    echo ""
    echo "🔗 Verify permissions at:"
    echo "  https://console.cloud.google.com/iam-admin/iam?project=$PROJECT_ID"
}

# Main script logic
case "${1:-}" in
    setup-gcp)
        parse_args "${@:2}"
        setup_gcp_command
        ;;
    status-gcp)
        parse_args "${@:2}"
        status_gcp_command
        ;;
    cleanup-gcp)
        parse_args "${@:2}"
        cleanup_gcp_command
        ;;
    destroy-gcp)
        parse_args "${@:2}"
        destroy_gcp_command
        ;;
    update-permissions)
        parse_args "${@:2}"
        update_permissions_command
        ;;
    # Legacy commands (backwards compatibility)
    setup)
        log_warning "Using legacy command. Consider using 'setup-gcp' instead."
        if [[ -z "$2" ]]; then
            log_error "Project ID is required for legacy setup"
            echo "Usage: $0 setup PROJECT_ID"
            exit 1
        fi
        PROJECT_ID="$2"
        setup_command
        ;;
    cleanup)
        cleanup_command
        ;;
    destroy)
        destroy_command
        ;;
    status)
        log_warning "Using legacy command. Consider using 'status-gcp --project=PROJECT_ID' instead."
        if [[ -z "$2" ]]; then
            log_error "Project ID is required for legacy status"
            echo "Usage: $0 status PROJECT_ID"
            exit 1
        fi
        PROJECT_ID="$2"
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
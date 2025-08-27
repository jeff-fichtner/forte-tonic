# GCP CI/CD Management Scripts

This directory contains scripts for managing GCP projects, CI/CD, and permissions for the Tonic application using a modern, flexible parameter model.

## Usage

All commands require explicit parameters:
- `--folder=FOLDER_ID` for folder-based operations
- `--project=PROJECT_ID` for single project operations
- `--organization` for organization-wide operations (if supported)

Legacy/compatibility modes are not supported. Only the new parameter model is valid.

### Setup
```bash
./manage-gcp-cicd.sh setup-gcp --folder=FOLDER_ID
./manage-gcp-cicd.sh setup-gcp --organization
```

### Status
```bash
./manage-gcp-cicd.sh status-gcp --folder=FOLDER_ID
./manage-gcp-cicd.sh status-gcp --project=PROJECT_ID
./manage-gcp-cicd.sh status-gcp --organization
```

### Cleanup
```bash
./manage-gcp-cicd.sh cleanup-gcp --folder=FOLDER_ID
./manage-gcp-cicd.sh cleanup-gcp --project=PROJECT_ID
./manage-gcp-cicd.sh cleanup-gcp --organization
```

### Destroy
```bash
./manage-gcp-cicd.sh destroy-gcp --folder=FOLDER_ID
./manage-gcp-cicd.sh destroy-gcp --project=PROJECT_ID
./manage-gcp-cicd.sh destroy-gcp --organization
```

### Update Permissions
```bash
./manage-gcp-cicd.sh update-permissions --project=PROJECT_ID --user=USER_EMAIL
```

## See script help (`./manage-gcp-cicd.sh --help`) for all options and examples.

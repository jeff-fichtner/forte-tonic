# Configuration Files Organization

## Overview
All configuration files are organized in the `config/` directory for better maintainability and clarity.

## Configuration Files Structure

```
config/
├── babel.config.js          # Babel transpilation configuration
├── documentation.yml        # Documentation generation settings
├── eslint.config.js         # ESLint code quality rules
├── jest.config.js          # Jest testing framework configuration
├── render.yaml             # Render deployment blueprint (Infrastructure as Code)
├── .prettierrc.json        # Prettier code formatting rules
└── .prettierignore         # Files to exclude from Prettier formatting
```

## Key Configuration Files

### `render.yaml` 🚀
**Purpose:** Infrastructure as Code for Render deployments
**Usage:** Defines both staging and production environments
**How to use:**
1. In Render dashboard → "Blueprints"
2. Connect GitHub repository  
3. Set blueprint path: `config/render.yaml`
4. Render creates both services automatically

### `jest.config.js` 🧪
**Purpose:** Testing framework configuration
**Features:** ES modules support, coverage reporting, test discovery

### `eslint.config.js` 📏
**Purpose:** Code quality and style enforcement
**Features:** ES2022 support, Node.js rules, import validation

### `babel.config.js` 🔄
**Purpose:** JavaScript transpilation for compatibility
**Features:** ES modules, async/await, modern syntax support

### `.prettierrc.json` ✨
**Purpose:** Code formatting standardization
**Features:** Consistent style across all JavaScript files

### `documentation.yml` 📚
**Purpose:** API documentation generation
**Features:** JSDoc parsing, HTML output generation

## Benefits of Organized Configuration

### ✅ Advantages
- **Single location** for all configuration files
- **Easy to find** and modify settings
- **Version controlled** configuration
- **Consistent structure** across environments
- **Clear separation** of concerns

### 🔧 Development Workflow
```bash
# All configs in one place
ls config/

# Easy to reference in scripts
npm run lint    # Uses config/eslint.config.js
npm test        # Uses config/jest.config.js
npm run format  # Uses config/.prettierrc.json
```

### 🚀 Deployment Workflow
```bash
# Render Blueprint automatically found at config/render.yaml
# No manual service configuration needed
# Infrastructure as Code approach
```

## Configuration Usage Examples

### Testing
```bash
npm test              # Uses config/jest.config.js
npm run test:coverage # Coverage settings from jest.config.js
```

### Code Quality
```bash
npm run lint          # Uses config/eslint.config.js
npm run format        # Uses config/.prettierrc.json
```

### Deployment
```bash
# Render automatically reads config/render.yaml
# Creates both staging and production environments
```

### Documentation
```bash
npm run docs          # Uses config/documentation.yml
```

## Maintenance Notes

- All configuration files use relative paths from project root
- Environment-specific configs are handled via environment variables
- Blueprint updates automatically apply to both staging and production
- Configuration changes are version controlled and reviewable

This organization makes the project more professional and easier to maintain as it scales.

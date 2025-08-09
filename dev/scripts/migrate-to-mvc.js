#!/usr/bin/env node

/**
 * Migration Script: DDD to MVC Architecture
 * Converts Domain-Driven Design structure to traditional Model-View-Controller
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = __dirname;

console.log('🔄 Starting DDD to MVC Migration...');
console.log('📁 Project root:', projectRoot);

const migrationPlan = {
  // Move all repositories to src/repositories/
  repositories: {
    source: ['src/domain/repositories/', 'src/core/repositories/'],
    target: 'src/repositories/',
    files: [
      'src/domain/repositories/registrationRepository.js',
      'src/core/repositories/studentRepository.js',
      'src/core/repositories/instructorRepository.js',
      'src/core/repositories/adminRepository.js',
      'src/core/repositories/parentRepository.js',
      'src/core/repositories/attendanceRepository.js',
      'src/core/repositories/programRepository.js',
      'src/core/repositories/userRepository.js',
      'src/core/repositories/base/baseRepository.js',
      'src/core/repositories/helpers/',
      'src/domain/repositories/base/',
    ]
  },

  // Move all controllers to src/controllers/
  controllers: {
    source: ['src/application/controllers/'],
    target: 'src/controllers/',
    files: [
      'src/application/controllers/userController.js',
      'src/application/controllers/registrationController.js',
      'src/application/controllers/attendanceController.js',
      'src/application/controllers/systemController.js',
    ]
  },

  // Consolidate services to src/services/
  services: {
    source: ['src/application/services/', 'src/domain/services/', 'src/core/services/'],
    target: 'src/services/',
    files: [
      'src/application/services/studentApplicationService.js',
      'src/application/services/registrationApplicationService.js',
      'src/domain/services/',
      'src/core/services/authenticator.js',
    ]
  },

  // Consolidate models to src/models/
  models: {
    source: ['src/shared/models/', 'src/domain/entities/', 'src/core/models/'],
    target: 'src/models/',
    files: [
      'src/shared/models/',
      'src/domain/entities/',
      'src/core/models/',
    ]
  },

  // Keep utilities and values together
  utils: {
    source: ['src/core/utilities/', 'src/core/values/', 'src/domain/values/'],
    target: 'src/utils/',
    files: [
      'src/core/utilities/',
      'src/core/values/',
      'src/domain/values/',
    ]
  }
};

// Import path mappings for updating references
const importMappings = {
  // Repository mappings
  'from.*domain/repositories/': 'from \'../repositories/',
  'from.*core/repositories/': 'from \'../repositories/',
  'from.*\\.\\./\\.\\./domain/repositories/': 'from \'../repositories/',
  'from.*\\.\\./\\.\\./core/repositories/': 'from \'../repositories/',

  // Controller mappings  
  'from.*application/controllers/': 'from \'../controllers/',
  'from.*\\.\\./\\.\\./application/controllers/': 'from \'../controllers/',

  // Service mappings
  'from.*application/services/': 'from \'../services/',
  'from.*domain/services/': 'from \'../services/',
  'from.*core/services/': 'from \'../services/',
  'from.*\\.\\./\\.\\./application/services/': 'from \'../services/',

  // Model mappings
  'from.*shared/models/': 'from \'../models/',
  'from.*domain/entities/': 'from \'../models/',
  'from.*core/models/': 'from \'../models/',
  'from.*\\.\\./\\.\\./shared/models/': 'from \'../models/',

  // Utility mappings
  'from.*core/utilities/': 'from \'../utils/',
  'from.*core/values/': 'from \'../utils/',
  'from.*domain/values/': 'from \'../utils/',
};

async function createDirectoryIfNotExists(dir) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
    console.log('📁 Created directory:', dir);
  }
}

async function moveFile(source, target) {
  try {
    await fs.access(source);
    await createDirectoryIfNotExists(dirname(target));
    await fs.rename(source, target);
    console.log('📦 Moved:', source, '→', target);
    return true;
  } catch (error) {
    console.log('⚠️  Skip:', source, '(not found)');
    return false;
  }
}

async function updateImportPaths(filePath) {
  try {
    let content = await fs.readFile(filePath, 'utf8');
    let updated = false;

    for (const [pattern, replacement] of Object.entries(importMappings)) {
      const regex = new RegExp(pattern, 'g');
      if (regex.test(content)) {
        content = content.replace(regex, replacement);
        updated = true;
      }
    }

    if (updated) {
      await fs.writeFile(filePath, content, 'utf8');
      console.log('🔗 Updated imports in:', filePath);
    }
  } catch (error) {
    console.log('⚠️  Could not update imports in:', filePath);
  }
}

async function findJavaScriptFiles(dir) {
  const files = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...await findJavaScriptFiles(fullPath));
      } else if (entry.name.endsWith('.js')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Directory doesn't exist, skip
  }
  return files;
}

async function main() {
  try {
    console.log('\n📋 Phase 1: Creating new MVC directory structure...');
    
    // Create new directories
    await createDirectoryIfNotExists('src/controllers');
    await createDirectoryIfNotExists('src/models');
    await createDirectoryIfNotExists('src/repositories');
    await createDirectoryIfNotExists('src/services');
    await createDirectoryIfNotExists('src/utils');

    console.log('\n📋 Phase 2: Moving files to new structure...');

    // Move specific important files first
    const criticalMoves = [
      // Controllers
      { from: 'src/application/controllers/userController.js', to: 'src/controllers/userController.js' },
      { from: 'src/application/controllers/registrationController.js', to: 'src/controllers/registrationController.js' },
      { from: 'src/application/controllers/attendanceController.js', to: 'src/controllers/attendanceController.js' },
      { from: 'src/application/controllers/systemController.js', to: 'src/controllers/systemController.js' },
      
      // Main repositories
      { from: 'src/domain/repositories/registrationRepository.js', to: 'src/repositories/registrationRepository.js' },
      { from: 'src/core/repositories/studentRepository.js', to: 'src/repositories/studentRepository.js' },
      { from: 'src/core/repositories/userRepository.js', to: 'src/repositories/userRepository.js' },
      { from: 'src/core/repositories/base/baseRepository.js', to: 'src/repositories/baseRepository.js' },
      
      // Services
      { from: 'src/application/services/studentApplicationService.js', to: 'src/services/studentService.js' },
      { from: 'src/application/services/registrationApplicationService.js', to: 'src/services/registrationApplicationService.js' },
      { from: 'src/core/services/authenticator.js', to: 'src/services/authenticator.js' },
    ];

    for (const move of criticalMoves) {
      await moveFile(move.from, move.to);
    }

    console.log('\n📋 Phase 3: Moving remaining files...');
    
    // Move directories
    const directoryMoves = [
      { from: 'src/shared/models', to: 'src/models/shared' },
      { from: 'src/core/values', to: 'src/utils/values' },
      { from: 'src/core/utilities', to: 'src/utils/utilities' },
    ];

    for (const move of directoryMoves) {
      try {
        await fs.access(move.from);
        await createDirectoryIfNotExists(dirname(move.to));
        await fs.rename(move.from, move.to);
        console.log('📁 Moved directory:', move.from, '→', move.to);
      } catch (error) {
        console.log('⚠️  Directory not found:', move.from);
      }
    }

    console.log('\n📋 Phase 4: Updating import paths...');
    
    // Update import paths in all JavaScript files
    const allJsFiles = [
      ...await findJavaScriptFiles('src/controllers'),
      ...await findJavaScriptFiles('src/repositories'),
      ...await findJavaScriptFiles('src/services'),
      ...await findJavaScriptFiles('src/models'),
      ...await findJavaScriptFiles('src/routes'),
      ...await findJavaScriptFiles('src/middleware'),
      'src/server.js',
      'src/app.js'
    ];

    for (const file of allJsFiles) {
      await updateImportPaths(file);
    }

    console.log('\n📋 Phase 5: Update service container...');
    
    // Update service container paths
    const containerPath = 'src/infrastructure/container/serviceContainer.js';
    try {
      let content = await fs.readFile(containerPath, 'utf8');
      
      // Update import paths in service container
      content = content.replace(/from '\.\.\/\.\.\/core\/repositories\//g, 'from \'../../repositories/');
      content = content.replace(/from '\.\.\/\.\.\/application\/services\//g, 'from \'../../services/');
      content = content.replace(/from '\.\.\/\.\.\/domain\/repositories\//g, 'from \'../../repositories/');
      
      await fs.writeFile(containerPath, content, 'utf8');
      console.log('🔗 Updated service container paths');
    } catch (error) {
      console.log('⚠️  Could not update service container');
    }

    console.log('\n✅ Migration Complete!');
    console.log('\n📊 New MVC Structure:');
    console.log('src/');
    console.log('├── controllers/     # HTTP endpoints (was application/controllers)');
    console.log('├── models/         # Data models (was shared/models + domain/entities)');
    console.log('├── repositories/   # Data access (was core/repositories + domain/repositories)');
    console.log('├── services/       # Business logic (was application/services + domain/services)');
    console.log('├── utils/          # Utilities & values (was core/utilities + core/values)');
    console.log('├── routes/         # Express routes (unchanged)');
    console.log('├── middleware/     # Express middleware (unchanged)');
    console.log('└── web/            # Static files (unchanged)');

    console.log('\n🔧 Next Steps:');
    console.log('1. Run tests: npm test');
    console.log('2. Start server: npm start');
    console.log('3. Remove empty directories: src/domain/, src/application/');
    console.log('4. Update any remaining import paths manually if needed');
    console.log('5. Commit changes: git add . && git commit -m "Migrate from DDD to MVC architecture"');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();

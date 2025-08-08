// Temporary script to get parent access codes
import { serviceContainer } from './src/infrastructure/container/serviceContainer.js';
import { configService } from './src/services/configurationService.js';
import { createLogger } from './src/utils/logger.js';

async function getParentCodes() {
  try {
    // Initialize logger first
    const logger = createLogger(configService);
    
    await serviceContainer.initialize();
    const userRepository = serviceContainer.get('userRepository');
    
    const parents = await userRepository.getParents();
    console.log('First 3 parents with access codes:');
    
    for (let i = 0; i < Math.min(3, parents.length); i++) {
      const parent = parents[i];
      console.log(`Parent ${i + 1}:`, {
        email: parent.email,
        accessCode: parent.accessCode,
        id: parent.id
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

getParentCodes();

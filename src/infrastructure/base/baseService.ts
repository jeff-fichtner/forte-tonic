/**
 * Base Service class that all services, repositories, and database clients extend
 * Provides automatic logger initialization
 */

import { getLogger } from '../../utils/logger.js';
import type { Logger } from '../../utils/logger.js';
import { configService as defaultConfigService } from '../../services/configurationService.js';
import type { ConfigurationService } from '../../services/configurationService.js';

export class BaseService {
  configService: ConfigurationService;
  logger: Logger;

  constructor(configService: ConfigurationService = defaultConfigService) {
    this.configService = configService;
    this.logger = getLogger();
  }
}

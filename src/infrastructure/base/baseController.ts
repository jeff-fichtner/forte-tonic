/**
 * Base Controller class that all controllers extend
 * Provides automatic logger initialization
 */

import { BaseService } from './baseService.js';
import type { ConfigurationService } from '../../services/configurationService.js';

export class BaseController extends BaseService {
  constructor(configService?: ConfigurationService) {
    super(configService);
  }
}

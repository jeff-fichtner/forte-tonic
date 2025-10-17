/**
 * Base Controller class that all controllers extend
 * Provides automatic logger initialization
 */

import { BaseService } from './baseService.js';

export class BaseController extends BaseService {
  constructor(configService) {
    super(configService);
  }
}

import { AuthenticatedUserResponse } from '../models/shared/responses/authenticatedUserResponse.js';
import { OperatorUserResponse } from '../models/shared/responses/operatorUserResponse.js';
import { Admin } from '../models/shared/admin.js';
import { configService } from '../services/configurationService.js';
import { serviceContainer } from '../infrastructure/container/serviceContainer.js';
import { currentConfig } from '../config/environment.js';

// Initialize repositories for all requests - NO AUTHENTICATION
export const initializeRepositories = async (req, res, next) => {
  try {
    // Service container handles all repository and service instances
    const userRepository = serviceContainer.get('userRepository');
    const programRepository = serviceContainer.get('programRepository');
    
    // Attach repositories to request for API endpoints
    req.userRepository = userRepository;
    req.programRepository = programRepository;
    
    // Always set user to null - user objects are created only in specific controllers
    req.currentUser = null;
    req.user = null;
    
  } catch (error) {
    console.error('Error initializing repositories:', error);
    req.userRepository = null;
    req.programRepository = null;
    req.currentUser = null;
    req.user = null;
  }
  next();
};

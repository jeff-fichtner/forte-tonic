import { app, PORT, initializeApp } from './app.js';
import { configService } from './services/configurationService.js';
import { currentConfig, isProduction, isStaging } from './config/environment.js';
import { createLogger } from './utils/logger.js';
import { installProcessErrorHandlers } from './common/processErrorHandlers.js';

const logger = createLogger(configService);

// Install process-level error handlers BEFORE anything else can throw.
// Catches errors that escape Express (uncaughtException, unhandledRejection)
// and routes them through gcpLogger so they land in Cloud Logging alongside
// Express-routed errors.
installProcessErrorHandlers();

// Initialize the application and start the server
await initializeApp();

// Start the server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${configService.getServerConfig().nodeEnv}`);
  logger.info(`Base URL: ${currentConfig.baseUrl}`);

  if (isProduction) {
    logger.info('Production mode: Full security enabled');
  } else if (isStaging) {
    logger.info('Staging mode: Testing environment');
  } else {
    logger.info('Development mode: Debug features enabled');
  }
});

export default app;

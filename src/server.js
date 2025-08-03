import { app, PORT, initializeApp } from './app.js';
import { configService } from './core/services/configurationService.js';
import { currentConfig, isProduction, isStaging } from './config/environment.js';

// Initialize the application and start the server
await initializeApp();

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${configService.getServerConfig().nodeEnv}`);
  console.log(`Base URL: ${currentConfig.baseUrl}`);

  if (isProduction) {
    console.log('🚀 Production mode: Full security enabled');
  } else if (isStaging) {
    console.log('🧪 Staging mode: Testing environment');
  } else {
    console.log('🛠️ Development mode: Debug features enabled');
  }
});

export default app;

import { app, PORT } from './app.js';
import { configService } from './core/services/configurationService.js';

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${configService.getServerConfig().nodeEnv}`);
});

export default app;

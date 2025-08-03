import { GoogleSheetsDbClient } from '../../clients/googleSheetsDbClient.js';
import { Keys } from '../../values/keys.js';
import { configService } from '../../services/configurationService.js';

/**
 *
 */
function setWeek() {
  this.dbClient = new GoogleSheetsDbClient(configService);
  // TODO THIS IMPLEMENTATION WILL NOT BE SUITABLE FOR PRODUCTION
  this.dbClient.archiveSheet(Keys.ATTENDANCE);
}

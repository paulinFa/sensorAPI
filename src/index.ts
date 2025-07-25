import logger from 'jet-logger';

import ENV from '@src/common/constants/ENV';
import server from './server';
import { syncModels } from './repos/Sync';
import { logError } from '@src/common/util/errorLogger';


/******************************************************************************
                                Constants
******************************************************************************/

const SERVER_START_MSG = (
  'Express server started on port: ' + ENV.Port.toString()
);


/******************************************************************************
                                  Run
******************************************************************************/
async function bootstrap(): Promise<void> {
  // Synchronise la base (force=false pour ne pas drop)
  await syncModels(false);
}

bootstrap().catch((err) => {
  console.error('Failed to bootstrap application:', err);
  process.exit(1);
});

// Start the server
server.listen(ENV.Port, err => {
  if (!!err) {
    logger.err(err.message);
    logError(err.name,err.message);
  } else {
    logger.info(SERVER_START_MSG);
  }
});

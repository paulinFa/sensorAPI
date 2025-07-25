import morgan from 'morgan';
import path from 'path';
import helmet from 'helmet';
import express, { Request, Response, NextFunction } from 'express';
import logger from 'jet-logger';
import { HttpError } from 'http-errors';

import BaseRouter from '@src/routes';

import Paths from '@src/common/constants/Paths';
import ENV from '@src/common/constants/ENV';
import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import { RouteError } from '@src/common/util/route-errors';
import { NodeEnvs } from '@src/common/constants';
import cors from 'cors';


/******************************************************************************
                                Setup
******************************************************************************/
import { existsSync, mkdirSync } from 'fs';
import { logError } from './common/util/errorLogger';
const logDir = process.env.LOG_DIR || 'logs';
if (!existsSync(logDir)) {
  mkdirSync(logDir);
}


const app = express();


// **** Middleware **** //

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Show routes called in console during development
// if (ENV.NodeEnv === NodeEnvs.Dev) {
app.use(morgan('dev'));
// }
app.use(cors());
// // Security
// if (ENV.NodeEnv === NodeEnvs.Production) {
//   // eslint-disable-next-line n/no-process-env
//   if (!process.env.DISABLE_HELMET) {
//     app.use(helmet());
//   }
// }

// Add APIs, must be after middleware
app.use(Paths.Base, BaseRouter);

// 🔥 Middleware global de gestion d'erreurs
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  let status = HttpStatusCodes.INTERNAL_SERVER_ERROR;
  let message = err.message || 'Internal server error';

  // 🔍 Cas : http-errors (createHttpError.xxx)
  if ('status' in err && typeof (err as HttpError).status === 'number') {
    status = (err as HttpError).status;
  }

  // 🔍 Cas : erreurs personnalisées RouteError
  if (err instanceof RouteError) {
    status = err.status;
  }

  // 🪵 Logging intelligent
  if (status >= 500) {
    // Erreurs critiques → log complet
    logError(err);
  } else if (ENV.NodeEnv !== NodeEnvs.Test) {
    // Erreurs "normales" (404, 409, etc.) → log simple
    console.error(`[${status}] ${message}`);
  }

  return res.status(status).json({ message });
});
 


// **** FrontEnd Content **** //

// Set views directory (html)
const viewsDir = path.join(__dirname, 'views');
app.set('views', viewsDir);

// Set static directory (js and css).
const staticDir = path.join(__dirname, 'public');
app.use(express.static(staticDir));

// Nav to users pg by default
app.get('/', (_: Request, res: Response) => {
  return res.redirect('/users');
});

// Redirect to login if not logged in.
app.get('/users', (_: Request, res: Response) => {
  return res.sendFile('users.html', { root: viewsDir });
});


/******************************************************************************
                                Export default
******************************************************************************/

export default app;

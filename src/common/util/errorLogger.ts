// src/utils/errorLogger.ts
import { existsSync, mkdirSync, createWriteStream, WriteStream } from 'fs';
import { join } from 'path';
import logger from 'jet-logger';

// Assurer l’existence du dossier de logs
const logDir = process.env.LOG_DIR || 'logs';
if (!existsSync(logDir)) {
  mkdirSync(logDir);
}

// Flux d’écriture vers error.log
const errorLogPath = join(logDir, 'error.log');
const errorStream: WriteStream = createWriteStream(errorLogPath, { flags: 'a' });

/**
 * Logue une erreur dans error.log ET dans la console.
 * @param err L’erreur (Error ou autre) à logger
 * @param context Texte optionnel pour situer l’erreur
 */
export function logError(err: any, context?: string) {
  const time    = new Date().toISOString();
  const header  = context ? `[${context}] ` : '';
  const message = err instanceof Error
    ? `${err.message}\n${err.stack}`      // erreur JS classique
    : typeof err === 'object'
      ? JSON.stringify(err, null, 2)      // objet JSON
      : String(err);                      // autre

  // Composer la ligne à écrire
  const line = `${time} ${header}${message}\n\n`;

  // Écrire dans le fichier
  errorStream.write(line);

  // Afficher en console (rouge) via jet-logger
  logger.err(`${header}${message}`);
}

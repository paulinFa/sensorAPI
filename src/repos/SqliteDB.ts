import { Sequelize } from 'sequelize';
import path from 'path';
import ENV from '@src/common/constants/ENV';
import { NodeEnvs } from '@src/common/constants';

// Détermine le fichier SQLite selon l'environnement
const storage = ENV.NodeEnv === NodeEnvs.Test 
  ? path.resolve(__dirname, './../repos', 'database.db')
  : path.resolve(__dirname, './../repos', 'database.db');

// Initialise Sequelize avec SQLite
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage,
  logging: false,
});

export default sequelize;
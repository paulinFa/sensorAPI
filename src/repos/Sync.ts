import sequelize from './SqliteDB';

/**
 * Synchronise les modèles avec la base de données.
 * @param drop s'il faut forcer la recréation des tables
 */
export async function syncModels(drop = false): Promise<void> {
  await sequelize.sync({ force: drop });
}
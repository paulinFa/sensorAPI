import { Op } from 'sequelize';
import { Location } from '../models/Location';
import createHttpError from 'http-errors';

/**
 * Service pour gérer les lieux.
 */
export const LocationService = {
  /**
   * Crée un nouveau lieu.
   * @param name Nom du lieu
   */
  create: async (name: string) => {
    if (await LocationService.nameAlreadyExist(name)) {
      throw new createHttpError.Conflict(`Location '${name}' already exists`);
    }
    return Location.create({ name });
  },

  /**
   * Retourne tous les lieux.
   */
  findAll: async () => {
    return Location.findAll();
  },

  /**
   * Retourne un lieu par son ID.
   * @param id Identifiant du lieu
   */
  findById: async (id: number) => {
    return Location.findByPk(id);
  },

  

  /**
   * Met à jour un lieu existant.
   * @param id Identifiant du lieu
   * @param data Objet partiel avec la propriété `name`
   */
  update: async (
    id: number,
    data: Pick<Location, 'name'>
  ) => {
    const loc = await Location.findByPk(id);
    
    // Vérif avant update (exclut l'ID courant)
    if (await LocationService.nameAlreadyExist(data.name,id)) {
      throw new createHttpError.Conflict(
        `Location '${data.name}' already exists`
      );
    }
    return loc ? loc.update(data) : null;
  },

  /**
   * Supprime un lieu par son ID.
   * @param id Identifiant du lieu
   * @returns Nombre de lignes supprimées (0 ou 1)
   */
  delete: async (id: number) => {
    const loc = await Location.findByPk(id);
    if (!loc) return 0;
    await loc.destroy();
    return 1;
  },

    /**
   * Verifie si le nom existe
   * @param name Nom du lieu
   * @param id? Si id verifié si c'est pas lui
   * @returns Nombre de lignes supprimées (0 ou 1)
   */
  nameAlreadyExist: async (name: string, id?: number) => {
    const where: any = { name };
    if (id !== undefined) {
      where.id = { [Op.ne]: id };
    }
    const record = await Location.findOne({ where,attributes: ['id'], });
    return !!record;
  },
  existsById: async (id: number): Promise<boolean> => {
    const record = await Location.findOne({
      where: { id },
      attributes: ['id'],
    });
    return !!record;
  },
};
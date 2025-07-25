import { Op } from 'sequelize';
import { SensorType } from '../models/SensorType';
import createHttpError from 'http-errors';

/**
 * Service CRUD pour SensorType
 */
export const SensorTypeService = {
  create: async (name: string, unit?: string) =>{
    if (await SensorTypeService.nameAlreadyExist(name)) {
      throw new createHttpError.Conflict(
        `Sensor type '${name}' already exists`
      );
    }
    return SensorType.create({ name, unit: unit ?? null });
  },
  findAll: async () => SensorType.findAll(),
  findById: async (id: number) => SensorType.findByPk(id),
  update: async (
    id: number,
    data: { name: string } & Partial<Pick<SensorType, 'unit'>>
  ) => {
    if (await SensorTypeService.nameAlreadyExist(data.name,id)) {
      throw new createHttpError.Conflict(
        `Sensor type '${data.name}' already exists`
      );
    } 
    const st = await SensorType.findByPk(id);
    return st ? st.update(data) : null;
  },
  delete: async (id: number) => {
    const st = await SensorType.findByPk(id);
    if (!st) return 0;
    await st.destroy();
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
    const record = await SensorType.findOne({ where,attributes: ['id'], });
    return !!record;
  },
  existsById: async (id: number): Promise<boolean> => {
  const record = await SensorType.findOne({
    where: { id },
    attributes: ['id'],
  });
  return !!record;
  }

};
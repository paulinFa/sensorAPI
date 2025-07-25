import { SensorType } from '@src/models/SensorType';
import { Sensor } from '../models/Sensor';
import { LocationService } from './LocationService';
import { SensorTypeService } from './sensorTypeService';
import createHttpError from 'http-errors';

/**
 * Service CRUD pour Sensor
 */
export const SensorService = {
  create: async (
    name: string,
    typeId: number,
    locationId: number,
    serialNumber?: string
  ) =>
  {
    await SensorService.verifyForeignKeys(locationId,typeId);
    return Sensor.create({ name, typeId, locationId, serialNumber: serialNumber ?? null });
  },
  findAll: async () =>
    Sensor.findAll({ include: ['type', 'location'] }),

  findById: async (id: number) =>
    Sensor.findByPk(id, { include: ['type', 'location'] }),

  update: async (
    id: number,
    data: Partial<Pick<Sensor, 'name' | 'typeId' | 'locationId' | 'serialNumber'>>
  ) => {
    const sensor = await Sensor.findByPk(id);
    return sensor ? sensor.update(data) : null;
  },

  delete: async (id: number) => {
    const sensor = await Sensor.findByPk(id);
    if (!sensor) return 0;
    await sensor.destroy();
    return 1;
  },
  existsById: async (id: number): Promise<boolean> => {
    const record = await Sensor.findOne({
      where: { id },
      attributes: ['id'],
    });
    return !!record;
  },
  existsByIdOrThrow: async (id: number): Promise<void> => {
    const record = await Sensor.findOne({
      where: { id },
      attributes: ['id'],
    });
    if(!record)
      throw new createHttpError.NotFound(`Sensor with ID ${id} not found`);
  },
  verifyForeignKeys: async (idLocation: number, idSensorType: number) => {
    if(idLocation && !LocationService.existsById(idLocation))
      throw new createHttpError.NotFound(`Location with ID ${idLocation} not found`);
    if(idSensorType && !SensorTypeService.existsById(idSensorType))
      throw new createHttpError.NotFound(`SensorType with ID ${idSensorType} not found`);
    return true;
  }
};
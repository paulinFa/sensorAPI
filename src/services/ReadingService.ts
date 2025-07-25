// === src/services/readingService.ts ===
import { Reading } from '../models/Reading';
import { Location } from '../models/Location';
import { Sensor } from '../models/Sensor';
import { SensorType } from '../models/SensorType';
import { SensorService } from './SensorService';
import createHttpError from 'http-errors';

/**
 * Service CRUD pour Reading
 */
export const ReadingService = {
  /**
   * Crée une nouvelle lecture
   */
  create: async (
    sensorId: number,
    value: number,
    timestamp: Date
  ) => {

    return Reading.create({ sensorId, value, timestamp});
  },

  /**
   * Récupère toutes les lectures, avec le capteur associé
   */
   findAll: async () => {
    return Reading.findAll({
      include: [{
        model: Sensor,
        as: 'sensor',

        // On n’envoie que l’ID, le nom et le serialNumber du capteur
        attributes: {
          include: ['id', 'name', 'serialNumber'],
          exclude: ['typeId', 'locationId']  // on retire les clefs plates
        },

        // On inclut ensuite les deux sous‑associations
        include: [
          {
            model: SensorType,
            as: 'type',                   // alias défini avec belongsTo
            attributes: ['id', 'name', 'unit']
          },
          {
            model: Location,
            as: 'location',               // idem
            attributes: ['id', 'name']
          }
        ]
      }]
    });
  },

  /**
   * Récupère une lecture par son ID, avec le capteur associé
   */
  findById: async (id: number) => {
    return Reading.findByPk(id, {
      include: [{
        model: Sensor,
        as: 'sensor',
        include: [
          { model: Location, as: 'location' }
        ]
      }]
    });
  },

  /**
   * Met à jour une lecture existante
   */
  update: async (
    id: number,
    data: Partial<Pick<Reading, 'sensorId' | 'value' | 'timestamp'>>
  ) => {
    const reading = await Reading.findByPk(id);
    return reading ? reading.update(data) : null;
  },

  /**
   * Supprime une lecture par son ID
   */
  delete: async (id: number) => {
    const reading = await Reading.findByPk(id);
    if (!reading) return 0;
    await reading.destroy();
    return 1;
  },
  existsById: async (id: number): Promise<boolean> => {
    const record = await Reading.findOne({
      where: { id },
      attributes: ['id'],
    });
    return !!record;
  },
  verifyForeignKeys: async (idSensor: number) => {
    if(idSensor && !SensorService.existsById(idSensor))
      throw new createHttpError.NotFound(`Sensor with ID ${idSensor} not found`);
    return true;
  },
    /**
   * Supprime toutes les readings associées à un sensor donné.
   * @param sensorId ID du capteur
   * @returns Nombre de lignes supprimées
   */
  deleteAllBySensorId: async (sensorId: number): Promise<number> => {
    const deletedCount = await Reading.destroy({
      where: { sensorId },
    });

    return deletedCount;
  },
findByLocationOrSensor: async (locationId?: number, sensorId?: number) => {
  const whereSensor: any = {};

  if (locationId !== undefined) {
    whereSensor.locationId = locationId;
  }

  if (sensorId !== undefined) {
    whereSensor.id = sensorId;
  }

  const readings = await Reading.findAll({
    include: [
      {
        model: Sensor,
        as: 'sensor', // ✅ obligatoire car tu as défini un alias
        where: whereSensor,
        required: true,
      },
    ],
  });

  return readings;
}

}

// === src/services/readingService.ts ===
import { Reading } from '../models/Reading';
import { Location } from '../models/Location';
import { Sensor } from '../models/Sensor';
import { SensorType } from '../models/SensorType';
import { SensorService } from './SensorService';
import sequelize from '@src/repos/SqliteDB'; // ✅ pour les requêtes brutes
import { Response } from 'express';
import createHttpError from 'http-errors';

/**
 * Service CRUD pour Reading
 */
export const ReadingService = {
  create: async (sensorId: number, value: number, timestamp: Date) => {
    return Reading.create({ sensorId, value, timestamp });
  },

  findAll: async () => {
    return Reading.findAll({
      include: [{
        model: Sensor,
        as: 'sensor',
        attributes: {
          include: ['id', 'name', 'serialNumber'],
          exclude: ['typeId', 'locationId']
        },
        include: [
          {
            model: SensorType,
            as: 'type',
            attributes: ['id', 'name', 'unit']
          },
          {
            model: Location,
            as: 'location',
            attributes: ['id', 'name']
          }
        ]
      }]
    });
  },

  findById: async (id: number) => {
    return Reading.findByPk(id, {
      include: [{
        model: Sensor,
        as: 'sensor',
        include: [{ model: Location, as: 'location' }]
      }]
    });
  },

  update: async (
    id: number,
    data: Partial<Pick<Reading, 'sensorId' | 'value' | 'timestamp'>>
  ) => {
    const reading = await Reading.findByPk(id);
    return reading ? reading.update(data) : null;
  },

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
    if (idSensor && !SensorService.existsById(idSensor))
      throw new createHttpError.NotFound(`Sensor with ID ${idSensor} not found`);
    return true;
  },

  deleteAllBySensorId: async (sensorId: number): Promise<number> => {
    return Reading.destroy({ where: { sensorId } });
  },

  findByLocationOrSensor: async (locationId?: number, sensorId?: number) => {
    const whereSensor: any = {};
    if (locationId !== undefined) whereSensor.locationId = locationId;
    if (sensorId !== undefined) whereSensor.id = sensorId;

    return Reading.findAll({
      include: [
        {
          model: Sensor,
          as: 'sensor',
          where: whereSensor,
          required: true,
        },
      ],
    });
  },

  /**
   * Version optimisée : renvoie les lectures en binaire (8 octets par point)
   * Format : uint32 epoch, int16 temp*10, int16 hum*10
   */
  findByLocationOrSensorBinary: async (
    res: Response,
    locationId?: number,
    sensorId?: number,
    fromTs?: number,
    toTs?: number,
    max: number = 2000
  ) => {
    const where: string[] = [];
    const rep: any = {};

    if (locationId !== undefined) { where.push('s.location_id = :locationId'); rep.locationId = locationId; }
    if (sensorId !== undefined)   { where.push('s.id = :sensorId'); rep.sensorId = sensorId; }
    if (fromTs !== undefined)     { where.push("r.timestamp >= datetime(:fromTs, 'unixepoch')"); rep.fromTs = fromTs; }
    if (toTs !== undefined)       { where.push("r.timestamp < datetime(:toTs, 'unixepoch')");   rep.toTs = toTs; }

    const WHERE = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // 1) Compter
    const [{ cnt }] = await sequelize.query(
      `SELECT COUNT(*) AS cnt
         FROM reading r
         JOIN sensor s ON s.id = r.sensor_id
         ${WHERE}`,
      { replacements: rep, type: sequelize.QueryTypes.SELECT }
    ) as any[];
    const total = Number(cnt);
    const stride = Math.max(1, Math.ceil(total / max));

    // 2) Stream en binaire
    const pageSize = 5000;
    let cursorId = 0, kept = 0, seen = 0;

    while (kept < max) {
      const rows: any[] = await sequelize.query(
        `
        SELECT r.id,
               CAST(strftime('%s', r.timestamp) AS INT) AS ts,
               ROUND(r.value * 10) AS val10
        FROM reading r
        JOIN sensor s ON s.id = r.sensor_id
        ${WHERE} ${WHERE ? 'AND' : 'WHERE'} r.id > :cursorId
        ORDER BY r.id
        LIMIT :lim
        `,
        { replacements: { ...rep, cursorId, lim: pageSize }, type: sequelize.QueryTypes.SELECT }
      );

      if (!rows.length) break;

      const buf = Buffer.allocUnsafe(rows.length * 8);
      let off = 0;

      for (const r of rows) {
        cursorId = r.id;

        if ((seen % stride) === 0) {
          // Ici j'assume : val10 = température pour typeId 2 ou humidité pour typeId 3
          // Si tu veux les deux, il faudra ajuster la requête
          buf.writeUInt32LE(Number(r.ts) >>> 0, off); off += 4;
          buf.writeInt16LE(r.val10, off);             off += 2;
          buf.writeInt16LE(0, off);                   off += 2; // placeholder humidité si pas dispo
          kept++;
          if (kept >= max) break;
        }
        seen++;
      }

      if (off > 0) res.write(buf.subarray(0, off));
      if (kept >= max) break;
    }

    res.end();
  }
};

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
},
async findByLocationOrSensorBinary(
    res: Response,
    locationId?: number,
    sensorId?: number,
    fromTs?: number,
    toTs?: number,
    max: number = 2000
  ) {
    const where: string[] = [];
    const rep: any = {};

    if (locationId !== undefined) {
      where.push('s.location_id = :locationId');
      rep.locationId = locationId;
    }
    if (sensorId !== undefined) {
      where.push('s.id = :sensorId');
      rep.sensorId = sensorId;
    }
    if (fromTs !== undefined) {
      where.push('r.ts >= to_timestamp(:fromTs)');
      rep.fromTs = fromTs;
    }
    if (toTs !== undefined) {
      where.push('r.ts < to_timestamp(:toTs)');
      rep.toTs = toTs;
    }

    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // 1) Compter
    const [{ cnt }] = await sequelize.query(
      `SELECT COUNT(*)::bigint AS cnt
         FROM readings r
         JOIN sensors s ON s.id = r.sensor_id
         ${whereSQL}`,
      { replacements: rep, type: sequelize.QueryTypes.SELECT }
    ) as any[];
    const total = Number(cnt);
    const stride = Math.max(1, Math.ceil(total / max));

    // 2) Stream paginé
    const pageSize = 5000;
    let cursorId = 0, kept = 0, seen = 0;

    while (kept < max) {
      const rows: any[] = await sequelize.query(
        `
        SELECT r.id,
               EXTRACT(EPOCH FROM r.ts)::bigint AS ts,
               ROUND(r.temperature*10)::int AS t10,
               ROUND(r.humidity*10)::int    AS h10
        FROM readings r
        JOIN sensors s ON s.id = r.sensor_id
        ${whereSQL} ${where.length ? 'AND' : 'WHERE'} r.id > :cursorId
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
          buf.writeUInt32LE(Number(r.ts) >>> 0, off); off += 4;
          buf.writeInt16LE(r.t10, off); off += 2;
          buf.writeInt16LE(r.h10, off); off += 2;
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

}

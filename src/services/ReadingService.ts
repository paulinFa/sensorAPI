// === src/services/ReadingService.ts ===
import { Location } from '../models/Location';
import { SensorType } from '../models/SensorType';
import { SensorService } from './SensorService';
import createHttpError from 'http-errors';
import { Op, WhereOptions } from 'sequelize';
import { Reading } from '@src/models/Reading';
import { Sensor } from '@src/models/Sensor';
import sequelize from '@src/repos/SqliteDB';
import { Response } from 'express';
import { ReadingFilterNormalized } from '@src/validators/ReadingValidator';

export type JsonResult = Array<{
  id: number;
  sensorId: number;
  timestamp: string; // ISO
  value: number;
  sensor?: { id: number; locationId: number; typeId: number };
}>;

function buildSequelizeWhere(f: ReadingFilterNormalized): {
  where: WhereOptions;
  includeSensorWhere: any;
} {
  const where: WhereOptions = {};
  if (f.from && f.to) {
    where.timestamp = { [Op.gte]: f.from, [Op.lt]: f.to }; // [from, to)
  }
  const includeSensorWhere: any = {};
  if (f.sensorId !== undefined) includeSensorWhere.id = f.sensorId;
  if (f.locationId !== undefined) includeSensorWhere.locationId = f.locationId;

  return { where, includeSensorWhere };
}

export const ReadingService = {
  /**
   * Crée une nouvelle lecture
   */
  create: async (sensorId: number, value: number, timestamp: Date) => {
    return Reading.create({ sensorId, value, timestamp });
  },

  /**
   * Récupère toutes les lectures avec associations
   */
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

  /**
   * Lecture par ID
   */
  findById: async (id: number) => {
    return Reading.findByPk(id, {
      include: [{
        model: Sensor,
        as: 'sensor',
        include: [{ model: Location, as: 'location' }]
      }]
    });
  },

  /**
   * Mise à jour par ID
   */
  update: async (
    id: number,
    data: Partial<Pick<Reading, 'sensorId' | 'value' | 'timestamp'>>
  ) => {
    const reading = await Reading.findByPk(id);
    return reading ? reading.update(data) : null;
  },

  /**
   * Suppression par ID
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
    if (idSensor && !SensorService.existsById(idSensor))
      throw new createHttpError.NotFound(`Sensor with ID ${idSensor} not found`);
    return true;
  },

  /**
   * Supprime toutes les lectures d'un capteur
   */
  deleteAllBySensorId: async (sensorId: number): Promise<number> => {
    return Reading.destroy({ where: { sensorId } });
  },

  /**
   * Lecture classique avec filtres et JSON
   */
  // --- JSON : applique les mêmes filtres que la version binaire ---
  async findJsonByFilter(
    f: ReadingFilterNormalized,
    limit = 5000
  ): Promise<JsonResult> {
    const { where, includeSensorWhere } = buildSequelizeWhere(f);

    const rows = await Reading.findAll({
      where: {
        ...where,
        ...(f.sensorId !== undefined ? { sensorId: f.sensorId } : {}),
      },
      include: [{
        model: Sensor,
        as: 'sensor',
        required: true,
        where: includeSensorWhere,
        attributes: ['id', 'locationId', 'typeId'],
      }],
      order: [['timestamp', 'ASC']],
      limit,
    });

    return rows.map(r => ({
      id: r.id,
      sensorId: r.sensorId,
      timestamp: r.timestamp.toISOString(),
      value: r.value,
      sensor: r.sensor ? {
        id: r.sensor.id,
        locationId: (r.sensor as any).locationId,
        typeId: (r.sensor as any).typeId,
      } : undefined,
    }));
  },

  /**
   * Version binaire — identique à la tienne mais prend un objet `f` commun
   * Format : uint32 ts, int16 temp*10, int16 humid*10 ; manquant = -32768
   * Règle : si sensorId absent -> renvoie types 2 et 3 pivotés.
   */
  async findBinaryByFilter(
    res: Response,
    f: ReadingFilterNormalized
  ): Promise<void> {
    const max = f.max ?? 2000;
    const bucketSec = f.bucketSec ?? 60;

    const where: string[] = [];
    const rep: any = {};

    if (f.locationId !== undefined) { where.push('s.location_id = :locationId'); rep.locationId = f.locationId; }
    if (f.sensorId !== undefined)   { where.push('s.id = :sensorId'); rep.sensorId = f.sensorId; }
    if (f.from !== undefined)       { where.push("r.timestamp >= :from"); rep.from = f.from.toISOString(); }
    if (f.to !== undefined)         { where.push("r.timestamp < :to");    rep.to = f.to.toISOString(); }

    const filterTypes = f.sensorId === undefined ? 'AND s.type_id IN (2,3)' : '';
    const WHERE = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // 1) Compte les buckets
    const [{ cnt }] = await sequelize.query(
      `
      WITH base AS (
        SELECT CAST(strftime('%s', r.timestamp) AS INT) AS ts
        FROM reading r
        JOIN sensor s ON s.id = r.sensor_id
        ${WHERE} ${filterTypes}
      )
      SELECT COUNT(DISTINCT ts / :bucketSec) AS cnt FROM base
      `,
      { replacements: { ...rep, bucketSec }, type: sequelize.QueryTypes.SELECT }
    ) as any[];

    const totalBuckets = Number(cnt) || 0;
    if (totalBuckets === 0) { res.setHeader('Content-Type', 'application/octet-stream'); res.end(); return; }

    const stride = Math.max(1, Math.ceil(totalBuckets / max));

    // 2) Pivot + échantillonnage
    const rows: any[] = await sequelize.query(
      `
      WITH base AS (
        SELECT
          (CAST(strftime('%s', r.timestamp) AS INT) / :bucketSec) AS bucket,
          s.type_id AS typeId,
          AVG(r.value) AS val
        FROM reading r
        JOIN sensor s ON s.id = r.sensor_id
        ${WHERE} ${filterTypes}
        GROUP BY bucket, typeId
      ),
      pivot AS (
        SELECT
          bucket * :bucketSec AS ts,
          ROUND(10 * MAX(CASE WHEN typeId = 2 THEN val END)) AS t10,
          ROUND(10 * MAX(CASE WHEN typeId = 3 THEN val END)) AS h10
        FROM base
        GROUP BY bucket
        ORDER BY bucket
      ),
      ranked AS (
        SELECT ts, t10, h10, ROW_NUMBER() OVER (ORDER BY ts) AS rn
        FROM pivot
      )
      SELECT ts, t10, h10
      FROM ranked
      WHERE ((rn - 1) % :stride) = 0
      ORDER BY ts
      `,
      { replacements: { ...rep, bucketSec, stride }, type: sequelize.QueryTypes.SELECT }
    );

    // 3) Stream binaire
    res.setHeader('Content-Type', 'application/octet-stream');
    if (!rows.length) { res.end(); return; }

    const CHUNK = 4096;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      const buf = Buffer.allocUnsafe(slice.length * 8);
      let off = 0;
      for (const r of slice) {
        const ts  = (Number(r.ts) >>> 0);
        const t10 = (r.t10 ?? -32768) | 0;
        const h10 = (r.h10 ?? -32768) | 0;
        buf.writeUInt32LE(ts, off); off += 4;
        buf.writeInt16LE(t10, off); off += 2;
        buf.writeInt16LE(h10, off); off += 2;
      }
      res.write(buf);
    }
    res.end();
  },
  /**
   * Supprime les lectures d'un capteur dans un intervalle [from, to)
   * Inclusif sur 'from', exclusif sur 'to' pour éviter les collisions de bord.
   */
  deleteBySensorIdBetween: async (
    sensorId: number,
    range: { from: Date; to: Date }
  ): Promise<number> => {
    return Reading.destroy({
      where: {
        sensorId,
        timestamp: {
          [Op.gte]: range.from,
          [Op.lt]: range.to, // exclusif sur la borne haute
        },
      },
    });
  },
findLastBySensorId: async (
  sensorId: number,
  sensorTypeId: number
) => {
  return Reading.findOne({
    where: {
      sensorId,
    },
    include: [
      {
        model: Sensor,
        as: 'sensor',
        include: [
          {
            model: SensorType,
            as: 'type',
            where: {
              id: sensorTypeId, // <- on filtre ici
            },
            attributes: [],
          },
        ],
        attributes: [],
      },
    ],
    order: [['timestamp', 'DESC']],
    attributes: ['id', 'value'],
  });
  },
};

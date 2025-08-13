import Joi, { ValidationError } from 'joi';
import { Request, Response, NextFunction } from 'express';

// ----- Types -----
interface ParamsSchema { id: number }
interface BodySchema {
  sensorId: number;
  value: number;
  // on accepte string ISO ou unix seconds (number) puis on normalise
  timestamp: string | number;
}

// ISO-8601 avec fuseau obligatoire : 'Z' ou ±HH:MM
export const ISO_ZONED_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+\-]\d{2}:\d{2})$/;

// ----- Schemas -----
const idSchema = Joi.object<ParamsSchema>({
  id: Joi.number().integer().positive().required(),
});

const bodySchema = Joi.object<BodySchema>({
  sensorId: Joi.number().integer().positive().required(),
  value: Joi.number().precision(2).required(),
  // ISO zonée OU unix seconds
  timestamp: Joi.alternatives().try(
    Joi.string().pattern(ISO_ZONED_REGEX).messages({
      'string.pattern.base':
        "timestamp doit être ISO-8601 avec fuseau (ex: 2025-08-13T08:00:00+02:00 ou 2025-08-13T06:00:00Z)",
    }),
    Joi.number().integer().min(0)
  ).required(),
}).options({ convert: true });

const queryFilterSchema = Joi.object({
  locationId: Joi.number().integer().positive(),
  sensorId:   Joi.number().integer().positive(),
  from: Joi.alternatives().try(
    Joi.number().integer().min(0),
    Joi.string().pattern(ISO_ZONED_REGEX)
  ),
  to: Joi.alternatives().try(
    Joi.number().integer().min(0),
    Joi.string().pattern(ISO_ZONED_REGEX)
  ),
  max: Joi.number().integer().min(1).max(200000).default(2000),
  bucketSec: Joi.number().integer().min(1).max(86400).default(60),
})
  .with('from', 'to')
  .with('to', 'from')
  .prefs({ convert: true });

// ----- Helpers de normalisation -----
function toDate(x: string | number | undefined): Date | undefined {
  if (x === undefined) return undefined;
  const d = typeof x === 'number' ? new Date(x * 1000) : new Date(x);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

// ----- Middlewares -----
export async function validateReadingParams(
  req: Request<ParamsSchema>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await idSchema.validateAsync(req.params, { abortEarly: false });
    next();
  } catch (err: unknown) {
    if (err instanceof ValidationError) {
      const details = err.details.map(d => ({ message: d.message, path: d.path }));
      res.status(400).json({ message: 'Invalid parameters', details });
    } else {
      next(err);
    }
  }
}

/**
 * Valide le body (JSON ou x-www-form-urlencoded) et normalise :
 * - sensorId, value -> number
 * - timestamp -> Date (UTC)
 *   - si string ISO avec fuseau : OK
 *   - si unix seconds (number) : converti en Date
 * Met la version propre dans req.validatedBody
 */
export async function validateReadingBody(
  req: Request<{}, any, BodySchema>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const v = await bodySchema.validateAsync(req.body, { abortEarly: false });

    const timestamp = toDate(v.timestamp);
    if (!timestamp) {
      return res.status(400).json({
        message: 'Validation error',
        details: [{ message: 'timestamp invalide', path: ['timestamp'] }],
      });
    }

    (req as any).validatedBody = {
      sensorId: Number(v.sensorId),
      value: Number(v.value),
      timestamp, // Date normalisée
    };

    next();
  } catch (err: unknown) {
    if (err instanceof ValidationError) {
      const details = err.details.map(d => ({ message: d.message, path: d.path }));
      res.status(400).json({ message: 'Validation error', details });
    } else {
      next(err);
    }
  }
}

/**
 * Valide la query pour /readings/filter(.bin) et normalise :
 * - from/to -> Date (UTC) si fournis
 * - numbers -> number
 * Met la version propre dans req.validatedFilter
 */
export async function validateReadingFilterQuery(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const q = await queryFilterSchema.validateAsync(req.query, { abortEarly: false });

    const from = toDate(q.from as any);
    const to   = toDate(q.to as any);

    if ((from && !to) || (!from && to)) {
      return res.status(400).json({
        message: 'Invalid query',
        details: [{ message: "from et to doivent être fournis ensemble", path: ['from','to'] }],
      });
    }
    if (from && to && from >= to) {
      return res.status(400).json({
        message: 'Invalid query',
        details: [{ message: "'from' doit être < 'to'", path: ['from','to'] }],
      });
    }

    (req as any).validatedFilter = {
      locationId: q.locationId !== undefined ? Number(q.locationId) : undefined,
      sensorId:   q.sensorId   !== undefined ? Number(q.sensorId)   : undefined,
      from, to,
      max: q.max,
      bucketSec: q.bucketSec,
    };

    next();
  } catch (err: unknown) {
    if (err instanceof ValidationError) {
      const details = err.details.map(d => ({ message: d.message, path: d.path }));
      res.status(400).json({ message: 'Invalid query', details });
    } else {
      next(err);
    }
  }
}

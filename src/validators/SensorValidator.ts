import Joi, { ValidationError } from 'joi';
import { Request, Response, NextFunction } from 'express';
import { ISO_ZONED_REGEX } from '@src/utils/dateUtils';

interface ParamsSchema { id: number }
interface BodySchema {
  name: string;
  typeId: number;
  locationId: number;
  serialNumber?: string;
}

const idSchema = Joi.object<ParamsSchema>({
  id: Joi.number().integer().positive().required(),
});
const bodySchema = Joi.object<BodySchema>({
  name: Joi.string().trim().min(1).required(),
  typeId: Joi.number().integer().positive().required(),
  locationId: Joi.number().integer().positive().required(),
  serialNumber: Joi.string().optional().allow(null, ''),
});

export async function validateSensorParams(
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

export async function validateSensorBody(
  req: Request<{}, any, BodySchema>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await bodySchema.validateAsync(req.body, { abortEarly: false });
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

const deleteReadingsQuerySchema = Joi.object({
  from: Joi.string().pattern(ISO_ZONED_REGEX),
  to:   Joi.string().pattern(ISO_ZONED_REGEX),
})
  // si l’un est présent, l’autre est requis ; autorise aussi "aucun des deux"
  .and('from', 'to')
  // contrainte from < to lorsqu’ils sont présents
  .custom((value, helpers) => {
    const { from, to } = value;
    if (from && to) {
      const dFrom = new Date(from);
      const dTo   = new Date(to);
      if (Number.isNaN(dFrom.getTime()) || Number.isNaN(dTo.getTime())) {
        return helpers.error('any.invalid', { message: 'Dates invalides' });
      }
      if (dFrom >= dTo) {
        return helpers.error('any.invalid', { message: "'from' doit être < 'to'" });
      }
    }
    return value;
  });

export async function validateDeleteReadingsQuery(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await deleteReadingsQuerySchema.validateAsync(req.query, { abortEarly: false });
    next();
  } catch (err) {
    if (err instanceof ValidationError) {
      const details = err.details.map(d => ({ message: d.message, path: d.path }));
      res.status(400).json({ message: 'Invalid query', details });
    } else {
      next(err);
    }
  }
}
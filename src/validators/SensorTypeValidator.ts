import Joi, { ValidationError } from 'joi';
import { Request, Response, NextFunction } from 'express';

// Interfaces pour typing
interface ParamsSchema { id: number }
interface BodySchema { name: string; unit?: string }

const idSchema = Joi.object<ParamsSchema>({
  id: Joi.number().integer().positive().required(),
});
const bodySchema = Joi.object<BodySchema>({
  name: Joi.string().trim().min(1).required(),
  unit: Joi.string().allow(null, '').optional(),
});

export async function validateSensorTypeParams(
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

export async function validateSensorTypeBody(
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
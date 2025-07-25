/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-empty-object-type */
import Joi, { ValidationError } from 'joi';
import { Request, Response, NextFunction } from 'express';

// Interfaces pour typer req.params et req.body
interface ParamsSchema {
  id: number;
}
interface BodySchema {
  name: string;
}

// Schéma Joi avec typage générique
const idParamSchema = Joi.object<ParamsSchema>({
  id: Joi.number().integer().positive().required(),
});
const locationBodySchema = Joi.object<BodySchema>({
  name: Joi.string().trim().min(1).required(),
});

/**
 * Middleware async pour valider req.params selon ParamsSchema.
 */
export async function validateLocationParams(
  req: Request<ParamsSchema>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await idParamSchema.validateAsync(req.params, { abortEarly: false });
    next();
  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      const validationError = error as ValidationError;
      const details = validationError.details.map(detail => ({
        message: detail.message,
        path: detail.path as (string | number)[],
      }));
      res.status(400).json({ message: 'Invalid parameters', details });
    } else {
      next(error);
    }
  }
}

/**
 * Middleware async pour valider req.body selon BodySchema.
 */
export async function validateLocationBody(
  req: Request<{}, any, BodySchema>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await locationBodySchema.validateAsync(req.body, { abortEarly: false });
    next();
  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      const validationError = error as ValidationError;
      const details = validationError.details.map(detail => ({
        message: detail.message,
        path: detail.path as (string | number)[],
      }));
      res.status(400).json({ message: 'Validation error', details });
    } else {
      next(error);
    }
  }
}
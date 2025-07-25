import { Router, Request, Response } from 'express';
import {
  validateLocationParams,
  validateLocationBody
} from '@src/validators/LocationValidator';
import { LocationService } from '@src/services/LocationService';

// Types pour req.params et req.body
interface LocationParams { id: string; }
interface LocationBody { name: string; }

const router = Router();

// GET /locations
router.get('/', async (_req: Request, res: Response) => {
  const locations = await LocationService.findAll();
  res.json(locations);
});

// GET /locations/:id
router.get(
  '/:id',
  validateLocationParams,
  async (req: Request<LocationParams>, res: Response) => {
    const id = Number(req.params.id);
    const location = await LocationService.findById(id);
    if (location) {
      res.json(location);
    } else {
      res.status(404).json({ message: 'Location not found' });
    }
  }
);

// POST /locations
router.post(
  '/',
  validateLocationBody,
  async (req: Request<{}, {}, LocationBody>, res: Response) => {
    try {
      const newLocation = await LocationService.create(req.body.name);
      res.status(201).json(newLocation);
    } catch (error: any) {
      res.status(400).json({ message: error.message ?? 'Error creating location' });
    }
  }
);

// PUT /locations/:id
router.put(
  '/:id',
  validateLocationParams,
  validateLocationBody,
  async (req: Request<LocationParams, {}, LocationBody>, res: Response) => {
    const id = Number(req.params.id);
    const updated = await LocationService.update(id, { name: req.body.name });
    if (updated) {
      res.json(updated);
    } else {
      res.status(404).json({ message: 'Location not found' });
    }
  }
);

// DELETE /locations/:id
router.delete(
  '/:id',
  validateLocationParams,
  async (req: Request<LocationParams>, res: Response) => {
    const id = Number(req.params.id);
    const deletedCount = await LocationService.delete(id);
    if (deletedCount) {
      res.status(204).send();
    } else {
      res.status(404).json({ message: 'Location not found' });
    }
  }
);

export default router;
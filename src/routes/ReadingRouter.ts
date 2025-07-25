import { Router, Request, Response } from 'express';
import {
  validateReadingParams,
  validateReadingBody,
} from '../validators/ReadingValidator';
import { ReadingService } from '../services/ReadingService';

interface ReadingParams { id: string; }
interface ReadingBody {
  sensorId: number;
  value: number;
  timestamp?: string;
}

const router = Router();
router.get(
  '/filter',
  async (req: Request, res: Response) => {
    const { locationId, sensorId } = req.query;

    const parsedLocationId = locationId ? Number(locationId) : undefined;
    const parsedSensorId = sensorId ? Number(sensorId) : undefined;

    const readings = await ReadingService.findByLocationOrSensor(
      parsedLocationId,
      parsedSensorId
    );

    res.json(readings);
  }
);

// GET /readings
router.get('/', async (_req, res) => {
  const list = await ReadingService.findAll();
  res.json(list);
});

// GET /readings/:id
router.get(
  '/:id',
  validateReadingParams,
  async (req: Request<ReadingParams>, res: Response) => {
    const id = Number(req.params.id);
    const reading = await ReadingService.findById(id);
    if (reading) {
      res.json(reading);
    } else {
      res.status(404).json({ message: 'Reading not found' });
    }
  }
);

// POST /readings
router.post(
  '/',
  validateReadingBody,
  async (req: Request<{}, {}, ReadingBody>, res: Response) => {
    // Vérifier que le corps de la requête est présent
    if (!req.body) {
      return res.status(400).json({ message: 'Request body is missing' });
    }
    // Extraction sécurisée
    const { sensorId, value, timestamp } = req.body || {} as Partial<ReadingBody>;
    // Vérifier les champs requis
    if (typeof sensorId !== 'number' || typeof value !== 'number') {
      return res.status(400).json({ message: 'sensorId and value are required and must be numbers' });
    }
    const reading = await ReadingService.create(
      sensorId,
      value,
      timestamp ? new Date(timestamp) : undefined
    );
    res.status(201).json(reading);
  }
);

// PUT /readings/:id
router.put(
  '/:id',
  validateReadingParams,
  validateReadingBody,
  async (req: Request<ReadingParams, {}, ReadingBody>, res: Response) => {
    // Vérifier que le corps de la requête est présent
    if (!req.body) {
      return res.status(400).json({ message: 'Request body is missing' });
    }
    const id = Number(req.params.id);
    const { sensorId, value, timestamp } = req.body;
    if (typeof sensorId !== 'number' || typeof value !== 'number') {
      return res.status(400).json({ message: 'sensorId and value are required and must be numbers' });
    }
    const updated = await ReadingService.update(
      id,
      {
        sensorId,
        value,
        timestamp: timestamp ? new Date(timestamp) : undefined,
      }
    );
    if (updated) {
      res.json(updated);
    } else {
      res.status(404).json({ message: 'Reading not found' });
    }
  }
);

// DELETE /readings/:id
router.delete(
  '/:id',
  validateReadingParams,
  async (req: Request<ReadingParams>, res: Response) => {
    const id = Number(req.params.id);
    const count = await ReadingService.delete(id);
    if (count) {
      res.status(204).send();
    } else {
      res.status(404).json({ message: 'Reading not found' });
    }
  }
);



export default router;

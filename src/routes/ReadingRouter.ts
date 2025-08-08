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

// ancien JSON (à garder si tu veux)
router.get('/filter', async (req, res) => {
  const { locationId, sensorId } = req.query;
  const loc = locationId ? Number(locationId) : undefined;
  const sen = sensorId ? Number(sensorId) : undefined;

  const readings = await ReadingService.findByLocationOrSensor(loc, sen);
  res.json(readings);
});

// NOUVEL ENDPOINT LÉGER
// GET /filter.bin?locationId=1&sensorId=2&from=1719800000&to=1719886400&max=2000
router.get('/filter.bin', async (req, res) => {
  const loc = req.query.locationId ? Number(req.query.locationId) : undefined;
  const sen = req.query.sensorId ? Number(req.query.sensorId) : undefined;
  const from = req.query.from ? Number(req.query.from) : undefined;
  const to = req.query.to ? Number(req.query.to) : undefined;
  const max = req.query.max ? Number(req.query.max) : 2000;

  await ReadingService.findByLocationOrSensorBinary(res, loc, sen, from, to, max);
});

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

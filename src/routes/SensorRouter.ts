import { Router, Request, Response } from 'express';
import {
  validateSensorParams,
  validateSensorBody,
} from '@src/validators/SensorValidator';
import { SensorService } from '../services/SensorService';
import { ReadingService } from '@src/services/ReadingService';

interface SensorParams { id: string }
interface SensorBody {
  name: string;
  typeId: number;
  locationId: number;
  serialNumber?: string;
}

const router = Router();

router.get('/', async (_req, res) => {
  const list = await SensorService.findAll();
  res.json(list);
});

router.get(
  '/:id',
  validateSensorParams,
  async (req: Request<SensorParams>, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: 'ID invalide' });
    }
    const sensor = await SensorService.findById(id);
    if (sensor) res.json(sensor);
    else res.status(404).json({ message: 'Sensor not found' });
  }
);

router.post(
  '/',
  validateSensorBody,
  async (req: Request<{}, {}, SensorBody>, res) => {
    const { name, typeId, locationId, serialNumber } = req.body;
    const sensor = await SensorService.create(name, typeId, locationId, serialNumber);
    res.status(201).json(sensor);
  }
);

router.put(
  '/:id',
  validateSensorParams,
  validateSensorBody,
  async (req: Request<SensorParams, {}, SensorBody>, res) => {
    const id = Number(req.params.id);
    const updated = await SensorService.update(id, req.body);
    if (updated) res.json(updated);
    else res.status(404).json({ message: 'Sensor not found' });
  }
);

router.delete(
  '/:id',
  validateSensorParams,
  async (req: Request<SensorParams>, res) => {
    const id = Number(req.params.id);
    const count = await SensorService.delete(id);
    if (count) res.status(204).send();
    else res.status(404).json({ message: 'Sensor not found' });
  }
);


router.delete(
  '/:id/readings',
  validateSensorParams, // si tu veux valider sensorId
  async (req: Request<{ id: string }>, res: Response, next) => {
      const sensorId = Number(req.params.id);
      // Optionnel : vérifier que le sensor existe avant
      await SensorService.existsByIdOrThrow(sensorId);
      const row = await ReadingService.deleteAllBySensorId(sensorId);
      res.status(204).send(row + " readings delete");
  }
);

export default router;

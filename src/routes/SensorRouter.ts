import { Router, Request, Response,NextFunction  } from 'express';
import {
  validateSensorParams,
  validateSensorBody,
  validateDeleteReadingsQuery,
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
  validateSensorParams,
  validateDeleteReadingsQuery, // <— Joi pour from/to
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const sensorId = Number(req.params.id);
      await SensorService.existsByIdOrThrow(sensorId);

      const { from, to } = req.query as { from?: string; to?: string };

      // Aucun paramètre -> tout supprimer
      if (!from && !to) {
        await ReadingService.deleteAllBySensorId(sensorId);
        return res.status(204).send(); // 204 sans body
      }

      // Les deux présents (garanti par Joi) -> intervalle [from, to)
      const fromDate = new Date(from!);
      const toDate = new Date(to!);
      await ReadingService.deleteBySensorIdBetween(sensorId, { from: fromDate, to: toDate });
      return res.status(204).send();
    } catch (e) {
      next(e);
    }
  }
);

export default router;

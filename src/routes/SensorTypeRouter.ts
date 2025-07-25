import { Router, Request, Response } from 'express';
import {
  validateSensorTypeParams,
  validateSensorTypeBody,
} from '../validators/sensorTypeValidator';
import { SensorTypeService } from '../services/sensorTypeService';

interface SensorTypeParams { id: string }
interface SensorTypeBody { name: string; unit?: string }

const router = Router();

router.get('/', async (_req, res) => {
  const list = await SensorTypeService.findAll();
  res.json(list);
});

router.get(
  '/:id',
  validateSensorTypeParams,
  async (req: Request<SensorTypeParams>, res) => {
    const id = Number(req.params.id);
    const st = await SensorTypeService.findById(id);
    if (st) res.json(st);
    else res.status(404).json({ message: 'SensorType not found' });
  }
);

router.post(
  '/',
  validateSensorTypeBody,
  async (req: Request<{}, {}, SensorTypeBody>, res) => {
    const { name, unit } = req.body;
    const st = await SensorTypeService.create(name, unit);
    res.status(201).json(st);
  }
);

router.put(
  '/:id',
  validateSensorTypeParams,
  validateSensorTypeBody,
  async (req: Request<SensorTypeParams, {}, SensorTypeBody>, res) => {
    const id = Number(req.params.id);
    const updated = await SensorTypeService.update(id, req.body);
    if (updated) res.json(updated);
    else res.status(404).json({ message: 'SensorType not found' });
  }
);

router.delete(
  '/:id',
  validateSensorTypeParams,
  async (req: Request<SensorTypeParams>, res) => {
    const id = Number(req.params.id);
    const count = await SensorTypeService.delete(id);
    if (count) res.status(204).send();
    else res.status(404).json({ message: 'SensorType not found' });
  }
);

export default router;
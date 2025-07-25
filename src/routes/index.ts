import { Router } from 'express';

import Paths from '@src/common/constants/Paths';
import LocationRouter from '@src/routes/LocationRouter';
import SensorTypeRouter from '@src/routes/SensorTypeRouter';
import SensorRouter from '@src/routes/SensorRouter';
import ReadingRouter from '@src/routes/ReadingRouter';

/******************************************************************************
                                Setup
******************************************************************************/

const apiRouter = Router();


// Add LocationRouter
apiRouter.use(Paths.Locations.Base, LocationRouter);
apiRouter.use(Paths.SensorTypes.Base, SensorTypeRouter);
apiRouter.use(Paths.Sensors.Base, SensorRouter);
apiRouter.use(Paths.Readings.Base, ReadingRouter);


/******************************************************************************
                                Export default
******************************************************************************/

export default apiRouter;

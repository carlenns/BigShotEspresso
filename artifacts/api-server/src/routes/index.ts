import { Router, type IRouter } from "express";
import healthRouter from "./health";
import shotsRouter from "./shots";
import dashboardRouter from "./dashboard";
import insightsRouter from "./insights";
import settingsRouter from "./settings";
import beansRouter from "./beans";
import bagsRouter from "./bags";
import equipmentRouter from "./equipment";

const router: IRouter = Router();

router.use(healthRouter);
router.use(shotsRouter);
router.use(dashboardRouter);
router.use(insightsRouter);
router.use(settingsRouter);
router.use(beansRouter);
router.use(bagsRouter);
router.use(equipmentRouter);

export default router;

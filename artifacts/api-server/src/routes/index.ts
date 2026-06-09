import { Router, type IRouter } from "express";
import healthRouter from "./health";
import shotsRouter from "./shots";
import dashboardRouter from "./dashboard";
import insightsRouter from "./insights";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(shotsRouter);
router.use(dashboardRouter);
router.use(insightsRouter);
router.use(settingsRouter);

export default router;

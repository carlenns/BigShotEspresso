import { Router, type IRouter } from "express";
import healthRouter from "./health";
import shotsRouter from "./shots";
import dashboardRouter from "./dashboard";
import insightsRouter from "./insights";

const router: IRouter = Router();

router.use(healthRouter);
router.use(shotsRouter);
router.use(dashboardRouter);
router.use(insightsRouter);

export default router;

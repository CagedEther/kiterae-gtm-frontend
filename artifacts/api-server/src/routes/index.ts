import { Router, type IRouter } from "express";
import healthRouter from "./health";
import blocksTokenRouter from "./blocksToken";

const router: IRouter = Router();

router.use(healthRouter);
router.use(blocksTokenRouter);

export default router;

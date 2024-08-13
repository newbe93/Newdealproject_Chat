import express from "express";
import { getLastMessageAndUnreadCount } from "../controllers/message.controller.js";
import protectRoute from "../middleware/protectRoute.js";

const router = express.Router();

router.post("/", protectRoute, getLastMessageAndUnreadCount);



export default router;
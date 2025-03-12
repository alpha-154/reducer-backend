import express from "express";
import { getAllDailyTasks, createDailyTask, deleteDailyTask, markTaskAsComplete } from "../controllers/task-manager.controller.js";

const router = express.Router();

router.get("/get-all-daily-tasks/:userId", getAllDailyTasks);
router.post("/create-daily-task", createDailyTask);
router.delete("/delete-daily-task", deleteDailyTask);
router.patch("/complete-daily-task", markTaskAsComplete);

export default router;

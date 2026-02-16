import { Router } from "express";
import {
  createTaskController,
  deleteTaskController,
  getAllTasksController,
  getTaskByIdController,
  startTaskTimerController,
  stopAllRunningTaskTimersController,
  stopTaskTimerController,
  updateTaskController,
} from "../controllers/task.controller";

const taskRoutes = Router();

taskRoutes.post(
  "/project/:projectId/workspace/:workspaceId/create",
  createTaskController
);

taskRoutes.delete("/:id/workspace/:workspaceId/delete", deleteTaskController);

taskRoutes.put(
  "/:id/project/:projectId/workspace/:workspaceId/update",
  updateTaskController
);

taskRoutes.get("/workspace/:workspaceId/all", getAllTasksController);

taskRoutes.get(
  "/:id/project/:projectId/workspace/:workspaceId",
  getTaskByIdController
);

taskRoutes.post("/:id/timer/start", startTaskTimerController);
taskRoutes.post("/:id/timer/stop", stopTaskTimerController);
taskRoutes.post("/workspace/:workspaceId/timer/stop-all", stopAllRunningTaskTimersController);

export default taskRoutes;

import { Router } from "express";
import multer from "multer";
import {
  changeWorkspaceMemberRoleController,
  createWorkspaceController,
  createWorkspaceFolderController,
  deleteWorkspaceByIdController,
  deleteWorkspaceItemController,
  downloadWorkspaceFileController,
  getAllWorkspacesUserIsMemberController,
  getWorkspaceAnalyticsController,
  getWorkspaceByIdController,
  getWorkspaceFileActivityController,
  getWorkspaceMembersController,
  getWorkspaceProgressEmployeeController,
  getWorkspaceProgressSummaryController,
  listWorkspaceFilesController,
  uploadWorkspaceFilesController,
  updateWorkspaceByIdController,
} from "../controllers/workspace.controller";

const workspaceRoutes = Router();
const MAX_UPLOAD_FILE_SIZE_BYTES = 200 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_FILE_SIZE_BYTES,
    files: 100,
  },
});

// To create a new workspace
workspaceRoutes.post("/create/new", createWorkspaceController);
//To update the name and the description of the workspace
workspaceRoutes.put("/update/:id", updateWorkspaceByIdController);

//To change the role of a member in a particular workspace
workspaceRoutes.put(
  "/change/member/role/:id",
  changeWorkspaceMemberRoleController
);

//To delete the workspace 
workspaceRoutes.delete("/delete/:id", deleteWorkspaceByIdController);

//To get all the workspace that the user has created
workspaceRoutes.get("/all", getAllWorkspacesUserIsMemberController);

// To get all the members in a particular workspace, id the id of the workspace
workspaceRoutes.get("/members/:id", getWorkspaceMembersController);

//To get the status of the completed task of a particular workspace
workspaceRoutes.get("/analytics/:id", getWorkspaceAnalyticsController);

// Progress analytics (admin only)
workspaceRoutes.get(
  "/progress/:id/summary",
  getWorkspaceProgressSummaryController
);
workspaceRoutes.get(
  "/progress/:id/employees/:userId",
  getWorkspaceProgressEmployeeController
);

workspaceRoutes.get("/:id/files", listWorkspaceFilesController);
workspaceRoutes.get("/:id/files/download", downloadWorkspaceFileController);
workspaceRoutes.post(
  "/:id/files/upload",
  upload.array("files"),
  uploadWorkspaceFilesController
);
workspaceRoutes.post("/:id/files/folder", createWorkspaceFolderController);
workspaceRoutes.delete("/:id/files", deleteWorkspaceItemController);
workspaceRoutes.get("/:id/file-activity", getWorkspaceFileActivityController);

workspaceRoutes.get("/:id", getWorkspaceByIdController);

export default workspaceRoutes;

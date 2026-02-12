import { Request, Response } from "express";

import { asyncHandler } from "../middlewares/asyncHandler.middleware";
import {
  changeRoleSchema,
  createWorkspaceSchema,
  userIdSchema,
  workspaceIdSchema,
} from "../validation/workspace.validation";
import { HTTPSTATUS } from "../config/http.config";
import {
  changeMemberRoleService,
  createWorkspaceService,
  deleteWorkspaceService,
  getAllWorkspacesUserIsMemberService,
  getWorkspaceAnalyticsService,
  getWorkspaceByIdService,
  getWorkspaceMembersService,
  getWorkspaceProgressEmployeeService,
  getWorkspaceProgressSummaryService,
  updateWorkspaceByIdService,
} from "../services/workspace.service";
import {
  createWorkspaceFolderService,
  deleteWorkspaceItemService,
  getWorkspaceFileDownloadService,
  listWorkspaceFileActivityService,
  listWorkspaceFilesService,
  uploadWorkspaceFilesService,
} from "../services/file-library.service";
import { getMemberRoleInWorkspace } from "../services/member.service";
import { Permissions } from "../enums/role.enum";
import { roleGuard } from "../utils/roleGuard";
import { updateWorkspaceSchema } from "../validation/workspace.validation";
import {
  createFolderSchema,
  fileActivityQuerySchema,
  filePathQuerySchema,
} from "../validation/file-library.validation";
import { BadRequestException } from "../utils/appError";

export const createWorkspaceController = asyncHandler(
  async (req: Request, res: Response) => {
    const body = createWorkspaceSchema.parse(req.body);

    const userId = req.user?._id;
    const { workspace } = await createWorkspaceService(userId, body);

    return res.status(HTTPSTATUS.CREATED).json({
      message: "Workspace created successfully",
      workspace,
    });
  }
);

// Controller: Get all workspaces the user is part of

export const getAllWorkspacesUserIsMemberController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;

    const { workspaces } = await getAllWorkspacesUserIsMemberService(userId);

    return res.status(HTTPSTATUS.OK).json({
      message: "User workspaces fetched successfully",
      workspaces,
    });
  }
);

export const getWorkspaceByIdController = asyncHandler(
  async (req: Request, res: Response) => {
    const workspaceId = workspaceIdSchema.parse(req.params.id);
    const userId = req.user?._id;

    await getMemberRoleInWorkspace(userId, workspaceId);

    const { workspace } = await getWorkspaceByIdService(workspaceId);

    return res.status(HTTPSTATUS.OK).json({
      message: "Workspace fetched successfully",
      workspace,
    });
  }
);

//to get all the member in a workspace
export const getWorkspaceMembersController = asyncHandler(
  async (req: Request, res: Response) => {
    const workspaceId = workspaceIdSchema.parse(req.params.id);
    const userId = req.user?._id;

    //that particular user should be first the member of the workspace to get all the member
    // and that user should be owner
    const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
    roleGuard(role, [Permissions.VIEW_ONLY]);

    const { members, roles } = await getWorkspaceMembersService(workspaceId);

    return res.status(HTTPSTATUS.OK).json({
      message: "Workspace members retrieved successfully",
      members,
      roles,
    });
  }
);

export const getWorkspaceAnalyticsController = asyncHandler(
  async (req: Request, res: Response) => {
    const workspaceId = workspaceIdSchema.parse(req.params.id);
    const userId = req.user?._id;

    const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
    roleGuard(role, [Permissions.VIEW_ONLY]);

    const { analytics } = await getWorkspaceAnalyticsService(workspaceId);

    return res.status(HTTPSTATUS.OK).json({
      message: "Workspace analytics retrieved successfully",
      analytics,
    });
  }
);

export const getWorkspaceProgressSummaryController = asyncHandler(
  async (req: Request, res: Response) => {
    const workspaceId = workspaceIdSchema.parse(req.params.id);
    const userId = req.user?._id;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
    roleGuard(role, [Permissions.MANAGE_WORKSPACE_SETTINGS]);

    const progress = await getWorkspaceProgressSummaryService(
      workspaceId,
      from,
      to
    );

    return res.status(HTTPSTATUS.OK).json({
      message: "Workspace progress summary retrieved successfully",
      ...progress,
    });
  }
);

export const getWorkspaceProgressEmployeeController = asyncHandler(
  async (req: Request, res: Response) => {
    const workspaceId = workspaceIdSchema.parse(req.params.id);
    const employeeId = userIdSchema.parse(req.params.userId);
    const userId = req.user?._id;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
    roleGuard(role, [Permissions.MANAGE_WORKSPACE_SETTINGS]);

    const progress = await getWorkspaceProgressEmployeeService(
      workspaceId,
      employeeId,
      from,
      to
    );

    return res.status(HTTPSTATUS.OK).json({
      message: "Workspace employee progress retrieved successfully",
      ...progress,
    });
  }
);

export const listWorkspaceFilesController = asyncHandler(
  async (req: Request, res: Response) => {
    const workspaceId = workspaceIdSchema.parse(req.params.id);
    const userId = req.user?._id;
    const pathQuery = filePathQuerySchema.parse(req.query.path as string);

    await getMemberRoleInWorkspace(userId, workspaceId);

    const data = await listWorkspaceFilesService({
      workspaceId,
      userId,
      relPath: pathQuery,
    });

    return res.status(HTTPSTATUS.OK).json({
      message: "Workspace files listed successfully",
      ...data,
    });
  }
);

export const downloadWorkspaceFileController = asyncHandler(
  async (req: Request, res: Response) => {
    const workspaceId = workspaceIdSchema.parse(req.params.id);
    const userId = req.user?._id;
    const pathQuery = filePathQuerySchema.parse(req.query.path as string);

    if (!pathQuery) {
      throw new BadRequestException("File path is required");
    }

    await getMemberRoleInWorkspace(userId, workspaceId);

    const { fileName, size, stream } = await getWorkspaceFileDownloadService({
      workspaceId,
      userId,
      relPath: pathQuery,
    });

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(fileName)}"`
    );
    res.setHeader("Content-Length", size.toString());

    stream.pipe(res);
  }
);

export const uploadWorkspaceFilesController = asyncHandler(
  async (req: Request, res: Response) => {
    const workspaceId = workspaceIdSchema.parse(req.params.id);
    const userId = req.user?._id;
    const pathQuery = filePathQuerySchema.parse(req.query.path as string);

    await getMemberRoleInWorkspace(userId, workspaceId);

    const files = (req.files as Express.Multer.File[]) ?? [];

    const uploaded = await uploadWorkspaceFilesService({
      workspaceId,
      userId,
      relPath: pathQuery,
      files,
    });

    return res.status(HTTPSTATUS.OK).json({
      message: "Files uploaded successfully",
      files: uploaded,
    });
  }
);

export const createWorkspaceFolderController = asyncHandler(
  async (req: Request, res: Response) => {
    const workspaceId = workspaceIdSchema.parse(req.params.id);
    const userId = req.user?._id;
    const { path: relPath, name } = createFolderSchema.parse(req.body);

    await getMemberRoleInWorkspace(userId, workspaceId);

    const folder = await createWorkspaceFolderService({
      workspaceId,
      userId,
      relPath,
      name,
    });

    return res.status(HTTPSTATUS.CREATED).json({
      message: "Folder created successfully",
      folder,
    });
  }
);

export const deleteWorkspaceItemController = asyncHandler(
  async (req: Request, res: Response) => {
    const workspaceId = workspaceIdSchema.parse(req.params.id);
    const userId = req.user?._id;
    const pathQuery = filePathQuerySchema.parse(req.query.path as string);

    if (!pathQuery) {
      throw new BadRequestException("File or folder path is required");
    }

    await getMemberRoleInWorkspace(userId, workspaceId);

    const deleted = await deleteWorkspaceItemService({
      workspaceId,
      userId,
      relPath: pathQuery,
    });

    return res.status(HTTPSTATUS.OK).json({
      message: `${deleted.type === "folder" ? "Folder" : "File"} deleted successfully`,
      deleted,
    });
  }
);

export const getWorkspaceFileActivityController = asyncHandler(
  async (req: Request, res: Response) => {
    const workspaceId = workspaceIdSchema.parse(req.params.id);
    const userId = req.user?._id;
    const days = fileActivityQuerySchema.parse(req.query.days as string);

    const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
    roleGuard(role, [Permissions.MANAGE_WORKSPACE_SETTINGS]);

    const logs = await listWorkspaceFileActivityService({
      workspaceId,
      days,
    });

    return res.status(HTTPSTATUS.OK).json({
      message: "Workspace file activity retrieved successfully",
      logs,
    });
  }
);

export const changeWorkspaceMemberRoleController = asyncHandler(
  async (req: Request, res: Response) => {
    const workspaceId = workspaceIdSchema.parse(req.params.id);
    const { memberId, roleId } = changeRoleSchema.parse(req.body);

    const userId = req.user?._id;

    const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
    roleGuard(role, [Permissions.CHANGE_MEMBER_ROLE]); //This is being used to check whether the current user is an owner or not

    const { member } = await changeMemberRoleService(
      workspaceId,
      memberId,
      roleId
    );

    return res.status(HTTPSTATUS.OK).json({
      message: "Member Role changed successfully",
      member,
    });
  }
);

export const updateWorkspaceByIdController = asyncHandler(
  async (req: Request, res: Response) => {
    const workspaceId = workspaceIdSchema.parse(req.params.id);
    const { name, description } = updateWorkspaceSchema.parse(req.body);

    const userId = req.user?._id;

    const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
    roleGuard(role, [Permissions.EDIT_WORKSPACE]);

    const { workspace } = await updateWorkspaceByIdService(
      workspaceId,
      name,
      description
    );

    return res.status(HTTPSTATUS.OK).json({
      message: "Workspace updated successfully",
      workspace,
    });
  }
);

export const deleteWorkspaceByIdController = asyncHandler(
  async (req: Request, res: Response) => {
    const workspaceId = workspaceIdSchema.parse(req.params.id);

    const userId = req.user?._id;

    const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
    roleGuard(role, [Permissions.DELETE_WORKSPACE]);

    const { currentWorkspace } = await deleteWorkspaceService(
      workspaceId,
      userId
    );

    return res.status(HTTPSTATUS.OK).json({
      message: "Workspace deleted successfully",
      currentWorkspace,
    });
  }
);

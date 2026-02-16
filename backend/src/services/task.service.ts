import { getTaskTypeByCode } from "../config/task-types";
import { TaskPriorityEnum, TaskStatusEnum } from "../enums/task.enum";
import { Roles } from "../enums/role.enum";
import TaskWorkLogModel from "../models/task-work-log.model";
import MemberModel from "../models/member.model";
import ProjectModel from "../models/project.model";
import TaskModel from "../models/task.model";
import { HTTPSTATUS } from "../config/http.config";
import { getMemberRoleInWorkspace } from "./member.service";
import {
  BadRequestException,
  HttpException,
  NotFoundException,
  UnauthorizedException,
} from "../utils/appError";

export const createTaskService = async (
  workspaceId: string,
  projectId: string,
  userId: string,
  body: {
    taskTypeCode: string;
    description?: string;
    chapter?: string;
    pageRange?: string;
    priority: string;
    status: string;
    assignedTo?: string | null;
    dueDate?: string;
  }
) => {
  const {
    taskTypeCode,
    description,
    chapter,
    pageRange,
    priority,
    status,
    assignedTo,
    dueDate,
  } = body;

  const project = await ProjectModel.findById(projectId);

  if (!project || project.workspace.toString() !== workspaceId.toString()) {
    throw new NotFoundException(
      "Project not found or does not belong to this workspace"
    );
  }
  if (assignedTo) {
    const isAssignedUserMember = await MemberModel.exists({
      userId: assignedTo,
      workspaceId,
    });

    if (!isAssignedUserMember) {
      throw new Error("Assigned user is not a member of this workspace.");
    }
  }
  const taskType = getTaskTypeByCode(taskTypeCode);

  if (!taskType) {
    throw new BadRequestException("Invalid task type selected.");
  }

  const title = `${taskType.code} - ${taskType.name}`;
  const task = new TaskModel({
    title,
    taskTypeCode: taskType.code,
    taskTypeName: taskType.name,
    description,
    chapter,
    pageRange,
    priority: priority || TaskPriorityEnum.MEDIUM,
    status: status || TaskStatusEnum.TODO,
    assignedTo,
    createdBy: userId,
    workspace: workspaceId,
    project: projectId,
    dueDate,
  });

  await task.save();

  return { task };
};

export const updateTaskService = async (
  workspaceId: string,
  projectId: string,
  taskId: string,
  body: {
    taskTypeCode?: string;
    description?: string;
    chapter?: string;
    pageRange?: string;
    priority: string;
    status: string;
    assignedTo?: string | null;
    dueDate?: string;
  }
) => {
  const project = await ProjectModel.findById(projectId);

  if (!project || project.workspace.toString() !== workspaceId.toString()) {
    throw new NotFoundException(
      "Project not found or does not belong to this workspace"
    );
  }

  const task = await TaskModel.findById(taskId);

  if (!task || task.project.toString() !== projectId.toString()) {
    throw new NotFoundException(
      "Task not found or does not belong to this project"
    );
  }

  const { taskTypeCode, ...restBody } = body;
  const updatePayload: typeof restBody & {
    taskTypeCode?: string;
    taskTypeName?: string;
    title?: string;
  } = {
    ...restBody,
  };

  if (taskTypeCode) {
    const taskType = getTaskTypeByCode(taskTypeCode);

    if (!taskType) {
      throw new BadRequestException("Invalid task type selected.");
    }

    updatePayload.taskTypeCode = taskType.code;
    updatePayload.taskTypeName = taskType.name;
    updatePayload.title = `${taskType.code} - ${taskType.name}`;
  }

  const updatedTask = await TaskModel.findByIdAndUpdate(
    taskId,
    updatePayload,
    { new: true }
  );

  if (!updatedTask) {
    throw new BadRequestException("Failed to update task");
  }

  return { updatedTask };
};

export const updateTaskStatusService = async (
  workspaceId: string,
  projectId: string,
  taskId: string,
  status: string
) => {
  const project = await ProjectModel.findById(projectId);

  if (!project || project.workspace.toString() !== workspaceId.toString()) {
    throw new NotFoundException(
      "Project not found or does not belong to this workspace"
    );
  }

  const task = await TaskModel.findById(taskId);

  if (!task || task.project.toString() !== projectId.toString()) {
    throw new NotFoundException(
      "Task not found or does not belong to this project"
    );
  }

  const updatedTask = await TaskModel.findByIdAndUpdate(
    taskId,
    {
      status,
    },
    { new: true }
  );

  if (!updatedTask) {
    throw new BadRequestException("Failed to update task status");
  }

  return { updatedTask };
};

export const getAllTasksService = async (
  workspaceId: string,
  filters: {
    projectId?: string;
    taskTypeCode?: string;
    status?: string[];
    priority?: string[];
    assignedTo?: string[];
    keyword?: string;
    dueDate?: string;
  },
  pagination: {
    pageSize: number;
    pageNumber: number;
  }
) => {
  const query: Record<string, any> = {
    workspace: workspaceId,
  };

  if (filters.projectId) {
    query.project = filters.projectId;
  }

  if (filters.taskTypeCode) {
    query.taskTypeCode = filters.taskTypeCode;
  }

  if (filters.status && filters.status?.length > 0) {
    query.status = { $in: filters.status };
  }

  if (filters.priority && filters.priority?.length > 0) {
    query.priority = { $in: filters.priority };
  }

  if (filters.assignedTo && filters.assignedTo?.length > 0) {
    query.assignedTo = { $in: filters.assignedTo };
  }

  if (filters.keyword && filters.keyword !== undefined) {
    query.title = { $regex: filters.keyword, $options: "i" };
  }

  if (filters.dueDate) {
    query.dueDate = {
      $eq: new Date(filters.dueDate),
    };
  }

  //Pagination Setup
  const { pageSize, pageNumber } = pagination;
  const skip = (pageNumber - 1) * pageSize;

  const [tasks, totalCount] = await Promise.all([
    TaskModel.find(query)
      .skip(skip)
      .limit(pageSize)
      .sort({ createdAt: -1 })
      .populate("assignedTo", "_id name profilePicture -password")
      .populate("project", "_id emoji name"),
    TaskModel.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    tasks,
    pagination: {
      pageSize,
      pageNumber,
      totalCount,
      totalPages,
      skip,
    },
  };
};

export const getTaskByIdService = async (
  workspaceId: string,
  projectId: string,
  taskId: string
) => {
  const project = await ProjectModel.findById(projectId);

  if (!project || project.workspace.toString() !== workspaceId.toString()) {
    throw new NotFoundException(
      "Project not found or does not belong to this workspace"
    );
  }

  const task = await TaskModel.findOne({
    _id: taskId,
    workspace: workspaceId,
    project: projectId,
  }).populate("assignedTo", "_id name profilePicture -password");

  if (!task) {
    throw new NotFoundException("Task not found.");
  }

  return task;
};

export const deleteTaskService = async (
  workspaceId: string,
  taskId: string
) => {
  const task = await TaskModel.findOneAndDelete({
    _id: taskId,
    workspace: workspaceId,
  });

  if (!task) {
    throw new NotFoundException(
      "Task not found or does not belong to the specified workspace"
    );
  }

  return;
};

const ensureTaskTimerAccess = async (
  taskId: string,
  userId: string
) => {
  const task = await TaskModel.findById(taskId);

  if (!task) {
    throw new NotFoundException("Task not found.");
  }

  const { role } = await getMemberRoleInWorkspace(
    userId,
    task.workspace.toString()
  );

  const isPrivileged = role === Roles.OWNER || role === Roles.ADMIN;
  const isAssignee = task.assignedTo?.toString() === userId.toString();

  if (!isPrivileged && !isAssignee) {
    throw new UnauthorizedException(
      "You do not have permission to manage this task timer."
    );
  }

  return task;
};

export const startTaskTimerService = async (
  taskId: string,
  userId: string
) => {
  const task = await ensureTaskTimerAccess(taskId, userId);

  if (task.isRunning) {
    throw new HttpException("Task timer is already running.", HTTPSTATUS.CONFLICT);
  }

  const now = new Date();

  if (!task.firstStartedAt) {
    task.firstStartedAt = now;
  }

  task.activeStartAt = now;
  task.isRunning = true;

  await task.save();

  return { task };
};

export const stopTaskTimerService = async (
  taskId: string,
  userId: string,
  body: {
    pagesCompleted?: number;
    remarks?: string;
  }
) => {
  const task = await ensureTaskTimerAccess(taskId, userId);

  if (!task.isRunning || !task.activeStartAt) {
    throw new HttpException("Task timer is not running.", HTTPSTATUS.CONFLICT);
  }

  const now = new Date();
  const durationSeconds = Math.max(
    1,
    Math.floor((now.getTime() - task.activeStartAt.getTime()) / 1000)
  );
  const durationMinutes = Math.max(1, Math.floor(durationSeconds / 60));

  await TaskWorkLogModel.create({
    taskId: task._id,
    userId,
    startedAt: task.activeStartAt,
    stoppedAt: now,
    durationMinutes,
    pagesCompleted: body.pagesCompleted ?? null,
    remarks: body.remarks ?? null,
  });

  const currentSeconds =
    task.totalSecondsSpent ?? (task.totalMinutesSpent ?? 0) * 60;
  task.totalSecondsSpent = currentSeconds + durationSeconds;
  task.totalMinutesSpent = Math.floor(task.totalSecondsSpent / 60);
  task.lastStoppedAt = now;
  task.isRunning = false;
  task.activeStartAt = null;

  if (body.pagesCompleted !== undefined) {
    const currentPages = task.pagesCompleted ?? 0;
    task.pagesCompleted = currentPages + body.pagesCompleted;
  }

  if (body.remarks !== undefined) {
    task.remarks = body.remarks;
  }

  await task.save();

  return { task };
};

export const stopAllRunningTaskTimersService = async (
  workspaceId: string,
  userId: string
) => {
  const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
  const isPrivileged = role === Roles.OWNER || role === Roles.ADMIN;

  if (!isPrivileged) {
    throw new UnauthorizedException(
      "Only admins can stop all running task timers."
    );
  }

  const runningTasks = await TaskModel.find({
    workspace: workspaceId,
    isRunning: true,
    activeStartAt: { $ne: null },
  });

  if (runningTasks.length === 0) {
    return { stoppedCount: 0 };
  }

  const now = new Date();

  await Promise.all(
    runningTasks.map(async (task) => {
      if (!task.activeStartAt) return;

      const durationSeconds = Math.max(
        1,
        Math.floor((now.getTime() - task.activeStartAt.getTime()) / 1000)
      );
      const durationMinutes = Math.max(1, Math.floor(durationSeconds / 60));

      await TaskWorkLogModel.create({
        taskId: task._id,
        userId: task.assignedTo ?? task.createdBy ?? userId,
        startedAt: task.activeStartAt,
        stoppedAt: now,
        durationMinutes,
        pagesCompleted: null,
        remarks: null,
      });

      const currentSeconds =
        task.totalSecondsSpent ?? (task.totalMinutesSpent ?? 0) * 60;
      task.totalSecondsSpent = currentSeconds + durationSeconds;
      task.totalMinutesSpent = Math.floor(task.totalSecondsSpent / 60);
      task.lastStoppedAt = now;
      task.isRunning = false;
      task.activeStartAt = null;

      await task.save();
    })
  );

  return { stoppedCount: runningTasks.length };
};

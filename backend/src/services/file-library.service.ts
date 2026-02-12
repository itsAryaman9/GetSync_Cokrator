import fs from "fs/promises";
import { createReadStream } from "fs";
import path from "path";
import mongoose from "mongoose";
import { config } from "../config/app.config";
import FileAccessLogModel, {
  FileAccessAction,
} from "../models/file-access-log.model";
import { BadRequestException, NotFoundException } from "../utils/appError";
import { resolveWorkspacePath, sanitizeFileName } from "../utils/file-storage";

const ensureWorkspaceRoot = async (workspaceId: string) => {
  const workspaceRoot = path.join(config.FILE_STORAGE_ROOT, workspaceId);
  await fs.mkdir(workspaceRoot, { recursive: true });
  return workspaceRoot;
};

const logFileAccess = async ({
  workspaceId,
  userId,
  action,
  path: logPath,
  fileName,
  size,
}: {
  workspaceId: string;
  userId: string;
  action: FileAccessAction;
  path: string;
  fileName?: string;
  size?: number;
}) => {
  const workspaceObjectId = new mongoose.Types.ObjectId(workspaceId);
  const userObjectId = new mongoose.Types.ObjectId(userId);
  await FileAccessLogModel.create({
    workspaceId: workspaceObjectId,
    userId: userObjectId,
    action,
    path: logPath || ".",
    fileName,
    size,
  });
};

export const listWorkspaceFilesService = async ({
  workspaceId,
  userId,
  relPath,
}: {
  workspaceId: string;
  userId: string;
  relPath?: string;
}) => {
  const workspaceRoot = await ensureWorkspaceRoot(workspaceId);
  const { targetAbs } = resolveWorkspacePath(workspaceRoot, relPath ?? "");

  const stat = await fs.stat(targetAbs).catch(() => {
    throw new NotFoundException("Folder not found");
  });

  if (!stat.isDirectory()) {
    throw new BadRequestException("Path is not a folder");
  }

  const entries = await fs.readdir(targetAbs, { withFileTypes: true });

  const items = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(targetAbs, entry.name);
      const entryStat = await fs.stat(entryPath);
      if (entry.isDirectory()) {
        return {
          name: entry.name,
          type: "folder" as const,
          modifiedAt: entryStat.mtime.toISOString(),
        };
      }
      return {
        name: entry.name,
        type: "file" as const,
        size: entryStat.size,
        modifiedAt: entryStat.mtime.toISOString(),
      };
    })
  );

  await logFileAccess({
    workspaceId,
    userId,
    action: FileAccessAction.ENTER,
    path: relPath ?? "",
  });

  return {
    path: relPath ?? "",
    items,
  };
};

export const getWorkspaceFileDownloadService = async ({
  workspaceId,
  userId,
  relPath,
}: {
  workspaceId: string;
  userId: string;
  relPath: string;
}) => {
  const workspaceRoot = path.join(config.FILE_STORAGE_ROOT, workspaceId);
  const { targetAbs } = resolveWorkspacePath(workspaceRoot, relPath);

  const stat = await fs.stat(targetAbs).catch(() => {
    throw new NotFoundException("File not found");
  });
  if (!stat.isFile()) {
    throw new BadRequestException("Path is not a file");
  }

  await logFileAccess({
    workspaceId,
    userId,
    action: FileAccessAction.DOWNLOAD,
    path: path.dirname(relPath),
    fileName: path.basename(targetAbs),
    size: stat.size,
  });

  return {
    fileName: path.basename(targetAbs),
    size: stat.size,
    stream: createReadStream(targetAbs),
  };
};

export const uploadWorkspaceFilesService = async ({
  workspaceId,
  userId,
  relPath,
  files,
}: {
  workspaceId: string;
  userId: string;
  relPath?: string;
  files: Express.Multer.File[];
}) => {
  if (!files || files.length === 0) {
    throw new BadRequestException("No files uploaded");
  }

  const workspaceRoot = await ensureWorkspaceRoot(workspaceId);
  const { targetAbs } = resolveWorkspacePath(workspaceRoot, relPath ?? "");
  await fs.mkdir(targetAbs, { recursive: true });

  const savedFiles = await Promise.all(
    files.map(async (file) => {
      const safeName = sanitizeFileName(file.originalname);
      const destination = path.join(targetAbs, safeName);
      await fs.writeFile(destination, file.buffer);
      await logFileAccess({
        workspaceId,
        userId,
        action: FileAccessAction.UPLOAD,
        path: relPath ?? "",
        fileName: safeName,
        size: file.size,
      });
      return {
        name: safeName,
        size: file.size,
      };
    })
  );

  return savedFiles;
};

export const createWorkspaceFolderService = async ({
  workspaceId,
  userId,
  relPath,
  name,
}: {
  workspaceId: string;
  userId: string;
  relPath?: string;
  name: string;
}) => {
  const workspaceRoot = await ensureWorkspaceRoot(workspaceId);
  const { targetAbs } = resolveWorkspacePath(workspaceRoot, relPath ?? "");

  const safeName = sanitizeFileName(name);
  const folderPath = path.join(targetAbs, safeName);

  await fs.mkdir(folderPath, { recursive: false }).catch((error) => {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new BadRequestException("Folder already exists");
    }
    throw error;
  });

  await logFileAccess({
    workspaceId,
    userId,
    action: FileAccessAction.CREATE_FOLDER,
    path: relPath ?? "",
    fileName: safeName,
  });

  return { name: safeName };
};


export const deleteWorkspaceItemService = async ({
  workspaceId,
  userId,
  relPath,
}: {
  workspaceId: string;
  userId: string;
  relPath: string;
}) => {
  const workspaceRoot = await ensureWorkspaceRoot(workspaceId);
  const { targetAbs } = resolveWorkspacePath(workspaceRoot, relPath);

  const stat = await fs.stat(targetAbs).catch(() => {
    throw new NotFoundException("File or folder not found");
  });

  const itemName = path.basename(targetAbs);
  const parentPath = path.dirname(relPath) === "." ? "" : path.dirname(relPath);

  if (stat.isDirectory()) {
    await fs.rm(targetAbs, { recursive: true, force: false });
    await logFileAccess({
      workspaceId,
      userId,
      action: FileAccessAction.DELETE_FOLDER,
      path: parentPath,
      fileName: itemName,
    });
    return { type: "folder" as const, name: itemName };
  }

  if (stat.isFile()) {
    await fs.unlink(targetAbs);
    await logFileAccess({
      workspaceId,
      userId,
      action: FileAccessAction.DELETE_FILE,
      path: parentPath,
      fileName: itemName,
      size: stat.size,
    });
    return { type: "file" as const, name: itemName };
  }

  throw new BadRequestException("Unsupported item type");
};

export const listWorkspaceFileActivityService = async ({
  workspaceId,
  days,
}: {
  workspaceId: string;
  days: number;
}) => {
  const workspaceObjectId = new mongoose.Types.ObjectId(workspaceId);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const logs = await FileAccessLogModel.find({
    workspaceId: workspaceObjectId,
    createdAt: { $gte: cutoff },
  })
    .sort({ createdAt: -1 })
    .populate("userId", "name email")
    .lean();

  return logs.map((log) => ({
    _id: log._id.toString(),
    action: log.action,
    path: log.path,
    fileName: log.fileName,
    size: log.size,
    createdAt: log.createdAt,
    user: log.userId
      ? {
          _id: (log.userId as { _id: mongoose.Types.ObjectId })._id.toString(),
          name: (log.userId as { name?: string }).name ?? "Unknown",
          email: (log.userId as { email?: string }).email ?? "Unknown",
        }
      : null,
  }));
};

import mongoose, { Document, Model } from "mongoose";

export enum FileAccessAction {
  ENTER = "ENTER",
  DOWNLOAD = "DOWNLOAD",
  UPLOAD = "UPLOAD",
  CREATE_FOLDER = "CREATE_FOLDER",
  DELETE_FILE = "DELETE_FILE",
  DELETE_FOLDER = "DELETE_FOLDER",
}

export interface FileAccessLogDocument extends Document {
  workspaceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  action: FileAccessAction;
  path: string;
  fileName?: string;
  size?: number;
  createdAt: Date;
}

const fileAccessLogSchema = new mongoose.Schema<FileAccessLogDocument>(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      enum: Object.values(FileAccessAction),
      required: true,
    },
    path: { type: String, required: true },
    fileName: { type: String },
    size: { type: Number },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const FileAccessLogModel: Model<FileAccessLogDocument> =
  mongoose.models.FileAccessLog ||
  mongoose.model<FileAccessLogDocument>("FileAccessLog", fileAccessLogSchema);

export default FileAccessLogModel;

import { z } from "zod";
import { TaskPriorityEnum, TaskStatusEnum } from "../enums/task.enum";

export const titleSchema = z.string().trim().min(1).max(255);
export const taskTypeCodeSchema = z.string().trim().min(1, {
  message: "Task type is required",
});
export const descriptionSchema = z.string().trim().optional();
export const chapterSchema = z.string().trim().optional();
export const pageRangeSchema = z.string().trim().optional();

export const assignedToSchema = z.string().trim().min(1).nullable().optional();

export const prioritySchema = z.enum(
  Object.values(TaskPriorityEnum) as [string, ...string[]]
);

export const statusSchema = z.enum(
  Object.values(TaskStatusEnum) as [string, ...string[]]
);

export const dueDateSchema = z
  .string()
  .trim()
  .optional()
  .refine(
    (val) => {
      return !val || !isNaN(Date.parse(val));
    },
    {
      message: "Invalid date format. Please provide a valid date string.",
    }
  );

export const taskIdSchema = z.string().trim().min(1);

export const createTaskSchema = z.object({
  taskTypeCode: taskTypeCodeSchema,
  description: descriptionSchema,
  chapter: chapterSchema,
  pageRange: pageRangeSchema,
  priority: prioritySchema,
  status: statusSchema,
  assignedTo: assignedToSchema,
  dueDate: dueDateSchema,
});

export const updateTaskSchema = z.object({
  taskTypeCode: taskTypeCodeSchema.optional(),
  description: descriptionSchema,
  chapter: chapterSchema,
  pageRange: pageRangeSchema,
  priority: prioritySchema,
  status: statusSchema,
  assignedTo: assignedToSchema,
  dueDate: dueDateSchema,
});

export const updateTaskStatusSchema = z.object({
  status: statusSchema,
});

export const stopTaskTimerSchema = z.object({
  pagesCompleted: z.number().int().min(0).optional(),
  remarks: z.string().trim().optional(),
});

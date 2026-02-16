import {
  PermissionType,
  TaskPriorityEnumType,
  TaskStatusEnumType,
} from "@/constant";

export type loginType = { employeeCode: string; password: string };
export type LoginResponseType = {
  message: string;
  user: {
    _id: string;
    currentWorkspace: string;
  };
};

export type registerType = {
  name: string;
  email: string;
  password: string;
};

// USER TYPE
export type UserType = {
  _id: string;
  name: string;
  email: string;
  profilePicture: string | null;
  isActive: true;
  lastLogin: null;
  createdAt: Date;
  updatedAt: Date;
  currentWorkspace: {
    _id: string;
    name: string;
    owner: string;
    inviteCode: string;
  };
};

export type CurrentUserResponseType = {
  message: string;
  user: UserType;
};

//******** */ WORLSPACE TYPES ****************
// ******************************************
export type WorkspaceType = {
  _id: string;
  name: string;
  description?: string;
  owner: string;
  inviteCode: string;
};

export type CreateWorkspaceType = {
  name: string;
  description: string;
};

export type EditWorkspaceType = {
  workspaceId: string;
  data: {
    name: string;
    description: string;
  };
};

export type CreateWorkspaceResponseType = {
  message: string;
  workspace: WorkspaceType;
};

export type AllWorkspaceResponseType = {
  message: string;
  workspaces: WorkspaceType[];
};

export type WorkspaceWithMembersType = WorkspaceType & {
  members: {
    _id: string;
    userId: string;
    workspaceId: string;
    role: {
      _id: string;
      name: string;
      permissions: PermissionType[];
    };
    joinedAt: string;
    createdAt: string;
  }[];
};

export type WorkspaceByIdResponseType = {
  message: string;
  workspace: WorkspaceWithMembersType;
};

export type ChangeWorkspaceMemberRoleType = {
  workspaceId: string;
  data: {
    roleId: string;
    memberId: string;
  };
};

export type AllMembersInWorkspaceResponseType = {
  message: string;
  members: {
    _id: string;
    userId: {
      _id: string;
      name: string;
      email: string;
      profilePicture: string | null;
    };
    workspaceId: string;
    role: {
      _id: string;
      name: string;
    };
    joinedAt: string;
    createdAt: string;
  }[];
  roles: RoleType[];
};

export type AnalyticsResponseType = {
  message: string;
  analytics: {
    totalTasks: number;
    overdueTasks: number;
    completedTasks: number;
  };
};

export type ProgressSummaryResponseType = {
  message: string;
  dateRange: {
    from: string;
    to: string;
  };
  projectStats: {
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
  };
  clientStats: {
    totalClients: number;
    projectsByClient: {
      clientId: string;
      clientName: string;
      projectCount: number;
    }[];
  };
  taskStats: {
    totalTasks: number;
    doneTasks: number;
    pendingTasks: number;
    overdueTasks: number;
    tasksByStatus: {
      status: string;
      count: number;
    }[];
  };
  employeeStats: {
    userId: string;
    name: string;
    totalAssigned: number;
    done: number;
    pending: number;
    totalMinutes: number;
    totalHours: number;
    totalPages: number;
    lastActiveAt: string | null;
  }[];
};

export type ProgressSummaryPayloadType = {
  workspaceId: string;
  from?: string;
  to?: string;
};

export type ProgressEmployeeResponseType = {
  message: string;
  dateRange: {
    from: string;
    to: string;
  };
  employee: {
    userId: string;
    totalAssigned: number;
    done: number;
    pending: number;
    totalMinutes: number;
    totalHours: number;
    totalPages: number;
    lastActiveAt: string | null;
  };
  tasks: {
    taskCode?: string;
    taskTypeCode?: string;
    taskTypeName?: string;
    status: string;
    project?: {
      _id: string;
      name: string;
      clientId?: string;
      clientName?: string;
    } | null;
  }[];
  workLogs: {
    _id: string;
    taskId: string;
    durationMinutes: number;
    pagesCompleted?: number;
    remarks?: string | null;
    startedAt: string;
    stoppedAt: string;
    activityAt?: string;
  }[];
};

export type ProgressEmployeePayloadType = {
  workspaceId: string;
  userId: string;
  from?: string;
  to?: string;
};

export type WorkspaceFileItemType = {
  name: string;
  type: "file" | "folder";
  size?: number;
  modifiedAt?: string;
};

export type WorkspaceFileListResponseType = {
  message: string;
  path: string;
  items: WorkspaceFileItemType[];
};

export type WorkspaceFileUploadResponseType = {
  message: string;
  files: { name: string; size: number }[];
};

export type WorkspaceFileActivityLogType = {
  _id: string;
  action:
    | "ENTER"
    | "DOWNLOAD"
    | "UPLOAD"
    | "CREATE_FOLDER"
    | "DELETE_FILE"
    | "DELETE_FOLDER";
  path: string;
  fileName?: string;
  size?: number;
  createdAt: string;
  user: {
    _id: string;
    name: string;
    email: string;
  } | null;
};

export type WorkspaceFileActivityResponseType = {
  message: string;
  logs: WorkspaceFileActivityLogType[];
};

export type PaginationType = {
  totalCount: number;
  pageSize: number;
  pageNumber: number;
  totalPages: number;
  skip: number;
  limit: number;
};

export type RoleType = {
  _id: string;
  name: string;
};
// *********** MEMBER ****************

//******** */ PROJECT TYPES ****************
//****************************************** */
export type ProjectType = {
  _id: string;
  name: string;
  emoji: string;
  description: string;
  clientId?: string;
  clientName?: string;
  projectId?: string;
  totalChapters?: number;
  workspace: string;
  createdBy: {
    _id: string;
    name: string;
    profilePicture: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type CreateProjectPayloadType = {
  workspaceId: string;
  data: {
    emoji: string;
    name: string;
    description: string;
    clientId: string;
    clientName: string;
    projectId: string;
    totalChapters?: number;
  };
};

export type ProjectResponseType = {
  message: "Project created successfully";
  project: ProjectType;
};

export type EditProjectPayloadType = {
  workspaceId: string;
  projectId: string;
  data: {
    emoji: string;
    name: string;
    description: string;
    clientId?: string;
    clientName?: string;
    projectId?: string;
    totalChapters?: number;
  };
};

//ALL PROJECTS IN WORKSPACE TYPE
export type AllProjectPayloadType = {
  workspaceId: string;
  pageNumber?: number;
  pageSize?: number;
  keyword?: string;
  skip?: boolean;
};

export type AllProjectResponseType = {
  message: string;
  projects: ProjectType[];
  pagination: PaginationType;
};

// SINGLE PROJECT IN WORKSPACE TYPE
export type ProjectByIdPayloadType = {
  workspaceId: string;
  projectId: string;
};

//********** */ TASK TYPES ************************
//************************************************* */

export type CreateTaskPayloadType = {
  workspaceId: string;
  projectId: string;
  data: {
    taskTypeCode: string;
    description: string;
    chapter?: string;
    pageRange?: string;
    priority: TaskPriorityEnumType;
    status: TaskStatusEnumType;
    assignedTo: string;
    dueDate: string;
  };
};

export type EditTaskPayloadType = {
  taskId: string;
  workspaceId: string;
  projectId: string;
  data: Partial<{
    taskTypeCode: string;
    description: string;
    chapter: string;
    pageRange: string;
    priority: TaskPriorityEnumType;
    status: TaskStatusEnumType;
    assignedTo: string;
    dueDate: string;
  }>;
};


type TaskTimerFields = {
  firstStartedAt?: string | null;
  activeStartAt?: string | null;
  isRunning?: boolean;
  lastStoppedAt?: string | null;
  totalMinutesSpent?: number;
  totalSecondsSpent?: number;
  pagesCompleted?: number | null;
  remarks?: string | null;
};

export type TaskType = TaskTimerFields & {
  _id: string;
  title: string;
  description?: string;
  chapter?: string | null;
  pageRange?: string | null;
  assignedToId?: string | null;
  taskTypeCode?: string;
  taskTypeName?: string;
  project?: {
    _id: string;
    emoji: string;
    name: string;
  };
  priority: TaskPriorityEnumType;
  status: TaskStatusEnumType;
  assignedTo: {
    _id: string;
    name: string;
    profilePicture: string | null;
  } | null;
  createdBy?: string;
  dueDate: string;
  taskCode: string;
  createdAt?: string;
  updatedAt?: string;
};

export type TaskTimerPayloadType = {
  taskId: string;
};

export type StopTaskTimerPayloadType = {
  taskId: string;
  data: {
    pagesCompleted?: number;
    remarks?: string;
  };
};

export type StopAllTaskTimersPayloadType = {
  workspaceId: string;
};

export type AllTaskPayloadType = {
  workspaceId: string;
  projectId?: string | null;
  keyword?: string | null;
  priority?: TaskPriorityEnumType | null;
  status?: TaskStatusEnumType | null;
  assignedTo?: string | null;
  taskTypeCode?: string | null;
  dueDate?: string | null;
  pageNumber?: number | null;
  pageSize?: number | null;
};

export type AllTaskResponseType = {
  message: string;
  tasks: TaskType[];
  pagination: PaginationType;
};

export type TaskTypeItem = {
  code: string;
  name: string;
};

export type TaskTypesResponseType = {
  items: TaskTypeItem[];
};

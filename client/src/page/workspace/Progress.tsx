import { useMemo, useState, type ComponentProps } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNowStrict, subDays } from "date-fns";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Permissions } from "@/constant";
import withPermission from "@/hoc/with-permission";
import useWorkspaceId from "@/hooks/use-workspace-id";
import {
  getWorkspaceProgressEmployeeQueryFn,
  getWorkspaceProgressSummaryQueryFn,
  getWorkspaceFileActivityQueryFn,
} from "@/lib/api";
import {
  ProgressEmployeeResponseType,
  ProgressSummaryResponseType,
  WorkspaceFileActivityLogType,
  WorkspaceFileActivityResponseType,
} from "@/types/api.type";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DatePreset = {
  label: string;
  days: number;
};

const DATE_PRESETS: DatePreset[] = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const formatHours = (value: number) => Number(value.toFixed(2));

const formatDuration = (totalMinutes: number) => {
  const minutes = Math.max(0, totalMinutes);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) {
    return `${remainingMinutes}m`;
  }
  return `${hours}h ${remainingMinutes}m`;
};

const getDateRange = (days: number) => {
  const end = new Date();
  const start = subDays(end, days);
  return {
    from: start.toISOString(),
    to: end.toISOString(),
  };
};

// ✅ Fix: Badge variant must be a specific union, not any string
type BadgeVariant = ComponentProps<typeof Badge>["variant"];
const toBadgeVariant = (value?: string | null): BadgeVariant => {
  switch (value) {
    case "BACKLOG":
    case "TODO":
    case "IN_PROGRESS":
    case "IN_REVIEW":
    case "DONE":
    case "LOW":
    case "MEDIUM":
    case "HIGH":
    case "URGENT":
      return value;
    default:
      return "default";
  }
};

// Used to derive task/project label for worklogs (since worklog type only has taskId)
type EmployeeTaskLite = {
  _id?: string;
  taskId?: string;
  title?: string;
  taskCode?: string;
  status?: string | null;
  project?: { name?: string | null } | null;
};

const Progress = () => {
  const workspaceId = useWorkspaceId();
  const [presetDays, setPresetDays] = useState(30);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<
    | "name"
    | "totalAssigned"
    | "done"
    | "pending"
    | "totalHours"
    | "totalPages"
    | "lastActiveAt"
  >("totalHours");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null
  );

  const dateRange = useMemo(() => getDateRange(presetDays), [presetDays]);

  const { data: summaryData, isPending: isSummaryLoading } =
    useQuery<ProgressSummaryResponseType>({
      queryKey: ["progress-summary", workspaceId, dateRange.from, dateRange.to],
      queryFn: () =>
        getWorkspaceProgressSummaryQueryFn({ workspaceId, ...dateRange }),
      enabled: !!workspaceId,
    });

  const { data: employeeData, isPending: isEmployeeLoading } =
    useQuery<ProgressEmployeeResponseType>({
      queryKey: [
        "progress-employee",
        workspaceId,
        selectedEmployeeId,
        dateRange.from,
        dateRange.to,
      ],
      queryFn: () =>
        getWorkspaceProgressEmployeeQueryFn({
          workspaceId,
          userId: selectedEmployeeId as string,
          ...dateRange,
        }),
      enabled: !!workspaceId && !!selectedEmployeeId,
    });

  const { data: fileActivityData, isPending: isFileActivityLoading } =
    useQuery<WorkspaceFileActivityResponseType>({
      queryKey: ["workspace-file-activity", workspaceId],
      queryFn: () => getWorkspaceFileActivityQueryFn({ workspaceId, days: 7 }),
      enabled: !!workspaceId,
    });

  const summary = summaryData;
  const projectStats = summary?.projectStats;
  const taskStats = summary?.taskStats;
  const clientStats = summary?.clientStats;
  const employeeStats = summary?.employeeStats ?? [];

  const filteredEmployees = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const filtered = employeeStats.filter((employee) =>
      employee.name.toLowerCase().includes(normalizedSearch)
    );

    return [...filtered].sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      if (sortKey === "name") {
        return direction * a.name.localeCompare(b.name);
      }
      if (sortKey === "lastActiveAt") {
        const aTime = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
        const bTime = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
        return direction * (aTime - bTime);
      }
      return direction * ((a[sortKey] ?? 0) - (b[sortKey] ?? 0));
    });
  }, [employeeStats, search, sortDirection, sortKey]);

  const topClients = useMemo(
    () => clientStats?.projectsByClient.slice(0, 10) ?? [],
    [clientStats]
  );

  const tasksByStatus = useMemo(
    () => taskStats?.tasksByStatus ?? [],
    [taskStats]
  );

  const topEmployeesByHours = useMemo(
    () =>
      [...employeeStats]
        .sort((a, b) => b.totalHours - a.totalHours)
        .slice(0, 10)
        .map((employee) => ({
          name: employee.name,
          hours: formatHours(employee.totalHours),
        })),
    [employeeStats]
  );

  const [fileUserFilter, setFileUserFilter] = useState("all");
  const [fileActionFilter, setFileActionFilter] = useState("all");
  const [fileFromDate, setFileFromDate] = useState("");
  const [fileToDate, setFileToDate] = useState("");

  const fileActivityLogs = useMemo(() => {
    const logs = fileActivityData?.logs ?? [];
    return logs.filter((log) => {
      if (fileUserFilter !== "all" && log.user?._id !== fileUserFilter) {
        return false;
      }
      if (fileActionFilter !== "all" && log.action !== fileActionFilter) {
        return false;
      }
      const createdAt = new Date(log.createdAt);
      if (fileFromDate) {
        const fromDate = new Date(fileFromDate);
        if (createdAt < fromDate) return false;
      }
      if (fileToDate) {
        const toDate = new Date(fileToDate);
        toDate.setHours(23, 59, 59, 999);
        if (createdAt > toDate) return false;
      }
      return true;
    });
  }, [
    fileActivityData?.logs,
    fileActionFilter,
    fileFromDate,
    fileToDate,
    fileUserFilter,
  ]);

  const fileActivityUsers = useMemo(() => {
    const map = new Map<string, WorkspaceFileActivityLogType["user"]>();
    (fileActivityData?.logs ?? []).forEach((log) => {
      if (log.user && !map.has(log.user._id)) {
        map.set(log.user._id, log.user);
      }
    });
    return Array.from(map.values());
  }, [fileActivityData?.logs]);

  const handlePresetChange = (days: number) => {
    setPresetDays(days);
  };

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
      return;
    }
    setSortKey(key);
    setSortDirection("desc");
  };

  const selectedEmployee = employeeStats.find(
    (employee) => employee.userId === selectedEmployeeId
  );

  // ✅ Fix: derive taskTitle/taskCode/projectName for workLogs using tasks list
  const taskMetaById = useMemo(() => {
    const map = new Map<
      string,
      { title?: string; taskCode?: string; projectName?: string }
    >();

    const tasks = (employeeData?.tasks ?? []) as unknown as EmployeeTaskLite[];

    tasks.forEach((t) => {
      const id = t.taskId || t._id;
      if (!id) return;
      map.set(id, {
        title: t.title,
        taskCode: t.taskCode,
        projectName: t.project?.name ?? undefined,
      });
    });

    return map;
  }, [employeeData?.tasks]);

  return (
    <div className="w-full h-full flex-col space-y-8 pt-3">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Progress</h2>
          <p className="text-muted-foreground">
            Track workspace progress across projects, tasks, and people.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {DATE_PRESETS.map((preset) => (
            <Button
              key={preset.days}
              variant={presetDays === preset.days ? "default" : "outline"}
              size="sm"
              onClick={() => handlePresetChange(preset.days)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-semibold">
              {projectStats?.totalProjects ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Active {projectStats?.activeProjects ?? 0} · Completed{" "}
              {projectStats?.completedProjects ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Clients worked with
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-semibold">
              {clientStats?.totalClients ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Distinct clients in range
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-semibold">
              {taskStats?.totalTasks ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Done {taskStats?.doneTasks ?? 0} · Pending{" "}
              {taskStats?.pendingTasks ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overdue tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-semibold">
              {taskStats?.overdueTasks ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Past due and unfinished
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="shadow-none xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Projects by client (top 10)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {topClients.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No client data available.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topClients} margin={{ left: 0, right: 0 }}>
                  <XAxis
                    dataKey="clientName"
                    tick={{ fontSize: 12 }}
                    interval={0}
                    angle={-10}
                    dy={8}
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar
                    dataKey="projectCount"
                    fill="hsl(var(--chart-1))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Tasks by status</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {tasksByStatus.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No task status data available.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tasksByStatus}
                    dataKey="count"
                    nameKey="status"
                    innerRadius={40}
                    outerRadius={80}
                  >
                    {tasksByStatus.map((entry, index) => (
                      <Cell
                        key={entry.status}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Total hours by employee (top 10)
          </CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          {topEmployeesByHours.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No employee activity in range.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topEmployeesByHours} margin={{ left: 0, right: 0 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  interval={0}
                  angle={-10}
                  dy={8}
                />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar
                  dataKey="hours"
                  fill="hsl(var(--chart-2))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-sm font-medium">Employee activity</CardTitle>
            <p className="text-xs text-muted-foreground">
              {isSummaryLoading ? "Loading summary..." : `${employeeStats.length} employees`}
            </p>
          </div>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search employee..."
            className="max-w-xs"
          />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead onClick={() => handleSort("name")} className="cursor-pointer">
                  Employee
                </TableHead>
                <TableHead onClick={() => handleSort("totalAssigned")} className="cursor-pointer">
                  Assigned
                </TableHead>
                <TableHead onClick={() => handleSort("done")} className="cursor-pointer">
                  Done
                </TableHead>
                <TableHead onClick={() => handleSort("pending")} className="cursor-pointer">
                  Pending
                </TableHead>
                <TableHead onClick={() => handleSort("totalHours")} className="cursor-pointer">
                  Total hours
                </TableHead>
                <TableHead onClick={() => handleSort("totalPages")} className="cursor-pointer">
                  Pages
                </TableHead>
                <TableHead onClick={() => handleSort("lastActiveAt")} className="cursor-pointer">
                  Last active
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                    No employees found.
                  </TableCell>
                </TableRow>
              )}
              {filteredEmployees.map((employee) => (
                <TableRow
                  key={employee.userId}
                  className="cursor-pointer"
                  onClick={() => setSelectedEmployeeId(employee.userId)}
                >
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>{employee.totalAssigned}</TableCell>
                  <TableCell>{employee.done}</TableCell>
                  <TableCell>{employee.pending}</TableCell>
                  <TableCell>{formatHours(employee.totalHours)}</TableCell>
                  <TableCell>{employee.totalPages}</TableCell>
                  <TableCell>
                    {employee.lastActiveAt
                      ? formatDistanceToNowStrict(new Date(employee.lastActiveAt), { addSuffix: true })
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="flex flex-col gap-4">
          <div>
            <CardTitle className="text-sm font-medium">File Activity (Last 7 days)</CardTitle>
            <p className="text-xs text-muted-foreground">
              Track uploads, downloads, creation, and deletions across the workspace.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <Select value={fileUserFilter} onValueChange={setFileUserFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                {fileActivityUsers.map((user) =>
                  user ? (
                    <SelectItem key={user._id} value={user._id}>
                      {user.name} · {user.email}
                    </SelectItem>
                  ) : null
                )}
              </SelectContent>
            </Select>

            <Select value={fileActionFilter} onValueChange={setFileActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                <SelectItem value="ENTER">Enter</SelectItem>
                <SelectItem value="UPLOAD">Upload</SelectItem>
                <SelectItem value="DOWNLOAD">Download</SelectItem>
                <SelectItem value="CREATE_FOLDER">Create folder</SelectItem>
                <SelectItem value="DELETE_FILE">Delete file</SelectItem>
                <SelectItem value="DELETE_FOLDER">Delete folder</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={fileFromDate}
              onChange={(event) => setFileFromDate(event.target.value)}
            />
            <Input
              type="date"
              value={fileToDate}
              onChange={(event) => setFileToDate(event.target.value)}
            />
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Path</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isFileActivityLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    Loading file activity...
                  </TableCell>
                </TableRow>
              )}

              {!isFileActivityLoading && fileActivityLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    No file activity found for the selected filters.
                  </TableCell>
                </TableRow>
              )}

              {fileActivityLogs.map((log) => (
                <TableRow key={log._id}>
                  <TableCell className="font-medium">
                    {log.user ? `${log.user.name} (${log.user.email})` : "—"}
                  </TableCell>
                  <TableCell className="capitalize">
                    {log.action.replace("_", " ").toLowerCase()}
                  </TableCell>
                  <TableCell>{log.path || "—"}</TableCell>
                  <TableCell>{log.fileName ?? "—"}</TableCell>
                  <TableCell>
                    {log.size ? `${(log.size / 1024).toFixed(1)} KB` : "—"}
                  </TableCell>
                  <TableCell>
                    {log.createdAt ? format(new Date(log.createdAt), "PPp") : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedEmployeeId}
        onOpenChange={(open) => !open && setSelectedEmployeeId(null)}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedEmployee?.name ?? "Employee details"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Assigned</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">
                  {employeeData?.employee.totalAssigned ?? 0}
                </CardContent>
              </Card>

              <Card className="shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">
                  {employeeData?.employee.done ?? 0}
                </CardContent>
              </Card>

              <Card className="shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total hours</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">
                  {employeeData?.employee.totalHours ?? 0}
                </CardContent>
              </Card>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2">Tasks in range</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {(employeeData?.tasks ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                        No tasks assigned in range.
                      </TableCell>
                    </TableRow>
                  )}

                  {(employeeData?.tasks ?? []).map((task: any) => (
                    <TableRow key={task.taskCode ?? task.title ?? task._id ?? task.taskId}>
                      <TableCell className="font-medium">{task.title}</TableCell>
                      <TableCell>{task.project?.name ?? "Unassigned"}</TableCell>
                      <TableCell>
                        <Badge variant={toBadgeVariant(task.status)}>{task.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2">Work logs</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Pages</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isEmployeeLoading && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                        Loading work logs...
                      </TableCell>
                    </TableRow>
                  )}

                  {(employeeData?.workLogs ?? []).length === 0 && !isEmployeeLoading && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                        No work logs in range.
                      </TableCell>
                    </TableRow>
                  )}

                  {(employeeData?.workLogs ?? []).map((log) => (
                    <TableRow key={log._id}>
                      <TableCell>
                        {log.activityAt ? format(new Date(log.activityAt), "PP") : "—"}
                      </TableCell>

                      <TableCell className="font-medium">
                        {(() => {
                          const meta = taskMetaById.get(log.taskId);
                          return meta?.title ?? meta?.taskCode ?? "—";
                        })()}
                      </TableCell>

                      <TableCell>
                        {taskMetaById.get(log.taskId)?.projectName ?? "—"}
                      </TableCell>

                      <TableCell>{formatDuration(log.durationMinutes)}</TableCell>
                      <TableCell>{log.pagesCompleted ?? 0}</TableCell>

                      <TableCell className="max-w-xs truncate">
                        {log.remarks ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ProgressWithPermission = withPermission(
  Progress,
  Permissions.MANAGE_WORKSPACE_SETTINGS
);

export default ProgressWithPermission;

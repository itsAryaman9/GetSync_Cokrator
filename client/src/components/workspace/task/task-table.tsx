import { FC, useState } from "react";
import { getColumns } from "./table/columns";
import { DataTable } from "./table/table";
import { useParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Square, X } from "lucide-react";
import { DataTableFacetedFilter } from "./table/table-faceted-filter";
import { priorities, statuses } from "./table/data";
import useTaskTableFilter from "@/hooks/use-task-table-filter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import useWorkspaceId from "@/hooks/use-workspace-id";
import { getAllTasksQueryFn, getTaskTypesQueryFn, stopAllRunningTaskTimersMutationFn } from "@/lib/api";
import { TaskType } from "@/types/api.type";
import useGetProjectsInWorkspaceQuery from "@/hooks/api/use-get-projects";
import useGetWorkspaceMembers from "@/hooks/api/use-get-workspace-members";
import { getAvatarColor, getAvatarFallbackText } from "@/lib/helper";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthContext } from "@/context/auth-provider";
import { Permissions } from "@/constant";
import { toast } from "@/hooks/use-toast";

type Filters = ReturnType<typeof useTaskTableFilter>[0];
type SetFilters = ReturnType<typeof useTaskTableFilter>[1];

interface DataTableFilterToolbarProps {
  isLoading?: boolean;
  projectId?: string;
  filters: Filters;
  setFilters: SetFilters;
  showAssignedFilter: boolean;
}

const TaskTable = () => {
  const param = useParams();
  const projectId = param.projectId as string;

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [filters, setFilters] = useTaskTableFilter();
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const columns = getColumns(projectId);
  const { user, hasPermission } = useAuthContext();
  const showAssignedFilter = hasPermission(Permissions.DELETE_TASK);

  const { data, isLoading } = useQuery({
    queryKey: [
      "all-tasks",
      workspaceId,
      pageSize,
      pageNumber,
      filters,
      projectId,
    ],
    queryFn: () =>
      getAllTasksQueryFn({
        workspaceId,
        keyword: filters.keyword,
        priority: filters.priority,
        status: filters.status,
        projectId: projectId || filters.projectId,
        assignedTo: showAssignedFilter ? filters.assigneeId : user?._id,
        taskTypeCode: filters.taskTypeCode,
        pageNumber,
        pageSize,
      }),
    staleTime: 0,
  });

  const tasks: TaskType[] = data?.tasks || [];
  const totalCount = data?.pagination.totalCount || 0;

  const { mutate: stopAllRunningTimers, isPending: isStoppingAllTimers } =
    useMutation({
      mutationFn: () => stopAllRunningTaskTimersMutationFn({ workspaceId }),
      onSuccess: (response) => {
        queryClient.invalidateQueries({ queryKey: ["all-tasks", workspaceId] });
        toast({
          title: "Timers updated",
          description: response.message,
          variant: "success",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Failed to stop timers",
          description: error.message || "Please try again.",
          variant: "destructive",
        });
      },
    });

  const runningTasksCount = tasks.filter((task) => task.isRunning).length;

  const handlePageChange = (page: number) => {
    setPageNumber(page);
  };

  // Handle page size changes
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
  };

  return (
    <div className="w-full relative">
      {showAssignedFilter ? (
        <div className="mb-3 flex justify-end">
          <Button
            variant="destructive"
            size="sm"
            disabled={isStoppingAllTimers || runningTasksCount === 0}
            onClick={() => stopAllRunningTimers()}
          >
            {isStoppingAllTimers ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Square className="mr-2 h-4 w-4" />
            )}
            Stop All Running Tasks
            {runningTasksCount > 0 ? ` (${runningTasksCount})` : ""}
          </Button>
        </div>
      ) : null}
      <DataTable
        isLoading={isLoading}
        data={tasks}
        columns={columns}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        pagination={{
          totalCount,
          pageNumber,
          pageSize,
        }}
        filtersToolbar={
          <DataTableFilterToolbar
            isLoading={isLoading}
            projectId={projectId}
            filters={filters}
            setFilters={setFilters}
            showAssignedFilter={showAssignedFilter}
          />
        }
      />
    </div>
  );
};

const DataTableFilterToolbar: FC<DataTableFilterToolbarProps> = ({
  isLoading,
  projectId,
  filters,
  setFilters,
  showAssignedFilter,
}) => {
  const workspaceId = useWorkspaceId();

  const { data } = useGetProjectsInWorkspaceQuery({
    workspaceId,
  });

  const { data: memberData } = useGetWorkspaceMembers(workspaceId);
  const { data: taskTypeData } = useQuery({
    queryKey: ["task-types"],
    queryFn: getTaskTypesQueryFn,
    staleTime: Infinity,
  });

  const projects = data?.projects || [];
  const members = memberData?.members || [];
  const taskTypes = taskTypeData?.items || [];

  //Workspace Projects
  const projectOptions = projects?.map((project) => {
    return {
      label: (
        <div className="flex items-center gap-1">
          <span>{project.emoji}</span>
          <span>{project.name}</span>
        </div>
      ),
      value: project._id,
    };
  });

  // Workspace Memebers
  const assigneesOptions = members?.map((member) => {
    const name = member.userId?.name || "Unknown";
    const initials = getAvatarFallbackText(name);
    const avatarColor = getAvatarColor(name);

    return {
      label: (
        <div className="flex items-center space-x-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={member.userId?.profilePicture || ""} alt={name} />
            <AvatarFallback className={avatarColor}>{initials}</AvatarFallback>
          </Avatar>
          <span>{name}</span>
        </div>
      ),
      value: member.userId._id,
    };
  });

  const handleFilterChange = (key: keyof Filters, values: string[]) => {
    setFilters({
      ...filters,
      [key]: values.length > 0 ? values.join(",") : null,
    });
  };

  const taskTypeOptions = taskTypes.map((taskType) => ({
    label: `${taskType.code}: ${taskType.name}`,
    value: taskType.code,
  }));

  return (
    <div className="flex flex-col lg:flex-row w-full items-start space-y-2 mb-2 lg:mb-0 lg:space-x-2  lg:space-y-0">
      <Input
        placeholder="Filter tasks..."
        value={filters.keyword || ""}
        onChange={(e) =>
          setFilters({
            keyword: e.target.value,
          })
        }
        className="h-8 w-full lg:w-[250px]"
      />
      {/* Status filter */}
      <DataTableFacetedFilter
        title="Status"
        multiSelect={true}
        options={statuses}
        disabled={isLoading}
        selectedValues={filters.status?.split(",") || []}
        onFilterChange={(values) => handleFilterChange("status", values)}
      />

      {/* Priority filter */}
      <DataTableFacetedFilter
        title="Priority"
        multiSelect={true}
        options={priorities}
        disabled={isLoading}
        selectedValues={filters.priority?.split(",") || []}
        onFilterChange={(values) => handleFilterChange("priority", values)}
      />

      {/* Assigned To filter */}
      {showAssignedFilter ? (
        <DataTableFacetedFilter
          title="Assigned To"
          multiSelect={true}
          options={assigneesOptions}
          disabled={isLoading}
          selectedValues={filters.assigneeId?.split(",") || []}
          onFilterChange={(values) => handleFilterChange("assigneeId", values)}
        />
      ) : null}

      <DataTableFacetedFilter
        title="Task Type"
        multiSelect={false}
        options={taskTypeOptions}
        disabled={isLoading}
        selectedValues={filters.taskTypeCode?.split(",") || []}
        onFilterChange={(values) => handleFilterChange("taskTypeCode", values)}
      />

      {!projectId && (
        <DataTableFacetedFilter
          title="Projects"
          multiSelect={false}
          options={projectOptions}
          disabled={isLoading}
          selectedValues={filters.projectId?.split(",") || []}
          onFilterChange={(values) => handleFilterChange("projectId", values)}
        />
      )}

      {Object.values(filters).some(
        (value) => value !== null && value !== ""
      ) && (
        <Button
          disabled={isLoading}
          variant="ghost"
          className="h-8 px-2 lg:px-3"
          onClick={() =>
            setFilters({
              keyword: null,
              status: null,
              priority: null,
              projectId: null,
              assigneeId: null,
              taskTypeCode: null,
            })
          }
        >
          Reset
          <X />
        </Button>
      )}
    </div>
  );
};

export default TaskTable;

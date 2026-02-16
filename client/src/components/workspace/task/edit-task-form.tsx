import { z } from "zod";
import { format } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { CalendarIcon, Loader } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Textarea } from "../../ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import useWorkspaceId from "@/hooks/use-workspace-id";
import { TaskPriorityEnum, TaskStatusEnum } from "@/constant";
import useGetWorkspaceMembers from "@/hooks/api/use-get-workspace-members";
import { editTaskMutationFn, getTaskTypesQueryFn } from "@/lib/api";
import { transformOptions } from "@/lib/helper";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { TaskType } from "@/types/api.type";
import { useAuthContext } from "@/context/auth-provider";

export default function EditTaskForm({
  task,
  onClose,
}: {
  task: TaskType;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceId();
  const { user } = useAuthContext();

  const { mutate, isPending } = useMutation({
    mutationFn: editTaskMutationFn,
  });

  const { data: memberData } = useGetWorkspaceMembers(workspaceId);
  const { data: taskTypeData, isLoading: isTaskTypesLoading } = useQuery({
    queryKey: ["task-types"],
    queryFn: getTaskTypesQueryFn,
    staleTime: Infinity,
  });

  const members = memberData?.members || [];
  const taskTypes = taskTypeData?.items || [];

  const membersOptions = members.map((member) => ({
    label: member.userId?.name || "Unknown",
    value: member.userId?._id || "",
  }));

  const statusOptions = transformOptions(Object.values(TaskStatusEnum));
  const priorityOptions = transformOptions(Object.values(TaskPriorityEnum));

  const formSchema = z.object({
    taskTypeCode: z.string().trim().min(1, { message: "Task type is required" }),
    description: z.string().trim(),
    status: z.enum(Object.values(TaskStatusEnum) as [keyof typeof TaskStatusEnum]),
    priority: z.enum(
      Object.values(TaskPriorityEnum) as [keyof typeof TaskPriorityEnum]
    ),
    assignedTo: z.string().trim().min(1, { message: "AssignedTo is required" }),
    dueDate: z.date({ required_error: "A due date is required." }),
  });

  const statusOnlySchema = z.object({
    status: z.enum(Object.values(TaskStatusEnum) as [keyof typeof TaskStatusEnum]),
  });

  const currentMemberRole = members.find(
    (member) => member.userId?._id === user?._id
  )?.role?.name;
  const isStatusOnly = currentMemberRole === "MEMBER";

  const form = useForm<
    z.infer<typeof formSchema> | z.infer<typeof statusOnlySchema>
  >({
    resolver: zodResolver(isStatusOnly ? statusOnlySchema : formSchema),
    defaultValues: isStatusOnly
      ? {
          status: task?.status ?? "TODO",
        }
      : {
          taskTypeCode: task?.taskTypeCode ?? "",
          description: task?.description ?? "",
          status: task?.status ?? "TODO",
          priority: task?.priority ?? "MEDIUM",
          assignedTo: task.assignedTo?._id ?? "",
          dueDate: task?.dueDate ? new Date(task.dueDate) : new Date(),
        },
  });

  const onSubmit = (
    values: z.infer<typeof formSchema> | z.infer<typeof statusOnlySchema>
  ) => {
    if (isPending) return;

    const payload = {
      workspaceId,
      projectId: task.project?._id ?? "",
      taskId: task._id,
      data: isStatusOnly
        ? { status: values.status }
        : {
            ...(values as z.infer<typeof formSchema>),
            dueDate: (values as z.infer<typeof formSchema>).dueDate.toISOString(),
          },
    };

    mutate(payload, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["all-tasks", workspaceId] });
        toast({
          title: "Success",
          description: "Task updated successfully",
          variant: "success",
        });
        onClose();
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  return (
    <div className="w-full h-auto max-w-full">
      <div className="h-full">
        <div className="mb-5 pb-2 border-b">
          <h1 className="text-xl font-semibold text-center sm:text-left">Edit Task</h1>
        </div>
        <Form {...form}>
          <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
            {!isStatusOnly ? (
              <>
                <FormField
                  control={form.control}
                  name="taskTypeCode"
                  render={({ field }) => {
                    const selectedTaskType = taskTypes.find(
                      (taskType) => taskType.code === field.value
                    );

                    return (
                      <FormItem>
                        <FormLabel>Task Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a task type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <div className="w-full max-h-[200px] overflow-y-auto scrollbar">
                              {isTaskTypesLoading && (
                                <div className="my-2">
                                  <Loader className="w-4 h-4 place-self-center flex animate-spin" />
                                </div>
                              )}
                              {taskTypes.map((taskType) => (
                                <SelectItem
                                  key={taskType.code}
                                  value={taskType.code}
                                  className="cursor-pointer"
                                >
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium text-foreground">
                                      {taskType.code}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {taskType.name}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </div>
                          </SelectContent>
                        </Select>
                        {selectedTaskType ? (
                          <p className="text-xs text-muted-foreground">
                            {selectedTaskType.name}
                          </p>
                        ) : null}
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={2} placeholder="Description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned To</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an assignee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <div className="w-full max-h-[200px] overflow-y-auto scrollbar">
                            {membersOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </div>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline">
                              {field.value ? format(field.value, "PPP") : "Pick a date"}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent>
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            ) : null}

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isStatusOnly ? (
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {priorityOptions.map((priority) => (
                          <SelectItem key={priority.value} value={priority.value}>
                            {priority.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader className="animate-spin" />}
              Save Changes
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}

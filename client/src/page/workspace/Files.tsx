import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Folder,
  FolderPlus,
  MoreVertical,
  Trash2,
  Upload,
} from "lucide-react";
import {
  createWorkspaceFolderMutationFn,
  deleteWorkspaceItemMutationFn,
  downloadWorkspaceFileQueryFn,
  getWorkspaceFilesQueryFn,
  uploadWorkspaceFilesMutationFn,
} from "@/lib/api";
import useWorkspaceId from "@/hooks/use-workspace-id";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/context/auth-provider";
import { Permissions } from "@/constant";

const formatBytes = (bytes?: number) => {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[index]}`;
};

const Files = () => {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthContext();
  const canDeleteFiles = hasPermission(Permissions.MANAGE_WORKSPACE_SETTINGS);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [currentPath, setCurrentPath] = useState("");
  const [search, setSearch] = useState("");
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const { data, isPending } = useQuery({
    queryKey: ["workspace-files", workspaceId, currentPath],
    queryFn: () =>
      getWorkspaceFilesQueryFn({ workspaceId, path: currentPath }),
    enabled: !!workspaceId,
  });

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) =>
      uploadWorkspaceFilesMutationFn({
        workspaceId,
        path: currentPath,
        files,
      }),
    onSuccess: () => {
      toast({
        title: "Upload complete",
        description: "Your files have been uploaded.",
        variant: "success",
      });
      queryClient.invalidateQueries({
        queryKey: ["workspace-files", workspaceId, currentPath],
      });
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "Unable to upload files. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: () =>
      createWorkspaceFolderMutationFn({
        workspaceId,
        path: currentPath,
        name: newFolderName,
      }),
    onSuccess: () => {
      toast({
        title: "Folder created",
        description: "Your new folder is ready.",
        variant: "success",
      });
      setIsCreateFolderOpen(false);
      setNewFolderName("");
      queryClient.invalidateQueries({
        queryKey: ["workspace-files", workspaceId, currentPath],
      });
    },
    onError: () => {
      toast({
        title: "Folder creation failed",
        description: "Please choose a different folder name.",
        variant: "destructive",
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (path: string) =>
      deleteWorkspaceItemMutationFn({
        workspaceId,
        path,
      }),
    onSuccess: (response) => {
      toast({
        title: "Deleted",
        description: response.message,
        variant: "success",
      });
      queryClient.invalidateQueries({
        queryKey: ["workspace-files", workspaceId, currentPath],
      });
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Unable to delete this item right now.",
        variant: "destructive",
      });
    },
  });

  const breadcrumbSegments = useMemo(() => {
    if (!currentPath) return [];
    return currentPath.split("/").filter(Boolean);
  }, [currentPath]);

  const filteredItems = useMemo(() => {
    const items = data?.items ?? [];
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return items;
    return items.filter((item) =>
      item.name.toLowerCase().includes(normalizedSearch)
    );
  }, [data?.items, search]);

  const handleOpenFolder = (name: string) => {
    setCurrentPath((prev) => (prev ? `${prev}/${name}` : name));
  };

  const handleGoToPath = (index: number) => {
    if (index < 0) {
      setCurrentPath("");
      return;
    }
    const newPath = breadcrumbSegments.slice(0, index + 1).join("/");
    setCurrentPath(newPath);
  };

  const handleDownload = async (path: string, fileName: string) => {
    try {
      const blob = await downloadWorkspaceFileQueryFn({
        workspaceId,
        path,
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Unable to download file right now.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (path: string, type: "file" | "folder") => {
    if (!canDeleteFiles) {
      toast({
        title: "Access denied",
        description: "Only admins can delete files or folders.",
        variant: "destructive",
      });
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete this ${type}?`
    );
    if (!confirmed) return;
    deleteItemMutation.mutate(path);
  };

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    uploadMutation.mutate(Array.from(files));
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleFilesSelected(event.dataTransfer.files);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Files</h1>
          <p className="text-sm text-muted-foreground">
            Browse, upload, and organize workspace files.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsCreateFolderOpen(true)}
          >
            <FolderPlus className="mr-2 h-4 w-4" />
            New Folder
          </Button>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => handleFilesSelected(event.target.files)}
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink onClick={() => handleGoToPath(-1)}>
                  Workspace
                </BreadcrumbLink>
              </BreadcrumbItem>
              {breadcrumbSegments.map((segment, index) => (
                <BreadcrumbItem key={`${segment}-${index}`}>
                  <BreadcrumbSeparator />
                  {index === breadcrumbSegments.length - 1 ? (
                    <BreadcrumbPage>{segment}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink onClick={() => handleGoToPath(index)}>
                      {segment}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
          <Input
            placeholder="Search files"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="max-w-xs"
          />
        </div>

        <div
          className={cn(
            "mt-4 rounded-md border border-dashed p-6 text-center transition",
            isDragging && "border-primary bg-muted"
          )}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <p className="text-sm text-muted-foreground">
            Drag and drop files here, or click Upload to add files.
          </p>
        </div>

        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Modified</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm">
                    Loading files...
                  </TableCell>
                </TableRow>
              )}
              {!isPending && filteredItems.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-sm text-muted-foreground"
                  >
                    No files or folders in this location.
                  </TableCell>
                </TableRow>
              )}
              {filteredItems.map((item) => {
                const isFolder = item.type === "folder";
                const itemPath = currentPath
                  ? `${currentPath}/${item.name}`
                  : item.name;
                const hasRowActions = !isFolder || canDeleteFiles;
                return (
                  <TableRow key={itemPath}>
                    <TableCell>
                      <button
                        type="button"
                        className="flex items-center gap-2 text-left"
                        onClick={() =>
                          isFolder
                            ? handleOpenFolder(item.name)
                            : handleDownload(itemPath, item.name)
                        }
                      >
                        {isFolder ? (
                          <Folder className="h-4 w-4 text-primary" />
                        ) : (
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-medium">{item.name}</span>
                      </button>
                    </TableCell>
                    <TableCell className="capitalize">{item.type}</TableCell>
                    <TableCell>{formatBytes(item.size)}</TableCell>
                    <TableCell>
                      {item.modifiedAt
                        ? new Date(item.modifiedAt).toLocaleString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {hasRowActions ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={deleteItemMutation.isPending}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!isFolder && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleDownload(itemPath, item.name)
                              }
                            >
                              Download
                            </DropdownMenuItem>
                          )}
                          {canDeleteFiles ? (
                            <DropdownMenuItem
                              onClick={() =>
                                handleDelete(itemPath, isFolder ? "folder" : "file")
                              }
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={(event) => setNewFolderName(event.target.value)}
            />
            {currentPath && (
              <p className="text-xs text-muted-foreground">
                Folder will be created in {currentPath}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateFolderOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => createFolderMutation.mutate()}
              disabled={!newFolderName.trim() || createFolderMutation.isPending}
            >
              Create folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Files;

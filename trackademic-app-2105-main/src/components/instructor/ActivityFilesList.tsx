import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Trash2, FileText, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FilePreviewDialog } from "@/components/files/FilePreviewDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ActivityFile {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_at: string;
  description: string | null;
  points: number | null;
}

interface ActivityFilesListProps {
  courseId: string;
  refreshTrigger?: number;
  showDelete?: boolean;
}

const ActivityFilesList = ({ courseId, refreshTrigger, showDelete = true }: ActivityFilesListProps) => {
  const { toast } = useToast();
  const [files, setFiles] = useState<ActivityFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<ActivityFile | null>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewKind, setPreviewKind] = useState<"iframe" | "image">("iframe");

  const fetchFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_files')
        .select('*')
        .eq('course_id', courseId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load activity files.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [courseId, refreshTrigger]);

  const handleView = async (file: ActivityFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('course-activities')
        .createSignedUrl(file.file_path, 3600, { download: false }); // 1 hour expiry

      if (error) throw error;

      const isImage = (file.file_type || "").startsWith("image/");
      const viewerUrl = isImage
        ? data.signedUrl
        : `https://docs.google.com/gview?url=${encodeURIComponent(data.signedUrl)}&embedded=true`;

      setPreviewTitle(file.file_name);
      setPreviewKind(isImage ? "image" : "iframe");
      setPreviewUrl(viewerUrl);
      setPreviewOpen(true);
    } catch (error: any) {
      toast({
        title: "View failed",
        description: error.message || "Failed to view file.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (file: ActivityFile) => {
    try {
      const { data, error } = await supabase.storage
        .from("course-activities")
        .createSignedUrl(file.file_path, 3600, { download: true });

      if (error) throw error;

      window.open(data.signedUrl, "_blank");
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message || "Failed to download file.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('course-activities')
        .remove([fileToDelete.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('activity_files')
        .delete()
        .eq('id', fileToDelete.id);

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "File deleted successfully.",
      });

      fetchFiles();
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete file.",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No files uploaded yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {files.map((file) => (
          <div
            key={file.id}
            className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium truncate">{file.file_name}</h4>
                {file.points !== null && (
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    {file.points} pts
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <span>{formatFileSize(file.file_size)}</span>
                <span>•</span>
                <span>{formatDate(file.uploaded_at)}</span>
              </div>
              {file.description && (
                <p className="text-sm text-muted-foreground mt-2">{file.description}</p>
              )}
            </div>
            <div className="flex gap-2 ml-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleView(file)}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDownload(file)}
              >
                <Download className="h-4 w-4" />
              </Button>
              {showDelete && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setFileToDelete(file);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <FilePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title={previewTitle}
        url={previewUrl}
        kind={previewKind}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{fileToDelete?.file_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ActivityFilesList;

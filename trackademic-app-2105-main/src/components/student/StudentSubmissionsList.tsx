import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, Eye, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatDistance } from "date-fns";
import { FilePreviewDialog } from "@/components/files/FilePreviewDialog";

interface Submission {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  submitted_at: string;
  description: string | null;
  awarded_points: number | null;
  activity_file_id: string;
  max_points?: number | null;
  deadline?: string | null;
  is_late?: boolean;
}

interface StudentSubmissionsListProps {
  courseId: string;
  refreshTrigger?: number;
  studentId?: string;
}

const StudentSubmissionsList = ({ courseId, refreshTrigger, studentId: propStudentId }: StudentSubmissionsListProps) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewKind, setPreviewKind] = useState<"iframe" | "image">("iframe");

  useEffect(() => {
    fetchSubmissions();
  }, [courseId, refreshTrigger]);

  const fetchSubmissions = async () => {
    try {
      let studentIdToUse = propStudentId;
      
      if (!studentIdToUse) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        studentIdToUse = user.id;
      }

      const { data, error } = await supabase
        .from("activity_submissions")
        .select("*, activity_files(points, deadline)")
        .eq("course_id", courseId)
        .eq("student_id", studentIdToUse)
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      
      const submissionsWithMaxPoints = (data || []).map((sub: any) => {
        const deadline = sub.activity_files?.deadline ?? null;
        const submittedAt = new Date(sub.submitted_at);
        const isLate = deadline ? submittedAt > new Date(deadline) : false;
        
        return {
          ...sub,
          max_points: sub.activity_files?.points ?? null,
          deadline,
          is_late: isLate,
        };
      });
      setSubmissions(submissionsWithMaxPoints);
    } catch (error) {
      console.error("Error fetching submissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (submission: Submission) => {
    try {
      const { data, error } = await supabase.storage
        .from("activity-submissions")
        .createSignedUrl(submission.file_path, 3600, { download: false });

      if (error) throw error;

      const isImage = (submission.file_type || "").startsWith("image/");
      const viewerUrl = isImage
        ? data.signedUrl
        : `https://docs.google.com/gview?url=${encodeURIComponent(data.signedUrl)}&embedded=true`;

      setPreviewTitle(submission.file_name);
      setPreviewKind(isImage ? "image" : "iframe");
      setPreviewUrl(viewerUrl);
      setPreviewOpen(true);
    } catch (error) {
      console.error("Error viewing file:", error);
      toast({
        title: "Error",
        description: "Failed to view file",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("activity-submissions")
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-8">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No submissions yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3 sm:space-y-4">
        {submissions.map((submission) => (
          <Card key={submission.id} className="overflow-hidden">
            <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-sm sm:text-base font-medium leading-tight break-words">
                      {submission.file_name}
                    </CardTitle>
                    {submission.is_late && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Late
                      </Badge>
                    )}
                    {submission.awarded_points !== null ? (
                      <Badge className="gap-1 bg-primary text-primary-foreground">
                        <CheckCircle className="h-3 w-3" />
                        Graded
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <Clock className="h-3 w-3" />
                        Pending
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs sm:text-sm">
                    Submitted {formatDistance(new Date(submission.submitted_at), new Date(), { addSuffix: true })}
                  </CardDescription>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatFileSize(submission.file_size)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
              {submission.awarded_points !== null && (
                <div className="mb-3 p-2.5 bg-primary/10 border border-primary/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-primary">Points Awarded</span>
                    <span className="text-lg font-bold text-primary">
                      {submission.awarded_points}
                      {submission.max_points !== null && (
                        <span className="text-sm font-normal text-primary/70"> / {submission.max_points}</span>
                      )}
                      <span className="text-sm font-normal ml-1">pts</span>
                    </span>
                  </div>
                </div>
              )}
              {submission.description && (
                <p className="text-xs sm:text-sm text-muted-foreground mb-3 break-words">
                  {submission.description}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={() => handleView(submission)}
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-8 px-2.5 sm:px-3 text-xs sm:text-sm"
                >
                  <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  View
                </Button>
                <Button
                  onClick={() => handleDownload(submission.file_path, submission.file_name)}
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-8 px-2.5 sm:px-3 text-xs sm:text-sm"
                >
                  <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <FilePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title={previewTitle}
        url={previewUrl}
        kind={previewKind}
      />
    </>
  );
};

export default StudentSubmissionsList;

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, FileText, User, Eye, Check, X, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatDistance } from "date-fns";
import { FilePreviewDialog } from "@/components/files/FilePreviewDialog";

interface Student {
  id: string;
  full_name: string;
}

interface Submission {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  submitted_at: string;
  description: string | null;
  student_id: string;
  awarded_points: number | null;
  activity_file_id: string;
  max_points?: number | null;
  deadline?: string | null;
  is_late?: boolean;
}

interface SubmissionsDashboardProps {
  courseId: string;
}

const SubmissionsDashboard = ({ courseId }: SubmissionsDashboardProps) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewKind, setPreviewKind] = useState<"iframe" | "image">("iframe");

  const [editingPointsId, setEditingPointsId] = useState<string | null>(null);
  const [pointsInput, setPointsInput] = useState<string>("");

  useEffect(() => {
    fetchStudents();
  }, [courseId]);

  useEffect(() => {
    if (selectedStudent) {
      fetchSubmissions(selectedStudent.id);
    }
  }, [selectedStudent]);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from("enrollments")
        .select("student_id, profiles!enrollments_student_id_fkey(id, full_name)")
        .eq("course_id", courseId);

      if (error) throw error;

      type EnrollmentRow = { student_id: string; profiles: { id: string; full_name: string } };
      const studentsData = (data as EnrollmentRow[]).map((enrollment) => ({
        id: enrollment.profiles.id,
        full_name: enrollment.profiles.full_name,
      }));

      setStudents(studentsData);
    } catch (error) {
      console.error("Error fetching students:", error);
      toast({
        title: "Error",
        description: "Failed to load students",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from("activity_submissions")
        .select("*, activity_files(points, deadline)")
        .eq("course_id", courseId)
        .eq("student_id", studentId)
        .order("submitted_at", { ascending: false });

      if (error) throw error;

      type SubmissionRow = { submitted_at: string; activity_files?: { points: number | null; deadline: string | null } | null } & Record<string, unknown>;
      const submissionsWithMaxPoints = (data || []).map((sub: SubmissionRow) => {
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
      toast({
        title: "Error",
        description: "Failed to load submissions",
        variant: "destructive",
      });
    }
  };

  const handleStartEditPoints = (submission: Submission) => {
    setEditingPointsId(submission.id);
    setPointsInput(submission.awarded_points?.toString() || "");
  };

  const handleCancelEditPoints = () => {
    setEditingPointsId(null);
    setPointsInput("");
  };

  const handleSavePoints = async (submissionId: string) => {
    try {
      const pointsValue = pointsInput.trim() !== "" ? parseInt(pointsInput, 10) : null;
      
      const { error } = await supabase
        .from("activity_submissions")
        .update({ awarded_points: pointsValue })
        .eq("id", submissionId);

      if (error) throw error;

      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === submissionId ? { ...s, awarded_points: pointsValue } : s
        )
      );

      setEditingPointsId(null);
      setPointsInput("");

      toast({
        title: "Success",
        description: "Points saved successfully",
      });
    } catch (error) {
      console.error("Error saving points:", error);
      toast({
        title: "Error",
        description: "Failed to save points",
        variant: "destructive",
      });
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

  const handleDownload = async (filePath: string, _fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("activity-submissions")
        .createSignedUrl(filePath, 3600, { download: true });

      if (error) throw error;

      window.open(data.signedUrl, "_blank");
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

  if (!selectedStudent) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Select a student to view their submissions</p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {students.map((student) => (
            <Card
              key={student.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => setSelectedStudent(student)}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{student.full_name}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => setSelectedStudent(null)}>
          Back to Students
        </Button>
        <div>
          <h3 className="text-lg font-semibold">{selectedStudent.full_name}</h3>
          <p className="text-sm text-muted-foreground">Submissions</p>
        </div>
      </div>

      {submissions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No submissions yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {submissions.map((submission) => (
            <Card key={submission.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-lg">{submission.file_name}</CardTitle>
                      {submission.is_late && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Late
                        </Badge>
                      )}
                    </div>
                    <CardDescription>
                      Submitted {formatDistance(new Date(submission.submitted_at), new Date(), { addSuffix: true })}
                    </CardDescription>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatFileSize(submission.file_size)}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {submission.description && (
                  <p className="text-sm text-muted-foreground mb-4">{submission.description}</p>
                )}
                
                {/* Points Section */}
                <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Points Awarded</span>
                    {editingPointsId === submission.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max={submission.max_points ?? undefined}
                          placeholder={submission.max_points ? `Max: ${submission.max_points}` : "Enter points"}
                          value={pointsInput}
                          onChange={(e) => setPointsInput(e.target.value)}
                          className="w-24 h-8"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleSavePoints(submission.id)}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={handleCancelEditPoints}
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {submission.awarded_points !== null ? (
                            <span className="font-semibold text-primary">
                              {submission.awarded_points}
                              {submission.max_points !== null && ` / ${submission.max_points}`} pts
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Not graded</span>
                          )}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartEditPoints(submission)}
                        >
                          {submission.awarded_points !== null ? "Edit" : "Grade"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleView(submission)}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </Button>
                  <Button
                    onClick={() => handleDownload(submission.file_path, submission.file_name)}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <FilePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title={previewTitle}
        url={previewUrl}
        kind={previewKind}
      />
    </div>
  );
};

export default SubmissionsDashboard;

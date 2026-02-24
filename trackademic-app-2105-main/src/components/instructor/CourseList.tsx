import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Edit3, Check, X, Copy, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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

interface Course {
  id: string;
  title: string;
  description: string | null;
  course_code: string | null;
  created_at: string;
}

interface CourseListProps {
  refreshTrigger: number;
}

const CourseList = ({ refreshTrigger }: CourseListProps) => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const fetchCourses = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to view courses.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('courses')
        .select('id, title, description, course_code, created_at')
        .eq('instructor_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch courses.",
          variant: "destructive",
        });
        return;
      }

      setCourses(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [refreshTrigger]);

  const startEditing = (course: Course) => {
    setEditingId(course.id);
    setEditTitle(course.title);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle("");
  };

  const saveTitle = async (courseId: string) => {
    if (!editTitle.trim()) {
      toast({
        title: "Error",
        description: "Course title cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('courses')
        .update({ title: editTitle.trim() })
        .eq('id', courseId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update course title.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Course title updated successfully!",
      });

      setCourses(courses.map(course => 
        course.id === courseId 
          ? { ...course, title: editTitle.trim() }
          : course
      ));
      
      setEditingId(null);
      setEditTitle("");
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Course code copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy course code.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("courses")
        .delete()
        .eq("id", courseToDelete.id);

      if (error) {
        toast({
          title: "Error",
          description: error.message || "Failed to delete course.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Course deleted",
        description: `"${courseToDelete.title}" has been removed.`,
      });
      setCourses(courses.filter((c) => c.id !== courseToDelete.id));
      setCourseToDelete(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="text-center py-8">
        <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No courses yet. Create your first course!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {courses.map((course) => (
        <Card 
          key={course.id} 
          className="trackademic-card cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => navigate(`/instructor-dashboard/course/${course.id}`)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              {editingId === course.id ? (
                <div className="flex items-center space-x-2 flex-1" onClick={(e) => e.stopPropagation()}>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="flex-1"
                    maxLength={100}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        saveTitle(course.id);
                      } else if (e.key === 'Escape') {
                        cancelEditing();
                      }
                    }}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={() => saveTitle(course.id)}
                    className="h-8 w-8 p-0"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={cancelEditing}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <BookOpen className="h-5 w-5 text-primary" />
                        {course.title}
                      </CardTitle>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(course);
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCourseToDelete(course);
                        }}
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    {course.course_code && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                          {course.course_code}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(course.course_code!);
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </CardHeader>
          {course.description && (
            <CardContent>
              <p className="text-muted-foreground text-sm">{course.description}</p>
            </CardContent>
          )}
        </Card>
      ))}

      <AlertDialog open={!!courseToDelete} onOpenChange={(open) => !open && setCourseToDelete(null)}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete course?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{courseToDelete?.title}" and all associated data (enrollments, attendance, sessions, activities). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteCourse();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CourseList;
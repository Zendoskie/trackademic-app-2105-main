import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
interface Enrollment {
  id: string;
  student_id: string;
  enrolled_at: string;
  profiles?: {
    full_name: string | null;
    email: string | null;
    role: string | null;
  };
}
interface EnrolledStudentsListProps {
  courseId: string;
  courseName: string;
  onStudentClick?: (studentId: string, studentName: string) => void;
  compact?: boolean;
}
const EnrolledStudentsList = ({
  courseId,
  courseName,
  onStudentClick,
  compact = false
}: EnrolledStudentsListProps) => {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingEnrollmentId, setDeletingEnrollmentId] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const {
    toast
  } = useToast();
  const toggleCardExpansion = (enrollmentId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(enrollmentId)) {
        newSet.delete(enrollmentId);
      } else {
        newSet.add(enrollmentId);
      }
      return newSet;
    });
  };
  const fetchEnrollments = async () => {
    try {
      // 1) Fetch enrollments for the course (no joined selects to avoid TS relation errors)
      const {
        data: enrollmentsData,
        error: enrollmentsError
      } = await supabase.from('enrollments').select('id, student_id, enrolled_at').eq('course_id', courseId).order('enrolled_at', {
        ascending: false
      });
      if (enrollmentsError) {
        toast({
          title: "Error",
          description: "Failed to fetch enrolled students.",
          variant: "destructive"
        });
        setEnrollments([]);
        return;
      }
      const studentIds = (enrollmentsData || []).map(e => e.student_id);

      // 2) Fetch profiles for those students and build a map
      let profileMap: Record<string, {
        full_name: string | null;
        email: string | null;
        role: string | null;
      }> = {};
      if (studentIds.length > 0) {
        const {
          data: profilesData,
          error: profilesError
        } = await supabase.from('profiles').select('id, full_name, email, role').in('id', studentIds);
        if (profilesError) {
          toast({
            title: "Error",
            description: "Failed to fetch student profiles.",
            variant: "destructive"
          });
        } else if (profilesData) {
          profileMap = Object.fromEntries(profilesData.map(p => [p.id, {
            full_name: p.full_name,
            email: p.email,
            role: p.role
          }]));
        }
      }

      // 3) Merge profiles into enrollments shape expected by UI
      const merged: Enrollment[] = (enrollmentsData || []).map(e => ({
        ...e,
        profiles: profileMap[e.student_id]
      }));
      setEnrollments(merged);
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchEnrollments();
  }, [courseId]);
  const removeStudent = async (enrollmentId: string) => {
    try {
      const {
        error
      } = await supabase.from('enrollments').delete().eq('id', enrollmentId);
      if (error) {
        toast({
          title: "Error",
          description: "Failed to remove student.",
          variant: "destructive"
        });
        return;
      }
      toast({
        title: "Success",
        description: "Student removed from course."
      });
      setEnrollments(enrollments.filter(e => e.id !== enrollmentId));
      setDeletingEnrollmentId(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    }
  };
  if (loading) {
    return <Card className="mt-4">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>;
  }
  return <Card className="mt-4 trackademic-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-primary" />
          Enrolled Students ({enrollments.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {enrollments.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">
            No students enrolled yet
          </p> : <div className="space-y-2">
            {enrollments.map(enrollment => {
          const isExpanded = !compact && expandedCards.has(enrollment.id);
          const showCompact = compact || !isExpanded;
          return <div key={enrollment.id} className={`p-4 rounded-lg bg-muted/30 border border-border ${onStudentClick ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''}`} onClick={() => onStudentClick?.(enrollment.student_id, enrollment.profiles?.full_name || 'Unknown Student')}>
                  {showCompact ? <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <p className="text-sm font-medium">
                          {enrollment.profiles?.full_name || 'Unknown Student'}
                        </p>
                      </div>
                      {!compact && <Button size="sm" variant="ghost" onClick={e => {
                e.stopPropagation();
                toggleCardExpansion(enrollment.id);
              }} className="h-8 gap-1">
                          Show Details
                          <ChevronDown className="h-4 w-4" />
                        </Button>}
                    </div> : <>
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" />
                          Student Profile
                        </h3>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={e => {
                    e.stopPropagation();
                    toggleCardExpansion(enrollment.id);
                  }} className="h-8 gap-1">
                            Hide Details
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={e => {
                    e.stopPropagation();
                    setDeletingEnrollmentId(enrollment.id);
                  }} className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Name</p>
                          <p className="text-sm font-medium">
                            {enrollment.profiles?.full_name || 'Unknown Student'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Email</p>
                          <p className="text-sm text-muted-foreground">
                            {enrollment.profiles?.email || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Role</p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {enrollment.profiles?.role || 'Student'}
                          </p>
                        </div>
                        
                      </div>
                    </>}
                </div>;
        })}
          </div>}
      </CardContent>
      
      <AlertDialog open={!!deletingEnrollmentId} onOpenChange={() => setDeletingEnrollmentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this student from the course? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingEnrollmentId && removeStudent(deletingEnrollmentId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>;
};
export default EnrolledStudentsList;
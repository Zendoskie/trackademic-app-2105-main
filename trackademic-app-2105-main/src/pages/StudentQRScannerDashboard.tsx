import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, BookOpen } from "lucide-react";
import QRScanner from "@/components/student/QRScanner";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";

// Schema validation for QR code data
const QRSessionJoinSchema = z.object({
  type: z.literal('session_join'),
  sessionId: z.string().uuid(),
  courseId: z.string().uuid().optional(),
});

const QRSessionAttendanceSchema = z.object({
  type: z.literal('session_attendance'),
  sessionId: z.string().uuid(),
  courseId: z.string().uuid(),
});

const QRDataSchema = z.discriminatedUnion('type', [
  QRSessionJoinSchema,
  QRSessionAttendanceSchema,
]);

type QRData = z.infer<typeof QRDataSchema>;

interface Course {
  id: string;
  title: string;
  description: string | null;
  course_code: string | null;
}

export default function StudentQRScannerDashboard() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) return;

      try {
        const { data, error } = await supabase
          .from('courses')
          .select('id, title, description, course_code')
          .eq('id', courseId)
          .single();

        if (error) throw error;
        setCourse(data);
      } catch (error) {
        console.error('Error fetching course:', error);
        toast({
          title: "Error",
          description: "Failed to load course details",
          variant: "destructive",
        });
        navigate('/student-dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId, navigate, toast]);

  if (loading) {
    return (
      <div className="trackademic-container flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading course...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return null;
  }

  return (
    <div className="trackademic-container">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(`/student-dashboard/course/${courseId}`)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Course
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <BookOpen className="h-8 w-8 text-primary" />
                {course.title}
              </h1>
              <p className="text-muted-foreground">Mark your attendance by scanning the QR code</p>
            </div>
          </div>
        </div>

        {/* QR Scanner */}
        <Card className="trackademic-card">
          <CardHeader>
            <CardTitle>Scan QR Code</CardTitle>
            <CardDescription>
              Scan the QR code to join a session or mark your attendance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <QRScanner
              autoStart
              onScanSuccess={async (decodedText) => {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) {
                toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
                return;
              }

              const invalidateAttendanceQueries = (cId: string) => {
                queryClient.invalidateQueries({ queryKey: ['attendance', cId, user.id] });
                queryClient.invalidateQueries({ queryKey: ['attendance', cId, undefined] });
              };

              let qrData: QRData | null = null;
              try {
                const parsed = JSON.parse(decodedText);
                const validated = QRDataSchema.safeParse(parsed);
                if (validated.success) qrData = validated.data;
              } catch {
                // invalid JSON or schema mismatch, qrData stays null
              }

              if (qrData && (qrData.type === 'session_join' || qrData.type === 'session_attendance')) {
                const now = new Date().toISOString();
                const attendanceCourseId = qrData.courseId || courseId!;

                await supabase.from('session_participants').upsert({ session_id: qrData.sessionId, student_id: user.id, marked_present: true, marked_present_at: now }, { onConflict: 'session_id, student_id' });

                const { data: existing } = await supabase.from('attendance').select('id, time_out').eq('session_id', qrData.sessionId).eq('student_id', user.id).maybeSingle();

                if (existing) {
                  if (existing.time_out) {
                    toast({ title: "Already Timed Out", description: "You have already timed in and out for this session." });
                  } else {
                    const { error } = await supabase.from('attendance').update({ time_out: now }).eq('id', existing.id);
                    if (!error) {
                      toast({ title: "Time Out Recorded", description: "Your time out has been recorded." });
                      invalidateAttendanceQueries(attendanceCourseId);
                    }
                  }
                } else {
                  const { error } = await supabase.from('attendance').insert({ course_id: attendanceCourseId, student_id: user.id, session_id: qrData.sessionId, status: 'present', time_in: now, marked_at: now });
                  if (!error) {
                    toast({ title: "Time In Recorded", description: "You have successfully timed in. Scan again to time out." });
                    invalidateAttendanceQueries(attendanceCourseId);
                  }
                }
                return;
              }

              if (decodedText.startsWith('student-') && course.course_code === decodedText.replace('student-', '')) {
                const now = new Date().toISOString();
                const { data: existing } = await supabase.from('attendance').select('id').eq('course_id', course.id).eq('student_id', user.id).is('time_out', null).maybeSingle();

                if (existing) {
                  const { error } = await supabase.from('attendance').update({ time_out: now }).eq('id', existing.id);
                  if (!error) {
                    toast({ title: "Time Out Recorded", description: "You have successfully timed out." });
                    invalidateAttendanceQueries(course.id);
                  }
                } else {
                  const { error } = await supabase.from('attendance').insert({ student_id: user.id, course_id: course.id, status: 'present', marked_at: now, time_in: now });
                  if (!error) {
                    toast({ title: "Time In Recorded", description: "You have successfully timed in. Scan again to time out." });
                    invalidateAttendanceQueries(course.id);
                  }
                }
              } else {
                toast({ title: "Invalid QR Code", description: "This QR code is not for this course.", variant: "destructive" });
              }
            }}
            />
          </CardContent>
        </Card>
      </div>
      <MobileBottomNav />
    </div>
  );
}

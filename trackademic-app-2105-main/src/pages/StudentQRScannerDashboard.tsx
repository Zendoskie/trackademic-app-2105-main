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
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
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

        if (error) {
          toast({
            title: "Error",
            description: "Failed to load course details",
            variant: "destructive",
          });
          navigate('/student-dashboard');
          return;
        }

        setCourse(data);
      } catch (error) {
        console.error('Error fetching course:', error);
        toast({
          title: "Error",
          description: "An unexpected error occurred",
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
            <QRScanner onScanSuccess={async (decodedText) => {
              // Get current user first
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) {
                toast({
                  title: "Error",
                  description: "You must be logged in.",
                  variant: "destructive",
                });
                return;
              }

              // Try to parse and validate QR code as JSON with schema validation
              let qrData: QRData | null = null;
              try {
                const parsed = JSON.parse(decodedText);
                const validated = QRDataSchema.safeParse(parsed);
                if (validated.success) {
                  qrData = validated.data;
                }
              } catch {
                // Not valid JSON, will handle as legacy QR below
              }

              if (qrData && qrData.type === 'session_join') {
                // Join session with validated UUID
                const { error } = await supabase
                  .from('session_participants')
                  .insert({
                    session_id: qrData.sessionId,
                    student_id: user.id,
                  });

                if (error) {
                  if (error.code === '23505') {
                    toast({
                      title: "Already Joined",
                      description: "You have already joined this session.",
                    });
                  } else {
                    console.error('Error joining session:', error);
                    toast({
                      title: "Error",
                      description: "Failed to join session.",
                      variant: "destructive",
                    });
                  }
                  return;
                }

                toast({
                  title: "Session Joined",
                  description: "You have successfully joined the session!",
                });
                return;
              }

              if (qrData && qrData.type === 'session_attendance') {
                // First check if student joined the session
                const { data: participation, error: participationError } = await supabase
                  .from('session_participants')
                  .select('joined_at')
                  .eq('session_id', qrData.sessionId)
                  .eq('student_id', user.id)
                  .maybeSingle();

                if (participationError) {
                  console.error('Error checking participation:', participationError);
                  toast({
                    title: "Error",
                    description: "Failed to verify session participation.",
                    variant: "destructive",
                  });
                  return;
                }

                if (!participation) {
                  toast({
                    title: "Not in Session",
                    description: "You must join the session first before marking attendance.",
                    variant: "destructive",
                  });
                  return;
                }

                // Mark present in session_participants
                const { error: updateError } = await supabase
                  .from('session_participants')
                  .update({
                    marked_present: true,
                    marked_present_at: new Date().toISOString(),
                  })
                  .eq('session_id', qrData.sessionId)
                  .eq('student_id', user.id);

                if (updateError) {
                  console.error('Error updating participation:', updateError);
                  toast({
                    title: "Error",
                    description: "Failed to mark attendance.",
                    variant: "destructive",
                  });
                  return;
                }

                // Record attendance with time in (joined_at) and time out (now)
                const { error: attendanceError } = await supabase
                  .from('attendance')
                  .insert({
                    course_id: qrData.courseId,
                    student_id: user.id,
                    session_id: qrData.sessionId,
                    status: 'present',
                    time_in: participation.joined_at,
                    time_out: new Date().toISOString(),
                  });

                if (attendanceError) {
                  console.error('Error recording attendance:', attendanceError);
                  toast({
                    title: "Error",
                    description: "Failed to record attendance: " + attendanceError.message,
                    variant: "destructive",
                  });
                  return;
                }

                toast({
                  title: "Attendance Recorded",
                  description: "Your attendance with time in and time out has been saved!",
                });
                return;
              }

              // Handle legacy QR code format
              if (!decodedText.startsWith('student-')) {
                toast({
                  title: "Invalid QR Code",
                  description: "This QR code is not recognized.",
                  variant: "destructive",
                });
                return;
              }

              const scannedCourseCode = decodedText.replace('student-', '');
              
              if (course.course_code !== scannedCourseCode) {
                toast({
                  title: "Wrong Course",
                  description: "This QR code is for a different course.",
                  variant: "destructive",
                });
                return;
              }

              const { error } = await supabase
                .from('attendance')
                .insert({
                  student_id: user.id,
                  course_id: courseId,
                  status: 'present',
                });

              if (error) {
                console.error('Error recording attendance:', error);
                toast({
                  title: "Error",
                  description: "Failed to record attendance.",
                  variant: "destructive",
                });
                return;
              }

              toast({
                title: "Attendance Marked",
                description: "Your attendance has been successfully recorded!",
              });
            }} />
          </CardContent>
        </Card>
      </div>
      <MobileBottomNav />
    </div>
  );
}

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
            <QRScanner
              autoStart
              onScanSuccess={async (decodedText) => {
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

              // UNIFIED LOGIC FOR SESSION JOIN & ATTENDANCE
              if (qrData && (qrData.type === 'session_join' || qrData.type === 'session_attendance')) {
                const now = new Date().toISOString();

                // Step 1: Ensure student is in session_participants and marked as present
                const { data: participationData, error: participationError } = await supabase
                  .from('session_participants')
                  .upsert({
                    session_id: qrData.sessionId,
                    student_id: user.id,
                    marked_present: true,
                    marked_present_at: now,
                  }, { onConflict: 'session_id, student_id' })
                  .select('joined_at')
                  .single();

                if (participationError) {
                  console.error('Error upserting session participation:', participationError);
                  toast({
                    title: "Error",
                    description: "Failed to verify session participation.",
                    variant: "destructive",
                  });
                  return;
                }

                const timeIn = participationData?.joined_at || now;

                // Step 2: Record/Update attendance in 'attendance' table
                const attendanceCourseId = qrData.courseId || courseId;
                if (!attendanceCourseId) {
                  console.error('No courseId available for attendance record');
                  toast({
                    title: "Error",
                    description: "Could not determine the course for the attendance record.",
                    variant: "destructive",
                  });
                  return;
                }

                // Check for existing attendance record for this session
                const { data: existingAttendance, error: fetchError } = await supabase
                  .from('attendance')
                  .select('id, time_out')
                  .eq('session_id', qrData.sessionId)
                  .eq('student_id', user.id)
                  .maybeSingle();

                if (fetchError) {
                  console.error('Error fetching existing attendance record:', fetchError);
                  toast({
                    title: "Error",
                    description: "Could not verify your attendance status. Please try again.",
                    variant: "destructive",
                  });
                  return;
                }

                if (existingAttendance) {
                  // Record exists - update time_out if not yet set
                  if (existingAttendance.time_out) {
                    toast({
                      title: "Already Timed Out",
                      description: "You have already timed in and out for this session.",
                    });
                    return;
                  }

                  const { error: updateError } = await supabase
                    .from('attendance')
                    .update({ time_out: now })
                    .eq('id', existingAttendance.id);

                  if (updateError) {
                    console.error('Error recording time out:', updateError);
                    toast({
                      title: "Error",
                      description: "Failed to record your time out.",
                      variant: "destructive",
                    });
                  } else {
                    toast({
                      title: "Time Out Recorded",
                      description: "Your time out has been recorded.",
                    });
                  }
                } else {
                  // No record exists, this is a time-in action
                  const { error: insertError } = await supabase
                    .from('attendance')
                    .insert({
                      course_id: attendanceCourseId,
                      student_id: user.id,
                      session_id: qrData.sessionId,
                      status: 'present',
                      time_in: timeIn,
                      time_out: null, // Set time_out to null initially
                      marked_at: now,
                    });

                  if (insertError) {
                    console.error('Error recording time in:', insertError);
                    toast({
                      title: "Error",
                      description: "Failed to record your attendance.",
                      variant: "destructive",
                    });
                  } else {
                    toast({
                      title: "Time In Recorded",
                      description: "You have successfully timed in. Scan again to time out.",
                    });
                  }
                }
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

              const now = new Date().toISOString();

              // Check for existing 'open' attendance record for this course
              const { data: existingAttendance, error: fetchError } = await supabase
                .from('attendance')
                .select('id')
                .eq('course_id', course.id)
                .eq('student_id', user.id)
                .is('time_out', null)
                .order('time_in', { ascending: false })
                .maybeSingle();

              if (fetchError) {
                console.error('Error fetching existing legacy attendance record:', fetchError);
                toast({
                  title: "Error",
                  description: "Could not verify your attendance status. Please try again.",
                  variant: "destructive",
                });
                return;
              }

              if (existingAttendance) {
                // Record exists, this is a time-out action
                const { error: updateError } = await supabase
                  .from('attendance')
                  .update({ time_out: now })
                  .eq('id', existingAttendance.id);

                if (updateError) {
                  console.error('Error timing out (legacy):', updateError);
                  toast({
                    title: "Error",
                    description: "Failed to record your time-out.",
                    variant: "destructive",
                  });
                } else {
                  toast({
                    title: "Time Out Recorded",
                    description: "You have successfully timed out.",
                  });
                }
              } else {
                // No open record exists, this is a time-in action
                const { error: insertError } = await supabase
                  .from('attendance')
                  .insert({
                    student_id: user.id,
                    course_id: course.id,
                    status: 'present',
                    marked_at: now,
                    time_in: now,
                    time_out: null, // Set time_out to null initially
                  });

                if (insertError) {
                  console.error('Error recording attendance (legacy):', insertError);
                  toast({
                    title: "Error",
                    description: "Failed to record attendance.",
                    variant: "destructive",
                  });
                } else {
                  toast({
                    title: "Time In Recorded",
                    description: "You have successfully timed in. Scan again to time out.",
                  });
                }
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

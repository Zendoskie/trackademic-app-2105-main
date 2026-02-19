import { useState, useEffect } from "react";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";

interface Course {
  id: string;
  title: string;
  description: string | null;
  course_code: string | null;
  created_at: string;
}

const CourseQRCodeDashboard = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<'student' | 'parent' | null>(null);

  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) {
        navigate("/instructor-dashboard");
        return;
      }

      try {
        const { data, error } = await supabase
          .from('courses')
          .select('id, title, description, course_code, created_at')
          .eq('id', courseId)
          .maybeSingle();

        if (error || !data) {
          toast({
            title: "Error",
            description: "Course not found.",
            variant: "destructive",
          });
          navigate("/instructor-dashboard");
          return;
        }

        setCourse(data);
      } catch (error) {
        toast({
          title: "Error",
          description: "An unexpected error occurred.",
          variant: "destructive",
        });
        navigate("/instructor-dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId, navigate, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!course) {
    return null;
  }

  return (
    <div className="trackademic-container">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(`/instructor-dashboard/course/${courseId}`)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Course Dashboard
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <BookOpen className="h-8 w-8 text-primary" />
                {course.title} - QR Code Generator
              </h1>
              <p className="text-muted-foreground">
                Generate QR codes for student or parent enrollment
              </p>
            </div>
          </div>
        </div>

        {/* QR Code Content */}
        {!selectedRole ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="trackademic-card cursor-pointer hover:border-primary transition-colors"
                  onClick={() => setSelectedRole('student')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-6 w-6 text-primary" />
                  Student QR Code
                </CardTitle>
                <CardDescription>
                  Generate a QR code for students to enroll in this course
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button size="lg" className="w-full">
                  Generate Student QR Code
                </Button>
              </CardContent>
            </Card>

            <Card className="trackademic-card cursor-pointer hover:border-primary transition-colors"
                  onClick={() => setSelectedRole('parent')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-6 w-6 text-primary" />
                  Parent QR Code
                </CardTitle>
                <CardDescription>
                  Generate a QR code for parents to view course information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button size="lg" variant="outline" className="w-full">
                  Generate Parent QR Code
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="trackademic-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{selectedRole === 'student' ? 'Student' : 'Parent'} QR Code</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRole(null)}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Selection
                </Button>
              </CardTitle>
              <CardDescription>
                {selectedRole === 'student' 
                  ? 'Students can scan this QR code to enroll in the course'
                  : 'Parents can scan this QR code to view course information'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-8 space-y-6">
              {course.course_code && (
                <div className="bg-white p-6 rounded-lg">
                  <QRCodeSVG 
                    value={`${selectedRole}-${course.course_code}`}
                    size={300}
                    level="H"
                    includeMargin={true}
                  />
                </div>
              )}
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold">
                  {selectedRole === 'student' ? 'Student' : 'Parent'} Access Code
                </p>
                <p className="text-2xl font-mono bg-muted px-6 py-3 rounded">
                  {course.course_code}
                </p>
                <p className="text-sm text-muted-foreground mt-4">
                  Scan the QR code or enter the code manually to access the course
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <MobileBottomNav />
    </div>
  );
};

export default CourseQRCodeDashboard;

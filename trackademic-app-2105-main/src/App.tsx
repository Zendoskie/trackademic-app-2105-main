import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import StudentDashboard from "./pages/StudentDashboard";
import ParentDashboard from "./pages/ParentDashboard";
import ParentStudentView from "./pages/ParentStudentView";
import ParentStudentCourseDashboard from "./pages/ParentStudentCourseDashboard";
import ParentStudentAttendanceDashboard from "./pages/ParentStudentAttendanceDashboard";
import ParentStudentActivitiesDashboard from "./pages/ParentStudentActivitiesDashboard";
import StudentCourseDashboard from "./pages/StudentCourseDashboard";
import StudentActivitiesDashboard from "./pages/StudentActivitiesDashboard";
import StudentScoresDashboard from "./pages/StudentScoresDashboard";
import StudentScoresOverview from "./pages/StudentScoresOverview";
import StudentAttendanceHistoryDashboard from "./pages/StudentAttendanceHistoryDashboard";
import StudentQRScannerDashboard from "./pages/StudentQRScannerDashboard";
import InstructorDashboard from "./pages/InstructorDashboard";
import CourseDashboard from "./pages/CourseDashboard";
import CourseStudentsDashboard from "./pages/CourseStudentsDashboard";
import CourseAttendanceDashboard from "./pages/CourseAttendanceDashboard";
import InstructorStudentAttendanceDashboard from "./pages/InstructorStudentAttendanceDashboard";
import CourseQRCodeDashboard from "./pages/CourseQRCodeDashboard";
import ActivitiesDashboard from "./pages/ActivitiesDashboard";
import SubmissionsDashboardPage from "./pages/SubmissionsDashboard";
import SessionDashboard from "./pages/SessionDashboard";
import AlertsPage from "./pages/AlertsPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";
import BackButtonHandler from "./components/navigation/BackButtonHandler";

const queryClient = new QueryClient();

const App = () => (
  <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <BackButtonHandler />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/student-dashboard" element={<StudentDashboard />} />
            <Route path="/student-dashboard/scores" element={<StudentScoresOverview />} />
            <Route path="/student-dashboard/alerts" element={<AlertsPage />} />
            <Route path="/student-dashboard/profile" element={<ProfilePage />} />
            <Route path="/student-dashboard/settings" element={<SettingsPage />} />
            <Route path="/student-dashboard/course/:courseId" element={<StudentCourseDashboard />} />
            <Route path="/student-dashboard/course/:courseId/attendance" element={<StudentAttendanceHistoryDashboard />} />
            <Route path="/student-dashboard/course/:courseId/qr-scanner" element={<StudentQRScannerDashboard />} />
            <Route path="/student-dashboard/course/:courseId/activities" element={<StudentActivitiesDashboard />} />
            <Route path="/student-dashboard/course/:courseId/scores" element={<StudentScoresDashboard />} />
            <Route path="/instructor-dashboard" element={<InstructorDashboard />} />
            <Route path="/instructor-dashboard/scores" element={<Navigate to="/instructor-dashboard" replace />} />
            <Route path="/instructor-dashboard/alerts" element={<AlertsPage />} />
            <Route path="/instructor-dashboard/profile" element={<ProfilePage />} />
            <Route path="/instructor-dashboard/course/:courseId" element={<CourseDashboard />} />
            <Route path="/instructor-dashboard/course/:courseId/students" element={<CourseStudentsDashboard />} />
            <Route path="/instructor-dashboard/course/:courseId/attendance" element={<CourseAttendanceDashboard />} />
            <Route path="/instructor-dashboard/course/:courseId/attendance/:studentId" element={<InstructorStudentAttendanceDashboard />} />
            <Route path="/instructor-dashboard/course/:courseId/qr-code" element={<CourseQRCodeDashboard />} />
            <Route path="/instructor-dashboard/course/:courseId/activities" element={<ActivitiesDashboard />} />
            <Route path="/instructor-dashboard/course/:courseId/submissions" element={<SubmissionsDashboardPage />} />
            <Route path="/instructor-dashboard/course/:courseId/sessions" element={<SessionDashboard />} />
            <Route path="/parent-dashboard" element={<ParentDashboard />} />
            <Route path="/parent-dashboard/scores" element={<Navigate to="/parent-dashboard" replace />} />
            <Route path="/parent-dashboard/alerts" element={<AlertsPage />} />
            <Route path="/parent-dashboard/profile" element={<ProfilePage />} />
            <Route path="/parent-dashboard/student/:studentId" element={<ParentStudentView />} />
            <Route path="/parent-dashboard/student/:studentId/course/:courseId" element={<ParentStudentCourseDashboard />} />
            <Route path="/parent-dashboard/student/:studentId/course/:courseId/attendance" element={<ParentStudentAttendanceDashboard />} />
            <Route path="/parent-dashboard/student/:studentId/course/:courseId/activities" element={<ParentStudentActivitiesDashboard />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </NextThemesProvider>
);

export default App;

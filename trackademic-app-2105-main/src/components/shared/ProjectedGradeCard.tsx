import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap } from "lucide-react";
import { ProjectedGradeData } from "@/hooks/useProjectedGrade";

interface ProjectedGradeCardProps {
  data: ProjectedGradeData;
  courseTitle?: string;
}

export function ProjectedGradeCard({ data, courseTitle }: ProjectedGradeCardProps) {
  const { percentage, letterGrade, activitiesScore, attendanceScore, activitiesEarned, activitiesTotal, presentCount, totalAttendance, isLoading } = data;

  if (isLoading) {
    return (
      <Card className="trackademic-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="h-5 w-5 text-primary" />
            Projected Grade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasData = activitiesTotal > 0 || totalAttendance > 0;
  const gradeColor =
    letterGrade === "A"
      ? "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400"
      : letterGrade === "B"
      ? "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
      : letterGrade === "C"
      ? "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400"
      : letterGrade === "D"
      ? "text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400"
      : letterGrade === "F"
      ? "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400"
      : "text-muted-foreground bg-muted";

  return (
    <Card className="trackademic-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <GraduationCap className="h-5 w-5 text-primary" />
          Projected Grade
        </CardTitle>
        <CardDescription>
          Based on activities (70%) and attendance (30%)
          {courseTitle && ` in ${courseTitle}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="text-sm text-muted-foreground py-4">
            No activities or attendance records yet. Complete activities and attend sessions to see your projected grade.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Overall</p>
                <p className="text-2xl font-bold">{percentage.toFixed(1)}%</p>
              </div>
              <Badge className={`text-lg px-4 py-1.5 ${gradeColor}`}>
                {letterGrade}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Activities</p>
                <p className="text-sm font-medium">
                  {activitiesEarned} / {activitiesTotal} pts
                </p>
                <p className="text-xs text-muted-foreground">{activitiesScore.toFixed(0)}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Attendance</p>
                <p className="text-sm font-medium">
                  {presentCount} / {totalAttendance} present
                </p>
                <p className="text-xs text-muted-foreground">{attendanceScore.toFixed(0)}%</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

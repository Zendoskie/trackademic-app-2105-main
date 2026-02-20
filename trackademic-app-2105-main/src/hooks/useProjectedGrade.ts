import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ProjectedGradeData {
  percentage: number;
  letterGrade: string;
  activitiesScore: number; // 0-100
  attendanceScore: number; // 0-100
  activitiesEarned: number;
  activitiesTotal: number;
  presentCount: number;
  totalAttendance: number;
  isLoading: boolean;
}

const ACTIVITIES_WEIGHT = 0.7;
const ATTENDANCE_WEIGHT = 0.3;

function percentageToLetter(percentage: number): string {
  if (percentage >= 90) return "A";
  if (percentage >= 80) return "B";
  if (percentage >= 70) return "C";
  if (percentage >= 60) return "D";
  return "F";
}

/**
 * Fetches and computes projected grade for a student in a course.
 * Based on activities (awarded points) and attendance (present/absent).
 */
export function useProjectedGrade(courseId: string | undefined, studentId: string | undefined): ProjectedGradeData {
  const [data, setData] = useState<ProjectedGradeData>({
    percentage: 0,
    letterGrade: "-",
    activitiesScore: 0,
    attendanceScore: 0,
    activitiesEarned: 0,
    activitiesTotal: 0,
    presentCount: 0,
    totalAttendance: 0,
    isLoading: true,
  });

  useEffect(() => {
    if (!courseId || !studentId) {
      setData((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      try {
        const [activitiesRes, submissionsRes, attendanceRes] = await Promise.all([
          supabase
            .from("activity_files")
            .select("id, points")
            .eq("course_id", courseId)
            .eq("category", "activity"),
          supabase
            .from("activity_submissions")
            .select("awarded_points, activity_file_id, activity_files(points)")
            .eq("course_id", courseId)
            .eq("student_id", studentId),
          supabase
            .from("attendance")
            .select("status")
            .eq("course_id", courseId)
            .eq("student_id", studentId),
        ]);

        if (cancelled) return;

        // Activities: sum of max points from activity_files
        const activities = activitiesRes.data || [];
        const activitiesTotal = activities.reduce((sum, a) => sum + (a.points ?? 0), 0);

        // Submissions: sum of awarded_points (use 0 if null for ungraded)
        const submissions = submissionsRes.data || [];
        const activitiesEarned = submissions.reduce((sum, s) => sum + (s.awarded_points ?? 0), 0);

        const activitiesScore = activitiesTotal > 0
          ? Math.min(100, (activitiesEarned / activitiesTotal) * 100)
          : 0;

        // Attendance: present / total
        const attendanceRecords = attendanceRes.data || [];
        const totalAttendance = attendanceRecords.length;
        const presentCount = attendanceRecords.filter((r) => r.status === "present").length;
        const attendanceScore = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0;

        const percentage = activitiesTotal > 0 || totalAttendance > 0
          ? activitiesScore * ACTIVITIES_WEIGHT + attendanceScore * ATTENDANCE_WEIGHT
          : 0;
        const letterGrade = percentage > 0 ? percentageToLetter(percentage) : "-";

        setData({
          percentage,
          letterGrade,
          activitiesScore,
          attendanceScore,
          activitiesEarned,
          activitiesTotal,
          presentCount,
          totalAttendance,
          isLoading: false,
        });
      } catch {
        if (!cancelled) {
          setData((prev) => ({ ...prev, isLoading: false }));
        }
      }
    };

    setData((prev) => ({ ...prev, isLoading: true }));
    fetchData();
    return () => { cancelled = true; };
  }, [courseId, studentId]);

  return data;
}

/**
 * Batch fetch projected grades for multiple students in a course (for instructor view).
 */
export async function fetchProjectedGradesForStudents(
  courseId: string,
  studentIds: string[]
): Promise<Record<string, ProjectedGradeData>> {
  if (studentIds.length === 0) return {};

  const [activitiesRes, submissionsRes, attendanceRes] = await Promise.all([
    supabase
      .from("activity_files")
      .select("id, points")
      .eq("course_id", courseId)
      .eq("category", "activity"),
    supabase
      .from("activity_submissions")
      .select("student_id, awarded_points, activity_file_id, activity_files(points)")
      .eq("course_id", courseId)
      .in("student_id", studentIds),
    supabase
      .from("attendance")
      .select("student_id, status")
      .eq("course_id", courseId)
      .in("student_id", studentIds),
  ]);

  const activities = activitiesRes.data || [];
  const activitiesTotal = activities.reduce((sum, a) => sum + (a.points ?? 0), 0);

  const submissionsByStudent: Record<string, number> = {};
  for (const s of submissionsRes.data || []) {
    const sid = s.student_id;
    if (!submissionsByStudent[sid]) submissionsByStudent[sid] = 0;
    submissionsByStudent[sid] += s.awarded_points ?? 0;
  }

  const attendanceByStudent: Record<string, { present: number; total: number }> = {};
  for (const r of attendanceRes.data || []) {
    const sid = r.student_id;
    if (!attendanceByStudent[sid]) attendanceByStudent[sid] = { present: 0, total: 0 };
    attendanceByStudent[sid].total++;
    if (r.status === "present") attendanceByStudent[sid].present++;
  }

  const result: Record<string, ProjectedGradeData> = {};
  for (const sid of studentIds) {
    const earned = submissionsByStudent[sid] ?? 0;
    const { present, total } = attendanceByStudent[sid] ?? { present: 0, total: 0 };
    const activitiesScore = activitiesTotal > 0 ? Math.min(100, (earned / activitiesTotal) * 100) : 0;
    const attendanceScore = total > 0 ? (present / total) * 100 : 0;
    const percentage = activitiesTotal > 0 || total > 0
      ? activitiesScore * ACTIVITIES_WEIGHT + attendanceScore * ATTENDANCE_WEIGHT
      : 0;
    const letterGrade = percentage > 0 ? percentageToLetter(percentage) : "-";

    result[sid] = {
      percentage,
      letterGrade,
      activitiesScore,
      attendanceScore,
      activitiesEarned: earned,
      activitiesTotal,
      presentCount: present,
      totalAttendance: total,
      isLoading: false,
    };
  }
  return result;
}

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Square, QrCode, Users, Clock, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { SessionQRDialog } from "./SessionQRDialog";
import { SessionParticipantsList } from "./SessionParticipantsList";

interface Session {
  id: string;
  course_id: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  created_at: string;
}

interface SessionManagerProps {
  courseId: string;
}

export const SessionManager = ({ courseId }: SessionManagerProps) => {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showJoinQR, setShowJoinQR] = useState(false);
  const [showAttendanceQR, setShowAttendanceQR] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSessions(data || []);
      const active = data?.find(s => s.status === 'active');
      setActiveSession(active || null);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();

    // Set up realtime subscription for session participants
    const channel = supabase
      .channel('session-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_participants'
        },
        () => {
          fetchSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [courseId]);

  const startNewSession = async () => {
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          course_id: courseId,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      setActiveSession(data);
      setSessions(prev => [data, ...prev]);
      setShowJoinQR(true);
      
      toast({
        title: "Session Started",
        description: "Students can now scan the QR code to join.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start session.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const startFinalizing = () => {
    setIsFinalizing(true);
    setShowAttendanceQR(true);
  };

  const completeSession = async () => {
    if (!activeSession) return;

    try {
      // Update session status to ended
      const { error } = await supabase
        .from('sessions')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString()
        })
        .eq('id', activeSession.id);

      if (error) throw error;

      // Get count of students who marked attendance
      const { data: attendanceCount } = await supabase
        .from('session_participants')
        .select('id', { count: 'exact' })
        .eq('session_id', activeSession.id)
        .eq('marked_present', true);

      setActiveSession(null);
      setIsFinalizing(false);
      setShowAttendanceQR(false);
      fetchSessions();
      
      toast({
        title: "Session Completed",
        description: `Attendance recorded for ${attendanceCount?.length || 0} students.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to complete session.",
        variant: "destructive",
      });
    }
  };

  const cancelFinalizing = () => {
    setIsFinalizing(false);
    setShowAttendanceQR(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Session Card */}
      <Card className={activeSession ? "border-primary" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Current Session
            </span>
            {activeSession && (
              <Badge variant="default" className="bg-green-500">
                Active
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeSession ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Started at {format(new Date(activeSession.started_at), 'PPp')}
              </p>
              
              <div className="flex flex-wrap gap-2">
                {!isFinalizing ? (
                  <>
                    <Button onClick={() => setShowJoinQR(true)} variant="outline">
                      <QrCode className="h-4 w-4 mr-2" />
                      Show Join QR
                    </Button>
                    <Button onClick={startFinalizing} variant="destructive">
                      <Square className="h-4 w-4 mr-2" />
                      Finalize Session
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={() => setShowAttendanceQR(true)} variant="outline">
                      <QrCode className="h-4 w-4 mr-2" />
                      Show Attendance QR
                    </Button>
                    <Button onClick={completeSession} variant="destructive">
                      <Check className="h-4 w-4 mr-2" />
                      Complete & End Session
                    </Button>
                    <Button onClick={cancelFinalizing} variant="ghost">
                      Cancel
                    </Button>
                  </>
                )}
              </div>
              
              {isFinalizing && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Finalizing Session:</strong> Students should now scan the Attendance QR code to record their attendance with time in/out. Click "Complete & End Session" when done.
                  </p>
                </div>
              )}

              <SessionParticipantsList sessionId={activeSession.id} />
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4">No active session</p>
              <Button onClick={startNewSession} disabled={creating}>
                <Play className="h-4 w-4 mr-2" />
                {creating ? "Starting..." : "Start New Session"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Session History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.filter(s => s.status === 'ended').length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No past sessions yet
            </p>
          ) : (
            <div className="space-y-2">
              {sessions
                .filter(s => s.status === 'ended')
                .map(session => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {format(new Date(session.started_at), 'PPP')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(session.started_at), 'p')} - {session.ended_at ? format(new Date(session.ended_at), 'p') : 'N/A'}
                      </p>
                    </div>
                    <Badge variant="secondary">Ended</Badge>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Dialogs */}
      {activeSession && (
        <>
          <SessionQRDialog
            open={showJoinQR}
            onOpenChange={setShowJoinQR}
            sessionId={activeSession.id}
            courseId={courseId}
            type="join"
          />
          <SessionQRDialog
            open={showAttendanceQR}
            onOpenChange={setShowAttendanceQR}
            sessionId={activeSession.id}
            courseId={courseId}
            type="attendance"
          />
        </>
      )}
    </div>
  );
};

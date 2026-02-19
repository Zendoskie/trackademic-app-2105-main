import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { User, Check, Clock } from "lucide-react";

interface Participant {
  id: string;
  student_id: string;
  joined_at: string;
  marked_present: boolean;
  marked_present_at: string | null;
  student_name?: string;
  student_email?: string;
}

interface SessionParticipantsListProps {
  sessionId: string;
}

export const SessionParticipantsList = ({ sessionId }: SessionParticipantsListProps) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('session_participants')
        .select(`
          id,
          student_id,
          joined_at,
          marked_present,
          marked_present_at
        `)
        .eq('session_id', sessionId)
        .order('joined_at', { ascending: true });

      if (error) throw error;

      // Fetch student profiles
      if (data && data.length > 0) {
        const studentIds = data.map(p => p.student_id);
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', studentIds);

        if (!profileError && profiles) {
          const participantsWithNames = data.map(p => {
            const profile = profiles.find(pr => pr.id === p.student_id);
            return {
              ...p,
              student_name: profile?.full_name || 'Unknown',
              student_email: profile?.email || '',
            };
          });
          setParticipants(participantsWithNames);
        } else {
          setParticipants(data);
        }
      } else {
        setParticipants([]);
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants();

    // Realtime subscription
    const channel = supabase
      .channel(`session-participants-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_participants',
          filter: `session_id=eq.${sessionId}`
        },
        () => {
          fetchParticipants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (participants.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No students have joined yet
      </div>
    );
  }

  return (
    <div className="space-y-2 mt-4">
      <h4 className="font-medium flex items-center gap-2">
        <User className="h-4 w-4" />
        Participants ({participants.length})
      </h4>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {participants.map(participant => (
          <div
            key={participant.id}
            className="flex items-center justify-between p-3 bg-muted rounded-lg"
          >
            <div>
              <p className="font-medium">{participant.student_name}</p>
              <p className="text-sm text-muted-foreground">
                Joined at {format(new Date(participant.joined_at), 'p')}
              </p>
            </div>
            {participant.marked_present ? (
              <Badge className="bg-green-500">
                <Check className="h-3 w-3 mr-1" />
                Present
              </Badge>
            ) : (
              <Badge variant="secondary">
                <Clock className="h-3 w-3 mr-1" />
                Waiting
              </Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

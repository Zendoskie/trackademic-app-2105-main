import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";

interface SessionQRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  courseId: string;
  type: 'join' | 'attendance';
}

export const SessionQRDialog = ({
  open,
  onOpenChange,
  sessionId,
  courseId,
  type,
}: SessionQRDialogProps) => {
  // Create a QR code value that includes session info
  const qrValue = JSON.stringify({
    type: type === 'join' ? 'session_join' : 'session_attendance',
    sessionId,
    courseId,
    timestamp: Date.now(),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {type === 'join' ? 'Session Join QR Code' : 'Attendance QR Code'}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="bg-white p-4 rounded-lg">
            <QRCodeSVG value={qrValue} size={250} />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            {type === 'join'
              ? 'Students scan this to join the session'
              : 'Students scan this to mark attendance'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

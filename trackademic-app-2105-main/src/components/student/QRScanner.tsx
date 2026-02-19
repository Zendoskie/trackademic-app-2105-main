import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QRScannerProps {
  onScanSuccess?: (decodedText: string) => void;
}

type ScannerError = 'permission_denied' | 'permission_dismissed' | 'no_camera' | 'in_use' | 'generic' | null;

function isPermissionError(err: any): boolean {
  const msg = String(err?.message || err?.name || err || '').toLowerCase();
  return (
    msg.includes('notallowederror') ||
    msg.includes('permission denied') ||
    msg.includes('permission dismissed') ||
    msg.includes('not allowed')
  );
}

function isNoCameraError(err: any): boolean {
  const msg = String(err?.message || err?.name || err || '').toLowerCase();
  return msg.includes('notfounderror') || msg.includes('device not found');
}

function isInUseError(err: any): boolean {
  const msg = String(err?.message || err?.name || err || '').toLowerCase();
  return msg.includes('notreadableerror') || msg.includes('could not start video');
}

export default function QRScanner({ onScanSuccess }: QRScannerProps) {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [scannerError, setScannerError] = useState<ScannerError>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const qrCodeRegionId = "qr-reader-region";

  const stopScanning = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) {
          await scannerRef.current.stop();
        }
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
    setIsStarting(false);
  }, []);

  const resetScannerDiv = () => {
    if (!containerRef.current) return false;
    containerRef.current.innerHTML = '';
    const div = document.createElement('div');
    div.id = qrCodeRegionId;
    containerRef.current.appendChild(div);
    return true;
  };

  const handleStartScanner = () => {
    setScannerError(null);
    setIsStarting(true);
    // Delay so React can update UI before we request camera access
    setTimeout(() => startScanning(), 200);
  };

  const startScanning = async () => {
    if (scannerRef.current) {
      await stopScanning();
    }

    if (!resetScannerDiv()) {
      setScannerError('generic');
      setIsStarting(false);
      return;
    }

    const scanConfig = {
      fps: 10,
      qrbox: { width: 220, height: 220 },
      aspectRatio: 1.0,
    };

    const onSuccess = (decodedText: string) => {
      toast({ title: "QR Code Scanned", description: "Processing scan..." });
      onScanSuccess?.(decodedText);
      stopScanning();
    };

    const onError = () => {}; // Suppress per-frame scan errors

    // Camera constraint attempts in order of preference:
    // 1. ideal: environment  → works on most Android & iOS
    // 2. facingMode: user    → front camera fallback
    // 3. bare true           → let browser pick any camera (last resort)
    const cameraConstraints: Array<string | MediaTrackConstraints> = [
      { facingMode: { ideal: "environment" } } as MediaTrackConstraints,
      { facingMode: "user" } as MediaTrackConstraints,
    ];

    let lastError: any = null;

    for (const constraint of cameraConstraints) {
      if (!resetScannerDiv()) break;

      try {
        const html5QrCode = new Html5Qrcode(qrCodeRegionId);
        scannerRef.current = html5QrCode;
        await html5QrCode.start(constraint, scanConfig, onSuccess, onError);
        // Success!
        setIsScanning(true);
        setIsStarting(false);
        return;
      } catch (err: any) {
        console.error("Camera attempt failed:", constraint, err);
        lastError = err;
        scannerRef.current = null;

        // If it's a permission error, no point trying other cameras
        if (isPermissionError(err)) {
          break;
        }
      }
    }

    // All attempts failed — classify the error
    setIsScanning(false);
    setIsStarting(false);

    if (isPermissionError(lastError)) {
      const msg = String(lastError?.message || '').toLowerCase();
      setScannerError(msg.includes('dismissed') ? 'permission_dismissed' : 'permission_denied');
    } else if (isNoCameraError(lastError)) {
      setScannerError('no_camera');
    } else if (isInUseError(lastError)) {
      setScannerError('in_use');
    } else {
      setScannerError('generic');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          if (state === 2) scannerRef.current.stop().catch(() => {});
        } catch { /* ignore */ }
        scannerRef.current = null;
      }
    };
  }, []);

  const errorConfigs: Record<NonNullable<ScannerError>, { title: string; description: string; buttonLabel: string }> = {
    permission_dismissed: {
      title: "Camera Permission Required",
      description: "Please tap the button below, then tap 'Allow' when your browser asks for camera access.",
      buttonLabel: "Try Again",
    },
    permission_denied: {
      title: "Camera Access Denied",
      description: "Camera access is blocked. Go to your phone's Settings → Browser → Camera and allow access for this site, then try again.",
      buttonLabel: "Try Again",
    },
    no_camera: {
      title: "No Camera Found",
      description: "No camera was detected on this device.",
      buttonLabel: "Retry",
    },
    in_use: {
      title: "Camera In Use",
      description: "Your camera is being used by another app. Close it and try again.",
      buttonLabel: "Try Again",
    },
    generic: {
      title: "Camera Error",
      description: "Unable to access the camera. Make sure you are using HTTPS and that your browser supports camera access, then try again.",
      buttonLabel: "Try Again",
    },
  };

  return (
    <Card className="trackademic-card">
      <CardHeader>
        <CardTitle>QR Code Scanner</CardTitle>
        <CardDescription>
          Scan the QR code displayed by your instructor to mark attendance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {scannerError ? (
          <div className="flex flex-col items-center gap-4 py-6 px-4 text-center">
            <div className="rounded-full bg-destructive/10 p-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">{errorConfigs[scannerError].title}</p>
              <p className="text-sm text-muted-foreground">{errorConfigs[scannerError].description}</p>
            </div>
            <Button onClick={handleStartScanner} className="gap-2" type="button">
              <RefreshCw size={18} />
              {errorConfigs[scannerError].buttonLabel}
            </Button>
          </div>
        ) : (
          <>
            {/* IMPORTANT: No React-managed children here — html5-qrcode owns this DOM node */}
            <div
              ref={containerRef}
              className="w-full max-w-md mx-auto rounded-lg overflow-hidden bg-muted min-h-[300px]"
              style={{ border: "2px solid hsl(var(--primary))" }}
            />

            {!isScanning && !isStarting && (
              <p className="text-muted-foreground text-center text-sm">
                Tap "Start Scanner" and allow camera access when prompted
              </p>
            )}

            <div className="flex justify-center">
              {!isScanning && !isStarting ? (
                <Button onClick={handleStartScanner} className="gap-2" type="button" size="lg">
                  <Camera size={20} />
                  Start Scanner
                </Button>
              ) : isStarting ? (
                <Button disabled className="gap-2" size="lg">
                  <Loader2 size={20} className="animate-spin" />
                  Starting Camera...
                </Button>
              ) : (
                <Button onClick={stopScanning} variant="destructive" className="gap-2" type="button" size="lg">
                  <CameraOff size={20} />
                  Stop Scanner
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

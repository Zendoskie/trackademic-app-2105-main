import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { useState } from "react";

type PreviewKind = "iframe" | "image";

interface FilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  url: string;
  kind?: PreviewKind;
  downloadUrl?: string;
}

export function FilePreviewDialog({
  open,
  onOpenChange,
  title,
  url,
  kind = "iframe",
  downloadUrl
}: FilePreviewDialogProps) {
  const [zoomLevel, setZoomLevel] = useState(1);

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  const handleOpenExternal = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Reset zoom when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setZoomLevel(1);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl h-[90vh] max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
          <DialogTitle className="truncate text-sm sm:text-base pr-2">
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-muted/20 relative">
          {kind === "image" ? (
            <div className="w-full h-full flex items-center justify-center p-2 overflow-auto">
              <img 
                src={url} 
                alt={`Preview of ${title}`} 
                className="max-w-full max-h-full object-contain transition-transform duration-200 cursor-zoom-in" 
                style={{ transform: `scale(${zoomLevel})` }}
                loading="lazy" 
              />
            </div>
          ) : (
            <div className="w-full h-full flex flex-col">
              <iframe 
                title={`Preview of ${title}`} 
                src={url} 
                className="w-full flex-1 border-0" 
                style={{ minHeight: "100%" }} 
              />
              <div className="p-2 bg-muted/50 text-center text-xs text-muted-foreground sm:hidden">
                Having trouble viewing? Tap <strong>Open</strong> below.
              </div>
            </div>
          )}
          
          {/* Zoom controls for images */}
          {kind === "image" && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-background/90 backdrop-blur-sm rounded-full px-2 py-1 shadow-lg border">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.5}
                className="h-8 w-8"
                title="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs font-medium min-w-[3rem] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 3}
                className="h-8 w-8"
                title="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleResetZoom}
                className="h-8 w-8"
                title="Reset zoom"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Bottom right action button for iframe */}
          {kind === "iframe" && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleOpenExternal} 
              className="absolute bottom-4 right-4 h-8 px-3 shadow-lg bg-background" 
              title="Open in new tab"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="ml-1">Open</span>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface ActivityFileUploadProps {
  courseId: string;
  onUploadSuccess: () => void;
}

const ActivityFileUpload = ({ courseId, onUploadSuccess }: ActivityFileUploadProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState<string>("");
  const [deadline, setDeadline] = useState<Date | undefined>(undefined);
  const [deadlineTime, setDeadlineTime] = useState<string>("23:59");
  const [category, setCategory] = useState<"lecture" | "activity">("activity");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to upload files.",
          variant: "destructive",
        });
        return;
      }

      // Upload file to storage
      const filePath = `${courseId}/${Date.now()}-${selectedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('course-activities')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Save file metadata to database
      const pointsValue = points.trim() !== "" ? parseInt(points, 10) : null;
      
      // Combine deadline date and time
      let deadlineValue: string | null = null;
      if (deadline) {
        const [hours, minutes] = deadlineTime.split(":").map(Number);
        const deadlineDate = new Date(deadline);
        deadlineDate.setHours(hours, minutes, 0, 0);
        deadlineValue = deadlineDate.toISOString();
      }
      
      const { error: dbError } = await supabase
        .from('activity_files')
        .insert({
          course_id: courseId,
          file_name: selectedFile.name,
          file_path: filePath,
          file_size: selectedFile.size,
          file_type: selectedFile.type,
          uploaded_by: user.id,
          description: description || null,
          points: category === "activity" ? pointsValue : null,
          deadline: category === "activity" ? deadlineValue : null,
          category: category,
        });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "File uploaded successfully.",
      });

      setSelectedFile(null);
      setDescription("");
      setPoints("");
      setDeadline(undefined);
      setDeadlineTime("23:59");
      setCategory("activity");
      onUploadSuccess();
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "An error occurred while uploading the file.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4 p-6 border rounded-lg bg-card">
      <div className="space-y-2">
        <Label>File Type</Label>
        <RadioGroup
          value={category}
          onValueChange={(value) => setCategory(value as "lecture" | "activity")}
          className="flex gap-4"
          disabled={uploading}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="lecture" id="lecture" />
            <Label htmlFor="lecture" className="font-normal cursor-pointer">Lecture</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="activity" id="activity" />
            <Label htmlFor="activity" className="font-normal cursor-pointer">Activity / Assignment</Label>
          </div>
        </RadioGroup>
        <p className="text-xs text-muted-foreground">
          {category === "lecture" 
            ? "Lectures are view-only materials. Students cannot submit files for lectures."
            : "Activities allow students to submit files and can have points and deadlines."}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="file-upload">Select File</Label>
        <Input
          id="file-upload"
          type="file"
          onChange={handleFileSelect}
          disabled={uploading}
        />
        {selectedFile && (
          <p className="text-sm text-muted-foreground">
            Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
          </p>
        )}
      </div>

      {category === "activity" && (
        <div className="space-y-2">
          <Label htmlFor="points">Points (Optional)</Label>
          <Input
            id="points"
            type="number"
            min="0"
            placeholder="e.g., 100"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            disabled={uploading}
          />
          <p className="text-xs text-muted-foreground">
            Maximum points a student can earn for this activity
          </p>
        </div>
      )}

      {category === "activity" && (
        <div className="space-y-2">
          <Label>Deadline (Optional)</Label>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 justify-start text-left font-normal",
                    !deadline && "text-muted-foreground"
                  )}
                  disabled={uploading}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deadline ? format(deadline, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={deadline}
                  onSelect={setDeadline}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <Input
              type="time"
              value={deadlineTime}
              onChange={(e) => setDeadlineTime(e.target.value)}
              disabled={uploading || !deadline}
              className="w-28"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Students who submit after this deadline will be marked as late
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          placeholder="Add a description for this file..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={uploading}
        />
      </div>

      <Button
        onClick={handleUpload}
        disabled={!selectedFile || uploading}
        className="w-full"
      >
        <Upload className="h-4 w-4 mr-2" />
        {uploading ? "Uploading..." : "Upload File"}
      </Button>
    </div>
  );
};

export default ActivityFileUpload;

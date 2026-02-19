import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";

interface ActivitySubmissionFormProps {
  activityFileId: string;
  courseId: string;
  onSubmitSuccess: () => void;
}

const ActivitySubmissionForm = ({ activityFileId, courseId, onSubmitSuccess }: ActivitySubmissionFormProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file to submit",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `${user.id}/${courseId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('activity-submissions')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('activity_submissions')
        .insert({
          activity_file_id: activityFileId,
          student_id: user.id,
          course_id: courseId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          description: description || null,
        });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Activity submitted successfully",
      });

      setFile(null);
      setDescription("");
      onSubmitSuccess();
    } catch (error) {
      console.error("Error submitting activity:", error);
      toast({
        title: "Error",
        description: "Failed to submit activity",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="file">Upload File</Label>
        <Input
          id="file"
          type="file"
          onChange={handleFileChange}
          disabled={uploading}
          className="mt-2"
        />
      </div>

      <div>
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add any notes about your submission..."
          disabled={uploading}
          className="mt-2"
        />
      </div>

      <Button type="submit" disabled={uploading || !file} className="w-full gap-2">
        <Upload className="h-4 w-4" />
        {uploading ? "Submitting..." : "Submit Activity"}
      </Button>
    </form>
  );
};

export default ActivitySubmissionForm;

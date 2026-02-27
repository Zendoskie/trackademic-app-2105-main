import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Plus, X, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

interface AuthFormProps {
  mode: "signin" | "signup";
  role: "student" | "parent" | "instructor";
}

interface StudentValidation {
  username: string;
  isValid: boolean | null;
  isChecking: boolean;
  studentId: string | null;
  studentName: string | null;
}

export const AuthForm = ({ mode, role }: AuthFormProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    username: "", // For students
  });
  const [studentUsernames, setStudentUsernames] = useState<StudentValidation[]>([
    { username: "", isValid: null, isChecking: false, studentId: null, studentName: null }
  ]);
  const { toast } = useToast();
  const navigate = useNavigate();

  const validateStudentName = async (index: number, name: string) => {
    if (!name.trim()) {
      setStudentUsernames(prev => prev.map((s, i) => 
        i === index ? { ...s, username: name, isValid: null, studentId: null, studentName: null } : s
      ));
      return;
    }

    setStudentUsernames(prev => prev.map((s, i) => 
      i === index ? { ...s, username: name, isChecking: true } : s
    ));

    try {
      const { data, error } = await supabase.rpc('get_student_by_name', { 
        p_name: name.trim() 
      });

      if (error) throw error;

      const student = data?.[0];
      setStudentUsernames(prev => prev.map((s, i) => 
        i === index ? { 
          ...s, 
          username: name,
          isValid: !!student,
          isChecking: false,
          studentId: student?.id || null,
          studentName: student?.full_name || null
        } : s
      ));
    } catch (error) {
      setStudentUsernames(prev => prev.map((s, i) => 
        i === index ? { ...s, username: name, isValid: false, isChecking: false, studentId: null, studentName: null } : s
      ));
    }
  };

  const addStudentField = () => {
    if (studentUsernames.length < 4) {
      setStudentUsernames(prev => [...prev, { username: "", isValid: null, isChecking: false, studentId: null, studentName: null }]);
    }
  };

  const removeStudentField = (index: number) => {
    if (studentUsernames.length > 1) {
      setStudentUsernames(prev => prev.filter((_, i) => i !== index));
    }
  };

  const checkUsernameAvailability = async (name: string): Promise<boolean> => {
    // Use SECURITY DEFINER RPC so this works even before the user is authenticated.
    // Student "Name" is stored in profiles.full_name and is used for parent linking.
    const { data, error } = await supabase.rpc('get_student_by_name', {
      p_name: name.trim(),
    });

    if (error) return false;

    const student = data?.[0];
    return !student;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation schema
    const baseSchema = z.object({
      email: z.string().trim().email("Enter a valid email"),
      password: z.string().min(8, "Password must be at least 8 characters"),
    });

    const studentSignupSchema = baseSchema
      .extend({
        confirmPassword: z.string().min(1, "Confirm your password"),
        username: z.string().trim().min(3, "Name must be at least 3 characters").max(100, "Name must be less than 100 characters"),
      })
      .refine((data) => data.password === data.confirmPassword, {
        path: ["confirmPassword"],
        message: "Passwords do not match.",
      });

    const signupSchema = baseSchema
      .extend({
        fullName: z.string().trim().min(1, "Full name is required").max(100),
        confirmPassword: z.string().min(1, "Confirm your password"),
      })
      .refine((data) => data.password === data.confirmPassword, {
        path: ["confirmPassword"],
        message: "Passwords do not match.",
      });

    const schema = mode === "signup" 
      ? (role === "student" ? studentSignupSchema : signupSchema) 
      : baseSchema;
    const parsed = schema.safeParse(formData);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Invalid input.";
      toast({
        title: "Invalid input",
        description: firstError,
        variant: "destructive",
      });
      return;
    }

    // For parent signup, validate student usernames
    if (mode === "signup" && role === "parent") {
      const validStudents = studentUsernames.filter(s => s.isValid && s.studentId);
      if (validStudents.length === 0) {
        toast({
          title: "No valid students",
          description: "Please enter at least one valid student username.",
          variant: "destructive",
        });
        return;
      }
    }

    // For student signup, check username availability
    if (mode === "signup" && role === "student") {
      const isAvailable = await checkUsernameAvailability(formData.username);
      if (!isAvailable) {
        toast({
          title: "Username taken",
          description: "This username is already in use. Please choose another.",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: role === "student" ? formData.username : formData.fullName,
              role,
              ...(role === "student" && { username: formData.username }),
            },
          },
        });

        if (error) {
          toast({
            title: "Sign up failed",
            description: error.message,
            variant: "destructive",
          });
          return;
        }

        // Update profile with username for students
        if (data.user && role === "student") {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ username: formData.username })
            .eq('id', data.user.id);

          if (updateError) {
            console.error('Failed to update username:', updateError);
          }
        }

        // Link students to parent
        if (data.user && role === "parent") {
          const validStudents = studentUsernames.filter(s => s.isValid && s.studentId);
          for (const student of validStudents) {
            await supabase
              .from('parent_students')
              .insert({
                parent_id: data.user.id,
                student_id: student.studentId!,
              });
          }
        }

        // If user is immediately created (no email confirmation required)
        if (data.user && !data.user.email_confirmed_at) {
          toast({
            title: "Account created successfully!",
            description: `Welcome to Trackademic, ${formData.fullName}!`,
          });
          
          // Redirect to appropriate dashboard
          if (role === "student") {
            navigate("/student-dashboard");
          } else if (role === "instructor") {
            navigate("/instructor-dashboard");
          } else if (role === "parent") {
            navigate("/parent-dashboard");
          }
        } else if (data.user?.email_confirmed_at) {
          toast({
            title: "Account created and signed in!",
            description: `Welcome to Trackademic, ${formData.fullName}!`,
          });
          
          // Redirect to appropriate dashboard
          if (role === "student") {
            navigate("/student-dashboard");
          } else if (role === "instructor") {
            navigate("/instructor-dashboard");
          } else if (role === "parent") {
            navigate("/parent-dashboard");
          }
        } else {
          toast({
            title: "Check your email",
            description: "We sent a confirmation link to complete your sign up.",
          });
        }
      } else {
        const { data: signInData, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) {
          toast({
            title: "Sign in failed",
            description: error.message,
            variant: "destructive",
          });
          return;
        }

        // Ensure the user is signing in with the correct role
        const user = signInData.user ?? signInData.session?.user;
        if (user) {
          const storedRole = user.user_metadata?.role as
            | "student"
            | "parent"
            | "instructor"
            | undefined;

          if (!storedRole) {
            await supabase.auth.signOut();
            toast({
              title: "Role not set",
              description:
                "Your account does not have a role assigned. Please contact support or an administrator.",
              variant: "destructive",
            });
            return;
          }

          if (storedRole !== role) {
            await supabase.auth.signOut();
            toast({
              title: "Incorrect role selected",
              description: `This account is registered as a ${storedRole}. Please sign in using the ${storedRole} role.`,
              variant: "destructive",
            });
            return;
          }
        }

        toast({
          title: "Signed in",
          description: `Welcome back, ${getRoleLabel()}!`,
        });
        
        // Redirect to appropriate dashboard
        if (role === "student") {
          navigate("/student-dashboard");
        } else if (role === "instructor") {
          navigate("/instructor-dashboard");
        } else if (role === "parent") {
          navigate("/parent-dashboard");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = () => {
    const labels = {
      student: "Student",
      parent: "Parent", 
      instructor: "Instructor"
    };
    return labels[role];
  };

  const getEmailPlaceholder = () => {
    const placeholders = {
      student: "student@school.edu",
      parent: "parent@email.com",
      instructor: "instructor@school.edu"
    };
    return placeholders[role];
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      {/* Name - Only for Parents and Instructors */}
      {mode === "signup" && (role === "parent" || role === "instructor") && (
        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-sm font-medium text-foreground">
            Name
          </Label>
          <Input
            id="fullName"
            type="text"
            placeholder="Enter your name"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            className="h-12 border-input-border bg-input"
            required
          />
        </div>
      )}

      {/* Name field for students only during signup */}
      {mode === "signup" && role === "student" && (
        <div className="space-y-2">
          <Label htmlFor="username" className="text-sm font-medium text-foreground">
            Name
          </Label>
          <Input
            id="username"
            type="text"
            placeholder="Enter your name"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            className="h-12 border-input-border bg-input"
            required
          />
          <p className="text-xs text-muted-foreground">
            This will be shared with parents to link accounts
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-foreground">
          {getRoleLabel()} Email
        </Label>
        <Input
          id="email"
          type="email"
          placeholder={getEmailPlaceholder()}
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="h-12 border-input-border bg-input"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium text-foreground">
          Password
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="h-12 border-input-border bg-input pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
          </button>
        </div>
      </div>

      {mode === "signup" && (
        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
            Confirm Password
          </Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="h-12 border-input-border bg-input pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirmPassword ? <Eye size={20} /> : <EyeOff size={20} />}
            </button>
          </div>
        </div>
      )}

      {/* Student username linking for parents during signup */}
      {mode === "signup" && role === "parent" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Link to Student(s)
            </Label>
            <p className="text-xs text-muted-foreground">
              Enter the name(s) of the student(s) you want to monitor (max 4)
            </p>
          </div>
          
          <div className="space-y-3">
            {studentUsernames.map((student, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    type="text"
                    placeholder={`Student ${index + 1} name`}
                    value={student.username}
                    onChange={(e) => {
                      const value = e.target.value;
                      validateStudentName(index, value);
                    }}
                    className="h-12 border-input-border bg-input pr-10"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {student.isChecking && (
                      <Loader2 size={18} className="animate-spin text-muted-foreground" />
                    )}
                    {!student.isChecking && student.isValid === true && (
                      <Check size={18} className="text-green-500" />
                    )}
                    {!student.isChecking && student.isValid === false && student.username && (
                      <X size={18} className="text-destructive" />
                    )}
                  </div>
                </div>
                {studentUsernames.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeStudentField(index)}
                    className="h-12 w-12 text-muted-foreground hover:text-destructive"
                  >
                    <X size={20} />
                  </Button>
                )}
              </div>
            ))}
            {studentUsernames.map((student, index) => (
              student.isValid && student.studentName && (
                <p key={`name-${index}`} className="text-xs text-green-600 ml-1">
                  ✓ Found: {student.studentName}
                </p>
              )
            ))}
          </div>

          {studentUsernames.length < 4 && (
            <Button
              type="button"
              variant="outline"
              onClick={addStudentField}
              className="w-full h-10 border-dashed"
            >
              <Plus size={16} className="mr-2" />
              Add another student
            </Button>
          )}
        </div>
      )}

      <Button
        type="submit"
        disabled={loading}
        aria-busy={loading}
        className="w-full h-12 bg-primary hover:bg-primary-hover text-primary-foreground font-medium rounded-xl"
      >
        {loading
          ? (mode === "signin" ? "Signing in..." : "Creating account...")
          : (mode === "signin" ? `Sign In as ${getRoleLabel()}` : `Create ${getRoleLabel()} Account`)}
      </Button>
    </form>
  );
};

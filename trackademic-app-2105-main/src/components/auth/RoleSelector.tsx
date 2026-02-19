import { cn } from "@/lib/utils";

interface RoleSelectorProps {
  selectedRole: "student" | "parent" | "instructor";
  onRoleChange: (role: "student" | "parent" | "instructor") => void;
}

const roles = [
  { id: "student", label: "Student" },
  { id: "parent", label: "Parent" },
  { id: "instructor", label: "Instructor" },
] as const;

export const RoleSelector = ({ selectedRole, onRoleChange }: RoleSelectorProps) => {
  return (
    <div className="flex w-full rounded-xl bg-secondary/80 p-1.5 border border-white/[0.06]">
      {roles.map((role) => (
        <button
          key={role.id}
          onClick={() => onRoleChange(role.id)}
          className={cn(
            "flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-200",
            selectedRole === role.id
              ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/30 shadow-lg shadow-primary/10"
              : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
          )}
        >
          {role.label}
        </button>
      ))}
    </div>
  );
};
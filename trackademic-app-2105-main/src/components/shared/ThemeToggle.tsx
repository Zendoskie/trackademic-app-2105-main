import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Laptop } from "lucide-react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-2 p-1 rounded-full border bg-muted">
      <Button
        variant={theme === "light" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => setTheme("light")}
        className="flex-1 rounded-full"
      >
        <Sun className="h-5 w-5 mr-2" />
        Light
      </Button>
      <Button
        variant={theme === "dark" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => setTheme("dark")}
        className="flex-1 rounded-full"
      >
        <Moon className="h-5 w-5 mr-2" />
        Dark
      </Button>
      <Button
        variant={theme === "system" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => setTheme("system")}
        className="flex-1 rounded-full"
      >
        <Laptop className="h-5 w-5 mr-2" />
        System
      </Button>
    </div>
  );
}

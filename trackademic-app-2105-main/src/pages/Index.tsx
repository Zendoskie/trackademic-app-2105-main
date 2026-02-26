import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="trackademic-container flex items-center justify-center">
      <div className="max-w-xl mx-auto text-center space-y-6">
        <h1 className="trackademic-brand text-3xl">Trackacademic</h1>
        <p className="text-muted-foreground text-sm">
          Stay on top of classes, attendance, and activities with a shared view
          for students, parents, and instructors.
        </p>
        <div className="space-y-3">
          <Button
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => navigate("/auth")}
          >
            Get started
          </Button>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Already have an account?{" "}
            <button
              type="button"
              className="underline underline-offset-4"
              onClick={() => navigate("/auth")}
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;


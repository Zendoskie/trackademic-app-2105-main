import { useState } from "react";
import { RoleSelector } from "./RoleSelector";
import { AuthTabs } from "./AuthTabs";
import { AuthForm } from "./AuthForm";

export const AuthScreen = () => {
  const [selectedRole, setSelectedRole] = useState<"student" | "parent" | "instructor">("student");
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");

  return (
    <div className="trackademic-container !py-5">
      <div className="mx-auto max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="trackademic-brand text-3xl mb-2">
            TRACKADEMIC
          </h1>
          <p className="text-muted-foreground text-sm">
            Track your academic journey
          </p>
        </div>

        {/* Welcome Message */}
        <div className="text-center mb-5">
          <h2 className="text-foreground mb-1 text-lg">
            Welcome to TRACKADEMIC
          </h2>
          <p className="text-muted-foreground text-sm">
            Choose your role to sign in or create an account
          </p>
        </div>

        {/* Auth Card */}
        <div className="trackademic-card p-4 space-y-4">
          {/* Role Selection */}
          <RoleSelector 
            selectedRole={selectedRole}
            onRoleChange={setSelectedRole}
          />

          {/* Sign In / Sign Up Tabs */}
          <AuthTabs 
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          {/* Auth Form */}
          <AuthForm 
            mode={activeTab}
            role={selectedRole}
          />
        </div>

        {/* Footer */}
        <div className="text-center mt-5 text-sm text-muted-foreground">
          <p>Secure • Simple • Academic</p>
        </div>
      </div>
    </div>
  );
};
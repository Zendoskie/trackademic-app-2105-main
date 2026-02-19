import { useState } from "react";
import { RoleSelector } from "./RoleSelector";
import { AuthTabs } from "./AuthTabs";
import { AuthForm } from "./AuthForm";

export const AuthScreen = () => {
  const [selectedRole, setSelectedRole] = useState<"student" | "parent" | "instructor">("student");
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");

  return (
    <div className="trackademic-container !py-4 sm:!py-8">
      <div className="mx-auto max-w-md">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-12">
          <h1 className="trackademic-brand text-3xl sm:text-4xl mb-1 sm:mb-3">
            TRACKADEMIC
          </h1>
          <p className="text-muted-foreground text-sm sm:text-lg">
            Track your academic journey
          </p>
        </div>

        {/* Welcome Message */}
        <div className="text-center mb-4 sm:mb-8">
          <h2 className="text-foreground mb-1 sm:mb-2 text-lg sm:text-xl">
            Welcome to TRACKADEMIC
          </h2>
          <p className="text-muted-foreground text-sm">
            Choose your role to sign in or create an account
          </p>
        </div>

        {/* Auth Card */}
        <div className="trackademic-card p-4 sm:p-6 space-y-4 sm:space-y-6">
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
        <div className="text-center mt-4 sm:mt-8 text-xs sm:text-sm text-muted-foreground">
          <p>Secure • Simple • Academic</p>
        </div>
      </div>
    </div>
  );
};
"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen">
      <div className="w-full max-w-md">
        <SignIn
          appearance={{ 
            elements: {
              formButtonPrimary: "bg-primary hover:bg-primary/90",
              card: "rounded-xl shadow-sm",
              formFieldInput: "rounded-lg border-gray-300 dark:border-gray-700"
            }
          }}
        />
      </div>
    </div>
  );
}

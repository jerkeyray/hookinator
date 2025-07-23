"use client"; // This must be a client component to use the signIn function

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button"; // Adjust import path as needed
import React from "react";
import { GitBranch } from "lucide-react";
import Link from "next/link";

// --- Google Icon Component ---
function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} height="24" width="24" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
      <path d="M1 1h22v22H1z" fill="none" />
    </svg>
  );
}

// --- Sign-In Page Component ---
export default function SignInPage() {
  const handleSignIn = async () => {
    await signIn("google", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="w-full min-h-screen lg:grid lg:grid-cols-2 bg-black text-white">
      {/* --- Left Column: Value Proposition --- */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gray-900/50 border-r border-gray-800">
        <Link className="flex items-center justify-start gap-2" href="/">
          <GitBranch className="h-6 w-6" />
          <span className="font-bold text-xl">Hookinator</span>
        </Link>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            The missing toolkit for your webhook workflow.
          </h1>
          <p className="text-gray-400 text-lg">
            Get a real-time view of every payload and header. Forward requests
            securely to your local machine. Build better integrations, faster.
          </p>
        </div>
        <p className="text-xs text-gray-500">
          © {new Date().getFullYear()} Hookinator Inc.
        </p>
      </div>

      {/* --- Right Column: Sign-In Action --- */}
      <div className="flex items-center justify-center py-12 px-4 sm:px-0">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">Sign In to your account to continue</h1>
          </div>
          <Button
            onClick={handleSignIn}
            variant="outline"
            className="w-full bg-white text-black font-bold border border-gray-300 shadow-md hover:scale-105 hover:bg-gray-100 transition-transform duration-150 h-12 text-md rounded-lg"
          >
            <GoogleIcon className="mr-3 h-5 w-5" />
            Continue with Google
          </Button>
        </div>
      </div>
    </div>
  );
}

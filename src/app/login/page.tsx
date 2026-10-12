import { Suspense } from "react";
import Link from "next/link";

import { AuthShell } from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to follow projects, post updates and connect with others."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="font-medium text-soltas-ocean hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <Suspense fallback={<div className="h-[232px]" />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}

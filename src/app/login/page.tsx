import { Suspense } from "react";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-soltas-text">Sign in</h1>
        <p className="text-sm text-soltas-muted">
          Sign in to your account to continue.
        </p>
      </div>
      <Suspense fallback={<div className="rounded-2xl border border-soltas-line bg-white p-6 text-sm text-soltas-muted">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}

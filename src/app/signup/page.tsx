import Link from "next/link";
import { Suspense } from "react";
import SignupTabs from "@/components/auth/SignupTabs";

export default function SignupPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-soltas-text">Create your account</h1>
        <p className="text-sm text-soltas-muted">
          Create your personal account. You can create an organisation page after signing in.
        </p>
        <p className="text-sm text-soltas-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-soltas-abyssal hover:underline">
            Sign in
          </Link>
        </p>
      </div>
      <Suspense fallback={<div className="rounded-2xl border border-soltas-line bg-white p-6 text-sm text-soltas-muted">Loading...</div>}>
        <SignupTabs />
      </Suspense>
    </div>
  );
}

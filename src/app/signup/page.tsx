import Link from "next/link";
import { Suspense } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import SignupTabs from "@/components/auth/SignupTabs";

export const metadata = { title: "Join" };

export default function SignupPage() {
  return (
    <AuthShell
      wide
      title="Join the Taskforce"
      subtitle="Create your personal account. You can set up an organisation page once you’re in."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-soltas-ocean hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <Suspense fallback={<div className="h-[640px]" />}>
        <SignupTabs />
      </Suspense>
    </AuthShell>
  );
}

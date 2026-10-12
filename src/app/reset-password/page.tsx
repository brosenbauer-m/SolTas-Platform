import { AuthShell } from "@/components/auth/AuthShell";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Choose a new password" subtitle="Use at least 8 characters. You'll stay signed in afterwards.">
      <ResetPasswordForm />
    </AuthShell>
  );
}

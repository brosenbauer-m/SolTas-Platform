"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  kind: "individual"|"organisation";
  full_name: string | null;
  surname: string | null;
  nationality: string | null;
  organisation_name: string | null;
  organisation_id: string | null;
};

const supabase = supabaseClient();

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/auth");
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("id,kind,full_name,surname,nationality,organisation_name,organisation_id")
        .eq("id", userData.user.id)
        .single();
      setProfile(data as Profile);
      setLoading(false);
    })();
  }, [router]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (!profile) return <div className="p-6">No profile</div>;

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="rounded-2xl border p-4">
        <div className="text-sm">Account type: <b>{profile.kind}</b></div>
        {profile.kind === "organisation" ? (
          <div className="text-sm">Organisation: <b>{profile.organisation_name}</b></div>
        ) : (
          <div className="text-sm">Name: <b>{[profile.full_name, profile.surname].filter(Boolean).join(" ") || "—"}</b></div>
        )}
      </div>
      <div className="rounded-2xl border p-4">
        <Link href="/projects" className="underline">Create or manage projects</Link>
        <div className="text-xs opacity-70">Project creation will be gated to authenticated users.</div>
      </div>
    </div>
  );
}

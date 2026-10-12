"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabaseClient } from "@/lib/supabaseClient";

const PENDING_ORG_KEY = "pending_organisation_data";

type PendingOrgData = {
  email: string;
  name: string;
  country_based: string;
  what_we_do: string;
  existing_since?: string;
  website?: string;
  logo_url?: string;
  social_links?: Array<{ type: string; url: string }>;
};

export default function OrganisationOnboardingPage() {
  const router = useRouter();
  const supabase = supabaseClient();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function handleOnboarding() {
      try {
        // Check if user is authenticated
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session) {
          // User not logged in, redirect to login
          router.replace("/login");
          return;
        }

        // Check if user already has an organisation membership as owner
        const { data: existingMembership } = await supabase
          .from("organisation_members")
          .select("organisation_id, role")
          .eq("user_id", session.user.id)
          .eq("role", "owner")
          .maybeSingle();

        if (existingMembership) {
          // User already has an organisation, redirect to it
          setMessage("You already have an organisation.");
          setTimeout(() => {
            router.replace(`/organisations/${existingMembership.organisation_id}`);
          }, 1000);
          return;
        }

        // Check for pending organisation data - user_metadata.pending_org is primary source
        let pendingData: PendingOrgData | null = null;

        // Primary: Check user_metadata.pending_org
        if (session.user.user_metadata?.pending_org) {
          pendingData = session.user.user_metadata.pending_org as PendingOrgData;
        }
        // Fallback: Check localStorage for older flows
        else {
          const pendingDataStr = localStorage.getItem(PENDING_ORG_KEY);
          if (pendingDataStr) {
            pendingData = JSON.parse(pendingDataStr);
          }
        }

        if (!pendingData) {
          // No pending data - user wants to create org directly
          // Redirect to create organisation page
          router.replace("/organisations/create");
          return;
        }

        // Create the organisation via Edge Function
        setCreating(true);
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (!currentSession) {
          throw new Error("Session expired. Please log in again.");
        }

        const { data, error: fnError } = await supabase.functions.invoke(
          "create-organisation",
          { body: pendingData }
        );

        if (fnError || !data?.organisation_id) {
          throw new Error(fnError?.message || "Failed to create organisation");
        }

        const { organisation_id } = data as { organisation_id?: string };

        // Clear old localStorage key if it exists
        if (localStorage.getItem(PENDING_ORG_KEY)) {
          localStorage.removeItem(PENDING_ORG_KEY);
        }

        setMessage("Organisation created successfully! Redirecting...");
        setTimeout(() => {
          router.replace(`/organisations/${organisation_id}`);
          router.refresh();
        }, 1000);
      } catch (err: unknown) {
        console.error("Onboarding error:", err);
        const errorMessage = err instanceof Error ? err.message : "Unable to complete organisation setup.";
        setError(errorMessage);
      } finally {
        setLoading(false);
        setCreating(false);
      }
    }

    handleOnboarding();
  }, [router, supabase]);

  if (loading || creating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-soltas-light">
        <div className="rounded-2xl border border-soltas-line bg-white p-8 text-center shadow-sm">
          <div className="mb-4 text-lg font-medium text-soltas-ocean">
            {creating ? "Creating your organisation..." : "Setting up..."}
          </div>
          <div className="text-sm text-soltas-muted">Please wait</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-soltas-light">
        <div className="rounded-2xl border border-red-400/25 bg-white p-8 text-center shadow-sm">
          <div className="mb-4 text-lg font-semibold text-red-600">Setup Error</div>
          <div className="mb-6 text-sm text-soltas-text">{error}</div>
          <button
            onClick={() => router.replace("/signup")}
            className="rounded-xl bg-soltas-ocean px-6 py-2 text-sm font-semibold text-white transition hover:bg-soltas-abyssal"
          >
            Back to Signup
          </button>
        </div>
      </div>
    );
  }

  if (message) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-soltas-light">
        <div className="rounded-2xl border border-soltas-line bg-white p-8 text-center shadow-sm">
          <div className="text-lg font-medium text-soltas-ocean">{message}</div>
        </div>
      </div>
    );
  }

  return null;
}

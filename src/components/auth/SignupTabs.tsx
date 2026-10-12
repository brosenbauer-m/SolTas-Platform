"use client";

import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { AuthField, FormMessage } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { SocialLinksFields, emptySocialLink, normalizeSocialLinks, type SocialLink } from "@/components/profiles/SocialLinksFields";
import { fieldClasses, Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { MissingSupabaseEnvError } from "@/lib/supabaseConfig";
import { supabaseClient } from "@/lib/supabaseClient";

let supabaseInitializationError: MissingSupabaseEnvError | null = null;
let supabase: ReturnType<typeof supabaseClient> | null = null;

try {
  supabase = supabaseClient();
} catch (error) {
  if (error instanceof MissingSupabaseEnvError) {
    supabaseInitializationError = error;
    supabase = null;
  } else {
    throw error;
  }
}

type VerifiedOrganisation = { id: string; name: string };


const initialIndividual = {
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  date_of_birth: "",
  organisation_id: "independent",
  country_from: "",
  country_based: "",
  occupation: "",
  bio: "",
  avatar_url: "",
};

export default function SignupTabs() {
  if (!supabase) {
    return <p className="text-sm text-soltas-muted">{supabaseInitializationError?.message}</p>;
  }

  return <SignupTabsContent client={supabase} />;
}

type SupabaseClient = NonNullable<ReturnType<typeof supabaseClient>>;

function SignupTabsContent({ client }: { client: SupabaseClient }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [individual, setIndividual] = useState(initialIndividual);
  const [individualLinks, setIndividualLinks] = useState<SocialLink[]>([]);
  const [verifiedOrgs, setVerifiedOrgs] = useState<VerifiedOrganisation[]>([]);
  const [orgsError, setOrgsError] = useState<string | null>(null);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{
    text: string;
    tone: "error" | "success" | "info";
  } | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const siteUrl = useMemo(() => process.env.NEXT_PUBLIC_SITE_URL || "", []);

  useEffect(() => {
    let isActive = true;

    async function loadVerifiedOrgs() {
      setOrgsLoading(true);
      setOrgsError(null);
      const { data, error } = await client
        .from("verified_organisations")
        .select("id, name")
        .order("name");

      if (!isActive) return;

      if (error) {
        setOrgsError(error.message);
      } else {
        setVerifiedOrgs(data ?? []);
      }
      setOrgsLoading(false);
    }

    loadVerifiedOrgs();

    return () => {
      isActive = false;
    };
  }, [client]);

  function updateIndividualField(field: keyof typeof individual, value: string) {
    setIndividual((prev) => ({ ...prev, [field]: value }));
  }

  function updateSocialLinks(
    updater: Dispatch<SetStateAction<SocialLink[]>>,
    index: number,
    field: keyof SocialLink,
    value: string
  ) {
    updater((prev) =>
      prev.map((link, idx) => (idx === index ? { ...link, [field]: value } : link))
    );
  }

  function addSocialLink(updater: Dispatch<SetStateAction<SocialLink[]>>) {
    updater((prev) => [...prev, { ...emptySocialLink }]);
  }

  function removeSocialLink(
    updater: Dispatch<SetStateAction<SocialLink[]>>,
    index: number
  ) {
    updater((prev) => prev.filter((_, idx) => idx !== index));
  }

  function validateIndividual() {
    const nextErrors: Record<string, string> = {};
    if (!individual.first_name.trim()) nextErrors.first_name = "Enter your first name.";
    if (!individual.last_name.trim()) nextErrors.last_name = "Enter your last name.";
    if (!individual.email.trim()) nextErrors.email = "Enter your email address.";
    if (individual.password.length < 8) nextErrors.password = "Use at least 8 characters.";
    if (!individual.date_of_birth) nextErrors.date_of_birth = "Enter your date of birth.";
    if (!individual.organisation_id) {
      nextErrors.organisation_id = "Choose an organisation, or Independent.";
    }
    if (!individual.country_based.trim()) {
      nextErrors.country_based = "Enter the country you live in.";
    }

    return nextErrors;
  }

  function getSignupErrorMessage(err: unknown) {
    if (typeof err !== "object" || err === null) {
      return "Unable to sign up.";
    }

    const errorLike = err as {
      message?: string;
      error_description?: string;
      details?: string;
      msg?: string;
    };

    return (
      errorLike.message ||
      errorLike.error_description ||
      errorLike.details ||
      errorLike.msg ||
      "Unable to sign up."
    );
  }

  function handleSignupError(scope: "Individual" | "Organisation", err: unknown) {
    console.error(`${scope} signup failed:`, err);
    const errorMessage = getSignupErrorMessage(err);
    console.error(`${scope} signup error message:`, errorMessage);
    setMessage({ text: `We couldn’t create your account: ${errorMessage}`, tone: "error" });
  }


  async function handleIndividualSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    const nextErrors = validateIndividual();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const { data, error } = await client.auth.signUp({
        email: individual.email,
        password: individual.password,
        options: {
          emailRedirectTo: siteUrl ? `${siteUrl}/auth/callback` : undefined,
        },
      });
      if (error) throw error;
      if (!data.user?.id) throw new Error("Unable to create user profile.");

      const organisationId =
        individual.organisation_id === "independent" ? null : individual.organisation_id;

      const profileFields = {
        first_name: individual.first_name.trim(),
        last_name: individual.last_name.trim(),
        date_of_birth: individual.date_of_birth,
        organisation_id: organisationId,
        country_from: individual.country_from.trim() || null,
        country_based: individual.country_based.trim(),
        occupation: individual.occupation.trim() || null,
        bio: individual.bio.trim() || null,
        social_links: normalizeSocialLinks(individualLinks),
        avatar_url: individual.avatar_url.trim() || null,
      };

      // Update the row created at sign-up, or insert it if it doesn't exist yet.
      // (No upsert: date_of_birth is write-only for API roles, and an upsert would need to read it.)
      const { data: updatedProfile, error: updateError } = await client
        .from("profiles")
        .update(profileFields)
        .eq("id", data.user.id)
        .select("id");
      if (updateError) throw updateError;
      if (!updatedProfile || updatedProfile.length === 0) {
        const { error: insertError } = await client
          .from("profiles")
          .insert({ id: data.user.id, ...profileFields });
        if (insertError) throw insertError;
      }

      setMessage({ text: "Welcome! Taking you in…", tone: "success" });
      const returnTo = searchParams.get("returnTo");
      const safeReturnTo = returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/projects";
      setTimeout(() => {
        router.replace(safeReturnTo);
        router.refresh();
      }, 400);
    } catch (err: unknown) {
      handleSignupError("Individual", err);
    } finally {
      setLoading(false);
    }
  }

  const invalid = (key: string) =>
    cn(errors[key] && "border-rose-400 focus:border-rose-400 focus-visible:ring-rose-100");
  const set = (field: keyof typeof individual) => (event: { target: { value: string } }) =>
    updateIndividualField(field, event.target.value);

  return (
    <form onSubmit={handleIndividualSubmit} className="space-y-8" noValidate>
      {message ? <FormMessage tone={message.tone === "success" ? "success" : "error"}>{message.text}</FormMessage> : null}

      <Section title="Your account">
        <div className="grid gap-5 sm:grid-cols-2">
          <AuthField label="First name" error={errors.first_name}>
            <Input autoComplete="given-name" value={individual.first_name} onChange={set("first_name")} className={invalid("first_name")} />
          </AuthField>
          <AuthField label="Last name" error={errors.last_name}>
            <Input autoComplete="family-name" value={individual.last_name} onChange={set("last_name")} className={invalid("last_name")} />
          </AuthField>
        </div>
        <AuthField label="Email" error={errors.email}>
          <Input type="email" inputMode="email" autoComplete="email" value={individual.email} onChange={set("email")} className={invalid("email")} />
        </AuthField>
        <AuthField label="Password" error={errors.password} hint="Use at least 8 characters.">
          <Input type="password" autoComplete="new-password" value={individual.password} onChange={set("password")} className={invalid("password")} />
        </AuthField>
      </Section>

      <Section title="About you">
        <div className="grid gap-5 sm:grid-cols-2">
          <AuthField label="Date of birth" error={errors.date_of_birth} hint="Never shown on your profile.">
            <Input type="date" value={individual.date_of_birth} onChange={set("date_of_birth")} className={invalid("date_of_birth")} />
          </AuthField>
          <AuthField label="Country you live in" error={errors.country_based}>
            <Input autoComplete="country-name" value={individual.country_based} onChange={set("country_based")} className={invalid("country_based")} />
          </AuthField>
          <AuthField label="Country you’re from" optional>
            <Input value={individual.country_from} onChange={set("country_from")} />
          </AuthField>
          <AuthField label="Occupation" optional>
            <Input autoComplete="organization-title" value={individual.occupation} onChange={set("occupation")} />
          </AuthField>
        </div>
        <AuthField
          label="Organisation"
          error={errors.organisation_id}
          hint={
            orgsLoading
              ? "Loading verified organisations…"
              : orgsError
                ? orgsError
                : "Only verified organisations are listed. You can create one after signing up."
          }
        >
          <select value={individual.organisation_id} onChange={set("organisation_id")} className={cn("h-11", fieldClasses)}>
            <option value="independent">Independent, no organisation</option>
            {verifiedOrgs.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </AuthField>
      </Section>

      <details className="group rounded-2xl bg-soltas-off-white px-4 py-3 open:pb-5 sm:px-5">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-medium text-soltas-text [&::-webkit-details-marker]:hidden">
          <span>
            Bio, photo and links
            <span className="ml-1.5 font-normal text-soltas-muted">Optional</span>
          </span>
          <ChevronDown aria-hidden className="h-4 w-4 text-soltas-muted transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-4 space-y-5">
          <AuthField label="Bio" hint="A sentence or two about what you care about.">
            <Textarea rows={4} value={individual.bio} onChange={set("bio")} />
          </AuthField>
          <AuthField label="Photo URL" hint="A link to a picture of you. You can change it later.">
            <Input type="url" inputMode="url" placeholder="https://" value={individual.avatar_url} onChange={set("avatar_url")} />
          </AuthField>
          <SocialLinksFields
            links={individualLinks}
            onChange={(index, field, value) => updateSocialLinks(setIndividualLinks, index, field, value)}
            onAdd={() => addSocialLink(setIndividualLinks)}
            onRemove={(index) => removeSocialLink(setIndividualLinks, index)}
          />
        </div>
      </details>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Creating your account…" : "Create account"}
      </Button>
    </form>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-5">
      <legend className="mb-4 text-[13px] font-semibold uppercase tracking-wide text-soltas-muted">{title}</legend>
      {children}
    </fieldset>
  );
}

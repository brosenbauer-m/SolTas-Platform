"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

type SocialLinkType =
  | "LinkedIn"
  | "YouTube"
  | "Instagram"
  | "Facebook"
  | "Website"
  | "X"
  | "Threads";

type SocialLink = { type: SocialLinkType; url: string };

type VerifiedOrganisation = { id: string; name: string };

const socialLinkTypes: SocialLinkType[] = [
  "LinkedIn",
  "YouTube",
  "Instagram",
  "Facebook",
  "Website",
  "X",
  "Threads",
];

const emptySocialLink: SocialLink = { type: "LinkedIn", url: "" };

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
    return (
      <div className="rounded-2xl border border-soltas-line bg-white p-6 text-sm text-soltas-muted">
        {supabaseInitializationError?.message}
      </div>
    );
  }

  return <SignupTabsContent client={supabase} />;
}

type SupabaseClient = NonNullable<ReturnType<typeof supabaseClient>>;

function SignupTabsContent({ client }: { client: SupabaseClient }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [individual, setIndividual] = useState(initialIndividual);
  const [individualLinks, setIndividualLinks] = useState<SocialLink[]>([emptySocialLink]);
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

  function normalizeLinks(links: SocialLink[]) {
    return links
      .map((link) => ({ ...link, url: link.url.trim() }))
      .filter((link) => link.url.length > 0);
  }

  function validateIndividual() {
    const nextErrors: Record<string, string> = {};
    if (!individual.first_name.trim()) nextErrors.first_name = "First name is required.";
    if (!individual.last_name.trim()) nextErrors.last_name = "Last name is required.";
    if (!individual.email.trim()) nextErrors.email = "Email is required.";
    if (!individual.password.trim()) nextErrors.password = "Password is required.";
    if (!individual.date_of_birth) nextErrors.date_of_birth = "Date of birth is required.";
    if (!individual.organisation_id) {
      nextErrors.organisation_id = "Organisation selection is required.";
    }
    if (!individual.country_based.trim()) {
      nextErrors.country_based = "Country based is required.";
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
    setMessage({ text: `Signup failed: ${errorMessage}`, tone: "error" });
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
        social_links: normalizeLinks(individualLinks),
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

      setMessage({ text: "Signup successful! Redirecting...", tone: "success" });
      const returnTo = searchParams.get("returnTo");
      const safeReturnTo = returnTo?.startsWith("/") ? returnTo : "/projects";
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

  return (
    <div className="rounded-2xl border border-soltas-line bg-white p-6">
      <form onSubmit={handleIndividualSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="First name"
              value={individual.first_name}
              onChange={(value) => updateIndividualField("first_name", value)}
              error={errors.first_name}
              required
            />
            <Field
              label="Last name"
              value={individual.last_name}
              onChange={(value) => updateIndividualField("last_name", value)}
              error={errors.last_name}
              required
            />
            <Field
              label="Email"
              type="email"
              value={individual.email}
              onChange={(value) => updateIndividualField("email", value)}
              error={errors.email}
              required
            />
            <Field
              label="Password"
              type="password"
              value={individual.password}
              onChange={(value) => updateIndividualField("password", value)}
              error={errors.password}
              required
            />
            <Field
              label="Date of birth"
              type="date"
              value={individual.date_of_birth}
              onChange={(value) => updateIndividualField("date_of_birth", value)}
              error={errors.date_of_birth}
              required
            />
            <SelectField
              label="Organisation"
              value={individual.organisation_id}
              onChange={(value) => updateIndividualField("organisation_id", value)}
              error={errors.organisation_id}
              required
              options={[
                { value: "independent", label: "Independent / No organisation" },
                ...verifiedOrgs.map((org) => ({ value: org.id, label: org.name })),
              ]}
              helperText={
                orgsLoading
                  ? "Loading verified organisations..."
                  : orgsError
                    ? orgsError
                    : "Only verified organisations are shown."
              }
            />
            <Field
              label="Country from"
              value={individual.country_from}
              onChange={(value) => updateIndividualField("country_from", value)}
            />
            <Field
              label="Country based"
              value={individual.country_based}
              onChange={(value) => updateIndividualField("country_based", value)}
              error={errors.country_based}
              required
            />
            <Field
              label="Occupation"
              value={individual.occupation}
              onChange={(value) => updateIndividualField("occupation", value)}
            />
            <Field
              label="Avatar URL"
              value={individual.avatar_url}
              onChange={(value) => updateIndividualField("avatar_url", value)}
              helperText="Upload support will be added later."
            />
          </div>

          <TextAreaField
            label="Bio"
            value={individual.bio}
            onChange={(value) => updateIndividualField("bio", value)}
          />

          <SocialLinksField
            title="Social links"
            links={individualLinks}
            onChange={(index, field, value) =>
              updateSocialLinks(setIndividualLinks, index, field, value)
            }
            onAdd={() => addSocialLink(setIndividualLinks)}
            onRemove={(index) => removeSocialLink(setIndividualLinks, index)}
          />

          <SubmitRow
            loading={loading}
            message={message}
          />
        </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  error,
  helperText,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
}) {
  return (
    <label className="space-y-1 text-sm text-soltas-text">
      <span className="font-medium">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
          error
            ? "border-red-400 focus:ring-red-200"
            : "border-soltas-line focus:border-soltas-ocean/50 focus:ring-soltas-ocean/15"
        }`}
      />
      {helperText && <p className="text-xs text-soltas-muted">{helperText}</p>}
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  required,
  error,
  helperText,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  helperText?: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="space-y-1 text-sm text-soltas-text">
      <span className="font-medium">
        {label}
        {required ? " *" : ""}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-xl border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
          error
            ? "border-red-400 focus:ring-red-200"
            : "border-soltas-line focus:border-soltas-ocean/50 focus:ring-soltas-ocean/15"
        }`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helperText && <p className="text-xs text-soltas-muted">{helperText}</p>}
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  error,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
}) {
  return (
    <label className="space-y-1 text-sm text-soltas-text">
      <span className="font-medium">
        {label}
        {required ? " *" : ""}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
          error
            ? "border-red-400 focus:ring-red-200"
            : "border-soltas-line focus:border-soltas-ocean/50 focus:ring-soltas-ocean/15"
        }`}
      />
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
    </label>
  );
}

function SocialLinksField({
  title,
  links,
  onChange,
  onAdd,
  onRemove,
}: {
  title: string;
  links: SocialLink[];
  onChange: (index: number, field: keyof SocialLink, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-soltas-text">{title}</h3>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-full border border-soltas-line px-3 py-1 text-xs font-medium text-soltas-ocean hover:bg-soltas-light transition-colors duration-150"
        >
          Add link
        </button>
      </div>
      <div className="space-y-3">
        {links.map((link, index) => (
          <div key={`${link.type}-${index}`} className="grid gap-3 md:grid-cols-[160px,1fr,auto]">
            <select
              value={link.type}
              onChange={(event) => onChange(index, "type", event.target.value)}
              className="w-full rounded-xl border border-soltas-line bg-white px-3 py-2 text-sm focus:border-soltas-ocean/50 focus:outline-none focus:ring-2 focus:ring-soltas-ocean/15"
            >
              {socialLinkTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <input
              type="url"
              placeholder="https://"
              value={link.url}
              onChange={(event) => onChange(index, "url", event.target.value)}
              className="w-full rounded-xl border border-soltas-line px-3 py-2 text-sm focus:border-soltas-ocean/50 focus:outline-none focus:ring-2 focus:ring-soltas-ocean/15"
            />
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="rounded-full border border-soltas-line px-3 py-1 text-xs text-soltas-muted hover:bg-soltas-light transition-colors duration-150"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SubmitRow({
  loading,
  message,
}: {
  loading: boolean;
  message: { text: string; tone: "error" | "success" | "info" } | null;
}) {
  return (
    <div className="space-y-3">
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-soltas-ocean px-4 py-2 text-sm font-semibold text-white transition hover:bg-soltas-abyssal disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Creating account..." : "Create account"}
      </button>
      {message && (
        <p
          className={`text-sm font-medium ${
            message.tone === "success"
              ? "text-soltas-ocean"
              : message.tone === "info"
                ? "text-soltas-muted"
                : "text-red-600"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}

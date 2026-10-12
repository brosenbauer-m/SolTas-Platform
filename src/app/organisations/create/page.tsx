"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabaseClient";

type SocialLinkType =
  | "LinkedIn"
  | "YouTube"
  | "Instagram"
  | "Facebook"
  | "Website"
  | "X"
  | "Threads";

type SocialLink = { type: SocialLinkType; url: string };

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

export default function CreateOrganisationPage() {
  const router = useRouter();
  const supabase = supabaseClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [organisation, setOrganisation] = useState({
    name: "",
    country_based: "",
    what_we_do: "",
    existing_since: "",
    website: "",
    logo_url: "",
  });
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([emptySocialLink]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function updateField(field: keyof typeof organisation, value: string) {
    setOrganisation((prev) => ({ ...prev, [field]: value }));
  }

  function updateSocialLink(index: number, field: keyof SocialLink, value: string) {
    setSocialLinks((prev) =>
      prev.map((link, idx) => (idx === index ? { ...link, [field]: value } : link))
    );
  }

  function addSocialLink() {
    setSocialLinks((prev) => [...prev, { ...emptySocialLink }]);
  }

  function removeSocialLink(index: number) {
    setSocialLinks((prev) => prev.filter((_, idx) => idx !== index));
  }

  function normalizeLinks(links: SocialLink[]) {
    return links
      .map((link) => ({ ...link, url: link.url.trim() }))
      .filter((link) => link.url.length > 0);
  }

  function validate() {
    const nextErrors: Record<string, string> = {};
    if (!organisation.name.trim()) nextErrors.name = "Organisation name is required.";
    if (!organisation.country_based.trim()) {
      nextErrors.country_based = "Country based is required.";
    }
    if (!organisation.what_we_do.trim()) nextErrors.what_we_do = "What we do is required.";
    return nextErrors;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }

      // Prepare organisation data
      const orgData = {
        name: organisation.name.trim(),
        country_based: organisation.country_based.trim(),
        what_we_do: organisation.what_we_do.trim(),
        existing_since: organisation.existing_since || undefined,
        website: organisation.website.trim() || undefined,
        logo_url: organisation.logo_url.trim() || undefined,
        social_links: normalizeLinks(socialLinks),
      };

      // Call Edge Function to create organisation
      const { data, error: fnError } = await supabase.functions.invoke(
        "create-organisation",
        { body: orgData }
      );

      if (fnError || !data?.organisation_id) {
        throw new Error(fnError?.message || "Failed to create organisation");
      }

      const { organisation_id } = data as { organisation_id?: string };

      router.replace(`/organisations/${organisation_id}`);
      router.refresh();
    } catch (err: unknown) {
      console.error("Create organisation error:", err);
      const errorMessage = err instanceof Error ? err.message : "Unable to create organisation.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-soltas-text">Create Organisation</h1>
        <p className="text-sm text-soltas-muted">
          Set up your organisation profile. It will be submitted for verification.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-soltas-line bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-soltas-text mb-1">
              Organisation Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={organisation.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="w-full rounded-lg border border-soltas-line px-3 py-2 focus:border-soltas-ocean focus:outline-none"
              placeholder="Your Organisation"
            />
            {errors.name && <p className="mt-1 text-sm text-rose-600">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="country_based" className="block text-sm font-medium text-soltas-text mb-1">
              Country Based <span className="text-rose-500">*</span>
            </label>
            <input
              id="country_based"
              type="text"
              value={organisation.country_based}
              onChange={(e) => updateField("country_based", e.target.value)}
              className="w-full rounded-lg border border-soltas-line px-3 py-2 focus:border-soltas-ocean focus:outline-none"
              placeholder="e.g. United States"
            />
            {errors.country_based && <p className="mt-1 text-sm text-rose-600">{errors.country_based}</p>}
          </div>

          <div>
            <label htmlFor="what_we_do" className="block text-sm font-medium text-soltas-text mb-1">
              What We Do <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="what_we_do"
              value={organisation.what_we_do}
              onChange={(e) => updateField("what_we_do", e.target.value)}
              className="w-full rounded-lg border border-soltas-line px-3 py-2 focus:border-soltas-ocean focus:outline-none"
              rows={4}
              placeholder="Describe your organisation's mission and activities"
            />
            {errors.what_we_do && <p className="mt-1 text-sm text-rose-600">{errors.what_we_do}</p>}
          </div>

          <div>
            <label htmlFor="existing_since" className="block text-sm font-medium text-soltas-text mb-1">
              Existing Since
            </label>
            <input
              id="existing_since"
              type="text"
              value={organisation.existing_since}
              onChange={(e) => updateField("existing_since", e.target.value)}
              className="w-full rounded-lg border border-soltas-line px-3 py-2 focus:border-soltas-ocean focus:outline-none"
              placeholder="e.g. 2020"
            />
          </div>

          <div>
            <label htmlFor="website" className="block text-sm font-medium text-soltas-text mb-1">
              Website
            </label>
            <input
              id="website"
              type="url"
              value={organisation.website}
              onChange={(e) => updateField("website", e.target.value)}
              className="w-full rounded-lg border border-soltas-line px-3 py-2 focus:border-soltas-ocean focus:outline-none"
              placeholder="https://example.com"
            />
          </div>

          <div>
            <label htmlFor="logo_url" className="block text-sm font-medium text-soltas-text mb-1">
              Logo URL
            </label>
            <input
              id="logo_url"
              type="url"
              value={organisation.logo_url}
              onChange={(e) => updateField("logo_url", e.target.value)}
              className="w-full rounded-lg border border-soltas-line px-3 py-2 focus:border-soltas-ocean focus:outline-none"
              placeholder="https://example.com/logo.png"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-soltas-text mb-2">Social Links</label>
            {socialLinks.map((link, index) => (
              <div key={index} className="mb-2 flex gap-2">
                <select
                  value={link.type}
                  onChange={(e) => updateSocialLink(index, "type", e.target.value)}
                  className="rounded-lg border border-soltas-line px-3 py-2 focus:border-soltas-ocean focus:outline-none"
                >
                  {socialLinkTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <input
                  type="url"
                  value={link.url}
                  onChange={(e) => updateSocialLink(index, "url", e.target.value)}
                  className="flex-1 rounded-lg border border-soltas-line px-3 py-2 focus:border-soltas-ocean focus:outline-none"
                  placeholder="https://..."
                />
                {socialLinks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSocialLink(index)}
                    className="rounded-lg border border-rose-400 bg-rose-50 px-3 py-2 text-sm text-rose-600 hover:bg-rose-100"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addSocialLink}
              className="mt-2 rounded-lg border border-soltas-line bg-soltas-light px-3 py-2 text-sm text-soltas-ocean hover:bg-soltas-light"
            >
              Add Social Link
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-rose-400/25 bg-rose-50 p-3 text-sm text-rose-600">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-soltas-ocean px-6 py-2 text-sm font-semibold text-white transition hover:bg-soltas-abyssal disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Organisation"}
            </button>
            <Link
              href="/profile"
              className="rounded-xl border border-soltas-line px-6 py-2 text-sm font-semibold text-soltas-ocean transition hover:bg-soltas-light"
            >
              Cancel
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}

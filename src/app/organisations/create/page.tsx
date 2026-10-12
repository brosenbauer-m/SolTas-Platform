"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  SocialLinksFields,
  emptySocialLink,
  normalizeSocialLinks,
  type SocialLink,
} from "@/components/profiles/SocialLinksFields";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, FormMessage, FormSection } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Textarea } from "@/components/ui/textarea";
import { supabaseClient } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

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
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
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

  function validate() {
    const nextErrors: Record<string, string> = {};
    if (!organisation.name.trim()) nextErrors.name = "Enter the organisation’s name.";
    if (!organisation.country_based.trim()) {
      nextErrors.country_based = "Enter the country it’s based in.";
    }
    if (!organisation.what_we_do.trim()) nextErrors.what_we_do = "Describe what the organisation does.";
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
        social_links: normalizeSocialLinks(socialLinks),
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

  const invalid = (key: string) =>
    cn(errors[key] && "border-rose-400 focus:border-rose-400 focus-visible:ring-rose-100");

  return (
    <main className="mx-auto w-full max-w-2xl space-y-8 px-5 pb-20 pt-10 sm:pt-14">
      <PageHeader
        title="Create an organisation"
        description="Set up a page for your organisation. We’ll review it before it’s verified; you can edit everything later."
      />

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {error ? <FormMessage tone="error">{error}</FormMessage> : null}

        <FormSection title="Basics">
          <Field label="Name" error={errors.name}>
            <Input
              autoComplete="organization"
              value={organisation.name}
              onChange={(e) => updateField("name", e.target.value)}
              className={invalid("name")}
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Country" error={errors.country_based}>
              <Input
                value={organisation.country_based}
                onChange={(e) => updateField("country_based", e.target.value)}
                placeholder="e.g. Kenya"
                className={invalid("country_based")}
              />
            </Field>
            <Field label="Founded" optional>
              <Input
                inputMode="numeric"
                value={organisation.existing_since}
                onChange={(e) => updateField("existing_since", e.target.value)}
                placeholder="e.g. 2020"
              />
            </Field>
          </div>
          <Field label="What you do" error={errors.what_we_do} hint="Your mission and main activities, in a few sentences.">
            <Textarea
              rows={5}
              value={organisation.what_we_do}
              onChange={(e) => updateField("what_we_do", e.target.value)}
              className={invalid("what_we_do")}
            />
          </Field>
        </FormSection>

        <FormSection title="Online" description="Help people find and recognise you.">
          <Field label="Website" optional>
            <Input
              type="url"
              inputMode="url"
              value={organisation.website}
              onChange={(e) => updateField("website", e.target.value)}
              placeholder="https://"
            />
          </Field>
          <Field label="Logo URL" optional hint="A link to a square image works best.">
            <Input
              type="url"
              inputMode="url"
              value={organisation.logo_url}
              onChange={(e) => updateField("logo_url", e.target.value)}
              placeholder="https://"
            />
          </Field>
          <SocialLinksFields
            label="Social links"
            links={socialLinks}
            onChange={updateSocialLink}
            onAdd={addSocialLink}
            onRemove={removeSocialLink}
          />
        </FormSection>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link href="/me/organisations" className={buttonClasses({ variant: "outline" })}>
            Cancel
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create organisation"}
          </Button>
        </div>
      </form>
    </main>
  );
}

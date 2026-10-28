import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import SocialLinksEditor from "@/components/profiles/SocialLinksEditor";
import { normalizeSocialLinks } from "@/components/profiles/SocialLinks";
import type { Database } from "@/lib/database.types";
import { getServerSupabase } from "@/lib/supabaseServer";

type OrganisationRow = Database["public"]["Tables"]["organisations"]["Row"];

/** Columns added in migration 20260324120019 (typed here until the generated types catch up). */
type TrustFields = {
  legal_form: string | null;
  registration_number: string | null;
  registration_country: string | null;
  founded_year: number | null;
  annual_report_url: string | null;
  contact_email: string | null;
  looking_for: string[] | null;
};

const INPUT =
  "rounded-xl border border-soltas-line bg-white px-3 py-2 text-sm text-soltas-text focus:border-soltas-ocean/50 focus:outline-none focus:ring-2 focus:ring-soltas-ocean/15";

function toOptionalString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseSocialLinks(formData: FormData, typeName: string, urlName: string) {
  const types = formData.getAll(typeName).map((entry) =>
    typeof entry === "string" ? entry.trim() : ""
  );
  const urls = formData.getAll(urlName).map((entry) =>
    typeof entry === "string" ? entry.trim() : ""
  );

  const links: { type?: string; url: string }[] = [];
  const maxLength = Math.max(types.length, urls.length);

  for (let i = 0; i < maxLength; i += 1) {
    const url = urls[i] ?? "";
    const type = types[i] ?? "";
    if (url.length === 0) continue;
    links.push({ url, type: type.length > 0 ? type : undefined });
  }

  return links;
}

async function updateOrganisation(formData: FormData) {
  "use server";

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    throw new Error("Missing organisation id.");
  }

  const supabase = await getServerSupabase();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user?.id) {
    throw new Error("Unable to resolve user session.");
  }

  const { data: organisation, error: organisationError } = await supabase
    .from("organisations")
    .select("created_by")
    .eq("id", id)
    .single();

  if (!organisation) {
    throw new Error(
      organisationError?.message ?? "Organisation not found.",
    );
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");
  const { data: membership } = await supabase
    .from("organisation_members")
    .select("role")
    .eq("organisation_id", id)
    .eq("user_id", userData.user.id)
    .maybeSingle();
  const isOrgAdmin = membership?.role === "owner" || membership?.role === "admin";
  const canEdit = organisation.created_by === userData.user.id || isOrgAdmin || isAdmin;
  if (!canEdit) {
    throw new Error("Unauthorized");
  }

  const socialLinks = parseSocialLinks(formData, "social_type", "social_url");
  const foundedRaw = toOptionalString(formData.get("founded_year"));
  const foundedYear = foundedRaw ? Number(foundedRaw) : null;
  if (foundedYear != null && (!Number.isInteger(foundedYear) || foundedYear < 1000 || foundedYear > 2100)) {
    throw new Error("Founded year must be a four-digit year.");
  }
  const lookingFor = formData
    .getAll("looking_for")
    .filter((v): v is string => v === "funding" || v === "partners" || v === "volunteers");

  const updateData: Record<string, unknown> = {
    name: toOptionalString(formData.get("name")),
    country_based: toOptionalString(formData.get("country_based")),
    what_we_do: toOptionalString(formData.get("what_we_do")),
    existing_since: toOptionalString(formData.get("existing_since")),
    website: toOptionalString(formData.get("website")),
    logo_url: toOptionalString(formData.get("logo_url")),
    social_links: socialLinks,
    legal_form: toOptionalString(formData.get("legal_form")),
    registration_number: toOptionalString(formData.get("registration_number")),
    registration_country: toOptionalString(formData.get("registration_country")),
    founded_year: foundedYear,
    annual_report_url: toOptionalString(formData.get("annual_report_url")),
    contact_email: toOptionalString(formData.get("contact_email")),
    looking_for: lookingFor,
  };

  if (isAdmin) {
    const statusValue = formData.get("verification_status");
    if (
      statusValue === "pending" ||
      statusValue === "verified" ||
      statusValue === "rejected"
    ) {
      updateData.verification_status = statusValue;
    }
  }

  const { error } = await supabase.from("organisations").update(updateData).eq("id", id);

  if (error) {
    throw new Error(error.message ?? "Unable to update organisation.");
  }

  revalidatePath(`/organisations/${id}`);
  revalidatePath(`/organisations/${id}/edit`);
  redirect(`/organisations/${id}?saved=true`);
}

export default async function OrganisationEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!id || typeof id !== "string") notFound();

  const supabase = await getServerSupabase();

  const { data: organisationRow, error } = await supabase
    .from("organisations")
    .select(
      "id,name,country_based,what_we_do,existing_since,website,social_links,logo_url,verification_status,created_by," +
        "legal_form,registration_number,registration_country,founded_year,annual_report_url,contact_email,looking_for",
    )
    .eq("id", id)
    .single();
  const organisation = organisationRow as unknown as
    | (Pick<
        OrganisationRow,
        | "id"
        | "name"
        | "country_based"
        | "what_we_do"
        | "existing_since"
        | "website"
        | "social_links"
        | "logo_url"
        | "verification_status"
        | "created_by"
      > &
        TrustFields)
    | null;

  if (!organisation) {
    if (error) {
      throw new Error("Unable to load organisation.");
    }
    notFound();
  }

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    notFound();
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");
  const { data: membership } = await supabase
    .from("organisation_members")
    .select("role")
    .eq("organisation_id", id)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  const isOrgAdmin = membership?.role === "owner" || membership?.role === "admin";
  const canEdit = organisation.created_by === auth.user.id || isOrgAdmin || isAdmin;
  if (!canEdit) {
    notFound();
  }
  const lookingFor = new Set(organisation.looking_for ?? []);

  const socialLinks = normalizeSocialLinks(organisation.social_links);

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-5 pb-20 pt-12">
      <Breadcrumbs
        items={[
          { label: "Organisations", href: "/find-organisations" },
          { label: organisation.name, href: `/organisations/${organisation.id}` },
          { label: "Edit" },
        ]}
      />

      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-soltas-text">Edit organisation</h1>
        <p className="text-sm text-soltas-muted">Update public organisation details.</p>
      </div>

      <form action={updateOrganisation} className="space-y-6">
        <input type="hidden" name="id" value={organisation.id} />

        <section className="rounded-2xl border border-soltas-line bg-white p-7">
          <h2 className="text-xs font-medium text-soltas-muted">
            Basic information
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-soltas-text">
              Organisation name
              <input
                name="name"
                defaultValue={organisation.name ?? ""}
                className="rounded-xl border border-soltas-line bg-white px-3 py-2 text-sm text-soltas-text focus:border-soltas-ocean/50 focus:outline-none focus:ring-2 focus:ring-soltas-ocean/15"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-soltas-text">
              Country based
              <input
                name="country_based"
                defaultValue={organisation.country_based ?? ""}
                className="rounded-xl border border-soltas-line bg-white px-3 py-2 text-sm text-soltas-text focus:border-soltas-ocean/50 focus:outline-none focus:ring-2 focus:ring-soltas-ocean/15"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-soltas-text">
              Existing since
              <input
                name="existing_since"
                defaultValue={organisation.existing_since ?? ""}
                className="rounded-xl border border-soltas-line bg-white px-3 py-2 text-sm text-soltas-text focus:border-soltas-ocean/50 focus:outline-none focus:ring-2 focus:ring-soltas-ocean/15"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-soltas-text">
              Website
              <input
                name="website"
                defaultValue={organisation.website ?? ""}
                className="rounded-xl border border-soltas-line bg-white px-3 py-2 text-sm text-soltas-text focus:border-soltas-ocean/50 focus:outline-none focus:ring-2 focus:ring-soltas-ocean/15"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-soltas-text sm:col-span-2">
              Logo URL
              <input
                name="logo_url"
                defaultValue={organisation.logo_url ?? ""}
                className="rounded-xl border border-soltas-line bg-white px-3 py-2 text-sm text-soltas-text focus:border-soltas-ocean/50 focus:outline-none focus:ring-2 focus:ring-soltas-ocean/15"
              />
            </label>
            {isAdmin ? (
              <label className="grid gap-2 text-sm font-medium text-soltas-text">
                Verification status
                <select
                  name="verification_status"
                  defaultValue={organisation.verification_status ?? "pending"}
                  className="rounded-xl border border-soltas-line bg-white px-3 py-2 text-sm text-soltas-text focus:border-soltas-ocean/50 focus:outline-none focus:ring-2 focus:ring-soltas-ocean/15"
                >
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                </select>
              </label>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-soltas-line bg-white p-7">
          <h2 className="text-xs font-medium text-soltas-muted">Organisation details</h2>
          <p className="mt-1 text-sm text-soltas-muted">
            What funders and partners look for before they get in touch. Everything here is public and optional.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-soltas-text">
              Legal form
              <input
                name="legal_form"
                placeholder="e.g. registered charity, association, foundation"
                defaultValue={organisation.legal_form ?? ""}
                className={INPUT}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-soltas-text">
              Founded (year)
              <input
                name="founded_year"
                type="number"
                inputMode="numeric"
                min={1000}
                max={2100}
                defaultValue={organisation.founded_year ?? ""}
                className={INPUT}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-soltas-text">
              Registration number
              <input
                name="registration_number"
                placeholder="Charity or registry number"
                defaultValue={organisation.registration_number ?? ""}
                className={INPUT}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-soltas-text">
              Registered in (country)
              <input
                name="registration_country"
                defaultValue={organisation.registration_country ?? ""}
                className={INPUT}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-soltas-text">
              Annual report (link)
              <input
                name="annual_report_url"
                type="url"
                placeholder="https://"
                defaultValue={organisation.annual_report_url ?? ""}
                className={INPUT}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-soltas-text">
              Public contact email
              <input
                name="contact_email"
                type="email"
                defaultValue={organisation.contact_email ?? ""}
                className={INPUT}
              />
            </label>
            <fieldset className="sm:col-span-2">
              <legend className="text-sm font-medium text-soltas-text">Looking for</legend>
              <div className="mt-2 flex flex-wrap gap-4">
                {[
                  ["funding", "Funding"],
                  ["partners", "Partner organisations"],
                  ["volunteers", "Volunteers"],
                ].map(([value, label]) => (
                  <label key={value} className="flex min-h-11 items-center gap-2 text-sm text-soltas-text">
                    <input
                      type="checkbox"
                      name="looking_for"
                      value={value}
                      defaultChecked={lookingFor.has(value)}
                      className="h-4 w-4 rounded border-soltas-line text-soltas-ocean focus:ring-soltas-ocean/30"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </section>

        <section className="rounded-2xl border border-soltas-line bg-white p-7">
          <h2 className="text-xs font-medium text-soltas-muted">
            What we do
          </h2>
          <textarea
            name="what_we_do"
            defaultValue={organisation.what_we_do ?? ""}
            rows={5}
            className="mt-4 w-full rounded-xl border border-soltas-line bg-white px-3 py-2 text-sm text-soltas-text focus:border-soltas-ocean/50 focus:outline-none focus:ring-2 focus:ring-soltas-ocean/15"
          />
        </section>

        <section className="rounded-2xl border border-soltas-line bg-white p-7">
          <h2 className="text-xs font-medium text-soltas-muted">
            Social links
          </h2>
          <div className="mt-4">
            <SocialLinksEditor initialLinks={socialLinks} />
          </div>
        </section>

        <div className="flex justify-end">
          <button className="inline-flex items-center justify-center rounded-xl bg-soltas-ocean px-4 py-2 text-sm font-medium text-white hover:bg-soltas-abyssal transition-all duration-200">
            Save changes
          </button>
        </div>
      </form>
    </main>
  );
}

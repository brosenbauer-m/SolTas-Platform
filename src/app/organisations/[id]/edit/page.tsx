import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import SocialLinksEditor from "@/components/profiles/SocialLinksEditor";
import { normalizeSocialLinks } from "@/components/profiles/SocialLinks";
import { getServerSupabase } from "@/lib/supabaseServer";

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
  const canEdit = organisation.created_by === userData.user.id || isAdmin;
  if (!canEdit) {
    throw new Error("Unauthorized");
  }

  const socialLinks = parseSocialLinks(formData, "social_type", "social_url");

  const updateData: Record<string, unknown> = {
    name: toOptionalString(formData.get("name")),
    country_based: toOptionalString(formData.get("country_based")),
    what_we_do: toOptionalString(formData.get("what_we_do")),
    existing_since: toOptionalString(formData.get("existing_since")),
    website: toOptionalString(formData.get("website")),
    logo_url: toOptionalString(formData.get("logo_url")),
    social_links: socialLinks,
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

  const { data: organisation, error } = await supabase
    .from("organisations")
    .select(
      "id,name,country_based,what_we_do,existing_since,website,social_links,logo_url,verification_status,created_by",
    )
    .eq("id", id)
    .single();

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
  const canEdit = organisation.created_by === auth.user.id || isAdmin;
  if (!canEdit) {
    notFound();
  }

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
        <h1 className="text-3xl font-semibold text-[#1A2B38]">Edit organisation</h1>
        <p className="text-sm text-soltas-muted">Update public organisation details.</p>
      </div>

      <form action={updateOrganisation} className="space-y-6">
        <input type="hidden" name="id" value={organisation.id} />

        <section className="rounded-2xl border border-[#6B9FB8]/25 bg-white p-7 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#8A9BAB]">
            Basic information
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-soltas-text">
              Organisation name
              <input
                name="name"
                defaultValue={organisation.name ?? ""}
                className="rounded-xl border border-[#6B9FB8]/40 bg-white px-3 py-2 text-sm text-[#1A2B38] focus:border-[#6B9FB8] focus:outline-none focus:ring-2 focus:ring-[#6B9FB8]/60"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-soltas-text">
              Country based
              <input
                name="country_based"
                defaultValue={organisation.country_based ?? ""}
                className="rounded-xl border border-[#6B9FB8]/40 bg-white px-3 py-2 text-sm text-[#1A2B38] focus:border-[#6B9FB8] focus:outline-none focus:ring-2 focus:ring-[#6B9FB8]/60"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-soltas-text">
              Existing since
              <input
                name="existing_since"
                defaultValue={organisation.existing_since ?? ""}
                className="rounded-xl border border-[#6B9FB8]/40 bg-white px-3 py-2 text-sm text-[#1A2B38] focus:border-[#6B9FB8] focus:outline-none focus:ring-2 focus:ring-[#6B9FB8]/60"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-soltas-text">
              Website
              <input
                name="website"
                defaultValue={organisation.website ?? ""}
                className="rounded-xl border border-[#6B9FB8]/40 bg-white px-3 py-2 text-sm text-[#1A2B38] focus:border-[#6B9FB8] focus:outline-none focus:ring-2 focus:ring-[#6B9FB8]/60"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-soltas-text sm:col-span-2">
              Logo URL
              <input
                name="logo_url"
                defaultValue={organisation.logo_url ?? ""}
                className="rounded-xl border border-[#6B9FB8]/40 bg-white px-3 py-2 text-sm text-[#1A2B38] focus:border-[#6B9FB8] focus:outline-none focus:ring-2 focus:ring-[#6B9FB8]/60"
              />
            </label>
            {isAdmin ? (
              <label className="grid gap-2 text-sm font-medium text-soltas-text">
                Verification status
                <select
                  name="verification_status"
                  defaultValue={organisation.verification_status ?? "pending"}
                  className="rounded-xl border border-[#6B9FB8]/40 bg-white px-3 py-2 text-sm text-[#1A2B38] focus:border-[#6B9FB8] focus:outline-none focus:ring-2 focus:ring-[#6B9FB8]/60"
                >
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                </select>
              </label>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-[#6B9FB8]/25 bg-white p-7 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#8A9BAB]">
            What we do
          </h2>
          <textarea
            name="what_we_do"
            defaultValue={organisation.what_we_do ?? ""}
            rows={5}
            className="mt-4 w-full rounded-xl border border-[#6B9FB8]/40 bg-white px-3 py-2 text-sm text-[#1A2B38] focus:border-[#6B9FB8] focus:outline-none focus:ring-2 focus:ring-[#6B9FB8]/60"
          />
        </section>

        <section className="rounded-2xl border border-[#6B9FB8]/25 bg-white p-7 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#8A9BAB]">
            Social links
          </h2>
          <div className="mt-4">
            <SocialLinksEditor initialLinks={socialLinks} />
          </div>
        </section>

        <div className="flex justify-end">
          <button className="inline-flex items-center justify-center rounded-xl bg-[#2E6B8A] px-4 py-2 text-sm font-medium text-white hover:bg-[#1A3F54] transition-all duration-200">
            Save changes
          </button>
        </div>
      </form>
    </main>
  );
}

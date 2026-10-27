import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

import SocialLinksEditor from "@/components/profiles/SocialLinksEditor";
import { normalizeSocialLinks } from "@/components/profiles/SocialLinks";
import { getServerSupabase } from "@/lib/supabaseServer";
import { IATI_ORG_ID } from "@/lib/iati/systemOrg";

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

async function updateProfile(formData: FormData) {
  "use server";

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    throw new Error("Missing profile id.");
  }

  const supabase = await getServerSupabase();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user?.id) {
    throw new Error("Unable to resolve user session.");
  }

  if (userData.user.id !== id) {
    throw new Error("Unauthorized");
  }

  const organisationValue = formData.get("organisation_id");
  let organisationId: string | null = null;

  if (typeof organisationValue === "string" && organisationValue !== "independent") {
    // Allow selection of verified orgs OR orgs where user is a member
    const { data: org } = await supabase
      .from("organisations")
      .select("id")
      .eq("id", organisationValue)
      .maybeSingle();

    if (org?.id) {
      organisationId = org.id;
    }
  }

  const socialLinks = parseSocialLinks(formData, "social_type", "social_url");

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: toOptionalString(formData.get("first_name")),
      last_name: toOptionalString(formData.get("last_name")),
      country_from: toOptionalString(formData.get("country_from")),
      country_based: toOptionalString(formData.get("country_based")),
      occupation: toOptionalString(formData.get("occupation")),
      bio: toOptionalString(formData.get("bio")),
      avatar_url: toOptionalString(formData.get("avatar_url")),
      organisation_id: organisationId,
      social_links: socialLinks,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message ?? "Unable to update profile.");
  }

  revalidatePath(`/people/${id}`);
  revalidatePath(`/people/${id}/edit`);
  redirect(`/people/${id}`);
}

export default async function ProfileEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!id || typeof id !== "string") notFound();

  const supabase = await getServerSupabase();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "id,first_name,last_name,country_from,country_based,occupation,bio,avatar_url,social_links,organisation_id",
    )
    .eq("id", id)
    .single();

  if (!profile) {
    if (error) {
      throw new Error("Unable to load profile.");
    }
    notFound();
  }

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user || auth.user.id !== profile.id) {
    notFound();
  }

  // Fetch organisations where user is a member OR that are verified
  // This allows users to select their pending orgs or any verified org
  const { data: memberOrgs } = await supabase
    .from("organisation_members")
    .select("organisation_id, organisations(id, name)")
    .eq("user_id", profile.id);

  const { data: verifiedOrgs } = await supabase
    .from("organisations")
    .select("id, name")
    .eq("verification_status", "verified")
    .neq("id", IATI_ORG_ID)
    .order("name");

  // Combine and deduplicate organisations
  const orgMap = new Map<string, { id: string; name: string }>();

  // Add verified orgs
  (verifiedOrgs ?? []).forEach((org) => {
    orgMap.set(org.id, org);
  });

  // Add member orgs (may override verified orgs with same id, which is fine)
  (memberOrgs ?? []).forEach((memberOrg) => {
    if (memberOrg.organisations) {
      const org = Array.isArray(memberOrg.organisations)
        ? memberOrg.organisations[0]
        : memberOrg.organisations;
      if (org?.id && org?.name) {
        orgMap.set(org.id, { id: org.id, name: org.name });
      }
    }
  });

  const availableOrgs = Array.from(orgMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const availableOrgIds = new Set(availableOrgs.map((org) => org.id));
  const selectedOrgId =
    profile.organisation_id && availableOrgIds.has(profile.organisation_id)
      ? profile.organisation_id
      : "independent";

  const socialLinks = normalizeSocialLinks(profile.social_links);

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-soltas-text">Edit profile</h1>
        <p className="text-sm text-soltas-muted">Update your public details.</p>
      </div>

      <form action={updateProfile} className="space-y-6">
        <input type="hidden" name="id" value={profile.id} />

        <section className="card p-6">
          <h2 className="text-lg font-semibold tracking-tight text-soltas-text">
            Basic information
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-soltas-text">
              First name
              <input
                name="first_name"
                defaultValue={profile.first_name ?? ""}
                className="rounded-lg border border-soltas-line bg-white px-3 py-2 text-sm text-soltas-text shadow-sm"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-soltas-text">
              Last name
              <input
                name="last_name"
                defaultValue={profile.last_name ?? ""}
                className="rounded-lg border border-soltas-line bg-white px-3 py-2 text-sm text-soltas-text shadow-sm"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-soltas-text">
              Country from
              <input
                name="country_from"
                defaultValue={profile.country_from ?? ""}
                className="rounded-lg border border-soltas-line bg-white px-3 py-2 text-sm text-soltas-text shadow-sm"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-soltas-text">
              Country based
              <input
                name="country_based"
                defaultValue={profile.country_based ?? ""}
                className="rounded-lg border border-soltas-line bg-white px-3 py-2 text-sm text-soltas-text shadow-sm"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-soltas-text">
              Occupation
              <input
                name="occupation"
                defaultValue={profile.occupation ?? ""}
                className="rounded-lg border border-soltas-line bg-white px-3 py-2 text-sm text-soltas-text shadow-sm"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-soltas-text">
              Avatar URL
              <input
                name="avatar_url"
                defaultValue={profile.avatar_url ?? ""}
                className="rounded-lg border border-soltas-line bg-white px-3 py-2 text-sm text-soltas-text shadow-sm"
              />
            </label>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="text-lg font-semibold tracking-tight text-soltas-text">Bio</h2>
          <textarea
            name="bio"
            defaultValue={profile.bio ?? ""}
            rows={5}
            className="mt-4 w-full rounded-lg border border-soltas-line bg-white px-3 py-2 text-sm text-soltas-text shadow-sm"
          />
        </section>

        <section className="card p-6">
          <h2 className="text-lg font-semibold tracking-tight text-soltas-text">
            Organisation
          </h2>
          <div className="mt-4 space-y-2">
            <select
              name="organisation_id"
              defaultValue={selectedOrgId}
              className="w-full rounded-lg border border-soltas-line bg-white px-3 py-2 text-sm text-soltas-text shadow-sm"
            >
              <option value="independent">Independent</option>
              {availableOrgs.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
            {profile.organisation_id && selectedOrgId === "independent" ? (
              <p className="text-xs text-amber-600">
                Your current organisation is not available for selection.
              </p>
            ) : null}
          </div>
        </section>

        <section className="card p-6">
          <h2 className="text-lg font-semibold tracking-tight text-soltas-text">
            Social links
          </h2>
          <div className="mt-4">
            <SocialLinksEditor initialLinks={socialLinks} />
          </div>
        </section>

        <div className="flex justify-end">
          <button className="inline-flex items-center justify-center rounded-lg bg-soltas-ocean px-4 py-2 text-sm font-medium text-white hover:bg-soltas-abyssal">
            Save changes
          </button>
        </div>
      </form>
    </main>
  );
}

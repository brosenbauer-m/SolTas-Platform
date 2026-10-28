import type { Metadata } from "next";

import { getPublicSupabase } from "@/lib/supabasePublic";
import { metaDescription } from "@/lib/siteUrl";

/**
 * Titles and descriptions for the detail pages (browser tab, search results, link previews). Read with
 * the public client: only what a visitor may see ends up in a preview; anything else gets the generic
 * page title and is not indexed.
 */

const hidden = (title: string): Metadata => ({ title, robots: { index: false, follow: false } });

export async function projectMetadata(slug: string): Promise<Metadata> {
  const { data } = await getPublicSupabase()
    .from("projects")
    .select("name,description,place_name,country,category,status,visibility")
    .eq("slug", slug)
    .maybeSingle();
  if (!data || data.status !== "approved") return hidden("Project");
  const where = [data.place_name, data.country]
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(", ");
  const description = metaDescription(
    data.description,
    `${data.category === "humanitarian" ? "Humanitarian" : "Environmental"} project${where ? ` in ${where}` : ""}.`,
  );
  return {
    title: data.name,
    description,
    robots: data.visibility === "public" ? undefined : { index: false, follow: true },
    openGraph: { title: data.name, description, type: "article" },
  };
}

export async function organisationMetadata(id: string): Promise<Metadata> {
  const { data } = await getPublicSupabase()
    .from("organisations")
    .select("name,what_we_do,description,country_based,verification_status")
    .eq("id", id)
    .maybeSingle();
  if (!data) return hidden("Organisation");
  const description = metaDescription(
    data.what_we_do ?? data.description,
    `Organisation${data.country_based ? ` based in ${data.country_based}` : ""} on Solarpunk Taskforce.`,
  );
  return {
    title: data.name,
    description,
    robots: data.verification_status === "verified" ? undefined : { index: false, follow: true },
    openGraph: { title: data.name, description, type: "profile" },
  };
}

export async function grantMetadata(slug: string): Promise<Metadata> {
  const { data } = await getPublicSupabase()
    .from("grants")
    .select("title,summary,description,funder_name,deadline")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return hidden("Funding");
  const description = metaDescription(
    data.summary ?? data.description,
    `Funding opportunity${data.funder_name ? ` from ${data.funder_name}` : ""}.`,
  );
  return { title: data.title, description, openGraph: { title: data.title, description, type: "article" } };
}

export async function issueMetadata(id: string): Promise<Metadata> {
  const { data } = await getPublicSupabase()
    .from("watchdog_issues")
    .select("title,description,country,city,status")
    .eq("id", id)
    .maybeSingle();
  if (!data || data.status !== "approved") return hidden("Issue");
  const where = [data.city, data.country].filter(Boolean).join(", ");
  const description = metaDescription(
    data.description,
    `Local issue${where ? ` in ${where}` : ""} raised on Solarpunk Taskforce.`,
  );
  return { title: data.title, description, openGraph: { title: data.title, description, type: "article" } };
}

export async function personMetadata(id: string): Promise<Metadata> {
  const { data } = await getPublicSupabase()
    .from("profiles")
    .select("first_name,last_name,occupation")
    .eq("id", id)
    .maybeSingle();
  const name = [data?.first_name, data?.last_name].filter(Boolean).join(" ");
  if (!name) return hidden("Profile");
  // People pages are shareable but not pushed to search engines.
  return {
    title: name,
    description: data?.occupation ?? `${name} on Solarpunk Taskforce`,
    robots: { index: false, follow: true },
  };
}

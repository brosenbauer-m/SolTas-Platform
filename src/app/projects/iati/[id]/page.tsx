import { notFound, permanentRedirect } from "next/navigation";

import { getPublicSupabase } from "@/lib/supabasePublic";

/** Old IATI activity URLs (/projects/iati/<IATI identifier>) now redirect to the regular project page. */
export default async function OldIatiActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let identifier = id;
  try {
    identifier = decodeURIComponent(id);
  } catch {
    // keep as is
  }
  const { data } = await getPublicSupabase()
    .from("projects")
    .select("slug")
    .eq("iati_identifier", identifier)
    .maybeSingle();
  if (!data?.slug) notFound();
  permanentRedirect(`/projects/${encodeURIComponent(data.slug)}`);
}

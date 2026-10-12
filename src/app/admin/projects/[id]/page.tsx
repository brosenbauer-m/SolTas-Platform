import Link from "next/link";
import { notFound } from "next/navigation";

import { ProjectApprovalActions } from "@/components/admin/ProjectApprovalActions";
import Map from "@/components/Map";
import type { Database } from "@/lib/database.types";
import { getServerSupabase } from "@/lib/supabaseServer";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ProjectLinksRow = Database["public"]["Tables"]["project_links"]["Row"];
type ProjectMediaRow = Database["public"]["Tables"]["project_media"]["Row"];
type ProjectPartnersRow = Database["public"]["Tables"]["project_partners"]["Row"];
type ProjectSdgsRow = Database["public"]["Tables"]["project_sdgs"]["Row"];
type ProjectIfrcRow = Database["public"]["Tables"]["project_ifrc_challenges"]["Row"];
type OrganisationRow = Database["public"]["Tables"]["organisations"]["Row"];
type SdgRow = Database["public"]["Tables"]["sdgs"]["Row"];
type IfrcChallengeRow = Database["public"]["Tables"]["ifrc_challenges"]["Row"];

type ProjectDetail = ProjectRow & {
  created_by_profile: Pick<ProfileRow, "full_name" | "organisation_name" | "role"> | null;
  project_links: (Pick<ProjectLinksRow, "id" | "label" | "url"> & {
    created_at?: string | null;
  })[];
  project_media: (Pick<ProjectMediaRow, "id" | "path" | "caption" | "mime_type"> & {
    created_at?: string | null;
  })[];
  project_partners: (Pick<ProjectPartnersRow, "organisation_id"> & {
    organisation: Pick<OrganisationRow, "id" | "name"> | null;
  })[];
  project_sdgs: (Pick<ProjectSdgsRow, "sdg_id"> & {
    sdg: Pick<SdgRow, "id" | "name"> | null;
  })[];
  project_ifrc_challenges: (Pick<ProjectIfrcRow, "challenge_id"> & {
    challenge: Pick<IfrcChallengeRow, "id" | "name" | "code"> | null;
  })[];
};

type RawProjectDetail = Omit<ProjectDetail, "created_by_profile"> & {
  created_by_profile: Pick<ProfileRow, "full_name" | "organisation_name" | "role">[] | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(value));
  } catch (error) {
    console.error("date-format", error);
    return value;
  }
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch (error) {
    console.error("datetime-format", error);
    return value;
  }
}

function formatCurrency(amount: number | null, currency: string | null) {
  if (typeof amount !== "number") return null;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency ?? "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch (error) {
    console.error("currency-format", error);
    return currency ? `${currency} ${amount}` : `${amount}`;
  }
}

function parseJsonLinks(value: ProjectRow["links"]) {
  if (!value) return [] as { label?: string | null; url?: string | null }[];
  if (Array.isArray(value)) {
    return value as { label?: string | null; url?: string | null }[];
  }
  if (typeof value === "object" && value !== null) {
    return Object.values(value) as { label?: string | null; url?: string | null }[];
  }
  return [];
}

export default async function AdminProjectDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await getServerSupabase();
  const { id } = await params;
  const { data: isAdmin } = await supabase.rpc("is_admin");

  if (!isAdmin) {
    notFound();
  }

  const { data, error } = await supabase
    .from("projects")
    .select(
      `*,
       project_links:project_links(id,label,url,created_at),
       project_media:project_media(id,path,caption,mime_type,created_at),
       project_partners:project_partners(organisation_id,organisation:organisations(id,name)),
       project_sdgs:project_sdgs(sdg_id,sdg:sdgs(id,name)),
       project_ifrc_challenges:project_ifrc_challenges(challenge_id,challenge:ifrc_challenges(id,name,code)),
       created_by_profile:profiles(full_name,organisation_name,role)
      `
    )
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    notFound();
  }

  const rawProject = data as RawProjectDetail;

  const project: ProjectDetail = {
    ...rawProject,
    created_by_profile: rawProject.created_by_profile?.[0] ?? null,
    project_links: rawProject.project_links ?? [],
    project_media: rawProject.project_media ?? [],
    project_partners: rawProject.project_partners ?? [],
    project_sdgs: rawProject.project_sdgs ?? [],
    project_ifrc_challenges: rawProject.project_ifrc_challenges ?? [],
  };

  const jsonLinks = parseJsonLinks(project.links);
  const hasLocation = typeof project.lat === "number" && typeof project.lng === "number";

  // database.types.ts may be out of date; read slug safely anyway
  const projectSlug = (project as unknown as { slug?: string | null }).slug ?? project.id;

  const fundingParts = [
    formatCurrency(project.donations_received, project.currency)
      ? `Raised ${formatCurrency(project.donations_received, project.currency)}`
      : null,
    formatCurrency(project.amount_needed, project.currency)
      ? `Needed ${formatCurrency(project.amount_needed, project.currency)}`
      : null,
  ].filter(Boolean);

  const createdBy =
    project.created_by_profile?.full_name ??
    project.created_by_profile?.organisation_name ??
    project.created_by ??
    "Unknown";

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold text-soltas-text">{project.name}</h1>
          <p className="text-sm text-soltas-muted">
            Created {formatDateTime(project.created_at)} by {createdBy}
          </p>
          <p className="text-xs text-soltas-muted">Project ID: {project.id}</p>
        </div>
        <ProjectApprovalActions projectId={project.id} projectName={project.name} layout="inline" />
      </div>

      <section className="rounded-xl border p-4">
        <h2 className="mb-3 text-lg font-semibold text-soltas-text">Overview</h2>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs font-medium text-soltas-muted">Status</dt>
            <dd className="text-sm text-soltas-text">{project.status}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-soltas-muted">
              Lifecycle status
            </dt>
            <dd className="text-sm text-soltas-text">{project.lifecycle_status ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-soltas-muted">
              Review status
            </dt>
            <dd className="text-sm text-soltas-text">{project.review_status ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-soltas-muted">
              Location
            </dt>
            <dd className="text-sm text-soltas-text">
              {[project.place_name, project.region, project.country].filter(Boolean).join(", ") || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-soltas-muted">Timeline</dt>
            <dd className="text-sm text-soltas-text">
              {[formatDate(project.start_date), formatDate(project.end_date)]
                .filter(value => value !== "—")
                .join(" → ") || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-soltas-muted">Funding</dt>
            <dd className="text-sm text-soltas-text">
              {fundingParts.length ? fundingParts.join(" · ") : "—"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="mb-3 text-lg font-semibold text-soltas-text">Description</h2>
        <p className="whitespace-pre-line text-sm leading-relaxed text-soltas-text">
          {project.description || "No description provided."}
        </p>
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="mb-3 text-lg font-semibold text-soltas-text">Links</h2>
        <div className="space-y-2 text-sm">
          {project.project_links.length === 0 && jsonLinks.length === 0 ? (
            <p className="text-soltas-muted">No links submitted.</p>
          ) : (
            <ul className="space-y-2">
              {project.project_links.map(link => (
                <li key={link.id}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-soltas-ocean hover:underline"
                  >
                    {link.label || link.url}
                  </a>
                </li>
              ))}
              {jsonLinks.map((link, index) => (
                <li key={`json-${index}`}>
                  {link?.url ? (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-soltas-ocean hover:underline"
                    >
                      {link.label || link.url}
                    </a>
                  ) : (
                    <span className="text-soltas-muted">{link.label}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="mb-3 text-lg font-semibold text-soltas-text">Partners</h2>
        {project.project_partners.length === 0 && !project.partner_org_ids?.length ? (
          <p className="text-sm text-soltas-muted">No partner organisations listed.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {project.project_partners.map(partner => (
              <li key={partner.organisation_id}>{partner.organisation?.name ?? partner.organisation_id}</li>
            ))}
            {project.partner_org_ids?.map(pid => (
              <li key={`fallback-${pid}`}>{pid}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="mb-3 text-lg font-semibold text-soltas-text">Sustainable Development Goals</h2>
        {project.project_sdgs.length === 0 && !project.sdgs?.length ? (
          <p className="text-sm text-soltas-muted">No SDGs specified.</p>
        ) : (
          <div className="flex flex-wrap gap-2 text-sm">
            {project.project_sdgs.map(item => (
              <span key={item.sdg_id} className="rounded-full bg-soltas-glacial/15 px-3 py-1 text-soltas-ocean">
                {item.sdg?.name ?? `SDG ${item.sdg_id}`}
              </span>
            ))}
            {project.sdgs?.map(code => (
              <span key={`sdg-${code}`} className="rounded-full bg-soltas-glacial/15 px-3 py-1 text-soltas-ocean">
                {code}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="mb-3 text-lg font-semibold text-soltas-text">IFRC Global Challenges</h2>
        {project.project_ifrc_challenges.length === 0 && !project.ifrc_global_challenges?.length ? (
          <p className="text-sm text-soltas-muted">No IFRC challenges specified.</p>
        ) : (
          <div className="flex flex-wrap gap-2 text-sm">
            {project.project_ifrc_challenges.map(item => (
              <span key={item.challenge_id} className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                {item.challenge?.name ?? item.challenge?.code ?? `Challenge ${item.challenge_id}`}
              </span>
            ))}
            {project.ifrc_global_challenges?.map(code => (
              <span key={`ifrc-${code}`} className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                {code}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="mb-3 text-lg font-semibold text-soltas-text">Media</h2>
        {project.project_media.length === 0 ? (
          <p className="text-sm text-soltas-muted">No media uploaded.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {project.project_media.map(item => (
              <li key={item.id} className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium text-soltas-text">{item.caption || item.path}</div>
                  <div className="text-xs text-soltas-muted">
                    {item.mime_type || "Unknown type"} · {formatDateTime(item.created_at)}
                  </div>
                </div>
                <Link
                  href={item.path}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-soltas-ocean hover:underline"
                >
                  View
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {hasLocation ? (
        <section className="rounded-xl border p-4">
          <h2 className="mb-3 text-lg font-semibold text-soltas-text">Location</h2>
          <p className="mb-3 text-sm text-soltas-muted">
            Coordinates: {project.lat?.toFixed(4)}, {project.lng?.toFixed(4)}
          </p>
          <div className="h-64 overflow-hidden rounded-lg border">
            <Map
              markers={[
                {
                  id: project.id,
                  slug: projectSlug,
                  lat: project.lat as number,
                  lng: project.lng as number,
                  title: project.name,
                },
              ]}
            />
          </div>
        </section>
      ) : null}

      <div>
        <Link href="/admin/projects" className="text-sm font-medium text-soltas-ocean hover:underline">
          ← Back to approvals
        </Link>
      </div>
    </main>
  );
}

# Roadmap

Status: 2026-10-12 (evening). Product reference: `docs/blueprint.md`. Each item becomes one or more small PRs.
✅ done · 🔄 in progress · ⬜ planned · ❓ needs an owner decision

## Phase 0 — Stable and safe (done this week)

- ✅ Projects visible to logged-out visitors again; private/pending projects no longer readable by everyone (#172, #177)
- ✅ Profile saving fixed; roles/admin flags only changeable by superadmins (#178)
- ✅ Organisation membership and creation locked down; join-request approval fixed (#179)
- ✅ Next.js security upgrade (#173); CI on every PR (#174)
- ✅ Production schema captured in migrations; fresh databases can be built from the repo (#180, baseline)
- ✅ Broad policies tightened, legacy objects retired (#181); date of birth private (#182)
- ✅ Project updates can be published from the project page (#176)
- ✅ Comment author names and admin review pages load again (#186)
- ✅ Password reset; email links (confirm, reset) keep you signed in (#187)
- ✅ "Report an issue" saves reports (it only logged to the console before) (#188)
- ⬜ Hide `grants.notes_internal` from the public API (column grants, like date of birth)

## Phase 1 — Look and feel (now)

Goal: elegant, simple, friendly — see `docs/DESIGN.md`.

- ✅ Design foundation: system font, accessible colours, shared `Button` / `Card` / `PageHeader` / `EmptyState` / `Field` (#184)
- ✅ Header and navigation (desktop + mobile sheet), footer (#184)
- ✅ Home: globe hero with clear headline, key figures, one primary call to action (#184)
- ✅ Find Projects / Organisations / Funding / Watchdog: page headers, segmented view switch, container-query filters (#184)
- ✅ Project, organisation, funding, issue and person pages: consistent header, key facts, sections (#184, #185, #190)
- ✅ Forms: sign in / sign up / password reset, create organisation, add funding, report issue (#187–#189)
- ✅ Notifications and settings as grouped lists (#185)
- ✅ Feed activity list, working feed links, admin dashboard with pending counts (#191)
- ⬜ New/edit project form in the new style (long form: split into steps)
- ⬜ Accessibility pass (keyboard, screen reader labels, contrast) and mobile pass at 390px

## Phase 2 — Complete the core blueprint

- ✅ Find-page filters: searchable dropdowns, main filters + "Add filter", one Sort menu, Project status, Closing within (#198)
- ⬜ **Shared taxonomies** (see `docs/research/filters.md`): one fixed Sector list for all four entities, Target groups,
  Ecosystems, Approaches, Organisation type, Issue type; `taxonomy_terms` table, then one migration PR per entity
- ⬜ **Missing filters that need new data:** Issue status (reported → resolved), Funding "who can apply" + funder type +
  forthcoming, Organisation type + verified + "led by", Project "accepting donations/volunteers", climate & nature focus
- ⬜ Creatable tag fields in the forms (project/organisation): suggest existing tags as you type, create new ones with
  normalised capitalisation (until the fixed taxonomies replace free tags)
- ⬜ "Near me" / "Search this map area" on the globe
- ⬜ **IATI data on the globe and in Find Projects**: nightly sync from the IATI Datastore API into a separate,
  read-only table, with an "IATI" badge and later a claim flow. Plan and open decisions: `docs/architecture/iati-integration.md`

- ⬜ **Subscribe** UX everywhere: "+" next to the name turns into "✓ Following" with a short confirmation
- ⬜ **Home globe views**: All · Following (gold pulsing markers for new updates) · Featured (curated)
- ⬜ **Find Projects filters**: SDG + IFRC tags, target demographics, intervention type, location, organisation, donations range; table sorting (dates, donations, A–Z, status, funding needed)
- ⬜ **Project profile**: partner organisations, SDGs/IFRC, lives improved, gallery, posts; donate / support link
- ⬜ **Impact metrics (manual first)**: owners define metrics (name + unit) and update values; shown as tiles on the project and summed on the organisation
- ⬜ **Organisation profile**: projects carried out / ongoing, lives improved, partners, project list with search, publications
- ⬜ **Find Funding**: eligibility, amount range, duration, deadline, status filters; deadline reminders
- ⬜ **Feed**: three views (Popular · Following · Watchdog); share; donate shortcut on project posts
- ⬜ **User profiles**: "Independent / Watchdog / Organisation" label, portfolio (projects, issues, organisations with role + period), following list
- ⬜ **Notifications**: email digests for followed projects (respecting the email setting)
- ✅ **Who may post in the feed?** Decided: individuals may post too (current behaviour)

## Phase 3 — Content and brand

- ⬜ About page rewrite from the blueprint (problem, vision, mission, how it works, links to every section)
- ⬜ **Note Empathy** page: media (video/podcast/art), writing, store (store later)
- ⬜ Services page with a request form (consulting, marketing)
- ⬜ Featured projects curation tool for admins

## Phase 4 — Intelligence and money

- ⬜ **AI search** for projects/organisations: provider decided, **Mistral** (EU); add it to the privacy page when built
- ⬜ **AI-assisted impact metrics** (Mistral) (suggest metrics from the project description; builds on Phase 2 metrics)
- ⬜ **Timeline / history**: store project snapshots so the globe can show any point in time
- ⬜ **Donations**: placeholder card on project pages (`DONATIONS_ENABLED` in `src/lib/donations.ts`). Later: provider (Mollie/Stripe Connect, or betterplace / Open Collective Europe) once the legal entity exists
- ⬜ Globe clustering and performance for thousands of markers

## Quality and operations (ongoing)

- ⬜ End-to-end smoke tests (Playwright) for sign-up, submit project, follow, post update
- ✅ Analytics: Vercel Web Analytics (cookieless). Error monitoring only if a need comes up
- ⬜ **Privacy policy and legal notice pages** (none exist yet; list Supabase, Vercel, Mapbox, email provider, Mistral)
- ⬜ SEO: page titles/descriptions, Open Graph images for projects and organisations
- ⬜ Moderation tools: bulk review, reasons, audit log
- ⬜ Image uploads for projects/organisations with resizing (Supabase Storage)

## Decisions needed from the owner

1. ~~Feed posting rules~~: individuals may post (decided 2026-10-13).
2. ~~AI provider~~: Mistral (decided 2026-10-13).
3. Donations: decide the provider once the legal entity exists (placeholder live meanwhile).
4. ~~Analytics~~: Vercel Web Analytics (decided 2026-10-13).
5. Note Empathy content owner and store timeline.

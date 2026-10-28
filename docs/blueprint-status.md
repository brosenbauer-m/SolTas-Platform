# Blueprint status (checked against the code, 2026-10-27)

Every item of `docs/blueprint.md` checked in the code (routes, components, migrations), not in the roadmap.
Update this file when a phase lands. Risk follows AGENT_RULES: DB/RLS/auth/payments/AI prompts = High.

## 1. Where we are

| Area | Feature | Status | What's missing |
|---|---|---|---|
| Home | Globe turning slowly, glass circles with correct counts | Done | — |
| Home | Key figures | Partly | Changemakers, lives improved, issues resolved |
| Home | Views All / Following / Featured | Partly | Projects / Funding / Issues, plus All projects / Following for signed-in people. No gold pulse for new updates, no curated Featured |
| Data | IATI import (~25k, nightly), IATI tag with (i), sector names as tags | Done | Organisations claiming their IATI projects |
| Find Projects | Globe + filters + results table, sorting | Done | End date / status sorts |
| Find Projects | Standard tags (shared list, requests, admin queue) | Done (#216) | Tags for organisations and funding |
| Find Projects | AI search (Mistral) | Built (#218), off until keys are set | Limit to paying members once fees exist |
| Find Projects | SDG + IFRC filters, end-date sort | Done | — |
| Find Projects | Timeline slider / history | Not started | No history stored |
| Project page | Core profile, updates, likes, comments, follow, tags, partners, goals (SDG/IFRC), provenance and last-updated line | Done | Documents, contact person |
| Project page | AI tags on create | Built (#218) | — |
| Project page | Impact metrics, update reminders | Not started | — |
| Project page | Donations | Placeholder | Payment provider, legal entity |
| Project form | Step-by-step form in the new design | Partly | Works, one long form; saving an edit is one transaction now |
| Organisations | Globe + table + filters, sorting | Done | — |
| Org page | Name, description, followers, ongoing/finished counts, projects led and as partner, trust details (legal form, registration, founded, annual report, contact, looking for), members post updates | Done | Lives improved, impact, gallery, publications |
| Funding | List, filters, table, globe | Done | Who can apply, duration, deadline reminders |
| Feed | Popular / Following / Issues, posts, likes, comments | Done | Share button, donate shortcut |
| Issues | Report, review, list/globe/table, updates | Done | Fundraising, resolved steps, linking advocates and organisations |
| Note Empathy | Media / writing / store | Not started | — |
| Services | Overview + request | Partly | Request is an email link, no form |
| Profiles | Name, nationality, organisation, bio, links | Partly | Portfolio, Watchdog label, following list |
| Notifications | In-app, email setting | Partly | Email digests for followed projects |
| Membership fees | Individuals and organisations | Not started | Provider, prices |
| Legal | Privacy, legal notice, processors | Done | Add the payment provider when chosen |
| SEO / sharing | Page titles and descriptions, link previews, sitemap, robots, styled not-found and error pages | Done | Per-project preview images |
| Quality | CI, RLS tests, admin review, scan fixes (#217), session middleware (#220), list timeouts fixed (#221) | Done | End-to-end tests, rate limits on posts/comments, typed Supabase clients |

## 2. Suggested order

**A. Quick wins (Low/Medium)**: ~~partners and SDGs/IFRC on the project page; SDG/IFRC filters and sorts~~ (done);
~~organisation page counts, partners~~ (done); organisation project search (M); feed share button (S); services request form (S–M).

**B. Robustness (Medium/High)**: ~~Supabase session middleware~~ (done); typed Supabase clients and the
errors they reveal (M); ~~project edit as one database function~~ (done);
rate limits on posts, comments, uploads (M); delete dead routes and pages (S).

**C. Membership and money (High)**: provider (e.g. Mollie, EU), plans for individuals and organisations, checkout,
billing records (L); then AI search for members only; donations (L, needs the legal entity).

**D. Engagement (Medium–High)**: impact metrics (M, new tables), Following/Featured on the home globe (M), email
digests and update reminders (M), profile portfolio (M), issue status steps and fundraising (M–L), more key figures (S).

**E. Content and depth**: Note Empathy page (M), timeline/history (L, maybe drop), funding details and reminders (M),
step-by-step project form, accessibility/mobile pass, SEO, end-to-end tests (M each).

## 3. Decisions for the owner

1. Membership: prices for individuals and organisations, monthly or yearly, provider (same one for donations?).
2. What do non-members get: plain filters only, or a few AI searches to try?
3. Tags: who approves new tag requests; should organisations and funding get tags too?
4. Featured projects: who picks them; home switch Projects/Funding/Issues, All/Following/Featured, or both?
5. Issue fundraising through the platform (needs the legal entity) or links to outside fundraisers?
6. Note Empathy: owner of the content, launch date, store in scope?
7. Timeline/history: still wanted (costly)?
8. Portfolio roles: self-claimed or confirmed by the project owner?

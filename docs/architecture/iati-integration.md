# IATI integration plan

Status: **proposal, waiting for the owner's decisions** (§8). Nothing here has been built yet.

## 1. In short

- **What:** show projects that organisations already publish to IATI (the International Aid Transparency
  Initiative) on our globe and in Find Projects, next to the projects people add on Solarpunk Taskforce.
- **How:** a nightly job asks the official **IATI Datastore API** for activities that changed since the last run
  and copies the parts we need into our own database. No manual uploads, no work for the owner once it runs.
- **Kept apart:** IATI activities live in their own table, read-only, marked "Source: IATI". They never mix
  with projects people own here. Later, an organisation can **claim** its IATI activities and link them to
  its own project pages.
- **Scope:** only humanitarian and environmental activities that are planned or ongoing, not all ~1 million
  IATI activities.

## 2. Ways to get the data, compared

| Option | What it is | Automatic? | Verdict |
| --- | --- | --- | --- |
| **IATI Datastore API** (`api.iatistandard.org/datastore`) | Official search API over all published IATI data, refreshed from publishers several times a day. Free key from developer.iatistandard.org. | Yes: we can ask "everything changed since yesterday". | **Use this.** |
| Bulk data dump (IATI "data dump", all XML files) | Every publisher's raw files in one big download (several GB). | Possible, but we would re-parse everything every night. | Only as a fallback for a one-off backfill if the API is too slow. |
| Upload a data file (CSV/XML) | An admin uploads a spreadsheet. | No. Data goes stale the day after. | Not for IATI. Keep the idea for non-IATI partners who send us a spreadsheet (later). |
| IATI GitHub repositories | Source code of IATI's own services. `IATI/datastore-services` is the Datastore's admin back end (Azure functions); `IATI/datastore-solr-configs` describes its fields. | n/a | **Not a data source.** Useful as documentation. The `IATI/IATI-Codelists` repo gives us the labels for codes (sectors, statuses, organisation types). |

## 3. What the Datastore API gives us

The Datastore is a Solr search index with three collections: `activity`, `transaction` and `budget`. We only
need `activity`. A request looks like:

```
GET https://api.iatistandard.org/datastore/activity/select
    ?q=<Solr query>&fl=<fields>&rows=1000&sort=id asc&cursorMark=*
Header: Ocp-Apim-Subscription-Key: <key>      (verify the header name when we have the key)
```

`cursorMark` pages through large results. `last_updated_datetime:[<last run> TO *]` returns only what changed.

Field names below were checked against the Datastore's Solr schema
(`IATI/datastore-solr-configs/configsets/activity/conf/managed-schema`). "Many" means a list.

| IATI field | Type | Many | Used for |
| --- | --- | --- | --- |
| `iati_identifier` | text | | unique ID, page URL |
| `last_updated_datetime` | date | | incremental sync, "Recently updated" filter |
| `reporting_org_ref`, `reporting_org_type`, `reporting_org_narrative` | text | | "Reported by" + organisation type |
| `reporting_org_secondary_reporter` | boolean | | skip copies reported by someone else |
| `title_narrative` (+ `_xml_lang`) | text | ✓ | name (English if available) |
| `description_narrative`, `description_type` | text | ✓ | description (type 1 = general) |
| `participating_org_role`, `_ref`, `_narrative` | text | ✓ | "Funded by" (role 1), "Implemented by" (role 4) |
| `activity_status_code` | text | | Status: Planned / Ongoing / … |
| `activity_date_type`, `activity_date_iso_date` | text, date | ✓ | start and end (actual, else planned) |
| `recipient_country_code`, `recipient_country_percentage` | text, number | ✓ | countries |
| `recipient_region_code` | text | ✓ | region |
| `location_point_pos`, `location_point_latlon`, `location_name_narrative`, `location_exactness_code` | text / point | ✓ | map points |
| `activity_scope_code` | text | | geographic scale |
| `sector_code`, `sector_vocabulary`, `sector_percentage` | text, number | ✓ | DAC sectors → our Sector list |
| `policy_marker_code`, `policy_marker_significance`, `policy_marker_vocabulary` | text | ✓ | climate, biodiversity, desertification, gender, disability, DRR |
| `humanitarian`, `humanitarian_scope_code` | boolean, text | | humanitarian flag, GLIDE/appeal codes |
| `tag_code`, `tag_vocabulary` | text | ✓ | SDG goals (vocabulary 2) and targets (3) |
| `budget_value`, `budget_value_currency`, `budget_period_start_iso_date`, `default_currency` | number, text, date | ✓ | total budget |
| `document_link_url`, `document_link_category_code` | text | ✓ | links |
| `hierarchy`, `related_activity_ref`, `related_activity_type` | number, text | ✓ | parent/child programmes |
| `iati_json` | large text | | full activity, if we need anything else |

Lists in Solr are flattened per field, so `title_narrative` and `title_narrative_xml_lang` don't always line up.
Where alignment matters (language of titles, a budget's currency), the sync parses `iati_json` instead.
**Phase 2 checks this against real responses.**

We **don't copy** `contact_info_*` (names, emails, phone numbers of individuals). We don't need personal data.

## 4. Which activities we import (scope)

Default proposal (one Solr query, adjusted after we see the real counts):

```
activity_status_code:(1 OR 2)                                       planned or ongoing
AND -reporting_org_secondary_reporter:true                          no duplicates
AND ( humanitarian:true
   OR sector_code:(410* OR 140* OR 311* OR 312* OR 313* OR 740*)    environment, water, agriculture, forestry,
                                                                    fishing, disaster prevention (DAC, verify list)
   OR (policy_marker_code:(5 OR 6 OR 7 OR 8) AND policy_marker_significance:(1 OR 2)) )   Rio markers
```

- We first run it with `rows=0` to see how many activities match. We tune the scope before importing anything.
- Ended activities (status 3–6) that we already hold are updated, not deleted, so their pages keep working.
- Activities that leave the scope or disappear from IATI get `withdrawn_at` set and drop off the map. We don't
  delete them; deleting data needs the owner's OK (AGENT_RULES).

**Size.** About 3 KB per activity without the raw JSON. 100,000 activities ≈ 300 MB plus indexes. That is too
much for Supabase Free (500 MB in total) and fine for Pro (8 GB). See question 3 in §8.

## 5. Data model

New tables (one migration PR, High risk, RLS tests included):

**`iati_activities`**: one row per activity. Public read, written only by the sync (service role).

| Column | Notes |
| --- | --- |
| `iati_identifier text primary key` | |
| `title`, `description` | English if published, else the first language |
| `reporting_org_ref`, `reporting_org_name`, `reporting_org_type` | |
| `participating_orgs jsonb` | `[{role, ref, name, type}]` |
| `activity_status smallint`, `lifecycle_status text` | IATI 1–6 and our slug (same values as `projects.lifecycle_status`) |
| `start_date`, `end_date date` | actual, else planned |
| `countries text[]`, `regions text[]`, `scope text` | ISO 3166-1 alpha-2, IATI region codes |
| `locations jsonb` | `[{name, lat, lng, exactness}]` |
| `lat`, `lng double precision`, `point_precision text` | the map point: `exact` / `country` (centroid) / `region` |
| `dac_sectors text[]`, `sectors text[]` | raw DAC codes, our shared Sector slugs (via the crosswalk) |
| `policy_markers jsonb`, `humanitarian boolean`, `humanitarian_scopes text[]` | |
| `sdgs text[]` | same format as `projects.sdgs` |
| `budget_total numeric`, `currency text` | |
| `links jsonb` | website and documents |
| `last_updated_at timestamptz`, `synced_at timestamptz`, `withdrawn_at timestamptz` | |
| `hidden boolean default false` | admins can hide a bad record (moderation) |
| `linked_project_id uuid`, `linked_organisation_id uuid` | set by the claim flow (§7, phase 5) |
| `search tsvector` (generated) | title + description + organisations |

Indexes: `(lat, lng)`, GIN on `countries`, `sectors`, `search`, and `last_updated_at`.

**`iati_sync_runs`** (server only, no policies): `started_at`, `finished_at`, `mode` (incremental/full),
`high_water_mark`, `fetched`, `upserted`, `withdrawn`, `error`. The next run starts from the last successful
high-water mark.

**`countries`** (public read): ISO code, name, centroid lat/lng, UN M49 region. Places activities that only
name a country, and gives the country filter a fixed list. (Natural Earth / ISO data, public domain.)

**RLS**
- `iati_activities`: SELECT for `anon` + `authenticated` where `not hidden and withdrawn_at is null`. Admins
  (`is_admin()`) may SELECT all rows and UPDATE only `hidden`. No INSERT/DELETE policies; the sync uses the
  service role.
- `iati_sync_runs`: RLS on, no policies.
- `countries`: SELECT for everyone.

**One list for the map and Find**: a `security_invoker` view `map_items` that unions approved public
`projects` and visible `iati_activities` into the same shape: `kind`, `source` (`soltas` / `iati`), `id`,
`title`, `lat`, `lng`, `point_precision`, `lifecycle_status`, `sectors`, `countries`, `url`. IATI rows already
linked to a native project are left out, so nothing shows twice. Find Projects and the globe read this view
(or an RPC with filters and a map-area bounding box once there are many rows).

## 6. Sync job

- **Where:** a scheduled **GitHub Actions** workflow (`.github/workflows/iati-sync.yml`, nightly ~03:00 UTC, plus
  a manual "Run workflow" button). It runs `pnpm sync:iati` (a TypeScript script in `scripts/iati/`). A
  first backfill can take an hour, which is too long for Vercel functions (a few minutes at most) and Supabase
  Edge Functions.
- **Secrets** (GitHub Actions secrets, never in the repo): `IATI_API_KEY`, `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`. Listed in `.env.example` without values.
- **Steps:**
  1. Read the last high-water mark from `iati_sync_runs`.
  2. Query the scope with `last_updated_datetime:[mark TO *]` and page through it with `cursorMark`, 1,000 rows per page.
  3. Transform each activity: pick the language, map the codes, choose the map point.
  4. Upsert in batches of 500 on `iati_identifier`.
  5. Store the new mark.
  - Requests are throttled and retried with backoff on 429/5xx.
- **Weekly full check:** fetch only identifiers in scope. Anything we hold that isn't in that list gets
  `withdrawn_at`.
- **Dry run:** `pnpm sync:iati --dry-run --limit 200` prints what it would write, for checking the mapping.
- **Failure:** the workflow fails visibly in GitHub Actions (email to the owner). The site keeps showing the
  last good data.

## 7. Showing it on the site

- **Globe:** hundreds of thousands of points need **clustering**. Mapbox GL clusters GeoJSON sources natively:
  numbered bubbles that split as you zoom in. IATI markers get their own colour, and country-centroid points
  are drawn as hollow "approximate" markers.
- **Find Projects:**
  - a **Source** filter (All · Community · IATI);
  - IATI rows get an "IATI" badge and the reporting organisation;
  - the shared filters (status, sector, country, SDGs, dates, budget) work for both sources;
  - free-text search uses `search`.
- **Activity page** `/projects/iati/[identifier]`: read-only profile with the same layout as a project, plus:
  - "Reported by … via IATI";
  - last updated;
  - a link to the activity on d-portal.org;
  - (later) "Is this your organisation's work? Claim it".
- **Attribution:** IATI data is published under each publisher's open licence (mostly CC BY or more open). Each
  page names the publisher and links to the source. The About page gets a "Data sources" note. We send IATI
  no personal data (only our key and the query), so IATI is not a data processor for the privacy policy.
  Mention it under "Data sources" on About.
- **Home stats:** "X projects, including Y published to IATI".

## 8. Decisions needed from the owner

1. **API key:** create a free account at developer.iatistandard.org. Subscribe to the Datastore API product,
   then add the key as GitHub secret `IATI_API_KEY` (Repository → Settings → Secrets and variables → Actions).
   Never paste it in a chat, a file or a PR.
2. **Scope:** start with "planned + ongoing, humanitarian or environmental" (§4)? Or start smaller, as a pilot
   (one region or a few countries), and widen later?
3. **Supabase plan:** Free (500 MB) or Pro (8 GB)? On Free we must keep the scope small.
4. **Separate table + "IATI" badge (recommended)** rather than importing into `projects`?
5. **Shown by default** on the globe and in Find Projects (recommended), or only when the user picks the
   IATI source?

## 9. Phases (one PR each)

| # | PR | Risk | Depends on |
| --- | --- | --- | --- |
| 0 | Owner: API key, decisions in §8 | – | – |
| 1 | Migration: `countries` (+ data), `iati_activities`, `iati_sync_runs`, RLS, `supabase/tests/iati_*` | High | 0 |
| 2 | Sync script + dry run + workflow (manual trigger only); count and tune the scope; first backfill | Medium | 1 |
| 3 | `map_items` view, clustered globe, Source filter, IATI badge, activity page | Medium (view = migration, High) | 2 |
| 4 | Shared taxonomies (`taxonomy_terms`, DAC → Sector crosswalk) for both sources | High | can run in parallel with 2–3 |
| 5 | Nightly schedule on, weekly full check, admin "hide" button | Medium | 3 |
| 6 | Claim flow: verified organisation adds its IATI publisher ID, admin confirms, activities show on the organisation; "adopt" an activity into a native project (`projects.iati_identifier`) | High | 3, 4 |

Later, beyond this plan:
- publish Solarpunk Taskforce projects *to* IATI (export as IATI XML);
- import other open sources (ReliefWeb, GlobalGiving) with the same pattern.

# Find-page filters: what's normal in this field, and what Solarpunk Taskforce is missing

Prepared 2026-10-13 for solarpunktaskforce.org (Projects, Organisations, Funding, Issues).

**How this was researched.** I compared the current filter panels and the current schema (`src/lib/database.types.ts`, `src/components/*/…Filters.tsx`) against the main humanitarian and development standards. The IATI codelists were downloaded directly from the IATI GitHub repositories. These were: Activity Status, Policy Marker, Policy Significance, Organisation Type, Activity Scope, DAC 3- and 5-digit sectors and Humanitarian Scope. Most other official sites (OCHA, ReliefWeb, OECD, IUCN, Candid, GlobalGiving) could not be reached from the research sandbox. For those, the values come from web search results that quote the official pages. Values I could only partly confirm are marked **(verify)**. Section 6 lists every source.

---

## 1. Summary: the most valuable additions

1. **One shared, fixed "Sector" list on all four entities.** Today, Thematic areas and Intervention types are free text that each entity spells differently. Replace them with a single list of about 30 sectors: the 11 IASC humanitarian clusters, plus environmental themes in the style of the Rio markers and DAC codes, plus a few cross-cutting themes (see §3A). Keep free tags as a secondary "Keywords" field. Every reference system has a fixed sector facet: IATI/DAC sectors, ReliefWeb themes, Candid PCS "subjects" and GlobalGiving themes. Without one, a Project, the Organisation behind it, the Funding that fits it and the Issue it solves never line up.
2. **Status filters that are actually missing:**
   - **Projects:** `lifecycle_status` is stored but cannot be filtered. Use IATI Activity Status: Planned / Ongoing / Wrapping up / Completed / Paused / Cancelled.
   - **Issues:** there is no "is this still a problem?" status. `status` today only means moderation. Add Reported → Verified → Being addressed → Resolved.
3. **"Who can apply" filters for Funding.** Grant databases (Grants.gov "Eligibility", Devex, Candid, FundsforNGOs) filter on two things this platform lacks:
   - **Eligible applicant type:** NGO, community group, social enterprise, individual, research body, public body, informal or unregistered group.
   - **Funder type:** government, multilateral, foundation, corporate, pooled fund.

   Add **"Closing soon"** as a quick toggle and a **Deadline type** (fixed, rolling, or recurring).
4. **Organisation type and trust signals.** Add an Organisation type (CBO, local NGO, national NGO, INGO, Red Cross/Red Crescent, faith-based, social enterprise or co-op, foundation, academic, public body, UN or multilateral, company, network), mapped to the IATI OrganisationType codes. Add a **Verified** toggle. `verification_status` already exists but is not filterable. Add **"Led by"** attributes (women-, youth-, Indigenous-, refugee- or disability-led), which are the standard localisation and Grand Bargain lens.
5. **Ecosystem and "Climate & nature focus" filters for the environmental side.** Use the 8 UN Decade on Ecosystem Restoration ecosystem types, which map onto the IUCN Global Ecosystem Typology. Use the four Rio-marker objectives (Mitigation, Adaptation, Biodiversity, Land degradation/desertification) with Principal (2) and Significant (1) levels. These are how donors and climate funds tag environmental work.
6. **Issue type and hazard.** Issues have no "what kind of problem" filter. Add:
   - a fixed list combining GLIDE/ReliefWeb disaster types with slow-onset environmental harms (pollution, deforestation, land degradation and so on);
   - an **Onset** filter (sudden or slow);
   - a toggle for **"Has projects responding"**.
7. **Fix the controls that expose internals or mislead:**
   - **Partner org IDs** → organisation name picker.
   - **Age (years)** → founded year.
   - **Currency** plus raw min/max fields → one amount range in the viewer's currency, with amounts normalised to EUR in the data.
   - **Region** → split into a UN M49 **world region** (derived from country) and an optional **admin-1 area** (sub-national).
   - **Funding type value "grant"** is labelled "Funding" in the UI. It should say **Grant**.
8. **Location-first search** that fits the globe: "Near me / within X km" and "Search this map area", on all four pages.

---

## 2. Per entity

Priority: **Main** = shown by default. **More** = behind "Add filters".

### 2.1 Projects

#### New parameters

| Parameter | Why it matters | Recommended control | Suggested values / taxonomy source | Priority |
|---|---|---|---|---|
| **Status (lifecycle)** | Donors and volunteers want *ongoing* or *planned* work. The field is already stored (`lifecycle_status`) but cannot be filtered. | Multi-select chips; default Planned + Ongoing | IATI ActivityStatus 1–6: **Planned** (1 Pipeline/identification), **Ongoing** (2 Implementation), **Wrapping up** (3 Finalisation), **Completed** (4 Closed), **Cancelled** (5), **Paused** (6 Suspended) | Main |
| **Sector** (replaces free "Thematic areas") | Core facet in IATI/DAC, ReliefWeb, Candid and GlobalGiving | Searchable multi-select, fixed taxonomy, grouped Humanitarian / Environmental / Cross-cutting | §3A (IASC 11 clusters + environmental + cross-cutting) | Main |
| **Approach** (replaces free "Intervention types") | "How" facet: Candid support strategies, IUCN-CMP conservation actions | Searchable multi-select, fixed taxonomy | §3D | More |
| **Target groups** (fix existing) | Universal facet (Candid "populations", ReliefWeb vulnerable groups, HXL disaggregation) | Multi-select, fixed taxonomy | §3B | More (Main if space) |
| **Ecosystem** | Standard for nature-based and restoration work (UN Decade, IUCN GET) | Multi-select with icons; only when type includes Environmental | §3C | More |
| **Climate & nature focus** | Rio markers are how climate finance is tagged, so it links Projects to Funding | Multi-select of 4 objectives + "Main focus only" toggle (score 2) | Mitigation, Adaptation, Biodiversity, Land degradation/desertification; scores 0/1/2 (OECD DAC) | More |
| **Crisis / hazard context** | Humanitarian projects are found by emergency ("Türkiye earthquake response") | Multi-select | §3G disaster types (GLIDE) | More |
| **SDGs** (already stored, not filterable) | Shared with Funding and Issues | Multi-select with SDG icons 1–17 | UN SDGs 1–17 | More |
| **IFRC global challenges** (already stored, not filterable) | Shared with Issues | Multi-select | Climate & environmental crises; Evolving crises & disasters; Growing gaps in health & wellbeing; Migration & identity; Values, power & inclusion | More |
| **Lead organisation** | People search for "projects by X" | Organisation name picker (async combobox) | `organisations` (verified first) | More |
| **Funding progress (% funded)** | GlobalGiving-style "almost funded" discovery; more useful than two raw ranges | Range slider 0–100 % + toggle **"Still needs funding"** | donations_received / amount_needed | More |
| **Accepting support** | Turns discovery into action | Toggle chips: Donations / Volunteers / Partners / In-kind | New flags (§5) | More |
| **Geographic scale** | Separates a village water point from a national programme | Single/multi-select | IATI ActivityScope: Global; Regional; Multi-national; National; Sub-national (several regions); Sub-national (one region); Local (district/municipality); Single site | More |
| **Near me / within radius** | The globe UI implies "what is near X" | Location search + radius slider (5–500 km) + "Search this map area" | lat/lng (stored) | More |
| **Gender / disability focus** | Standard DAC and IASC markers; donors filter on them | Toggles "Gender equality is a main or significant goal" and "Disability-inclusive" | DAC gender marker 0/1/2; IATI policy marker 11 Disability | More |
| **Recently updated** | Signals live projects (IATI `last-updated-datetime`) | Select: last 30 / 90 / 365 days | `updated_at` (§5) | More |

#### Existing filters: review

| Existing filter | Verdict | Control |
|---|---|---|
| Search | Keep | Text with debounce. Also search org name, place name and sector labels. |
| Project type (humanitarian/environmental) | Keep; make it a **segmented control** at the top (All / Humanitarian / Environmental / Both). Add "Both" (Funding already has it). | Segmented |
| Country | Keep | Country picker (ISO 3166-1, searchable, flags), multi-select |
| Region | **Split.** World region = UN M49, derived from country (Main, inside the country picker as a group). Sub-national area = admin-1 typeahead (More). | Grouped country/region picker |
| Thematic areas | **Replace** with Sector (fixed). Keep old tags as "Keywords": a creatable tag combobox with normalised case and slug dedupe. | Fixed multi-select + creatable keywords |
| Intervention types | **Rename** to Approach; fixed list | Fixed multi-select |
| Target demographics | **Rename** to Target groups; fixed list | Fixed multi-select |
| Partner org IDs | **Never show IDs.** Make it "Partner organisation". | Async org-name combobox (logo + name) |
| Currency | **Drop as a filter.** Show amounts in the viewer's display currency (EUR default; selector of ~15 ISO 4217 codes in the header or settings). Filter on normalised EUR. | Display-currency dropdown |
| Min/Max funding needed | Keep as one control | Range slider with log steps (0 … 1k … 10k … 100k … 1M+) |
| Min/Max funding received | **Merge** into "% funded" + "Still needs funding" toggle; drop the raw range | Slider 0–100 % |
| Min/Max lives improved | **Rename** "People reached" (HXL `#reached`, IATI results) | Range slider, log steps |
| Start date from / End date to | **Merge** into "Active between" (overlap test) | Date range |
| Sort by + Sort direction | **Merge** into one dropdown | Relevance · Newest · Recently updated · Ending soon · Biggest funding gap · Most funded % · Most people reached · Nearest |

### 2.2 Organisations

#### New parameters

| Parameter | Why it matters | Recommended control | Suggested values / taxonomy source | Priority |
|---|---|---|---|---|
| **Organisation type** | Universal facet (IATI OrganisationType, ICNPO, Candid org type) | Multi-select, fixed | §3E (maps to IATI 10–90) | Main |
| **Verified** | The platform already verifies organisations (`verification_status`). This is the main trust signal. | Toggle "Verified only" (default on?) | verified / pending | Main |
| **Sector** | Same list as Projects | Fixed multi-select | §3A | Main |
| **Countries of operation** vs **Headquarters country** | INGOs are based in one country and work in others. Both columns partly exist (`country`, `country_based`, `based_in_country`). | Two country pickers | ISO 3166-1 + UN M49 | Main (operation) / More (HQ) |
| **Led by** | Localisation (Grand Bargain), women's-rights funding; funders filter on it | Multi-select chips | Women-led · Youth-led · Indigenous-led · Refugee/displaced-led · Disability-led (OPD) · LGBTQI+-led · Community-led (local) | More |
| **Geographic scale** | Local CBO vs international | Multi-select | Local · Sub-national · National · Regional · International/Global (IATI ActivityScope condensed) | More |
| **Size** | Partners and funders pick by size; Candid/Charity Navigator show it | Single-select bands | Staff: 0 (volunteer-run) · 1–9 · 10–49 · 50–249 · 250+. Optional annual budget bands in EUR: <50k · 50–250k · 250k–1M · 1–10M · >10M | More |
| **Founded** (replaces Age) | Year is easier to understand and doesn't change over time | Year range or presets (<2 yrs, 2–5, 5–10, 10+) | `founded_at` | More |
| **Open to** | Turns the directory into a partnering tool | Toggle chips | Donations · Volunteers · Partnerships · Pro-bono skills · In-kind | More |
| **Approach** | "How they work" | Fixed multi-select | §3D | More |
| **Registered / legal status** | Funders often require registration (Grants.gov eligibility, EU portal) | Multi-select | Registered charity/NGO · Cooperative · Social enterprise/company · Informal/unregistered group · Public body | More |
| **Transparency signals** | Charity Navigator "Accountability & Finance" beacon; GlobalGiving vetting | Toggles | Publishes annual report · Audited accounts · Safeguarding policy · Publishes IATI data | More |
| **Ecosystem / Climate & nature focus** | Matches environmental organisations to environmental funding | As in Projects | §3C, Rio markers | More |
| **Languages** | Practical for collaboration | Multi-select | ISO 639-1 (common ~20) | More |
| **Near me / radius** | Globe | Location + radius | lat/lng | More |

#### Existing filters: review

| Existing filter | Verdict | Control |
|---|---|---|
| AI Search (beta) | Keep, plus a normal keyword fallback. Label it "Search (AI-assisted)". | Text |
| Countries | Rename "Countries of operation" | Country picker |
| Regions | World region via the country picker (UN M49) | Grouped picker |
| Thematic areas | Fixed **Sector** + creatable keywords (as Projects) | Fixed multi-select |
| Intervention types | Rename **Approach**, fixed | Fixed multi-select |
| Target demographics | Rename **Target groups**, fixed | Fixed multi-select |
| Age (years) min/max | Replace with **Founded (year)**. Two date columns exist (`existing_since`, `founded_at`); keep one. | Year range / presets |
| Projects carried out min/max | Keep but simplify to "Has active projects" toggle + "Projects on platform" presets (1+, 5+, 20+) | Toggle + preset select |
| Funding needed min/max | Keep only if orgs set it deliberately. Otherwise derive it from the sum of open project gaps. | Log range slider |
| Sort by + direction | Merge | Relevance · Recently joined · Most projects · Name A–Z · Nearest |

### 2.3 Funding

#### New parameters

| Parameter | Why it matters | Recommended control | Suggested values / taxonomy source | Priority |
|---|---|---|---|---|
| **Who can apply** (eligible applicant type) | First question every applicant asks; Grants.gov "Eligibility" filter, Candid, FundsforNGOs | Multi-select, fixed | Community/grassroots group (incl. unregistered) · Local/national NGO · International NGO · Social enterprise / cooperative · Startup / company · Individual (researcher, activist, student) · Academic/research institution · Public body / local government · Indigenous peoples' organisation · Faith-based organisation | Main |
| **Deadline / "Closing soon"** | Deadlines drive the search (Grants.gov status: forecasted/posted/closed/archived; EU portal: forthcoming/open/closed) | Quick chips: Closing in 7 / 30 / 90 days + date range | Uses `deadline` | Main (chips) |
| **Status** (fix existing) | Add **Forthcoming** (EU portal, Grants.gov "forecasted"). Drop "All" as a status (all = nothing selected). | Multi-select chips | Forthcoming · Open · Rolling · Closed. Default Forthcoming + Open + Rolling. | Main |
| **Funder type** | Standard grant-database facet (Devex, triple-funds, Candid) | Multi-select | Government (bilateral) · EU / multilateral / UN · Private foundation · Corporate / CSR · Pooled fund (e.g. country-based pooled funds, Start Fund) · NGO re-granting / intermediary · Impact investor / DFI · Crowdfunding / individuals | More |
| **Funder** | "Show me everything from X" | Async combobox (`funder_name`; later an org link) | — | More |
| **Grant size** | Applicants filter by what they can absorb | Log range slider in display currency (normalised EUR) + presets <10k · 10–50k · 50–250k · 250k–1M · >1M | `amount_min/max` | Main (or More) |
| **Duration** | Short emergency grants vs multi-year | Presets | <6 months · 6–12 · 1–3 years · 3+ years | More |
| **Project stage supported** | Accelerators vs scale-up funds | Multi-select | Idea / pre-launch · Pilot / early · Growth / scaling · Ongoing operations · Emergency response | More |
| **What it pays for** | Core vs project funding; FundsforNGOs advice "project grants vs operational support" | Multi-select | Project costs · Core / unrestricted · Capacity building · Equipment / capital · Research · Travel / events · Emergency response | More |
| **Co-financing required** | A frequent blocker for small orgs (EU calls) | Toggle "No co-funding required" | boolean / % | More |
| **Application language** | Big access barrier for Global South applicants | Multi-select | ISO 639-1 (en, fr, es, pt, ar, de, …) | More |
| **Recurring call** | Helps plan ahead | Toggle | annual / one-off | More |
| **Target groups / Ecosystem / Climate & nature focus** | Shared with Projects for matching | As §3 | §3B, §3C, Rio markers | More |
| **Eligible regions** (already stored as `eligible_regions`) | Many calls are "any country in Sub-Saharan Africa" | Same picker as countries (UN M49 groups) + "Global / any country" option | UN M49 | Main (combined with countries) |
| **Remote OK** (already stored, `remote_ok`) | — | Toggle "Location-independent" | — | More |
| **Matches my project / organisation** | GrantStation/Instrumentl-style matching; the platform has the data | Button "Match to my project…" that prefills Sector, Countries, Applicant type, Size | — | More |

#### Existing filters: review

| Existing filter | Verdict | Control |
|---|---|---|
| Keyword search | Keep | Text |
| Project type | Keep (Environmental / Humanitarian / Both) | Segmented |
| Funding type | Keep, **fix the label "Funding" → "Grant"**, extend the list (§3F) | Multi-select chips |
| Status | Add Forthcoming; remove "All" | Chips |
| Amount min/max | Normalise currency; log slider | Range slider |
| Deadline from/to | Keep in More; add "Closing soon" chips in Main | Date range + chips |
| Eligible countries | Merge with eligible regions; add "Open to any country" | Grouped country/region picker |
| Themes | Replace with shared **Sector** list; keep free `keywords` | Fixed multi-select |
| SDGs | Keep | SDG icon multi-select |
| Sort by | Deadline soonest · Newest · Largest amount · Relevance | Single dropdown |

### 2.4 Issues (formerly Watchdog)

#### New parameters

| Parameter | Why it matters | Recommended control | Suggested values / taxonomy source | Priority |
|---|---|---|---|---|
| **Issue type** | The core missing facet. ReliefWeb and HDX classify every event by disaster type. Environmental reports need slow-onset harm types. | Grouped searchable multi-select, fixed | §3G (hazard types + environmental harms + social/humanitarian problems) | Main |
| **Issue status** (resolution) | "Is this still a problem?" `status` today only means moderation. | Chips | Reported · Verified · Being addressed · Resolved · Recurring | Main |
| **Sector affected** | Lets Issues link to Projects and Organisations | Fixed multi-select | §3A | More (Main if Issue type is not built) |
| **Onset** | Standard humanitarian distinction; changes who can help | Toggle chips | Sudden-onset · Slow-onset · Chronic/long-standing | More |
| **Hazard group** | Rolls up the many types (EM-DAT/IRDR) | Optional parent level in the Issue-type picker | Geophysical · Hydrological · Meteorological · Climatological · Biological · Technological · Environmental degradation · Conflict & social | (part of Issue type) |
| **Ecosystem affected** | Environmental issues | Multi-select | §3C | More |
| **Scale of impact** | Severity also depends on how many people or how much area is hit (INFORM "impact" dimension; HXL `#affected`) | Presets | People affected: <100 · 100–1k · 1k–10k · 10k–100k · 100k+; Area: site · neighbourhood · district · region · national+ | More |
| **Has responding projects** | Shows gaps (no one responding) vs coverage | Toggle "No one responding yet" / "Has projects" | Link table (§5) | More |
| **Has evidence** | Credibility (`evidence_links` exists) | Toggle "With evidence (photos/links)" | — | More |
| **Reported by** | Trust | Chips | Individual · Anonymous · Verified organisation | More |
| **Near me / radius** | Issues are inherently local | Location + radius + "Search this map area" | lat/lng (stored) | Main (as map control) |

#### Existing filters: review

| Existing filter | Verdict | Control |
|---|---|---|
| Search | Keep | Text |
| Countries | Keep | Country picker |
| Regions | Split into world region (M49) + admin-1 / city typeahead (`city` exists) | Grouped picker + typeahead |
| UN SDGs | Keep (More); `sdgs` is `number[]` here but `text[]` on projects; unify | SDG icon multi-select |
| IFRC Global Challenges | Keep (More) | Multi-select (5 values) |
| Affected demographics | Rename **Affected groups**; same fixed list as Target groups | Fixed multi-select |
| Urgency min/max | Replace the min/max pair with a **"Urgency at least…"** single select. The labels (Low · Guarded · Elevated · High · Critical) are security-alert wording. Consider the INFORM-style **Very low · Low · Medium · High · Very high**, keeping the 1–5 storage. | Segmented 1–5 |
| Observed after/before | Keep, plus presets (last 7 / 30 / 365 days) | Date range + chips |
| Sort by | Most urgent · Newest · Recently observed · Nearest · Most supported (followers) | Dropdown |

---

## 3. Shared taxonomies to adopt across entities

Store **stable slugs** (e.g. `wash`, `climate-adaptation`) in `text[]` columns and keep labels and external codes in one `taxonomy_terms` table (§5). The same slug list goes on Projects, Organisations, Funding and Issues.

### 3A. Sectors (replaces Thematic areas / Themes)

The first 11 are the **IASC global clusters**, which also cover cluster lead agencies' "areas of responsibility". The DAC column gives the closest OECD CRS purpose code for mapping and import.

| Group | Slug | Label | Maps to |
|---|---|---|---|
| Humanitarian | `food-security` | Food security | Food Security Cluster (WFP/FAO); DAC 520, 72040, 43071–72 |
| Humanitarian | `nutrition` | Nutrition | Nutrition Cluster (UNICEF); IATI policy marker 12 |
| Humanitarian | `health` | Health | Health Cluster (WHO); DAC 120/121/122, 72011 |
| Humanitarian | `wash` | Water, sanitation & hygiene | WASH Cluster (UNICEF); DAC 140 |
| Humanitarian | `shelter` | Shelter & settlements (incl. non-food items) | Shelter Cluster (IFRC/UNHCR) |
| Humanitarian | `camp-management` | Camp coordination & management | CCCM Cluster (IOM/UNHCR) |
| Humanitarian | `protection` | Protection (incl. child protection, GBV, mine action, housing/land/property) | Protection Cluster (UNHCR) + AoRs; DAC 152 |
| Humanitarian | `education` | Education | Education Cluster (UNICEF/Save the Children); DAC 110, 72012 |
| Humanitarian | `logistics` | Logistics | Logistics Cluster (WFP) |
| Humanitarian | `emergency-telecoms` | Emergency telecommunications & connectivity | ETC (WFP); DAC 220 |
| Humanitarian | `early-recovery` | Early recovery & reconstruction | Early Recovery (UNDP); DAC 730 |
| Environmental | `climate-mitigation` | Climate mitigation & emissions reduction | Rio marker Mitigation; IATI policy marker 6 |
| Environmental | `climate-adaptation` | Climate adaptation & resilience | Rio marker Adaptation; IATI policy marker 7 |
| Environmental | `biodiversity` | Biodiversity & species conservation | Rio marker Biodiversity; DAC 41030; IATI policy marker 5 |
| Environmental | `ecosystem-restoration` | Ecosystem restoration & rewilding | UN Decade on Restoration; DAC 41020 |
| Environmental | `forests` | Forests & reforestation | DAC 312 |
| Environmental | `oceans-coasts` | Oceans, coasts & fisheries | DAC 313, 23250 |
| Environmental | `freshwater` | Freshwater & water resources | DAC 14015, 14040 |
| Environmental | `land-soil` | Land, soil & desertification | Rio marker Desertification; IATI policy marker 8 |
| Environmental | `sustainable-agriculture` | Sustainable agriculture & food systems | DAC 311 |
| Environmental | `renewable-energy` | Renewable energy & energy access | DAC 232 (23210–23270), 23183 |
| Environmental | `pollution-waste` | Pollution, waste & circular economy | DAC 14050, 41010 |
| Environmental | `sustainable-cities` | Sustainable cities, housing & mobility | DAC 430 (43030), 210 |
| Environmental | `environmental-education` | Environmental education & research | DAC 41081, 41082 |
| Cross-cutting | `disaster-risk-reduction` | Disaster risk reduction & preparedness (incl. early warning, anticipatory action) | DAC 740, 43060; IATI policy marker 10 |
| Cross-cutting | `livelihoods` | Livelihoods, jobs & economic inclusion | DAC 250, 240 |
| Cross-cutting | `peacebuilding` | Peacebuilding, conflict & social cohesion | DAC 152 |
| Cross-cutting | `gender-equality` | Gender equality & women's rights | DAC gender marker; IATI policy marker 1 |
| Cross-cutting | `migration-displacement` | Migration & displacement | IFRC challenge "Migration & identity" |
| Cross-cutting | `mental-health` | Mental health & psychosocial support (MHPSS) | — |
| Cross-cutting | `governance-rights` | Governance, human rights & civic space | DAC 151; IATI policy marker 3 |
| Cross-cutting | `animal-welfare` | Animal welfare | (GlobalGiving has an "Animals" theme) |
| Cross-cutting | `tech-data` | Digital, data & technology for good | — |

### 3B. Target / affected groups (Projects, Organisations, Funding, Issues)

Compiled from ReliefWeb vulnerable groups **(verify exact labels)**, the CARE emergency-toolkit and Sphere groups, Candid PCS populations and HXL disaggregation attributes. Age bands stay separate from groups.

- **Gender and age:** Women & girls · Men & boys · Children (0–17) · Infants & young children (0–5) · Adolescents & youth (10–24) · Older people (60+)
- **Displacement and status:** Refugees & asylum seekers · Internally displaced people · Returnees · Migrants (incl. migrant workers) · Stateless people · Host communities
- **Identity and inclusion:** Persons with disabilities · Indigenous peoples · Ethnic, religious & linguistic minorities · LGBTQI+ people
- **Livelihood and context:** People living in poverty · Smallholder farmers · Pastoralists · Fishers & coastal communities · Rural communities · Urban informal-settlement residents · Informal workers
- **Specific needs:** Female-headed households · Pregnant & breastfeeding women · Unaccompanied & separated children · Survivors of gender-based violence · People living with HIV / chronic illness · People in detention
- **Default:** General population / whole community

For a disability sub-filter, use the six Washington Group functional domains: seeing · hearing · walking · cognition · self-care · communication.

### 3C. Ecosystems (Projects, Organisations, Funding, Issues)

User-facing list = the 8 UN Decade on Ecosystem Restoration types, split slightly. Each is mapped to the IUCN Global Ecosystem Typology biome codes so it can be exported.

| Label | IUCN GET biomes |
|---|---|
| Forests (tropical) | T1 |
| Forests (temperate & boreal) | T2 |
| Grasslands, shrublands & savannas | T3, T4 |
| Deserts & drylands | T5 |
| Mountains & polar | T6 |
| Farmlands | T7.1–T7.3 |
| Urban areas & settlements | T7.4 |
| Rivers & lakes | F1, F2, F3 |
| Wetlands & peatlands | TF1 |
| Coasts (mangroves, saltmarsh, beaches, estuaries) | MT1–MT3, MFT1, FM1 |
| Coral reefs & shallow seas | M1 |
| Open ocean & deep sea | M2, M3 |
| Caves & groundwater | S1, SF1 |

### 3D. Approaches (replaces Intervention types)

Merges Candid PCS support strategies **(verify)** and the IUCN-CMP Conservation Actions classification (land/water protection, land/water management, species management, education & awareness, …) with humanitarian delivery modes.

- **Deliver:** Direct services · Emergency relief & distributions (in-kind) · Cash & voucher assistance · Infrastructure & construction · Technology & innovation
- **Nature:** Land & water protection (protected areas, OECMs) · Habitat restoration · Species management · Nature-based solutions · Sustainable resource management
- **People:** Education & awareness · Training & capacity building · Community organising & mobilisation · Livelihood & enterprise support · Financial inclusion / microfinance · Legal aid & rights
- **System:** Advocacy & policy · Research, data & monitoring · Watchdog & accountability · Networks & coordination · Grantmaking / re-granting · Preparedness & early warning

### 3E. Organisation types (maps to IATI OrganisationType)

| Label | IATI code |
|---|---|
| Community-based organisation / grassroots group | 22 or 24 (+ "informal" flag) |
| Local / national NGO | 22, 24 |
| Regional NGO | 23 |
| International NGO | 21 |
| Red Cross / Red Crescent society | 90 |
| Faith-based organisation | 22/21 + flag |
| Social enterprise / cooperative | 70/72 |
| Foundation / grantmaker | 60 |
| Academic, training & research | 80 |
| Government / public agency | 10 |
| Local government | 11 |
| Other public sector | 15 |
| UN agency / multilateral | 40 |
| Private company | 70–73 |
| Public-private partnership | 30 |
| Network / coalition / alliance | 90 |
| Informal group / movement | 90 |

ICNPO (12 groups: culture & recreation, education & research, health, social services, environment, development & housing, law/advocacy/politics, philanthropic intermediaries, international, religion, business & professional associations, n.e.c.) is an *activity* classification, so it overlaps with §3A rather than describing the type of organisation. Use it only as an export crosswalk.

### 3F. Funding types and funder types

**Funding type:**
- Grant (project)
- Core / unrestricted grant
- Emergency / rapid-response grant
- Prize / award / challenge
- Fellowship / scholarship
- Accelerator / incubator
- Loan (concessional)
- Equity / impact investment
- In-kind / pro-bono
- Match / crowdfunding
- Tender / service contract
- Other

Today's set is grant, prize, fellowship, loan, equity, in-kind, other. Add core, emergency, accelerator, match/crowdfunding and tender. IATI AidType and FinanceType are too donor-side for a UI, but loan/equity/grant map to FinanceType.

**Funder type:**
- Government / bilateral donor
- EU / multilateral / UN
- Development finance institution
- Private foundation
- Corporate / CSR
- Pooled fund
- NGO intermediary (re-granting)
- Individuals / crowdfunding platform

### 3G. Issue types / disaster and crisis types

**Hazards: GLIDE codes, as used by ReliefWeb and OCHA.**
- **Geophysical:** Earthquake (EQ) · Tsunami (TS) · Volcano (VO) · Land slide (LS) · Mud slide (MS)
- **Hydrological:** Flood (FL) · Flash flood (FF) · Storm surge (SS) · Snow avalanche (AV)
- **Meteorological:** Tropical cyclone (TC) · Extratropical cyclone (EC) · Severe local storm (ST) · Tornado (TO) · Violent wind (VW) · Cold wave (CW) · Heat wave (HT)
- **Climatological:** Drought (DR) · Wildfire (WF)
- **Biological:** Epidemic (EP) · Insect infestation (IN)
- **Technological:** Technological disaster / industrial accident (AC) · Fire (FR)
- **Societal:** Complex emergency (CE) · Other (OT)

Group headings follow the EM-DAT / IRDR hazard groups: geophysical, hydrological, meteorological, climatological, biological, extraterrestrial, technological.

**Environmental harms (slow-onset; not in GLIDE).** These are drawn from IUCN-CMP threats and DAC environment codes **(verify against IUCN-CMP Threats v2.0)**.
- Air pollution · Water pollution · Soil contamination · Plastic & solid waste · Oil or chemical spill
- Deforestation & illegal logging · Habitat loss & land conversion · Wildlife crime & poaching · Overfishing & illegal fishing · Invasive species · Coral bleaching · Biodiversity loss
- Land degradation & desertification · Erosion & coastal erosion · Sea-level rise · Water scarcity · Glacier & permafrost loss
- Mining & extractive impacts · Noise & light pollution

**Social / humanitarian problems:**
- Conflict & violence · Displacement & eviction · Food insecurity
- Lack of access to safe water · Lack of access to health care · Lack of access to education · Inadequate housing
- Human-rights abuse · Land grabbing · Child labour & exploitation · Gender-based violence

For food-related issues, an optional severity can use the IPC phases 1 Minimal · 2 Stressed · 3 Crisis · 4 Emergency · 5 Famine/Catastrophe.

### 3H. Policy-marker style focus (Projects, Funding, optionally Organisations)

Each item is scored **0 Not targeted / 1 Significant / 2 Principal** (OECD DAC; IATI PolicySignificance 0–2):
- Climate mitigation
- Climate adaptation
- Biodiversity
- Desertification / land degradation
- Disaster risk reduction
- Gender equality
- Disability inclusion

IATI PolicyMarker codes 6, 7, 5, 8, 10, 1 and 11 respectively. The UI asks "Main focus / Also contributes". Filter "Main focus only" = 2.

### 3I. Geography

- **Countries:** ISO 3166-1 alpha-2.
- **World regions:** UN M49, used in OCHA and IATI recipient-region practice.
  - Africa: Northern Africa · Sub-Saharan Africa (Eastern, Middle, Southern, Western)
  - Americas: Latin America & Caribbean · Northern America
  - Asia: Central, Eastern, South-eastern, Southern, Western Asia
  - Europe: Eastern, Northern, Southern, Western Europe
  - Oceania: Australia & NZ, Melanesia, Micronesia, Polynesia
- **Sub-national:** admin-1 names, with P-codes where available (HXL `#adm1+code`).
- **Scale:** IATI ActivityScope (§2.1).

### 3J. Interop (optional)

HXL hashtags give a free export/import format: `#sector`, `#org`, `#country`, `#adm1`, `#affected`/`#reached` with `+f`, `+m`, `+children`, `+elderly`, `+idp`. IATI-style fields (activity status, sector, policy markers, org type) make it possible later to import IATI activities as projects.

---

## 4. Recommended filter sets per Find page

| Page | Main (max 5) | "Add filters" |
|---|---|---|
| **Projects** | Search · Type (segmented: All/Humanitarian/Environmental) · Sector · Location (country/world region + near me) · Status (default Planned + Ongoing) | Target groups · Approach · Ecosystem · Climate & nature focus · Crisis/hazard · SDGs · IFRC challenges · Lead/partner organisation · Funding needed · % funded / Still needs funding · Accepting (donations/volunteers/partners) · People reached · Active between (dates) · Scale · Gender/disability focus · Recently updated · Sub-national area |
| **Organisations** | Search (AI-assisted) · Sector · Countries of operation · Organisation type · Verified only | HQ country · Target groups · Approach · Led by · Scale · Size · Founded · Open to (donations/volunteers/partners) · Has active projects · Legal status · Transparency signals · Ecosystem · Climate & nature focus · Languages · SDGs · Funding needed |
| **Funding** | Search · Status + "Closing soon" chips · Eligible location (country/region/any) · Who can apply · Funding type | Sector · Project type · Grant size · Funder type · Funder · Deadline range · Duration · Project stage · What it pays for · No co-funding required · Application language · Target groups · Ecosystem · Climate & nature focus · SDGs · Remote OK · Recurring · "Match to my project" |
| **Issues** | Search · Issue type · Location (country/area + near me / map area) · Urgency (at least…) · Status (default Reported + Verified + Being addressed) | Sector affected · Affected groups · Onset · Ecosystem · Scale of impact · Has responding projects · Has evidence · Reported by · Observed date range · SDGs · IFRC challenges |

UI notes:
- One "Sort" dropdown per page (no separate direction).
- Show active filters as removable chips.
- Keep all filters in the URL.
- Show live result counts per option where cheap.
- On phones, Main filters go in a horizontal chip row and "Add filters" opens a sheet (390 px rule in AGENT_RULES).

---

## 5. Data-model implications

**Flag.** Every row below is a DB/migration change (high risk, one topic per PR, RLS tests per AGENT_RULES). It should ship as separate PRs: first the taxonomy, then each entity.

**Shared:**
- New table `taxonomy_terms`: `vocabulary text`, `slug text`, `label text`, `parent_slug text null`, `external_codes jsonb` (IATI/DAC/GET/GLIDE), `sort int`, primary key (`vocabulary`, `slug`). Public read, admin write.
- Shared-taxonomy columns are `text[]` of slugs with GIN indexes.
- Unify `sdgs` as `smallint[]`. Today it is `text[]` on projects and `number[]` on grants and issues.
- FX normalisation: an `fx_rates(currency text, rate_to_eur numeric, as_of date)` table, plus an `amount_*_eur numeric` column per money field, kept up to date by a trigger or a scheduled job.

**Projects:**

| Column | Type | Notes |
|---|---|---|
| `sectors` | `text[]` | Replaces free `thematic_area` |
| `approaches` | `text[]` | Replaces `type_of_intervention`; drop legacy `intervention_type` |
| `target_groups` | `text[]` | Replaces `target_demographics`; drop legacy `target_demographic` |
| `ecosystems` | `text[]` | — |
| `hazards` | `text[]` | — |
| `policy_markers` | `jsonb` | e.g. `{"climate_adaptation":2,"biodiversity":1}`. Alternatively one `smallint` column per marker if the filter needs to be fast. |
| `scale` | `text` | Check constraint (IATI scope list) |
| `accepts_donations`, `accepts_volunteers`, `accepts_partners` | `boolean` | — |
| `updated_at` | `timestamptz` | Missing today |
| `amount_needed_eur`, `donations_received_eur` | `numeric` | — |
| `lifecycle_status` | existing | Add a check constraint for the 6 values |

**Organisations:**

| Column | Type | Notes |
|---|---|---|
| `org_type` | `text` | Check constraint |
| `led_by` | `text[]` | — |
| `scale` | `text` | — |
| `staff_band`, `budget_band` | `text` | — |
| `legal_status` | `text` | — |
| `open_to` | `text[]` | — |
| `languages` | `text[]` | — |
| `operating_countries` | `text[]` | — |
| `has_annual_report`, `has_audited_accounts`, `has_safeguarding_policy` | `boolean` | — |
| `sectors`, `approaches`, `target_groups`, `ecosystems` | `text[]` | Replace `thematic_tags`, `intervention_tags`, `demographic_tags` |
| — | — | Consolidate `country` / `country_based` / `based_in_country` into `hq_country`, and `existing_since` / `founded_at` into `founded_at date` |

**Grants:**

| Column | Type | Notes |
|---|---|---|
| `eligible_applicant_types` | `text[]` | — |
| `funder_type` | `text` | — |
| `deadline_type` | `text` | fixed / rolling / recurring |
| `status` | existing | Extend the check to include `forthcoming` |
| `duration_months_min`, `duration_months_max` | `smallint` | — |
| `project_stages` | `text[]` | — |
| `cost_types` | `text[]` | — |
| `cofunding_required` | `boolean` | — |
| `application_languages` | `text[]` | — |
| `recurring` | `boolean` | — |
| `sectors`, `target_groups`, `ecosystems`, `policy_markers` | `text[]` / `jsonb` | `sectors` replaces free `themes`; keep `keywords` |
| `amount_min_eur`, `amount_max_eur` | `numeric` | — |
| `funding_type` | existing | Extend the allowed values per §3F |

**Watchdog issues:**

| Column | Type | Notes |
|---|---|---|
| `issue_types` | `text[]` | — |
| `resolution_status` | `text` | reported / verified / being_addressed / resolved / recurring. **Separate from moderation `status`.** |
| `onset` | `text` | — |
| `sectors` | `text[]` | — |
| `ecosystems` | `text[]` | — |
| `people_affected_band` | `text` | — |
| `area_scale` | `text` | — |
| `affected_demographics` | existing | Migrate to the shared `target_groups` slugs |

**Links:**
- `issue_responses(issue_id uuid, project_id uuid, created_by uuid, created_at)` powers "Has responding projects".
- Partner organisations: replace `projects.partner_org_ids uuid[]` with a join table `project_partners(project_id, org_id, role)` so the name picker and the RLS stay simple. Optional: a later migration can do this.

---

## 6. Sources

**Downloaded directly (IATI codelists on GitHub):**
- https://raw.githubusercontent.com/IATI/IATI-Codelists/version-2.03/xml/ActivityStatus.xml
- https://raw.githubusercontent.com/IATI/IATI-Codelists/version-2.03/xml/PolicyMarker.xml
- https://raw.githubusercontent.com/IATI/IATI-Codelists/version-2.03/xml/PolicySignificance.xml
- https://raw.githubusercontent.com/IATI/IATI-Codelists/version-2.03/xml/OrganisationType.xml
- https://raw.githubusercontent.com/IATI/IATI-Codelists/version-2.03/xml/ActivityScope.xml
- https://raw.githubusercontent.com/IATI/IATI-Codelists-NonEmbedded/master/xml/SectorCategory.xml (DAC 3-digit)
- https://raw.githubusercontent.com/IATI/IATI-Codelists-NonEmbedded/master/xml/Sector.xml (DAC 5-digit)
- https://raw.githubusercontent.com/IATI/IATI-Codelists-NonEmbedded/master/xml/HumanitarianScopeType.xml
- https://raw.githubusercontent.com/IATI/IATI-Codelists-NonEmbedded/master/xml/AidType.xml and FinanceType.xml

**Found through web search (official pages quoted in the results):**
- IATI Activity Status: https://iatistandard.org/codelists/ActivityStatus , https://iati-standard.readthedocs.io/en/latest/codelists/ActivityStatus.html
- IASC clusters: https://log.logcluster.org/en/node/219 , https://disasterphilanthropy.org/resources/un-cluster-approach/ , https://emergency.unhcr.org/print/pdf/node/565 , https://handbook.fscluster.org/docs/124-the-cluster-approach-in-a-nutshell
- Rio markers / DAC: https://capacity4dev.europa.eu/library/scoring-rio-markers-and-policy-markers-aid-environment-and-disaster-risk-reduction_en , https://one.oecd.org/document/DCD/DAC/STAT(2025)50/REV2/en/pdf , https://leap.unep.org/en/knowledge/glossary/rio-marker
- Gender markers: https://t4.oecd.org/development/dac-gender-equality-marker.htm , https://donortracker.org/insights/gender-equality-policy-markers-beginners-guide , https://interagencystandingcommittee.org/node/29149
- IUCN Global Ecosystem Typology: https://portals.iucn.org/library/sites/library/files/documents/2020-037-En.pdf , https://developers.google.com/earth-engine/datasets/catalog/IUCN_GlobalEcosystemTypology_current , https://seea.un.org/sites/seea.un.org/files/keith_iucn_typology_seea-eea_forumexperts_jun2020.pdf
- UN Decade ecosystem types: https://www.decadeonrestoration.org/types-ecosystem-restoration , https://unep.org/news-and-stories/story/beginners-guide-ecosystem-restoration
- IUCN Global Standard for NbS: https://www.europarc.org/news/2020/08/iucn-global-standard-for-nature-based-solutions/ , https://www.naturebasedsolutionsinitiative.org/news/iucn-global-standard-for-nature-based-solutions/
- IUCN-CMP Threats & Actions classifications: https://conservationstandards.org/library-item/threats-and-actions-taxonomies , https://www.conservationstandards.org/library-item/conservation-actions-classification-v1-0/
- GLIDE / disaster types: https://ifrcgo.org/monty-stac-extension/model/taxonomy/ , https://data.amerigeoss.org/dataset/disaster-types , https://reliefweb.int/taxonomy-service
- EM-DAT classification: https://doc.emdat.be/docs/data-structure-and-content/disaster-classification-system/
- ReliefWeb taxonomy: https://webarchive.archive.unhcr.org/20230321171337mp_/https://reliefweb.int/taxonomy-descriptions , https://reliefweb.int/blogpost/protection-human-rights-disaster-management-mine-action-peacekeeping-and-peacebuilding-now
- HXL: https://hxlstandard.org/standard/dictionary , https://hxlstandard.org/standard/1_0final/dictionary/ , https://centre.humdata.org/learning-path/hxl/hashtags-attributes
- Vulnerable groups: https://www.careemergencytoolkit.org/management/2-strategy/11-targeting/11-3-vulnerable-groups/
- Washington Group: https://washingtongroup-disability.com/about/conceptual-framework , https://www.washingtongroup-disability.com/fileadmin/uploads/wg/Documents/Questions/new-_WG_Implementation_Document__2_-_The_Washington_Group_Short_Set_on_Functioning__1_.pdf
- IFRC Strategy 2030: https://www.ifrc.org/strategy-2030 , https://www.ifrc.org/sites/default/files/2021-06/S2030-EN.pdf
- IPC: https://fews.net/about/integrated-phase-classification , https://news.un.org/en/story/2024/03/1147661
- INFORM Severity: https://www.acaps.org/methodology/severity , https://drmkc.jrc.ec.europa.eu/inform-index/Portals/0/InfoRM/Severity/2026/INFORM%20Severity%20Index%20April%202026%20-%20All%20Countries.pdf
- Candid PCS: https://developer.candid.org/docs/candids-taxonomy , https://data.candid.org/reference/philanthropy-classification-system , https://blog.candid.org/?p=10920
- ICNPO: https://www.abs.gov.au/AUSSTATS/abs@.nsf/Lookup/8106.0Explanatory%20Notes12006-07%20(Re-Issue) , https://ccsg.hku.hk/wp-content/uploads/2024/01/International-Classification-of-Non-profit-Organizations.pdf
- GlobalGiving: https://www.globalgiving.org/api/methods/get-themes/
- Charity Navigator: https://www.charitynavigator.org/about-us/our-methodology/ratings/
- Devex funding search: https://support.devex.com/hc/en-us/articles/115000080893-Using-the-funding-search , https://support.devex.com/hc/en-us/articles/360036503613-Search-for-funding
- Grants.gov filters: https://epa.gov/grants/how-do-i-search-available-grant-opportunities , https://wiki.simpler.grants.gov/product/api/search-opportunities
- EU Funding & Tenders Portal: https://webgate.ec.europa.eu/funding-tenders-opportunities/spaces/OM/pages/1867921/Search+funding+opportunities+%E2%80%94+Find+a+call , https://ised-isde.canada.ca/site/ised/en/node/360
- FundsforNGOs (grant-search guidance): https://www2.fundsforngos.org/articles-listicles/how-to-use-funder-databases-to-find-the-right-grant-opportunities/amp/ , https://triple-funds.com/features/
- IRIS+ thematic taxonomy (impact categories): https://irisdev.thegiin.org/document/iris-thematic-taxonomy

**Platform files read (not changed):**
- `src/lib/database.types.ts`
- `src/components/grants/GrantsFilters.tsx`
- `src/components/watchdog/WatchdogFilters.tsx`
- `src/components/projects/ProjectsFilters.tsx`
- `src/lib/watchdog/urgency.ts`
- `supabase/migrations/*` (status checks)

**Not reached; partly from domain knowledge, verify before shipping:**
- Exact ReliefWeb theme and vulnerable-group labels
- The full GlobalGiving theme ID list
- Candid PCS support-strategy labels
- The current IUCN-CMP v2 actions and threats wording

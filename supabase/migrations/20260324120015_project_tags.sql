-- Migration: project_tags
-- Created: 2026-10-27
--
-- One shared, standardised tag vocabulary for projects (owner decision, 2026-10-27):
--   * tags: the vocabulary. Read by everyone (like a codelist); only admins (or server code with the
--     service role, e.g. the IATI import and the AI tagger) add tags. People never create tags themselves:
--     they ask for one through tag_requests.
--   * project_tags: which tags a project has. Anyone who can see the project can see its tags; people who can
--     edit the project can remove tags and add existing ones (added_by = 'user'). Tags added by the IATI
--     import ('iati') or the AI ('ai') are written with the service role.
--   * tag_requests: "please add this tag", reviewed by admins.
--
-- Imported IATI projects are tagged here with the descriptive names of their published OECD DAC sectors
-- (e.g. 14030 -> "Basic drinking water supply and basic sanitation"; several codes can share one name). Only
-- sector names that imported projects actually use become tags. The nightly import keeps them up to date.
-- The label formula is the same as src/lib/tags/iatiSectors.ts.

begin;

-- ---------------------------------------------------------------------------
-- 1) Tables
-- ---------------------------------------------------------------------------

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  label text not null check (char_length(label) between 2 and 80),
  origin text not null check (origin in ('iati', 'ai', 'admin')),
  -- OECD DAC sector codes that map to this tag (imported projects)
  iati_codes text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists tags_iati_codes_idx on public.tags using gin (iati_codes);

create table if not exists public.project_tags (
  project_id uuid not null references public.projects (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  added_by text not null check (added_by in ('iati', 'ai', 'user')),
  created_at timestamptz not null default now(),
  primary key (project_id, tag_id)
);
create index if not exists project_tags_tag_idx on public.project_tags (tag_id);

create table if not exists public.tag_requests (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(btrim(label)) between 2 and 80),
  reason text check (reason is null or char_length(reason) <= 500),
  project_id uuid references public.projects (id) on delete set null,
  requested_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  tag_id uuid references public.tags (id) on delete set null,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists tag_requests_status_idx on public.tag_requests (status, created_at);

-- ---------------------------------------------------------------------------
-- 2) Privileges (Supabase grants everything on new tables by default: start from nothing)
-- ---------------------------------------------------------------------------

revoke all on public.tags, public.project_tags, public.tag_requests from anon, authenticated;
grant select on public.tags to anon, authenticated;
grant insert, update, delete on public.tags to authenticated;          -- admins only (policy)
grant select on public.project_tags to anon, authenticated;
grant insert, delete on public.project_tags to authenticated;          -- project editors (policy)
grant select, insert, update on public.tag_requests to authenticated;  -- own requests; admins review
grant all on public.tags, public.project_tags, public.tag_requests to service_role;

-- ---------------------------------------------------------------------------
-- 3) RLS (helpers are SECURITY DEFINER, see 20260324120004)
-- ---------------------------------------------------------------------------

alter table public.tags enable row level security;
alter table public.project_tags enable row level security;
alter table public.tag_requests enable row level security;

-- The vocabulary is public by design (it is a codelist shown in filters), hence USING (true).
drop policy if exists tags_select_all on public.tags;
create policy tags_select_all on public.tags
  for select to anon, authenticated using (true);

drop policy if exists tags_admin_write on public.tags;
create policy tags_admin_write on public.tags
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists project_tags_select_visible on public.project_tags;
create policy project_tags_select_visible on public.project_tags
  for select to anon, authenticated using (public.user_can_view_project(project_id));

drop policy if exists project_tags_insert_editor on public.project_tags;
create policy project_tags_insert_editor on public.project_tags
  for insert to authenticated
  with check (added_by = 'user' and public.user_can_edit_project(project_id));

drop policy if exists project_tags_delete_editor on public.project_tags;
create policy project_tags_delete_editor on public.project_tags
  for delete to authenticated using (public.user_can_edit_project(project_id));

drop policy if exists tag_requests_insert_own on public.tag_requests;
create policy tag_requests_insert_own on public.tag_requests
  for insert to authenticated
  with check (requested_by = auth.uid() and status = 'pending' and reviewed_by is null and tag_id is null);

drop policy if exists tag_requests_select_own_or_admin on public.tag_requests;
create policy tag_requests_select_own_or_admin on public.tag_requests
  for select to authenticated using (requested_by = auth.uid() or public.is_admin());

drop policy if exists tag_requests_admin_update on public.tag_requests;
create policy tag_requests_admin_update on public.tag_requests
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4) Tags for imported projects, from their published sector names
-- ---------------------------------------------------------------------------

with sectors (slug, label, codes) as (
  values
    ('education', 'Education', array['110']),
    ('education-level-unspecified', 'Education, level unspecified', array['111']),
    ('basic-education', 'Basic education', array['112']),
    ('upper-secondary-education', 'Upper secondary education', array['113','11320','11322']),
    ('post-secondary-education', 'Post-secondary education', array['114']),
    ('health', 'Health', array['120']),
    ('health-general', 'Health, general', array['121']),
    ('basic-health', 'Basic health', array['122']),
    ('non-communicable-diseases', 'Non-communicable diseases', array['123']),
    ('population-policies-programmes-and-reproductive-health', 'Population policies/programmes and reproductive health', array['130']),
    ('water-supply-and-sanitation', 'Water supply and sanitation', array['140']),
    ('government-and-civil-society', 'Government and civil society', array['150']),
    ('government-and-civil-society-general', 'Government and civil society, general', array['151']),
    ('conflict-peace-and-security', 'Conflict, peace and security', array['152']),
    ('transport-and-storage', 'Transport and storage', array['210']),
    ('communications', 'Communications', array['220']),
    ('energy', 'Energy', array['230']),
    ('energy-policy', 'Energy policy', array['231']),
    ('energy-generation-renewable-sources', 'Energy generation, renewable sources', array['232']),
    ('energy-generation-non-renewable-sources', 'Energy generation, non-renewable sources', array['233']),
    ('hybrid-energy-plants', 'Hybrid energy plants', array['234']),
    ('nuclear-energy-plants', 'Nuclear energy plants', array['235']),
    ('energy-distribution', 'Energy distribution', array['236']),
    ('banking-and-financial-services', 'Banking and financial services', array['240']),
    ('business-and-other-services', 'Business and other services', array['250']),
    ('agriculture-forestry-fishing', 'Agriculture, forestry, fishing', array['310']),
    ('agriculture', 'Agriculture', array['311']),
    ('forestry', 'Forestry', array['312']),
    ('fishing', 'Fishing', array['313']),
    ('industry-mining-construction', 'Industry, mining, construction', array['320']),
    ('industry', 'Industry', array['321']),
    ('mineral-resources-and-mining', 'Mineral resources and mining', array['322']),
    ('construction', 'Construction', array['323']),
    ('trade-policies-and-regulations', 'Trade Policies and Regulations', array['330','331']),
    ('tourism', 'Tourism', array['332']),
    ('general-environment-protection', 'General Environment Protection', array['410']),
    ('general-budget-support', 'General Budget Support', array['510']),
    ('development-food-assistance', 'Development Food Assistance', array['520']),
    ('action-relating-to-debt', 'Action Relating to Debt', array['600','60010']),
    ('emergency-response', 'Emergency Response', array['720']),
    ('reconstruction-and-rehabilitation', 'Reconstruction and Rehabilitation', array['730']),
    ('disaster-preparedness', 'Disaster Preparedness', array['740']),
    ('administrative-costs-of-donors', 'Administrative Costs of Donors', array['910']),
    ('support-to-non-governmental-organisations', 'SUPPORT TO NON- GOVERNMENTAL ORGANISATIONS', array['920']),
    ('refugees-asylum-seekers-in-donor-countries', 'Refugees/Asylum Seekers in Donor Countries', array['930','93010']),
    ('education-policy-and-administrative-management', 'Education policy and administrative management', array['11110']),
    ('education-facilities-and-training', 'Education facilities and training', array['11120']),
    ('teacher-training', 'Teacher training', array['11130']),
    ('educational-research', 'Educational research', array['11182']),
    ('primary-education', 'Primary education', array['11220']),
    ('basic-life-skills-for-adults', 'Basic life skills for adults', array['11230']),
    ('basic-life-skills-for-youth', 'Basic life skills for youth', array['11231']),
    ('primary-education-equivalent-for-adults', 'Primary education equivalent for adults', array['11232']),
    ('early-childhood-education', 'Early childhood education', array['11240']),
    ('school-feeding', 'School feeding', array['11250']),
    ('lower-secondary-education', 'Lower secondary education', array['11260','11321']),
    ('vocational-training', 'Vocational training', array['11330']),
    ('higher-education', 'Higher education', array['11420']),
    ('advanced-technical-and-managerial-training', 'Advanced technical and managerial training', array['11430']),
    ('health-policy-and-administrative-management', 'Health policy and administrative management', array['12110']),
    ('medical-education-training', 'Medical education/training', array['12181']),
    ('medical-research', 'Medical research', array['12182']),
    ('medical-services', 'Medical services', array['12191']),
    ('health-statistics-and-data', 'Health statistics and data', array['12196']),
    ('basic-health-care', 'Basic health care', array['12220']),
    ('basic-health-infrastructure', 'Basic health infrastructure', array['12230']),
    ('basic-nutrition', 'Basic nutrition', array['12240']),
    ('infectious-disease-control', 'Infectious disease control', array['12250']),
    ('health-education', 'Health education', array['12261']),
    ('malaria-control', 'Malaria control', array['12262']),
    ('tuberculosis-control', 'Tuberculosis control', array['12263']),
    ('covid-19-control', 'COVID-19 control', array['12264']),
    ('health-personnel-development', 'Health personnel development', array['12281']),
    ('ncds-control-general', 'NCDs control, general', array['12310']),
    ('tobacco-use-control', 'Tobacco use control', array['12320']),
    ('control-of-harmful-use-of-alcohol-and-drugs', 'Control of harmful use of alcohol and drugs', array['12330']),
    ('promotion-of-mental-health-and-well-being', 'Promotion of mental health and well-being', array['12340']),
    ('research-for-prevention-and-control-of-ncds', 'Research for prevention and control of NCDs', array['12382']),
    ('population-policy-and-administrative-management', 'Population policy and administrative management', array['13010']),
    ('reproductive-health-care', 'Reproductive health care', array['13020']),
    ('family-planning', 'Family planning', array['13030']),
    ('std-control-including-hiv-aids', 'STD control including HIV/AIDS', array['13040']),
    ('personnel-development-for-population-and-reproductive-health', 'Personnel development for population and reproductive health', array['13081']),
    ('population-statistics-and-data', 'Population statistics and data', array['13096']),
    ('water-sector-policy-and-administrative-management', 'Water sector policy and administrative management', array['14010']),
    ('water-resources-conservation', 'Water resources conservation', array['14015']),
    ('water-supply-and-sanitation-large-systems', 'Water supply and sanitation - large systems', array['14020']),
    ('water-supply-large-systems', 'Water supply - large systems', array['14021']),
    ('sanitation-large-systems', 'Sanitation - large systems', array['14022']),
    ('basic-drinking-water-supply-and-basic-sanitation', 'Basic drinking water supply and basic sanitation', array['14030']),
    ('basic-drinking-water-supply', 'Basic drinking water supply', array['14031']),
    ('basic-sanitation', 'Basic sanitation', array['14032']),
    ('river-basins-development', 'River basins development', array['14040']),
    ('waste-management-disposal', 'Waste management/disposal', array['14050']),
    ('education-and-training-in-water-supply-and-sanitation', 'Education and training in water supply and sanitation', array['14081']),
    ('public-sector-policy-and-administrative-management', 'Public sector policy and administrative management', array['15110']),
    ('public-finance-management', 'Public finance management', array['15111']),
    ('decentralisation-and-support-to-subnational-government', 'Decentralisation and support to subnational government', array['15112']),
    ('anti-corruption-organisations-and-institutions', 'Anti-corruption organisations and institutions', array['15113']),
    ('domestic-revenue-mobilisation', 'Domestic revenue mobilisation', array['15114']),
    ('tax-collection', 'Tax collection', array['15116']),
    ('budget-planning', 'Budget planning', array['15117']),
    ('national-audit', 'National audit', array['15118']),
    ('debt-and-aid-management', 'Debt and aid management', array['15119']),
    ('public-sector-financial-management', 'Public sector financial management', array['15120']),
    ('foreign-affairs', 'Foreign affairs', array['15121']),
    ('diplomatic-missions', 'Diplomatic missions', array['15122']),
    ('administration-of-developing-countries-foreign-aid', 'Administration of developing countries'' foreign aid', array['15123']),
    ('general-personnel-services', 'General personnel services', array['15124']),
    ('public-procurement', 'Public Procurement', array['15125']),
    ('national-monitoring-and-evaluation', 'National monitoring and evaluation', array['15127']),
    ('local-government-finance', 'Local government finance', array['15128']),
    ('legal-and-judicial-development', 'Legal and judicial development', array['15130']),
    ('justice-law-and-order-policy-planning-and-administration', 'Justice, law and order policy, planning and administration', array['15131']),
    ('police', 'Police', array['15132']),
    ('fire-and-rescue-services', 'Fire and rescue services', array['15133']),
    ('judicial-affairs', 'Judicial affairs', array['15134']),
    ('ombudsman', 'Ombudsman', array['15135']),
    ('immigration', 'Immigration', array['15136']),
    ('prisons', 'Prisons', array['15137']),
    ('government-administration', 'Government administration', array['15140']),
    ('macroeconomic-policy', 'Macroeconomic policy', array['15142']),
    ('meteorological-services', 'Meteorological services', array['15143']),
    ('national-standards-development', 'National standards development', array['15144']),
    ('democratic-participation-and-civil-society', 'Democratic participation and civil society', array['15150']),
    ('elections', 'Elections', array['15151','15161']),
    ('legislatures-and-political-parties', 'Legislatures and political parties', array['15152']),
    ('media-and-free-flow-of-information', 'Media and free flow of information', array['15153']),
    ('executive-office', 'Executive office', array['15154']),
    ('tax-policy-and-administration-support', 'Tax policy and administration support', array['15155']),
    ('human-rights', 'Human rights', array['15160','15162']),
    ('free-flow-of-information', 'Free flow of information', array['15163']),
    ('women-s-equality-organisations-and-institutions', 'Women''s equality organisations and institutions', array['15164']),
    ('women-s-rights-organisations-and-movements-and-government-institutions', 'Women''s rights organisations and movements, and government institutions', array['15170']),
    ('ending-violence-against-women-and-girls', 'Ending violence against women and girls', array['15180']),
    ('local-government-administration', 'Local government administration', array['15185']),
    ('facilitation-of-orderly-safe-regular-and-responsible-migration-and-mobility', 'Facilitation of orderly, safe, regular and responsible migration and mobility', array['15190']),
    ('government-and-civil-society-statistics-and-data', 'Government and civil society statistics and data', array['15196']),
    ('security-system-management-and-reform', 'Security system management and reform', array['15210']),
    ('civilian-peace-building-conflict-prevention-and-resolution', 'Civilian peace-building, conflict prevention and resolution', array['15220']),
    ('participation-in-international-peacekeeping-operations', 'Participation in international peacekeeping operations', array['15230']),
    ('reintegration-and-salw-control', 'Reintegration and SALW control', array['15240']),
    ('removal-of-land-mines-and-explosive-remnants-of-war', 'Removal of land mines and explosive remnants of war', array['15250']),
    ('child-soldiers', 'Child soldiers', array['15261']),
    ('social-protection', 'Social Protection', array['16010']),
    ('social-protection-and-welfare-services-policy-planning-and-administration', 'Social protection and welfare services policy, planning and administration', array['16011']),
    ('social-security', 'Social security', array['16012']),
    ('general-pensions', 'General pensions', array['16013']),
    ('civil-service-pensions', 'Civil service pensions', array['16014']),
    ('social-services', 'Social services', array['16015']),
    ('employment-creation', 'Employment creation', array['16020']),
    ('housing-policy-and-administrative-management', 'Housing policy and administrative management', array['16030']),
    ('low-cost-housing', 'Low-cost housing', array['16040']),
    ('multisector-aid-for-basic-social-services', 'Multisector aid for basic social services', array['16050']),
    ('culture-and-cultural-diversity', 'Culture and cultural diversity', array['16061']),
    ('statistical-capacity-building', 'Statistical capacity building', array['16062']),
    ('narcotics-control', 'Narcotics control', array['16063']),
    ('social-mitigation-of-hiv-aids', 'Social mitigation of HIV/AIDS', array['16064']),
    ('recreation-and-sport', 'Recreation and sport', array['16065']),
    ('culture', 'Culture', array['16066']),
    ('labour-rights', 'Labour rights', array['16070']),
    ('social-dialogue', 'Social dialogue', array['16080']),
    ('transport-policy-and-administrative-management', 'Transport policy and administrative management', array['21010']),
    ('transport-policy-planning-and-administration', 'Transport policy, planning and administration', array['21011']),
    ('public-transport-services', 'Public transport services', array['21012']),
    ('transport-regulation', 'Transport regulation', array['21013']),
    ('road-transport', 'Road transport', array['21020']),
    ('feeder-road-construction', 'Feeder road construction', array['21021']),
    ('feeder-road-maintenance', 'Feeder road maintenance', array['21022']),
    ('national-road-construction', 'National road construction', array['21023']),
    ('national-road-maintenance', 'National road maintenance', array['21024']),
    ('rail-transport', 'Rail transport', array['21030']),
    ('water-transport', 'Water transport', array['21040']),
    ('air-transport', 'Air transport', array['21050']),
    ('storage', 'Storage', array['21061']),
    ('education-and-training-in-transport-and-storage', 'Education and training in transport and storage', array['21081']),
    ('communications-policy-and-administrative-management', 'Communications policy and administrative management', array['22010']),
    ('communications-policy-planning-and-administration', 'Communications policy, planning and administration', array['22011']),
    ('postal-services', 'Postal services', array['22012']),
    ('information-services', 'Information services', array['22013']),
    ('telecommunications', 'Telecommunications', array['22020']),
    ('radio-television-print-and-online-media', 'Radio, television, print and online media', array['22030']),
    ('information-and-communication-technology', 'Information and communication technology', array['22040']),
    ('education-and-training-in-ict-telecommunications-and-media', 'Education and training in ICT, telecommunications and media', array['22081']),
    ('energy-policy-and-administrative-management', 'Energy policy and administrative management', array['23010','23110']),
    ('power-generation-non-renewable-sources', 'Power generation/non-renewable sources', array['23020']),
    ('power-generation-renewable-sources', 'Power generation/renewable sources', array['23030']),
    ('electrical-transmission-distribution', 'Electrical transmission/distribution', array['23040']),
    ('gas-distribution', 'Gas distribution', array['23050']),
    ('oil-fired-power-plants', 'Oil-fired power plants', array['23061']),
    ('gas-fired-power-plants', 'Gas-fired power plants', array['23062']),
    ('coal-fired-power-plants', 'Coal-fired power plants', array['23063']),
    ('nuclear-power-plants', 'Nuclear power plants', array['23064']),
    ('hydro-electric-power-plants', 'Hydro-electric power plants', array['23065','23220']),
    ('geothermal-energy', 'Geothermal energy', array['23066','23260']),
    ('solar-energy', 'Solar energy', array['23067']),
    ('wind-power', 'Wind power', array['23068']),
    ('ocean-power', 'Ocean power', array['23069']),
    ('biomass', 'Biomass', array['23070']),
    ('energy-education-training', 'Energy education/training', array['23081','23181']),
    ('energy-research', 'Energy research', array['23082','23182']),
    ('energy-sector-policy-planning-and-administration', 'Energy sector policy, planning and administration', array['23111']),
    ('energy-regulation', 'Energy regulation', array['23112']),
    ('energy-conservation-and-demand-side-efficiency', 'Energy conservation and demand-side efficiency', array['23183']),
    ('energy-generation-renewable-sources-multiple-technologies', 'Energy generation, renewable sources - multiple technologies', array['23210']),
    ('solar-energy-for-centralised-grids', 'Solar energy for centralised grids', array['23230']),
    ('solar-energy-for-isolated-grids-and-standalone-systems', 'Solar energy for isolated grids and standalone systems', array['23231']),
    ('solar-energy-thermal-applications', 'Solar energy - thermal applications', array['23232']),
    ('wind-energy', 'Wind energy', array['23240']),
    ('marine-energy', 'Marine energy', array['23250']),
    ('biofuel-fired-power-plants', 'Biofuel-fired power plants', array['23270']),
    ('energy-generation-non-renewable-sources-unspecified', 'Energy generation, non-renewable sources, unspecified', array['23310']),
    ('coal-fired-electric-power-plants', 'Coal-fired electric power plants', array['23320']),
    ('oil-fired-electric-power-plants', 'Oil-fired electric power plants', array['23330']),
    ('natural-gas-fired-electric-power-plants', 'Natural gas-fired electric power plants', array['23340']),
    ('fossil-fuel-electric-power-plants-with-carbon-capture-and-storage', 'Fossil fuel electric power plants with carbon capture and storage', array['23350']),
    ('non-renewable-waste-fired-electric-power-plants', 'Non-renewable waste-fired electric power plants', array['23360']),
    ('hybrid-energy-electric-power-plants', 'Hybrid energy electric power plants', array['23410']),
    ('nuclear-energy-electric-power-plants-and-nuclear-safety', 'Nuclear energy electric power plants and nuclear safety', array['23510']),
    ('heat-plants', 'Heat plants', array['23610']),
    ('district-heating-and-cooling', 'District heating and cooling', array['23620']),
    ('electric-power-transmission-and-distribution', 'Electric power transmission and distribution', array['23630','23631']),
    ('retail-gas-distribution', 'Retail gas distribution', array['23640']),
    ('retail-distribution-of-liquid-or-solid-fossil-fuels', 'Retail distribution of liquid or solid fossil fuels', array['23641']),
    ('electric-mobility-infrastructures', 'Electric mobility infrastructures', array['23642']),
    ('financial-policy-and-administrative-management', 'Financial policy and administrative management', array['24010']),
    ('monetary-institutions', 'Monetary institutions', array['24020']),
    ('formal-sector-financial-intermediaries', 'Formal sector financial intermediaries', array['24030']),
    ('informal-semi-formal-financial-intermediaries', 'Informal/semi-formal financial intermediaries', array['24040']),
    ('remittance-facilitation-promotion-and-optimisation', 'Remittance facilitation, promotion and optimisation', array['24050']),
    ('education-training-in-banking-and-financial-services', 'Education/training in banking and financial services', array['24081']),
    ('business-policy-and-administration', 'Business policy and administration', array['25010']),
    ('privatisation', 'Privatisation', array['25020']),
    ('business-development-services', 'Business development services', array['25030']),
    ('responsible-business-conduct', 'Responsible business conduct', array['25040']),
    ('agricultural-policy-and-administrative-management', 'Agricultural policy and administrative management', array['31110']),
    ('agricultural-development', 'Agricultural development', array['31120']),
    ('agricultural-land-resources', 'Agricultural land resources', array['31130']),
    ('agricultural-water-resources', 'Agricultural water resources', array['31140']),
    ('agricultural-inputs', 'Agricultural inputs', array['31150']),
    ('food-crop-production', 'Food crop production', array['31161']),
    ('industrial-crops-export-crops', 'Industrial crops/export crops', array['31162']),
    ('livestock', 'Livestock', array['31163']),
    ('agrarian-reform', 'Agrarian reform', array['31164']),
    ('agricultural-alternative-development', 'Agricultural alternative development', array['31165']),
    ('agricultural-extension', 'Agricultural extension', array['31166']),
    ('agricultural-education-training', 'Agricultural education/training', array['31181']),
    ('agricultural-research', 'Agricultural research', array['31182']),
    ('agricultural-services', 'Agricultural services', array['31191']),
    ('plant-and-post-harvest-protection-and-pest-control', 'Plant and post-harvest protection and pest control', array['31192']),
    ('agricultural-financial-services', 'Agricultural financial services', array['31193']),
    ('agricultural-co-operatives', 'Agricultural co-operatives', array['31194']),
    ('livestock-veterinary-services', 'Livestock/veterinary services', array['31195']),
    ('forestry-policy-and-administrative-management', 'Forestry policy and administrative management', array['31210']),
    ('forestry-development', 'Forestry development', array['31220']),
    ('fuelwood-charcoal', 'Fuelwood/charcoal', array['31261']),
    ('forestry-education-training', 'Forestry education/training', array['31281']),
    ('forestry-research', 'Forestry research', array['31282']),
    ('forestry-services', 'Forestry services', array['31291']),
    ('fishing-policy-and-administrative-management', 'Fishing policy and administrative management', array['31310']),
    ('fishery-development', 'Fishery development', array['31320']),
    ('fishery-education-training', 'Fishery education/training', array['31381']),
    ('fishery-research', 'Fishery research', array['31382']),
    ('fishery-services', 'Fishery services', array['31391']),
    ('industrial-policy-and-administrative-management', 'Industrial policy and administrative management', array['32110']),
    ('industrial-development', 'Industrial development', array['32120']),
    ('small-and-medium-sized-enterprises-development', 'Small and medium-sized enterprises development', array['32130']),
    ('cottage-industries-and-handicraft', 'Cottage industries and handicraft', array['32140']),
    ('agro-industries', 'Agro-industries', array['32161']),
    ('forest-industries', 'Forest industries', array['32162']),
    ('textiles-leather-and-substitutes', 'Textiles, leather and substitutes', array['32163']),
    ('chemicals', 'Chemicals', array['32164']),
    ('fertilizer-plants', 'Fertilizer plants', array['32165']),
    ('cement-lime-plaster', 'Cement/lime/plaster', array['32166']),
    ('energy-manufacturing', 'Energy manufacturing', array['32167']),
    ('pharmaceutical-production', 'Pharmaceutical production', array['32168']),
    ('basic-metal-industries', 'Basic metal industries', array['32169']),
    ('non-ferrous-metal-industries', 'Non-ferrous metal industries', array['32170']),
    ('engineering', 'Engineering', array['32171']),
    ('transport-equipment-industry', 'Transport equipment industry', array['32172']),
    ('modern-biofuels-manufacturing', 'Modern biofuels manufacturing', array['32173']),
    ('clean-cooking-appliances-manufacturing-market-development-and-distribution', 'Clean cooking appliances manufacturing, market development and distribution', array['32174']),
    ('technological-research-and-development', 'Technological research and development', array['32182']),
    ('mineral-mining-policy-and-administrative-management', 'Mineral/mining policy and administrative management', array['32210']),
    ('mineral-prospection-and-exploration', 'Mineral prospection and exploration', array['32220']),
    ('coal', 'Coal', array['32261']),
    ('oil-and-gas', 'Oil and gas', array['32262']),
    ('ferrous-metals', 'Ferrous metals', array['32263']),
    ('nonferrous-metals', 'Nonferrous metals', array['32264']),
    ('precious-metals-materials', 'Precious metals/materials', array['32265']),
    ('industrial-minerals', 'Industrial minerals', array['32266']),
    ('fertilizer-minerals', 'Fertilizer minerals', array['32267']),
    ('offshore-minerals', 'Offshore minerals', array['32268']),
    ('construction-policy-and-administrative-management', 'Construction policy and administrative management', array['32310']),
    ('trade-policy-and-administrative-management', 'Trade policy and administrative management', array['33110']),
    ('trade-facilitation', 'Trade facilitation', array['33120']),
    ('regional-trade-agreements', 'Regional trade agreements', array['33130']),
    ('multilateral-trade-negotiations', 'Multilateral trade negotiations', array['33140']),
    ('trade-related-adjustment', 'Trade-related adjustment', array['33150']),
    ('trade-education-training', 'Trade education/training', array['33181']),
    ('tourism-policy-and-administrative-management', 'Tourism policy and administrative management', array['33210']),
    ('environmental-policy-and-administrative-management', 'Environmental policy and administrative management', array['41010']),
    ('biosphere-protection', 'Biosphere protection', array['41020']),
    ('biodiversity', 'Biodiversity', array['41030']),
    ('site-preservation', 'Site preservation', array['41040']),
    ('flood-prevention-control', 'Flood prevention/control', array['41050']),
    ('environmental-education-training', 'Environmental education/training', array['41081']),
    ('environmental-research', 'Environmental research', array['41082']),
    ('multisector-aid', 'Multisector aid', array['43010']),
    ('urban-development-and-management', 'Urban development and management', array['43030']),
    ('urban-land-policy-and-management', 'Urban land policy and management', array['43031']),
    ('urban-development', 'Urban development', array['43032']),
    ('rural-development', 'Rural development', array['43040','43042']),
    ('rural-land-policy-and-management', 'Rural land policy and management', array['43041']),
    ('non-agricultural-alternative-development', 'Non-agricultural alternative development', array['43050']),
    ('disaster-risk-reduction', 'Disaster Risk Reduction', array['43060']),
    ('food-security-policy-and-administrative-management', 'Food security policy and administrative management', array['43071']),
    ('household-food-security-programmes', 'Household food security programmes', array['43072']),
    ('food-safety-and-quality', 'Food safety and quality', array['43073']),
    ('multisector-education-training', 'Multisector education/training', array['43081']),
    ('research-scientific-institutions', 'Research/scientific institutions', array['43082']),
    ('general-budget-support-related-aid', 'General budget support-related aid', array['51010']),
    ('food-assistance', 'Food assistance', array['52010']),
    ('import-support', 'Import support', array['53030','53040']),
    ('debt-forgiveness', 'Debt forgiveness', array['60020']),
    ('relief-of-multilateral-debt', 'Relief of multilateral debt', array['60030']),
    ('rescheduling-and-refinancing', 'Rescheduling and refinancing', array['60040']),
    ('debt-for-development-swap', 'Debt for development swap', array['60061']),
    ('debt-buy-back', 'Debt buy-back', array['60063']),
    ('material-relief-assistance-and-services', 'Material relief assistance and services', array['72010']),
    ('basic-health-care-services-in-emergencies', 'Basic Health Care Services in Emergencies', array['72011']),
    ('education-in-emergencies', 'Education in emergencies', array['72012']),
    ('emergency-food-assistance', 'Emergency food assistance', array['72040']),
    ('relief-co-ordination-and-support-services', 'Relief co-ordination and support services', array['72050']),
    ('immediate-post-emergency-reconstruction-and-rehabilitation', 'Immediate post-emergency reconstruction and rehabilitation', array['73010']),
    ('disaster-prevention-and-preparedness', 'Disaster prevention and preparedness', array['74010']),
    ('multi-hazard-response-preparedness', 'Multi-hazard response preparedness', array['74020']),
    ('administrative-costs', 'Administrative costs', array['91010']),
    ('support-to-national-ngos', 'Support to national NGOs', array['92010']),
    ('support-to-international-ngos', 'Support to international NGOs', array['92020']),
    ('support-to-local-and-regional-ngos', 'Support to local and regional NGOs', array['92030']),
    ('refugees-asylum-seekers-in-donor-countries-food-and-shelter', 'Refugees/asylum seekers in donor countries - food and shelter', array['93011']),
    ('refugees-asylum-seekers-in-donor-countries-training', 'Refugees/asylum seekers in donor countries - training', array['93012']),
    ('refugees-asylum-seekers-in-donor-countries-health', 'Refugees/asylum seekers in donor countries - health', array['93013']),
    ('refugees-asylum-seekers-in-donor-countries-other-temporary-sustenance', 'Refugees/asylum seekers in donor countries - other temporary sustenance', array['93014']),
    ('refugees-asylum-seekers-in-donor-countries-voluntary-repatriation', 'Refugees/asylum seekers in donor countries - voluntary repatriation', array['93015']),
    ('refugees-asylum-seekers-in-donor-countries-transport', 'Refugees/asylum seekers in donor countries - transport', array['93016']),
    ('refugees-asylum-seekers-in-donor-countries-rescue-at-sea', 'Refugees/asylum seekers in donor countries - rescue at sea', array['93017']),
    ('refugees-asylum-seekers-in-donor-countries-administrative-costs', 'Refugees/asylum seekers in donor countries - administrative costs', array['93018']),
    ('sectors-not-specified', 'Sectors not specified', array['99810']),
    ('promotion-of-development-awareness', 'Promotion of development awareness', array['99820']),
    ('fight-against-transnational-organised-crime', 'Fight against transnational organised crime', array['1513010']),
    ('countering-violent-extremism', 'Countering violent extremism', array['1513020']),
    ('cyber-security', 'Cyber security', array['1513030']),
    ('transitional-justice', 'Transitional justice', array['1516010']),
    ('international-criminal-justice', 'International criminal justice', array['1516020']),
    ('disarmament-of-weapons-of-mass-destruction', 'Disarmament of Weapons of Mass Destruction', array['1520010']),
    ('prevention-of-violent-extremism', 'Prevention of Violent Extremism', array['1520020'])
),
used as (
  select distinct code
  from public.projects p
  cross join lateral jsonb_array_elements_text(
    case when jsonb_typeof(p.source_data -> 'dac_sectors') = 'array' then p.source_data -> 'dac_sectors' else '[]'::jsonb end
  ) as c(code)
  where p.source = 'iati'
)
insert into public.tags (slug, label, origin, iati_codes)
select s.slug, s.label, 'iati', s.codes
from sectors s
where exists (select 1 from used u where u.code = any (s.codes))
on conflict (slug) do nothing;

insert into public.project_tags (project_id, tag_id, added_by)
select distinct p.id, t.id, 'iati'
from public.projects p
cross join lateral jsonb_array_elements_text(
  case when jsonb_typeof(p.source_data -> 'dac_sectors') = 'array' then p.source_data -> 'dac_sectors' else '[]'::jsonb end
) as c(code)
join public.tags t on c.code = any (t.iati_codes)
where p.source = 'iati'
on conflict do nothing;

commit;

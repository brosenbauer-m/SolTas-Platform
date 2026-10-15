-- Migration: merge_iati_into_projects
-- Created: 2026-10-15
--
-- WHAT (owner decision 2026-10-15):
--   IATI activities become regular projects in public.projects, so there is one list of projects
--   for the map, Find Projects, the home stats and every project feature.
--   - New columns: source ('community' | 'iati'), iati_identifier (unique), point_precision,
--     source_data (publisher, sectors, markers, budget, ... as published), source_updated_at.
--   - One verified system organisation "IATI" owns all imported projects (owner_type organisation,
--     lead_org_id). Nobody is a member, so only admins can edit them; the nightly sync overwrites
--     the published fields.
--   - The 25,000 rows already in iati_activities are copied (withdrawn/hidden ones as 'unlisted').
--     iati_activities stays for now and is dropped in a later migration once the sync writes here.
--   - A guard trigger stops app users (anon/authenticated) from setting the imported-data columns,
--     so nobody can pose a project as "published to IATI".
--   - get_home_stats() no longer counts the system organisation as a verified organisation.
--
-- RLS: unchanged. Imported projects are status 'approved' + visibility 'public', so the existing
--   SELECT policy shows them; withdrawn ones are 'unlisted' (open by link, not listed).

begin;

-- 1) Columns -------------------------------------------------------------------------------
alter table public.projects
  add column if not exists source text not null default 'community',
  add column if not exists iati_identifier text,
  add column if not exists point_precision text,
  add column if not exists source_data jsonb,
  add column if not exists source_updated_at timestamptz;

alter table public.projects drop constraint if exists projects_source_check;
alter table public.projects
  add constraint projects_source_check check (source in ('community', 'iati'));

alter table public.projects drop constraint if exists projects_point_precision_check;
alter table public.projects
  add constraint projects_point_precision_check
  check (point_precision is null or point_precision in ('exact', 'country', 'region'));

alter table public.projects drop constraint if exists projects_iati_identifier_required;
alter table public.projects
  add constraint projects_iati_identifier_required check (source <> 'iati' or iati_identifier is not null);

alter table public.projects drop constraint if exists projects_iati_identifier_key;
alter table public.projects add constraint projects_iati_identifier_key unique (iati_identifier);

create index if not exists projects_listing_idx on public.projects (status, visibility, source);
create index if not exists projects_source_updated_idx on public.projects (source, source_updated_at)
  where source <> 'community';

-- 2) Only the sync (service role / direct DB connection) may set imported-data columns --------
create or replace function public.guard_project_source()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      if new.source is distinct from 'community'
         or new.iati_identifier is not null
         or new.source_data is not null
         or new.source_updated_at is not null
         or new.point_precision is not null then
        raise exception 'Imported-project fields can only be set by the import'
          using errcode = '42501';
      end if;
    elsif new.source is distinct from old.source
       or new.iati_identifier is distinct from old.iati_identifier
       or new.source_data is distinct from old.source_data
       or new.source_updated_at is distinct from old.source_updated_at
       or new.point_precision is distinct from old.point_precision then
      raise exception 'Imported-project fields can only be changed by the import'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_project_source on public.projects;
create trigger trg_guard_project_source
  before insert or update on public.projects
  for each row execute function public.guard_project_source();

-- 3) System organisation that owns imported projects --------------------------------------
insert into public.organisations (id, name, description, website, verification_status, verified_at)
values (
  'a7a71000-0000-4000-8000-000000000001',
  'IATI',
  'Projects published by organisations worldwide to the International Aid Transparency Initiative (IATI) '
    || 'and imported automatically. Each project names the organisation that published it.',
  'https://iatistandard.org',
  'verified',
  now()
)
on conflict (id) do nothing;

-- 4) Copy the activities imported so far ------------------------------------------------------
with country_names (code, name) as (
  values
      ('AD', 'Andorra'),
      ('AE', 'United Arab Emirates'),
      ('AF', 'Afghanistan'),
      ('AG', 'Antigua & Barbuda'),
      ('AI', 'Anguilla'),
      ('AL', 'Albania'),
      ('AM', 'Armenia'),
      ('AN', 'Curaçao'),
      ('AO', 'Angola'),
      ('AQ', 'Antarctica'),
      ('AR', 'Argentina'),
      ('AS', 'American Samoa'),
      ('AT', 'Austria'),
      ('AU', 'Australia'),
      ('AW', 'Aruba'),
      ('AZ', 'Azerbaijan'),
      ('BA', 'Bosnia & Herzegovina'),
      ('BB', 'Barbados'),
      ('BD', 'Bangladesh'),
      ('BE', 'Belgium'),
      ('BF', 'Burkina Faso'),
      ('BG', 'Bulgaria'),
      ('BH', 'Bahrain'),
      ('BI', 'Burundi'),
      ('BJ', 'Benin'),
      ('BM', 'Bermuda'),
      ('BN', 'Brunei'),
      ('BO', 'Bolivia'),
      ('BQ', 'Caribbean Netherlands'),
      ('BR', 'Brazil'),
      ('BS', 'Bahamas'),
      ('BT', 'Bhutan'),
      ('BV', 'Bouvet Island'),
      ('BW', 'Botswana'),
      ('BY', 'Belarus'),
      ('BZ', 'Belize'),
      ('CA', 'Canada'),
      ('CC', 'Cocos (Keeling) Islands'),
      ('CD', 'Congo - Kinshasa'),
      ('CF', 'Central African Republic'),
      ('CG', 'Congo - Brazzaville'),
      ('CH', 'Switzerland'),
      ('CI', 'Côte d’Ivoire'),
      ('CK', 'Cook Islands'),
      ('CL', 'Chile'),
      ('CM', 'Cameroon'),
      ('CN', 'China'),
      ('CO', 'Colombia'),
      ('CR', 'Costa Rica'),
      ('CU', 'Cuba'),
      ('CV', 'Cape Verde'),
      ('CW', 'Curaçao'),
      ('CX', 'Christmas Island'),
      ('CY', 'Cyprus'),
      ('CZ', 'Czechia'),
      ('DE', 'Germany'),
      ('DJ', 'Djibouti'),
      ('DK', 'Denmark'),
      ('DM', 'Dominica'),
      ('DO', 'Dominican Republic'),
      ('DZ', 'Algeria'),
      ('EC', 'Ecuador'),
      ('EE', 'Estonia'),
      ('EG', 'Egypt'),
      ('EH', 'Western Sahara'),
      ('ER', 'Eritrea'),
      ('ES', 'Spain'),
      ('ET', 'Ethiopia'),
      ('FI', 'Finland'),
      ('FJ', 'Fiji'),
      ('FK', 'Falkland Islands'),
      ('FM', 'Micronesia'),
      ('FO', 'Faroe Islands'),
      ('FR', 'France'),
      ('GA', 'Gabon'),
      ('GB', 'United Kingdom'),
      ('GD', 'Grenada'),
      ('GE', 'Georgia'),
      ('GF', 'French Guiana'),
      ('GG', 'Guernsey'),
      ('GH', 'Ghana'),
      ('GI', 'Gibraltar'),
      ('GL', 'Greenland'),
      ('GM', 'Gambia'),
      ('GN', 'Guinea'),
      ('GP', 'Guadeloupe'),
      ('GQ', 'Equatorial Guinea'),
      ('GR', 'Greece'),
      ('GS', 'South Georgia & South Sandwich Islands'),
      ('GT', 'Guatemala'),
      ('GU', 'Guam'),
      ('GW', 'Guinea-Bissau'),
      ('GY', 'Guyana'),
      ('GZ', 'GZ'),
      ('HK', 'Hong Kong SAR China'),
      ('HM', 'Heard & McDonald Islands'),
      ('HN', 'Honduras'),
      ('HR', 'Croatia'),
      ('HT', 'Haiti'),
      ('HU', 'Hungary'),
      ('ID', 'Indonesia'),
      ('IE', 'Ireland'),
      ('IL', 'Israel'),
      ('IM', 'Isle of Man'),
      ('IN', 'India'),
      ('IO', 'British Indian Ocean Territory'),
      ('IQ', 'Iraq'),
      ('IR', 'Iran'),
      ('IS', 'Iceland'),
      ('IT', 'Italy'),
      ('JE', 'Jersey'),
      ('JM', 'Jamaica'),
      ('JO', 'Jordan'),
      ('JP', 'Japan'),
      ('KE', 'Kenya'),
      ('KG', 'Kyrgyzstan'),
      ('KH', 'Cambodia'),
      ('KI', 'Kiribati'),
      ('KM', 'Comoros'),
      ('KN', 'St. Kitts & Nevis'),
      ('KP', 'North Korea'),
      ('KR', 'South Korea'),
      ('KW', 'Kuwait'),
      ('KY', 'Cayman Islands'),
      ('KZ', 'Kazakhstan'),
      ('LA', 'Laos'),
      ('LB', 'Lebanon'),
      ('LC', 'St. Lucia'),
      ('LI', 'Liechtenstein'),
      ('LK', 'Sri Lanka'),
      ('LR', 'Liberia'),
      ('LS', 'Lesotho'),
      ('LT', 'Lithuania'),
      ('LU', 'Luxembourg'),
      ('LV', 'Latvia'),
      ('LY', 'Libya'),
      ('MA', 'Morocco'),
      ('MC', 'Monaco'),
      ('MD', 'Moldova'),
      ('ME', 'Montenegro'),
      ('MG', 'Madagascar'),
      ('MH', 'Marshall Islands'),
      ('MK', 'North Macedonia'),
      ('ML', 'Mali'),
      ('MM', 'Myanmar (Burma)'),
      ('MN', 'Mongolia'),
      ('MO', 'Macao SAR China'),
      ('MP', 'Northern Mariana Islands'),
      ('MQ', 'Martinique'),
      ('MR', 'Mauritania'),
      ('MS', 'Montserrat'),
      ('MT', 'Malta'),
      ('MU', 'Mauritius'),
      ('MV', 'Maldives'),
      ('MW', 'Malawi'),
      ('MX', 'Mexico'),
      ('MY', 'Malaysia'),
      ('MZ', 'Mozambique'),
      ('NA', 'Namibia'),
      ('NC', 'New Caledonia'),
      ('NE', 'Niger'),
      ('NF', 'Norfolk Island'),
      ('NG', 'Nigeria'),
      ('NI', 'Nicaragua'),
      ('NL', 'Netherlands'),
      ('NO', 'Norway'),
      ('NP', 'Nepal'),
      ('NR', 'Nauru'),
      ('NU', 'Niue'),
      ('NZ', 'New Zealand'),
      ('OM', 'Oman'),
      ('PA', 'Panama'),
      ('PE', 'Peru'),
      ('PF', 'French Polynesia'),
      ('PG', 'Papua New Guinea'),
      ('PH', 'Philippines'),
      ('PK', 'Pakistan'),
      ('PL', 'Poland'),
      ('PM', 'St. Pierre & Miquelon'),
      ('PN', 'Pitcairn Islands'),
      ('PR', 'Puerto Rico'),
      ('PS', 'Palestinian Territories'),
      ('PT', 'Portugal'),
      ('PW', 'Palau'),
      ('PY', 'Paraguay'),
      ('QA', 'Qatar'),
      ('RE', 'Réunion'),
      ('RO', 'Romania'),
      ('RS', 'Serbia'),
      ('RU', 'Russia'),
      ('RW', 'Rwanda'),
      ('SA', 'Saudi Arabia'),
      ('SB', 'Solomon Islands'),
      ('SC', 'Seychelles'),
      ('SD', 'Sudan'),
      ('SE', 'Sweden'),
      ('SG', 'Singapore'),
      ('SH', 'St. Helena'),
      ('SI', 'Slovenia'),
      ('SJ', 'Svalbard & Jan Mayen'),
      ('SK', 'Slovakia'),
      ('SL', 'Sierra Leone'),
      ('SM', 'San Marino'),
      ('SN', 'Senegal'),
      ('SO', 'Somalia'),
      ('SR', 'Suriname'),
      ('SS', 'South Sudan'),
      ('ST', 'São Tomé & Príncipe'),
      ('SV', 'El Salvador'),
      ('SX', 'Sint Maarten'),
      ('SY', 'Syria'),
      ('SZ', 'Eswatini'),
      ('TC', 'Turks & Caicos Islands'),
      ('TD', 'Chad'),
      ('TF', 'French Southern Territories'),
      ('TG', 'Togo'),
      ('TH', 'Thailand'),
      ('TJ', 'Tajikistan'),
      ('TK', 'Tokelau'),
      ('TL', 'Timor-Leste'),
      ('TM', 'Turkmenistan'),
      ('TN', 'Tunisia'),
      ('TO', 'Tonga'),
      ('TR', 'Türkiye'),
      ('TT', 'Trinidad & Tobago'),
      ('TV', 'Tuvalu'),
      ('TW', 'Taiwan'),
      ('TZ', 'Tanzania'),
      ('UA', 'Ukraine'),
      ('UG', 'Uganda'),
      ('US', 'United States'),
      ('UY', 'Uruguay'),
      ('UZ', 'Uzbekistan'),
      ('VA', 'Vatican City'),
      ('VC', 'St. Vincent & Grenadines'),
      ('VE', 'Venezuela'),
      ('VG', 'British Virgin Islands'),
      ('VI', 'U.S. Virgin Islands'),
      ('VN', 'Vietnam'),
      ('VU', 'Vanuatu'),
      ('WF', 'Wallis & Futuna'),
      ('WS', 'Samoa'),
      ('XK', 'Kosovo'),
      ('YE', 'Yemen'),
      ('YT', 'Mayotte'),
      ('ZA', 'South Africa'),
      ('ZM', 'Zambia'),
      ('ZW', 'Zimbabwe')
)
insert into public.projects (
  name, slug, description, category, lifecycle_status, status, review_status, visibility,
  start_date, end_date, lat, lng, place_name, country, sdgs, currency,
  owner_type, owner_id, lead_org_id, approved_at, created_at,
  source, iati_identifier, point_precision, source_data, source_updated_at
)
select
  a.title,
  'iati-' || left(trim(both '-' from lower(regexp_replace(a.iati_identifier, '[^A-Za-z0-9]+', '-', 'g'))), 80)
    || '-' || left(md5(a.iati_identifier), 6),
  a.description,
  case when a.humanitarian then 'humanitarian' else 'environmental' end,
  a.lifecycle_status,
  'approved',
  'approved',
  case when a.withdrawn_at is null and not a.hidden then 'public' else 'unlisted' end,
  a.start_date,
  a.end_date,
  a.lat,
  a.lng,
  coalesce(nullif(a.locations -> 0 ->> 'name', ''), cn.name),
  cn.name,
  a.sdgs,
  a.currency,
  'organisation',
  'a7a71000-0000-4000-8000-000000000001',
  'a7a71000-0000-4000-8000-000000000001',
  now(),
  a.synced_at,
  'iati',
  a.iati_identifier,
  a.point_precision,
  jsonb_build_object(
    'reporting_org', jsonb_build_object('ref', a.reporting_org_ref, 'name', a.reporting_org_name, 'type', a.reporting_org_type),
    'participating_orgs', a.participating_orgs,
    'activity_status', a.activity_status,
    'countries', to_jsonb(a.countries),
    'regions', to_jsonb(a.regions),
    'scope', a.scope,
    'locations', a.locations,
    'dac_sectors', to_jsonb(a.dac_sectors),
    'policy_markers', a.policy_markers,
    'humanitarian', a.humanitarian,
    'budget_total', a.budget_total,
    'links', a.links
  ),
  a.last_updated_at
from public.iati_activities a
left join country_names cn on cn.code = a.countries[1]
on conflict (iati_identifier) do nothing;

-- 5) Home stats: the system organisation is not a "verified organisation" -------------------
create or replace function public.get_home_stats()
returns table(
  updated_at timestamp with time zone,
  projects_projects_approved bigint,
  projects_projects_ongoing bigint,
  projects_organisations_registered bigint,
  projects_donations_received_eur numeric,
  funding_opportunities_total bigint,
  funding_funders_registered bigint,
  funding_open_calls bigint,
  issues_issues_total bigint,
  issues_issues_open bigint
)
language sql
stable
set search_path to 'pg_catalog', 'public'
as $function$
  select
    pg_catalog.now() as updated_at,
    (
      select pg_catalog.count(*)
      from public.projects
      where status = 'approved'
        and visibility in ('public', 'unlisted')
    ) as projects_projects_approved,
    (
      select pg_catalog.count(*)
      from public.projects
      where status = 'approved'
        and visibility in ('public', 'unlisted')
        and (end_date is null or end_date >= current_date)
    ) as projects_projects_ongoing,
    (
      select pg_catalog.count(*)
      from public.organisations
      where verification_status = 'verified'
        and id <> 'a7a71000-0000-4000-8000-000000000001'
    ) as projects_organisations_registered,
    (
      select coalesce(pg_catalog.sum(donations_received), 0::numeric)
      from public.projects
      where status = 'approved'
        and visibility in ('public', 'unlisted')
        and currency = 'EUR'
    ) as projects_donations_received_eur,
    (
      select pg_catalog.count(*)
      from public.grants
      where is_published = true
        and status in ('open', 'rolling')
    ) as funding_opportunities_total,
    (
      select pg_catalog.count(distinct funder_name)
      from public.grants
      where is_published = true
        and status in ('open', 'rolling')
        and funder_name is not null
        and funder_name <> ''
    ) as funding_funders_registered,
    (
      select pg_catalog.count(*)
      from public.grants
      where is_published = true
        and status = 'open'
    ) as funding_open_calls,
    (
      select pg_catalog.count(*)
      from public.watchdog_issues
      where status = 'approved'
    ) as issues_issues_total,
    (
      select pg_catalog.count(*)
      from public.watchdog_issues
      where status = 'approved'
        and urgency >= 4
    ) as issues_issues_open;
$function$;

commit;

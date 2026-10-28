"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { Checkbox } from "@/components/ui/checkbox"
import { APPLICANT_TYPES, isApplicantType } from "@/lib/grants/applicantTypes"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { createClient } from "@/utils/supabase/client"
import type { Database } from "@/types/supabase"

type GrantRow = Database["public"]["Tables"]["grants"]["Row"]
type GrantInsert = Database["public"]["Tables"]["grants"]["Insert"]
type GrantUpdate = Database["public"]["Tables"]["grants"]["Update"]

const projectTypes = ["environmental", "humanitarian", "both"] as const
const fundingTypes = ["grant", "prize", "fellowship", "loan", "equity", "in-kind", "other"] as const

const SDG_OPTIONS = [
  { id: "1", label: "No Poverty" },
  { id: "2", label: "Zero Hunger" },
  { id: "3", label: "Good Health and Well-being" },
  { id: "4", label: "Quality Education" },
  { id: "5", label: "Gender Equality" },
  { id: "6", label: "Clean Water and Sanitation" },
  { id: "7", label: "Affordable and Clean Energy" },
  { id: "8", label: "Decent Work and Economic Growth" },
  { id: "9", label: "Industry, Innovation and Infrastructure" },
  { id: "10", label: "Reduced Inequalities" },
  { id: "11", label: "Sustainable Cities and Communities" },
  { id: "12", label: "Responsible Consumption and Production" },
  { id: "13", label: "Climate Action" },
  { id: "14", label: "Life Below Water" },
  { id: "15", label: "Life on Land" },
  { id: "16", label: "Peace, Justice and Strong Institutions" },
  { id: "17", label: "Partnerships for the Goals" },
] as const

const THEME_OPTIONS = [
  "Biodiversity",
  "Climate",
  "Oceans",
  "Forests",
  "Agriculture",
  "Energy",
  "Education",
  "Health",
  "Human rights",
  "Refugees",
  "Water",
  "Women & girls",
  "Economic development",
] as const

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),

  summary: z.string().max(500, "Summary is too long").optional().default(""),
  description: z.string().max(5000, "Description is too long").optional().default(""),

  project_type: z.enum(projectTypes),
  funding_type: z.enum(fundingTypes),

  application_url: z.string().min(1, "Application URL is required").url("Please enter a valid URL"),

  currency: z.string().min(1, "Currency is required").max(10, "Currency is too long"),

  amount_min: z.string().optional().default(""),
  amount_max: z.string().optional().default(""),

  open_date: z.string().optional().default(""),
  deadline: z.string().optional().default(""),
  decision_date: z.string().optional().default(""),
  start_date: z.string().optional().default(""),

  eligible_countries: z.string().optional().default(""),
  applicant_types: z.array(z.string()).default([]),

  remote_ok: z.boolean().default(false),

  location_name: z.string().optional().default(""),
  latitude: z.string().optional().default(""),
  longitude: z.string().optional().default(""),

  themes: z.array(z.string()).default([]),
  sdgs: z.array(z.string()).default([]),

  keywords: z.string().optional().default(""),

  funder_name: z.string().optional().default(""),
  funder_website: z
    .string()
    .optional()
    .default("")
    .refine((v) => !v || /^https?:\/\//i.test(v), {
      message: "Funder website must be a valid URL (include http/https)",
    }),
  contact_email: z
    .string()
    .optional()
    .default("")
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
      message: "Please enter a valid email address",
    }),

  post_to_feed: z.boolean().default(false),
  feed_message: z
    .string()
    .trim()
    .max(1000, "Keep message under 1000 characters")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.trim().length ? v.trim() : undefined)),
})

type FormValues = z.infer<typeof formSchema>

type GrantFormProps = {
  grant?: GrantRow | null
  mode?: "create" | "edit"
}

function toDateInputValue(value: string | null | undefined) {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function joinArrayForEdit(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean).map(String)
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String)
    } catch {
      return value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    }
  }
  return []
}

function keywordsToString(value: unknown): string {
  if (!value) return ""
  if (typeof value === "string") return value
  if (Array.isArray(value)) return value.filter(Boolean).map(String).join(", ")
  return ""
}

function parseNumberOrNull(s: string | undefined) {
  const trimmed = (s ?? "").trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

function parseDateOrNull(s: string | undefined) {
  const trimmed = (s ?? "").trim()
  return trimmed ? trimmed : null
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

/** Toggleable pill used for themes and SDGs. */
function chipClass(active: boolean) {
  return [
    "inline-flex min-h-9 items-center rounded-full border px-3.5 text-[13px] transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-soltas-ocean/40",
    active
      ? "border-soltas-ocean bg-soltas-ocean text-white"
      : "border-soltas-line bg-white text-soltas-text hover:bg-soltas-light",
  ].join(" ")
}

export default function GrantForm({ grant, mode = "create" }: GrantFormProps) {
  const router = useRouter()

  // Safe Supabase init (avoid crashing render if env vars are missing)
  const [supabase] = React.useState<ReturnType<typeof createClient> | null>(() => {
    try {
      return createClient()
    } catch (err) {
      console.error("Supabase client init failed:", err)
      return null
    }
  })

  const supabaseConfigured = supabase !== null

  const { toast } = useToast()
  const [submitting, setSubmitting] = React.useState(false)

  const defaultValues: FormValues = React.useMemo(() => {
    if (!grant) {
      return {
        title: "",
        summary: "",
        description: "",
        project_type: "both",
        funding_type: "grant",
        application_url: "",
        currency: "USD",
        amount_min: "",
        amount_max: "",
        open_date: "",
        deadline: "",
        decision_date: "",
        start_date: "",
        eligible_countries: "",
        applicant_types: [],
        remote_ok: false,
        location_name: "",
        latitude: "",
        longitude: "",
        themes: [],
        sdgs: [],
        keywords: "",
        funder_name: "",
        funder_website: "",
        contact_email: "",
        post_to_feed: false,
        feed_message: "",
      }
    }

    return {
      title: grant.title ?? "",
      summary: grant.summary ?? "",
      description: grant.description ?? "",
      project_type: (grant.project_type as FormValues["project_type"]) ?? "both",
      funding_type: (grant.funding_type as FormValues["funding_type"]) ?? "grant",
      application_url: grant.application_url ?? "",
      currency: grant.currency ?? "USD",
      amount_min: grant.amount_min != null ? String(grant.amount_min) : "",
      amount_max: grant.amount_max != null ? String(grant.amount_max) : "",
      open_date: toDateInputValue(grant.open_date),
      deadline: toDateInputValue(grant.deadline),
      decision_date: toDateInputValue(grant.decision_date),
      start_date: toDateInputValue(grant.start_date),
      eligible_countries: Array.isArray(grant.eligible_countries)
        ? grant.eligible_countries.join(", ")
        : (grant.eligible_countries as unknown as string) ?? "",
      applicant_types: Array.isArray((grant as { applicant_types?: string[] }).applicant_types)
        ? ((grant as { applicant_types?: string[] }).applicant_types as string[])
        : [],
      remote_ok: Boolean(grant.remote_ok),
      location_name: grant.location_name ?? "",
      latitude: grant.latitude != null ? String(grant.latitude) : "",
      longitude: grant.longitude != null ? String(grant.longitude) : "",
      themes: joinArrayForEdit(grant.themes),
      sdgs: joinArrayForEdit(grant.sdgs),
      keywords: keywordsToString(grant.keywords),
      funder_name: grant.funder_name ?? "",
      funder_website: grant.funder_website ?? "",
      contact_email: grant.contact_email ?? "",
      post_to_feed: false,
      feed_message: "",
    }
  }, [grant])

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: "onChange",
  })

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true)
    try {
      if (!supabase) {
        throw new Error(
          "Supabase is not configured for this deployment. Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY."
        )
      }

      const keywordsArray = values.keywords
        ? values.keywords
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : []

      const eligibleCountries =
        values.eligible_countries.trim().length > 0
          ? values.eligible_countries
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : null

      const sdgsNumeric = (values.sdgs ?? []).map((s) => Number(s)).filter((n) => Number.isFinite(n))

      const payloadBase = {
        title: values.title,
        summary: values.summary.trim() ? values.summary.trim() : null,
        description: values.description.trim() ? values.description.trim() : null,

        project_type: values.project_type,
        funding_type: values.funding_type,

        application_url: values.application_url,
        currency: values.currency,

        amount_min: parseNumberOrNull(values.amount_min),
        amount_max: parseNumberOrNull(values.amount_max),

        open_date: parseDateOrNull(values.open_date),
        deadline: parseDateOrNull(values.deadline),
        decision_date: parseDateOrNull(values.decision_date),
        start_date: parseDateOrNull(values.start_date),

        eligible_countries: eligibleCountries,
        applicant_types: values.applicant_types.filter(isApplicantType),
        remote_ok: values.remote_ok,

        location_name: values.location_name.trim() ? values.location_name.trim() : null,
        latitude: parseNumberOrNull(values.latitude),
        longitude: parseNumberOrNull(values.longitude),

        themes: values.themes ?? [],
        sdgs: sdgsNumeric,
        keywords: keywordsArray,

        funder_name: values.funder_name.trim() ? values.funder_name.trim() : null,
        funder_website: values.funder_website.trim() ? values.funder_website.trim() : null,
        contact_email: values.contact_email.trim() ? values.contact_email.trim() : null,
      }

      if (mode === "edit") {
        if (!grant?.id) throw new Error("Missing funding id")

        const payload: GrantUpdate = payloadBase
        const { error } = await supabase.from("grants").update(payload).eq("id", grant.id)
        if (error) throw error

        toast({ title: "Funding updated", description: "Your changes have been saved." })
      } else {
        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser()
        if (userErr) throw userErr
        if (!user) throw new Error("You must be signed in to create funding.")

        const payload: GrantInsert = {
          ...(payloadBase as unknown as Omit<GrantInsert, "created_by" | "slug">),
          created_by: user.id,
          slug: slugify(values.title) || `grant-${Date.now()}`,
        }

        const { error } = await supabase.from("grants").insert(payload)
        if (error) throw error

        toast({ title: "Funding created", description: "Your funding has been created." })
      }

      router.refresh()
      router.push("/funding")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save funding."
      toast({ title: "Something went wrong", description: message, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const selectedThemes = form.watch("themes") ?? []
  const selectedSdgs = form.watch("sdgs") ?? []

  const toggleTheme = (theme: string) => {
    const current = form.getValues("themes") ?? []
    const next = current.includes(theme) ? current.filter((t) => t !== theme) : [...current, theme]
    form.setValue("themes", next, { shouldDirty: true, shouldValidate: true })
  }

  const toggleSdg = (sdgId: string) => {
    const current = form.getValues("sdgs") ?? []
    const next = current.includes(sdgId) ? current.filter((t) => t !== sdgId) : [...current, sdgId]
    form.setValue("sdgs", next, { shouldDirty: true, shouldValidate: true })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {!supabaseConfigured ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="font-semibold">Funding registration is unavailable</div>
            <div className="mt-1 text-amber-800">
              This deployment is missing Supabase public environment variables. Configure{" "}
              <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
              in Vercel (Production), then redeploy.
            </div>
          </div>
        ) : null}

        {/* Basic info */}
        <div className="space-y-6 rounded-3xl border border-soltas-line bg-white p-5 sm:p-7">
          <div className="space-y-2">
            <h2 className="text-[17px] font-semibold tracking-tight text-soltas-text">Basic information</h2>
            <p className="text-sm text-muted-foreground">
              Provide the main details about the funding opportunity.
            </p>
          </div>

          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Climate Innovation Funding" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="summary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Summary</FormLabel>
                <FormControl>
                  <Textarea placeholder="Short summary (max 500 chars)" rows={3} {...field} />
                </FormControl>
                <FormDescription>A short summary shown in search results.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Full description (max 5000 chars)" rows={7} {...field} />
                </FormControl>
                <FormDescription>More detail about the funding, criteria, and how to apply.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Funding & type */}
        <div className="space-y-6 rounded-3xl border border-soltas-line bg-white p-5 sm:p-7">
          <div className="space-y-2">
            <h2 className="text-[17px] font-semibold tracking-tight text-soltas-text">Funding details</h2>
            <p className="text-sm text-muted-foreground">
              Help users understand what type of support this is.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="project_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project type *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="environmental">Environmental</SelectItem>
                      <SelectItem value="humanitarian">Humanitarian</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="funding_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Funding type *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a funding type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="grant">Funding</SelectItem>
                      <SelectItem value="prize">Prize</SelectItem>
                      <SelectItem value="fellowship">Fellowship</SelectItem>
                      <SelectItem value="loan">Loan</SelectItem>
                      <SelectItem value="equity">Equity</SelectItem>
                      <SelectItem value="in-kind">In-kind</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="application_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Application URL *</FormLabel>
                <FormControl>
                  <Input placeholder="https://..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-6 md:grid-cols-3">
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency *</FormLabel>
                  <FormControl>
                    <Input placeholder="USD" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount_min"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Min amount</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 10000" inputMode="numeric" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount_max"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max amount</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 50000" inputMode="numeric" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Dates */}
        <div className="space-y-6 rounded-3xl border border-soltas-line bg-white p-5 sm:p-7">
          <div className="space-y-2">
            <h2 className="text-[17px] font-semibold tracking-tight text-soltas-text">Timeline</h2>
            <p className="text-sm text-muted-foreground">
              Dates help applicants plan. Leave blank if unknown.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="open_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Open date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deadline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deadline</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="decision_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Decision date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Eligibility & location */}
        <div className="space-y-6 rounded-3xl border border-soltas-line bg-white p-5 sm:p-7">
          <div className="space-y-2">
            <h2 className="text-[17px] font-semibold tracking-tight text-soltas-text">Eligibility & location</h2>
            <p className="text-sm text-muted-foreground">
              Where can applicants apply from? Is remote participation allowed?
            </p>
          </div>

          <FormField
            control={form.control}
            name="eligible_countries"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Eligible countries</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Global, EU, USA, Kenya" {...field} />
                </FormControl>
                <FormDescription>Free text is ok (e.g. “Global” or “EU + UK”).</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="applicant_types"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Who can apply</FormLabel>
                <FormDescription>Tick every type of applicant the funder accepts.</FormDescription>
                <div className="grid gap-2 sm:grid-cols-2">
                  {APPLICANT_TYPES.map((type) => {
                    const checked = field.value.includes(type.value);
                    return (
                      <label key={type.value} className="flex min-h-11 items-center gap-3 rounded-xl border border-soltas-line px-3 text-sm text-soltas-text">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(next) =>
                            field.onChange(
                              next ? [...field.value, type.value] : field.value.filter((v: string) => v !== type.value),
                            )
                          }
                          aria-label={type.label}
                        />
                        {type.label}
                      </label>
                    );
                  })}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center justify-between gap-4 rounded-2xl bg-soltas-off-white p-4">
            <div className="space-y-1">
              {/* IMPORTANT: use plain elements here (FormLabel/FormDescription require FormFieldContext) */}
              <div className="text-base font-medium">Remote OK</div>
              <div className="text-sm text-muted-foreground">
                Applicants can participate without being on-site.
              </div>
            </div>

            <FormField
              control={form.control}
              name="remote_ok"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <FormField
              control={form.control}
              name="location_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Vienna, Austria" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="latitude"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Latitude</FormLabel>
                  <FormControl>
                    <Input placeholder="48.2082" inputMode="decimal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="longitude"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Longitude</FormLabel>
                  <FormControl>
                    <Input placeholder="16.3738" inputMode="decimal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Classification */}
        <div className="space-y-6 rounded-3xl border border-soltas-line bg-white p-5 sm:p-7">
          <div className="space-y-2">
            <h2 className="text-[17px] font-semibold tracking-tight text-soltas-text">Classification</h2>
            <p className="text-sm text-muted-foreground">
              Themes and SDGs help filter and match opportunities.
            </p>
          </div>

          {/* IMPORTANT: No FormLabel here (requires FormFieldContext). Use plain text. */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-soltas-text">Themes</div>
            <div className="flex flex-wrap gap-2">
              {THEME_OPTIONS.map((t) => {
                const active = selectedThemes.includes(t)
                return (
                  <button type="button" key={t} aria-pressed={active} className={chipClass(active)} onClick={() => toggleTheme(t)}>
                    {t}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-soltas-text">Sustainable Development Goals</div>
            <div className="flex flex-wrap gap-2">
              {SDG_OPTIONS.map((s) => {
                const active = selectedSdgs.includes(s.id)
                return (
                  <button type="button" key={s.id} aria-pressed={active} className={chipClass(active)} onClick={() => toggleSdg(s.id)}>
                    {s.id}. {s.label}
                  </button>
                )
              })}
            </div>
          </div>

          <FormField
            control={form.control}
            name="keywords"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Keywords</FormLabel>
                <FormControl>
                  <Input placeholder="comma, separated, keywords" {...field} />
                </FormControl>
                <FormDescription>Used for search. Separate with commas.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Funder */}
        <div className="space-y-6 rounded-3xl border border-soltas-line bg-white p-5 sm:p-7">
          <div className="space-y-2">
            <h2 className="text-[17px] font-semibold tracking-tight text-soltas-text">Funder information</h2>
            <p className="text-sm text-muted-foreground">
              Optional details about the organization offering the funding.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="funder_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Funder name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Example Foundation" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="funder_website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Funder website</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="contact_email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact email</FormLabel>
                <FormControl>
                  <Input placeholder="name@org.org" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Post to feed */}
        <div className="space-y-6 rounded-3xl border border-soltas-line bg-white p-5 sm:p-7">
          <div className="space-y-2">
            <h2 className="text-[17px] font-semibold tracking-tight text-soltas-text">Share to feed</h2>
            <p className="text-sm text-muted-foreground">
              Optionally post a message to the community feed when this funding opportunity is created.
            </p>
          </div>

          <FormField
            control={form.control}
            name="post_to_feed"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between gap-4 rounded-2xl bg-soltas-off-white p-4">
                <div className="space-y-1">
                  <FormLabel>Post to feed</FormLabel>
                  <FormDescription>
                    Share this funding opportunity with the community feed.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          {form.watch("post_to_feed") && (
            <FormField
              control={form.control}
              name="feed_message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormDescription>
                    Tell the community why this funding opportunity is important.
                  </FormDescription>
                  <FormControl>
                    <Textarea placeholder="Share why this funding is important..." rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={submitting} onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || !supabaseConfigured}>
            {submitting
              ? mode === "edit"
                ? "Saving…"
                : "Submitting…"
              : mode === "edit"
                ? "Save changes"
                : "Submit for review"}
          </Button>
        </div>
      </form>
    </Form>
  )
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import MapGeocoder from "@/components/MapGeocoder";
import MultiSelect, { type Option } from "@/components/ui/MultiSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";

const linkSchema = z.object({
  url: z.string().trim().min(1, "Link is required").url("Enter a valid URL"),
});

const formSchema = z
  .object({
    title: z.string().trim().min(1, "Issue title is required").max(200, "Title is too long"),
    description: z
      .string()
      .trim()
      .min(1, "Issue summary is required")
      .max(8000, "Summary is too long"),
    country: z.string().trim().min(1, "Country is required"),
    region: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .transform(value => (value ? value.trim() : "")),
    city: z.string().trim().min(1, "City is required"),
    latitude: z.number({ required_error: "Latitude is required" }),
    longitude: z.number({ required_error: "Longitude is required" }),
    affected_demographics: z.array(z.string()).default([]),
    affected_groups_text: z
      .string()
      .trim()
      .max(500, "Keep this concise")
      .optional()
      .or(z.literal(""))
      .transform(value => (value ? value.trim() : "")),
    sdgs: z.array(z.string()).default([]),
    global_challenges: z.array(z.string()).default([]),
    urgency: z.number().int().min(1).max(5),
    date_observed: z
      .string()
      .optional()
      .or(z.literal(""))
      .transform(value => (value ? value.trim() : "")),
    evidence_links: z.array(linkSchema).default([]),
    desired_outcome: z
      .string()
      .trim()
      .max(2000, "Keep the desired outcome concise")
      .optional()
      .or(z.literal(""))
      .transform(value => (value ? value.trim() : "")),
    contact_allowed: z.boolean().default(true),
    reporter_anonymous: z.boolean().default(false),
  })
  .superRefine((values, ctx) => {
    if (!Number.isFinite(values.latitude)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["latitude"], message: "Latitude is required" });
    }
    if (!Number.isFinite(values.longitude)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["longitude"], message: "Longitude is required" });
    }
  });

type FormValues = z.infer<typeof formSchema>;

const createDefaultValues = (): FormValues => ({
  title: "",
  description: "",
  country: "",
  region: "",
  city: "",
  latitude: Number.NaN,
  longitude: Number.NaN,
  affected_demographics: [],
  affected_groups_text: "",
  sdgs: [],
  global_challenges: [],
  urgency: 3,
  date_observed: "",
  evidence_links: [],
  desired_outcome: "",
  contact_allowed: true,
  reporter_anonymous: false,
});

const URGENCY_OPTIONS = [
  { value: 1, label: "1 — Low" },
  { value: 2, label: "2 — Guarded" },
  { value: 3, label: "3 — Elevated" },
  { value: 4, label: "4 — High" },
  { value: 5, label: "5 — Critical" },
];

export default function WatchdogIssueForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [sdgOptions, setSdgOptions] = useState<Option[]>([]);
  const [challengeOptions, setChallengeOptions] = useState<Option[]>([]);
  const [demographicOptions, setDemographicOptions] = useState<Option[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: createDefaultValues(),
  });

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "evidence_links",
  });

  const loadOptions = useCallback(async () => {
    const [sdgRes, ifrcRes, demographicRes] = await Promise.all([
      supabase.from("sdgs").select("id,name").order("id"),
      supabase.from("ifrc_challenges").select("id,name").order("name"),
      supabase.from("organisations_directory_v1").select("demographic_tags").limit(2000),
    ]);

    if (!sdgRes.error && sdgRes.data) {
      setSdgOptions(
        sdgRes.data.map(sdg => ({
          value: String(sdg.id),
          label: sdg.name ? `${sdg.id}. ${sdg.name}` : `SDG ${sdg.id}`,
        })),
      );
    }

    if (!ifrcRes.error && ifrcRes.data) {
      setChallengeOptions(
        ifrcRes.data.map(challenge => ({
          value: challenge.name ?? String(challenge.id),
          label: challenge.name ?? String(challenge.id),
        })),
      );
    }

    if (!demographicRes.error && demographicRes.data) {
      const values = new Set<string>();
      demographicRes.data.forEach(row => {
        (row.demographic_tags ?? []).forEach((tag: string) => values.add(tag));
      });
      setDemographicOptions(
        Array.from(values)
          .sort((a, b) => a.localeCompare(b))
          .map(value => ({ value, label: value })),
      );
    }
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  const handleLocationSelect = useCallback(
    (value: { lat: number; lng: number; place_name: string }) => {
      setSelectedPlace(value.place_name);
      setValue("latitude", value.lat, { shouldDirty: true, shouldValidate: true });
      setValue("longitude", value.lng, { shouldDirty: true, shouldValidate: true });
    },
    [setValue],
  );

  const renderSdgBadges = useMemo(() => {
    if (!sdgOptions.length) return null;
    return sdgOptions.map(option => (
      <Badge key={option.value} variant="outline" className="text-xs">
        {option.label}
      </Badge>
    ));
  }, [sdgOptions]);

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
    setSubmitSuccess(false);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/watchdog/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: values.title,
          description: values.description,
          country: values.country,
          region: values.region,
          city: values.city,
          latitude: values.latitude,
          longitude: values.longitude,
          affected_demographics: values.affected_demographics,
          affected_groups_text: values.affected_groups_text,
          sdgs: values.sdgs.map(sdg => Number(sdg)).filter(Number.isFinite),
          global_challenges: values.global_challenges,
          urgency: values.urgency,
          date_observed: values.date_observed || undefined,
          evidence_links: values.evidence_links.map(link => link.url.trim()),
          desired_outcome: values.desired_outcome,
          contact_allowed: values.contact_allowed,
          reporter_anonymous: values.reporter_anonymous,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message =
          typeof errorBody?.error === "string"
            ? errorBody.error
            : errorBody?.error?.message ?? "Unable to submit issue";
        throw new Error(message);
      }

      setSubmitSuccess(true);
      form.reset(createDefaultValues());
      router.refresh();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to submit issue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedUrgencyLabel = URGENCY_OPTIONS.find(option => option.value === form.watch("urgency"))?.label;

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <section className="rounded-3xl border border-soltas-line bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-soltas-text">Issue details</h2>
          <p className="mt-1 text-sm text-soltas-muted">Describe the issue and who it impacts.</p>

          <div className="mt-6 space-y-6">
            <FormField
              control={control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Issue title</FormLabel>
                  <FormControl>
                    <Input placeholder="Short headline" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Issue summary / description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe what is happening and why it matters." rows={6} {...field} />
                  </FormControl>
                  <FormDescription>
                    Include scope, scale, and any immediate risks. This summary will appear publicly once approved.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input placeholder="Country" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region</FormLabel>
                    <FormControl>
                      <Input placeholder="Region / State" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="City" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-3">
              <FormLabel>Location search</FormLabel>
              <MapGeocoder onSelect={handleLocationSelect} />
              {selectedPlace ? (
                <p className="text-xs text-soltas-muted">Selected: {selectedPlace}</p>
              ) : (
                <p className="text-xs text-soltas-muted">Search for a place to auto-fill latitude/longitude.</p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={control}
                name="latitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        value={Number.isFinite(field.value) ? field.value : ""}
                        onChange={event => {
                          const next = event.target.value;
                          field.onChange(next === "" ? Number.NaN : Number(next));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="longitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        value={Number.isFinite(field.value) ? field.value : ""}
                        onChange={event => {
                          const next = event.target.value;
                          field.onChange(next === "" ? Number.NaN : Number(next));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={control}
                name="affected_demographics"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Affected demographics</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={demographicOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select demographics"
                        emptyMessage="No demographics found"
                        ariaLabel="Affected demographics"
                      />
                    </FormControl>
                    <FormDescription>Choose all groups directly affected by this issue.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="affected_groups_text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Affected groups (optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g. farmers, coastal residents" rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-soltas-line bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-soltas-text">Issue tags</h2>
          <p className="mt-1 text-sm text-soltas-muted">Tag the issue by topic, urgency, and date observed.</p>

          <div className="mt-6 space-y-6">
            <FormField
              control={control}
              name="sdgs"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>UN Sustainable Development Goals</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={sdgOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select SDGs"
                      emptyMessage="No SDGs loaded"
                      ariaLabel="SDG tags"
                    />
                  </FormControl>
                  <FormMessage />
                  {sdgOptions.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-soltas-muted">{renderSdgBadges}</div>
                  ) : null}
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="global_challenges"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IFRC Five Global Challenges</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={challengeOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select IFRC challenges"
                      emptyMessage="No challenges loaded"
                      ariaLabel="IFRC challenges"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={control}
                name="urgency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Urgency / severity</FormLabel>
                    <Select
                      value={String(field.value)}
                      onValueChange={value => field.onChange(Number(value))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select urgency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent align="start">
                        {URGENCY_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={String(option.value)}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>{selectedUrgencyLabel ?? "Choose a severity rating"}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="date_observed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date observed</FormLabel>
                    <FormControl>
                      <Input type="date" value={field.value ?? ""} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-soltas-line bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-soltas-text">Evidence & desired outcome</h2>
          <p className="mt-1 text-sm text-soltas-muted">Share sources and what support is needed.</p>

          <div className="mt-6 space-y-6">
            <div className="space-y-3">
              <FormLabel>Evidence links</FormLabel>
              {fields.length === 0 ? (
                <p className="text-sm text-soltas-muted">Add links to articles, photos, or reports that document the issue.</p>
              ) : null}

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-start gap-3">
                    <FormField
                      control={control}
                      name={`evidence_links.${index}.url`}
                      render={({ field: urlField }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input placeholder="https://" {...urlField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} aria-label="Remove link">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => append({ url: "" })}
                className="inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add link
              </Button>

              <p className="text-xs text-soltas-muted">Uploads are not supported yet—use links to share evidence.</p>
            </div>

            <FormField
              control={control}
              name="desired_outcome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Desired outcome / help needed (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What change, assistance, or resources are needed?"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        <section className="rounded-3xl border border-soltas-line bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-soltas-text">Contact preferences</h2>
          <p className="mt-1 text-sm text-soltas-muted">Control how the Solarpunk Taskforce may follow up.</p>

          <div className="mt-6 space-y-6">
            <FormField
              control={control}
              name="reporter_anonymous"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4 rounded-2xl border border-soltas-line p-4">
                  <div>
                    <FormLabel>Report anonymously</FormLabel>
                    <FormDescription>
                      Hide your identity on public listings. Admins can still see submission metadata.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="contact_allowed"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4 rounded-2xl border border-soltas-line p-4">
                  <div>
                    <FormLabel>Can SolTas contact you?</FormLabel>
                    <FormDescription>
                      Allow the Watchdog team to reach out for clarifications or coordination.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </section>

        {submitError ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {submitError}
          </div>
        ) : null}

        {submitSuccess ? (
          <div className="rounded-3xl border border-soltas-glacial/30 bg-soltas-glacial/15 px-4 py-3 text-sm text-soltas-ocean">
            Issue submitted. Our team will review it before publishing it to the Watchdog Community map.
          </div>
        ) : null}

        <div className="sticky bottom-4 z-10 rounded-3xl border border-soltas-line bg-white p-4 shadow-lg sm:static sm:border-none sm:bg-transparent sm:p-0 sm:shadow-none">
          <Button type="submit" disabled={isSubmitting} className="inline-flex w-full items-center justify-center gap-2">
            {isSubmitting && <Loader2 className="h-5 w-5 animate-spin" />}
            {isSubmitting ? "Submitting" : "Submit issue"}
          </Button>
          <p className="mt-2 text-center text-xs text-soltas-muted">
            Your report is private until reviewed. Approved issues appear on the public Watchdog map and table.
          </p>
          {Object.keys(errors).length > 0 ? (
            <p className="mt-2 text-center text-xs text-rose-500">Please fix the highlighted fields.</p>
          ) : null}
        </div>
      </form>
    </Form>
  );
}

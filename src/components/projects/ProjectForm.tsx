"use client";

import { forwardRef, useCallback, useEffect, useMemo, useState, type HTMLAttributes } from "react";
import { format } from "date-fns";
import { Link as LinkIcon, Loader2, MapPin, Plus, Trash2, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, type Resolver } from "react-hook-form";
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
import { cn } from "@/lib/utils";

const locationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  place_name: z.string().trim().min(1, "Location is required"),
});

const CATEGORY_OPTIONS = [
  {
    value: "humanitarian",
    label: "Humanitarian",
    description: "Emergency response, disaster relief, community health, or social support.",
  },
  {
    value: "environmental",
    label: "Environmental",
    description: "Climate adaptation, conservation, renewable energy, or ecological stewardship.",
  },
] as const;

const linkSchema = z.object({
  url: z.string().trim().min(1, "Link URL is required").url("Enter a valid URL"),
  label: z
    .string()
    .trim()
    .max(120, "Labels should be under 120 characters")
    .optional()
    .or(z.literal(""))
    .transform(v => (v ? v.trim() : undefined)),
});

const formSchema = z
  .object({
    owner_type: z.enum(["user", "organisation"] as const, { message: "Select an owner" }),
    owner_id: z.string().uuid({ message: "Owner id must be a UUID" }),
    category: z.enum(["humanitarian", "environmental"] as const, { message: "Select a category" }),
    name: z.string().trim().min(1, "Please enter a project name"),
    description: z
      .string()
      .trim()
      .max(4000, "Keep descriptions under 4000 characters")
      .optional()
      .or(z.literal(""))
      .transform(v => (v && v.trim().length ? v.trim() : undefined)),
    lead_org_id: z
      .string()
      .uuid({ message: "Organisation id must be a UUID" })
      .optional()
      .or(z.literal(""))
      .transform(v => (v ? v : undefined)),
    links: z.array(linkSchema).default([]),
    partner_org_ids: z.array(z.string().uuid()).default([]),
    sdg_ids: z.array(z.number().int()).default([]),
    ifrc_ids: z.array(z.number().int()).default([]),
    type_of_intervention: z.array(z.string().min(1)).default([]),
    thematic_area: z.array(z.string().min(1)).default([]),
    target_demographic: z
      .string()
      .trim()
      .max(255, "Target demographic should be concise")
      .optional()
      .or(z.literal(""))
      .transform(v => (v && v.trim().length ? v.trim() : undefined)),
    lives_improved: z.number().int("Enter a whole number").nonnegative("Cannot be negative").optional(),
    start_date: z.date().optional(),
    end_date: z.date().optional(),
    donations_received: z.number().nonnegative("Cannot be negative").optional(),
    amount_needed: z.number().nonnegative("Cannot be negative").optional(),
    currency: z
      .string()
      .trim()
      .length(3, "Use a three-letter currency code")
      .optional()
      .or(z.literal(""))
      .transform(v => (v ? v.toUpperCase() : undefined)),
    location: locationSchema.nullable(),
    post_to_feed: z.boolean().default(false),
    feed_message: z
      .string()
      .trim()
      .max(500, "Keep feed message under 500 characters")
      .optional()
      .or(z.literal(""))
      .transform(v => (v && v.trim().length ? v.trim() : undefined)),
  })
  .superRefine((values, ctx) => {
    const hasDescription = Boolean(values.description && values.description.trim().length);
    const meaningfulLinks = values.links.filter(link => link.url.trim().length > 0);
    if (!hasDescription && meaningfulLinks.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["description"],
        message: "Add a description or at least one supporting link",
      });
    }
    if (!values.location) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["location"],
        message: "Select a location",
      });
    }
    if (values.start_date && values.end_date && values.start_date > values.end_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["end_date"],
        message: "End date must be after start date",
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;

type UploadState = {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "complete" | "error";
  error?: string;
};

const createDefaultValues = (userId?: string): Partial<FormValues> => ({
  owner_type: "user" as const,
  owner_id: userId ?? "",
  category: undefined,
  name: "",
  description: undefined,
  lead_org_id: undefined,
  links: [],
  partner_org_ids: [],
  sdg_ids: [],
  ifrc_ids: [],
  type_of_intervention: [],
  thematic_area: [],
  target_demographic: undefined,
  lives_improved: undefined,
  start_date: undefined,
  end_date: undefined,
  donations_received: undefined,
  amount_needed: undefined,
  currency: "USD",
  location: null,
  post_to_feed: false,
  feed_message: undefined,
});

type DateParts = {
  day?: number;
  month?: number;
  year?: number;
};

const DAY_OPTIONS = Array.from({ length: 31 }, (_, index) => {
  const day = index + 1;
  return {
    value: String(day),
    label: day.toString().padStart(2, "0"),
  };
});

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => {
  const monthNumber = index + 1;
  return {
    value: String(monthNumber),
    label: `${monthNumber.toString().padStart(2, "0")} – ${format(new Date(2000, index, 1), "LLLL")}`,
  };
});

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: (CURRENT_YEAR + 30) - 1950 + 1 }, (_, index) => {
  const year = 1950 + index;
  return {
    value: String(year),
    label: String(year),
  };
});

const CURRENCY_CODES = [
  "USD",
  "EUR",
  "GBP",
  "CHF",
  "AUD",
  "CAD",
  "NZD",
  "JPY",
  "CNY",
  "INR",
  "SEK",
  "NOK",
  "DKK",
  "BRL",
  "MXN",
  "ZAR",
  "KES",
  "NGN",
  "GHS",
  "IDR",
  "SGD",
  "HKD",
  "KRW",
  "TRY",
  "PLN",
  "CZK",
  "HUF",
  "ILS",
  "SAR",
  "AED",
];

const currencyDisplay =
  typeof Intl.DisplayNames === "function" ? new Intl.DisplayNames(["en"], { type: "currency" }) : undefined;

const CURRENCY_OPTIONS = CURRENCY_CODES.map(code => ({
  value: code,
  label: currencyDisplay ? `${code} – ${currencyDisplay.of(code) ?? code}` : code,
}));

const deriveParts = (value?: Date | null): DateParts => {
  if (!value) {
    return { day: undefined, month: undefined, year: undefined };
  }
  return {
    day: value.getDate(),
    month: value.getMonth() + 1,
    year: value.getFullYear(),
  };
};

const clampDayToMonth = (day: number, month: number, year: number) => {
  const daysInMonth = new Date(year, month, 0).getDate();
  return Math.min(day, daysInMonth);
};

const CLEAR_SELECT_VALUE = "__clear__";

type DateDropdownsProps = {
  value?: Date | null;
  onChange: (value: Date | undefined) => void;
  onBlur: () => void;
  minDate?: Date | null;
} & HTMLAttributes<HTMLDivElement>;

const DateDropdowns = forwardRef<HTMLDivElement, DateDropdownsProps>(
  ({ value, onChange, onBlur, minDate, className, ...props }, ref) => {
    const [parts, setParts] = useState<DateParts>(() => deriveParts(value ?? undefined));
    const timestamp = value ? value.getTime() : null;

    useEffect(() => {
      // Use a microtask to avoid synchronous setState in effect
      queueMicrotask(() => setParts(deriveParts(value ?? undefined)));
    }, [timestamp, value]);

    const handlePartChange = useCallback(
      (key: keyof DateParts) => (raw: string) => {
        const nextRaw = raw === CLEAR_SELECT_VALUE ? "" : raw;
        setParts(prev => {
          const nextValue = nextRaw ? Number(nextRaw) : undefined;
          const updated: DateParts = { ...prev, [key]: nextValue };

          if (!updated.day && !updated.month && !updated.year) {
            onChange(undefined);
            return { day: undefined, month: undefined, year: undefined };
          }

          if (updated.day && updated.month && updated.year) {
            const clampedDay = clampDayToMonth(updated.day, updated.month, updated.year);
            const candidate = new Date(updated.year, updated.month - 1, clampedDay);

            if (minDate && candidate < minDate) {
              onChange(minDate);
              return deriveParts(minDate);
            }

            onChange(candidate);
            return { ...updated, day: clampedDay };
          }

          onChange(undefined);
          return updated;
        });
        onBlur();
      },
      [minDate, onBlur, onChange],
    );

    return (
      <div ref={ref} className={cn("flex flex-col gap-3 sm:flex-row", className)} {...props}>
        <Select value={parts.day ? String(parts.day) : undefined} onValueChange={handlePartChange("day")}>
          <SelectTrigger className="sm:w-28">
            <SelectValue placeholder="DD" />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem value={CLEAR_SELECT_VALUE}>Not set</SelectItem>
            {DAY_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={parts.month ? String(parts.month) : undefined} onValueChange={handlePartChange("month")}>
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="MM" />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem value={CLEAR_SELECT_VALUE}>Not set</SelectItem>
            {MONTH_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={parts.year ? String(parts.year) : undefined} onValueChange={handlePartChange("year")}>
          <SelectTrigger className="sm:w-32">
            <SelectValue placeholder="YYYY" />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem value={CLEAR_SELECT_VALUE}>Not set</SelectItem>
            {YEAR_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  },
);

DateDropdowns.displayName = "DateDropdowns";

type ProjectFormProps = {
  mode?: "create" | "edit";
  projectId?: string;
  initialValues?: Partial<FormValues>;
};

export default function ProjectForm({ mode = "create", projectId, initialValues }: ProjectFormProps) {
  const router = useRouter();
  const [orgOptions, setOrgOptions] = useState<Option[]>([]);
  const [creatableOrgOptions, setCreatableOrgOptions] = useState<Option[]>([]);
  const [sdgOptions, setSdgOptions] = useState<Option[]>([]);
  const [ifrcOptions, setIfrcOptions] = useState<Option[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitWarning, setSubmitWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [interventionDraft, setInterventionDraft] = useState("");
  const [thematicDraft, setThematicDraft] = useState("");
  const [showGeocoder, setShowGeocoder] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const defaultValues = useMemo(
    () => ({
      ...createDefaultValues(currentUserId ?? undefined),
      ...(initialValues ?? {}),
    }),
    [initialValues, currentUserId],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues,
    mode: "onBlur",
  });

  const { control, handleSubmit, reset, watch, setValue } = form;
  const linkArray = useFieldArray({ control, name: "links" });

  useEffect(() => {
    let isMounted = true;
    async function loadOptions() {
      const [orgRes, sdgRes, ifrcRes, userRes, creatableOrgsRes] = await Promise.all([
        supabase.from("organisations").select("id, name").order("name"),
        supabase.from("sdgs").select("id, name").order("id"),
        supabase.from("ifrc_challenges").select("id, name").order("name"),
        supabase.auth.getUser(),
        supabase
          .from("organisation_members")
          .select("organisation_id, organisations(id, name)")
          .eq("can_create_projects", true),
      ]);
      if (!isMounted) return;
      if (!orgRes.error && orgRes.data) {
        setOrgOptions(orgRes.data.map(org => ({ value: org.id, label: org.name })));
      }
      if (!sdgRes.error && sdgRes.data) {
        setSdgOptions(sdgRes.data.map(sdg => ({ value: String(sdg.id), label: `${sdg.id}. ${sdg.name}` })));
      }
      if (!ifrcRes.error && ifrcRes.data) {
        setIfrcOptions(ifrcRes.data.map(ch => ({ value: String(ch.id), label: ch.name })));
      }
      if (!userRes.error && userRes.data.user) {
        setCurrentUserId(userRes.data.user.id);
      }
      if (!creatableOrgsRes.error && creatableOrgsRes.data) {
        const orgs = (creatableOrgsRes.data ?? [])
          .flatMap(om => om.organisations ?? [])
          .map(org => ({ value: org.id, label: org.name }));
        setCreatableOrgOptions(orgs);
      }
    }
    loadOptions();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (initialValues) {
      reset({
        ...createDefaultValues(currentUserId ?? undefined),
        ...initialValues,
      } as FormValues);
    }
  }, [initialValues, reset, currentUserId]);

  const selectedInterventions = watch("type_of_intervention");
  const selectedThemes = watch("thematic_area");
  const startDate = watch("start_date");
  const partnerOptions = useMemo(() => orgOptions, [orgOptions]);

  const addIntervention = useCallback(() => {
    const trimmed = interventionDraft.trim();
    if (!trimmed || selectedInterventions.includes(trimmed)) return;
    const next = [...selectedInterventions, trimmed];
    setValue("type_of_intervention", next, { shouldDirty: true, shouldValidate: true });
    setInterventionDraft("");
  }, [interventionDraft, selectedInterventions, setValue]);

  const removeIntervention = useCallback(
    (tag: string) => {
      const next = selectedInterventions.filter(item => item !== tag);
      setValue("type_of_intervention", next, { shouldDirty: true, shouldValidate: true });
    },
    [selectedInterventions, setValue],
  );

  const addTheme = useCallback(() => {
    const trimmed = thematicDraft.trim();
    if (!trimmed || selectedThemes.includes(trimmed)) return;
    const next = [...selectedThemes, trimmed];
    setValue("thematic_area", next, { shouldDirty: true, shouldValidate: true });
    setThematicDraft("");
  }, [selectedThemes, setValue, thematicDraft]);

  const removeTheme = useCallback(
    (tag: string) => {
      const next = selectedThemes.filter(item => item !== tag);
      setValue("thematic_area", next, { shouldDirty: true, shouldValidate: true });
    },
    [selectedThemes, setValue],
  );

  const handleFileSelection = (fileList: FileList | null) => {
    setFiles(fileList ? Array.from(fileList) : []);
    setUploads([]);
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
    setSubmitWarning(null);
    setIsSubmitting(true);
    try {
      if (!values.location) throw new Error("Please pick a location using the search field");

      const linkPayload = values.links
        .filter(link => link.url.trim().length > 0)
        .map(link => ({ url: link.url.trim(), label: link.label }));

      const isEditMode = mode === "edit" && Boolean(projectId);
      const endpoint = isEditMode ? `/api/projects/${projectId}/update` : "/api/projects/submit";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_type: values.owner_type,
          owner_id: values.owner_id,
          category: values.category,
          name: values.name,
          description: values.description,
          lead_org_id: values.lead_org_id,
          links: linkPayload,
          partner_org_ids: values.partner_org_ids,
          sdg_ids: values.sdg_ids,
          ifrc_ids: values.ifrc_ids,
          type_of_intervention: values.type_of_intervention,
          thematic_area: values.thematic_area,
          target_demographic: values.target_demographic,
          lives_improved: values.lives_improved,
          start_date: values.start_date ? format(values.start_date, "yyyy-MM-dd") : undefined,
          end_date: values.end_date ? format(values.end_date, "yyyy-MM-dd") : undefined,
          donations_received: values.donations_received,
          amount_needed: values.amount_needed,
          currency: values.currency ?? "USD",
          location: values.location,
          post_to_feed: values.post_to_feed,
          feed_message: values.feed_message,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message =
          typeof errorBody?.error === "string"
            ? errorBody.error
            : errorBody?.error?.message ?? "Unable to submit project";
        throw new Error(message);
      }

      const returned = (await response.json()) as { id: string; status?: string; slug?: string; warning?: string };
      const { id, warning } = returned;

      if (warning) {
        setSubmitWarning(warning);
      }

      if (files.length) {
        const initialUploads: UploadState[] = files.map(file => ({
          fileName: file.name,
          progress: 0,
          status: "pending",
        }));
        setUploads(initialUploads);

        let uploadFailed = false;

        for (let index = 0; index < files.length; index += 1) {
          const file = files[index];
          const extension = file.name.split(".").pop() ?? "bin";
          const path = `${id}/${crypto.randomUUID()}.${extension}`;

          setUploads(curr => curr.map((e, i) => (i === index ? { ...e, status: "uploading", progress: 10 } : e)));

          const { error: uploadError } = await supabase.storage
            .from("project-media")
            .upload(path, file, { contentType: file.type || undefined, upsert: false });

          if (uploadError) {
            uploadFailed = true;
            setUploads(curr =>
              curr.map((e, i) => (i === index ? { ...e, status: "error", error: uploadError.message } : e)),
            );
            continue;
          }

          const { error: recordError } = await supabase
            .from("project_media")
            .insert({ project_id: id, path, mime_type: file.type || undefined, caption: file.name });

          if (recordError) {
            uploadFailed = true;
            setUploads(curr =>
              curr.map((e, i) => (i === index ? { ...e, status: "error", error: recordError.message } : e)),
            );
          } else {
            setUploads(curr => curr.map((e, i) => (i === index ? { ...e, status: "complete", progress: 100 } : e)));
          }
        }

        if (uploadFailed) {
          setSubmitError("Some media files could not be uploaded. Please review the errors below and try again.");
          setIsSubmitting(false);
          return;
        }
      }

      reset(createDefaultValues(currentUserId ?? undefined));
      setFiles([]);
      setUploads([]);
      setInterventionDraft("");
      setThematicDraft("");
      if (isEditMode) {
        router.push(`/projects/${returned.slug ?? returned.id}`);
      } else {
        router.push("/projects/new/confirmation");
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <section className="rounded-2xl border border-soltas-line bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-soltas-text">Project overview</h2>
              <p className="mt-1 text-sm text-soltas-muted">Tell us the basics so our reviewers understand what you are proposing.</p>
            </div>
          </div>

          <div className="mt-6 space-y-6">
            <FormField
              control={control}
              name="owner_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project owner</FormLabel>
                  <FormDescription>Choose who will own this project.</FormDescription>
                  <div className="space-y-3">
                    <Button
                      key="user"
                      type="button"
                      variant={field.value === "user" ? "default" : "outline"}
                      className={cn(
                        "flex h-full w-full flex-col items-start gap-1 rounded-2xl border px-4 py-3 text-left transition",
                        field.value === "user" ? "border-soltas-ocean bg-soltas-glacial/15 text-soltas-ocean" : "bg-white",
                      )}
                      onClick={() => {
                        field.onChange("user");
                        setValue("owner_id", currentUserId ?? "");
                      }}
                    >
                      <span className="font-semibold">Create as me</span>
                      <span className="text-sm text-soltas-muted">You will own and manage this project.</span>
                    </Button>

                    {creatableOrgOptions.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-soltas-text">Or create as organisation:</p>
                        {creatableOrgOptions.map(org => (
                          <Button
                            key={org.value}
                            type="button"
                            variant={field.value === "organisation" && watch("owner_id") === org.value ? "default" : "outline"}
                            className={cn(
                              "flex h-full w-full flex-col items-start gap-1 rounded-2xl border px-4 py-3 text-left transition",
                              field.value === "organisation" && watch("owner_id") === org.value
                                ? "border-soltas-ocean bg-soltas-glacial/15 text-soltas-ocean"
                                : "bg-white",
                            )}
                            onClick={() => {
                              field.onChange("organisation");
                              setValue("owner_id", org.value);
                            }}
                          >
                            <span className="font-semibold">{org.label}</span>
                            <span className="text-sm text-soltas-muted">The project will be owned by this organisation.</span>
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project category</FormLabel>
                  <FormDescription>Select the primary focus of this project.</FormDescription>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {CATEGORY_OPTIONS.map(option => {
                      const isSelected = field.value === option.value;
                      return (
                        <Button
                          key={option.value}
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          className={cn(
                            "flex h-full flex-col items-start gap-1 rounded-2xl border px-4 py-3 text-left transition",
                            isSelected ? "border-soltas-ocean bg-soltas-glacial/15 text-soltas-ocean" : "bg-white",
                          )}
                          onClick={() => field.onChange(option.value)}
                        >
                          <span className="font-semibold">{option.label}</span>
                          <span className="text-sm text-soltas-muted">{option.description}</span>
                        </Button>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project name</FormLabel>
                  <FormControl>
                    <Input autoComplete="off" placeholder="Give the project a clear name" {...field} />
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
                  <FormLabel>Description</FormLabel>
                  <FormDescription>
                    Share the story, goals, and current progress of this project. Include details that help reviewers understand impact.
                  </FormDescription>
                  <FormControl>
                    <Textarea rows={5} placeholder="Tell the story of this project" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="lead_org_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lead organisation</FormLabel>
                  <FormDescription>Select the organisation primarily responsible for the project.</FormDescription>
                  <Select
                    onValueChange={val => field.onChange(val === "__none__" ? undefined : val)}
                    value={field.value ?? undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an organisation" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent align="start">
                      <SelectItem value="__none__">No lead organisation</SelectItem>
                      {orgOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-medium text-soltas-text">Supporting links</h3>
                  <p className="text-sm text-soltas-muted">Include press, documentation, or public updates that help validate the project.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => linkArray.append({ url: "", label: undefined })}>
                  <Plus className="mr-1 h-4 w-4" /> Add link
                </Button>
              </div>

              {linkArray.fields.length === 0 && (
                <p className="rounded-2xl border border-dashed border-soltas-line px-4 py-3 text-sm text-soltas-muted">No links added yet.</p>
              )}

              <div className="space-y-3">
                {linkArray.fields.map((fieldItem, index) => (
                  <div
                    key={fieldItem.id}
                    className="grid gap-3 rounded-2xl border border-soltas-line p-4 sm:grid-cols-[1fr_1fr_auto]"
                  >
                    <FormField
                      control={control}
                      name={`links.${index}.url` as const}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-sm font-medium text-soltas-text">
                            <LinkIcon className="h-4 w-4 text-soltas-muted" /> URL
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="https://example.org" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name={`links.${index}.label` as const}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-soltas-text">Label (optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Document title" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex items-end justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => linkArray.remove(index)}
                        className="text-rose-600 hover:text-rose-700"
                      >
                        <Trash2 className="mr-1 h-4 w-4" /> Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <FormField
              control={control}
              name="partner_org_ids"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Partner organisations</FormLabel>
                  <FormDescription>Select organisations collaborating on delivery.</FormDescription>
                  <FormControl>
                    <MultiSelect
                      options={partnerOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Search organisations..."
                      ariaLabel="Partner organisations"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="sdg_ids"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sustainable Development Goals</FormLabel>
                  <FormDescription>Highlight the SDGs advanced by this project.</FormDescription>
                  <FormControl>
                    <MultiSelect
                      options={sdgOptions}
                      value={field.value.map(String)}
                      onChange={sel => field.onChange(sel.map(Number))}
                      placeholder="Search SDGs..."
                      ariaLabel="Sustainable Development Goals"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="ifrc_ids"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IFRC Global Challenges</FormLabel>
                  <FormDescription>Select the challenges your project responds to.</FormDescription>
                  <FormControl>
                    <MultiSelect
                      options={ifrcOptions}
                      value={field.value.map(String)}
                      onChange={sel => field.onChange(sel.map(Number))}
                      placeholder="Search challenges..."
                      ariaLabel="IFRC Global Challenges"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-soltas-line bg-white p-6">
          <h2 className="text-xl font-semibold text-soltas-text">Location & beneficiaries</h2>
          <p className="mt-1 text-sm text-soltas-muted">Find the place where the project has the greatest impact.</p>

          <div className="mt-6 space-y-6">
            <FormField
              control={control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Search for a location</FormLabel>
                  <FormDescription>Use the map search to pin the primary impact location.</FormDescription>
                  <div className="mt-2 space-y-3 rounded-2xl border border-soltas-line p-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowGeocoder(previous => !previous)}
                    >
                      {field.value ? "Change location" : "Add location"}
                    </Button>
                    {showGeocoder ? (
                      <MapGeocoder
                        onSelect={value => {
                          field.onChange(value);
                          setShowGeocoder(false);
                        }}
                      />
                    ) : null}
                    {field.value ? (
                      <Badge variant="ocean" className="inline-flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4" /> {field.value.place_name}
                      </Badge>
                    ) : (
                      <p className="text-sm text-soltas-muted">No location selected yet.</p>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="target_demographic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target demographic</FormLabel>
                  <FormDescription>Who is the project designed to support?</FormDescription>
                  <FormControl>
                    <Input placeholder="e.g. Youth in coastal communities" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="lives_improved"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated lives improved</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      placeholder="If unknown, leave blank"
                      value={field.value ?? ""}
                      onChange={e => {
                        const next = e.target.value;
                        field.onChange(next === "" ? undefined : Number(next));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-medium text-soltas-text">Type of intervention</h3>
                  <p className="text-sm text-soltas-muted">Add tags that describe the intervention (e.g. Urban farming, Cooling, Renewable energy).</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedInterventions.length === 0 && (
                  <Badge variant="outline" className="text-soltas-muted">
                    No tags added
                  </Badge>
                )}
                {selectedInterventions.map(tag => (
                  <Badge key={tag} variant="ocean" className="flex items-center gap-2">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeIntervention(tag)}
                      className="rounded-full p-0.5 hover:bg-soltas-glacial/30"
                      aria-label={`Remove ${tag}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  value={interventionDraft}
                  onChange={e => setInterventionDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addIntervention();
                    }
                  }}
                  placeholder="Add a new intervention"
                />
                <Button type="button" onClick={addIntervention} className="whitespace-nowrap">
                  <Plus className="mr-1 h-4 w-4" /> Add tag
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-medium text-soltas-text">Thematic areas</h3>
                  <p className="text-sm text-soltas-muted">Capture themes that describe the work (e.g. Climate adaptation).</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedThemes.length === 0 && (
                  <Badge variant="outline" className="text-soltas-muted">
                    No thematic areas added
                  </Badge>
                )}
                {selectedThemes.map(tag => (
                  <Badge key={tag} variant="ocean" className="flex items-center gap-2">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTheme(tag)}
                      className="rounded-full p-0.5 hover:bg-soltas-glacial/30"
                      aria-label={`Remove ${tag}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  value={thematicDraft}
                  onChange={e => setThematicDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTheme();
                    }
                  }}
                  placeholder="Add a thematic area"
                />
                <Button type="button" onClick={addTheme} className="whitespace-nowrap">
                  <Plus className="mr-1 h-4 w-4" /> Add tag
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-soltas-line bg-white p-6">
          <h2 className="text-xl font-semibold text-soltas-text">Timeline & funding</h2>
          <p className="mt-1 text-sm text-soltas-muted">Share when the project runs and what support is still required.</p>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <FormField
              control={control}
              name="start_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start date</FormLabel>
                  <FormControl>
                    <DateDropdowns value={field.value ?? null} onChange={field.onChange} onBlur={field.onBlur} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="end_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End date</FormLabel>
                  <FormControl>
                    <DateDropdowns
                      value={field.value ?? null}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      minDate={startDate ?? null}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="donations_received"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Donations received</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      value={field.value ?? ""}
                      onChange={e => {
                        const next = e.target.value;
                        field.onChange(next === "" ? undefined : Number(next));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="amount_needed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Funding still needed</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      value={field.value ?? ""}
                      onChange={e => {
                        const next = e.target.value;
                        field.onChange(next === "" ? undefined : Number(next));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select
                    value={field.value ?? undefined}
                    onValueChange={val => field.onChange(val === "__none__" ? undefined : val)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a currency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent align="start">
                      <SelectItem value="__none__">No currency selected</SelectItem>
                      {CURRENCY_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-soltas-line bg-white p-6">
          <h2 className="text-xl font-semibold text-soltas-text">Project media</h2>
          <p className="mt-1 text-sm text-soltas-muted">Upload images, video, or documents after submitting the form.</p>

          <div className="mt-4 space-y-4">
            <label
              htmlFor="project-media"
              className="flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-soltas-line bg-soltas-off-white px-6 py-8 text-center text-soltas-muted transition hover:border-soltas-ocean/30 hover:bg-soltas-glacial/15"
            >
              <UploadCloud className="h-6 w-6" />
              <span className="text-sm font-semibold">Click to select files</span>
              <span className="text-xs text-soltas-muted">Images, video, and documents are welcome. 100MB max per file.</span>
              <input
                id="project-media"
                type="file"
                accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.txt"
                multiple
                className="hidden"
                onChange={e => handleFileSelection(e.target.files)}
              />
            </label>

            {files.length > 0 && (
              <ul className="space-y-2 text-sm text-soltas-muted">
                {files.map(file => (
                  <li key={file.name} className="rounded-2xl border border-soltas-line bg-white px-4 py-2">
                    {file.name}
                  </li>
                ))}
              </ul>
            )}

            {uploads.length > 0 && (
              <ul className="space-y-3">
                {uploads.map(upload => (
                  <li
                    key={`${upload.fileName}-${upload.status}`}
                    className="rounded-2xl border border-soltas-line bg-white p-4 text-sm text-soltas-text"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{upload.fileName}</span>
                      <span className="text-xs font-medium text-soltas-muted">{upload.status}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-soltas-light">
                      <div
                        className={cn("h-2 rounded-full", upload.status === "error" ? "bg-rose-400" : "bg-soltas-green")}
                        style={{ width: `${upload.progress}%` }}
                      />
                    </div>
                    {upload.error && <p className="mt-2 text-xs text-rose-600">{upload.error}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-soltas-line bg-white p-6">
          <h2 className="text-xl font-semibold text-soltas-text">Share to feed</h2>
          <p className="mt-1 text-sm text-soltas-muted">Optionally announce this project to the community feed.</p>

          <div className="mt-6 space-y-6">
            <FormField
              control={control}
              name="post_to_feed"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4 rounded-2xl border border-soltas-line p-4">
                  <div>
                    <FormLabel>Post this to the feed</FormLabel>
                    <FormDescription>Create a feed post announcing this new project.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {watch("post_to_feed") && (
              <FormField
                control={control}
                name="feed_message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message (optional)</FormLabel>
                    <FormDescription>
                      Add a custom message or context. If left empty, a default message will be used.
                    </FormDescription>
                    <FormControl>
                      <Textarea rows={3} placeholder="Share additional context about this project..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        </section>

        {submitWarning && <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{submitWarning}</div>}

        {submitError && <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{submitError}</div>}

        <div className="sticky bottom-4 z-10 rounded-2xl border border-soltas-line bg-white p-4 shadow-lg sm:static sm:border-none sm:bg-transparent sm:p-0 sm:shadow-none">
          <Button type="submit" disabled={isSubmitting} className="inline-flex w-full items-center justify-center gap-2">
            {isSubmitting && <Loader2 className="h-5 w-5 animate-spin" />}
            {isSubmitting ? (mode === "edit" ? "Saving" : "Submitting") : mode === "edit" ? "Save changes" : "Submit project"}
          </Button>
          <p className="mt-2 text-center text-xs text-soltas-muted">
            Submission goes to the Solarpunk Taskforce team for review. You can add more media after approval.
          </p>
        </div>
      </form>
    </Form>
  );
}

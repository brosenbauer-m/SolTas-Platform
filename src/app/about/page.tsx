import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import SiteFooter from "@/components/SiteFooter";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About | Solarpunk Taskforce",
  description:
    "What Solarpunk Taskforce is, why it exists, and how the platform connects people, projects, and organisations to improve global impact.",
};

const PROBLEMS = [
  {
    title: "Fragmented efforts",
    text: "Without a shared overview, organisations overlap on the same issues while other needs go unseen.",
  },
  {
    title: "Disconnected teams",
    text: "Organisations working towards the same goals rarely find each other, and small teams struggle to find support.",
  },
  {
    title: "Low public trust",
    text: "Little transparency about where support goes leaves the public unsure whom to trust.",
  },
  {
    title: "No central place",
    text: "Information about global efforts is scattered, outdated or internal, so few people grasp the scale of the work.",
  },
  {
    title: "Unheard local voices",
    text: "Local issues often lack a platform, and the people living them rarely reach those with the resources to help.",
  },
  {
    title: "Only crisis stories",
    text: "The sector is mostly shown through disasters. Creative, hopeful storytelling about what people achieve is missing.",
  },
];

const VISION = [
  "Organisations have a complete, real-time overview of global humanitarian and environmental work, so they can cooperate and reuse what works.",
  "Everyone can see where support goes, follow the work they care about, and bring attention to overlooked issues.",
  "Creative, factual storytelling restores trust in humanitarian work and deepens our understanding of humanity.",
];

const SECTIONS = [
  { href: "/projects", title: "Find projects", text: "An interactive globe and table of projects, filterable by place, theme and need." },
  { href: "/find-organisations", title: "Find organisations", text: "Verified organisations, their projects, partners and impact." },
  { href: "/funding", title: "Find funding", text: "Open and upcoming grants for humanitarian and environmental action." },
  { href: "/watchdog", title: "Watchdog network", text: "Issues raised by local advocates, connected to those who can act." },
  { href: "/feed", title: "Feed", text: "Updates, stories and media from projects and organisations." },
  { href: "/services", title: "Services", text: "Comparative intelligence and storytelling for registered organisations." },
];

export default function AboutPage() {
  return (
    <main className="flex flex-col">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        {/* Hero */}
        <section className="py-20 sm:py-28">
          <p className="text-sm font-medium text-soltas-ocean">About Solarpunk Taskforce</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-soltas-text sm:text-6xl">
            Bridging action and awareness.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-soltas-muted">
            Solarpunk Taskforce connects people, projects and organisations across the humanitarian and
            environmental movement. A transparent, living map of global efforts, paired with honest
            storytelling, so the world can see what is being done, and help where it matters most.
          </p>
        </section>

        {/* Problems */}
        <section aria-labelledby="why-heading" className="pb-20 sm:pb-28">
          <h2 id="why-heading" className="text-3xl font-semibold tracking-tight text-soltas-text sm:text-4xl">
            Why it matters
          </h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-soltas-muted">
            Collaboration is at the heart of the impact sector, yet the tools to collaborate are missing.
          </p>
          <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {PROBLEMS.map((p, i) => (
              <div key={p.title} className="border-t border-soltas-line pt-5">
                <p className="text-sm font-medium text-soltas-muted">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-2 text-lg font-semibold text-soltas-text">{p.title}</h3>
                <p className="mt-2 text-[15px] leading-6 text-soltas-muted">{p.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Vision */}
        <section aria-labelledby="vision-heading" className="pb-20 sm:pb-28">
          <div className="rounded-3xl bg-white px-7 py-12 sm:px-12 sm:py-16">
            <h2 id="vision-heading" className="text-sm font-medium text-soltas-ocean">
              Our vision
            </h2>
            <ul className="mt-6 space-y-8">
              {VISION.map((v) => (
                <li key={v} className="text-2xl font-semibold leading-snug tracking-tight text-soltas-text sm:text-3xl">
                  {v}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Mission */}
        <section aria-labelledby="mission-heading" className="grid gap-4 pb-20 sm:pb-28 md:grid-cols-2">
          <h2 id="mission-heading" className="sr-only">
            Our mission
          </h2>
          <div className="card p-7 sm:p-8">
            <p className="text-sm font-medium text-soltas-ocean">Mission for organisations</p>
            <p className="mt-3 text-[15px] leading-7 text-soltas-text">
              A transparent global platform and living database that tracks humanitarian and environmental
              efforts, enabling efficient cooperation, reducing duplicated work and improving how initiatives
              communicate and deliver.
            </p>
          </div>
          <div className="card p-7 sm:p-8">
            <p className="text-sm font-medium text-soltas-ocean">Mission for everyone</p>
            <p className="mt-3 text-[15px] leading-7 text-soltas-text">
              Creative, neutral and transparent content on global issues that helps people understand, trust
              and meaningfully take part in humanitarian and environmental work.
            </p>
          </div>
        </section>

        {/* Platform */}
        <section aria-labelledby="platform-heading" className="pb-20 sm:pb-28">
          <h2 id="platform-heading" className="text-3xl font-semibold tracking-tight text-soltas-text sm:text-4xl">
            What you can do here
          </h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {SECTIONS.map((s) => (
              <Link key={s.href} href={s.href} className="group card flex items-start justify-between gap-4 p-6 hover:shadow-md">
                <div>
                  <h3 className="text-lg font-semibold text-soltas-text">{s.title}</h3>
                  <p className="mt-1 text-[15px] leading-6 text-soltas-muted">{s.text}</p>
                </div>
                <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-soltas-ocean transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mb-20 text-center sm:mb-28">
          <h2 className="text-3xl font-semibold tracking-tight text-soltas-text sm:text-4xl">Join the taskforce.</h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-7 text-soltas-muted">
            Create a free account to follow projects, register your organisation or raise an issue in your area.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className={buttonClasses({ size: "lg" })}>
              Create an account
            </Link>
            <Link href="/projects" className={buttonClasses({ variant: "outline", size: "lg" })}>
              Explore projects
            </Link>
          </div>
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}

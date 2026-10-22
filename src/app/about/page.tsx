import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, Check, Megaphone } from "lucide-react";

import SiteFooter from "@/components/SiteFooter";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About | Solarpunk Taskforce",
  description:
    "Who we are and what we do: a living map of humanitarian and environmental work, plus intelligence and storytelling services for the people doing it.",
};

const CONTACT_EMAIL = "contact@solarpunktaskforce.org";
const CONSULTATION_HREF = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Consultation request")}`;

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

const PLATFORM = [
  { href: "/projects", title: "Projects", text: "An interactive globe and table of projects, filterable by place, theme and need." },
  { href: "/find-organisations", title: "Organisations", text: "Verified organisations, their projects, partners and impact." },
  { href: "/funding", title: "Funding", text: "Open and upcoming grants for humanitarian and environmental action." },
  { href: "/issues", title: "Issues", text: "Problems raised by local people, connected to those who can act." },
  { href: "/feed", title: "Feed", text: "Updates, stories and media from projects and organisations." },
];

const SERVICES = [
  {
    icon: BarChart3,
    title: "Comparative intelligence",
    text: "Data-driven insight into your field: who else works on your issue, what has worked elsewhere, and where the gaps and funding opportunities are.",
    features: [
      "Benchmarking against similar projects",
      "Potential partners and collaborations",
      "Proven solutions from related initiatives",
      "Gap analysis: underserved areas and funding",
      "Recommendations for resource allocation",
    ],
  },
  {
    icon: Megaphone,
    title: "Storytelling and marketing",
    text: "Modern, honest communication that makes your work visible, builds trust and brings in support, beyond crisis-driven narratives.",
    features: [
      "Project narrative and storytelling",
      "Articles, video, podcasts and visual media",
      "Social media strategy",
      "Donor engagement campaigns",
      "Community and awareness campaigns",
    ],
  },
];

const AUDIENCES = [
  { title: "NGOs and non-profits", text: "Optimise operations and extend your reach." },
  { title: "New projects", text: "Get strategic guidance and visibility from day one." },
  { title: "Funders", text: "Make informed decisions with data on the whole field." },
  { title: "Social enterprises", text: "Understand your market and position your impact." },
];

const STEPS = [
  { title: "Conversation", text: "We talk about your goals, challenges and needs." },
  { title: "Strategy", text: "We build a plan using platform data and sector expertise." },
  { title: "Delivery", text: "We put it into practice with you and support you afterwards." },
];

function SectionTitle({ id, eyebrow, title, intro }: { id: string; eyebrow: string; title: string; intro?: string }) {
  return (
    <div className="max-w-3xl">
      <p className="text-sm font-medium text-soltas-ocean">{eyebrow}</p>
      <h2 id={id} className="mt-2 text-3xl font-semibold tracking-tight text-soltas-text sm:text-4xl">
        {title}
      </h2>
      {intro ? <p className="mt-3 text-[15px] leading-7 text-soltas-muted">{intro}</p> : null}
    </div>
  );
}

export default function AboutPage() {
  return (
    <main className="flex flex-col">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="py-16 sm:py-24">
          <p className="text-sm font-medium text-soltas-ocean">About Solarpunk Taskforce</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-soltas-text sm:text-6xl">
            Bridging action and awareness.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-soltas-muted">
            Solarpunk Taskforce connects people, projects and organisations across the humanitarian and
            environmental movement: a transparent, living map of global efforts, paired with honest storytelling, so
            the world can see what is being done and help where it matters most.
          </p>
          <nav aria-label="On this page" className="mt-8 flex flex-wrap gap-2">
            <a href="#who-we-are" className={buttonClasses({ variant: "outline", size: "sm" })}>
              Who we are
            </a>
            <a href="#what-we-do" className={buttonClasses({ variant: "outline", size: "sm" })}>
              What we do
            </a>
          </nav>
        </section>

        {/* ───────────── Who we are ───────────── */}
        <section id="who-we-are" aria-labelledby="who-heading" className="scroll-mt-24 space-y-16 pb-20 sm:space-y-20 sm:pb-28">
          <SectionTitle id="who-heading" eyebrow="Who we are" title="A taskforce for people and planet." />

          <div aria-labelledby="mission-heading">
            <h3 id="mission-heading" className="text-xl font-semibold text-soltas-text">Our mission</h3>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="card p-7 sm:p-8">
                <p className="text-sm font-medium text-soltas-ocean">For organisations</p>
                <p className="mt-3 text-[15px] leading-7 text-soltas-text">
                  A transparent global platform and living database that tracks humanitarian and environmental
                  efforts, enabling efficient cooperation, reducing duplicated work and improving how initiatives
                  communicate and deliver.
                </p>
              </div>
              <div className="card p-7 sm:p-8">
                <p className="text-sm font-medium text-soltas-ocean">For everyone</p>
                <p className="mt-3 text-[15px] leading-7 text-soltas-text">
                  Creative, neutral and transparent content on global issues that helps people understand, trust and
                  meaningfully take part in humanitarian and environmental work.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white px-7 py-12 sm:px-12 sm:py-16" aria-labelledby="vision-heading">
            <h3 id="vision-heading" className="text-sm font-medium text-soltas-ocean">
              Our vision
            </h3>
            <ul className="mt-6 space-y-8">
              {VISION.map((v) => (
                <li key={v} className="text-2xl font-semibold leading-snug tracking-tight text-soltas-text sm:text-3xl">
                  {v}
                </li>
              ))}
            </ul>
          </div>

          <div aria-labelledby="why-heading">
            <h3 id="why-heading" className="text-xl font-semibold text-soltas-text">Why it matters</h3>
            <p className="mt-2 max-w-2xl text-[15px] leading-7 text-soltas-muted">
              Collaboration is at the heart of the impact sector, yet the tools to collaborate are missing.
            </p>
            <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {PROBLEMS.map((p, i) => (
                <div key={p.title} className="border-t border-soltas-line pt-5">
                  <p className="text-sm font-medium text-soltas-muted">{String(i + 1).padStart(2, "0")}</p>
                  <h4 className="mt-2 text-lg font-semibold text-soltas-text">{p.title}</h4>
                  <p className="mt-2 text-[15px] leading-6 text-soltas-muted">{p.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────── What we do ───────────── */}
        <section id="what-we-do" aria-labelledby="what-heading" className="scroll-mt-24 space-y-16 border-t border-soltas-line pb-20 pt-16 sm:space-y-20 sm:pb-28 sm:pt-20">
          <SectionTitle
            id="what-heading"
            eyebrow="What we do"
            title="A platform for the whole movement, and help for the people in it."
          />

          <div aria-labelledby="platform-heading">
            <h3 id="platform-heading" className="text-xl font-semibold text-soltas-text">The platform</h3>
            <p className="mt-2 max-w-2xl text-[15px] leading-7 text-soltas-muted">
              Free for everyone: explore, follow and contribute to humanitarian and environmental work around the world.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PLATFORM.map((s) => (
                <Link key={s.href} href={s.href} className="group card flex items-start justify-between gap-4 p-6 hover:shadow-md">
                  <div>
                    <h4 className="text-lg font-semibold text-soltas-text">{s.title}</h4>
                    <p className="mt-1 text-[15px] leading-6 text-soltas-muted">{s.text}</p>
                  </div>
                  <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-soltas-ocean transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </div>

          <div id="services" className="scroll-mt-24" aria-labelledby="services-heading">
            <h3 id="services-heading" className="text-xl font-semibold text-soltas-text">Services</h3>
            <p className="mt-2 max-w-2xl text-[15px] leading-7 text-soltas-muted">
              For projects and organisations registered on Solarpunk Taskforce: insight from the whole field, and
              storytelling that shows what you achieve.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {SERVICES.map(({ icon: Icon, title, text, features }) => (
                <div key={title} className="card flex flex-col p-7 sm:p-8">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-soltas-ocean/10 text-soltas-ocean">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h4 className="mt-5 text-2xl font-semibold tracking-tight text-soltas-text">{title}</h4>
                  <p className="mt-2 text-[15px] leading-7 text-soltas-muted">{text}</p>
                  <ul className="mt-6 space-y-3 border-t border-soltas-line pt-6">
                    {features.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-[15px] text-soltas-text">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-soltas-green" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-10 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
              {AUDIENCES.map((a) => (
                <div key={a.title} className="border-t border-soltas-line pt-5">
                  <h4 className="text-lg font-semibold text-soltas-text">{a.title}</h4>
                  <p className="mt-1 text-[15px] leading-6 text-soltas-muted">{a.text}</p>
                </div>
              ))}
            </div>

            <ol className="mt-10 grid gap-4 md:grid-cols-3" aria-label="How it works">
              {STEPS.map((s, i) => (
                <li key={s.title} className="card p-7">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-soltas-ocean text-sm font-semibold text-white">
                    {i + 1}
                  </span>
                  <h4 className="mt-4 text-lg font-semibold text-soltas-text">{s.title}</h4>
                  <p className="mt-1 text-[15px] leading-6 text-soltas-muted">{s.text}</p>
                </li>
              ))}
            </ol>

            <div className="mt-10 rounded-3xl bg-soltas-abyssal px-7 py-12 text-center text-white sm:px-12 sm:py-16">
              <p className="text-3xl font-semibold tracking-tight sm:text-4xl">Let&apos;s talk about your work.</p>
              <p className="mx-auto mt-3 max-w-xl text-[15px] leading-7 text-white/75">
                Services are available to organisations and projects registered on the platform. Registration is free.
              </p>
              <a
                href={CONSULTATION_HREF}
                className={buttonClasses({ size: "lg", className: "mt-8 bg-white text-soltas-abyssal hover:bg-white/90" })}
              >
                Email {CONTACT_EMAIL}
              </a>
            </div>
          </div>
        </section>

        {/* Data sources */}
        <section id="data-sources" aria-labelledby="data-heading" className="scroll-mt-24 border-t border-soltas-line pb-20 pt-16 sm:pb-28 sm:pt-20">
          <h2 id="data-heading" className="text-2xl font-semibold tracking-tight text-soltas-text">Data sources</h2>
          <p className="mt-3 max-w-3xl text-[15px] leading-7 text-soltas-muted">
            Besides the projects people add here, the map shows humanitarian and environmental activities that
            organisations publish to the{" "}
            <a href="https://iatistandard.org" target="_blank" rel="noopener noreferrer" className="text-soltas-ocean hover:underline">
              International Aid Transparency Initiative (IATI)
            </a>
            . We copy them regularly from the IATI Datastore, tag them &ldquo;IATI&rdquo;, name the
            publisher on every page and don&apos;t edit them. Each publisher shares its data under its own open
            licence. Activities that only name a country are shown at the country&apos;s centre.
          </p>
        </section>

        {/* Join */}
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

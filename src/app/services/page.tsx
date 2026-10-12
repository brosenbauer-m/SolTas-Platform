import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Check, Megaphone } from "lucide-react";

import SiteFooter from "@/components/SiteFooter";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Services | Solarpunk Taskforce",
  description:
    "Comparative intelligence consulting and marketing services for impact-driven projects and organisations.",
};

const CONTACT_EMAIL = "contact@solarpunktaskforce.org";
const CONSULTATION_HREF = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Consultation request")}`;

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

export default function ServicesPage() {
  return (
    <main className="flex flex-col">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <section className="py-20 sm:py-28">
          <p className="text-sm font-medium text-soltas-ocean">Services</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-soltas-text sm:text-6xl">
            Help for the people doing the work.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-soltas-muted">
            For projects and organisations registered on Solarpunk Taskforce: insight from the whole field, and
            storytelling that shows what you achieve.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href={CONSULTATION_HREF} className={buttonClasses({ size: "lg" })}>
              Request a consultation
            </a>
            <Link href="/organisations/create" className={buttonClasses({ variant: "outline", size: "lg" })}>
              Register your organisation
            </Link>
          </div>
        </section>

        <section aria-label="Services" className="grid gap-4 pb-20 sm:pb-28 md:grid-cols-2">
          {SERVICES.map(({ icon: Icon, title, text, features }) => (
            <div key={title} className="card flex flex-col p-7 sm:p-8">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-soltas-ocean/10 text-soltas-ocean">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="mt-5 text-2xl font-semibold tracking-tight text-soltas-text">{title}</h2>
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
        </section>

        <section aria-labelledby="who-heading" className="pb-20 sm:pb-28">
          <h2 id="who-heading" className="text-3xl font-semibold tracking-tight text-soltas-text sm:text-4xl">
            Who it&apos;s for
          </h2>
          <div className="mt-8 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            {AUDIENCES.map((a) => (
              <div key={a.title} className="border-t border-soltas-line pt-5">
                <h3 className="text-lg font-semibold text-soltas-text">{a.title}</h3>
                <p className="mt-1 text-[15px] leading-6 text-soltas-muted">{a.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="how-heading" className="pb-20 sm:pb-28">
          <h2 id="how-heading" className="text-3xl font-semibold tracking-tight text-soltas-text sm:text-4xl">
            How it works
          </h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="card p-7">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-soltas-ocean text-sm font-semibold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-soltas-text">{s.title}</h3>
                <p className="mt-1 text-[15px] leading-6 text-soltas-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mb-20 rounded-3xl bg-soltas-abyssal px-7 py-12 text-center text-white sm:mb-28 sm:px-12 sm:py-16">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Let&apos;s talk about your work.</h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-7 text-white/75">
            Services are available to organisations and projects registered on the platform. Registration is free.
          </p>
          <a
            href={CONSULTATION_HREF}
            className={buttonClasses({ size: "lg", className: "mt-8 bg-white text-soltas-abyssal hover:bg-white/90" })}
          >
            Email {CONTACT_EMAIL}
          </a>
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}

import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Building2, Coins, FolderKanban, Megaphone } from "lucide-react";

import HomeGlobeSection from "@/components/home/HomeGlobeSection";
import SiteFooter from "@/components/SiteFooter";
import { buttonClasses } from "@/components/ui/button";

const DESTINATIONS = [
  {
    href: "/projects",
    icon: FolderKanban,
    title: "Projects",
    text: "Humanitarian and environmental projects around the world, with their goals, progress and needs.",
    cta: "Find projects",
  },
  {
    href: "/find-organisations",
    icon: Building2,
    title: "Organisations",
    text: "The verified organisations behind the work: what they do, where, and who they partner with.",
    cta: "Find organisations",
  },
  {
    href: "/funding",
    icon: Coins,
    title: "Funding",
    text: "Open and upcoming grants, so the right resources reach the right projects.",
    cta: "Find funding",
  },
  {
    href: "/issues",
    icon: Megaphone,
    title: "Issues",
    text: "Local issues raised by the people who live them, connected to those who can help.",
    cta: "See issues",
  },
];

export default function HomePage() {
  return (
    <main className="flex flex-col">
      {/* Full-viewport hero */}
      <Suspense fallback={<div className="h-[calc(100dvh-4rem)] w-full bg-soltas-light" />}>
        <HomeGlobeSection />
      </Suspense>

      <div id="home-next-section" className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        {/* Statement */}
        <section className="py-20 text-center sm:py-28">
          <h2 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight text-soltas-text sm:text-5xl">
            One living map of the world&apos;s humanitarian and environmental work.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-soltas-muted">
            Solarpunk Taskforce connects people, projects and organisations, so efforts stop overlapping,
            small teams find partners, and everyone can see where support makes a difference.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/projects" className={buttonClasses({ size: "lg" })}>
              Explore projects
            </Link>
            <Link href="/about" className={buttonClasses({ variant: "link", size: "lg" })}>
              How it works <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Destinations */}
        <section aria-labelledby="explore-heading" className="pb-20 sm:pb-28">
          <h2 id="explore-heading" className="sr-only">
            Explore
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {DESTINATIONS.map(({ href, icon: Icon, title, text, cta }) => (
              <Link
                key={href}
                href={href}
                className="group card flex flex-col gap-4 p-7 hover:shadow-md sm:p-8"
              >
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-soltas-ocean/10 text-soltas-ocean">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="space-y-2">
                  <h3 className="text-2xl font-semibold tracking-tight text-soltas-text">{title}</h3>
                  <p className="text-[15px] leading-6 text-soltas-muted">{text}</p>
                </div>
                <span className="mt-auto inline-flex items-center gap-1 text-[15px] font-medium text-soltas-ocean">
                  {cta}
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Mission */}
        <section className="grid gap-4 pb-20 sm:pb-28 md:grid-cols-2">
          <div className="card p-7 sm:p-8">
            <p className="text-sm font-medium text-soltas-ocean">For organisations</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-soltas-text">See the whole field.</h3>
            <p className="mt-3 text-[15px] leading-7 text-soltas-muted">
              A transparent, living database of who is doing what, and where. Find partners, avoid duplicate
              work, learn from proven solutions and show funders the impact you create.
            </p>
          </div>
          <div className="card p-7 sm:p-8">
            <p className="text-sm font-medium text-soltas-ocean">For everyone</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-soltas-text">See where help goes.</h3>
            <p className="mt-3 text-[15px] leading-7 text-soltas-muted">
              Follow projects you care about, get their updates, and raise the issues in your own community
              so the people with the right resources can act on them.
            </p>
          </div>
        </section>

        {/* Get involved */}
        <section className="mb-20 overflow-hidden rounded-3xl bg-soltas-abyssal px-7 py-12 text-white sm:mb-28 sm:px-12 sm:py-16">
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Put your work on the map.</h2>
              <p className="mt-3 text-[15px] leading-7 text-white/75">
                Register your organisation and its projects, share updates with your followers, or report an
                issue in your area. It&apos;s free.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
              <Link
                href="/signup"
                className={buttonClasses({ size: "lg", className: "bg-white text-soltas-abyssal hover:bg-white/90" })}
              >
                Join Solarpunk Taskforce
              </Link>
              <Link
                href="/services"
                className={buttonClasses({
                  variant: "ghost",
                  size: "lg",
                  className: "text-white hover:bg-white/10",
                })}
              >
                Our services
              </Link>
            </div>
          </div>
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}

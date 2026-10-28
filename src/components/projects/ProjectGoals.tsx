import Link from "next/link";

import { ifrcTitle, sdgsFrom } from "@/lib/goals";

/**
 * "Goals" card on a project page: the UN Sustainable Development Goals as numbered tiles in the official
 * goal colours (a convention visitors from the sector recognise at a glance) and the IFRC Global
 * Challenges as chips. Each links to Find Projects filtered by that goal. Renders nothing without goals.
 */
export default function ProjectGoals({ sdgs, ifrc }: { sdgs: string[] | null; ifrc: string[] | null }) {
  const goals = sdgsFrom(sdgs);
  const challenges = (ifrc ?? [])
    .map((code) => ({ code, title: ifrcTitle(code) }))
    .filter((c): c is { code: string; title: string } => Boolean(c.title));
  if (!goals.length && !challenges.length) return null;

  return (
    <section className="card p-6" aria-labelledby="project-goals">
      <h2 id="project-goals" className="text-lg font-semibold tracking-tight text-soltas-text">
        Goals
      </h2>
      {goals.length ? (
        <>
          <p className="mt-1 text-sm text-soltas-muted">Sustainable Development Goals this project works towards</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {goals.map((goal) => (
              <li key={goal.number}>
                <Link
                  href={`/projects?sdg=${goal.number}`}
                  className="flex min-h-11 items-center gap-2.5 rounded-xl border border-soltas-line bg-white pr-3 text-sm text-soltas-text transition hover:shadow-sm"
                  title={`See all projects for goal ${goal.number}`}
                >
                  <span
                    aria-hidden="true"
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-l-xl text-base font-semibold text-white"
                    style={{ backgroundColor: goal.color }}
                  >
                    {goal.number}
                  </span>
                  <span className="font-medium">{goal.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {challenges.length ? (
        <>
          <p className={`${goals.length ? "mt-5" : "mt-1"} text-sm text-soltas-muted`}>IFRC Global Challenges</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {challenges.map((challenge) => (
              <li key={challenge.code}>
                <Link
                  href={`/projects?ifrc=${encodeURIComponent(challenge.code)}`}
                  className="inline-flex min-h-9 items-center rounded-full bg-soltas-bark/10 px-3 text-sm font-medium text-soltas-bark hover:underline"
                >
                  {challenge.title}
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}

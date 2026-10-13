import { HeartHandshake } from "lucide-react";

import { DONATIONS_ENABLED } from "@/lib/donations";

/** "Support this project" box on project pages. A placeholder until donations launch. */
export function SupportCard({ projectName }: { projectName: string }) {
  if (DONATIONS_ENABLED) return null; // the real donate flow will replace this

  return (
    <section aria-labelledby="support-heading" className="card flex gap-4 p-6">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-soltas-green/10 text-soltas-green">
        <HeartHandshake className="h-5 w-5" aria-hidden />
      </span>
      <div>
        <h2 id="support-heading" className="text-lg font-semibold tracking-tight text-soltas-text">
          Support {projectName}
        </h2>
        <p className="mt-1 text-[15px] leading-6 text-soltas-muted">
          Donations through Solarpunk Taskforce are coming soon. Until then, follow the project to get its updates and
          share it with people who might help.
        </p>
      </div>
    </section>
  );
}

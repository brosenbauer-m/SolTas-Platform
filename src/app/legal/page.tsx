import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Legal notice" };

// Austria, run by a private person (no legal entity yet): information under § 5 ECG and
// disclosure under § 25 MedienG. When an association or company is founded, add its name, register
// number (ZVR/FN), registered office and representatives, and update the privacy policy too.
export default function LegalNoticePage() {
  return (
    <LegalPage title="Legal notice" updated="13 October 2026">
      <section>
        <h2>Who runs this website</h2>
        <p>
          Solarpunk Taskforce
          <br />
          A private, non-commercial initiative
          <br />
          Vienna, Austria
        </p>
        <p>
          Email: <a href="mailto:contact@solarpunktaskforce.org">contact@solarpunktaskforce.org</a>
        </p>
        <p>
          Solarpunk Taskforce is not yet a registered association or company. This notice will be updated when it
          is.
        </p>
      </section>

      <section>
        <h2>Purpose of this website</h2>
        <p>
          Disclosure under § 25 of the Austrian Media Act (MedienG). Owner of the medium (Medieninhaber):{" "}
          Solarpunk Taskforce, Vienna, Austria. Basic direction (grundlegende Richtung): information about
          humanitarian and environmental projects, organisations, funding opportunities and reported issues, and a
          platform for people to follow, connect with and support this work.
        </p>
      </section>

      <section>
        <h2>Content from users</h2>
        <p>
          Projects, organisations, funding opportunities, issues, posts and comments are published by registered
          users, who are responsible for what they publish. We review projects, organisations, funding and issues
          before they appear publicly, and we remove unlawful content as soon as we become aware of it. To report
          content, email <a href="mailto:contact@solarpunktaskforce.org">contact@solarpunktaskforce.org</a>.
        </p>
      </section>

      <section>
        <h2>Links to other websites</h2>
        <p>
          We are not responsible for the content of external websites linked from this platform. When we link to
          them we check them for obvious legal problems; if we learn of any, we remove the link.
        </p>
      </section>
    </LegalPage>
  );
}

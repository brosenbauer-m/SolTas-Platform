import type { Metadata } from "next";

import { Fill, LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Legal notice | Solarpunk Taskforce" };

// DRAFT: fill in every highlighted [placeholder] before this goes live. The exact wording required
// depends on the country you are registered in (e.g. Germany: § 5 DDG and § 18 MStV;
// Austria: § 5 ECG and § 25 MedienG). Have it checked once your legal entity exists.
export default function LegalNoticePage() {
  return (
    <LegalPage title="Legal notice" updated="13 October 2026">
      <section>
        <h2>Who runs this website</h2>
        <p>
          <Fill>Full legal name of the person or entity, e.g. &ldquo;Solarpunk Taskforce e.V.&rdquo; or your full name</Fill>
          <br />
          <Fill>Street and number</Fill>
          <br />
          <Fill>Postcode, city</Fill>
          <br />
          <Fill>Country</Fill>
        </p>
        <p>
          Email: <a href="mailto:contact@solarpunktaskforce.org">contact@solarpunktaskforce.org</a>
          <br />
          Phone: <Fill>phone number, if required in your country</Fill>
        </p>
      </section>

      <section>
        <h2>Registration and tax</h2>
        <p>
          <Fill>Register and registration number (association or company register), or remove this section if not registered yet</Fill>
          <br />
          <Fill>VAT ID, if you have one</Fill>
        </p>
      </section>

      <section>
        <h2>Represented by</h2>
        <p>
          <Fill>Name(s) of the person(s) legally representing the entity, e.g. board members</Fill>
        </p>
      </section>

      <section>
        <h2>Responsible for content</h2>
        <p>
          <Fill>Name and address of the person responsible for editorial content</Fill>
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

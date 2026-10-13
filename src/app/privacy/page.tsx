import type { Metadata } from "next";
import Link from "next/link";

import { Fill, LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Privacy policy | Solarpunk Taskforce" };

// DRAFT: fill in every highlighted [placeholder] and have the text reviewed before relying on it.
// Keep the "Services we use" list in sync whenever a new provider is added (see AGENT_RULES.md).
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="13 October 2026">
      <section>
        <p>
          This policy explains what personal data Solarpunk Taskforce (&ldquo;we&rdquo;) collects when you use
          solarpunktaskforce.org, why, who processes it for us, and what rights you have under the EU General Data
          Protection Regulation (GDPR).
        </p>
      </section>

      <section>
        <h2>1. Who is responsible</h2>
        <p>
          <Fill>Your full name</Fill>, Vienna, Austria (a private, non-commercial initiative; not yet a registered
          organisation). Email:{" "}
          <a href="mailto:contact@solarpunktaskforce.org">contact@solarpunktaskforce.org</a>. See also the{" "}
          <Link href="/legal">legal notice</Link>.
        </p>
      </section>

      <section>
        <h2>2. What we collect and why</h2>
        <h3>Your account</h3>
        <p>
          When you sign up we store your email address, a password (stored only as a secure hash by our
          authentication provider), your first and last name, date of birth, the country you live in and, if you
          add them, the country you are from, occupation, organisation, bio, photo link and social links.
        </p>
        <ul>
          <li>
            <strong>Why:</strong> to create and run your account and show your public profile.{" "}
            <strong>Legal basis:</strong> performance of our agreement with you (Art. 6(1)(b) GDPR).
          </li>
          <li>
            <strong>Date of birth</strong> is stored privately. It is never shown on your profile and cannot be read
            by other users.
          </li>
        </ul>

        <h3>What you publish</h3>
        <p>
          Projects, organisations, funding opportunities, issue reports, updates, posts, comments, likes, follows and
          uploaded images. Most of this is public by design, together with your name. You can report an issue
          anonymously: your name is then hidden from the public, but our moderators can still see who submitted it.
        </p>
        <ul>
          <li>
            <strong>Legal basis:</strong> performance of our agreement with you (Art. 6(1)(b) GDPR).
          </li>
        </ul>

        <h3>Notifications and email</h3>
        <p>
          We show in-app notifications (for example new followers or updates on projects you follow) and send
          service emails (for example when you are added to a project, or to reset your password). You can turn
          email notifications off in <Link href="/settings">Settings</Link>.
        </p>

        <h3>Moderation and security</h3>
        <p>
          We review new projects, organisations, funding and issues before they are published, and we keep records
          of who approved or rejected them. Our hosting providers keep short-lived technical logs (such as IP address
          and time of a request) to keep the service secure. <strong>Legal basis:</strong> our legitimate interest
          in a safe, trustworthy platform (Art. 6(1)(f) GDPR).
        </p>

        <h3>Visitor statistics</h3>
        <p>
          We use Vercel Web Analytics to count page views. It does not use cookies and does not build profiles of
          individual visitors; we only see aggregated numbers (such as pages, countries and referring websites).{" "}
          <strong>Legal basis:</strong> our legitimate interest in understanding how the site is used (Art. 6(1)(f)
          GDPR).
        </p>
      </section>

      <section>
        <h2>3. Cookies and local storage</h2>
        <p>
          We only use what the site needs to work: a cookie that keeps you signed in, and your browser&apos;s local
          storage for small preferences such as the width of the filter panel. We do not use advertising or tracking
          cookies, so we do not ask for cookie consent.
        </p>
      </section>

      <section>
        <h2>4. Services we use</h2>
        <p>These companies process data on our behalf, under data processing agreements:</p>
        <ul>
          <li>
            <strong>Supabase</strong> (database, sign-in and file storage). Data is stored in the EU, in Frankfurt,
            Germany.
          </li>
          <li>
            <strong>Vercel Inc.</strong>, USA (website hosting and visitor statistics). Requests are processed in
            Frankfurt, Germany; Vercel is certified under the EU-US Data Privacy Framework.
          </li>
          <li>
            <strong>Scaleway SAS</strong>, France (sending emails).
          </li>
          <li>
            <strong>Mapbox Inc.</strong>, USA (maps, the globe and place search). When you view a map or search for a
            place, your IP address and the search text are sent to Mapbox. Transfers are covered by the EU Standard
            Contractual Clauses.
          </li>
        </ul>
        <p>We do not sell your data and do not share it with anyone else, unless the law requires us to.</p>
      </section>

      <section>
        <h2>5. How long we keep data</h2>
        <ul>
          <li>Account and profile data: until you delete your account.</li>
          <li>
            Content you publish: until you or we remove it. When you delete your account we delete your profile and
            remove or anonymise what you published.
          </li>
          <li>Technical logs: kept by our hosting providers for a short time, typically up to 30 days.</li>
        </ul>
      </section>

      <section>
        <h2>6. Your rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>see the data we hold about you, and get a copy (access and portability);</li>
          <li>correct it (most of it you can edit yourself on your profile);</li>
          <li>have it deleted, or its use restricted;</li>
          <li>object to processing based on our legitimate interests;</li>
          <li>withdraw any consent you gave, at any time.</li>
        </ul>
        <p>
          To use these rights, or to delete your account, email{" "}
          <a href="mailto:contact@solarpunktaskforce.org">contact@solarpunktaskforce.org</a>. We reply within one
          month. You can also complain to a data protection authority. In Austria this is the{" "}
          <a href="https://www.dsb.gv.at" rel="noopener noreferrer" target="_blank">
            Datenschutzbehörde
          </a>
          , Barichgasse 40–42, 1030 Vienna.
        </p>
      </section>

      <section>
        <h2>7. Changes</h2>
        <p>
          We will update this policy when we add features or services that process personal data (for example
          AI-assisted search, which we plan to run with Mistral AI in the EU). The date at the top shows the latest
          version.
        </p>
      </section>
    </LegalPage>
  );
}

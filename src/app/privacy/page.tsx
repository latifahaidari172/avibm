import type { Metadata } from 'next'
import { PageShell, Section, P, Bullets, Callout, A } from '@/components/legal'

export const metadata: Metadata = {
  title: 'Privacy Policy — AVIBM',
  description: 'How AVIBM collects, uses, holds and discloses your personal information, in line with the Privacy Act 1988 (Cth) and the Australian Privacy Principles.',
}

export default function PrivacyPage() {
  return (
    <PageShell
      eyebrow="Legal"
      title="Privacy Policy"
      meta="Version 1.0 · Effective 31 May 2026."
      intro={
        <>AVIBM (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) respects your privacy and handles your personal information in accordance with the Privacy Act 1988 (Cth) (the &ldquo;Privacy Act&rdquo;) and the Australian Privacy Principles (the &ldquo;APPs&rdquo;). This policy explains what we collect, why, how we hold it, who we disclose it to, how long we keep it, and how you can access or correct it.</>
      }
    >
      <Section n="1" title="Who this policy applies to">
        <P>
          This policy applies to all visitors and account holders of avibm.com and any related
          applications and email services (collectively, the &ldquo;Service&rdquo;). AVIBM shares a single
          account identity with <A href="https://auction-intel.com" external>Auction Intel</A>; where the same
          email is used on both sites, information is handled under the same privacy commitments. This
          policy does not apply to the third-party booking systems we interact with on your behalf, each
          of which is operated by a government authority with its own privacy practices.
        </P>
      </Section>

      <Section n="2" title="What we collect">
        <P>We collect only the personal information we need to monitor and rebook your inspection:</P>
        <Bullets items={[
          <><strong className="text-on-background">Account information</strong> — your email address (required to sign in), and your name, phone number, date of birth and residential address as supplied on your profile.</>,
          <><strong className="text-on-background">Booking information</strong> — the customer or booking reference number(s) needed to access your inspection booking, your existing appointment date, your chosen inspection locations and the latest acceptable date.</>,
          <><strong className="text-on-background">Vehicle information</strong> — the VIN or registration, and the year, make, model, colour and damage details (some pre-filled from public auction records).</>,
          <><strong className="text-on-background">Usage and technical information</strong> — monitoring activity, rebooking outcomes, timestamps, plus IP address, browser, request paths and approximate region, logged for security and debugging.</>,
          <><strong className="text-on-background">Communications</strong> — the content of any email or support request you send us.</>,
          <><strong className="text-on-background">Cookies</strong> — a small number of strictly necessary first-party cookies for sign-in session management. We do not use advertising cookies, behavioural tracking pixels or cross-site analytics suites.</>,
        ]} />
        <Callout>
          A customer or booking reference number is a government-issued identifier. We collect it only
          because it is required to access and reschedule your inspection on your behalf, we store it
          securely, and we use it for no other purpose. We do not knowingly collect &ldquo;sensitive
          information&rdquo; as defined by the Privacy Act; if you submit any inadvertently we will delete
          it promptly.
        </Callout>
      </Section>

      <Section n="3" title="How we collect it">
        <P>
          Personal information is collected directly from you when you sign up, complete your profile,
          add a vehicle or contact us. Technical information is collected automatically by our servers
          and our edge-security provider. We do not buy personal information from data brokers and do not
          enrich your record from third-party sources.
        </P>
      </Section>

      <Section n="4" title="Why we collect it">
        <P>We use your personal information only for these purposes:</P>
        <Bullets items={[
          'to create, authenticate and secure your account, including delivering single-use sign-in emails;',
          'to perform the core Service — accessing the relevant inspection booking system with your details and rebooking your appointment to an earlier slot within your stated rules;',
          'to notify you of rebookings, monitoring status and account or security matters by transactional email;',
          'to take payment for monitoring (via PayID, through your shared Auction Intel account);',
          'to detect and prevent fraud, abuse, quota-circumvention and unauthorised access;',
          'to debug, monitor system health and improve the Service; and',
          'to comply with our legal obligations and respond to lawful requests.',
        ]} />
        <P>We will not use your information for an unrelated purpose without your consent or unless required by law.</P>
      </Section>

      <Section n="5" title="Who we disclose it to">
        <P>We do not sell, rent or trade your personal information. We disclose it only as follows:</P>
        <Bullets items={[
          <><strong className="text-on-background">The inspection booking authority</strong> — to do what you have asked us to do, we submit the details necessary to identify and reschedule your appointment to the relevant state booking system (e.g. Queensland TMR / South Australia DIT). This disclosure is an unavoidable part of the rebooking you instruct.</>,
          <><strong className="text-on-background">Service providers</strong> under contract — Australian-region application and database hosting; a content-delivery and edge-security provider (receives request metadata such as IP and user-agent); and a transactional email provider (delivers sign-in and notification emails).</>,
          <><strong className="text-on-background">Auction Intel</strong> — operated by the same team under the same shared account; information is handled under equivalent privacy commitments.</>,
          <><strong className="text-on-background">Law enforcement, regulators or courts</strong> — where compelled by an enforceable Australian warrant, subpoena, court order or statutory notice.</>,
          <><strong className="text-on-background">Professional advisers or a successor entity</strong> — where necessary for advice or in the event the Service is sold or restructured, subject to the same privacy commitments and prior notice of any material change.</>,
        ]} />
      </Section>

      <Section n="6" title="Cross-border disclosure">
        <P>
          Our primary application and database servers are located in Australia. Some infrastructure
          providers (content delivery, transactional email) operate globally and may process technical
          metadata or message content through servers overseas. By using the Service you consent to such
          cross-border disclosure as a necessary incident of delivery, and we take reasonable steps to
          ensure overseas processors handle your data consistently with the APPs.
        </P>
      </Section>

      <Section n="7" title="How we hold and secure it">
        <P>
          Personal information is stored in an access-controlled database on Australian-region servers,
          behind TLS encryption end-to-end. Sensitive identifiers such as booking reference numbers are
          stored with additional protection and used only to perform your rebooking. We use single-use
          sign-in links rather than stored passwords, rotate server logs, and monitor for unusual access.
          No system is perfectly secure — please also keep your sign-in email account secure and do not
          forward your magic link to anyone.
        </P>
      </Section>

      <Section n="8" title="How long we keep it">
        <Bullets items={[
          'Account and profile data — kept while your account is active; removed within thirty (30) days of account closure (your email may be retained in hashed form for abuse prevention).',
          'Booking reference numbers — retained only while you have an active vehicle being monitored, and deleted once monitoring for that vehicle ends, save where we must retain a record to resolve a dispute.',
          'Monitoring and rebooking history — kept while your account is active so your dashboard can show recent activity; removed within thirty (30) days of closure.',
          'Server logs — rotated approximately every fourteen (14) days, then anonymised or discarded.',
          'Email correspondence — kept for as long as needed to resolve your matter, plus a further twelve (12) months for audit.',
        ]} />
      </Section>

      <Section n="9" title="Your rights">
        <P>Under the Privacy Act and the APPs you may:</P>
        <Bullets items={[
          'access the personal information we hold about you (most is visible on your profile and dashboard; for anything else, email us and we will respond within thirty (30) days at no charge);',
          'correct inaccurate information — you can edit your name, phone and address on your profile directly; email-address changes require re-verification;',
          'delete your account and the personal information attached to it by emailing us with the subject “Account deletion request” from your account email; completed within thirty (30) days;',
          'withdraw consent to any optional marketing emails at any time via the unsubscribe link; and',
          'complain about how we have handled your information.',
        ]} />
        <P>
          Complaints should be sent to <A href="mailto:navidhaidari12@gmail.com">navidhaidari12@gmail.com</A>. We will
          acknowledge within seven (7) days and respond within thirty (30). If you are not satisfied, you
          may escalate to the Office of the Australian Information Commissioner (OAIC) at <A href="https://oaic.gov.au" external>oaic.gov.au</A> or
          1300 363 992.
        </P>
      </Section>

      <Section n="10" title="Children">
        <P>
          The Service is intended for users aged 18 and over and we do not knowingly collect personal
          information from children under 16. If you believe a child has provided us with personal
          information, contact us and we will delete it promptly.
        </P>
      </Section>

      <Section n="11" title="Data breach response">
        <P>
          In the event of an eligible data breach likely to result in serious harm, we will comply with
          the Notifiable Data Breaches scheme under Part IIIC of the Privacy Act — notifying affected
          users and the OAIC as soon as practicable.
        </P>
      </Section>

      <Section n="12" title="Updates and contact">
        <P>
          We may update this policy from time to time; the version line at the top identifies the current
          version, and material changes will be notified by email and/or a site banner. Privacy enquiries
          and access, correction or deletion requests should be addressed to <A href="mailto:navidhaidari12@gmail.com">navidhaidari12@gmail.com</A>.
        </P>
      </Section>
    </PageShell>
  )
}

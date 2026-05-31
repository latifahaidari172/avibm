import type { Metadata } from 'next'
import { PageShell, Section, P, Bullets, Callout, A } from '@/components/legal'

export const metadata: Metadata = {
  title: 'Terms of Service — AVIBM',
  description: 'The terms governing your use of AVIBM, the automated written-off vehicle inspection booking monitor.',
}

export default function TermsPage() {
  return (
    <PageShell
      eyebrow="Legal"
      title="Terms of Service"
      meta="Version 1.0 · Effective 31 May 2026."
      intro={
        <>These Terms of Service (&ldquo;Terms&rdquo;) form a binding agreement between you (&ldquo;you&rdquo;, &ldquo;your&rdquo;, the &ldquo;User&rdquo;) and the operator of AVIBM (&ldquo;AVIBM&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;), governing your access to and use of the website at avibm.com and any related services, applications, bots and content (collectively, the &ldquo;Service&rdquo;). By creating an account, signing in, adding a vehicle or otherwise using the Service, you confirm that you have read, understood and agreed to be bound by these Terms.</>
      }
    >
      <Section n="1" title="The Service">
        <P>
          AVIBM is an automated booking monitor for Australia&apos;s written-off vehicle inspection
          system. The Service watches the inspection booking portals operated by Australian state
          authorities for written-off vehicle inspections (such as Queensland&apos;s WOVI and South
          Australia&apos;s inspection station booking system) and, on your instruction, reschedules an
          inspection appointment you already hold to an earlier available slot within the rules you set.
        </P>
        <P>
          Unlike a pure information service, AVIBM <strong className="text-on-background">acts on your behalf</strong>: it
          uses the booking details and personal information you supply to access the relevant
          official booking system and to cancel and re-create your inspection appointment. AVIBM is not
          a government body, an inspection station, a registry, a motor dealer, a repairer or a transport
          provider, and it does not carry out the inspection or decide its outcome.
        </P>
      </Section>

      <Section n="2" title="Not affiliated with any authority">
        <P>
          AVIBM is <strong className="text-on-background">not affiliated with, endorsed by, sponsored by, or partnered
          with</strong> the Queensland Department of Transport and Main Roads, the South Australian
          Department for Infrastructure and Transport, or any other state or territory transport, road
          or motor-registry authority. Names of those authorities and of their inspection programs are
          used solely to identify the systems the Service interacts with.
        </P>
      </Section>

      <Section n="3" title="Eligibility and accounts">
        <P>
          To use the Service you must be at least 18 years of age, an Australian resident, and legally
          capable of entering into a binding contract. Sign-in is via a single-use magic link or Google
          sign-in tied to a verified email address; your AVIBM account is the same identity as your
          Auction Intel account. You agree to provide accurate, current and complete information, to keep
          your contact details current, and to keep your sign-in method secure. You are responsible for
          all activity under your account. Sign-in links are personal, non-transferable, and must not be
          shared.
        </P>
      </Section>

      <Section n="4" title="Your authorisation to act on your behalf">
        <Callout>
          By adding a vehicle and enabling monitoring, you expressly authorise AVIBM to access the
          relevant written-off vehicle inspection booking system using the information you provide, and
          to cancel and rebook your inspection appointment on your behalf to an earlier slot consistent
          with the locations and the latest acceptable date you have specified.
        </Callout>
        <P>You warrant and agree that:</P>
        <Bullets items={[
          'you are the person entitled to manage the inspection booking in question, or are acting with that person’s express authority;',
          'every detail you supply — including your name, contact details, vehicle identifiers (VIN/registration), customer or booking reference numbers, and the existing appointment — is accurate and lawfully yours to provide;',
          'you accept that rebooking is an irreversible change to a live appointment: when we secure an earlier slot we release the one you held, and an earlier booking may not be reversible if your plans change;',
          'you remain responsible for attending the inspection, paying any fee charged by the authority, and presenting a compliant vehicle and any required documents.',
        ]} />
        <P>
          You may pause or cancel monitoring for any vehicle at any time from your account. Cancelling
          monitoring stops future rebooking; it does not undo a rebooking already made.
        </P>
      </Section>

      <Section n="5" title="No guarantee of an earlier slot">
        <P>
          Availability of earlier inspection slots is entirely determined by the relevant authority and
          the behaviour of other applicants. We make commercially reasonable efforts to detect and
          secure earlier slots quickly, but we do not and cannot guarantee that an earlier slot will
          become available, that we will secure any particular slot, or that the booking system will be
          available, accurate or functioning at any given time. The Service may be affected by changes
          the authority makes to its booking system without notice.
        </P>
      </Section>

      <Section n="6" title="Fees and payment">
        <P>
          Monitoring is charged per vehicle according to the tier you select (for example Priority,
          Standard or Basic), at the prices displayed at the time you enable monitoring. Payment is made
          by PayID and is handled through your shared Auction Intel account. By enabling a paid tier you
          authorise the applicable charge for that vehicle. Fees are inclusive of GST where applicable.
          Prices may change from time to time; any change applies prospectively and will be shown before
          you confirm.
        </P>
      </Section>

      <Section n="7" title="Acceptable use">
        <P>Without limiting any other clause of these Terms, you must not, and must not attempt to:</P>
        <Bullets items={[
          'use the Service to manage an inspection booking you are not entitled or authorised to manage;',
          'provide a false, misleading or third-party identity, reference number or booking detail, or register on behalf of someone without their authorisation;',
          'access the Service by automated means, or bypass, disable or interfere with any rate limit, quota, authentication or security control;',
          'copy, resell, sub-licence, mirror or make the Service available to any third party, or use it to build a competing product;',
          'use the Service in connection with any unlawful activity, including in respect of stolen vehicles, vehicles with tampered identifiers, or vehicles subject to a PPSR encumbrance or law-enforcement interest;',
          'introduce malware, denial-of-service traffic or any harmful code, or use the Service as a vector to attack any other system, including the authorities’ booking systems;',
          'breach any applicable Commonwealth, State or Territory law, including the Australian Consumer Law, the Privacy Act 1988 (Cth), the Spam Act 2003 (Cth), or any state motor-vehicle, written-off-vehicle or registration legislation.',
        ]} />
      </Section>

      <Section n="8" title="Accuracy of information">
        <P>
          The Service relies on data you provide and on third-party booking systems that change without
          notice. You are responsible for the accuracy of the details you enter; an incorrect reference
          number, vehicle identifier or appointment detail may prevent us from acting, or cause a
          rebooking to fail. Vehicle details we pre-fill from auction records are provided for
          convenience and should be checked by you. To the maximum extent permitted by law, we are not
          responsible for outcomes arising from inaccurate information supplied by you or by a
          third-party system.
        </P>
      </Section>

      <Section n="9" title="Intellectual property">
        <P>
          All software, source code, design, copy, automation logic and the compilation and structure
          of the Service are the intellectual property of AVIBM or its licensors and are protected by
          Australian law. Nothing in these Terms transfers any of that ownership to you. Names and marks
          of third parties are used solely for identification.
        </P>
      </Section>

      <Section n="10" title="Your content">
        <P>
          The vehicle and booking details, preferences and other information you submit remain yours. By
          submitting them you grant us a non-exclusive, royalty-free licence to store, process and
          transmit that information solely to operate the Service for you — including disclosing the
          necessary details to the relevant booking system to make the rebooking you have requested. You
          warrant that the information you submit is accurate and lawfully yours to provide.
        </P>
      </Section>

      <Section n="11" title="Australian Consumer Law">
        <P>
          Nothing in these Terms excludes, restricts or modifies any consumer guarantee, right or remedy
          conferred on you by the Australian Consumer Law (Schedule 2 to the Competition and Consumer Act
          2010 (Cth)) or any other law that cannot lawfully be excluded. Where our liability for failure
          to comply with a guarantee can be limited, it is limited (at our option) to resupplying the
          relevant service or paying the cost of having it resupplied.
        </P>
      </Section>

      <Section n="12" title="Limitation of liability">
        <P>Subject to Clause 11 and to the maximum extent permitted by law:</P>
        <Bullets items={[
          'the Service is provided on an “as is” and “as available” basis, with no warranty that it will be uninterrupted, timely, secure or error-free;',
          'we are not liable for any indirect, consequential, special or punitive loss, or for loss of opportunity, missed appointments, registration delays, vehicle storage or hire costs, loss of profit or loss of data, arising out of or in connection with the Service;',
          'to the extent any liability cannot be excluded, our total aggregate liability to you for all claims in any twelve-month period is limited to the greater of (a) the monitoring fees you paid us in the preceding twelve months, or (b) AU$100.',
        ]} />
        <P>
          You acknowledge that the Service is a convenience tool and is not a substitute for managing
          your inspection booking directly with the authority. Decisions and outcomes relating to your
          inspection, repair, registration and vehicle remain your responsibility.
        </P>
      </Section>

      <Section n="13" title="Indemnity">
        <P>
          You agree to indemnify and hold harmless AVIBM, its operator, employees, agents and
          contractors from and against any claim, loss, damage, cost (including legal costs) or liability
          arising out of or in connection with: (a) your breach of these Terms; (b) inaccurate or
          unauthorised information you supplied; (c) any third-party claim that your use of the Service
          infringed their rights; or (d) any inspection, booking, repair or registration matter, whether
          or not in reliance on the Service.
        </P>
      </Section>

      <Section n="14" title="Suspension and termination">
        <P>
          We may suspend or terminate your access, with or without notice, if we reasonably believe you
          have breached these Terms, engaged in conduct that may harm the Service, the booking systems or
          other users, or if we are required to do so by law. On termination your licence to use the
          Service ceases immediately. Clauses that by their nature should survive termination (including
          8, 9, 11, 12, 13 and 16) survive.
        </P>
      </Section>

      <Section n="15" title="Changes to the Service and these Terms">
        <P>
          We may modify, add to or remove features at any time, and may update these Terms from time to
          time. The version date at the top of this page identifies the current version. Material changes
          will be notified by email and/or by a banner on the site. Continued use after a change takes
          effect constitutes your acceptance of the revised Terms.
        </P>
      </Section>

      <Section n="16" title="Governing law">
        <P>
          These Terms are governed by the laws of South Australia and the Commonwealth of Australia, and
          the parties submit to the exclusive jurisdiction of the courts of South Australia. If any
          provision is held invalid, it is severed and the remainder continues in force. These Terms,
          together with the <A href="/privacy">Privacy Policy</A>, constitute the entire agreement between
          you and AVIBM in respect of the Service.
        </P>
      </Section>

      <Section n="17" title="Contact">
        <P>
          Questions and notices in respect of these Terms can be sent to <A href="mailto:navidhaidari12@gmail.com">navidhaidari12@gmail.com</A>.
        </P>
      </Section>
    </PageShell>
  )
}

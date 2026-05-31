import type { Metadata } from 'next'
import { PageShell, Section, P, Bullets, A } from '@/components/legal'

export const metadata: Metadata = {
  title: 'About — AVIBM',
  description: 'AVIBM automatically monitors Australian written-off vehicle inspection booking systems and rebooks your appointment the moment an earlier slot opens.',
}

export default function AboutPage() {
  return (
    <PageShell
      eyebrow="About AVIBM"
      title={<>Get inspected <span className="text-primary">sooner.</span></>}
      intro="AVIBM is an automated booking monitor for Australia's written-off vehicle inspection (WOVI) system. We watch the state booking portals around the clock and rebook your inspection to the earliest available slot — so you're back on the road weeks ahead of your original date."
    >
      <Section title="What we do">
        <P>
          When a repairable write-off needs to be re-registered, it must first pass a state-run
          written-off vehicle inspection. Those appointments are often booked out weeks or months
          ahead, and the booking systems release earlier slots constantly as other people cancel or
          reschedule — but only someone refreshing the page at the right second ever catches them.
        </P>
        <P>
          AVIBM does that refreshing for you. You tell us your existing inspection booking, the
          locations that work for you, and the latest date you're willing to accept. From then on our
          bot monitors the booking system continuously and, the instant an earlier slot opens within
          your rules, it rebooks your appointment automatically and notifies you.
        </P>
        <Bullets items={[
          <><strong className="text-on-background">Add your vehicle</strong> — paste your VIN and we pull the year, make, model, photos and damage straight from auction records, so there's almost nothing to type.</>,
          <><strong className="text-on-background">We watch 24/7</strong> — the bot polls the inspection booking system for every centre you've selected, far faster and more reliably than checking by hand.</>,
          <><strong className="text-on-background">We rebook for you</strong> — when an earlier slot appears, we move your booking to it within your constraints and confirm by email.</>,
        ]} />
      </Section>

      <Section title="Where we operate">
        <P>
          AVIBM currently covers written-off vehicle inspections in <strong className="text-on-background">Queensland</strong> (WOVI,
          across the Brisbane metro and regional centres) and <strong className="text-on-background">South Australia</strong> (the
          Regency Park inspection station, Adelaide). We add states as their booking systems become
          supportable.
        </P>
      </Section>

      <Section title="Pricing">
        <P>Monitoring is charged per vehicle, by how fast you want us to move when a slot opens:</P>
        <Bullets items={[
          <><strong className="text-primary">Priority — $5</strong>: books the instant a slot opens, first in the queue.</>,
          <><strong className="text-on-background">Standard — $3</strong>: rebooks shortly after Priority subscribers.</>,
          <><strong className="text-on-background">Basic — $1.50</strong>: automated rebooking on a relaxed cadence.</>,
        ]} />
        <P>
          Payment is by PayID, handled through your shared Auction Intel account — one identity and
          one payment method across both sites. See the <A href="/terms">Terms</A> for the full billing rules.
        </P>
      </Section>

      <Section title="A companion to Auction Intel">
        <P>
          AVIBM is built by the team behind <A href="https://auction-intel.com" external>Auction Intel</A>, Australia's
          vehicle-auction intelligence platform. The two share one account keyed to your email — sign
          in on either site with the same login. Auction Intel is where you research and value a
          salvage vehicle before you buy; AVIBM is where you get it inspected and re-registered after
          you do.
        </P>
      </Section>

      <Section title="What we are not">
        <P>
          AVIBM is not a government service and is <strong className="text-on-background">not affiliated with, endorsed by, or
          partnered with</strong> Queensland's Department of Transport and Main Roads, South Australia's
          Department for Infrastructure and Transport, or any other state transport, road or
          motor-registry authority. We do not carry out the inspection itself, issue registrations, or
          decide whether your vehicle passes.
        </P>
        <P>
          We act on your behalf using the details you provide — accessing the official booking system
          to reschedule the appointment you already hold. We can't create availability that doesn't
          exist, and we can't guarantee an earlier slot; we guarantee that we're watching for one. The
          inspection fee is payable directly to the authority, and attending the inspection and meeting
          all registration requirements remains your responsibility.
        </P>
      </Section>

      <Section title="Get in touch">
        <P>
          Questions, feedback and support requests can be sent to <A href="mailto:navidhaidari12@gmail.com">navidhaidari12@gmail.com</A>.
          For data and privacy enquiries see the <A href="/privacy">Privacy Policy</A>; for the service rules see the <A href="/terms">Terms</A>.
        </P>
      </Section>
    </PageShell>
  )
}

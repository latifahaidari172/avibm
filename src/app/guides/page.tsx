import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { PageShell, Section, P, Bullets, A } from '@/components/legal'

export const metadata: Metadata = {
  title: 'Guides — AVIBM',
  description: 'How-to guides for AVIBM: getting started, understanding written-off vehicle inspections, choosing a monitoring tier, and how automatic rebooking works.',
}

function Guide({ tag, title, children }: { tag: string; title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-6 md:p-8 mb-6">
      <span className="inline-block bg-primary/10 border border-primary/20 text-primary px-3 py-1 rounded-full text-label-bold uppercase tracking-widest mb-4">{tag}</span>
      <h2 className="text-on-background font-semibold text-[22px] mb-4">{title}</h2>
      <div className="text-on-surface-variant leading-relaxed">{children}</div>
    </div>
  )
}

export default function GuidesPage() {
  return (
    <PageShell
      eyebrow="Guides"
      title={<>How to use <span className="text-primary">AVIBM</span></>}
      intro="Short, practical guides to getting your written-off vehicle inspected sooner."
    >
      <Guide tag="Getting started" title="Add your first vehicle">
        <P>From your account, choose <strong className="text-on-background">Add vehicle</strong> and paste your VIN. We pull the year, make, model, colour, photos and damage straight from auction records, so most of the form fills itself — you just confirm it&apos;s your vehicle.</P>
        <Bullets items={[
          'Enter the VIN; check the matched vehicle and tap “Yes, autofill”.',
          'Fill any fields flagged “Needs input” (anything we couldn’t pull automatically).',
          'Enter your existing inspection booking details, the locations that suit you, and the latest date you’ll accept.',
          'Pick a monitoring tier and start monitoring.',
        ]} />
      </Guide>

      <Guide tag="Background" title="Understanding written-off vehicle inspections">
        <P>A repairable write-off must pass a state-run inspection before it can be re-registered. In Queensland this is the Written-Off Vehicle Inspection (WOVI); South Australia runs an equivalent inspection at Regency Park. Appointments are limited and frequently booked weeks out, but slots open constantly as others cancel or reschedule.</P>
        <P>You still book the initial appointment yourself, with the authority. AVIBM&apos;s job is to catch the earlier slots that appear afterwards and move your booking to them.</P>
      </Guide>

      <Guide tag="How it works" title="How automatic rebooking happens">
        <P>Once monitoring is on, our bot polls the booking system for the centres you selected — far faster and more consistently than refreshing by hand. When an earlier slot appears within your rules, we release the appointment you held and secure the earlier one, then email you the confirmation.</P>
        <P>Because rebooking changes a live appointment, it&apos;s a one-way move: we only ever book <em>earlier</em> than what you currently hold, and never past your latest acceptable date.</P>
      </Guide>

      <Guide tag="Pricing" title="Choosing a monitoring tier">
        <Bullets items={[
          <><strong className="text-primary">Priority — $5/vehicle</strong>: first in the queue, books the instant a slot opens. Best when every day counts.</>,
          <><strong className="text-on-background">Standard — $3/vehicle</strong>: rebooks shortly after Priority subscribers.</>,
          <><strong className="text-on-background">Basic — $1.50/vehicle</strong>: automated rebooking on a relaxed cadence.</>,
        ]} />
        <P>You can change tier or pause monitoring at any time from your account. Payment is by PayID through your shared Auction Intel account.</P>
      </Guide>

      <Section title="More help">
        <P>For quick answers see the <A href="/faq">FAQ</A>; for how we handle your data see the <A href="/privacy">Privacy Policy</A>; for the service rules see the <A href="/terms">Terms</A>. Anything else: <A href="mailto:navidhaidari12@gmail.com">navidhaidari12@gmail.com</A>.</P>
      </Section>
    </PageShell>
  )
}

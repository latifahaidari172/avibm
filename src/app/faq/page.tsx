import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { PageShell, A } from '@/components/legal'

export const metadata: Metadata = {
  title: 'FAQ — AVIBM',
  description: 'Frequently asked questions about AVIBM — how automated written-off vehicle inspection rebooking works, pricing, states covered, and data handling.',
}

const FAQS: { q: string; a: ReactNode }[] = [
  {
    q: 'What is AVIBM?',
    a: <>AVIBM is an automated booking monitor for Australia&apos;s written-off vehicle inspection system. It watches the state inspection booking portals around the clock and rebooks your appointment to the earliest available slot within the rules you set.</>,
  },
  {
    q: 'What is a written-off vehicle inspection?',
    a: <>When a vehicle has been declared a repairable write-off, it must pass a state-run inspection before it can be re-registered for road use — for example Queensland&apos;s Written-Off Vehicle Inspection (WOVI). These appointments are often booked out weeks ahead.</>,
  },
  {
    q: 'Which states do you cover?',
    a: <>Currently Queensland (WOVI, Brisbane metro and regional centres) and South Australia (the Regency Park inspection station, Adelaide). We add states as their booking systems become supportable.</>,
  },
  {
    q: 'Do I need an existing booking first?',
    a: <>Yes. You book your initial inspection with the authority and give AVIBM the booking details. From there we monitor for earlier slots and rebook automatically — we reschedule an appointment you already hold rather than create a new one from nothing.</>,
  },
  {
    q: 'How does the automatic rebooking work?',
    a: <>You tell us your chosen inspection locations and the latest date you&apos;ll accept. Our bot polls the booking system continuously; the instant an earlier slot opens within your rules, it moves your booking to that slot and emails you the confirmation.</>,
  },
  {
    q: 'Why do you need my customer / booking reference number?',
    a: <>It&apos;s the identifier the booking system uses to find and change your appointment. We collect it only because it&apos;s required to act on your behalf, store it securely, use it for nothing else, and delete it once monitoring for that vehicle ends. See the <A href="/privacy">Privacy Policy</A>.</>,
  },
  {
    q: 'What does it cost?',
    a: <>Monitoring is per vehicle: Priority $5 (first in the queue when a slot opens), Standard $3, and Basic $1.50. Pick the speed that suits you.</>,
  },
  {
    q: 'How do I pay?',
    a: <>By PayID, handled through your shared Auction Intel account — one identity and one payment method across both sites.</>,
  },
  {
    q: 'Can I cancel or pause?',
    a: <>Yes, any time from your account. Cancelling stops future rebooking; it does not undo a rebooking that has already been made.</>,
  },
  {
    q: 'Can you guarantee an earlier slot?',
    a: <>No. Availability is determined entirely by the authority and by other applicants cancelling or rescheduling. We guarantee that we&apos;re watching continuously and will move quickly when a slot opens — not that one will appear.</>,
  },
  {
    q: 'Is AVIBM part of the government?',
    a: <>No. AVIBM is not affiliated with, or endorsed by, any state transport, road or motor-registry authority. We don&apos;t carry out the inspection or decide whether your vehicle passes — we just rebook the appointment on your behalf.</>,
  },
  {
    q: 'How is AVIBM related to Auction Intel?',
    a: <>AVIBM is a companion product to <A href="https://auction-intel.com" external>Auction Intel</A>, built by the same team. You sign in to both with one account keyed to your email.</>,
  },
  {
    q: 'Is my data safe?',
    a: <>Your information is stored in an access-controlled, Australian-region database behind end-to-end encryption, with sign-in by single-use links rather than stored passwords. Full detail is in the <A href="/privacy">Privacy Policy</A>.</>,
  },
]

export default function FaqPage() {
  return (
    <PageShell
      eyebrow="Help"
      title={<>Frequently asked <span className="text-primary">questions</span></>}
      intro="Everything you need to know about how AVIBM monitors and rebooks your written-off vehicle inspection."
    >
      <div className="divide-y divide-outline-variant/10 border-y border-outline-variant/10">
        {FAQS.map(({ q, a }, i) => (
          <details key={i} className="group py-5">
            <summary className="flex items-center justify-between cursor-pointer list-none gap-4">
              <span className="text-on-background font-semibold text-[18px] leading-snug">{q}</span>
              <span className="text-primary text-2xl leading-none transition-transform group-open:rotate-45 shrink-0">+</span>
            </summary>
            <div className="text-on-surface-variant leading-relaxed mt-4 pr-8">{a}</div>
          </details>
        ))}
      </div>

      <p className="text-on-surface-variant leading-relaxed mt-10">
        Still stuck? Email <A href="mailto:navidhaidari12@gmail.com">navidhaidari12@gmail.com</A> or read the <A href="/guides">guides</A>.
      </p>
    </PageShell>
  )
}

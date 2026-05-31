'use client'

import { useState } from 'react'
import { IconChevronDown, IconChevronRight } from '@/components/icons'
import VehicleCard from '@/components/VehicleCard'

type PastVehicle = {
  id: string; label?: string | null; make?: string | null; model?: string | null
  year?: string | number | null; vin?: string | null; booked_date?: string | null
  booked_time?: string | null; booked_location?: string | null; cutoff_date?: string | null
  ref?: string | null; photo_url?: string | null
}

// Collapsible "Completed / Past" section of archived vehicles — same card
// design as the active garage, just dimmed, with a Restore action in Manage.
// Collapsed by default so it never clutters the active list.
export default function PastVehicles({ vehicles }: { vehicles: PastVehicle[] }) {
  const [open, setOpen] = useState(false)
  if (!vehicles || vehicles.length === 0) return null

  return (
    <div style={{ marginTop: 28 }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontFamily: 'inherit', padding: 0 }}>
        {open ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
        <span className="eyebrow">Completed / Past · {vehicles.length}</span>
      </button>
      {open && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18, marginTop: 16 }}>
          {vehicles.map(v => (
            <VehicleCard key={v.id} v={v} status={{ label: 'Done', color: '#cfcabb', bg: 'rgba(0,0,0,0.55)' }} archived />
          ))}
        </div>
      )}
    </div>
  )
}

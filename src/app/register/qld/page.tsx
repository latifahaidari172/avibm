@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');

:root {
  --gold: #C9A84C;
  --gold-light: #E8C96A;
  --dark: #0A0A0A;
  --dark-2: #111111;
  --dark-3: #1A1A1A;
  --dark-4: #242424;
  --border: #2A2A2A;
  --text: #E8E8E8;
  --text-muted: #888888;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--dark);
  color: var(--text);
  font-family: 'DM Sans', sans-serif;
  min-height: 100vh;
  overflow-x: hidden;
}

h1, h2, h3, .display {
  font-family: 'Bebas Neue', sans-serif;
  letter-spacing: 0.05em;
}

.gold { color: var(--gold); }

input, select, textarea {
  background: var(--dark-3);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 12px 16px;
  border-radius: 6px;
  width: 100%;
  font-family: 'DM Sans', sans-serif;
  font-size: 15px;
  transition: border-color 0.2s;
  outline: none;
}

input:focus, select:focus, textarea:focus { border-color: var(--gold); }
input::placeholder, textarea::placeholder { color: var(--text-muted); }
select option { background: var(--dark-3); }

label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.btn-gold {
  background: var(--gold);
  color: #000;
  border: none;
  padding: 14px 32px;
  font-family: 'Bebas Neue', sans-serif;
  font-size: 18px;
  letter-spacing: 0.1em;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
  width: 100%;
}
.btn-gold:hover { background: var(--gold-light); }
.btn-gold:active { transform: scale(0.99); }
.btn-gold:disabled { background: var(--border); color: var(--text-muted); cursor: not-allowed; }

.card {
  background: var(--dark-2);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 32px;
}

.section-label {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 13px;
  letter-spacing: 0.2em;
  color: var(--gold);
  text-transform: uppercase;
  margin-bottom: 8px;
}

.divider { border: none; border-top: 1px solid var(--border); margin: 24px 0; }

.badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.05em;
}
.badge-active   { background: #1a3a1a; color: #5adb5a; border: 1px solid #2a4a2a; }
.badge-pending  { background: #3a2a00; color: var(--gold); border: 1px solid #4a3a00; }
.badge-booked   { background: #1a2a3a; color: #5ab0ff; border: 1px solid #2a3a4a; }
.badge-inactive { background: var(--dark-4); color: var(--text-muted); border: 1px solid var(--border); }

.state-tab {
  padding: 10px 24px;
  border-radius: 6px;
  font-family: 'Bebas Neue', sans-serif;
  font-size: 16px;
  letter-spacing: 0.1em;
  cursor: pointer;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-muted);
  transition: all 0.2s;
}
.state-tab.active { background: var(--gold); color: #000; border-color: var(--gold); }

.noise {
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 9999;
}

/* ── Mobile ── */

@media (max-width: 768px) {
  .card { padding: 20px 16px; }

  /* Landing page */
  .hero-section { padding: 60px 16px 40px !important; }
  .hero-title   { font-size: clamp(38px, 11vw, 80px) !important; line-height: 1 !important; }
  .hero-sub     { font-size: 14px !important; padding: 0 8px; }
  .hero-cta     { flex-direction: column !important; align-items: stretch !important; }
  .hero-cta a, .hero-cta button { text-align: center !important; }

  /* Sections */
  .section-padded { padding: 40px 16px !important; }

  /* State cards */
  .state-cards-grid { grid-template-columns: 1fr !important; }
  .state-card-h2    { font-size: clamp(24px, 7vw, 36px) !important; }

  /* Coming soon */
  .coming-soon-grid { grid-template-columns: 1fr 1fr !important; }

  /* Pricing */
  .pricing-grid { grid-template-columns: 1fr !important; max-width: 100% !important; }

  /* Registration */
  .register-grid-2 { grid-template-columns: 1fr !important; }
  .register-main   { padding: 20px 16px !important; max-width: 100% !important; }
  .tier-grid-3     { grid-template-columns: 1fr !important; }

  /* Admin header */
  .admin-header { padding: 12px 16px !important; }

  /* Admin body */
  .admin-body { padding: 14px 12px !important; }

  /* Stats */
  .stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
  .stat-card  { padding: 14px 12px !important; }
  .stat-value { font-size: 28px !important; }

  /* Monitor status */
  .monitor-grid { grid-template-columns: 1fr !important; }

  /* Auto email toggle */
  .auto-email-row { flex-direction: column !important; gap: 12px !important; align-items: flex-start !important; }

  /* Filters */
  .filters-row { flex-direction: column !important; gap: 8px !important; }
  .filters-row input { max-width: 100% !important; }
  .filters-tabs { display: flex; gap: 6px; }

  /* Customer rows */
  .customer-row { flex-wrap: wrap !important; gap: 8px !important; padding: 12px !important; }
  .customer-name { min-width: 0 !important; flex: 1 1 100% !important; order: -1; }
  .customer-vehicles { min-width: auto !important; }

  /* Expanded details */
  .customer-detail-grid { grid-template-columns: 1fr !important; }
  .vehicle-row-grid     { grid-template-columns: 1fr !important; gap: 8px !important; }
  .actions-row          { flex-direction: column !important; gap: 8px !important; }
  .actions-row button   { width: 100% !important; box-sizing: border-box !important; }

  /* State tab bar */
  .state-tab { padding: 8px 14px !important; font-size: 14px !important; }

  /* Map */
  .leaflet-map { height: 250px !important; }
}

@media (max-width: 480px) {
  .card { padding: 16px 12px; }
  .stats-grid { grid-template-columns: 1fr 1fr !important; }
  .hero-title { font-size: 36px !important; }
}

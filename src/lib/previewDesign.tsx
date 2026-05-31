'use client'

import type { ReactNode } from 'react'

// Shared "Ethereal Glass" design system for the live app pages (landing,
// /account and its sub-pages). Originally prototyped under account-preview/*.
// Maximalist "Ethereal Glass" treatment per the high-end-visual-design +
// emil-design-eng skills: OLED black, drifting colour-orb mesh, gradient-border
// glass cards, shimmer display type, custom-eased motion. Isolated — not wired
// to production pages.
export const PREVIEW_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

.ap{
  --bg:#060606; --ink:#F5F2EB; --muted:#8d8678; --gold:#C9A84C; --gold-2:#E9CE88;
  --green:#62e36a; --blue:#6bb6ff; --violet:#a987ff; --amber:#F0A93C;
  --ease:cubic-bezier(0.23,1,0.32,1);
  min-height:100dvh;background:var(--bg);color:var(--ink);position:relative;overflow-x:hidden;
  font-family:'Plus Jakarta Sans',system-ui,sans-serif;
}
.ap *{box-sizing:border-box;}
.orb{position:fixed;border-radius:50%;filter:blur(90px);opacity:0.55;pointer-events:none;z-index:0;will-change:transform;}
.o1{width:48vw;height:48vw;top:-16vw;right:-8vw;background:radial-gradient(circle,rgba(201,168,76,0.55),transparent 70%);animation:drift1 22s var(--ease) infinite;}
.o2{width:40vw;height:40vw;top:8vh;left:-12vw;background:radial-gradient(circle,rgba(107,182,255,0.4),transparent 70%);animation:drift2 26s var(--ease) infinite;}
.o3{width:42vw;height:42vw;bottom:-14vw;right:4vw;background:radial-gradient(circle,rgba(98,227,106,0.32),transparent 70%);animation:drift3 30s var(--ease) infinite;}
.o4{width:34vw;height:34vw;bottom:6vh;left:18vw;background:radial-gradient(circle,rgba(169,135,255,0.3),transparent 70%);animation:drift1 28s var(--ease) infinite reverse;}
@keyframes drift1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-6vw,5vh) scale(1.1)}}
@keyframes drift2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(7vw,-4vh) scale(1.08)}}
@keyframes drift3{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-5vw,-6vh) scale(1.12)}}
.grain{position:fixed;inset:0;pointer-events:none;z-index:1;opacity:0.04;mix-blend-mode:overlay;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");}
.dots{position:fixed;inset:0;pointer-events:none;z-index:1;opacity:0.5;
  background-image:radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px);background-size:34px 34px;
  mask:radial-gradient(70vw 70vh at 50% 30%, #000, transparent 75%);}
.wrap{position:relative;z-index:2;max-width:1160px;margin:0 auto;padding:36px 24px 90px;}
.disp{font-family:'Bricolage Grotesque',sans-serif;font-weight:700;letter-spacing:-0.025em;line-height:0.95;}
.shimmer{background:linear-gradient(100deg,#F5F2EB 18%,#E9CE88 38%,#C9A84C 50%,#F5F2EB 70%);
  background-size:220% auto;-webkit-background-clip:text;background-clip:text;color:transparent;animation:shine 7s linear infinite;}
@keyframes shine{to{background-position:-220% center;}}
.eyebrow{display:inline-flex;align-items:center;gap:8px;border-radius:999px;padding:6px 13px;
  font-size:10px;letter-spacing:0.24em;text-transform:uppercase;font-weight:700;color:var(--gold-2);
  background:rgba(201,168,76,0.07);border:1px solid rgba(201,168,76,0.28);}
.card{position:relative;border-radius:26px;background:linear-gradient(180deg,rgba(20,18,16,0.86),rgba(11,10,9,0.92));
  backdrop-filter:blur(14px);box-shadow:0 30px 60px -30px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.06);
  transition:transform .7s var(--ease), box-shadow .7s var(--ease);}
.card::before{content:'';position:absolute;inset:0;border-radius:inherit;padding:1px;pointer-events:none;
  background:linear-gradient(145deg,rgba(233,206,136,0.55),rgba(255,255,255,0.05) 38%,rgba(107,182,255,0.28));
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;}
.card:hover{transform:translateY(-4px);box-shadow:0 40px 80px -28px rgba(0,0,0,0.95), 0 0 0 1px rgba(201,168,76,0.12), inset 0 1px 0 rgba(255,255,255,0.08);}
.pill{display:inline-flex;align-items:center;gap:12px;border-radius:999px;cursor:pointer;font-weight:600;font-size:14px;
  border:1px solid transparent;transition:transform .5s var(--ease),filter .4s var(--ease),background .4s var(--ease);}
.pill:active{transform:scale(0.97);}
.gold{background:linear-gradient(180deg,var(--gold-2),var(--gold));color:#231900;padding:13px 14px 13px 24px;box-shadow:0 12px 30px -10px rgba(201,168,76,0.6);}
.gold:hover{filter:brightness(1.06);}
.ghost{background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.1);color:var(--ink);padding:11px 12px 11px 16px;}
.ghost:hover{background:rgba(255,255,255,0.1);}
.ibtn{width:32px;height:32px;border-radius:999px;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.2);transition:transform .5s var(--ease);}
.pill:hover .ibtn{transform:translate(3px,-2px) rotate(-3deg);}
.menu{display:inline-flex;align-items:center;gap:7px;border-radius:999px;padding:8px 15px;font-size:12px;font-weight:600;
  cursor:pointer;color:#d3cebf;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);transition:background .4s var(--ease);}
.menu:hover{background:rgba(255,255,255,0.12);}
.back{display:inline-flex;align-items:center;gap:11px;padding:8px 18px 8px 8px;border-radius:999px;margin-bottom:22px;
  background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);color:#d3cebf;font-size:13px;font-weight:600;
  text-decoration:none;cursor:pointer;transition:background .4s var(--ease),border-color .4s var(--ease);}
.back:hover{background:rgba(255,255,255,0.08);border-color:rgba(201,168,76,0.4);}
.back-ic{width:28px;height:28px;border-radius:999px;display:flex;align-items:center;justify-content:center;
  background:rgba(0,0,0,0.25);color:var(--gold-2);transition:transform .5s var(--ease);}
.back:hover .back-ic{transform:translateX(-3px);}
.fl{font-size:10px;letter-spacing:0.13em;text-transform:uppercase;color:var(--muted);font-weight:700;}
.fv{font-size:15px;margin-top:6px;color:#efece5;}
.req{color:var(--amber);font-weight:700;}
.spill{font-size:11px;font-weight:700;letter-spacing:0.04em;padding:6px 13px;border-radius:999px;backdrop-filter:blur(8px);display:inline-flex;align-items:center;gap:7px;}
.dot{width:7px;height:7px;border-radius:50%;display:inline-block;}
.live{animation:pulse 2.4s var(--ease) infinite;}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(98,227,106,0.5)}70%{box-shadow:0 0 0 9px rgba(98,227,106,0)}100%{box-shadow:0 0 0 0 rgba(98,227,106,0)}}
@keyframes rise{from{opacity:0;transform:translateY(26px);filter:blur(8px)}to{opacity:1;transform:none;filter:none}}
.r{opacity:0;animation:rise .9s var(--ease) forwards;}
.inp{width:100%;background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.1);border-radius:14px;
  padding:13px 16px;color:var(--ink);font-size:15px;font-family:inherit;outline:none;transition:border-color .4s var(--ease),background .4s var(--ease);}
.inp:focus{border-color:rgba(201,168,76,0.6);background:rgba(0,0,0,0.5);}
.inp::placeholder{color:#5c5749;}
.chip{border-radius:999px;padding:8px 15px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid rgba(255,255,255,0.12);
  background:rgba(255,255,255,0.04);color:#cdc8bd;transition:all .4s var(--ease);}
.chip.on{background:linear-gradient(180deg,var(--gold-2),var(--gold));color:#231900;border-color:transparent;}
@media(max-width:820px){ .wrap{padding:26px 16px 70px;} .hide-sm{display:none!important;} }
`

// Shared shell: injects the CSS once, paints the orb mesh + textures, and
// centres content in .wrap.
export function PreviewShell({ children }: { children: ReactNode }) {
  return (
    <div className="ap">
      <style dangerouslySetInnerHTML={{ __html: PREVIEW_CSS }} />
      <div className="orb o1" /><div className="orb o2" /><div className="orb o3" /><div className="orb o4" />
      <div className="dots" /><div className="grain" />
      <div className="wrap">{children}</div>
    </div>
  )
}

// Styled "Back to garage" pill matching the design language.
export function BackToGarage({ href = '/account', label = 'Back to garage' }: { href?: string; label?: string }) {
  return (
    <a href={href} className="r back">
      <span className="back-ic"><Arrow dir="left" /></span>{label}
    </a>
  )
}

export function Arrow({ s = 14, dir = 'right' }: { s?: number; dir?: 'right' | 'left' }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
      style={dir === 'left' ? { transform: 'rotate(180deg)' } : undefined}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

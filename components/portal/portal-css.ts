// Portal styles, ported from the SIXSHEET-Portal reference and scoped under
// `.pscope` so they never leak into the rest of the CRM. Injected via a
// <style> tag in PortalView.
export const PORTAL_CSS = `
.pscope{
  --bg:#E9EAED; --bg-2:#F1F0EC;
  --card:#F7F4EE; --card-2:#FCFBF7; --card-hover:#FBF8F2;
  --ink:#100F0E; --ink-soft:#5E5A53; --faint:#A49F96;
  --line:#E7E2D9; --line-2:#DAD4C9;
  --accent:#FF5B3F; --on-accent:#ffffff; --accent-text:#C63E27;
  --accent-soft:color-mix(in srgb, var(--accent) 15%, var(--card));
  --accent-soft-ink:var(--accent-text);
  --neutral-soft:#ECE8E0; --neutral-soft-ink:#6E6A62;
  --shadow-sm:0 1px 2px rgba(24,20,14,.05);
  --shadow-md:0 2px 6px rgba(24,20,14,.05), 0 18px 40px -22px rgba(24,20,14,.22);
  --sans:'Inter','Noto Sans Thai',-apple-system,BlinkMacSystemFont,sans-serif;
  --mono:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace;
  --max:1200px; --pad-x:clamp(16px,3.5vw,40px);
  --r-card:20px; --r-row:13px; --r-pill:999px; --r-btn:10px;
  color:var(--ink); font-family:var(--sans); font-weight:400; line-height:1.5;
  min-height:100vh;
  background:
    radial-gradient(1200px 600px at 85% -10%, var(--bg-2), transparent 60%),
    radial-gradient(900px 500px at 0% 0%, var(--bg-2), transparent 55%),
    var(--bg);
  -webkit-font-smoothing:antialiased;
}
@media (prefers-color-scheme:dark){
  .pscope:not([data-theme="light"]){
    --bg:#0B0C0E; --bg-2:#111114;
    --card:#17181A; --card-2:#1D1E21; --card-hover:#202225;
    --ink:#F3F1EC; --ink-soft:#A8A39A; --faint:#6A655D;
    --line:#26282B; --line-2:#303236;
    --accent-soft:color-mix(in srgb, var(--accent) 26%, var(--card));
    --accent-soft-ink:color-mix(in srgb, var(--accent) 80%, #ffffff);
    --neutral-soft:#232427; --neutral-soft-ink:#9A958C;
    --shadow-sm:0 1px 2px rgba(0,0,0,.4);
    --shadow-md:0 2px 6px rgba(0,0,0,.3), 0 20px 44px -24px rgba(0,0,0,.7);
  }
}
.pscope[data-theme="dark"]{
  --bg:#0B0C0E; --bg-2:#111114;
  --card:#17181A; --card-2:#1D1E21; --card-hover:#202225;
  --ink:#F3F1EC; --ink-soft:#A8A39A; --faint:#6A655D;
  --line:#26282B; --line-2:#303236;
  --accent-soft:color-mix(in srgb, var(--accent) 26%, var(--card));
  --accent-soft-ink:color-mix(in srgb, var(--accent) 80%, #ffffff);
  --neutral-soft:#232427; --neutral-soft-ink:#9A958C;
  --shadow-sm:0 1px 2px rgba(0,0,0,.4);
  --shadow-md:0 2px 6px rgba(0,0,0,.3), 0 20px 44px -24px rgba(0,0,0,.7);
}

.pscope *{box-sizing:border-box}
.pscope a{color:inherit;text-decoration:none}
.pscope button{font-family:inherit;cursor:pointer;color:inherit;background:none;border:none}
.pscope .wrap{max-width:var(--max);margin:0 auto;padding:0 var(--pad-x)}
.pscope .eyebrow{font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--faint)}
.pscope .eyebrow .th{text-transform:none;letter-spacing:0;color:var(--faint)}

.pscope .topbar{position:sticky;top:0;z-index:60;background:color-mix(in srgb,var(--bg) 78%, transparent);backdrop-filter:saturate(140%) blur(12px);border-bottom:1px solid var(--line)}
.pscope .topbar-inner{max-width:var(--max);margin:0 auto;padding:13px var(--pad-x);display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.pscope .brandmark{display:flex;align-items:center;gap:11px}
.pscope .brandmark .dotm{width:22px;height:22px;border-radius:7px;background:var(--ink);display:flex;align-items:center;justify-content:center}
.pscope .brandmark .dotm::after{content:"";width:8px;height:8px;border-radius:50%;background:var(--accent)}
.pscope .brandmark .wm{font-weight:800;font-size:17px;letter-spacing:-.02em}
.pscope .brandmark .sub{font-size:11px;font-weight:500;color:var(--ink-soft);border-left:1px solid var(--line-2);padding-left:11px;margin-left:1px}
.pscope .topbar-right{display:flex;align-items:center;gap:9px;flex-wrap:wrap}

.pscope .switch{display:inline-flex;background:var(--card);border:1px solid var(--line);border-radius:var(--r-pill);padding:3px;box-shadow:var(--shadow-sm)}
.pscope .switch button{border:none;background:transparent;padding:7px 15px;border-radius:var(--r-pill);font-size:12.5px;font-weight:600;color:var(--ink-soft);display:inline-flex;align-items:center;gap:7px;transition:all .18s}
.pscope .switch button .dot{width:7px;height:7px;border-radius:50%;background:currentColor;opacity:.5}
.pscope .switch button[aria-pressed="true"]{background:var(--ink);color:var(--card)}
.pscope .switch button[data-mode="internal"][aria-pressed="true"]{background:var(--accent);color:var(--on-accent)}
.pscope .switch button[aria-pressed="true"] .dot{opacity:1}

.pscope .ghost-btn{display:inline-flex;align-items:center;gap:8px;background:var(--card);border:1px solid var(--line);border-radius:var(--r-btn);padding:8px 13px;font-size:12.5px;font-weight:600;color:var(--ink-soft);box-shadow:var(--shadow-sm);transition:all .18s}
.pscope .ghost-btn:hover{color:var(--ink);border-color:var(--line-2)}

.pscope .session{max-width:var(--max);margin:0 auto;padding:14px var(--pad-x) 0}
.pscope .session-inner{display:flex;align-items:center;gap:12px;flex-wrap:wrap;font-size:12.5px;color:var(--ink-soft)}
.pscope .chip{display:inline-flex;align-items:center;gap:8px;background:var(--card);border:1px solid var(--line);border-radius:var(--r-pill);padding:6px 13px;box-shadow:var(--shadow-sm);font-weight:500}
.pscope .chip b{color:var(--ink);font-weight:600}
.pscope .chip .live{width:7px;height:7px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
.pscope .session .mline{margin-left:auto;font-size:12px;font-weight:500;color:var(--faint)}

.pscope .tabs{max-width:var(--max);margin:0 auto;padding:16px var(--pad-x) 4px}
.pscope .tabs-inner{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px}
.pscope .tab{flex-shrink:0;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:11px 15px;display:flex;flex-direction:column;gap:2px;text-align:left;box-shadow:var(--shadow-sm);transition:all .18s;min-width:132px}
.pscope .tab .tname{font-weight:700;font-size:14.5px;letter-spacing:-.01em}
.pscope .tab .tmeta{font-size:10.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--faint)}
.pscope .tab:hover{border-color:var(--line-2);transform:translateY(-1px)}
.pscope .tab[aria-selected="true"]{background:var(--ink);border-color:var(--ink)}
.pscope .tab[aria-selected="true"] .tname{color:var(--card)}
.pscope .tab[aria-selected="true"] .tmeta{color:var(--accent)}

.pscope .portal-main{padding-top:18px;padding-bottom:20px}
.pscope .ast{color:var(--accent-text)}

.pscope .cover{background:var(--card);border:1px solid var(--line);border-radius:var(--r-card);box-shadow:var(--shadow-md);padding:clamp(20px,3vw,34px);margin-bottom:16px}
.pscope .cover-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:clamp(20px,3vw,40px);align-items:center}
.pscope .cover h1{font-weight:800;font-size:clamp(32px,5vw,58px);line-height:.98;letter-spacing:-.035em;margin:12px 0 0;text-wrap:balance}
.pscope .cover h1 .ast{color:var(--accent)}
.pscope .cover .tagline{font-size:clamp(14.5px,1.3vw,17px);color:var(--ink-soft);max-width:48ch;margin-top:12px}
.pscope .logo-ph{aspect-ratio:16/8;border-radius:14px;overflow:hidden;background:repeating-linear-gradient(135deg,var(--card-2),var(--card-2) 11px,transparent 11px,transparent 22px), var(--neutral-soft);border:1px dashed var(--line-2);display:flex;align-items:center;justify-content:center;gap:8px;font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--faint);transition:all .18s}
.pscope div.logo-ph[role]:hover,.pscope .logo-ph[tabindex]:hover{border-color:var(--accent);color:var(--accent-text);background:color-mix(in srgb,var(--accent) 7%,var(--neutral-soft))}
.pscope .manage{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;color:var(--accent-soft-ink);background:var(--accent-soft);border-radius:var(--r-pill);padding:7px 13px;margin-top:16px}
.pscope .manage:hover{background:var(--accent);color:var(--on-accent)}
.pscope .addv{color:var(--accent-soft-ink);font-weight:600;font-style:normal}
.pscope .addv:hover{color:var(--accent)}
.pscope .cover-meta{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}
.pscope .cover-meta .row{background:var(--card-2);border:1px solid var(--line);border-radius:11px;padding:11px 13px;display:flex;flex-direction:column;gap:3px}
.pscope .cover-meta .k{font-size:10.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--faint)}
.pscope .cover-meta .kth{display:block;margin-top:2px;font-size:11px;font-weight:500;letter-spacing:0;text-transform:none;color:var(--faint)}
.pscope .cover-meta .v{font-size:14px;font-weight:600;text-align:left}
.pscope .cover-meta .v.empty{color:var(--faint);font-weight:400;font-style:italic}

.pscope .section{background:var(--card);border:1px solid var(--line);border-radius:var(--r-card);box-shadow:var(--shadow-md);padding:clamp(16px,2.4vw,26px);margin-bottom:14px}
.pscope .section-head{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:14px}
.pscope .section-head .lead{display:flex;align-items:center;gap:13px}
.pscope .section-head .snum{width:30px;height:30px;border-radius:9px;background:var(--card-2);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:12px;color:var(--ink-soft);flex-shrink:0}
.pscope .section-head h2{font-weight:700;font-size:clamp(18px,2vw,23px);letter-spacing:-.02em;line-height:1.1;margin:0}
.pscope .section-head .th-title{font-size:13.5px;font-weight:600;color:var(--ink-soft);margin-top:2px;line-height:1.25}
.pscope .section-head .desc{font-size:12.5px;color:var(--faint);margin-top:2px}

.pscope .pill{display:inline-flex;align-items:center;gap:6px;border-radius:var(--r-pill);font-size:11px;font-weight:600;letter-spacing:.04em;padding:5px 11px;white-space:nowrap}
.pscope .pill.public{background:var(--neutral-soft);color:var(--neutral-soft-ink)}
.pscope .pill.internal{background:var(--accent-soft);color:var(--accent-soft-ink)}
.pscope .pill .pd{width:6px;height:6px;border-radius:50%;background:currentColor}

.pscope .ledger{display:flex;flex-direction:column;gap:6px}
.pscope .res{display:grid;grid-template-columns:26px 1fr auto;gap:14px;align-items:center;padding:13px 12px;border-radius:var(--r-row);border:1px solid transparent;transition:all .15s;width:100%;text-align:left}
.pscope .res:hover{background:var(--card-hover);border-color:var(--line)}
.pscope .res .idx{font-family:var(--mono);font-size:12px;color:var(--faint)}
.pscope .res .main{min-width:0}
.pscope .res .rname{font-size:15.5px;font-weight:600;letter-spacing:-.01em;display:flex;align-items:center;gap:9px;flex-wrap:wrap}
.pscope .res .rsub{font-size:12px;color:var(--ink-soft);margin-top:3px;display:flex;gap:7px;flex-wrap:wrap;align-items:center}
.pscope .res .rsub .sep{color:var(--faint);opacity:.6}
.pscope .res .rsub .empty{color:var(--faint);font-style:italic}
.pscope .res .right{display:flex;align-items:center;gap:11px;justify-self:end}

.pscope .open{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:600;background:var(--card-2);border:1px solid var(--line);border-radius:var(--r-btn);padding:8px 13px;color:var(--ink);transition:all .18s}
.pscope .open:hover{background:var(--ink);color:var(--card);border-color:var(--ink)}
.pscope .open .arw{transition:transform .18s}
.pscope .res:hover .open .arw{transform:translateX(2px)}
.pscope .open.disabled{color:var(--faint);background:transparent;border-style:dashed;pointer-events:none}
.pscope .open.add{color:var(--accent-soft-ink);background:var(--accent-soft);border-color:transparent}
.pscope .open.add:hover{background:var(--accent);color:var(--on-accent);border-color:var(--accent)}
.pscope .edit{font-size:12px;font-weight:600;color:var(--faint);padding:8px 4px;border-radius:8px}
.pscope .edit:hover{color:var(--accent)}
.pscope .empty-note{padding:12px;color:var(--faint);font-size:13px;font-style:italic}

.pscope .res.ghost{grid-template-columns:26px 1fr}
.pscope .res.ghost:hover{border-color:var(--line-2);background:var(--card-hover)}
.pscope .add-line{display:flex;align-items:center;gap:10px;color:var(--faint);font-size:13.5px;font-weight:500;font-style:italic}
.pscope .add-line .plus{width:22px;height:22px;border-radius:7px;border:1px dashed var(--line-2);display:flex;align-items:center;justify-content:center;font-style:normal;font-size:15px;line-height:1}

.pscope .how{max-width:var(--max);margin:22px auto 0;padding:0 var(--pad-x)}
.pscope .how-card{background:var(--ink);color:var(--card);border-radius:var(--r-card);padding:clamp(24px,3.4vw,40px);box-shadow:var(--shadow-md)}
.pscope .how-card h3{font-weight:800;font-size:clamp(21px,2.6vw,32px);letter-spacing:-.02em;max-width:22ch;line-height:1.05;margin:0}
.pscope .how-card h3 em{font-style:normal;color:var(--accent)}
.pscope .how-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:26px}
.pscope .how-cell{background:color-mix(in srgb,var(--card) 8%,transparent);border:1px solid color-mix(in srgb,var(--card) 14%,transparent);border-radius:14px;padding:20px 18px}
.pscope .how-cell .cn{font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--accent)}
.pscope .how-cell h4{font-weight:600;font-size:15px;margin:11px 0 7px;color:var(--card)}
.pscope .how-cell p{font-size:13px;color:color-mix(in srgb,var(--card) 60%,var(--ink));line-height:1.55;margin:0}
.pscope .how-cell code{font-family:var(--mono);font-size:11.5px;color:var(--accent);background:color-mix(in srgb,var(--accent) 13%,transparent);padding:1px 6px;border-radius:5px}

.pscope footer{max-width:var(--max);margin:20px auto 0;padding:22px var(--pad-x) 34px;display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;font-size:12px;color:var(--faint);border-top:1px solid var(--line)}

@media (max-width:820px){
  .pscope .cover-grid{grid-template-columns:1fr}
  .pscope .how-grid{grid-template-columns:1fr}
  .pscope .res{grid-template-columns:22px 1fr;gap:11px}
  .pscope .res .right{grid-column:2;justify-self:start;margin-top:9px}
}
@media (prefers-reduced-motion:reduce){.pscope *{transition:none!important}}
.pscope :focus-visible{outline:2px solid var(--accent);outline-offset:2px}
`

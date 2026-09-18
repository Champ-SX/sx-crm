// Portal styles — editorial / Swiss system (Pentagram × IDEO). Typography,
// hairline rules and whitespace carry the design; one per-company accent does
// functional work (~20%). Scoped under `.pscope`; injected via <style>.
export const PORTAL_CSS = `
.pscope{
  --paper:#F7F7F4; --ink:#111111; --soft:#666666; --faint:#A3A099; --line:#DADADA; --line-soft:#E6E5E1;
  --accent:#FF5B3F; --on-accent:#ffffff; --accent-text-light:#C6462A;
  --accent-text:var(--accent-text-light);
  --sans:'Inter','Noto Sans Thai',-apple-system,BlinkMacSystemFont,sans-serif;
  --mono:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace;
  --max:1160px; --padx:clamp(20px,5vw,64px);
  color:var(--ink); font-family:var(--sans); font-weight:400; line-height:1.5;
  background:var(--paper); min-height:100vh; -webkit-font-smoothing:antialiased;
}
@media (prefers-color-scheme:dark){ .pscope:not([data-theme="light"]){
  --paper:#0D0D0D; --ink:#F4F4F1; --soft:#9A9A95; --faint:#6A6A64; --line:#282826; --line-soft:#1E1E1C;
  --accent-text:color-mix(in srgb, var(--accent) 88%, #ffffff);
}}
.pscope[data-theme="dark"]{
  --paper:#0D0D0D; --ink:#F4F4F1; --soft:#9A9A95; --faint:#6A6A64; --line:#282826; --line-soft:#1E1E1C;
  --accent-text:color-mix(in srgb, var(--accent) 88%, #ffffff);
}

.pscope *{box-sizing:border-box}
.pscope a{color:inherit;text-decoration:none}
.pscope button{font-family:inherit;cursor:pointer;color:inherit;background:none;border:none;padding:0}
.pscope .inner{max-width:var(--max);margin:0 auto;padding:0 var(--padx)}
.pscope .ast{color:var(--accent-text)}

/* ---------- top bar ---------- */
.pscope .topbar{position:sticky;top:0;z-index:60;background:color-mix(in srgb,var(--paper) 88%, transparent);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
.pscope .topbar-inner{max-width:var(--max);margin:0 auto;padding:14px var(--padx);display:flex;align-items:center;justify-content:space-between;gap:16px}
.pscope .brandwrap{display:flex;flex-direction:column;gap:2px}
.pscope .brandmark{display:flex;align-items:center;gap:9px}
.pscope .brand-logo{width:24px;height:24px;object-fit:contain;flex-shrink:0}
.pscope[data-theme="dark"] .brand-logo{filter:invert(1)}
@media (prefers-color-scheme:dark){.pscope:not([data-theme="light"]) .brand-logo{filter:invert(1)}}
.pscope .wm{font-size:13px;font-weight:500;letter-spacing:.04em}
.pscope .sub{font-size:11.5px;font-weight:400;color:var(--soft);border-left:1px solid var(--line);padding-left:9px;margin-left:1px}
.pscope .backlink{font-size:11.5px;font-weight:500;color:var(--accent-text);padding-left:33px;width:fit-content;transition:opacity .2s}
.pscope .backlink:hover{opacity:.65}
.pscope .topbar-right{display:flex;align-items:center;gap:14px}
.pscope .switch{display:inline-flex;border:1px solid var(--line);border-radius:4px;overflow:hidden}
.pscope .switch button{font-size:12px;font-weight:500;padding:6px 13px;color:var(--soft);transition:all .18s}
.pscope .switch button .dot{display:none}
.pscope .switch button[aria-pressed="true"]{background:var(--accent);color:var(--on-accent)}
.pscope .ghost-btn{font-size:12.5px;font-weight:500;color:var(--soft);transition:color .18s}
.pscope .ghost-btn:hover{color:var(--ink)}

/* ---------- session strip (admin) ---------- */
.pscope .session{border-bottom:1px solid var(--line)}
.pscope .session-inner{max-width:var(--max);margin:0 auto;padding:10px var(--padx);display:flex;align-items:center;gap:12px;font-size:12px;color:var(--soft)}
.pscope .chip{display:inline-flex;align-items:center;gap:7px}
.pscope .chip b{color:var(--ink);font-weight:500}
.pscope .chip .live{width:6px;height:6px;border-radius:50%;background:var(--accent)}
.pscope .mline{color:var(--faint)}

/* ---------- company index (admin only) ---------- */
.pscope .tabs{border-bottom:1px solid var(--line)}
.pscope .tabs-inner{max-width:var(--max);margin:0 auto;padding:11px var(--padx);display:flex;gap:10px;align-items:center;overflow-x:auto}
.pscope .tab{flex-shrink:0;font-size:13px;font-weight:400;color:var(--soft);padding:5px 4px;transition:color .18s;white-space:nowrap}
.pscope .tab:hover{color:var(--ink)}
.pscope .tab .tmeta{display:none}
.pscope .tab[aria-selected="true"]{background:var(--accent);color:var(--on-accent);font-weight:600;padding:5px 13px;border-radius:3px}
.pscope .tab[aria-selected="true"] .tname{color:var(--on-accent)}

.pscope .portal-main{max-width:var(--max);margin:0 auto;padding:0 var(--padx) 40px}

/* ---------- share strip (admin) ---------- */
.pscope .sharebar{display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding:22px 0;border-bottom:1px solid var(--line)}
.pscope .sb-ic{display:none}
.pscope .sb-u{flex:1;min-width:160px}
.pscope .sb-u b{display:block;font-size:16px;font-weight:500;color:var(--ink)}
.pscope .sb-th{display:block;font-size:12.5px;color:var(--soft);margin-top:2px}
.pscope .sb-acts{display:flex;align-items:center;gap:18px}
.pscope .sb-share{display:inline-flex;align-items:center;gap:7px;font-size:14px;font-weight:500;color:var(--ink);border-bottom:1px solid var(--ink);padding-bottom:2px;transition:opacity .18s}
.pscope .sb-share:hover{opacity:.6}
.pscope .sb-cta{display:inline-flex;align-items:center;gap:8px;font-size:13.5px;font-weight:600;color:var(--on-accent);background:var(--accent);border-radius:4px;padding:11px 18px;transition:filter .18s}
.pscope .sb-cta:hover{filter:brightness(.94)}
.pscope .sb-cta.done{background:var(--ink);color:var(--paper)}

/* ---------- cover / hero ---------- */
.pscope .cover{padding-top:clamp(22px,3vw,34px)}
.pscope .hero{display:grid;grid-template-columns:1fr;gap:18px}
.pscope .hero.has-logo{grid-template-columns:1fr minmax(130px,168px);align-items:center}
.pscope .eyebrow{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--faint);font-weight:600;margin-bottom:10px}
.pscope .eyebrow .th{letter-spacing:0;text-transform:none;font-weight:400}
.pscope .cover h1{font-weight:500;font-size:clamp(38px,5vw,56px);line-height:.98;letter-spacing:-.035em;margin:0;text-wrap:balance}
.pscope .tagline{font-size:clamp(14px,1.2vw,16px);line-height:1.45;color:var(--soft);max-width:46ch;margin-top:12px}
.pscope .editlink{display:inline-block;margin-top:12px;font-size:12.5px;font-weight:500;color:var(--accent-text);border-bottom:1px solid var(--accent-text);padding-bottom:1px}
.pscope .logo-ph{aspect-ratio:16/9;border:1px dashed var(--line);border-radius:4px;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--faint);transition:border-color .18s}
.pscope a.logo-ph:hover,.pscope div.logo-ph[tabindex]:hover{border-color:var(--accent)}
.pscope .accrule{border-top:3px solid var(--accent);margin-top:clamp(18px,2.5vw,26px)}

/* meta — label / content rows (compact; this is metadata, not the main event) */
.pscope .meta{margin-top:0}
.pscope .lc{display:grid;grid-template-columns:200px 1fr;gap:16px;padding:9px 0;border-top:1px solid var(--line);align-items:baseline}
.pscope .lc:first-child{border-top:none}
.pscope .meta .lc:first-child{border-top:1px solid var(--line)}
.pscope .lc .k{font-size:12px;color:var(--soft)}
.pscope .lc .kth{color:var(--faint)}
.pscope .lc .v{font-size:14.5px;font-weight:500;text-align:left}
.pscope .lc .v.empty{color:var(--faint);font-weight:400}
.pscope .lc .addv{font-size:13.5px;font-weight:500;color:var(--accent-text)}

/* ---------- documents (download cards) ---------- */
.pscope .docs{margin-top:clamp(30px,5vw,48px)}
.pscope .docs-eyebrow{border-left:3px solid var(--accent);padding-left:12px;font-size:12.5px;font-weight:600;color:var(--accent-text);margin-bottom:20px}
.pscope .docs-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.pscope .doc-card{border:1px solid var(--line);border-radius:12px;padding:20px 20px 18px;background:color-mix(in srgb, var(--ink) 3%, transparent)}
.pscope .doc-head{display:flex;align-items:flex-start;gap:10px;margin-bottom:16px}
.pscope .doc-card h3{flex:1;font-size:20px;font-weight:500;letter-spacing:-.01em;line-height:1.25}
.pscope .doc-acts{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.pscope .doc-dl{display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:var(--on-accent);background:var(--accent);border-radius:999px;padding:10px 18px;transition:filter .18s}
.pscope .doc-dl:hover{filter:brightness(.94)}
.pscope .doc-dl[aria-disabled="true"]{opacity:.5;pointer-events:none}
.pscope .doc-sh{display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:500;color:var(--ink);border:1px solid var(--line);border-radius:999px;padding:10px 18px;transition:border-color .18s}
.pscope .doc-sh:hover{border-color:var(--ink)}
.pscope .doc-edit{font-size:13px;color:var(--soft);margin-left:2px;transition:color .18s}
.pscope .doc-edit:hover{color:var(--ink)}
.pscope .docs-add{margin-top:16px}
@media (max-width:640px){.pscope .docs-grid{grid-template-columns:1fr}}

/* ---------- section (resource index) ---------- */
.pscope .section{margin-top:clamp(30px,5vw,48px)}
.pscope .section-head{display:flex;align-items:baseline;gap:15px;padding-bottom:14px;border-bottom:1px solid var(--line)}
.pscope .section-head .lead{display:flex;align-items:baseline;gap:15px;flex:1;min-width:0}
.pscope .snum{font-size:19px;font-weight:600;color:var(--accent-text);font-variant-numeric:tabular-nums}
.pscope .section-head h2{font-weight:500;font-size:clamp(22px,3vw,28px);letter-spacing:-.02em;line-height:1}
.pscope .th-title{font-size:13px;font-weight:400;color:var(--faint);margin-top:2px}
.pscope .section-head .desc{display:none}
.pscope .pill{display:inline-flex;align-items:center;gap:6px;font-size:10.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;padding:4px 10px;border-radius:3px;white-space:nowrap;align-self:center}
.pscope .pill .pd{display:none}
.pscope .pill.internal{background:var(--accent);color:var(--on-accent)}
.pscope .pill.public{background:transparent;color:var(--accent-text);border:1px solid var(--accent-text)}

.pscope .ledger{display:flex;flex-direction:column}
.pscope .res{display:grid;grid-template-columns:30px 1fr auto;align-items:baseline;gap:18px;padding:17px 0;border-top:1px solid var(--line);transition:padding-left .25s cubic-bezier(.22,1,.36,1)}
.pscope .res:first-child{border-top:none}
.pscope .res:hover{padding-left:6px}
.pscope .res .idx{font-family:var(--mono);font-size:12px;color:var(--faint)}
.pscope .res .main{min-width:0}
.pscope .res .rname{font-size:clamp(18px,2.4vw,22px);font-weight:500;letter-spacing:-.01em;line-height:1.1}
.pscope .res .rsub{font-size:13.5px;color:var(--soft);margin-top:4px;display:flex;gap:7px;flex-wrap:wrap;align-items:center}
.pscope .res .rsub .sep{color:var(--faint)}
.pscope .res .rsub .empty{color:var(--faint)}
.pscope .rurl{display:flex;align-items:center;gap:8px;margin-top:7px}
.pscope .urltext{font-family:var(--mono);font-size:12px;color:var(--soft);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pscope .res .right{display:flex;align-items:center;gap:16px;justify-self:end;align-self:center}
.pscope .open{font-size:14px;font-weight:500;color:var(--ink);white-space:nowrap;border-bottom:1px solid currentColor;padding-bottom:2px;transition:opacity .18s}
.pscope .open:hover{opacity:.6}
.pscope .open .arw{color:inherit}
.pscope .open.add{color:var(--accent-text);border-bottom-color:var(--accent-text)}
.pscope .open.disabled{color:var(--faint);pointer-events:none;border-bottom-color:transparent}
.pscope .edit{font-size:13px;font-weight:400;color:var(--soft);transition:color .18s}
.pscope .edit:hover{color:var(--ink)}
.pscope .empty-note{padding:16px 0;color:var(--faint);font-size:14px;border-top:1px solid var(--line)}
.pscope .res.ghost{grid-template-columns:30px 1fr;cursor:pointer}
.pscope .add-line{display:flex;align-items:center;gap:9px;color:var(--accent-text);font-size:14px;font-weight:500}
.pscope .add-line .plus,.pscope .add-block .plus{width:20px;height:20px;border:1px solid var(--accent-text);border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:14px;line-height:1}

/* small copy button (used on urls + detail lines) */
.pscope .cpbtn{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border:1px solid var(--line);border-radius:4px;color:var(--soft);flex-shrink:0;transition:all .18s}
.pscope .cpbtn:hover{border-color:var(--ink);color:var(--ink)}
.pscope .cpbtn.done{background:var(--accent);color:var(--on-accent);border-color:transparent}
.pscope .cpbtn.cpsm{width:24px;height:24px;border-radius:3px}

/* ---------- detail block ---------- */
.pscope .dblock{margin-top:clamp(30px,5vw,48px)}
.pscope .dblock .section-head{align-items:baseline}
.pscope .dblock-ic{display:none}
.pscope .dblock-meta{display:flex;align-items:center;gap:16px}
.pscope .dblock-body{padding-top:4px}
.pscope .dblock-name{padding:16px 0 6px}
.pscope .dblock-name b{display:block;font-size:17px;font-weight:500}
.pscope .dblock-name span{display:block;font-size:13.5px;color:var(--soft);margin-top:2px}
.pscope .dline{display:grid;grid-template-columns:150px 1fr auto;gap:16px;align-items:baseline;padding:14px 0;border-top:1px solid var(--line)}
.pscope .dlk{font-size:12px;color:var(--soft)}
.pscope .dlv{font-size:16px;font-weight:500;line-height:1.5;word-break:break-word}
.pscope .copyall{display:inline-flex;align-items:center;gap:8px;margin-top:16px;font-size:13.5px;font-weight:600;color:var(--on-accent);background:var(--accent);border-radius:4px;padding:11px 18px;transition:filter .18s}
.pscope .copyall:hover{filter:brightness(.94)}
.pscope .copyall.done{background:var(--ink);color:var(--paper)}
.pscope .add-block{display:flex;align-items:center;gap:9px;color:var(--accent-text);font-size:14px;font-weight:500;margin-top:clamp(30px,5vw,48px);padding:16px 0;border-top:1px solid var(--line);width:100%}

/* ---------- how (admin explainer) ---------- */
.pscope .how{border-top:1px solid var(--line);margin-top:20px}
.pscope .how-card{max-width:var(--max);margin:0 auto;padding:clamp(40px,6vw,72px) var(--padx)}
.pscope .how-card h3{font-weight:500;font-size:clamp(24px,3.4vw,38px);letter-spacing:-.025em;max-width:20ch;line-height:1.05;margin:0}
.pscope .how-card h3 em{font-style:normal;color:var(--accent-text)}
.pscope .how-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;margin-top:44px}
.pscope .how-cell .cn{font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--accent-text)}
.pscope .how-cell h4{font-weight:500;font-size:16px;margin:12px 0 8px}
.pscope .how-cell p{font-size:14px;color:var(--soft);line-height:1.55;margin:0}
.pscope .how-cell code{font-family:var(--mono);font-size:12px;color:var(--accent-text)}

/* ---------- footer ---------- */
.pscope footer{border-top:1px solid var(--line)}
.pscope footer{max-width:var(--max);margin:0 auto;padding:24px var(--padx) 40px;display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;font-size:11.5px;color:var(--faint)}

@media (max-width:760px){
  .pscope .hero.has-logo{grid-template-columns:1fr}
  .pscope .lc{grid-template-columns:1fr;gap:4px}
  .pscope .dline{grid-template-columns:1fr auto;gap:10px}
  .pscope .dlk{grid-column:1/-1}
  .pscope .how-grid{grid-template-columns:1fr;gap:24px}
  .pscope .res{grid-template-columns:24px 1fr;gap:12px}
  .pscope .res .right{grid-column:2;justify-self:start;margin-top:10px}
  .pscope .sub{display:none}
}
@media (prefers-reduced-motion:reduce){.pscope *{transition:none!important}}
.pscope :focus-visible{outline:2px solid var(--accent);outline-offset:2px}
`

// Machine registry — from the "MACHINE NO." Google Sheet (19 Nov 2026).
// Joined to sales by number (SX044 → 44 = T044; SXC073 → 73 = C073). Numbers are unique across prefixes.
// Insights only; client reports don't use this.

export type BoothType = 'space' | 'event' | 'store' | 'kiosk' | 'laos'
export interface Machine { code: string; no: number; name: string; type: BoothType }

export const BOOTH_TYPES: { id: BoothType | 'unassigned'; label: string; sub: string; color: string }[] = [
  { id: 'space', label: 'Space activation', sub: 'K001–K015 · GP share with landlord', color: '#2F6FDB' },
  { id: 'event', label: 'Event', sub: 'K016–K037 · moves every event', color: '#C8643B' },
  { id: 'store', label: 'Store', sub: 'True · Andy & Fine · Phuket', color: '#1E9E62' },
  { id: 'kiosk', label: 'Moshi Moshi', sub: 'M201–M208', color: '#7A5AA5' },
  { id: 'laos', label: 'Laos', sub: 'L021–L026', color: '#D9822B' },
  { id: 'unassigned', label: 'Unassigned', sub: 'not in the machine sheet', color: '#A8A39A' },
]

const K: [number, string][] = [
  [1, 'RIVERCITY Fl.3'], [2, 'นิทรรศการรัตนโกสินทร์'], [3, 'Woot Woot'], [4, 'BACC'], [5, 'CTW AKARA BANGKOK'],
  [6, 'Neighbor Thonglor'], [7, 'QSNCC Fl. LM'], [8, 'QSNCC Fl. LG'], [9, 'ตู้ว่างรอทำ Event'], [10, 'Museum Siam'],
  [11, "Dog's dream"], [12, 'Such a small world'], [13, 'Dib bangkok'], [14, 'LOW KEY'], [15, 'ว่างตู้ใหญ่บ้านเพื่อน'],
  [16, 'BOX SHOT (EVENT)'], [17, 'EVENT TOPVIEW01'], [18, 'EVENT TOPVIEW02'], [19, 'KTB HQ'], [20, 'Event (portable)'],
  [32, 'Event (portable)'], [33, 'Event (portable)'], [34, "What's in my bag (from ANDY)"], [35, "What's in my bag (new)"],
  [36, 'Tally (new)'], [37, 'Receipt Photobooth'],
]
const pad3 = (n: number) => String(n).padStart(3, '0')
export const MACHINES: Machine[] = [
  ...K.map(([no, name]) => ({ code: `K${pad3(no)}`, no, name, type: (no <= 15 ? 'space' : 'event') as BoothType })),
  ...[60, 61, 62, 63, 64, 65, 66].map((no) => ({ code: `A${pad3(no)}`, no, name: 'Andy & Fine BACC', type: 'store' as const })),
  ...[71, 72, 73, 74].map((no) => ({ code: `C${pad3(no)}`, no, name: 'Andy & Fine Cloud11', type: 'store' as const })),
  ...[80, 81, 82, 83, 84, 85, 86].map((no) => ({ code: `B${pad3(no)}`, no, name: 'Andy & Fine BTT', type: 'store' as const })),
  ...([[51, 'PKT POSE Office 01'], [52, 'PKT POSE Office 02'], [53, 'PKT POSE Office 03'], [54, 'PKT POSE Print Station'], [55, 'PKT POSE Portable 04'],
    [56, 'PKT POSE Office 05'], [57, 'PKT POSE Print Sticker'], [58, 'The moment Pattaya'], [59, 'Front PKT Office']] as [number, string][])
    .map(([no, name]) => ({ code: `F${pad3(no)}`, no, name, type: (no === 58 ? 'space' : 'store') as BoothType })),   // 58 = space activation (finance)
  ...([[40, 'TRUE FL3 Print Station'], [41, 'TRUE FL3-01'], [42, 'TRUE FL3-02'], [43, 'TRUE FL3-03'], [44, 'TRUE FL3-04'], [45, 'TRUE FL3-05'],
    [46, 'TRUE FL4-01'], [47, 'TRUE FL4-02'], [48, 'TRUE FL4-03'], [50, 'TRUE FL4 Print Station']] as [number, string][])
    .map(([no, name]) => ({ code: `T${pad3(no)}`, no, name, type: 'store' as const })),
  ...([[201, 'The Street Ratchada'], [202, 'Terminal Korat'], [203, 'Central Chiangmai'], [204, 'Union Mall'], [205, 'Moshi Moshi'], [206, 'Moshi Moshi'], [207, 'Moshi Moshi'], [208, 'Moshi Moshi']] as [number, string][])
    .map(([no, name]) => ({ code: `M${no}`, no, name, type: 'kiosk' as const })),
  ...([[21, 'LAOs Status Bar'], [22, 'LAOs Rest84'], [23, 'LAOs Baron Bar'], [24, 'LAOs Event Portable'], [25, 'LAOs Beyond cafe'], [26, 'LAOs Event Topview']] as [number, string][])
    .map(([no, name]) => ({ code: `L${pad3(no)}`, no, name, type: 'laos' as const })),
]
export const MACHINE_BY_NO = new Map(MACHINES.map((m) => [m.no, m]))
export const machineOf = (no: number | null | undefined) => (no == null ? undefined : MACHINE_BY_NO.get(no))
export const typeOf = (no: number | null | undefined): BoothType | 'unassigned' => machineOf(no)?.type ?? 'unassigned'

// ── Booth codes inside Won-job / Lead titles ──────────────────────────────────
// "2026.12.24-25 - 126 - ตู้ถอดประกอบ K032 - Event - THE NUTCRACKER @SiamPIC Hall"
// "… ตู้ถอดประกอบ K020, K032 - Event - …"  → [20, 32]
const CODE_RE = /\b([KTABCFLM])\s?(\d{2,3})\b/gi
/** Machine numbers named in a title that exist in the registry (with the code as written). */
export function boothCodesIn(text: string | null | undefined): { no: number; code: string; known: boolean }[] {
  if (!text) return []
  const out: { no: number; code: string; known: boolean }[] = []
  for (const m of text.matchAll(CODE_RE)) {
    const no = Number(m[2])
    const reg = MACHINE_BY_NO.get(no)
    const code = `${m[1].toUpperCase()}${m[2]}`
    // ignore things like "A3" paper sizes (1 digit) — regex needs 2+ digits; and numbers with no machine
    const known = !!reg && reg.code[0] === m[1].toUpperCase()
    if (!out.some((o) => o.code === code)) out.push({ no, code, known })
  }
  return out
}
/** "Event name @venue" part of a Won title (after "- Event -"), else the whole title. */
export function eventLabel(title: string): string {
  const m = /-\s*Event\s*-\s*(.+?)\s*-?\s*$/i.exec(title)
  return (m?.[1] ?? title).trim()
}

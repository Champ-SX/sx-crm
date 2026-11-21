// CAPTURES booth installation guide (Thai, for the on-site install team).
// The guide itself is a self-contained page in public/guides/booth-install.html.
export const metadata = { title: 'Booth install guide · SX CRM' }

export default function BoothInstallGuidePage() {
  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col lg:h-dvh">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2 text-[13px]">
        <span className="font-semibold">คู่มือติดตั้งตู้ · Booth install guide</span>
        <a href="/guides/booth-install.html" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Open full screen ↗</a>
      </div>
      <iframe src="/guides/booth-install.html" title="Booth install guide" className="w-full flex-1 border-0 bg-white" />
    </div>
  )
}

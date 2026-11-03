import { redirect } from 'next/navigation'

// Items & Suppliers was merged: items live on Stock / Equipment, shops on Suppliers.
export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams
  redirect(tab === 'suppliers' ? '/inventory/suppliers' : '/inventory/stock')
}

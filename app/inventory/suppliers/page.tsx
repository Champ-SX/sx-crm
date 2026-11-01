import { redirect } from 'next/navigation'

// Suppliers moved into Catalog (Items | Suppliers).
export default function SuppliersPage() {
  redirect('/inventory/catalog?tab=suppliers')
}

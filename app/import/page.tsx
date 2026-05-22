'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import * as XLSX from 'xlsx'
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, ChevronRight, X, Building2, User, ArrowLeft } from 'lucide-react'
import { useCRMStore } from '@/store/crm-store'
import type { Company, ContactPerson } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawRow {
  [key: string]: string
}

interface ParsedContact {
  contactName: string
  companyName: string
  email: string
  phone: string
  notes: string
  category: string   // Wedding / Event / Event Org / Hotel / etc.
}

interface ImportPreview {
  companies: Omit<Company, 'company_id' | 'created_at' | 'updated_at'>[]
  contacts: (Omit<ContactPerson, 'contact_id' | 'company_id' | 'created_at' | 'updated_at'> & { companyName: string })[]
  skipped: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clean(v: unknown): string {
  if (v == null) return ''
  return String(v).trim()
}

/** Detect and parse the "flat contact list" format (File 1) */
function parseFlatFormat(rows: RawRow[]): ParsedContact[] {
  // Expected cols: Email, Name, Telphone, Remark
  return rows
    .filter((r) => clean(r['Email']) || clean(r['Name']))
    .map((r) => ({
      contactName: clean(r['Name']),
      companyName: clean(r['Name']),       // Name IS the company/org in this file
      email:       clean(r['Email']),
      phone:       clean(r['Telphone']) || clean(r['Tel']) || clean(r['Phone']) || '',
      notes:       '',
      category:    clean(r['Remark']),
    }))
}

/** Detect and parse the "two-column mail list" format (File 2) */
function parseTwoColumnFormat(rawData: unknown[][]): ParsedContact[] {
  if (!rawData.length) return []

  // Find the header row (contains NAME, EMAIL)
  let headerRowIdx = -1
  for (let i = 0; i < Math.min(5, rawData.length); i++) {
    const row = rawData[i].map((v) => clean(v).toUpperCase())
    if (row.includes('NAME') && row.includes('EMAIL')) {
      headerRowIdx = i
      break
    }
  }
  if (headerRowIdx === -1) return []

  const headers = rawData[headerRowIdx].map((v) => clean(v).toUpperCase())

  // Section label row is one before headers
  const sectionRow = headerRowIdx > 0 ? rawData[headerRowIdx - 1] : []

  // Find left and right NAME column indices
  const leftNameIdx  = headers.indexOf('NAME')
  const rightNameIdx = headers.indexOf('NAME', leftNameIdx + 1)
  const hasRight     = rightNameIdx !== -1

  // Map header positions
  function colsFor(startIdx: number) {
    const slice = headers.slice(startIdx)
    return {
      name:  startIdx + slice.indexOf('NAME'),
      org:   startIdx + (slice.indexOf('ORGANIZATION') !== -1 ? slice.indexOf('ORGANIZATION') : slice.indexOf('ORG')),
      email: startIdx + slice.indexOf('EMAIL'),
      tel:   startIdx + (slice.indexOf('TEL.') !== -1 ? slice.indexOf('TEL.') : slice.indexOf('TEL')),
      notes: startIdx + (slice.indexOf('NOTES') !== -1 ? slice.indexOf('NOTES') : slice.indexOf('NOTE')),
    }
  }

  const leftCols  = colsFor(leftNameIdx)
  const rightCols = hasRight ? colsFor(rightNameIdx) : null

  // Section labels (e.g. "Wedding", "Event")
  const leftLabel  = clean(sectionRow[leftNameIdx])  || 'Contact'
  const rightLabel = hasRight ? (clean(sectionRow[rightNameIdx]) || 'Contact') : ''

  const results: ParsedContact[] = []

  for (let i = headerRowIdx + 1; i < rawData.length; i++) {
    const row = rawData[i]

    // Left section
    const lName  = clean(row[leftCols.name])
    const lEmail = clean(row[leftCols.email])
    const lOrg   = leftCols.org >= 0 ? clean(row[leftCols.org]) : ''
    const lTel   = leftCols.tel >= 0 ? clean(row[leftCols.tel]) : ''
    const lNotes = leftCols.notes >= 0 ? clean(row[leftCols.notes]) : ''

    if (lName || lEmail) {
      results.push({
        contactName: lName,
        companyName: lOrg || lName,
        email:       lEmail,
        phone:       lTel,
        notes:       lNotes,
        category:    leftLabel,
      })
    }

    // Right section
    if (rightCols) {
      const rName  = clean(row[rightCols.name])
      const rEmail = clean(row[rightCols.email])
      const rOrg   = rightCols.org >= 0 ? clean(row[rightCols.org]) : ''
      const rTel   = rightCols.tel >= 0 ? clean(row[rightCols.tel]) : ''
      const rNotes = rightCols.notes >= 0 ? clean(row[rightCols.notes]) : ''

      if (rName || rEmail) {
        results.push({
          contactName: rName,
          companyName: rOrg || rName,
          email:       rEmail,
          phone:       rTel,
          notes:       rNotes,
          category:    rightLabel,
        })
      }
    }
  }

  return results
}

/** Convert raw parsed contacts into Company + ContactPerson preview */
function buildPreview(contacts: ParsedContact[]): ImportPreview {
  const companyMap = new Map<string, Omit<Company, 'company_id' | 'created_at' | 'updated_at'>>()
  let skipped = 0

  for (const c of contacts) {
    const key = c.companyName.toLowerCase()
    if (!key) { skipped++; continue }
    if (!companyMap.has(key)) {
      companyMap.set(key, {
        company_name:  c.companyName,
        company_type:  inferCompanyType(c.category),
        email:         c.email || undefined,
        phone:         c.phone || undefined,
        notes:         c.notes || undefined,
      })
    }
  }

  const contactsList = contacts
    .filter((c) => c.contactName || c.email)
    .map((c) => ({
      name:        c.contactName || c.email,
      email:       c.email || undefined,
      phone:       c.phone || undefined,
      role:        c.category || undefined,
      notes:       c.notes || undefined,
      companyName: c.companyName,
    }))

  return {
    companies: Array.from(companyMap.values()),
    contacts:  contactsList,
    skipped,
  }
}

function inferCompanyType(category: string): Company['company_type'] {
  const c = category.toLowerCase()
  if (c.includes('wedding')) return 'organizer'
  if (c.includes('event org') || c.includes('agency')) return 'agency'
  if (c.includes('hotel')) return 'venue'
  if (c.includes('brand') || c.includes('end user') || c.includes('end-customer')) return 'brand'
  if (c.includes('organizer') || c.includes('org')) return 'organizer'
  return 'brand'
}

// ─── Step components ──────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: number }) {
  const steps = ['Upload', 'Preview', 'Done']
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((label, i) => {
        const num = i + 1
        const active = num === step
        const done   = num < step
        return (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              done   ? 'bg-green-500 text-white' :
              active ? 'bg-orange-500 text-white' :
                       'bg-slate-100 text-slate-400'
            }`}>
              {done ? <CheckCircle className="w-4 h-4" /> : num}
            </div>
            <span className={`text-sm font-medium ${active ? 'text-slate-800' : 'text-slate-400'}`}>{label}</span>
            {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-slate-300 mx-1" />}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const { companies: existingCompanies, contactPersons: existingContacts, addCompany, addContactPerson } = useCRMStore()

  const [step, setStep]         = useState<1 | 2 | 3>(1)
  const [fileName, setFileName] = useState('')
  const [preview, setPreview]   = useState<ImportPreview | null>(null)
  const [error, setError]       = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState({ companies: 0, contacts: 0, skipped: 0 })

  // ── File parsing ─────────────────────────────────────────────────────────

  const parseFile = useCallback((file: File) => {
    setError('')
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb   = XLSX.read(data, { type: 'array' })

        let allContacts: ParsedContact[] = []

        for (const sheetName of wb.SheetNames) {
          const ws = wb.Sheets[sheetName]

          // Try flat format first (has Email / Name / Remark headers)
          const jsonRows = XLSX.utils.sheet_to_json<RawRow>(ws, { defval: '' })
          const firstRow = jsonRows[0] ? Object.keys(jsonRows[0]) : []

          if (firstRow.includes('Email') || firstRow.includes('EMAIL')) {
            allContacts = [...allContacts, ...parseFlatFormat(jsonRows)]
          } else {
            // Try two-column format
            const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' }) as unknown[][]
            const parsed = parseTwoColumnFormat(raw)
            allContacts = [...allContacts, ...parsed]
          }
        }

        if (allContacts.length === 0) {
          setError('No contacts found. Make sure the file has Email/Name columns or a Wedding/Event layout.')
          return
        }

        setPreview(buildPreview(allContacts))
        setFileName(file.name)
        setStep(2)
      } catch (err) {
        setError(`Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }
    reader.readAsArrayBuffer(file)
  }, [])

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) parseFile(accepted[0])
  }, [parseFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    multiple: false,
  })

  // ── Import ────────────────────────────────────────────────────────────────

  const handleImport = () => {
    if (!preview) return
    setImporting(true)

    const now = new Date().toISOString()
    const existingCompanyNames = new Set(existingCompanies.map((c) => c.company_name.toLowerCase()))
    const existingEmails       = new Set(existingContacts.map((c) => c.email?.toLowerCase()).filter(Boolean))

    let companiesAdded = 0
    let contactsAdded  = 0

    // Build a map of companyName → new company_id for this batch
    const batchCompanyIds = new Map<string, string>()

    for (const co of preview.companies) {
      if (existingCompanyNames.has(co.company_name.toLowerCase())) continue
      const id = `comp-imp-${crypto.randomUUID()}`
      const newCompany: Company = { ...co, company_id: id, created_at: now, updated_at: now }
      addCompany(newCompany)
      batchCompanyIds.set(co.company_name.toLowerCase(), id)
      existingCompanyNames.add(co.company_name.toLowerCase())
      companiesAdded++
    }

    for (const ct of preview.contacts) {
      if (ct.email && existingEmails.has(ct.email.toLowerCase())) continue

      // Find company_id — batch first, then existing
      const key = ct.companyName.toLowerCase()
      const companyId =
        batchCompanyIds.get(key) ??
        existingCompanies.find((c) => c.company_name.toLowerCase() === key)?.company_id ??
        ''

      const id = `ctct-imp-${crypto.randomUUID()}`
      const newContact: ContactPerson = {
        contact_id:  id,
        company_id:  companyId,
        name:        ct.name,
        email:       ct.email,
        phone:       ct.phone,
        role:        ct.role,
        notes:       ct.notes,
        created_at:  now,
        updated_at:  now,
      }
      addContactPerson(newContact)
      if (ct.email) existingEmails.add(ct.email.toLowerCase())
      contactsAdded++
    }

    setImportResult({ companies: companiesAdded, contacts: contactsAdded, skipped: preview.skipped })
    setImporting(false)
    setStep(3)
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Import Contacts</h1>
        <p className="text-slate-500 text-sm mt-1">Upload an Excel or CSV file to import Companies &amp; Contact Persons</p>
      </div>

      <StepIndicator step={step} />

      {/* ── Step 1: Upload ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
              isDragActive
                ? 'border-orange-400 bg-orange-50'
                : 'border-slate-200 hover:border-orange-300 hover:bg-slate-50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-10 h-10 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 font-medium">Drop your file here, or <span className="text-orange-500">browse</span></p>
            <p className="text-slate-400 text-sm mt-1">Supports .xlsx, .xls, .csv</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Supported formats hint */}
          <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-500 space-y-1">
            <p className="font-semibold text-slate-600 mb-2">Supported formats</p>
            <p>• <span className="font-medium">Contact list</span>: columns <code className="bg-white px-1 rounded">Email, Name, Telphone, Remark</code></p>
            <p>• <span className="font-medium">Mail list</span>: two-section layout with <code className="bg-white px-1 rounded">Wedding / Event</code> headers</p>
            <p>• Multiple sheets in the same file are all imported</p>
          </div>
        </div>
      )}

      {/* ── Step 2: Preview ── */}
      {step === 2 && preview && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-600 text-sm">
              <FileSpreadsheet className="w-4 h-4 text-orange-500" />
              <span className="font-medium">{fileName}</span>
            </div>
            <button onClick={() => { setStep(1); setPreview(null) }} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <Building2 className="w-5 h-5 text-blue-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-blue-600">{preview.companies.length}</p>
              <p className="text-xs text-blue-500">Companies</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <User className="w-5 h-5 text-green-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-green-600">{preview.contacts.length}</p>
              <p className="text-xs text-green-500">Contact Persons</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <AlertCircle className="w-5 h-5 text-slate-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-slate-500">{preview.skipped}</p>
              <p className="text-xs text-slate-400">Skipped (empty)</p>
            </div>
          </div>

          {/* Company preview list */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Companies to import</p>
            <div className="border border-slate-100 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Company Name</th>
                    <th className="text-left px-3 py-2 font-medium">Type</th>
                    <th className="text-left px-3 py-2 font-medium">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {preview.companies.map((co, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-700">{co.company_name}</td>
                      <td className="px-3 py-2 text-slate-400 capitalize">{co.company_type ?? '—'}</td>
                      <td className="px-3 py-2 text-slate-400">{co.email ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Contact preview list */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Contact Persons to import</p>
            <div className="border border-slate-100 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Name</th>
                    <th className="text-left px-3 py-2 font-medium">Company</th>
                    <th className="text-left px-3 py-2 font-medium">Email</th>
                    <th className="text-left px-3 py-2 font-medium">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {preview.contacts.map((ct, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-700">{ct.name}</td>
                      <td className="px-3 py-2 text-slate-400">{ct.companyName || '—'}</td>
                      <td className="px-3 py-2 text-slate-400">{ct.email ?? '—'}</td>
                      <td className="px-3 py-2 text-slate-400">{ct.role ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => { setStep(1); setPreview(null) }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {importing ? 'Importing…' : `Import ${preview.companies.length} Companies & ${preview.contacts.length} Contacts`}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Done ── */}
      {step === 3 && (
        <div className="text-center py-10 space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Import Complete</h2>
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{importResult.companies}</p>
              <p className="text-slate-400">Companies added</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{importResult.contacts}</p>
              <p className="text-slate-400">Contacts added</p>
            </div>
            {importResult.skipped > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-400">{importResult.skipped}</p>
                <p className="text-slate-400">Skipped</p>
              </div>
            )}
          </div>
          <p className="text-slate-400 text-sm">Duplicates (by email or company name) were automatically skipped.</p>
          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              onClick={() => { setStep(1); setPreview(null); setFileName('') }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Import another file
            </button>
            <a
              href="/customers"
              className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors"
            >
              View Customers →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

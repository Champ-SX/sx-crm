'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserAvatar } from '@/components/shared/user-avatar'
import { Zap, Database, Users, Layers, GitBranch, ShieldCheck, UserCircle, Check } from 'lucide-react'
import { useCRMStore } from '@/store/crm-store'
import { useAuth } from '@/components/auth-provider'
import Link from 'next/link'

function ProfileCard() {
  const { user } = useAuth()
  const teamMembers = useCRMStore((s) => s.teamMembers)
  const updateProfileName = useCRMStore((s) => s.updateProfileName)
  const me = teamMembers.find((m) => m.id === user?.id)
  const currentName = me?.name ?? ''
  const [name, setName] = useState(currentName)
  const [saved, setSaved] = useState(false)
  // Sync once the roster loads / the signed-in user resolves.
  useEffect(() => { setName(currentName) }, [currentName])

  const dirty = name.trim() !== currentName && name.trim().length > 0
  async function save() {
    if (!user?.id || !dirty) return
    await updateProfileName(user.id, name.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <UserCircle className="w-4 h-4 text-primary" /> Your profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <UserAvatar name={currentName || me?.email || 'U'} size={40} />
          <div className="min-w-0">
            <p className="text-sm font-medium leading-tight truncate">{currentName || '—'}</p>
            <p className="text-[12px] text-muted-foreground leading-tight truncate">{me?.email}</p>
          </div>
        </div>
        <div>
          <label className="text-[12px] font-medium text-muted-foreground">Display name</label>
          <div className="flex items-center gap-2 mt-1.5">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="h-9 max-w-xs" onKeyDown={(e) => { if (e.key === 'Enter') void save() }} />
            <Button size="sm" className="h-9" onClick={() => void save()} disabled={!dirty}>
              {saved ? <><Check className="w-4 h-4 mr-1" />Saved</> : 'Save'}
            </Button>
          </div>
          <p className="text-[12px] text-muted-foreground mt-1.5">Shown across the app — sidebar, @mentions, assignees. Your email and role aren&apos;t editable here.</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function SettingsPage() {
  const teamMembers = useCRMStore((s) => s.teamMembers)
  const { role } = useAuth()
  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Settings" description="Workspace configuration" />
      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto max-w-2xl">

        <ProfileCard />

        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" /> Workspace
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Product Name</p>
                <p className="text-xs text-muted-foreground">SX CRM by SIXSHEET</p>
              </div>
              <Badge variant="outline" className="text-xs">MVP v0.1</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Data Mode</p>
                <p className="text-xs text-muted-foreground">Currently using local mock data</p>
              </div>
              <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-xs">Mock</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Database className="w-4 h-4 text-muted-foreground" /> Supabase Integration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Supabase integration is ready to configure. Replace the mock data store with live Supabase queries.
            </p>
            <div className="space-y-2 text-xs font-mono bg-muted/50 rounded-lg p-3 border border-border/60">
              <p className="text-muted-foreground">NEXT_PUBLIC_SUPABASE_URL=</p>
              <p className="text-muted-foreground">NEXT_PUBLIC_SUPABASE_ANON_KEY=</p>
            </div>
            <Button variant="outline" size="sm" className="mt-3 text-xs h-8" disabled>
              Connect Supabase (coming soon)
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" /> Team Members
              </span>
              {role === 'admin' && (
                <Link
                  href="/admin/users"
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-primary hover:underline"
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> Manage roles
                </Link>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {teamMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No team members yet. People who sign in with Google will appear here.
                </p>
              ) : (
                teamMembers.map((m) => {
                  const display = m.name || m.email
                  return (
                    <div key={m.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                          {display[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium leading-tight">{display}</p>
                          {m.email && m.name && (
                            <p className="text-[12px] text-muted-foreground leading-tight">{m.email}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[12px] capitalize">
                        {m.role}
                      </Badge>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Layers className="w-4 h-4 text-muted-foreground" /> Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {['CAP*TURES', 'Andy & Fine', 'SX Event', 'Booth Rental', 'Custom Activation'].map((s) => (
                <Badge key={s} variant="outline" className="text-xs px-2 py-1">{s}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-muted-foreground" /> Roadmap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5 text-sm">
              {[
                { label: 'Supabase database + auth', status: 'planned' },
                { label: 'Email / LINE notification triggers', status: 'planned' },
                { label: 'Proposal PDF generator', status: 'planned' },
                { label: 'Invoice tracking', status: 'planned' },
                { label: 'Analytics & revenue reports', status: 'planned' },
                { label: 'Mobile-responsive layout', status: 'planned' },
              ].map(({ label, status }) => (
                <div key={label} className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <Badge variant="outline" className="text-[12px] bg-muted">{status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

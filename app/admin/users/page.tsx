'use client'

import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth-provider'
import { useCRMStore } from '@/store/crm-store'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { UserAvatar } from '@/components/shared/user-avatar'

interface User {
  id: string
  email: string
  name: string
  role: string
  created_at: string
}

export default function AdminUsersPage() {
  const router = useRouter()
  const { user: currentUser, role: currentRole, loading } = useAuth()
  const teamMembers = useCRMStore((s) => s.teamMembers)
  const addTeamMember = useCRMStore((s) => s.addTeamMember)
  const refreshTeamMembers = useCRMStore((s) => s.refreshTeamMembers)
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [updatingUser, setUpdatingUser] = useState<string | null>(null)
  // Add-team-member form
  const [addName, setAddName] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addRole, setAddRole] = useState('operation')
  const [adding, setAdding] = useState(false)

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault()
    const name = addName.trim()
    const email = addEmail.trim().toLowerCase()
    if (!name || !email) return
    if (users.some((u) => u.email?.toLowerCase() === email)) {
      alert('A team member with that email already exists.')
      return
    }
    setAdding(true)
    try {
      await addTeamMember({ name, email, role: addRole })
      await refreshTeamMembers()
      setUsers((prev) => [...prev, { id: `pending-${email}`, name, email, role: addRole, created_at: '' }])
      setAddName(''); setAddEmail(''); setAddRole('operation')
    } finally {
      setAdding(false)
    }
  }

  // Check if user is admin
  useEffect(() => {
    if (!loading && currentRole !== 'admin') {
      router.push('/dashboard')
    }
  }, [loading, currentRole, router])

  // Load all users
  useEffect(() => {
    const loadUsers = async () => {
      // Mock mode: show the store's team (no DB to query)
      if (!isSupabaseConfigured) {
        setUsers(teamMembers.map((m) => ({ ...m, created_at: '' })))
        setIsLoading(false)
        return
      }
      try {
        console.log('[AdminUsers] Loading users...')
        const { data, error } = await supabase
          .from('users')
          .select('*')

        console.log('[AdminUsers] Query result:', { data, error })
        if (error) throw error
        setUsers(data || [])
      } catch (error) {
        console.error('[AdminUsers] Failed to load users:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (currentRole === 'admin') {
      loadUsers()
    }
  }, [currentRole, teamMembers])

  // Update user role
  const updateUserRole = async (userId: string, newRole: string) => {
    setUpdatingUser(userId)
    try {
      // Mock mode: update local view only (no DB to persist to)
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('users')
          .update({ role: newRole })
          .eq('id', userId)

        if (error) throw error
      }

      // Update local state
      setUsers(
        users.map((u) =>
          u.id === userId ? { ...u, role: newRole } : u
        )
      )
    } catch (error) {
      console.error('Failed to update user role:', error)
    } finally {
      setUpdatingUser(null)
    }
  }

  // Delete a user (admin-only). Guards: can't delete yourself or the last admin.
  const adminCount = users.filter((u) => u.role === 'admin').length
  const deleteUser = async (u: User) => {
    if (u.id === currentUser?.id) return
    if (u.role === 'admin' && adminCount <= 1) {
      alert('Cannot delete the last admin.')
      return
    }
    if (!window.confirm(`Delete ${u.name || u.email}? They'll be removed from the app (leads/jobs keep their owner name).`)) return
    setUpdatingUser(u.id)
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('users').delete().eq('id', u.id)
        if (error) throw error
      }
      setUsers((prev) => prev.filter((x) => x.id !== u.id))
    } catch (error) {
      console.error('Failed to delete user:', error)
      alert('Failed to delete user.')
    } finally {
      setUpdatingUser(null)
    }
  }

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-flex items-center justify-center">
            <div className="w-8 h-8 rounded-lg border-2 border-muted-foreground/20 border-t-blue-500 animate-spin" />
          </div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (currentRole !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 font-semibold">Access Denied</p>
          <p className="text-muted-foreground">Only admins can access this page</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-2xl font-bold">User Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage user roles and permissions
        </p>
      </div>

      {/* Add team member — pre-provision so they're mentionable/assignable before login */}
      <div className="px-6 pt-6">
        <form onSubmit={handleAddMember} className="bg-card border border-border rounded-lg p-4 flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1 min-w-0">
            <label className="field-label">Name</label>
            <input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="e.g. Nart SIXSHEET" className="h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30" />
          </div>
          <div className="flex-1 min-w-0">
            <label className="field-label">Email</label>
            <input type="email" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="name@sixsheet.me" className="h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30" />
          </div>
          <div className="sm:w-40">
            <label className="field-label">Role</label>
            <select value={addRole} onChange={(e) => setAddRole(e.target.value)} className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
              <option value="admin">admin</option>
              <option value="operation">operation</option>
              <option value="sales">sales</option>
            </select>
          </div>
          <Button type="submit" size="sm" className="h-9 shrink-0" disabled={adding || !addName.trim() || !addEmail.trim()}>
            {adding ? 'Adding…' : 'Add member'}
          </Button>
        </form>
        <p className="text-[12px] text-muted-foreground mt-2">
          Adds them to the team roster now — mentionable and assignable before they log in. Their Google account links to this row (by email) on first sign-in.
        </p>
      </div>

      {/* Users Table */}
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-foreground">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">
                  Email
                </th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">
                  Current Role
                </th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium flex items-center gap-2"><UserAvatar name={u.name || u.email} size={24} />{u.name || '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {u.email}
                    {u.id === currentUser?.id && (
                      <span className="ml-2 text-[11px] font-mono uppercase tracking-wide bg-muted text-muted-foreground px-2 py-0.5 rounded">
                        You
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-3 py-1 rounded-full bg-muted text-foreground text-xs font-semibold uppercase">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 items-center flex-wrap">
                      {['admin', 'operation', 'sales', 'user'].map((role) => (
                        <Button
                          key={role}
                          size="sm"
                          variant={u.role === role ? 'default' : 'outline'}
                          onClick={() => updateUserRole(u.id, role)}
                          disabled={updatingUser === u.id}
                          className="text-xs uppercase"
                        >
                          {role}
                        </Button>
                      ))}
                      {u.id !== currentUser?.id && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteUser(u)}
                          disabled={updatingUser === u.id || (u.role === 'admin' && adminCount <= 1)}
                          title={u.role === 'admin' && adminCount <= 1 ? 'Cannot delete the last admin' : 'Delete user'}
                          className="text-xs gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No users found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

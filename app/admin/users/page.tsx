'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Shield, AlertCircle, Loader } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function AdminUsersPage() {
  const { role, loading: authLoading } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const supabase = createClient()

  // Check authorization
  useEffect(() => {
    if (!authLoading && role !== 'admin') {
      router.push('/dashboard')
    }
  }, [role, authLoading, router])

  useEffect(() => {
    if (role === 'admin') {
      fetchUsers()
    }
  }, [role])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (data) {
        setUsers(data)
      }
      if (error) {
        console.error('Error fetching users:', error)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateUserRole = async (userId: string, newRole: string) => {
    setSaving(userId)
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId)

      if (!error) {
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
      } else {
        console.error('Error updating role:', error)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setSaving(null)
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-900">Access Denied</h3>
              <p className="text-sm text-red-700 mt-1">
                Only admins can manage users.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Shield className="w-8 h-8 text-blue-600" />
        <h1 className="text-2xl font-bold">User Management</h1>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="text-center py-12 flex items-center justify-center gap-2">
          <Loader className="w-4 h-4 animate-spin" />
          <span className="text-slate-600">Loading users...</span>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <p>No users yet. Invite team members to get started.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Role</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-900">{user.email}</span>
                    </td>
                    <td className="py-3 px-4">
                      {user.full_name ? (
                        <span className="text-slate-700">{user.full_name}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Select
                        value={user.role}
                        onValueChange={(value) => updateUserRole(user.id, value)}
                        disabled={saving === user.id}
                      >
                        <SelectTrigger className="w-40">
                          {saving === user.id ? (
                            <div className="flex items-center gap-2">
                              <Loader className="w-3 h-3 animate-spin" />
                              <span>Saving...</span>
                            </div>
                          ) : (
                            <SelectValue />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="operation">Operation</SelectItem>
                          <SelectItem value="sales">Sales</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-600 text-xs">
                        {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

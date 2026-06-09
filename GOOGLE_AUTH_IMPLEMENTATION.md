# Google Auth Implementation Plan - Today (June 9, 2026)

**Timeline:** 3-4 hours  
**Target:** Complete by tonight  
**Deploy:** Include in tomorrow's Phase 2.3 deployment (June 14)

---

## 🎯 Quick Overview

**What:** Users log in with Google OAuth, get assigned roles (Admin/Operation/Sales), see protected CRM dashboard

**Why:** Secure access control + role-based permissions setup

**How:** Supabase Google OAuth + Auth Context + Middleware

---

## 📋 Implementation Checklist

### Step 1: Supabase Google OAuth Setup (15 min)

```bash
# 1. Go to Supabase Dashboard → Project → Authentication → Providers
# 2. Enable "Google" provider
# 3. Add Google OAuth credentials:
#    - Client ID: [get from Google Cloud Console]
#    - Client Secret: [get from Google Cloud Console]
# 4. Set redirect URL: https://sx-crm.vercel.app/auth/callback

# 5. Configure users table with role field
```

**SQL Migration:**
```sql
-- Add role and profile fields to users table
ALTER TABLE auth.users ADD COLUMN role VARCHAR(50) DEFAULT 'user';
ALTER TABLE auth.users ADD COLUMN full_name VARCHAR(255);
ALTER TABLE auth.users ADD COLUMN avatar_url TEXT;

-- OR create public.users table if using custom
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  role VARCHAR(50) DEFAULT 'user', -- 'admin', 'operation', 'sales'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- RLS: Users can see their own profile
CREATE POLICY users_own_profile ON public.users
  FOR SELECT USING (id = auth.uid());

-- RLS: Admin can see all users
CREATE POLICY admin_see_all ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

---

### Step 2: Create Login Page (45 min)

**File:** `app/login/page.tsx`

```tsx
'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-md">
        {/* Logo + Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">SX CRM</h1>
          <p className="text-slate-600">SIXSHEET Sales Operating System</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Google Login Button */}
          <Button
            onClick={handleGoogleLogin}
            disabled={loading}
            size="lg"
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            {loading ? 'Signing in...' : '🔐 Sign in with Google'}
          </Button>

          {/* Info Text */}
          <p className="text-center text-sm text-slate-600">
            Sign in with your Google account to access SX CRM.
            An admin will assign your role.
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-slate-500">
          <p>© 2026 SIXSHEET. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
```

---

### Step 3: Create Auth Callback Handler (30 min)

**File:** `app/auth/callback/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const error_description = searchParams.get('error_description')

  // Handle OAuth errors
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error_description || error)}`, request.url)
    )
  }

  if (code) {
    const supabase = createClient()

    try {
      // Exchange code for session
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`, request.url)
        )
      }

      // Get the session to check role
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        return NextResponse.redirect(new URL('/login?error=No session', request.url))
      }

      // Redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } catch (error) {
      return NextResponse.redirect(
        new URL(`/login?error=Authentication failed`, request.url)
      )
    }
  }

  return NextResponse.redirect(new URL('/login?error=No code provided', request.url))
}
```

---

### Step 4: Create Auth Context Provider (45 min)

**File:** `components/auth-provider.tsx`

```tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Session } from '@supabase/supabase-js'

interface AuthContextType {
  session: Session | null
  user: any | null
  role: string | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<any>(null)
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    // Check current session
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        setSession(session)
        setUser(session.user)

        // Fetch user role from database
        const { data } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single()

        setRole(data?.role || 'user')
      }

      setLoading(false)
    }

    checkSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setSession(session)
        setUser(session.user)

        // Fetch role when session changes
        const { data } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single()

        setRole(data?.role || 'user')
      } else {
        setSession(null)
        setUser(null)
        setRole(null)
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setRole(null)
  }

  return (
    <AuthContext.Provider value={{ session, user, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```

---

### Step 5: Create Middleware for Route Protection (45 min)

**File:** `middleware.ts` (at root)

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getSetCookie().map(cookie => {
            const [name, ...rest] = cookie.split('=')
            return { name, value: rest.join('=') }
          })
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Check auth
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Allow login and auth routes without authentication
  if (request.nextUrl.pathname.startsWith('/login') || 
      request.nextUrl.pathname.startsWith('/auth')) {
    return response
  }

  // Redirect to login if not authenticated
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login and auth routes
     */
    '/((?!api|_next/static|_next/image|favicon.ico|login|auth).*)',
  ],
}
```

---

### Step 6: Update App Layout with Auth Provider (15 min)

**File:** `app/layout.tsx`

```tsx
import { AuthProvider } from '@/components/auth-provider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex font-sans">
        <AuthProvider>
          <TooltipProvider>
            <MobileNavProvider>
              <DataInitializer />
              <Sidebar />
              <main className="flex-1 flex flex-col min-h-screen bg-background overflow-hidden">
                {children}
              </main>
            </MobileNavProvider>
          </TooltipProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
```

---

### Step 7: Add User Profile to Sidebar (30 min)

**File:** `components/layout/sidebar.tsx` (Add to top)

```tsx
'use client'

import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { LogOut, User } from 'lucide-react'

export function Sidebar() {
  const { user, role, signOut } = useAuth()

  return (
    <div className="w-64 border-r bg-slate-50 flex flex-col">
      {/* Existing sidebar content */}
      
      {/* User Profile at Bottom */}
      {user && (
        <div className="mt-auto border-t p-4 space-y-3">
          <div className="flex items-center gap-3">
            {user.user_metadata?.avatar_url && (
              <img
                src={user.user_metadata.avatar_url}
                alt={user.email}
                className="w-10 h-10 rounded-full"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.user_metadata?.full_name || user.email}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wide">{role}</p>
            </div>
          </div>
          <Button
            onClick={signOut}
            variant="outline"
            size="sm"
            className="w-full justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      )}
    </div>
  )
}
```

---

### Step 8: Create Admin Panel for Role Assignment (45 min)

**File:** `app/admin/users/page.tsx`

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Shield, AlertCircle } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function AdminUsersPage() {
  const { role } = useAuth()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Check authorization
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

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      setUsers(data)
    }
    setLoading(false)
  }

  const updateUserRole = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId)

    if (!error) {
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="w-8 h-8 text-blue-600" />
        <h1 className="text-2xl font-bold">User Management</h1>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading users...</div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-slate-500">No users yet</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-semibold">Email</th>
                <th className="text-left py-3 px-4 font-semibold">Name</th>
                <th className="text-left py-3 px-4 font-semibold">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b hover:bg-slate-50">
                  <td className="py-3 px-4">{user.email}</td>
                  <td className="py-3 px-4">{user.full_name || '—'}</td>
                  <td className="py-3 px-4">
                    <Select
                      value={user.role}
                      onValueChange={(value) => updateUserRole(user.id, value)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="operation">Operation</SelectItem>
                        <SelectItem value="sales">Sales</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

---

## 🔐 Environment Variables Required

Add to `.env.local` and Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

---

## ✅ Testing Checklist

- [ ] Login page loads at `/login`
- [ ] Google OAuth button works
- [ ] Callback handler redirects to dashboard
- [ ] User profile shows in sidebar
- [ ] Sign out button works
- [ ] Admin panel accessible to admin users only
- [ ] Role assignment works in admin panel
- [ ] Route protection: `/admin` redirects to login if not authenticated
- [ ] Mobile responsive login page
- [ ] Error messages display correctly

---

## 🚀 Deployment

1. Deploy to production (Friday 6/14 with Phase 2.3)
2. Monitor Supabase auth logs
3. Create initial admin user manually in Supabase
4. Test full login flow in production

---

**Status:** Ready to implement  
**Time Estimate:** 3-4 hours  
**Start:** Now!

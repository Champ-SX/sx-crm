// Mock Supabase client for development/client-side use
// Actual Supabase integration only works on server-side
const mockChain = {
  select: () => mockChain,
  order: () => mockChain,
  eq: () => mockChain,
  single: () => Promise.resolve({ data: null, error: null }),
  insert: () => mockChain,
  update: () => mockChain,
  delete: () => mockChain,
}

export const supabase = {
  from: (table: string) => mockChain,
} as any

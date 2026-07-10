'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

type TabType = 'details' | 'activity'

interface JobDetailTabsProps {
  children: {
    details: React.ReactNode
    activity: React.ReactNode
  }
}

export function JobDetailTabs({ children }: JobDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('details')

  const tabs: { id: TabType; label: string }[] = [
    { id: 'details', label: 'DETAILS' },
    { id: 'activity', label: 'ACTIVITY' },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Tab Bar - Fixed at top */}
      <div className="sticky top-0 z-20 bg-card border-b border-border dark:bg-slate-900 dark:border-slate-700">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 px-4 py-3 text-sm font-semibold transition-all duration-150',
                'border-b-[3px] relative',
                activeTab === tab.id
                  ? 'text-blue-600 border-b-blue-600 dark:text-blue-400 dark:border-b-blue-400'
                  : 'text-foreground/80 border-b-transparent hover:text-foreground dark:text-muted-foreground dark:hover:text-muted-foreground/50'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {/* Details Tab */}
        <div
          className={cn(
            'transition-opacity duration-100',
            activeTab === 'details' ? 'opacity-100' : 'hidden opacity-0'
          )}
        >
          {children.details}
        </div>

        {/* Activity Tab */}
        <div
          className={cn(
            'transition-opacity duration-100',
            activeTab === 'activity' ? 'opacity-100' : 'hidden opacity-0'
          )}
        >
          {children.activity}
        </div>
      </div>
    </div>
  )
}

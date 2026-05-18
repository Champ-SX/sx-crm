'use client'

import { useState } from 'react'
import { useCRMStore } from '@/store/crm-store'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Task, TaskPriority, TaskStatus } from '@/types'
import { EmptyState } from '@/components/shared/empty-state'
import {
  Plus,
  CheckSquare,
  Square,
  Calendar,
  Link2,
  User,
  Clock,
  CheckCircle2,
  Circle,
  ArrowRight,
  Search,
} from 'lucide-react'
import { format } from 'date-fns'

const TODAY = '2026-05-15'
const OWNERS = ['Vitta', 'Andy', 'Fern', 'Nong']

const priorityConfig = {
  high: { label: 'High', class: 'border-red-200 text-red-600 bg-red-50' },
  medium: { label: 'Medium', class: 'border-amber-200 text-amber-600 bg-amber-50' },
  low: { label: 'Low', class: 'border-zinc-200 text-zinc-500 bg-zinc-50' },
}

function TaskCard({ task, onToggle }: { task: Task; onToggle: () => void }) {
  const isDone = task.status === 'done'
  const isOverdue = !isDone && task.due_date < TODAY
  const isDueToday = !isDone && task.due_date === TODAY

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border bg-white transition-all hover:shadow-sm ${isDone ? 'opacity-50' : ''} ${isOverdue ? 'border-red-200' : 'border-border/70'}`}>
      <button onClick={onToggle} className="mt-0.5 shrink-0">
        {isDone ? (
          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
        ) : (
          <Circle className="w-4.5 h-4.5 text-muted-foreground hover:text-primary transition-colors" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-snug ${isDone ? 'line-through' : ''}`}>{task.title}</p>
        {task.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
        )}
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-500 font-medium' : isDueToday ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
            <Calendar className="w-3 h-3" />
            {isOverdue ? 'Overdue · ' : isDueToday ? 'Today · ' : ''}
            {format(new Date(task.due_date + 'T00:00:00'), 'MMM d')}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="w-3 h-3" />{task.owner}
          </div>
          {task.linked_entity_name && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Link2 className="w-3 h-3" />
              <span className="truncate max-w-[160px]">{task.linked_entity_name}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${priorityConfig[task.priority].class}`}>
          {priorityConfig[task.priority].label}
        </Badge>
      </div>
    </div>
  )
}

function CreateTaskForm({ onClose }: { onClose: () => void }) {
  const { addTask } = useCRMStore()
  const [form, setForm] = useState({
    title: '',
    description: '',
    due_date: TODAY,
    priority: 'medium' as TaskPriority,
    owner: 'Vitta',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    addTask({
      task_id: `task-${Date.now()}`,
      ...form,
      status: 'pending',
      created_at: new Date().toISOString(),
    })
    onClose()
  }

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:max-w-[400px] p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle>New Task</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">Task *</Label>
            <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-8 text-sm" placeholder="What needs to be done?" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="text-sm resize-none" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Due Date</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Priority</Label>
              <Select value={form.priority} onValueChange={(v) => v && setForm({ ...form, priority: v as TaskPriority })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Assign to</Label>
            <Select value={form.owner} onValueChange={(v) => v && setForm({ ...form, owner: v })}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {OWNERS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1 h-9 text-sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1 h-9 text-sm">Add Task</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

export default function TasksPage() {
  const { tasks, updateTask } = useCRMStore()
  const [ownerFilter, setOwnerFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [creating, setCreating] = useState(false)

  function toggleTask(task: Task) {
    updateTask(task.task_id, {
      status: task.status === 'done' ? 'pending' : 'done',
    })
  }

  const filtered = tasks.filter((t) => {
    const matchOwner = ownerFilter === 'all' || t.owner === ownerFilter
    const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter
    return matchOwner && matchPriority
  })

  const overdue = filtered.filter((t) => t.status !== 'done' && t.due_date < TODAY)
  const dueToday = filtered.filter((t) => t.status !== 'done' && t.due_date === TODAY)
  const upcoming = filtered.filter((t) => t.status !== 'done' && t.due_date > TODAY)
  const done = filtered.filter((t) => t.status === 'done')

  function TaskSection({ title, items, emptyMsg, accent }: { title: string; items: Task[]; emptyMsg: string; accent?: string }) {
    if (items.length === 0 && title !== 'Done') return null
    return (
      <div>
        <div className={`flex items-center gap-2 mb-3 ${accent ?? ''}`}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
          <span className="text-[11px] font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{items.length}</span>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">{emptyMsg}</p>
        ) : (
          <div className="space-y-2">
            {items.map((task) => (
              <TaskCard key={task.task_id} task={task} onToggle={() => toggleTask(task)} />
            ))}
          </div>
        )}
      </div>
    )
  }

  const pendingCount = tasks.filter((t) => t.status !== 'done').length

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Tasks" description={`${pendingCount} pending · ${done.length} done`}>
        <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setCreating(true)}>
          <Plus className="w-3.5 h-3.5" /> Add Task
        </Button>
      </PageHeader>

      <div className="px-8 py-4 border-b bg-white flex items-center gap-3">
        <Select value={ownerFilter} onValueChange={(v) => setOwnerFilter(v ?? 'all')}>
          <SelectTrigger className="w-[130px] h-8 text-sm"><SelectValue placeholder="All owners" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All owners</SelectItem>
            {OWNERS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v ?? 'all')}>
          <SelectTrigger className="w-[130px] h-8 text-sm"><SelectValue placeholder="All priorities" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {overdue.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-red-500">Overdue</h3>
              <span className="text-[11px] font-semibold bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full">{overdue.length}</span>
            </div>
            <div className="space-y-2">
              {overdue.map((task) => (
                <TaskCard key={task.task_id} task={task} onToggle={() => toggleTask(task)} />
              ))}
            </div>
          </div>
        )}
        {dueToday.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-600">Due Today</h3>
              <span className="text-[11px] font-semibold bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full">{dueToday.length}</span>
            </div>
            <div className="space-y-2">
              {dueToday.map((task) => (
                <TaskCard key={task.task_id} task={task} onToggle={() => toggleTask(task)} />
              ))}
            </div>
          </div>
        )}
        {upcoming.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Upcoming</h3>
              <span className="text-[11px] font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{upcoming.length}</span>
            </div>
            <div className="space-y-2">
              {upcoming.map((task) => (
                <TaskCard key={task.task_id} task={task} onToggle={() => toggleTask(task)} />
              ))}
            </div>
          </div>
        )}
        {done.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Done</h3>
              <span className="text-[11px] font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{done.length}</span>
            </div>
            <div className="space-y-2">
              {done.map((task) => (
                <TaskCard key={task.task_id} task={task} onToggle={() => toggleTask(task)} />
              ))}
            </div>
          </div>
        )}
        {overdue.length === 0 && dueToday.length === 0 && upcoming.length === 0 && done.length === 0 && (
          ownerFilter !== 'all' || priorityFilter !== 'all'
            ? <EmptyState icon={Search} title="No tasks match" description="Try clearing your filters to see all tasks." />
            : <EmptyState icon={CheckSquare} title="You're all caught up!" description="No pending tasks right now. Add a new task to stay on top of things." action={{ label: '+ Add Task', onClick: () => setCreating(true) }} />
        )}
      </div>

      {creating && <CreateTaskForm onClose={() => setCreating(false)} />}
    </div>
  )
}

import type { ReactNode } from 'react'

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function Badge({ className, children }: { className: string; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>{children}</span>
}

export function Tabs<T extends string>({ value, onChange, options }: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; count?: number }[]
}) {
  return (
    <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
            value === o.value ? 'border-brand-500 bg-brand-500 text-white' : 'border-brand-100 bg-white text-ink-700 hover:border-brand-200'
          }`}
        >
          {o.label}
          {o.count !== undefined && <span className={`ml-1.5 ${value === o.value ? 'text-white/80' : 'text-ink-400'}`}>{o.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="card px-6 py-12 text-center text-sm text-ink-500">{children}</div>
}

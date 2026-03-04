import React from 'react'

export default function PageHeader({ title, subtitle, breadcrumb }) {
  return (
    <div className="mb-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle && <div className="text-sm text-gray-500">{subtitle}</div>}
      </div>
      {breadcrumb && (
        <nav className="text-sm text-gray-500 mt-2" aria-label="Breadcrumb">
          {breadcrumb.join(' / ')}
        </nav>
      )}
    </div>
  )
}

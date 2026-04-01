# data-model.md — App Shell

Entities:

- NavigationItem
  - id: string
  - label: string
  - href: string
  - visible: boolean
  - roles: string[] (optional, for role-based display)

- PageHeader
  - title: string
  - subtitle?: string
  - breadcrumb?: { label: string, href?: string }[]

Validation rules:
- `NavigationItem.label` required, non-empty
- `NavigationItem.href` required, must be a valid relative URL
- `PageHeader.title` required, non-empty

State/Transitions:
- Navigation visibility toggles on mobile (closed -> open)
- PageHeader content is provided by pages when rendering; no server-side transitions required for shell

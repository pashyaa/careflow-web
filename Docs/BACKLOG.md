# CareFlow Web Delivery Backlog

This repository-specific view complements the master portfolio tracker kept in the local workspace.

| ID | Type | Priority | Work item | Estimate |
|---|---|---|---|---:|
| CF-101-UI | Feature | Critical | Login, token lifecycle, protected routes, and role-aware actions | 8 h |
| BUG-304-UI | Bug | High | Recoverable optimistic-lock conflict experience | 3 h |
| CF-106-UI | Feature | High | SLA policy selection, at-risk indicators, and site time-zone labels | 6 h |
| BUG-303 | Bug | High | Correct remote-planner date/time input and display behavior | 6 h |
| BUG-305-UI | Bug | High | Resolution/cancellation reason-code forms | 3 h |
| CF-203 | Quality | High | MSW-backed page and workflow test suite | 8 h |
| BUG-301 | Bug | High | Abort or sequence stale list requests during rapid filtering | 4 h |
| BUG-302 | Bug | Medium | Refresh dashboard metrics after mutations/navigation | 3 h |
| CF-208 | Quality | High | WCAG 2.2 AA accessibility pass | 7 h |
| CF-103-UI | Feature | Medium | Service-site administration screens | 5 h |
| CF-104-UI | Feature | High | Asset administration and service-history view | 6 h |
| CF-105-UI | Feature | High | Explainable technician dispatch recommendations | 5 h |
| CF-107-UI | Feature | Medium | Reopen and SLA-reschedule actions | 3 h |
| CF-108-UI | Feature | High | Comments and secure attachment experience | 7 h |
| CF-109-UI | Feature | High | Filterable SLA analytics dashboard | 6 h |
| CF-110 | Feature | Medium | Saved work-order views and safe CSV export | 7 h |
| CF-113 | Feature | Medium | Read-only customer service portal | 10 h |

## Frontend definition of done

- `npm run lint`, `npm test`, and `npm run build` pass from a clean checkout.
- New workflows cover loading, empty, error, success, and permission states.
- Tests use accessible queries and deterministic API handlers.
- Keyboard navigation, focus handling, responsive layout, and reduced motion are verified.
- No secret is placed in a `VITE_` environment variable.
- README and `Docs/INTEGRATION.md` reflect the delivered API assumptions.


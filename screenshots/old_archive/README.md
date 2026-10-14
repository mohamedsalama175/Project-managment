# DeliverOps System Visual Showcase & Screenshot Inventory

This directory contains high-resolution (1920×1080) visual captures of the running **DeliverOps** platform, covering all core views, drawers, modals, workflows, and theme modes.

---

## 📸 Visual Gallery Inventory

| # | Filename | View / Modal Name | Key Capabilities Displayed |
|---|---|---|---|
| 01 | [`01_planner_gantt.png`](./01_planner_gantt.png) | **Gantt & WBS Planner View** | Split-pane WBS hierarchy table, virtualized SVG Gantt timeline, dependency links, CPM critical path highlights, and timeline zoom controls. |
| 02 | [`02_team_hub.png`](./02_team_hub.png) | **Team Hub & Resource Management** | Resource directory, capacity heatmaps, workload allocation, timesheet approvals, and leveling recommendations. |
| 03 | [`03_financials_invoicing.png`](./03_financials_invoicing.png) | **Financials & Invoicing** | Multi-currency billing, user rate versioning, expense claim receipts, and serial invoice generation. |
| 04 | [`04_projects_dashboard.png`](./04_projects_dashboard.png) | **Executive Portfolio & EVM Dashboard** | Real-time EVM metrics ($PV, EV, AC, SPI, CPI$), project health cards, and burn-down forecasting. |
| 05 | [`05_automation_rules.png`](./05_automation_rules.png) | **No-Code Automation Rules** | Event-driven trigger/condition/action rule builder, card templates, and execution run history. |
| 06 | [`06_compliance_security.png`](./06_compliance_security.png) | **Enterprise Compliance & Security** | Cryptographic audit hash chain verifier, legal holds manager, GDPR DSAR exports, and SSO status. |
| 07 | [`07_integrations_api.png`](./07_integrations_api.png) | **Integrations, OAuth & Webhooks** | OAuth 2.0 client configurations, personal API keys, and HMAC-signed webhook subscriptions. |
| 08 | [`08_public_status.png`](./08_public_status.png) | **Public SLA Status Page** | Unauthenticated SLA metrics, p50/p95/p99 latency gauges, uptime percentages, and service health. |
| 09 | [`09_config_calendar.png`](./09_config_calendar.png) | **System Configuration & Calendars** | Working day calendars (standard Mon–Fri & MENA Sun–Thu), daily working hours, and currency baselines. |
| 10 | [`10_risk_register_modal.png`](./10_risk_register_modal.png) | **Risk Register & Governance Modal** | Severity & Likelihood 5×5 matrix, root cause logs, mitigation plans, and blocking task linkages. |
| 11 | [`11_planner_dark_mode.png`](./11_planner_dark_mode.png) | **Gantt Planner (Dark Mode)** | Sleek dark mode styling with high-contrast claymorphism, accessible ratios, and styled Gantt canvas. |
| 12 | [`12_signin_screen.png`](./12_signin_screen.png) | **Sign In View (Mandatory Auth Gateway)** | Dotted world map background, US flag locale selector, floating card, eye toggle for password, and dark navy button. |
| 13 | [`13_users_management.png`](./13_users_management.png) | **Users Management & Directory** | Top toolbar (Export, Download Template, Import, Create User), filter/reset, employee table with custom green pill toggle switch. |
| 14 | [`14_roles_management.png`](./14_roles_management.png) | **Roles & Permissions Management** | System roles table, permissions & users count badges, action buttons, `< [ 1 ] >` pagination, and Bitwise footer. |
| 15 | [`15_create_role_permissions.png`](./15_create_role_permissions.png) | **Create Role & Permissions Matrix** | 3-tier DeliverOps domain hierarchy (9 modules), subject groups, granular action checkboxes, live counter badge, and Back/Save buttons. |

---

## 🛠 Automation Script

All screenshots are generated automatically using headless Google Chrome and Puppeteer:

- System Views Automation: [`scratch/take_system_screenshots.js`](../scratch/take_system_screenshots.js)
- RBAC & Auth Automation: [`scratch/take_rbac_screenshots.js`](../scratch/take_rbac_screenshots.js)
- Resolution: `1920 × 1080`
- Target: `http://127.0.0.1:5173` / `http://127.0.0.1:5174`



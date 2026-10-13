# DeliverOps System Visual Showcase & Screenshot Inventory

This directory contains high-resolution (1920×1080) visual captures of the running **DeliverOps** platform, covering all core views, drawers, modals, workflows, and theme modes.

---

## 📸 Visual Gallery Inventory

| # | Filename | View / Modal Name | Key Capabilities Displayed |
|---|---|---|---|
| 01 | [`01_planner_view_light.png`](./01_planner_view_light.png) | **Interactive Planner (Light Mode)** | Split-pane WBS hierarchy table, virtualized SVG Gantt timeline, dependency links, CPM indicators, and timeline zoom controls. |
| 02 | [`02_planner_view_dark.png`](./02_planner_view_dark.png) | **Interactive Planner (Dark Mode)** | Full dark mode theme styling with high-contrast claymorphism, accessible text ratios, and styled Gantt bars. |
| 03 | [`03_task_detail_drawer.png`](./03_task_detail_drawer.png) | **Task Detail & Review Drawer** | Slide-out inspector with single-point accountability assignment, 4-eye approval gate, effort allocation splits, predecessor constraints, and audit comments. |
| 04 | [`04_people_view_team_hub.png`](./04_people_view_team_hub.png) | **Team Hub & Capacity View** | Team member directory cards, role badges, allocated hours, utilization workload metrics, and capacity heatmaps. |
| 05 | [`05_dashboard_view_executive.png`](./05_dashboard_view_executive.png) | **Executive Portfolio Dashboard** | Multi-project health status cards, schedule drift gauges, milestone progression meters, and active blocker radars. |
| 06 | [`06_config_view_settings.png`](./06_config_view_settings.png) | **Project Configuration & Rules** | Working calendar schedule settings, MENA (Fri/Sat) vs Western (Sat/Sun) weekend selection, holiday exclusions, and CPM duration modes. |
| 07 | [`07_risk_register_modal.png`](./07_risk_register_modal.png) | **Risk, Issue & Blocker (RIB) Modal** | Severity & Likelihood 5×5 matrix, root cause logs, mitigation plans, owner assignments, and blocking task linkages. |
| 08 | [`08_weekly_delivery_report_modal.png`](./08_weekly_delivery_report_modal.png) | **Weekly Delivery Status Report** | Automated 4-part executive briefing (Accomplishments, Planned Work, Impediments, Milestones) with 1-click Markdown copying and print/PDF formatting. |
| 09 | [`09_auth_identity_console_modal.png`](./09_auth_identity_console_modal.png) | **Auth & Identity Console** | Live authentication modal with pre-seeded personas (Super Admin, PM, Contributor, Auditor), Laravel Sanctum token integration, and quick login. |
| 10 | [`10_new_project_modal.png`](./10_new_project_modal.png) | **Project Provisioning Modal** | Create new delivery project dialog with project code validation, date range pickers, working week presets, and description. |
| 11 | [`11_export_backup_menu.png`](./11_export_backup_menu.png) | **Project Export & Backup Menu** | One-click full project JSON backup and task list CSV / Excel export formats. |
| 12 | [`12_persona_switcher_dropdown.png`](./12_persona_switcher_dropdown.png) | **Persona & Role Switcher** | Role simulation dropdown for testing RBAC permissions and audit trail attribution across user accounts. |

---

## 🛠 Automation Script

All screenshots were generated automatically using headless Google Chrome and Puppeteer targeting the active Vite dev server at `http://localhost:5173`:

- Automation script: [`scripts/capture_master_screenshots.js`](../scripts/capture_master_screenshots.js)
- Resolution: `1920 × 1080`
- Renderer: Native Chromium / Google Chrome

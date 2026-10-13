/**
 * DeliverOps Financials, Budgeting & Advanced Reporting API Client
 * Interfaces with Laravel 12 /api/v1/ endpoints
 */

import { apiClient } from './client';

export interface ProjectBudget {
  project_id: string;
  budget_amount: number;
  budget_currency: string;
  budget_type: 'fixed' | 't_and_m' | 'retainer';
  billing_currency: string;
  revisions?: ProjectBudgetRevision[];
}

export interface ProjectBudgetRevision {
  id: string;
  project_id: string;
  user_id: string;
  previous_budget: string;
  new_budget: string;
  currency: string;
  reason: string | null;
  created_at: string;
  user?: {
    id: string;
    name: string;
  };
}

export interface UserRateHistoryItem {
  id: string;
  organization_id: string;
  user_id: string;
  project_id?: string | null;
  cost_rate: string;
  billable_rate: string;
  currency: string;
  effective_from: string;
  effective_to?: string | null;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  project?: {
    id: string;
    name: string;
    code: string;
  };
}

export interface ProjectCostsSummary {
  total_hours: number;
  labor_cost: number;
  expense_cost: number;
  total_cost: number;
  billable_amount: number;
  currency: string;
}

export interface ProjectCostsResponse {
  summary: ProjectCostsSummary;
  by_user: Array<{
    user_id: string;
    name: string;
    hours: number;
    cost: number;
    billable_amount: number;
  }>;
  by_task: Array<{
    task_id: string;
    name: string;
    hours: number;
    cost: number;
    billable_amount: number;
  }>;
  by_week: Array<{
    week: string;
    start_date: string;
    hours: number;
    cost: number;
    billable_amount: number;
  }>;
  entries: Array<{
    id: string;
    date: string;
    user: { id: string; name: string };
    task: { id: string; name: string };
    hours: number;
    cost_rate: number;
    billable_rate: number;
    cost: number;
    billable_amount: number;
    billable: boolean;
  }>;
}

export interface EvmMetrics {
  project_id: string;
  status_date: string;
  currency: string;
  bac: number;
  pv: number;
  ev: number;
  ac: number;
  cv: number;
  sv: number;
  cpi: number;
  spi: number;
  eac: number;
  etc: number;
  vac: number;
  tcpi: number | null;
  health: {
    cost_status: 'under_budget' | 'over_budget';
    schedule_status: 'ahead_of_schedule' | 'behind_schedule';
    is_cpi_critical: boolean;
    is_spi_critical: boolean;
  };
}

export interface BurnRateResponse {
  project_id: string;
  currency: string;
  analysis_weeks: number;
  active_weeks: number;
  average_weekly_burn: number;
  total_period_cost: number;
  history: Array<{
    week: string;
    start_date: string;
    hours: number;
    cost: number;
    billable_amount: number;
  }>;
}

export interface ForecastResponse {
  project_id: string;
  currency: string;
  bac: number;
  ac: number;
  etc: number;
  eac: number;
  average_weekly_burn: number;
  weeks_remaining: number;
  projected_completion_date: string;
  cpi?: number;
  spi?: number;
  alerts: Array<{
    type: string;
    severity: 'info' | 'warning' | 'critical';
    message: string;
    budget: number;
    forecast_cost: number;
    overrun_amount: number;
    overrun_percentage: number;
  }>;
}

export interface Expense {
  id: string;
  organization_id: string;
  project_id: string;
  task_id?: string | null;
  user_id: string;
  category: 'travel' | 'equipment' | 'software' | 'subcontractor' | 'materials' | 'other';
  title: string;
  description?: string | null;
  amount: string;
  currency: string;
  expense_date: string;
  billable: boolean;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'reimbursed';
  rejection_reason?: string | null;
  submitted_at?: string | null;
  approved_at?: string | null;
  reimbursed_at?: string | null;
  user?: { id: string; name: string };
  project?: { id: string; name: string; code: string };
  task?: { id: string; name: string };
}

export interface InvoiceLineItem {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount?: number;
  time_entry_id?: string | null;
  expense_id?: string | null;
}

export interface Invoice {
  id: string;
  organization_id: string;
  project_id: string;
  invoice_number: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'void';
  client_name: string;
  client_email?: string | null;
  client_address?: string | null;
  issue_date: string;
  due_date: string;
  paid_at?: string | null;
  currency: string;
  subtotal: string;
  tax_rate: string;
  tax_amount: string;
  total_amount: string;
  notes?: string | null;
  created_at: string;
  project?: { id: string; name: string; code: string };
  line_items?: InvoiceLineItem[];
}

export interface ReportCatalogItem {
  type: string;
  name: string;
  description: string;
  parameters: Record<string, any>;
  formats: string[];
}

export interface ScheduledReport {
  id: string;
  report_type: string;
  title: string;
  parameters: Record<string, any>;
  format: 'json' | 'markdown' | 'csv' | 'pdf';
  schedule: string;
  recipients: string[];
  is_active: boolean;
  last_run_at?: string | null;
  next_run_at?: string | null;
}

export interface WidgetCatalogItem {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  default_width: number;
  default_height: number;
  is_system: boolean;
}

export interface DashboardItem {
  id: string;
  title: string;
  project_id?: string | null;
  layout: Array<{
    widget_key: string;
    x: number;
    y: number;
    w: number;
    h: number;
  }>;
  is_default: boolean;
  is_shared: boolean;
}

export const financialsApi = {
  // Budget
  getBudget: async (projectId: string): Promise<ProjectBudget> => {
    return apiClient.get<ProjectBudget>(`/projects/${projectId}/budget`);
  },
  updateBudget: async (projectId: string, data: { budget_amount: number; budget_currency?: string; budget_type?: string; billing_currency?: string; reason?: string }): Promise<{ message: string; project: any; revision: ProjectBudgetRevision }> => {
    return apiClient.put(`/projects/${projectId}/budget`, data);
  },
  getBudgetRevisions: async (projectId: string): Promise<{ revisions: ProjectBudgetRevision[] }> => {
    return apiClient.get(`/projects/${projectId}/budget/revisions`);
  },

  // Rates
  getUserRates: async (params?: { user_id?: string; project_id?: string }): Promise<{ rates: UserRateHistoryItem[] }> => {
    return apiClient.get('/rates/users', { params });
  },
  createUserRate: async (data: { user_id: string; project_id?: string | null; cost_rate: number; billable_rate: number; currency?: string; effective_from: string; effective_to?: string | null }): Promise<{ message: string; rate: UserRateHistoryItem }> => {
    return apiClient.post('/rates/users', data);
  },
  updateUserRate: async (id: string, data: Partial<UserRateHistoryItem>): Promise<{ message: string; rate: UserRateHistoryItem }> => {
    return apiClient.put(`/rates/users/${id}`, data);
  },
  deleteUserRate: async (id: string): Promise<{ message: string }> => {
    return apiClient.delete(`/rates/users/${id}`);
  },

  // Costs
  getProjectCosts: async (projectId: string, params?: { from?: string; to?: string }): Promise<ProjectCostsResponse> => {
    return apiClient.get<ProjectCostsResponse>(`/projects/${projectId}/costs`, { params });
  },
  takeCostSnapshot: async (projectId: string, snapshot_date?: string): Promise<{ message: string; snapshot: any }> => {
    return apiClient.post(`/projects/${projectId}/costs/snapshot`, { snapshot_date });
  },
  getCostSnapshots: async (projectId: string): Promise<{ snapshots: any[] }> => {
    return apiClient.get(`/projects/${projectId}/costs/snapshots`);
  },

  // EVM & Forecast
  getEvmMetrics: async (projectId: string, params?: { status_date?: string; pv?: number; ev?: number; ac?: number }): Promise<EvmMetrics> => {
    return apiClient.get<EvmMetrics>(`/projects/${projectId}/evm`, { params });
  },
  getBurnRate: async (projectId: string, weeks?: number): Promise<BurnRateResponse> => {
    return apiClient.get<BurnRateResponse>(`/projects/${projectId}/burn-rate`, { params: { weeks } });
  },
  getForecast: async (projectId: string): Promise<ForecastResponse> => {
    return apiClient.get<ForecastResponse>(`/projects/${projectId}/forecast-to-complete`);
  },

  // Expenses
  getExpenses: async (params?: { project_id?: string; status?: string; user_id?: string }): Promise<{ expenses: Expense[] }> => {
    return apiClient.get('/expenses', { params });
  },
  createExpense: async (data: { project_id: string; task_id?: string | null; category: string; title: string; description?: string; amount: number; currency?: string; expense_date: string; billable?: boolean }): Promise<{ message: string; expense: Expense }> => {
    return apiClient.post('/expenses', data);
  },
  updateExpense: async (id: string, data: Partial<Expense>): Promise<{ message: string; expense: Expense }> => {
    return apiClient.put(`/expenses/${id}`, data);
  },
  deleteExpense: async (id: string): Promise<{ message: string }> => {
    return apiClient.delete(`/expenses/${id}`);
  },
  submitExpense: async (id: string): Promise<{ message: string; expense: Expense }> => {
    return apiClient.post(`/expenses/${id}/submit`);
  },
  approveExpense: async (id: string): Promise<{ message: string; expense: Expense }> => {
    return apiClient.post(`/expenses/${id}/approve`);
  },
  rejectExpense: async (id: string, rejection_reason: string): Promise<{ message: string; expense: Expense }> => {
    return apiClient.post(`/expenses/${id}/reject`, { rejection_reason });
  },
  reimburseExpense: async (id: string): Promise<{ message: string; expense: Expense }> => {
    return apiClient.post(`/expenses/${id}/reimburse`);
  },

  // Invoices
  getInvoices: async (params?: { project_id?: string; status?: string }): Promise<{ invoices: Invoice[] }> => {
    return apiClient.get('/invoices', { params });
  },
  createInvoice: async (data: any, idempotencyKey?: string): Promise<{ message: string; invoice: Invoice }> => {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['X-Idempotency-Key'] = idempotencyKey;
    }
    return apiClient.post('/invoices', data, { headers });
  },
  getInvoice: async (id: string): Promise<{ invoice: Invoice }> => {
    return apiClient.get(`/invoices/${id}`);
  },
  updateInvoice: async (id: string, data: Partial<Invoice>): Promise<{ message: string; invoice: Invoice }> => {
    return apiClient.put(`/invoices/${id}`, data);
  },
  deleteInvoice: async (id: string): Promise<{ message: string }> => {
    return apiClient.delete(`/invoices/${id}`);
  },
  sendInvoice: async (id: string): Promise<{ message: string; invoice: Invoice }> => {
    return apiClient.post(`/invoices/${id}/send`);
  },
  markInvoicePaid: async (id: string): Promise<{ message: string; invoice: Invoice }> => {
    return apiClient.post(`/invoices/${id}/mark-paid`);
  },
  voidInvoice: async (id: string): Promise<{ message: string; invoice: Invoice }> => {
    return apiClient.post(`/invoices/${id}/void`);
  },
  getInvoicePdfUrl: (id: string): string => {
    return `/api/v1/invoices/${id}/pdf`;
  },

  // Reports
  getReportCatalog: async (): Promise<{ reports: ReportCatalogItem[] }> => {
    return apiClient.get('/reports/catalog');
  },
  generateReport: async (data: { report_type: string; parameters?: Record<string, any>; format?: string }): Promise<any> => {
    return apiClient.post('/reports/generate', data);
  },
  getScheduledReports: async (): Promise<{ scheduled_reports: ScheduledReport[] }> => {
    return apiClient.get('/reports/scheduled');
  },
  createScheduledReport: async (data: { report_type: string; title: string; parameters?: Record<string, any>; schedule: string; recipients: string[]; format?: string }): Promise<{ message: string; scheduled_report: ScheduledReport }> => {
    return apiClient.post('/reports/scheduled', data);
  },
  deleteScheduledReport: async (id: string): Promise<{ message: string }> => {
    return apiClient.delete(`/reports/scheduled/${id}`);
  },

  // Dashboards & Widgets
  getWidgets: async (): Promise<{ widgets: WidgetCatalogItem[] }> => {
    return apiClient.get('/widgets');
  },
  getDashboards: async (params?: { project_id?: string }): Promise<{ dashboards: DashboardItem[] }> => {
    return apiClient.get('/dashboards', { params });
  },
  createDashboard: async (data: { title: string; project_id?: string | null; layout: any[]; is_default?: boolean; is_shared?: boolean }): Promise<{ message: string; dashboard: DashboardItem }> => {
    return apiClient.post('/dashboards', data);
  },
  updateDashboard: async (id: string, data: Partial<DashboardItem>): Promise<{ message: string; dashboard: DashboardItem }> => {
    return apiClient.put(`/dashboards/${id}`, data);
  },
  deleteDashboard: async (id: string): Promise<{ message: string }> => {
    return apiClient.delete(`/dashboards/${id}`);
  },
};

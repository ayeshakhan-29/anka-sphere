import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.Login),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell/shell').then(m => m.Shell),
    children: [
      { path: '', redirectTo: 'projects', pathMatch: 'full' },
      {
        path: 'projects',
        loadComponent: () => import('./pages/projects/projects').then(m => m.Projects),
      },
      {
        path: 'projects/:id',
        loadComponent: () => import('./pages/project-detail/project-detail').then(m => m.ProjectDetail),
        children: [
          { path: '', redirectTo: 'overview', pathMatch: 'full' },
          { path: 'overview',     loadComponent: () => import('./pages/project-detail/project-overview').then(m => m.ProjectOverview) },
          { path: 'profiling',    loadComponent: () => import('./pages/project-detail/profiling/profiling').then(m => m.Profiling) },
          { path: 'content',      loadComponent: () => import('./pages/project-detail/written-content/written-content').then(m => m.WrittenContent) },
          {
            path: 'design',
            loadComponent: () => import('./pages/project-detail/design/design').then(m => m.DesignModule),
            canDeactivate: [(component: { canLeave?: () => boolean }) => component.canLeave?.() ?? true],
          },
          { path: 'development',  loadComponent: () => import('./pages/project-detail/development/development').then(m => m.DevelopmentTab) },
          { path: 'analytics',    loadComponent: () => import('./pages/project-detail/marketing/marketing').then(m => m.MarketingTab) },
          { path: 'reporting',    loadComponent: () => import('./pages/project-detail/reporting/reporting').then(m => m.ReportingTab) },
        ],
      },
      { path: 'profiling',        loadComponent: () => import('./pages/profiling-dept/profiling-dept').then(m => m.ProfilingDept) },
      { path: 'written-content',  loadComponent: () => import('./pages/written-content-dept/written-content-dept').then(m => m.WrittenContentDept) },
      { path: 'design',           loadComponent: () => import('./pages/design-dept/design-dept').then(m => m.DesignDept) },
      { path: 'development',      loadComponent: () => import('./pages/development-dept/development-dept').then(m => m.DevelopmentDept) },
      { path: 'analytics',        loadComponent: () => import('./pages/analytics-hub/analytics-hub').then(m => m.AnalyticsHub) },
      { path: 'content-marketing',loadComponent: () => import('./pages/content-marketing-dept/content-marketing-dept').then(m => m.ContentMarketingDept) },
      { path: 'social',           loadComponent: () => import('./pages/social-dept/social-dept').then(m => m.SocialDept) },
      { path: 'paid',             loadComponent: () => import('./pages/paid-dept/paid-dept').then(m => m.PaidDept) },
      { path: 'seo',              loadComponent: () => import('./pages/seo-dept/seo-dept').then(m => m.SeoDept) },
      { path: 'reporting',        loadComponent: () => import('./pages/reporting/reporting-dept').then(m => m.ReportingDept) },
      { path: 'maintenance',      loadComponent: () => import('./pages/maintenance/maintenance').then(m => m.MaintenancePage) },
      { path: 'settings',         loadComponent: () => import('./pages/settings/settings').then(m => m.Settings) },
    ],
  },
  // Unknown URLs go to the app (auth guard sends logged-out users to /login)
  { path: '**', redirectTo: '/app/projects' },
];

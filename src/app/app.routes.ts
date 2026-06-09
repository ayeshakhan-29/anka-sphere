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
          { path: 'design',       loadComponent: () => import('./pages/project-detail/design/design').then(m => m.DesignModule) },
          { path: 'development',  loadComponent: () => import('./pages/placeholder/placeholder').then(m => m.Placeholder) },
          { path: 'analytics',    loadComponent: () => import('./pages/placeholder/placeholder').then(m => m.Placeholder) },
          { path: 'reporting',    loadComponent: () => import('./pages/placeholder/placeholder').then(m => m.Placeholder) },
        ],
      },
      { path: 'profiling',        loadComponent: () => import('./pages/profiling-dept/profiling-dept').then(m => m.ProfilingDept) },
      { path: 'written-content',  loadComponent: () => import('./pages/written-content-dept/written-content-dept').then(m => m.WrittenContentDept) },
      { path: 'design',           loadComponent: () => import('./pages/design-dept/design-dept').then(m => m.DesignDept) },
      { path: 'development',      loadComponent: () => import('./pages/placeholder/placeholder').then(m => m.Placeholder) },
      { path: 'analytics',        loadComponent: () => import('./pages/placeholder/placeholder').then(m => m.Placeholder) },
      { path: 'content-marketing',loadComponent: () => import('./pages/placeholder/placeholder').then(m => m.Placeholder) },
      { path: 'social',           loadComponent: () => import('./pages/placeholder/placeholder').then(m => m.Placeholder) },
      { path: 'paid',             loadComponent: () => import('./pages/placeholder/placeholder').then(m => m.Placeholder) },
      { path: 'seo',              loadComponent: () => import('./pages/placeholder/placeholder').then(m => m.Placeholder) },
      { path: 'reporting',        loadComponent: () => import('./pages/placeholder/placeholder').then(m => m.Placeholder) },
    ],
  },
  { path: '**', redirectTo: '/login' },
];

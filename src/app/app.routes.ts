import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.Login),
  },
  {
    path: 'app',
    loadComponent: () => import('./layout/shell/shell').then(m => m.Shell),
    children: [
      { path: '', redirectTo: 'projects', pathMatch: 'full' },
      {
        path: 'projects',
        loadComponent: () => import('./pages/projects/projects').then(m => m.Projects),
      },
      // Placeholders — to be built module by module
      { path: 'profiling', loadComponent: () => import('./pages/placeholder/placeholder').then(m => m.Placeholder) },
      { path: 'written-content', loadComponent: () => import('./pages/placeholder/placeholder').then(m => m.Placeholder) },
      { path: 'design', loadComponent: () => import('./pages/placeholder/placeholder').then(m => m.Placeholder) },
      { path: 'development', loadComponent: () => import('./pages/placeholder/placeholder').then(m => m.Placeholder) },
      { path: 'analytics', loadComponent: () => import('./pages/placeholder/placeholder').then(m => m.Placeholder) },
      { path: 'content-marketing', loadComponent: () => import('./pages/placeholder/placeholder').then(m => m.Placeholder) },
      { path: 'social', loadComponent: () => import('./pages/placeholder/placeholder').then(m => m.Placeholder) },
      { path: 'paid', loadComponent: () => import('./pages/placeholder/placeholder').then(m => m.Placeholder) },
      { path: 'seo', loadComponent: () => import('./pages/placeholder/placeholder').then(m => m.Placeholder) },
      { path: 'reporting', loadComponent: () => import('./pages/placeholder/placeholder').then(m => m.Placeholder) },
    ],
  },
  { path: '**', redirectTo: '/login' },
];

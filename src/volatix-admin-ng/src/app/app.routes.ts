import { Routes } from '@angular/router';
import { Dashboard } from './features/dashboard/dashboard';
import { ServicesList } from './features/services/services-list/services-list';
import { ServiceDetail } from './features/services/service-detail/service-detail';
import { Settings } from './features/settings/settings';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: Dashboard },
  { path: 'services', component: ServicesList },
  { path: 'service/:id', component: ServiceDetail },
  { path: 'settings', component: Settings },
  { path: '**', redirectTo: '/dashboard' },
];

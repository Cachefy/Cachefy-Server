import { Routes } from '@angular/router';
import { Dashboard } from './features/dashboard/dashboard';
import { ServicesList } from './features/services/services-list/services-list';
import { ServiceDetail } from './features/services/service-detail/service-detail';
import { CacheKeys } from './features/services/cache-keys/cache-keys';
import { Settings } from './features/settings/settings';
import { Login } from './features/auth/login/login';
import { UsersList } from './features/users/users-list/users-list';
import { UserDetail } from './features/users/user-detail/user-detail';
import { AuthGuard, GuestGuard } from './core/guards/auth.guard';
import { UserRole } from './core/models/user.model';

export const routes: Routes = [
  {
    path: 'login',
    component: Login,
    canActivate: [GuestGuard],
    title: 'Login - cachefy Admin',
  },
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [AuthGuard],
    title: 'Dashboard - cachefy Admin',
  },
  {
    path: 'services',
    component: ServicesList,
    canActivate: [AuthGuard],
    title: 'Services - cachefy Admin',
  },
  {
    path: 'service/:id',
    component: ServiceDetail,
    canActivate: [AuthGuard],
    title: 'Service Details - cachefy Admin',
  },
  {
    path: 'service/:id/cache-keys',
    component: CacheKeys,
    canActivate: [AuthGuard],
    title: 'Cache Keys - cachefy Admin',
  },
  {
    path: 'settings',
    component: Settings,
    canActivate: [AuthGuard],
    data: { roles: [UserRole.ADMIN, UserRole.MANAGER] }, // Only admin and manager can access settings
    title: 'Settings - cachefy Admin',
  },
  {
    path: 'users',
    component: UsersList,
    canActivate: [AuthGuard],
    data: { roles: [UserRole.ADMIN] }, // Only admin can manage users
    title: 'User Management - cachefy Admin',
  },
  {
    path: 'users/:id',
    component: UserDetail,
    canActivate: [AuthGuard],
    data: { roles: [UserRole.ADMIN] }, // Only admin can manage users
    title: 'User Details - cachefy Admin',
  },
  {
    path: '**',
    redirectTo: '/login',
  },
];

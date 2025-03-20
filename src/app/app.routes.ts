import { Routes } from '@angular/router';
import { dataListRoutes } from './features/data-list/data-list.routes';
import { pageRoutes } from './features/page/page.routes';

export const routes: Routes = [
  ...dataListRoutes,
  ...pageRoutes,
  {
    // redirect to data-list
    path: '**',
    redirectTo: 'data-list',
    pathMatch: 'full',
  },
];

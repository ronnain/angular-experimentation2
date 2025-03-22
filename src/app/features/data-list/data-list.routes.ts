import { Route } from '@angular/router';
import { DataListComponent } from './data-list.component';

export const dataListRoutes: Route[] = [
  {
    path: 'data-list',
    component: DataListComponent,
  },
  {
    path: 'signal',
    loadComponent: () => import('./signal-data-service/signal-data-list.ng'),
  },
];

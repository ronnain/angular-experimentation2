import { Routes } from '@angular/router';
import { dataListRoutes } from './features/data-list/data-list.routes';
import { pageRoutes } from './features/page/page.routes';
import { PerformanceRoutes } from './features/performance/performance.routes';

export const routes: Routes = [
  ...dataListRoutes,
  ...pageRoutes,
  ...PerformanceRoutes,
];

import { Route } from '@angular/router';
import PerformanceBasicPatternComponent from './performance-basic-pattern.ng';

export const PerformanceRoutes: Route[] = [
  {
    path: 'performance',
    children: [
      {
        path: 'basic-pattern',
        component: PerformanceBasicPatternComponent,
      },
      {
        path: '**',
        redirectTo: 'basic-pattern',
        pathMatch: 'full',
      },
    ],
  },
];

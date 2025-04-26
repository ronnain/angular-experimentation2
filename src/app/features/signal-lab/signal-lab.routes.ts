import { Route } from '@angular/router';

export const signalLabRoutes: Route[] = [
  {
    path: 'signal-lab',
    children: [
      {
        path: 'resource-by-group',
        loadComponent: () => import('./resource-by-group/resource-by-group.ng'),
      },
    ],
  },
];

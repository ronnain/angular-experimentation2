import { Route } from '@angular/router';

export const signalLabRoutes: Route[] = [
  {
    path: 'signal-lab',
    children: [
      {
        path: 'resource-by-group',
        loadComponent: () => import('./resource-by-group/resource-by-group.ng'),
      },
      {
        path: 'resource-store',
        loadComponent: () => import('./resource-store/resource-store.ng'),
      },
      {
        path: 'pipe',
        loadComponent: () => import('./pipe/my-signal-store.ng'),
      },
      {
        path: 'signal-store-with-query',
        loadComponent: () =>
          import('./signal-store-with-server-state/view.component'),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./signal-store-with-server-state/demo/users-list.view'),
        children: [
          {
            path: ':userId',
            loadComponent: () =>
              import('./signal-store-with-server-state/demo/user-details.view'),
          },
        ],
      },
      {
        path: 'signal-server-state-demo',
        loadComponent: () =>
          import(
            './signal-store-with-server-state/demo/signal-server-state-demo/signal-server-state-list.view'
          ),
      },
    ],
  },
];

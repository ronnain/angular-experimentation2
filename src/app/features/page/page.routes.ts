import { Route } from '@angular/router';

export const pageRoutes: Route[] = [
  {
    path: 'page',
    loadComponent: () =>
      import('./page.component').then((m) => m.PageComponent),
  },
];

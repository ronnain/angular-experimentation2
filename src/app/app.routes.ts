import { Routes } from '@angular/router';
import { pageRoutes } from './features/page/page.routes';
import { signalLabRoutes } from './features/signal-lab/signal-lab.routes';

export const routes: Routes = [...pageRoutes, ...signalLabRoutes];

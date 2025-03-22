import {
  withDataService,
  withCallState,
  withUndoRedo,
} from '@angular-architects/ngrx-toolkit';
import { signalStore } from '@ngrx/signals';
import { withEntities } from '@ngrx/signals/entities';
import { SignalDataItem } from './item-type';
import { SignalDataItemService } from './data-item-service';

export const SimpleFlightBookingStore = signalStore(
  { providedIn: 'root' },
  withCallState(),
  withEntities<SignalDataItem>(),
  withDataService({
    dataServiceType: SignalDataItemService,
    filter: { page: 1, pageSize: 3 },
  }),
  withUndoRedo()
);

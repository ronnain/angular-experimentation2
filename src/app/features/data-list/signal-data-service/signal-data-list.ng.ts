import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { SimpleFlightBookingStore } from './signal-data-service.store';

@Component({
  selector: 'app-signal-data-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      class="btn"
      (click)="simpleFlightBookingStore.create({
        id: '',
        name: 'test',
        optimisticId: 'createTest',
    })"
    >
      Add Data
    </button>
    <button
      class="btn"
      (click)="simpleFlightBookingStore.update({
        id: '10',
        name: 'test Update 10',
        optimisticId: undefined,
    })"
    >
      Update Data 10
    </button>
    <button
      class="btn"
      (click)="simpleFlightBookingStore.update({
        id: '9',
        name: 'test Update 9',
        optimisticId: undefined,
    })"
    >
      Update Data 9
    </button>

    <div class="stats shadow mx-auto bg-white">
      <div class="stat">
        <div class="stat-title">Fetch status</div>
        <div class="stat-value flex items-center gap-3">
          @if(simpleFlightBookingStore.loading()) {
          <div class="inline-grid *:[grid-area:1/1]">
            <div class="status status-primary animate-ping"></div>
            <div class="status status-primary"></div>
          </div>
          Loading } @if(simpleFlightBookingStore.loaded()) {
          <div class="inline-grid *:[grid-area:1/1]">
            <div class="status status-success"></div>
            <div class="status status-success"></div>
          </div>
          Loaded }
        </div>
      </div>
    </div>

    current
    <pre>{{ simpleFlightBookingStore.current() | json }}</pre>
    selectedEntities
    <pre>{{ simpleFlightBookingStore.selectedEntities() | json }}</pre>
    selectedIds
    <pre>{{ simpleFlightBookingStore.selectedIds() | json }}</pre>

    Error
    <pre>{{ simpleFlightBookingStore.error() | json }}</pre>

    entities
    <pre>{{ simpleFlightBookingStore.entities() | json }}</pre>
  `,
})
export default class SignalDataListNg {
  protected readonly simpleFlightBookingStore = inject(
    SimpleFlightBookingStore
  );

  constructor() {
    this.simpleFlightBookingStore.load();
  }
  test = this.simpleFlightBookingStore.selectedEntities();
}

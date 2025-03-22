import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { PerformanceItem, PerformanceService } from './performance.service';
import {
  map,
  merge,
  scan,
  share,
  startWith,
  switchMap,
  tap,
  timer,
} from 'rxjs';

@Component({
  selector: 'app-performance-basic-pattern',
  imports: [CommonModule],
  template: `
    <button class="btn" (click)="increment()">
      Increment {{ ownCounter() }}
    </button>
    <div class="stats shadow">
      <div class="stat">
        <div class="stat-title">Total Data Update</div>
        <div class="stat-value">{{ totalUpdate$ | async }}</div>
        <div class="stat-desc">{{ uptime$ | async }}</div>
      </div>
    </div>

    <div class="bg-white p-4 rounded shadow mt-8">
      <h2 class="font-bold">Entities</h2>
      <div class="relative overflow-x-auto">
        <table class="table table-zebra">
          <thead class="">
            <tr>
              <th scope="col" class="">ID</th>
              <th scope="col" class="">Name</th>
              <th scope="col" class="">Counter 1</th>
              <th scope="col" class="">Counter 2</th>
              <th scope="col" class="">Counter 3</th>
            </tr>
          </thead>
          <tbody>
            @for(entityData of data$ | async; track entityData.id) {
            <tr class="">
              <th scope="row" class="flex items-center gap-3">
                {{ entityData.id }}
              </th>
              <td class="">{{ entityData.name }}</td>
              <td class="">{{ entityData.counter1 }}</td>
              <td class="">{{ entityData.counter2 }}</td>
              <td class="">{{ entityData.counter3 }}</td>
            </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export default class PerformanceBasicPatternComponent {
  private readonly performanceService = inject(PerformanceService);

  protected readonly ownCounter = signal(0);

  protected readonly data$ = merge(
    this.performanceService
      .getBasicDataList$()
      .pipe(map((data) => ({ data, type: 'data' as const }))),
    this.performanceService.itemUpdatedCounter1$.pipe(
      map((data) => ({ data, type: 'update1' as const }))
    ),
    this.performanceService.itemUpdatedCounter2$.pipe(
      map((data) => ({ data, type: 'update2' as const }))
    ),
    this.performanceService.itemUpdatedCounter3$.pipe(
      map((data) => ({ data, type: 'update3' as const }))
    )
  ).pipe(
    scan((acc, curr) => {
      if (curr.type === 'data') {
        return [...acc, ...curr.data];
      }
      if (curr.type === 'update1') {
        return acc.map((item) =>
          item.id === curr.data.id
            ? { ...item, counter1: item.counter1 + 1 }
            : item
        );
      }
      if (curr.type === 'update2') {
        return acc.map((item) =>
          item.id === curr.data.id
            ? { ...item, counter2: item.counter2 + 1 }
            : item
        );
      }
      if (curr.type === 'update3') {
        return acc.map((item) =>
          item.id === curr.data.id
            ? { ...item, counter3: item.counter3 + 1 }
            : item
        );
      }
      return acc;
    }, [] as PerformanceItem[]),
    share()
  );

  protected readonly totalUpdate$ = this.data$.pipe(
    scan((acc) => {
      return acc + 1;
    }, 0)
  );

  protected increment() {
    this.ownCounter.update((state) => state + 1);
  }

  protected readonly uptime$ = timer(0, 1000).pipe(
    map((seconds) => this.formatDuration(seconds))
  );

  private formatDuration(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  }
}

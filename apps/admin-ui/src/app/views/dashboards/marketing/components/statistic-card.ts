import {Component, Input} from '@angular/core';
import {StatisticCardType} from '@/app/views/dashboards/marketing/data';

@Component({
  selector: 'app-statistic-card',
  imports: [],
  template: `
    <div class="card mb-g">
      <div class="card-body">
        <h6 class="text-muted text-uppercase mt-0">{{ item.title }}</h6>
        <h2 [class]="'text-' + (item.variant || '')">
          {{ item.prefix || '' }}{{ item.count }} {{ item.suffix || '' }}
        </h2>
        <div class="d-flex align-items-center gap-2">
          @if (item.change) {
            <span class="badge bg-primary">{{ item.change }}</span>
          }
          <span class="text-muted">{{ item.subtitle }}</span>

          @if (item.totalChange) {
            <div class="ms-auto d-flex gap-2 align-items-center">
              <svg class="sa-icon sa-bold sa-icon-success ms-1">
                <use href="/assets/icons/sprite.svg#trending-up"></use>
              </svg>
              {{ item.totalChange }}
            </div>
          }
        </div>
      </div>
    </div>

  `,
  styles: ``
})
export class StatisticCard {
  @Input() item!: StatisticCardType;
}

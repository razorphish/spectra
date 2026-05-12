import {Component, Input} from '@angular/core';
import {StatisticWidgetType} from '@/app/views/dashboards/subscription/data';
import {NgClass} from '@angular/common';
import {NgIcon} from '@ng-icons/core';

@Component({
  selector: 'app-statistic-widget',
  imports: [
    NgClass,
    NgIcon
  ],
  template: `
    <div class="card">
      <div class="row">
        <div class="col-6">
          <div class="p-3">
            <p class="p-0 mb-3 text-muted text-truncate">{{ item.title }}</p>
            <span class="h5 text-nowrap">
          {{ item.prefix && item.prefix }}
              {{ item.count }}
              <sup [ngClass]="['text-success', item.changeVariant || '']">
            {{ item.percentage }}
          </sup>
        </span>
          </div>
        </div>

        <div class="col-6">
          <div class="d-flex h-100 align-items-center justify-content-end pe-3">
            <div
              class="width-5 height-5 bg-dark bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center"
            >
              <ng-icon [name]="item.icon" class="h4 text-primary m-0"></ng-icon>
            </div>
          </div>
        </div>
      </div>
    </div>

  `,
  styles: ``
})
export class StatisticWidget {
  @Input() item!: StatisticWidgetType;
}

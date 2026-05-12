import {Component, Input} from '@angular/core';
import {ProjectStatisticType} from '@/app/views/dashboards/project-management/data';
import {NgClass} from '@angular/common';

@Component({
  selector: 'app-project-statistic-widget',
  imports: [
    NgClass
  ],
  template: `
    <div class="card mb-g">
      <div class="card-body">
        <h6 class="text-muted text-uppercase mt-0">{{ item.title }}</h6>
        <h2>{{ item.count }}</h2>
        <div class="d-flex align-items-center gap-2">
          <span class="badge" [ngClass]="'bg-' + item.variant">{{ item.change }}</span>
          <span class="text-muted">{{ item.subtitle }}</span>
        </div>
      </div>
    </div>

  `,
  styles: ``
})
export class ProjectStatisticWidget {
  @Input({required:true}) item!: ProjectStatisticType;
}

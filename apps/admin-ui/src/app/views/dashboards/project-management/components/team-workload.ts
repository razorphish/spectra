import { Component } from '@angular/core';
import {PanelCard} from '@app/components/panel-card';
import {Apexchart} from '@app/components/apexchart';
import {teamWorkloadChartOptions} from '@/app/views/dashboards/project-management/data';

@Component({
  selector: 'app-team-workload',
  imports: [
    PanelCard,
    Apexchart
  ],
  template: `
    <app-panel-card>
        <h2 card-title>Team <span class="fw-light"><i>Workload</i></span></h2>
          <div card-toolbar class="btn-group team-workload-filters">
            <button type="button" class="btn btn-xs btn-outline-default" [class.active]="filter === 'week'"
                    (click)="handleFilterChange('week')">Weekly</button>
            <button type="button" class="btn btn-xs btn-outline-default"   [class.active]="filter === 'month'"
                    (click)="handleFilterChange('month')">Monthly</button>
          </div>
        <div card-content class="panel-content">
          <app-apexchart [getOptions]="teamWorkloadChartOptions" [series]="series"/>
        </div>

    </app-panel-card>
  `,
  styles: ``
})
export class TeamWorkload {
  filter: 'week' | 'month' = 'week';

  teamMembers = [
    'Alex Johnson',
    'Sarah Williams',
    'Michael Chen',
    'Olivia Smith',
    'David Rodriguez',
    'Emma Wilson',
    'James Lee',
    'Sophia Martinez'
  ];

  daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  series: any[] = [];

  constructor() {
    this.updateData();
  }

  generateData(count: number, min: number, max: number) {
    const days = this.filter === 'week' ? this.daysOfWeek : this.daysOfWeek;
    return Array.from({ length: count }, (_, i) => ({
      name: this.teamMembers[i],
      data: days.map(day => ({
        x: day,
        y: Math.floor(Math.random() * (max - min + 1)) + min
      }))
    }));
  }

  updateData() {
    if (this.filter === 'week') {
      this.series = this.generateData(this.teamMembers.length, 0, 10);
    } else {
      this.series = this.generateData(this.teamMembers.length, 10, 40);
    }
  }

  handleFilterChange(newFilter: 'week' | 'month') {
    this.filter = newFilter;
    this.updateData();
  }

  protected readonly teamWorkloadChartOptions = teamWorkloadChartOptions;
}

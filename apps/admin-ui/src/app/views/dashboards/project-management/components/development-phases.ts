import {Component} from '@angular/core';
import {PanelCard} from '@app/components/panel-card';
import {developmentPhasesChartOptions, developmentPhasesSeries} from '@/app/views/dashboards/project-management/data';
import {Apexchart} from '@app/components/apexchart';

@Component({
  selector: 'app-development-phases',
  imports: [
    PanelCard,
    Apexchart
  ],
  template: `
    <app-panel-card>
      <h2 card-title>Development <span class="fw-light"><i>Phases</i></span></h2>
      <div class="panel-content" card-content>
      <div class="chart-controls development-phases-filters d-flex justify-content-center gap-1">
        @for (team of ['all', 'Frontend Team', 'Backend Team', 'QA Team', 'DevOps Team']; track $index) {
          <button
            class="btn btn-xs btn-outline-default"
            (click)="setFilter(team)">
            {{ team === 'all' ? 'All Teams' : team.replace(' Team', '') }}
          </button>
        }
      </div>
        <app-apexchart [getOptions]="developmentPhasesChartOptions" [series]="filteredSeries"/>
      </div>
    </app-panel-card>
  `,
  styles: ``
})
export class DevelopmentPhases {
  filter = 'all';

  allSeries = developmentPhasesSeries;
  filteredSeries = this.allSeries;

  setFilter(team: string) {
    this.filter = team;
    if (team === 'all') {
      this.filteredSeries = this.allSeries;
    } else {
      this.filteredSeries = this.allSeries.filter(s => s.name === team);
    }
  }

  protected readonly developmentPhasesChartOptions = developmentPhasesChartOptions;
}

import { Component } from '@angular/core';
import {PanelCard} from '@app/components/panel-card';
import {Apexchart} from '@app/components/apexchart';
import {getLiveFeedsChartOptions} from '@/app/views/dashboards/marketing/data';

@Component({
  selector: 'app-live-feeds',
  imports: [
    PanelCard,
    Apexchart
  ],
  template: `
    <app-panel-card>
        <h2 card-title> Live <span class="fw-light"><i>Feeds</i></span>
        </h2>
        <div class="panel-content" card-content>
          <app-apexchart [getOptions]="getLiveFeedsChartOptions"/>
        </div>

    </app-panel-card>
  `,
  styles: ``
})
export class LiveFeeds {

  protected readonly getLiveFeedsChartOptions = getLiveFeedsChartOptions;
}

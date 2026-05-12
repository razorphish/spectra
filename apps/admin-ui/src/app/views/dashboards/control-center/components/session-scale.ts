import {Component} from '@angular/core';
import {PanelCard} from '@app/components/panel-card';
import {Apexchart} from '@app/components/apexchart';
import {getSessionScaleChartOptions} from '@/app/views/dashboards/control-center/components/data';
import {NgbAlert, NgbProgressbar} from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-session-scale',
  imports: [
    PanelCard,
    Apexchart,
    NgbProgressbar,
    NgbAlert
  ],
  template: `
    <app-panel-card>
      <h2 card-title> Session <span class="fw-light"><i>Scale</i></span></h2>
      <ng-content card-content>
        <div class="panel-content p-0 mb-g">
          @if (show) {
          <ngb-alert [dismissible]="false" type="success" (close)="handleClose()"
                     class="bg-success bg-opacity-10 fade show border-faded border-start-0 border-end-0 rounded-0 m-0 d-flex align-items-center py-2 fs-sm"
                     role="alert">
            <p class="m-0">Last update was on <span class="js-get-date">Friday, May 2, 2025</span>
              - Your logs are all up to date.</p>
            <button type="button" class="btn btn-system ms-auto" (click)="handleClose()">
              <svg class="sa-icon sa-icon-2x sa-icon-dark">
                <use href="/assets/icons/sprite.svg#x"></use>
              </svg>
            </button>
          </ngb-alert>
          }
        </div>
        <div class="panel-content">
          <div class="row mb-g">
            <div class="col-md-6">
              <div class="d-flex align-items-center justify-content-center">
                <app-apexchart [getOptions]="getSessionScaleChartOptions"/>
              </div>
            </div>
            <div class="col-md-6 col-lg-5 me-lg-auto">
              @for (item of progressData; track $index) {
                <div class="d-flex mt-2 mb-1 fs-xs text-{{item.variant}}">
                  Current Usage
                </div>
                <ngb-progressbar class="mb-3 progress-xs bg-opacity-75" [value]="item.value" [type]="item.variant"/>

              }
            </div>
          </div>
        </div>
      </ng-content>
    </app-panel-card>

  `,
  styles: ``
})
export class SessionScale {
  show = true
  progressData = [
    {label: 'Current Usage', variant: 'primary', value: 70},
    {label: 'Net Usage', variant: 'info', value: 30},
    {label: 'Users blocked', variant: 'warning', value: 40},
    {label: 'Custom cases', variant: 'danger', value: 15},
    {label: 'Test logs', variant: 'success', value: 25},
    {label: 'Uptime records', variant: 'dark', value: 10},
  ]

  handleClose() {
    this.show = false
  }

  protected readonly getSessionScaleChartOptions = getSessionScaleChartOptions;
}

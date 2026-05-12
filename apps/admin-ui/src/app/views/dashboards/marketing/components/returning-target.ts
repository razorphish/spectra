import {Component} from '@angular/core';
import {PanelCard} from '@app/components/panel-card';
import type {ApexOptions} from 'ng-apexcharts';
import {Apexchart} from '@app/components/apexchart';
import {getReturningTargetChartOptions} from '@/app/views/dashboards/marketing/data';

@Component({
  selector: 'app-returning-target',
  imports: [
    PanelCard,
    Apexchart
  ],
  template: `
    <app-panel-card [toolbox]="true">
      <h2 card-title>
        Returning <span class="fw-light"><i>Target</i></span>
      </h2>
      <div class="panel-content position-relative" card-content>

        <div
          class="p-1 position-absolute end-0 top-0 mt-5 me-3 z-1 d-flex align-items-center justify-content-center">

          <div
            class="border-faded border-top-0 border-start-0 border-bottom-0 py-2 pe-4 me-3 hidden-sm-down">
            <div class="text-end fw-500 l-h-n d-flex flex-column">
              <div class="h5 m-0 d-flex align-items-center justify-content-end">
                $44.34 GE
                <svg class="sa-icon sa-bold sa-icon-success ms-1">
                  <use href="/assets/icons/sprite.svg#trending-up"></use>
                </svg>
              </div>
              <span class="m-0 fs-xs text-muted">Redux margins and estimates</span>
            </div>
          </div>

          <div style="position: relative; width: 120px; height: 120px;">
            <div style="position: absolute; top: 0; left: 0;">
              <app-apexchart [getOptions]="outerChartOptions"/>
            </div>
            <div style="position: absolute; top: 20px; left: 20px;">
              <app-apexchart [getOptions]="innerChartOptions"/>
            </div>
          </div>
        </div>

        <app-apexchart [getOptions]="getReturningTargetChartOptions"/>
      </div>

    </app-panel-card>

  `,
  styles: ``
})
export class ReturningTarget {

  outerChartOptions = (): ApexOptions => ({
    series: [35],
    chart: {
      type: 'radialBar',
      height: 120,
      width: 120,
      sparkline: {enabled: true},
    },
    plotOptions: {
      radialBar: {
        track: {
          background: '#eee',
          strokeWidth: '100%',
        },
        dataLabels: {
          show: false,
        },

        hollow: {
          margin: 0,
          size: '50%',
          background: 'transparent',
        },
      },
    },
    fill: {
      type: 'solid',
      colors: ['#a084e8'],
    },
    labels: ['Outer'],
  })

  innerChartOptions = (): ApexOptions => ({
    series: [65],
    chart: {
      height: 80,
      width: 80,
      type: 'radialBar',
      sparkline: {enabled: true},
    },
    plotOptions: {
      radialBar: {
        track: {
          background: '#f3f3f3',
          strokeWidth: '100%',
        },
        dataLabels: {
          name: {show: false},
          value: {
            fontSize: '18px',
            color: '#00d2c6',
            offsetY: 5,
            show: true,
            formatter: () => '78%',
          },
        },
        hollow: {
          margin: 0,
          size: '50%',
          background: 'transparent',
        },
      },
    },
    fill: {
      type: 'solid',
      colors: ['#00d2c6'],
    },

    labels: ['Inner'],
  })
  protected readonly getReturningTargetChartOptions = getReturningTargetChartOptions;
}

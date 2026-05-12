import { Component } from '@angular/core';
import type {ApexOptions} from 'ng-apexcharts';
import {Apexchart} from '@app/components/apexchart';

@Component({
  selector: 'app-statistic-with-chart',
  imports: [
    Apexchart
  ],
  template: `
    <div class="d-none d-sm-flex align-items-center ">
      <div class="d-flex align-items-center">
        <div class="d-none d-md-inline-flex">
          <app-apexchart [getOptions]="getClickRateChartOptions" />
        </div>
        <div class="d-inline-flex flex-column justify-content-center ms-2">
                                    <span class="fw-500 fs-xs d-block">
                                        <small>Click Rate</small>
                                    </span>
          <span class="fw-500 fs-xl d-flex align-items-center text-success"> 70% <svg
            class="sa-icon sa-bold sa-icon-success ms-1">
                                            <use href="/assets/img/sprite.svg#trending-up"></use>
                                        </svg>
          </span>
        </div>
      </div>
      <div
        class="d-flex align-items-center border-faded border-dashed border-top-0 border-bottom-0 border-end-0 ms-3 ps-3">
        <div class="d-none d-md-inline-flex">
         <app-apexchart [getOptions]="getBounceRateChartOptions"/>
        </div>
        <div class="d-inline-flex flex-column justify-content-center ms-2">
                                    <span class="fw-500 fs-xs d-block">
                                        <small>Bounce Rate</small>
                                    </span>
          <span class="fw-500 fs-xl d-flex align-items-center text-danger"> 10% <svg
            class="sa-icon sa-bold ms-1 sa-icon-danger">
                                            <use href="/assets/img/sprite.svg#trending-down"></use>
                                        </svg>
                                    </span>
        </div>
      </div>
    </div>
  `,
  styles: ``
})
export class StatisticWithChart {
  getClickRateChartOptions = (): ApexOptions => ({
    series: [70],
    chart: {
      type: 'radialBar',
      height: 60,
      width: 60,
    },
    colors: ['var(--success-300)', '#676a6c'],
    legend: { show: false },
    tooltip: { enabled: false },
    dataLabels: { enabled: false },
    plotOptions: {
      radialBar: {
        hollow: { margin: 0, size: '45%' },
        track: { margin: 0 },
        dataLabels: { show: false },
      },
    },
  })

   getBounceRateChartOptions = (): ApexOptions => ({
     series:[10],
    chart: {
      type: 'radialBar',
      height: 60,
      width: 60,
    },
    colors: ['var(--danger-500)', '#676a6c'],
    legend: { show: false },
    tooltip: { enabled: false },
    dataLabels: { enabled: false },
    plotOptions: {
      radialBar: {
        hollow: { margin: 0, size: '45%' },
        track: { margin: 0 },
        dataLabels: { show: false },
      },
    },
  })
}

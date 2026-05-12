import {Component, Input} from '@angular/core';
import {ApexOptions} from 'ng-apexcharts';
import {Apexchart} from '@app/components/apexchart';
import {NgClass} from '@angular/common';

@Component({
  selector: 'app-metric-stats-with-chart',
  imports: [
    Apexchart,
    NgClass
  ],
  template: `
    <div class="p-2 me-2 me-xl-3 me-xxl-3 rounded" [ngClass]="'bg-' + variant + '-300'">
      <app-apexchart [getOptions]="chartOptions"/>
    </div>

    <div class="d-flex flex-column align-items-start justify-content-center">
      <label class="fs-xs mb-0">{{ label }}</label>
      <h5 class="fw-bold mb-0">{{ value }}</h5>
    </div>

  `,
  styles: ``
})
export class MetricStatsWithChart {
  @Input({required: true}) label!: string;
  @Input({required: true}) variant!: string;
  @Input({required: true}) value!: string | number;
  @Input({required: true}) data!: number[];

  chartOptions = (): ApexOptions => ({
    series: [
      {
        name: 'Series 1',
        data: this.data
      }
    ],
    chart: {
      type: 'bar',
      height: 27,
      width: 27,
      sparkline: {enabled: true}
    },
    plotOptions: {
      bar: {
        columnWidth: '80%',
        borderRadius: 1
      }
    },
    colors: ['#fff'],
    tooltip: {enabled: false},
    xaxis: {
      labels: {show: false},
      axisBorder: {show: false},
      axisTicks: {show: false}
    },
    yaxis: {show: false},
    grid: {show: false}
  })
}

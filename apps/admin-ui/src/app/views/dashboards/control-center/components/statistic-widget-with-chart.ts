import {Component, Input} from '@angular/core';
import {StatisticWidgetType} from '@/app/views/dashboards/control-center/components/data';
import {ApexOptions} from 'ng-apexcharts';
import {Apexchart} from '@app/components/apexchart';
import {CommonModule} from '@angular/common';
import {NgIcon} from '@ng-icons/core';

@Component({
  selector: 'app-statistic-widget-with-chart',
  imports: [
    Apexchart,
    CommonModule,
    NgIcon
  ],
  template: `
    <div class="px-3 py-2 d-flex align-items-center">
      <app-apexchart [getOptions]="getCircleProgressOptions"/>

      <span class="d-flex ms-2 text-muted align-items-center">
    {{ item.title }}
        <ng-icon name="{{item.isPositive ? 'faSolidCaretUp' : 'faSolidCaretDown'}}" class="ms-1 {{item.isPositive ? 'text-success' : 'text-danger'}}"/>

  </span>

      <div class="ms-auto d-inline-flex align-items-center">
        <app-apexchart [getOptions]="chartOptions"/>
        <div class="d-inline-flex flex-column small ms-2">
      <span class="d-inline-block badge opacity-75 text-center p-1 width-6"
            [ngClass]="item.badge1.class">{{ item.badge1.label }}</span>
          <span class="d-inline-block badge opacity-75 text-center p-1 width-6 mt-1"
                [ngClass]="item.badge2.class">{{ item.badge2.label }}</span>
        </div>
      </div>
    </div>

  `,
  styles: ``
})
export class StatisticWidgetWithChart {
  @Input() item!: StatisticWidgetType;
  lineChartSeries:ApexOptions['series'];
  circleChartSeries:ApexOptions['series']

  ngOnInit() {

    this.lineChartSeries = [
      {
        name: this.item.title,
        data: this.item.lineSeries,
      },
    ]

    this.circleChartSeries = [this.item.progress]

  }

  chartOptions = (): ApexOptions => ({
    series:this.lineChartSeries,
    chart: {
      height: 34,
      width: 70,
      type: 'line',
      sparkline: {enabled: true},
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      width: 1,
    },
    tooltip: {
      enabled: false,
    },
    colors: [this.item.color],
    xaxis: {
      labels: {show: false},
      axisBorder: {show: false},
      axisTicks: {show: false},
    },
    yaxis: {
      show: false,
    },
    grid: {
      show: false,
    },
  })

  getCircleProgressOptions = (): ApexOptions => ({
    series: this.circleChartSeries,
    chart: {
      type: 'radialBar',
      height: 60,
      width: 60,
      sparkline: {enabled: true},
    },
    plotOptions: {
      radialBar: {
        hollow: {size: '70%'},
        track: {background: '#f5f5f5', strokeWidth: '100%', margin: 0},

        dataLabels: {
          name: {
            show: false,
          },
          value: {
            show: true,
            fontSize: '16px',
            fontWeight: 200,
            formatter: (value) => `${value}`,
            color: this.item.color,
            offsetY: 4,
          },
        },
      },
    },
    colors: [this.item.color],
    stroke: {
      lineCap: 'round',
      width: 5,
    },
    labels: ['Progress'],
    xaxis: {
      labels: {show: false},
      axisBorder: {show: false},
      axisTicks: {show: false},
    },
    yaxis: {
      show: false,
    },
    grid: {
      show: false,
    },
  })
}

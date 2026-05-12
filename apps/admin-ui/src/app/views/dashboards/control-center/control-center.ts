import { Component } from '@angular/core';
import {PageBreadcrumb} from '@app/components/page-breadcrumb';
import {LiveFeeds} from '@/app/views/dashboards/control-center/components/live-feeds';
import {GroupChat} from '@/app/views/dashboards/control-center/components/group-chat';
import {SubscriptionsHourly} from '@/app/views/dashboards/control-center/components/subscriptions-hourly';
import {SessionScale} from '@/app/views/dashboards/control-center/components/session-scale';
import {Calendar} from '@/app/views/dashboards/control-center/components/calendar';
import {GlobalView} from '@/app/views/dashboards/control-center/components/global-view';
import type {ApexOptions} from 'ng-apexcharts';
import {Apexchart} from '@app/components/apexchart';

@Component({
  selector: 'app-control-center',
  imports: [
    PageBreadcrumb,
    LiveFeeds,
    GroupChat,
    SubscriptionsHourly,
    SessionScale,
    Calendar,
    GlobalView,
    Apexchart
  ],
  templateUrl: './control-center.html',
  styles: ``
})
export class ControlCenter {
  expenseChartOptions = (): ApexOptions => ({
    series: [
      {
        name: 'Series 1',
        data: [3, 4, 3, 6, 7, 3, 3, 6, 2, 6, 4],
      },
    ],
    chart: {
      type: 'bar',
      height: 40,
      width: 100,
      sparkline: {
        enabled: true,
      },
    },
    colors: ['var(--primary-500)'],
    plotOptions: {
      bar: {
        columnWidth: '85%',
      },
    },
    tooltip: {
      enabled: false,
    },
    xaxis: {
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      show: false,
    },
    grid: {
      show: false,
    },
  })

   profitChartOptions = (): ApexOptions => ({
    series: [
      {
        name: 'Series 1',
        data: [1, 4, 3, 6, 5, 3, 9, 6, 5, 9, 7],
      },
    ],
    chart: {
      type: 'bar',
      height: 40,
      width: 100,
      sparkline: {
        enabled: true,
      },
    },
    colors: ['var(--danger-500)'],
    plotOptions: {
      bar: {
        columnWidth: '85%',
      },
    },
    tooltip: {
      enabled: false,
    },
    xaxis: {
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      show: false,
    },
    grid: {
      show: false,
    },
  })
}

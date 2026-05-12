import type {ApexOptions} from 'ng-apexcharts'
import {getColor} from '@/app/utils/get-color';

export type StatisticWidgetType = {
  title: string
  count: string
  prefix?: string
  percentage: string
  icon: string
  changeVariant: string
}

export const statistics: StatisticWidgetType[] = [
  {
    title: 'Active Subscriptions',
    count: '12,580',
    percentage: '+4.2%',
    icon: "faSolidCircleCheck",
    changeVariant: 'success',
  },
  {
    title: 'New Subscriptions',
    count: '1,145',
    percentage: '+7.8%',
    icon: "faSolidUserPlus",
    changeVariant: 'success',
  },
  {
    title: 'Cancellations',
    count: '326',
    percentage: '-1.5%',
    icon: "faSolidUserXmark",
    changeVariant: 'danger',
  },
  {
    title: 'Monthly Recurring Revenue',
    count: '42,860.00',
    prefix: '$',
    percentage: '+6.1%',
    icon: "faSolidChartLine",
    changeVariant: 'success',
  },
]

const categories = [
  '2025-01',
  '2025-02',
  '2025-03',
  '2025-04',
  '2025-05',
  '2025-06',
  '2025-07',
  '2025-08',
  '2025-09',
  '2025-10',
  '2025-11',
  '2025-12',
]
export const getSubscriptionChartOptions = (): ApexOptions => ({
  series: [
    {
      name: 'Visits',
      type: 'area' as const,
      data: [23686, 30820, 59622, 146465, 78160, 79520, 36148, 48721, 158303, 155174, 104830, 86895]
    },
    {
      name: 'Subscriptions',
      type: 'line' as const,
      data: [1545, 1350, 1270, 1830, 1955, 1865, 2034, 2544, 1956, 2211, 1540, 1670]
    },
  ],
  chart: {
    height: 335,
    type: 'line',
    zoom: {
      enabled: false,
    },
    stacked: false,
    toolbar: {
      show: false,
    },
    fontFamily: 'inherit',
    parentHeightOffset: 0,
  },
  colors: [
    getColor('bootstrapVars', 'bodyColor', 'rgba', 0.1), // Visits (gray, area)
    getColor('primary', 400), // Subscriptions (teal, line)
  ],
  stroke: {
    width: [1, 2],
    curve: 'smooth',
    colors: [getColor('bootstrapVars', 'bodyColor', 'rgba', 0.8), getColor('primary', 200)],
    dashArray: [4, 0], // Visits dashed, Subscriptions solid
  },
  fill: {
    type: ['solid', 'solid'],
    opacity: [0.15, 1],
  },
  markers: {
    size: [3, 3],
    colors: [getColor('bootstrapVars', 'bodyColor', 'rgba', 0.7), getColor('primary', 600)],
    strokeColors: [getColor('bootstrapVars', 'bodyColor', 'rgba', 0.7), getColor('primary', 600)],
    strokeWidth: 2,
    hover: {
      sizeOffset: 2,
    },
  },
  xaxis: {
    categories: categories,
    labels: {
      style: {
        colors: getColor('bootstrapVars', 'bodyColor', 'hex'),
        fontSize: '12px',
      },
    },
    axisBorder: {
      show: false,
    },
    axisTicks: {
      show: false,
    },
  },
  yaxis: [
    {
      seriesName: 'Visits',
      min: 20000,
      max: 170000,
      tickAmount: 6,
      labels: {
        style: {
          colors: getColor('bootstrapVars', 'bodyColor', 'hex'),
          fontSize: '12px',
        },
        formatter: function (val) {
          return val.toString()
        },
      },
    },
    {
      seriesName: 'Subscriptions',
      opposite: true,
      min: 1200,
      max: 2700,
      tickAmount: 6,
      labels: {
        style: {
          colors: getColor('bootstrapVars', 'bodyColor', 'hex'),
          fontSize: '12px',
        },
        formatter: function (val) {
          return val.toLocaleString()
        },
      },
    },
  ],
  legend: {
    show: true,
    position: 'top',
    horizontalAlign: 'center',
    fontSize: '14px',
    fontFamily: 'inherit',
    labels: {
      colors: getColor('bootstrapVars', 'bodyColor', 'hex'),
    },
    itemMargin: {
      horizontal: 12,
      vertical: 0,
    },
  },
  grid: {
    borderColor: getColor('bootstrapVars', 'bodyColor', 'rgba', 0.1),
    strokeDashArray: 3,
    yaxis: {
      lines: {
        show: true,
      },
    },
    xaxis: {
      lines: {
        show: false,
      },
    },
  },
  tooltip: {
    shared: true,
    intersect: false,
    theme: 'dark',
    y: [
      {
        formatter: function (val) {
          return val.toLocaleString()
        },
      },
      {
        formatter: function (val) {
          return val.toLocaleString()
        },
      },
    ],
  },
})

export const userActivityOptions = (): ApexOptions => ({
  series: [
    {
      name: 'Morning',
      data: [65, 59, 90, 81, 56, 55, 40],
    },
    {
      name: 'Night',
      data: [28, 48, 40, 19, 96, 27, 100],
    },
  ],
  chart: {
    height: 350,
    width: '100%',
    type: 'radar',
    toolbar: {
      show: false,
    },
    fontFamily: 'inherit',
    parentHeightOffset: 0,
    sparkline: {
      enabled: false,
    },
  },
  colors: [getColor('success', 400), getColor('primary', 400)],
  stroke: {
    width: 0,
    colors: [getColor('success', 400), getColor('primary', 400)],
  },
  fill: {
    opacity: 0.2,
  },
  markers: {
    size: 5,
    colors: [getColor('success', 400), getColor('primary', 400)],
    strokeColors: '#fff',
    strokeWidth: 2,
    hover: {
      sizeOffset: 2,
    },
  },
  xaxis: {
    categories: ['Blogging', 'Videos', 'Ads', 'Comments', 'Shares', 'Likes', 'Funny'],
    labels: {
      style: {
        colors: getColor('bootstrapVars', 'bodyColor', 'hex'),
        fontSize: '10px',
      },
    },
  },
  yaxis: {
    max: 100,
    tickAmount: 5,
    show: true,
    labels: {
      show: true,
      style: {
        colors: getColor('bootstrapVars', 'bodyColor', 'hex'),
        fontSize: '10px',
      },
    },
  },
  legend: {
    show: true,
    position: 'top',
    horizontalAlign: 'center',
    fontSize: '14px',
    fontFamily: 'inherit',
    labels: {
      colors: getColor('bootstrapVars', 'bodyColor', 'hex'),
    },
    markers: {},
    itemMargin: {
      horizontal: 12,
      vertical: 0,
    },
  },
  tooltip: {
    theme: 'dark',
    y: {
      formatter(val: number): string {
        return val.toString()
      },
    },
  },
  grid: {
    borderColor: getColor('bootstrapVars', 'bodyColor', 'rgba', 0.1),
    strokeDashArray: 3,
  },
  plotOptions: {
    radar: {
      size: undefined,
      offsetX: 0,
      offsetY: 0,
      polygons: {
        strokeColors: getColor('bootstrapVars', 'bodyColor', 'rgba', 0.1),
        connectorColors: getColor('bootstrapVars', 'bodyColor', 'rgba', 0.1),
        fill: {
          colors: undefined,
        },
      },
    },
  },
})

export const dataStreamChartOptions = (): ApexOptions => ({
  series: [
    {
      name: 'Positive',
      data: [0, 25, 70, 85, 25, 0, 60],
    },
    {
      name: 'Negative',
      data: [-45, -50, -30, -25, -60, -120, 0],
    },
  ],
  chart: {
    type: 'bar',
    height: "350px",
    stacked: true,
    toolbar: {
      show: false,
    },
    fontFamily: 'inherit',
    parentHeightOffset: 0,
  },
  colors: [getColor('success', 400), getColor('primary', 500)],
  plotOptions: {
    bar: {
      columnWidth: '50%',
      borderRadius: 1,
    },
  },
  dataLabels: {
    enabled: false,
  },
  xaxis: {
    categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    labels: {
      style: {
        colors: getColor('bootstrapVars', 'bodyColor', 'hex'),
        fontSize: '12px',
      },
    },
    axisBorder: {
      show: false,
    },
    axisTicks: {
      show: false,
    },
  },
  yaxis: {
    min: -150,
    max: 150,
    tickAmount: 6,
    labels: {
      style: {
        colors: getColor('bootstrapVars', 'bodyColor', 'hex'),
        fontSize: '12px',
      },
      formatter: function (val) {
        return val.toString()
      },
    },
  },
  legend: {
    show: true,
    position: 'top',
    horizontalAlign: 'center',
    fontSize: '14px',
    fontFamily: 'inherit',
    labels: {
      colors: getColor('bootstrapVars', 'bodyColor', 'hex'),
    },
    itemMargin: {
      horizontal: 12,
      vertical: 0,
    },
  },
  grid: {
    borderColor: getColor('bootstrapVars', 'bodyColor', 'rgba', 0.1),
    strokeDashArray: 3,
    yaxis: {
      lines: {
        show: true,
      },
    },
    xaxis: {
      lines: {
        show: true,
      },
    },
  },
  tooltip: {
    shared: true,
    intersect: false,
    theme: 'dark',
    y: {
      formatter: function (val: number) {
        return val.toString()
      },
    },
  },
})

export const demoGraphicChartOptions = (): ApexOptions => ({
  series:[25, 30, 15, 10, 20],
  chart: {
    type: 'pie',
    height: 350,
    toolbar: {
      show: false,
    },
    fontFamily: 'inherit',
    parentHeightOffset: 0,
  },
  colors: [getColor('primary', 100), getColor('primary', 400), getColor('success', 100), getColor('success', 300), getColor('success', 500)],
  labels: ['USA', 'Germany', 'Australia', 'Canada', 'France'],
  dataLabels: {
    enabled: false,
  },
  plotOptions: {
    pie: {
      donut: {
        size: '0%',
      },
    },
  },
  legend: {
    position: 'bottom',
    horizontalAlign: 'center',
    fontSize: '14px',
    fontFamily: 'inherit',
    labels: {
      colors: getColor('bootstrapVars', 'bodyColor', 'hex'),
    },
    itemMargin: {
      horizontal: 10,
      vertical: 2,
    },
  },
  tooltip: {
    theme: 'dark',
    y: {
      formatter: function (val) {
        return val + '%'
      },
    },
    style: {
      fontSize: '14px',
      fontFamily: 'inherit',
    },
    custom: function ({series, seriesIndex, w}) {
      const country = w.globals.labels[seriesIndex]
      const value = series[seriesIndex]
      return (
        '<div class="apexcharts-tooltip-box" style="padding: 2px 7px; background-color: var(--bs-body-bg);">' +
        '<span style="color: var(--bs-body-color); font-size: 0.825rem !important;">' +
        country +
        ': ' +
        value +
        '%</span>' +
        '</div>'
      )
    },
  },
  stroke: {
    width: 1,
    colors: ['var(--bs-body-bg)'],
  },
})

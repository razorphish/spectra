import type {ApexOptions} from 'ng-apexcharts'
import {getColor} from '@/app/utils/get-color';

export type StatisticCardType = {
  title: string
  subtitle: string
  count: number
  prefix?: string
  suffix?: string
  change?: string
  totalChange?: string
  variant?: string
}

export type SalesPerformanceType = {
  customerId: string
  name: string
  purchaseDate: string
  customerEmail: string
  customerCvv: string
  country: string
  invoiceAmount: string
  countryCode: string
}

export type MetricStatsType = {
  data: number[]
  variant: string
  label: string
  value: string
}

export const statistics: StatisticCardType[] = [
  {
    title: 'Orders',
    subtitle: 'From previous period',
    count: 38786,
    change: '+115%',
  },
  {
    title: 'Product Sold',
    subtitle: 'Last year',
    count: 24986,
    change: '+55%',
  },
  {
    title: 'Total Revenue',
    subtitle: 'Last year',
    count: 15.4,
    prefix: '$',
    suffix: ' M',
    change: '+77%',
    totalChange: '+7%',
    variant: 'success',
  },
  {
    title: 'Income status',
    subtitle: 'New income',
    count: 1.2,
    prefix: '$',
    suffix: ' M',
    totalChange: '+10%',
    variant: 'info',
  },
]

export const getLiveFeedsChartOptions = (): ApexOptions => ({
  series: [
    {
      name: 'Target Profit',
      type: 'column',
      data: [150, 650, 200, 650, 800, 1050, 350, 750, 500, 250, 650, 250, 350, 350],
    },
    {
      name: 'Actual Profit',
      type: 'line',
      data: [50, 70, 90, 80, 300, 950, 800, 700, 650, 30, 100, 80, 30, 30],
    },
    {
      name: 'User Signups',
      type: 'line',
      data: [650, 430, 800, 350, 450, 450, 450, 470, 250, 830, 650, 250, 350, 350],
    },
  ],
  chart: {
    height: 350,
    type: 'line',

    stacked: false,
    toolbar: {
      show: false,
    },
    zoom: {
      enabled: false,
    },
    animations: {
      enabled: true,
      speed: 800,
    },
    parentHeightOffset: 0,
    fontFamily: 'inherit',
  },
  colors: [getColor('primary', 300), getColor('warning', 300), getColor('success', 300)],
  stroke: {
    width: [0, 3, 3],
    curve: 'smooth',
  },
  fill: {
    type: ['gradient', 'solid', 'solid'],
    gradient: {
      shade: 'light',
      type: 'vertical',
      shadeIntensity: 0.5,
      gradientToColors: [getColor('primary', 200)],
      inverseColors: false,
      opacityFrom: 1,
      opacityTo: 0.3,
    },
  },
  grid: {
    show: true,
    borderColor: getColor('bootstrapVars', 'bodyColor', 'rgba', 0.08),
    strokeDashArray: 5,
    position: 'back',
    padding: {
      left: -5,
      right: 0,
      top: -20,
      bottom: -5,
    },
    xaxis: {
      lines: {
        show: false,
      },
    },
    yaxis: {
      lines: {
        show: true,
      },
    },
  },
  plotOptions: {
    bar: {
      columnWidth: '50%',
      borderRadius: 5,
    },
  },
  dataLabels: {
    enabled: false,
  },
  markers: {
    size: 4,
    strokeWidth: 0,
    hover: {
      size: 6,
    },
  },
  xaxis: {
    type: 'category',
    categories: [
      'Jan 2013',
      'Apr 2013',
      'Jul 2013',
      'Oct 2013',
      'Jan 2014',
      'Apr 2014',
      'Jul 2014',
      'Oct 2014',
      'Jan 2015',
      'Apr 2015',
      'Jul 2015',
      'Oct 2015',
      'Jan 2016',
      'Apr 2016',
    ],
    labels: {
      style: {
        colors: getColor('bootstrapVars', 'bodyColor', 'rgba', 0.7),
        fontSize: '10px',
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
    min: 0,
    max: 1200,
    tickAmount: 6,
    labels: {
      style: {
        colors: getColor('bootstrapVars', 'bodyColor', 'rgba', 0.7),
        fontSize: '10px',
      },
      formatter: function (val) {
        return val.toFixed(0)
      },
    },
  },
  tooltip: {
    shared: true,
    intersect: false,
    y: {
      formatter: function (y) {
        if (typeof y !== 'undefined') {
          return y.toFixed(0)
        }
        return y
      },
    },
  },
  legend: {
    show: false,
  },
})
export const getReturningTargetChartOptions = (): ApexOptions => ({
  series : [
    {
      name: 'Returning Customer',
      data: [140, 120, 95, 80, 60, 95, 70, 50],
    },
    {
      name: 'New Customer',
      data: [110, 90, 70, 55, 50, 75, 50, 30],
    },
  ],
  chart: {
    height: 350,
    width: '100%',
    type: 'area',
    stacked: false,
    toolbar: {
      show: false,
    },
    zoom: {
      enabled: false,
    },
    animations: {
      enabled: true,
      speed: 800,
    },
    parentHeightOffset: 0,
    fontFamily: 'inherit',
  },
  colors: [getColor('success', 200), getColor('primary', 200)],
  stroke: {
    width: 2,
    curve: 'straight',
  },
  fill: {
    type: 'gradient',
    gradient: {
      shade: 'light',
      type: 'vertical',
      shadeIntensity: 0.4,
      opacityFrom: 0.8,
      opacityTo: 0.1,
      stops: [0, 90, 100],
    },
  },
  grid: {
    show: true,
    borderColor: getColor('bootstrapVars', 'bodyColor', 'rgba', 0.07),
    strokeDashArray: 0,
    position: 'back',
    padding: {
      left: 5,
    },
    xaxis: {
      lines: {
        show: false,
      },
    },
    yaxis: {
      lines: {
        show: false,
      },
    },
  },
  dataLabels: {
    enabled: false,
  },
  markers: {
    size: 4,
    strokeWidth: 0,
    hover: {
      size: 6,
    },
  },
  xaxis: {
    type: 'numeric',
    categories: [0, 100, 200, 300, 400, 500, 600, 700],
    tickAmount: 8,
    labels: {
      style: {
        colors: getColor('bootstrapVars', 'bodyColor', 'rgba', 0.7),
        fontSize: '10px',
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
    show: false,
    max: 180,
    tickAmount: 10,
  },
  tooltip: {
    shared: true,
    intersect: false,
    y: {
      formatter: function (y) {
        if (typeof y !== 'undefined') {
          return y.toFixed(0)
        }
        return y
      },
    },
  },
  legend: {
    show: true,
    position: 'top',
    horizontalAlign: 'left',
    fontSize: '12px',
    fontFamily: 'inherit',
    offsetY: 10,
    offsetX: -35,
    itemMargin: {
      horizontal: 10,
      vertical: 0,
    },
  },
})

export const getEfficiencyMetricsChartOptions = (): ApexOptions => ({
  chart: {
    height: 259,
    type: 'area',
    stacked: false,
    toolbar: {
      show: false,
    },
    zoom: {
      enabled: false,
    },
    animations: {
      enabled: true,
      speed: 800,
    },
    parentHeightOffset: 0,
    fontFamily: 'inherit',
  },
  colors: [getColor('primary', 300), getColor('success', 300), getColor('warning', 300), getColor('info', 300)],
  stroke: {
    width: 2,
    curve: 'straight',
  },
  fill: {
    type: 'gradient',
    gradient: {
      shade: 'light',
      type: 'vertical',
      shadeIntensity: 0.4,
      opacityFrom: 0.8,
      opacityTo: 0.1,
      stops: [0, 90, 100],
    },
  },
  grid: {
    show: true,
    borderColor: getColor('bootstrapVars', 'bodyColor', 'rgba', 0.08),
    strokeDashArray: 5,
    position: 'back',
    padding: {
      top: -25,
    },
    xaxis: {
      lines: {
        show: true,
      },
    },
    yaxis: {
      lines: {
        show: true,
      },
    },
  },
  dataLabels: {
    enabled: false,
  },
  markers: {
    size: 3,
    strokeWidth: 0,
    hover: {
      size: 5,
    },
  },
  xaxis: {
    type: 'category',
    categories: ['2am', '3am', '4am', '5am', '6am', '7am', '8am', '9am', '1pm', '2pm', '3pm', '4pm'],
    labels: {
      style: {
        colors: getColor('bootstrapVars', 'bodyColor', 'rgba', 0.7),
        fontSize: '10px',
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
    min: 0,
    max: 300000,
    tickAmount: 3,
    labels: {
      style: {
        colors: getColor('bootstrapVars', 'bodyColor', 'rgba', 0.7),
        fontSize: '10px',
      },
      formatter: function (val) {
        if (val >= 1000) {
          return val / 1000 + 'K'
        }
        return val.toString()
      },
    },
  },
  tooltip: {
    shared: true,
    intersect: false,
    y: {
      formatter: function (y) {
        if (typeof y !== 'undefined') {
          if (y >= 1000) {
            return Math.round(y).toLocaleString()
          }
          return y.toFixed(0)
        }
        return y
      },
    },
  },
  legend: {
    show: false,
  },
  series: [
    {
      name: 'Sessions',
      data: [20000, 25000, 40000, 50000, 60000, 150000, 190000, 180000, 200000, 100000, 100000, 90000],
    },
    {
      name: 'New Sessions',
      data: [15000, 30000, 35000, 60000, 80000, 110000, 230000, 200000, 180000, 230000, 160000, 100000],
    },
    {
      name: 'Bounce Rate',
      data: [10000, 15000, 20000, 25000, 30000, 40000, 60000, 80000, 100000, 120000, 140000, 160000],
    },
    {
      name: 'Clickthrough',
      data: [5000, 10000, 15000, 20000, 25000, 30000, 40000, 50000, 60000, 70000, 80000, 90000],
    },
  ],
})

export const salesPerformanceData: SalesPerformanceType[] = [
  {
    customerId: '268410636',
    name: 'Cooley, Walker J.',
    purchaseDate: '03-13-19',
    customerEmail: 'wcooley@gmail.com',
    customerCvv: '717',
    country: 'USA',
    invoiceAmount: '$7,007',
    countryCode: 'us',
  },
  {
    customerId: '077610947',
    name: 'Wise, Ruby R.',
    purchaseDate: '04-10-19',
    customerEmail: 'rwise@hotmail.com',
    customerCvv: '715',
    country: 'Australia',
    invoiceAmount: '$7,052',
    countryCode: 'au',
  },
  {
    customerId: '959104621',
    name: 'Orr, Isabella V.',
    purchaseDate: '05-14-20',
    customerEmail: 'iorr@yahoo.com',
    customerCvv: '256',
    country: 'Canada',
    invoiceAmount: '$6,697',
    countryCode: 'ca',
  },
  {
    customerId: '756590147',
    name: 'Schwartz, Xander P.',
    purchaseDate: '11-05-18',
    customerEmail: 'xschwartz@outlook.com',
    customerCvv: '963',
    country: 'India',
    invoiceAmount: '$8,117',
    countryCode: 'in',
  },
  {
    customerId: '533801387',
    name: 'Gilmore, Cedric O.',
    purchaseDate: '01-16-20',
    customerEmail: 'cgilmore@aol.com',
    customerCvv: '754',
    country: 'Brazil',
    invoiceAmount: '$5,328',
    countryCode: 'br',
  },
  {
    customerId: '403080948',
    name: 'Foley, Cynthia M.',
    purchaseDate: '07-14-18',
    customerEmail: 'cfoley@gmail.com',
    customerCvv: '826',
    country: 'Mexico',
    invoiceAmount: '$6,823',
    countryCode: 'mx',
  },
  {
    customerId: '114290869',
    name: 'Marshall, Carter V.',
    purchaseDate: '08-30-18',
    customerEmail: 'cmarshall@hotmail.com',
    customerCvv: '256',
    country: 'Germany',
    invoiceAmount: '$6,679',
    countryCode: 'de',
  },
  {
    customerId: '033182882',
    name: 'Reilly, Jacob K.',
    purchaseDate: '09-19-18',
    customerEmail: 'jreilly@yahoo.com',
    customerCvv: '703',
    country: 'France',
    invoiceAmount: '$5,252',
    countryCode: 'fr',
  },
  {
    customerId: '471026559',
    name: 'Barlow, Jena S.',
    purchaseDate: '12-16-19',
    customerEmail: 'jbarlow@outlook.com',
    customerCvv: '998',
    country: 'Italy',
    invoiceAmount: '$5,542',
    countryCode: 'it',
  },
  {
    customerId: '223467911',
    name: 'Huber, Warren Z.',
    purchaseDate: '05-30-20',
    customerEmail: 'whuber@aol.com',
    customerCvv: '127',
    country: 'Spain',
    invoiceAmount: '$7,331',
    countryCode: 'es',
  },
  {
    customerId: '571295351',
    name: 'Miller, Emerald G.',
    purchaseDate: '11-08-19',
    customerEmail: 'emiller@gmail.com',
    customerCvv: '791',
    country: 'United Kingdom',
    invoiceAmount: '$8,318',
    countryCode: 'gb',
  },
  {
    customerId: '314268756',
    name: 'Randolph, Ina Y.',
    purchaseDate: '04-20-19',
    customerEmail: 'irandolph@hotmail.com',
    customerCvv: '272',
    country: 'Netherlands',
    invoiceAmount: '$9,181',
    countryCode: 'nl',
  },
  {
    customerId: '010785095',
    name: 'Stephens, Brady K.',
    purchaseDate: '04-18-19',
    customerEmail: 'bstephens@yahoo.com',
    customerCvv: '810',
    country: 'Australia',
    invoiceAmount: '$8,253',
    countryCode: 'au',
  },
  {
    customerId: '522462928',
    name: 'Eaton, Cathleen M.',
    purchaseDate: '03-18-20',
    customerEmail: 'ceaton@outlook.com',
    customerCvv: '238',
    country: 'USA',
    invoiceAmount: '$5,585',
    countryCode: 'us',
  },
  {
    customerId: '833601081',
    name: 'Conner, Wylie U.',
    purchaseDate: '09-07-18',
    customerEmail: 'wconner@aol.com',
    customerCvv: '917',
    country: 'Australia',
    invoiceAmount: '$6,687',
    countryCode: 'au',
  },
  {
    customerId: '462938945',
    name: 'Mccall, Hyacinth M.',
    purchaseDate: '06-22-19',
    customerEmail: 'hmccall@gmail.com',
    customerCvv: '335',
    country: 'USA',
    invoiceAmount: '$5,419',
    countryCode: 'us',
  },
  {
    customerId: '465431336',
    name: 'Calderon, Bruno L.',
    purchaseDate: '06-22-19',
    customerEmail: 'bcalderon@hotmail.com',
    customerCvv: '449',
    country: 'Australia',
    invoiceAmount: '$7,833',
    countryCode: 'au',
  },
  {
    customerId: '700402324',
    name: 'Barnes, Brittany O.',
    purchaseDate: '08-23-19',
    customerEmail: 'bbarnes@yahoo.com',
    customerCvv: '200',
    country: 'Canada',
    invoiceAmount: '$9,673',
    countryCode: 'ca',
  },
  {
    customerId: '999816267',
    name: 'Lambert, Nerea A.',
    purchaseDate: '04-01-20',
    customerEmail: 'nlambert@outlook.com',
    customerCvv: '347',
    country: 'India',
    invoiceAmount: '$5,805',
    countryCode: 'in',
  },
  {
    customerId: '230094773',
    name: 'Hartman, Murphy I.',
    purchaseDate: '02-19-19',
    customerEmail: 'mhartman@aol.com',
    customerCvv: '120',
    country: 'Brazil',
    invoiceAmount: '$5,785',
    countryCode: 'br',
  },
  {
    customerId: '656291846',
    name: 'Hartman, Griffin I.',
    purchaseDate: '09-04-19',
    customerEmail: 'ghartman@gmail.com',
    customerCvv: '369',
    country: 'Mexico',
    invoiceAmount: '$6,885',
    countryCode: 'mx',
  },
  {
    customerId: '667672315',
    name: 'Buchanan, Jack N.',
    purchaseDate: '09-19-19',
    customerEmail: 'jbuchanan@hotmail.com',
    customerCvv: '394',
    country: 'Germany',
    invoiceAmount: '$6,480',
    countryCode: 'de',
  },
  {
    customerId: '895637221',
    name: 'Holloway, Molly T.',
    purchaseDate: '12-04-19',
    customerEmail: 'mholloway@yahoo.com',
    customerCvv: '978',
    country: 'France',
    invoiceAmount: '$7,940',
    countryCode: 'fr',
  },
  {
    customerId: '582511127',
    name: 'Pacheco, Nicholas Q.',
    purchaseDate: '12-17-19',
    customerEmail: 'npacheco@outlook.com',
    customerCvv: '860',
    country: 'Italy',
    invoiceAmount: '$9,291',
    countryCode: 'it',
  },
  {
    customerId: '473206092',
    name: 'Woods, Lucian Y.',
    purchaseDate: '04-04-20',
    customerEmail: 'lwoods@aol.com',
    customerCvv: '267',
    country: 'Spain',
    invoiceAmount: '$6,514',
    countryCode: 'es',
  },
  {
    customerId: '058837337',
    name: 'Shelton, Benedict Q.',
    purchaseDate: '08-18-18',
    customerEmail: 'bshelton@gmail.com',
    customerCvv: '556',
    country: 'United Kingdom',
    invoiceAmount: '$5,960',
    countryCode: 'gb',
  },
  {
    customerId: '435186291',
    name: 'Mcmahon, Zephania V.',
    purchaseDate: '03-20-19',
    customerEmail: 'zmcmahon@hotmail.com',
    customerCvv: '313',
    country: 'Netherlands',
    invoiceAmount: '$9,119',
    countryCode: 'nl',
  },
  {
    customerId: '290955491',
    name: 'Bryant, Paloma S.',
    purchaseDate: '08-09-18',
    customerEmail: 'pbryant@yahoo.com',
    customerCvv: '564',
    country: 'USA',
    invoiceAmount: '$7,675',
    countryCode: 'us',
  },
  {
    customerId: '960011146',
    name: 'Sutton, Dominique R.',
    purchaseDate: '03-31-19',
    customerEmail: 'dsutton@outlook.com',
    customerCvv: '517',
    country: 'Australia',
    invoiceAmount: '$5,836',
    countryCode: 'au',
  },
  {
    customerId: '332794726',
    name: 'Whitehead, Amal R.',
    purchaseDate: '05-02-20',
    customerEmail: 'awhitehead@aol.com',
    customerCvv: '450',
    country: 'USA',
    invoiceAmount: '$5,351',
    countryCode: 'us',
  },
  {
    customerId: '270594724',
    name: 'Hopkins, Taylor I.',
    purchaseDate: '05-03-20',
    customerEmail: 'thopkins@gmail.com',
    customerCvv: '509',
    country: 'USA',
    invoiceAmount: '$5,373',
    countryCode: 'us',
  },
  {
    customerId: '062276811',
    name: 'Dalton, Ursula I.',
    purchaseDate: '05-23-19',
    customerEmail: 'udalton@hotmail.com',
    customerCvv: '235',
    country: 'Australia',
    invoiceAmount: '$8,587',
    countryCode: 'au',
  },
  {
    customerId: '475988143',
    name: 'Velasquez, Harper B.',
    purchaseDate: '05-03-20',
    customerEmail: 'hvelasquez@yahoo.com',
    customerCvv: '166',
    country: 'Canada',
    invoiceAmount: '$5,844',
    countryCode: 'ca',
  },
  {
    customerId: '959744004',
    name: 'Flowers, Jackson U.',
    purchaseDate: '10-06-19',
    customerEmail: 'jflowers@outlook.com',
    customerCvv: '654',
    country: 'India',
    invoiceAmount: '$8,953',
    countryCode: 'in',
  },
  {
    customerId: '461623134',
    name: 'Massey, Mercedes R.',
    purchaseDate: '05-22-20',
    customerEmail: 'mmassey@aol.com',
    customerCvv: '199',
    country: 'Brazil',
    invoiceAmount: '$7,332',
    countryCode: 'br',
  },
  {
    customerId: '197211170',
    name: 'Barrera, Ulysses V.',
    purchaseDate: '02-17-19',
    customerEmail: 'ubarrera@gmail.com',
    customerCvv: '809',
    country: 'Mexico',
    invoiceAmount: '$9,416',
    countryCode: 'mx',
  },
  {
    customerId: '918682220',
    name: 'Wilder, Sophia L.',
    purchaseDate: '03-06-19',
    customerEmail: 'swilder@hotmail.com',
    customerCvv: '480',
    country: 'Germany',
    invoiceAmount: '$5,571',
    countryCode: 'de',
  },
  {
    customerId: '268276169',
    name: 'Lott, Tucker E.',
    purchaseDate: '02-03-19',
    customerEmail: 'tlott@yahoo.com',
    customerCvv: '344',
    country: 'France',
    invoiceAmount: '$7,563',
    countryCode: 'fr',
  },
  {
    customerId: '690297924',
    name: 'Morse, Alyssa G.',
    purchaseDate: '11-27-19',
    customerEmail: 'amorse@outlook.com',
    customerCvv: '513',
    country: 'Italy',
    invoiceAmount: '$8,768',
    countryCode: 'it',
  },
  {
    customerId: '591331798',
    name: 'Kemp, Darrel H.',
    purchaseDate: '04-17-20',
    customerEmail: 'dkemp@aol.com',
    customerCvv: '479',
    country: 'Spain',
    invoiceAmount: '$7,197',
    countryCode: 'es',
  },
  {
    customerId: '186475257',
    name: 'Madden, Keaton R.',
    purchaseDate: '04-27-20',
    customerEmail: 'kmadden@gmail.com',
    customerCvv: '361',
    country: 'United Kingdom',
    invoiceAmount: '$9,904',
    countryCode: 'gb',
  },
  {
    customerId: '510961618',
    name: 'Chaney, Brynne H.',
    purchaseDate: '10-23-19',
    customerEmail: 'bchaney@hotmail.com',
    customerCvv: '305',
    country: 'Netherlands',
    invoiceAmount: '$6,660',
    countryCode: 'nl',
  },
  {
    customerId: '543494850',
    name: 'Carroll, Alexis S.',
    purchaseDate: '07-07-19',
    customerEmail: 'acarroll@yahoo.com',
    customerCvv: '640',
    country: 'USA',
    invoiceAmount: '$9,617',
    countryCode: 'us',
  },
  {
    customerId: '304655673',
    name: 'Key, Chase F.',
    purchaseDate: '03-09-19',
    customerEmail: 'ckey@outlook.com',
    customerCvv: '171',
    country: 'Australia',
    invoiceAmount: '$8,533',
    countryCode: 'au',
  },
  {
    customerId: '462690355',
    name: 'Douglas, Sebastian Z.',
    purchaseDate: '03-16-19',
    customerEmail: 'sdouglas@aol.com',
    customerCvv: '432',
    country: 'USA',
    invoiceAmount: '$6,932',
    countryCode: 'us',
  },
  {
    customerId: '156043267',
    name: 'Spence, Gillian K.',
    purchaseDate: '09-03-18',
    customerEmail: 'gspence@gmail.com',
    customerCvv: '557',
    country: 'USA',
    invoiceAmount: '$9,081',
    countryCode: 'us',
  },
  {
    customerId: '163510126',
    name: 'Hill, Ingrid N.',
    purchaseDate: '02-01-20',
    customerEmail: 'ihill@hotmail.com',
    customerCvv: '395',
    country: 'Australia',
    invoiceAmount: '$8,552',
    countryCode: 'au',
  },
  {
    customerId: '622838605',
    name: 'Larson, Matthew C.',
    purchaseDate: '05-09-20',
    customerEmail: 'mlarson@yahoo.com',
    customerCvv: '771',
    country: 'Canada',
    invoiceAmount: '$6,559',
    countryCode: 'ca',
  },
  {
    customerId: '916243272',
    name: 'Wagner, Xerxes X.',
    purchaseDate: '07-19-18',
    customerEmail: 'xwagner@outlook.com',
    customerCvv: '647',
    country: 'India',
    invoiceAmount: '$8,061',
    countryCode: 'in',
  },
  {
    customerId: '218462067',
    name: 'Yang, Savannah M.',
    purchaseDate: '08-10-18',
    customerEmail: 'syang@aol.com',
    customerCvv: '632',
    country: 'Brazil',
    invoiceAmount: '$6,029',
    countryCode: 'br',
  },
]

export const metricStatistics: MetricStatsType[] = [
  {
    label: 'Bounce Rate',
    value: '37.56%',
    variant: 'warning',
    data: [3, 4, 5, 8, 2],
  },
  {
    label: 'Actual Sessions',
    value: '56.34%',
    variant: 'info',
    data: [5, 3, 1, 7, 9],
  },
  {
    label: 'New Sessions',
    value: '12.17%',
    variant: 'primary',
    data: [3, 4, 3, 5, 5],
  },
  {
    label: 'Clickthrough',
    value: '19.77%',
    variant: 'success',
    data: [6, 4, 7, 5, 6],
  },
]

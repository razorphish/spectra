import type {ApexOptions} from 'ng-apexcharts'
import {getColor} from '@/app/utils/get-color';

const avatarA = '/assets/img/demo/avatars/avatar-a.png'
const avatarB = '/assets/img/demo/avatars/avatar-b.png'
const avatarC = '/assets/img/demo/avatars/avatar-c.png'
const avatarD = '/assets/img/demo/avatars/avatar-d.png'
const avatarE = '/assets/img/demo/avatars/avatar-e.png'
const avatarF = '/assets/img/demo/avatars/avatar-f.png'
const avatarG = '/assets/img/demo/avatars/avatar-g.png'
const avatarH = '/assets/img/demo/avatars/avatar-h.png'
const avatarI = '/assets/img/demo/avatars/avatar-i.png'
const avatarJ = '/assets/img/demo/avatars/avatar-j.png'
const avatarK = '/assets/img/demo/avatars/avatar-k.png'

export type ProjectStatisticType = {
  title: string
  subtitle: string
  count: number
  change: string
  variant: string
}

export const projectStatisticsData: ProjectStatisticType[] = [
  {
    title: 'Active Projects',
    subtitle: 'From last month',
    count: 24,
    change: '+3',
    variant: 'success',
  },
  {
    title: 'Overdue Tasks',
    subtitle: 'Since yesterday',
    count: 17,
    change: '+5',
    variant: 'danger',
  },
  {
    title: 'Team Members',
    subtitle: 'New hires',
    count: 36,
    change: '+2',
    variant: 'primary',
  },
  {
    title: 'Open Issues',
    subtitle: 'Resolved today',
    count: 42,
    change: '-7',
    variant: 'warning',
  },
]

export const developmentPhasesSeries = [
  {
    id: 1,
    name: 'Frontend Team',
    data: [
      {
        x: 'Research & Planning: Market Research',
        y: [1736899200000, 1738108800000],
        fillColor: '#f1c40f',
        team: 'Frontend Team',
        phase: 'Research & Planning',
        activity: 'Market Research',
        duration: 14,
        assignedMembers: [
          {
            id: 1,
            name: 'Alex Johnson',
            img: avatarA,
          },
          {
            id: 2,
            name: 'Emma Wilson',
            img: avatarB,
          },
          {
            id: 3,
            name: 'Michael Chen',
            img: avatarC,
          },
        ],
      },
    ],
  },
  {
    id: 2,
    name: 'Database Team',
    data: [
      {
        x: 'Research & Planning: Market Research',
        y: [1737244800000, 1738368000000],
        fillColor: '#3498db',
        team: 'Database Team',
        phase: 'Research & Planning',
        activity: 'Market Research',
        duration: 13,
        assignedMembers: [
          {
            id: 6,
            name: 'Olivia Smith',
            img: avatarF,
          },
          {
            id: 7,
            name: 'David Rodriguez',
            img: avatarG,
          },
        ],
      },
    ],
  },
  {
    id: 3,
    name: 'Frontend Team',
    data: [
      {
        x: 'Research & Planning: Requirement Analysis',
        y: [1737244800000, 1738368000000],
        fillColor: '#f1c40f',
        team: 'Frontend Team',
        phase: 'Research & Planning',
        activity: 'Requirement Analysis',
        duration: 13,
        assignedMembers: [
          {
            id: 1,
            name: 'Alex Johnson',
            img: avatarA,
          },
          {
            id: 2,
            name: 'Emma Wilson',
            img: avatarB,
          },
          {
            id: 3,
            name: 'Michael Chen',
            img: avatarC,
          },
        ],
      },
    ],
  },
  {
    id: 4,
    name: 'Backend Team',
    data: [
      {
        x: 'Research & Planning: Requirement Analysis',
        y: [1737331200000, 1738368000000],
        fillColor: '#2ecc71',
        team: 'Backend Team',
        phase: 'Research & Planning',
        activity: 'Requirement Analysis',
        duration: 12,
        assignedMembers: [
          {
            id: 4,
            name: 'Sarah Williams',
            img: avatarD,
          },
          {
            id: 5,
            name: 'James Lee',
            img: avatarE,
          },
        ],
      },
    ],
  },
  {
    id: 5,
    name: 'Database Team',
    data: [
      {
        x: 'Research & Planning: Requirement Analysis',
        y: [1737417600000, 1738540800000],
        fillColor: '#3498db',
        team: 'Database Team',
        phase: 'Research & Planning',
        activity: 'Requirement Analysis',
        duration: 13,
        assignedMembers: [
          {
            id: 6,
            name: 'Olivia Smith',
            img: avatarF,
          },
          {
            id: 7,
            name: 'David Rodriguez',
            img: avatarG,
          },
        ],
      },
    ],
  },
  {
    id: 6,
    name: 'QA Team',
    data: [
      {
        x: 'Research & Planning: Requirement Analysis',
        y: [1737417600000, 1739145600000],
        fillColor: '#e74c3c',
        team: 'QA Team',
        phase: 'Research & Planning',
        activity: 'Requirement Analysis',
        duration: 20,
        assignedMembers: [
          {
            id: 8,
            name: 'Sophia Martinez',
            img: avatarH,
          },
          {
            id: 9,
            name: 'Oliver Wilson',
            img: avatarI,
          },
        ],
      },
    ],
  },
  {
    id: 7,
    name: 'Frontend Team',
    data: [
      {
        x: 'Research & Planning: Feasibility Study',
        y: [1737763200000, 1738627200000],
        fillColor: '#f1c40f',
        team: 'Frontend Team',
        phase: 'Research & Planning',
        activity: 'Feasibility Study',
        duration: 10,
        assignedMembers: [
          {
            id: 1,
            name: 'Alex Johnson',
            img: avatarA,
          },
          {
            id: 2,
            name: 'Emma Wilson',
            img: avatarB,
          },
          {
            id: 3,
            name: 'Michael Chen',
            img: avatarC,
          },
        ],
      },
    ],
  },
  {
    id: 8,
    name: 'Backend Team',
    data: [
      {
        x: 'Research & Planning: Feasibility Study',
        y: [1737504000000, 1738540800000],
        fillColor: '#2ecc71',
        team: 'Backend Team',
        phase: 'Research & Planning',
        activity: 'Feasibility Study',
        duration: 12,
        assignedMembers: [
          {
            id: 4,
            name: 'Sarah Williams',
            img: avatarD,
          },
          {
            id: 5,
            name: 'James Lee',
            img: avatarE,
          },
        ],
      },
    ],
  },
  {
    id: 9,
    name: 'Database Team',
    data: [
      {
        x: 'Research & Planning: Feasibility Study',
        y: [1737590400000, 1738281600000],
        fillColor: '#3498db',
        team: 'Database Team',
        phase: 'Research & Planning',
        activity: 'Feasibility Study',
        duration: 8,
        assignedMembers: [
          {
            id: 6,
            name: 'Olivia Smith',
            img: avatarF,
          },
          {
            id: 7,
            name: 'David Rodriguez',
            img: avatarG,
          },
        ],
      },
    ],
  },
  {
    id: 10,
    name: 'QA Team',
    data: [
      {
        x: 'Research & Planning: Feasibility Study',
        y: [1737590400000, 1738800000000],
        fillColor: '#e74c3c',
        team: 'QA Team',
        phase: 'Research & Planning',
        activity: 'Feasibility Study',
        duration: 14,
        assignedMembers: [
          {
            id: 8,
            name: 'Sophia Martinez',
            img: avatarH,
          },
          {
            id: 9,
            name: 'Oliver Wilson',
            img: avatarI,
          },
        ],
      },
    ],
  },
  {
    id: 11,
    name: 'Backend Team',
    data: [
      {
        x: 'Design: Information Architecture',
        y: [1739491200000, 1741046400000],
        fillColor: '#2ecc71',
        team: 'Backend Team',
        phase: 'Design',
        activity: 'Information Architecture',
        duration: 18,
        assignedMembers: [
          {
            id: 4,
            name: 'Sarah Williams',
            img: avatarD,
          },
          {
            id: 5,
            name: 'James Lee',
            img: avatarE,
          },
        ],
      },
    ],
  },
  {
    id: 12,
    name: 'Frontend Team',
    data: [
      {
        x: 'Design: Wireframing',
        y: [1739577600000, 1741046400000],
        fillColor: '#f1c40f',
        team: 'Frontend Team',
        phase: 'Design',
        activity: 'Wireframing',
        duration: 17,
        assignedMembers: [
          {
            id: 1,
            name: 'Alex Johnson',
            img: avatarA,
          },
          {
            id: 2,
            name: 'Emma Wilson',
            img: avatarB,
          },
          {
            id: 3,
            name: 'Michael Chen',
            img: avatarC,
          },
        ],
      },
    ],
  },
  {
    id: 13,
    name: 'Backend Team',
    data: [
      {
        x: 'Design: Wireframing',
        y: [1739664000000, 1741392000000],
        fillColor: '#2ecc71',
        team: 'Backend Team',
        phase: 'Design',
        activity: 'Wireframing',
        duration: 20,
        assignedMembers: [
          {
            id: 4,
            name: 'Sarah Williams',
            img: avatarD,
          },
          {
            id: 5,
            name: 'James Lee',
            img: avatarE,
          },
        ],
      },
    ],
  },
  {
    id: 14,
    name: 'DevOps Team',
    data: [
      {
        x: 'Design: Wireframing',
        y: [1739577600000, 1741132800000],
        fillColor: '#9b59b6',
        team: 'DevOps Team',
        phase: 'Design',
        activity: 'Wireframing',
        duration: 18,
        assignedMembers: [
          {
            id: 10,
            name: 'Jessica Brown',
            img: avatarJ,
          },
          {
            id: 11,
            name: 'Robert Taylor',
            img: avatarK,
          },
        ],
      },
    ],
  },
  {
    id: 15,
    name: 'Frontend Team',
    data: [
      {
        x: 'Design: UI Design',
        y: [1740355200000, 1742083200000],
        fillColor: '#f1c40f',
        team: 'Frontend Team',
        phase: 'Design',
        activity: 'UI Design',
        duration: 20,
        assignedMembers: [
          {
            id: 1,
            name: 'Alex Johnson',
            img: avatarA,
          },
          {
            id: 2,
            name: 'Emma Wilson',
            img: avatarB,
          },
          {
            id: 3,
            name: 'Michael Chen',
            img: avatarC,
          },
        ],
      },
    ],
  },
  {
    id: 16,
    name: 'Database Team',
    data: [
      {
        x: 'Design: UI Design',
        y: [1740355200000, 1742428800000],
        fillColor: '#3498db',
        team: 'Database Team',
        phase: 'Design',
        activity: 'UI Design',
        duration: 24,
        assignedMembers: [
          {
            id: 6,
            name: 'Olivia Smith',
            img: avatarF,
          },
          {
            id: 7,
            name: 'David Rodriguez',
            img: avatarG,
          },
        ],
      },
    ],
  },
  {
    id: 17,
    name: 'QA Team',
    data: [
      {
        x: 'Design: UI Design',
        y: [1740096000000, 1742342400000],
        fillColor: '#e74c3c',
        team: 'QA Team',
        phase: 'Design',
        activity: 'UI Design',
        duration: 26,
        assignedMembers: [
          {
            id: 8,
            name: 'Sophia Martinez',
            img: avatarH,
          },
          {
            id: 9,
            name: 'Oliver Wilson',
            img: avatarI,
          },
        ],
      },
    ],
  },
  {
    id: 18,
    name: 'DevOps Team',
    data: [
      {
        x: 'Design: UI Design',
        y: [1740182400000, 1742428800000],
        fillColor: '#9b59b6',
        team: 'DevOps Team',
        phase: 'Design',
        activity: 'UI Design',
        duration: 26,
        assignedMembers: [
          {
            id: 10,
            name: 'Jessica Brown',
            img: avatarJ,
          },
          {
            id: 11,
            name: 'Robert Taylor',
            img: avatarK,
          },
        ],
      },
    ],
  },
  {
    id: 19,
    name: 'Frontend Team',
    data: [
      {
        x: 'Development: Core Architecture',
        y: [1741219200000, 1743206400000],
        fillColor: '#f1c40f',
        team: 'Frontend Team',
        phase: 'Development',
        activity: 'Core Architecture',
        duration: 23,
        assignedMembers: [
          {
            id: 1,
            name: 'Alex Johnson',
            img: avatarA,
          },
          {
            id: 2,
            name: 'Emma Wilson',
            img: avatarB,
          },
          {
            id: 3,
            name: 'Michael Chen',
            img: avatarC,
          },
        ],
      },
    ],
  },
  {
    id: 20,
    name: 'QA Team',
    data: [
      {
        x: 'Development: Core Architecture',
        y: [1741305600000, 1743379200000],
        fillColor: '#e74c3c',
        team: 'QA Team',
        phase: 'Development',
        activity: 'Core Architecture',
        duration: 24,
        assignedMembers: [
          {
            id: 8,
            name: 'Sophia Martinez',
            img: avatarH,
          },
          {
            id: 9,
            name: 'Oliver Wilson',
            img: avatarI,
          },
        ],
      },
    ],
  },
  {
    id: 21,
    name: 'Frontend Team',
    data: [
      {
        x: 'Development: Frontend Framework',
        y: [1741824000000, 1744675200000],
        fillColor: '#f1c40f',
        team: 'Frontend Team',
        phase: 'Development',
        activity: 'Frontend Framework',
        duration: 33,
        assignedMembers: [
          {
            id: 1,
            name: 'Alex Johnson',
            img: avatarA,
          },
          {
            id: 2,
            name: 'Emma Wilson',
            img: avatarB,
          },
          {
            id: 3,
            name: 'Michael Chen',
            img: avatarC,
          },
        ],
      },
    ],
  },
  {
    id: 22,
    name: 'Backend Team',
    data: [
      {
        x: 'Development: Frontend Framework',
        y: [1741737600000, 1743984000000],
        fillColor: '#2ecc71',
        team: 'Backend Team',
        phase: 'Development',
        activity: 'Frontend Framework',
        duration: 26,
        assignedMembers: [
          {
            id: 4,
            name: 'Sarah Williams',
            img: avatarD,
          },
          {
            id: 5,
            name: 'James Lee',
            img: avatarE,
          },
        ],
      },
    ],
  },
  {
    id: 23,
    name: 'Database Team',
    data: [
      {
        x: 'Development: Frontend Framework',
        y: [1741478400000, 1744848000000],
        fillColor: '#3498db',
        team: 'Database Team',
        phase: 'Development',
        activity: 'Frontend Framework',
        duration: 39,
        assignedMembers: [
          {
            id: 6,
            name: 'Olivia Smith',
            img: avatarF,
          },
          {
            id: 7,
            name: 'David Rodriguez',
            img: avatarG,
          },
        ],
      },
    ],
  },
  {
    id: 24,
    name: 'QA Team',
    data: [
      {
        x: 'Development: Frontend Framework',
        y: [1741651200000, 1744243200000],
        fillColor: '#e74c3c',
        team: 'QA Team',
        phase: 'Development',
        activity: 'Frontend Framework',
        duration: 30,
        assignedMembers: [
          {
            id: 8,
            name: 'Sophia Martinez',
            img: avatarH,
          },
          {
            id: 9,
            name: 'Oliver Wilson',
            img: avatarI,
          },
        ],
      },
    ],
  },
  {
    id: 25,
    name: 'Database Team',
    data: [
      {
        x: 'Development: Backend API Development',
        y: [1742083200000, 1744848000000],
        fillColor: '#3498db',
        team: 'Database Team',
        phase: 'Development',
        activity: 'Backend API Development',
        duration: 32,
        assignedMembers: [
          {
            id: 6,
            name: 'Olivia Smith',
            img: avatarF,
          },
          {
            id: 7,
            name: 'David Rodriguez',
            img: avatarG,
          },
        ],
      },
    ],
  },
  {
    id: 26,
    name: 'DevOps Team',
    data: [
      {
        x: 'Development: Backend API Development',
        y: [1742083200000, 1744848000000],
        fillColor: '#9b59b6',
        team: 'DevOps Team',
        phase: 'Development',
        activity: 'Backend API Development',
        duration: 32,
        assignedMembers: [
          {
            id: 10,
            name: 'Jessica Brown',
            img: avatarJ,
          },
          {
            id: 11,
            name: 'Robert Taylor',
            img: avatarK,
          },
        ],
      },
    ],
  },
  {
    id: 27,
    name: 'Frontend Team',
    data: [
      {
        x: 'Development: Database Schema',
        y: [1742342400000, 1744156800000],
        fillColor: '#f1c40f',
        team: 'Frontend Team',
        phase: 'Development',
        activity: 'Database Schema',
        duration: 21,
        assignedMembers: [
          {
            id: 1,
            name: 'Alex Johnson',
            img: avatarA,
          },
          {
            id: 2,
            name: 'Emma Wilson',
            img: avatarB,
          },
          {
            id: 3,
            name: 'Michael Chen',
            img: avatarC,
          },
        ],
      },
    ],
  },
  {
    id: 28,
    name: 'QA Team',
    data: [
      {
        x: 'Testing: Unit Testing',
        y: [1745280000000, 1747872000000],
        fillColor: '#e74c3c',
        team: 'QA Team',
        phase: 'Testing',
        activity: 'Unit Testing',
        duration: 30,
        assignedMembers: [
          {
            id: 8,
            name: 'Sophia Martinez',
            img: avatarH,
          },
          {
            id: 9,
            name: 'Oliver Wilson',
            img: avatarI,
          },
        ],
      },
    ],
  },
  {
    id: 29,
    name: 'Frontend Team',
    data: [
      {
        x: 'Testing: Integration Testing',
        y: [1745712000000, 1747180800000],
        fillColor: '#f1c40f',
        team: 'Frontend Team',
        phase: 'Testing',
        activity: 'Integration Testing',
        duration: 17,
        assignedMembers: [
          {
            id: 1,
            name: 'Alex Johnson',
            img: avatarA,
          },
          {
            id: 2,
            name: 'Emma Wilson',
            img: avatarB,
          },
          {
            id: 3,
            name: 'Michael Chen',
            img: avatarC,
          },
        ],
      },
    ],
  },
  {
    id: 30,
    name: 'QA Team',
    data: [
      {
        x: 'Testing: Integration Testing',
        y: [1745971200000, 1747526400000],
        fillColor: '#e74c3c',
        team: 'QA Team',
        phase: 'Testing',
        activity: 'Integration Testing',
        duration: 18,
        assignedMembers: [
          {
            id: 8,
            name: 'Sophia Martinez',
            img: avatarH,
          },
          {
            id: 9,
            name: 'Oliver Wilson',
            img: avatarI,
          },
        ],
      },
    ],
  },
  {
    id: 31,
    name: 'DevOps Team',
    data: [
      {
        x: 'Testing: User Acceptance Testing',
        y: [1746057600000, 1748131200000],
        fillColor: '#9b59b6',
        team: 'DevOps Team',
        phase: 'Testing',
        activity: 'User Acceptance Testing',
        duration: 24,
        assignedMembers: [
          {
            id: 10,
            name: 'Jessica Brown',
            img: avatarJ,
          },
          {
            id: 11,
            name: 'Robert Taylor',
            img: avatarK,
          },
        ],
      },
    ],
  },
  {
    id: 32,
    name: 'QA Team',
    data: [
      {
        x: 'Deployment: Staging Environment Setup',
        y: [1748476800000, 1749513600000],
        fillColor: '#e74c3c',
        team: 'QA Team',
        phase: 'Deployment',
        activity: 'Staging Environment Setup',
        duration: 12,
        assignedMembers: [
          {
            id: 8,
            name: 'Sophia Martinez',
            img: avatarH,
          },
          {
            id: 9,
            name: 'Oliver Wilson',
            img: avatarI,
          },
        ],
      },
    ],
  },
  {
    id: 33,
    name: 'Database Team',
    data: [
      {
        x: 'Deployment: Production Environment Prep',
        y: [1748908800000, 1750377600000],
        fillColor: '#3498db',
        team: 'Database Team',
        phase: 'Deployment',
        activity: 'Production Environment Prep',
        duration: 17,
        assignedMembers: [
          {
            id: 6,
            name: 'Olivia Smith',
            img: avatarF,
          },
          {
            id: 7,
            name: 'David Rodriguez',
            img: avatarG,
          },
        ],
      },
    ],
  },
  {
    id: 34,
    name: 'Frontend Team',
    data: [
      {
        x: 'Post-Launch: Monitoring',
        y: [1750636800000, 1752364800000],
        fillColor: '#f1c40f',
        team: 'Frontend Team',
        phase: 'Post-Launch',
        activity: 'Monitoring',
        duration: 20,
        assignedMembers: [
          {
            id: 1,
            name: 'Alex Johnson',
            img: avatarA,
          },
          {
            id: 2,
            name: 'Emma Wilson',
            img: avatarB,
          },
          {
            id: 3,
            name: 'Michael Chen',
            img: avatarC,
          },
        ],
      },
    ],
  },
  {
    id: 35,
    name: 'QA Team',
    data: [
      {
        x: 'Post-Launch: Monitoring',
        y: [1750377600000, 1751846400000],
        fillColor: '#e74c3c',
        team: 'QA Team',
        phase: 'Post-Launch',
        activity: 'Monitoring',
        duration: 17,
        assignedMembers: [
          {
            id: 8,
            name: 'Sophia Martinez',
            img: avatarH,
          },
          {
            id: 9,
            name: 'Oliver Wilson',
            img: avatarI,
          },
        ],
      },
    ],
  },
  {
    id: 36,
    name: 'DevOps Team',
    data: [
      {
        x: 'Post-Launch: Monitoring',
        y: [1750464000000, 1751760000000],
        fillColor: '#9b59b6',
        team: 'DevOps Team',
        phase: 'Post-Launch',
        activity: 'Monitoring',
        duration: 15,
        assignedMembers: [
          {
            id: 10,
            name: 'Jessica Brown',
            img: avatarJ,
          },
          {
            id: 11,
            name: 'Robert Taylor',
            img: avatarK,
          },
        ],
      },
    ],
  },
  {
    id: 37,
    name: 'Frontend Team',
    data: [
      {
        x: 'Post-Launch: Bug Fixes',
        y: [1751068800000, 1752278400000],
        fillColor: '#f1c40f',
        team: 'Frontend Team',
        phase: 'Post-Launch',
        activity: 'Bug Fixes',
        duration: 14,
        assignedMembers: [
          {
            id: 1,
            name: 'Alex Johnson',
            img: avatarA,
          },
          {
            id: 2,
            name: 'Emma Wilson',
            img: avatarB,
          },
          {
            id: 3,
            name: 'Michael Chen',
            img: avatarC,
          },
        ],
      },
    ],
  },
  {
    id: 38,
    name: 'QA Team',
    data: [
      {
        x: 'Post-Launch: Bug Fixes',
        y: [1750896000000, 1753056000000],
        fillColor: '#e74c3c',
        team: 'QA Team',
        phase: 'Post-Launch',
        activity: 'Bug Fixes',
        duration: 25,
        assignedMembers: [
          {
            id: 8,
            name: 'Sophia Martinez',
            img: avatarH,
          },
          {
            id: 9,
            name: 'Oliver Wilson',
            img: avatarI,
          },
        ],
      },
    ],
  },
  {
    id: 39,
    name: 'Backend Team',
    data: [
      {
        x: 'Post-Launch: Performance Optimization',
        y: [1751846400000, 1753660800000],
        fillColor: '#2ecc71',
        team: 'Backend Team',
        phase: 'Post-Launch',
        activity: 'Performance Optimization',
        duration: 21,
        assignedMembers: [
          {
            id: 4,
            name: 'Sarah Williams',
            img: avatarD,
          },
          {
            id: 5,
            name: 'James Lee',
            img: avatarE,
          },
        ],
      },
    ],
  },
]

export const developmentPhasesChartOptions = (): ApexOptions => ({
  chart: {
    height: 600,
    type: 'rangeBar',
    fontFamily: 'inherit',
    parentHeightOffset: 0,
    animations: {
      enabled: false,
    },
    zoom: {
      enabled: true,
      type: 'x',
      autoScaleYaxis: false,
      allowMouseWheelZoom: false,
      zoomedArea: {
        fill: {
          color: '#90CAF9',
          opacity: 0.4,
        },
        stroke: {
          color: '#0D47A1',
          opacity: 0.4,
          width: 1,
        },
      },
    },
    toolbar: {
      show: true,
      tools: {
        download: false,
        selection: false,
        zoom: false,
        zoomin: `<div class="btn btn-icon btn-sm btn-outline-default p-0">
                  <svg class="sa-icon sa-thick sa-nofill">
                   <use href="/assets/icons/sprite.svg#plus-circle"></use>
                 </svg>
                </div>`,
        zoomout:  `<div class="btn btn-icon btn-sm btn-outline-default p-0">
                  <svg class="sa-icon sa-thick sa-nofill">
                   <use href="/assets/icons/sprite.svg#minus-circle"></use>
                 </svg>
                </div>`,
        pan: `<div class="btn btn-icon btn-sm btn-outline-default p-0" title="Panning"><svg class="sa-icon sa-thick sa-nofill"><use xlink:href="/assets/img/sprite.svg#move"></use></svg></div>`,
        reset: `<div class="btn btn-icon btn-sm btn-outline-default p-0" title="Reset Zoom"><svg class="sa-icon sa-thick sa-nofill"><use xlink:href="/assets/img/sprite.svg#refresh-ccw"></use></svg></div>`,

      },
      autoSelected: 'pan',
    },
  },
  plotOptions: {
    bar: {
      horizontal: true,
      distributed: false,
      dataLabels: {
        hideOverflowingLabels: true,
      },
      rangeBarGroupRows: true,
    },
  },
  dataLabels: {
    enabled: false,
  },
  xaxis: {
    type: 'datetime',
    labels: {
      style: {
        colors: getColor('bootstrapVars', 'bodyColor', 'hex'),
        fontSize: '11px',
      },
      datetimeUTC: false,
      format: 'MMM dd',
    },
  },
  yaxis: {
    labels: {
      style: {
        colors: getColor('bootstrapVars', 'bodyColor', 'hex'),
        fontSize: '11px',
      },
      maxWidth: 300,
    },
  },
  grid: {
    borderColor: getColor('bootstrapVars', 'bodyColor', 'rgba', 0.1),
    strokeDashArray: 3,
    xaxis: {
      lines: {
        show: true,
      },
    },
    yaxis: {
      lines: {
        show: false,
      },
    },
  },
  tooltip: {
    custom: function (opts) {
      const data = opts.w.config.series[opts.seriesIndex].data[opts.dataPointIndex]
      const from = new Date(opts.y1).toLocaleDateString()
      const to = new Date(opts.y2).toLocaleDateString()
      const duration = Math.floor((opts.y2 - opts.y1) / (1000 * 60 * 60 * 24))

      // Create team member images HTML for tooltip
      let assignedMembersHtml = ''
      if (data.assignedMembers && data.assignedMembers.length > 0) {
        // Get the first 4 members to display
        const displayMembers = data.assignedMembers.slice(0, 4)
        // Calculate remaining members count for +X label
        const remainingCount = Math.max(0, data.assignedMembers.length - 4)

        assignedMembersHtml = `
                            <div class="mt-2 fs-xs mb-1 fw-500">Assigned Members:</div>
                            <div class="fs-sm d-flex align-items-center mt-2">
                                ${displayMembers
          .map(
            (member: any) => `
                                    <span class="profile-image-md ms-1 rounded-circle d-inline-block"
                                          style="background-image:url('${member.img}'); background-size: cover;"></span>
                                `,
          )
          .join('')}
                                ${
          remainingCount > 0
            ? `
                                    <div data-hasmore="+${remainingCount}" class="rounded-circle profile-image-md ms-1">
                                        <span class="profile-image-md ms-1 rounded-circle d-inline-block"
                                              style="background-image:url('${data.assignedMembers[4].img}'); background-size: cover;"></span>
                                    </div>
                                `
            : ''
        }
                            </div>
                        `
      }

      return (
        '<div class="arrow_box p-2">' +
        '<div class="fw-bold mb-1">' +
        data.team +
        '</div>' +
        '<div>' +
        data.activity +
        '</div>' +
        '<div><small class="text-danger">Phase: ' +
        data.phase +
        '</small></div>' +
        '<div class="mt-2"><small>Start: ' +
        from +
        '</small></div>' +
        '<div><small>End: ' +
        to +
        '</small></div>' +
        '<div><small>Duration: <span class="fw-bold">' +
        duration +
        ' days</span></small></div>' +
        assignedMembersHtml +
        '</div>'
      )
    },
  },
  legend: {
    show: false,
  },
  // Advanced features
  annotations: {
    xaxis: [
      {
        x: new Date('2025-02-15').getTime(),
        borderColor: getColor('primary', 500),
        strokeDashArray: 0,
        label: {
          borderColor: getColor('primary', 500),
          style: {
            color: '#fff',
            background: getColor('primary', 500),
          },
          text: 'Design Review',
        },
      },
      {
        x: new Date('2025-04-15').getTime(),
        borderColor: getColor('danger', 500),
        strokeDashArray: 0,
        label: {
          borderColor: getColor('danger', 500),
          style: {
            color: '#fff',
            background: getColor('danger', 500),
          },
          text: 'Critical Milestone',
        },
      },
      {
        x: new Date('2025-06-15').getTime(),
        borderColor: getColor('success', 500),
        strokeDashArray: 0,
        label: {
          borderColor: getColor('success', 500),
          style: {
            color: '#fff',
            background: getColor('success', 500),
          },
          text: 'Release Candidate',
        },
      },
    ],
  },
})

export const projectProgressChartOptions = (): ApexOptions => ({
  series: [
    {
      name: 'Planned Progress',
      type: 'line',
      data: [42, 53, 66, 78, 86, 95, 100],
    },
    {
      name: 'Actual Progress',
      type: 'area',
      data: [38, 45, 55, 72, 80, 84, 92],
    },
  ],
  chart: {
    height: 350,
    type: 'line',
    toolbar: {
      show: false,
    },
    fontFamily: 'inherit',
    parentHeightOffset: 0,
  },
  colors: [getColor('primary', 500), getColor('success', 400)],
  stroke: {
    width: [3, 2],
    curve: 'smooth',
    dashArray: [0, 0],
  },
  fill: {
    type: ['solid', 'gradient'],
    opacity: [1, 0.8],
    gradient: {
      shade: 'dark',
      type: 'vertical',
      shadeIntensity: 0.5,
      gradientToColors: [getColor('success', 400)], // End color (top)
      opacityFrom: 0.8, // Higher opacity at bottom
      opacityTo: 0.2, // Lower opacity at top
      stops: [0, 90, 100],
      colorStops: [
        {
          offset: 0,
          color: getColor('success', 100), // Dark color at bottom
          opacity: 0.8,
        },
        {
          offset: 90,
          color: getColor('success', 400),
          opacity: 0.2,
        },
      ],
    },
  },
  markers: {
    size: [4, 4],
    colors: [getColor('primary', 500), getColor('success', 400)],
    strokeColors: ['#fff', '#fff'],
    strokeWidth: 2,
    hover: {
      size: 7,
    },
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
    min: 0,
    max: 100,
    title: {
      text: 'Completion %',
      style: {
        fontWeight: 400,
      },
    },
    labels: {
      style: {
        colors: getColor('bootstrapVars', 'bodyColor', 'hex'),
        fontSize: '12px',
      },
      formatter: function (val) {
        return val + '%'
      },
    },
  },
  legend: {
    position: 'top',
    horizontalAlign: 'right',
    fontSize: '14px',
    itemMargin: {
      horizontal: 15,
      vertical: 5,
    },
  },
  grid: {
    borderColor: getColor('bootstrapVars', 'bodyColor', 'rgba', 0.1),
    strokeDashArray: 3,
  },
  tooltip: {
    shared: true,
    intersect: false,
    y: {
      formatter: function (val) {
        return val + '%'
      },
    },
  },
})

export const taskStatusChartOptions = (): ApexOptions => ({
  series: [35, 20, 15, 30],
  chart: {
    type: 'donut',
    height: 350,
    fontFamily: 'inherit',
    parentHeightOffset: 0,
  },
  colors: [getColor('success', 400), getColor('warning', 400), getColor('danger', 400), getColor('primary', 400)],
  labels: ['Completed', 'In Progress', 'Overdue', 'Not Started'],
  plotOptions: {
    pie: {
      donut: {
        size: '70%',
        labels: {
          show: true,
          name: {
            show: true,
            fontSize: '14px',
            fontWeight: 600,
            offsetY: -10,
          },
          value: {
            show: true,
            fontSize: '24px',
            fontWeight: 400,
            formatter: function (val) {
              return val + '%'
            },
          },
          total: {
            show: true,
            label: 'Total Tasks',
            fontSize: '16px',
            fontWeight: 600,
            formatter: function (w) {
              return w.globals.seriesTotals.reduce((a: any, b: any) => a + b, 0) + ' Tasks'
            },
          },
        },
      },
    },
  },
  legend: {
    position: 'bottom',
    fontSize: '14px',
    itemMargin: {
      horizontal: 10,
      vertical: 5,
    },
  },
  tooltip: {
    enabled: true,
    y: {
      formatter: function (val) {
        return val + '%'
      },
    },
  },
})

export const teamPerformanceChartOptions = (): ApexOptions => ({
  series: [
    {
      name: 'Team Performance',
      data: [85, 75, 90, 70, 80, 65, 95],
    },
  ],
  chart: {
    height: 350,
    type: 'radar',
    toolbar: {
      show: false,
    },
    fontFamily: 'inherit',
    parentHeightOffset: 0,
  },
  colors: [getColor('primary', 400)],
  fill: {
    opacity: 0.4,
  },
  markers: {
    size: 5,
    colors: [getColor('primary', 400, 'hex')],
    strokeColors: '#fff',
    strokeWidth: 2,
  },
  xaxis: {
    categories: ['Work Quality', 'Productivity', 'Communication', 'Problem Solving', 'Task Completion', 'Innovation', 'Collaboration'],
    labels: {
      style: {
        colors: getColor('bootstrapVars', 'bodyColor', 'hex'),
        fontSize: '12px',
      },
    },
  },
  yaxis: {
    max: 100,
    min: 0,
    tickAmount: 5,
    labels: {
      style: {
        colors: getColor('bootstrapVars', 'bodyColor', 'hex'),
        fontSize: '10px',
      },
    },
  },
  plotOptions: {
    radar: {
      polygons: {
        strokeColors: getColor('bootstrapVars', 'bodyColor', 'rgba', 0.1),
        connectorColors: getColor('bootstrapVars', 'bodyColor', 'rgba', 0.1),
      },
    },
  },
})

export const weeklyActivityChartOptions = (): ApexOptions => ({
  series: [
    {
      name: 'Completed Tasks',
      data: [18, 25, 20, 30, 22, 5, 2],
    },
    {
      name: 'New Tasks',
      data: [12, 15, 30, 20, 25, 8, 0],
    },
  ],
  chart: {
    type: 'bar',
    height: 350,
    stacked: false,
    toolbar: {
      show: false,
    },
    fontFamily: 'inherit',
    parentHeightOffset: 0,
  },
  colors: [
    getColor('success', 400),
    getColor('primary', 400), // New
  ],
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: '55%',
      borderRadius: 3,
      dataLabels: {
        total: {
          enabled: false,
        },
      },
    },
  },
  dataLabels: {
    enabled: false,
  },
  stroke: {
    width: 0,
    colors: ['transparent'],
  },
  xaxis: {
    categories: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
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
    title: {
      text: 'Number of Tasks',
      style: {
        fontWeight: 400,
      },
    },
    labels: {
      style: {
        colors: getColor('bootstrapVars', 'bodyColor', 'hex'),
        fontSize: '12px',
      },
    },
  },
  legend: {
    position: 'top',
    horizontalAlign: 'right',
    fontSize: '14px',
    itemMargin: {
      horizontal: 10,
      vertical: 5,
    },
  },
  grid: {
    borderColor: getColor('bootstrapVars', 'bodyColor', 'rgba', 0.1),
    strokeDashArray: 3,
  },
  tooltip: {
    shared: true,
    intersect: false,
    y: {
      formatter: function (val) {
        return val + ' Tasks'
      },
    },
  },
})

export const teamWorkloadChartOptions = (): ApexOptions => ({
  chart: {
    height: 370,
    type: 'heatmap',
    toolbar: {
      show: false,
    },
    fontFamily: 'inherit',
    parentHeightOffset: 0,
  },
  dataLabels: {
    enabled: false,
  },
  colors: [getColor('primary', 500)],
  tooltip: {
    enabled: true,
    y: {
      formatter: function (val) {
        return val + ' hours'
      },
    },
  },
  plotOptions: {
    heatmap: {
      shadeIntensity: 0.5,
      radius: 0,
      useFillColorAsStroke: false,
      colorScale: {
        ranges: [
          {
            from: 0,
            to: 2,
            name: 'Low',
            color: getColor('success', 300),
          },
          {
            from: 3,
            to: 5,
            name: 'Medium',
            color: getColor('primary', 300),
          },
          {
            from: 6,
            to: 8,
            name: 'High',
            color: getColor('warning', 400),
          },
          {
            from: 9,
            to: 10,
            name: 'Critical',
            color: getColor('danger', 400),
          },
        ],
      },
    },
  },
  xaxis: {
    categories: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    labels: {
      style: {
        colors: getColor('bootstrapVars', 'bodyColor', 'hex'),
        fontSize: '12px',
      },
    },
  },
  yaxis: {
    labels: {
      style: {
        colors: getColor('bootstrapVars', 'bodyColor', 'hex'),
        fontSize: '12px',
      },
    },
  },
  legend: {
    position: 'top',
    horizontalAlign: 'center',
    fontSize: '14px',
    itemMargin: {
      horizontal: 15,
      vertical: 5,
    },
  },
  stroke: {
    width: 1,
    colors: [getColor('bootstrapVars', 'bodyColor', 'rgba', 0.05)],
  },
})

export const projectTimelineChartOptions = (): ApexOptions => ({
  chart: {
    height: 370,
    type: 'rangeBar',
    fontFamily: 'inherit',
    parentHeightOffset: 0,
    toolbar: {
      show: false,
    },
    zoom: {
      enabled: false,
    },
  },
  plotOptions: {
    bar: {
      horizontal: true,
      barHeight: '50%',
      rangeBarGroupRows: true,
    },
  },
  colors: [getColor('primary', 100), getColor('primary', 300), getColor('primary', 600)],
  fill: {
    type: 'solid',
  },
  xaxis: {
    type: 'datetime',
    labels: {
      style: {
        colors: getColor('bootstrapVars', 'bodyColor', 'hex'),
        fontSize: '12px',
      },
    },
  },
  yaxis: {
    labels: {
      style: {
        colors: getColor('bootstrapVars', 'bodyColor', 'hex'),
        fontSize: '12px',
      },
    },
  },
  grid: {
    borderColor: getColor('bootstrapVars', 'bodyColor', 'rgba', 0.1),
    strokeDashArray: 3,
    xaxis: {
      lines: {
        show: true,
      },
    },
    yaxis: {
      lines: {
        show: false,
      },
    },
  },
  tooltip: {
    custom: function (opts) {
      const from = new Date(opts.y1).toLocaleDateString()
      const to = new Date(opts.y2).toLocaleDateString()
      const duration = Math.floor((opts.y2 - opts.y1) / (1000 * 60 * 60 * 24))
      const seriesName = opts.w.globals.seriesNames[opts.seriesIndex]
      const taskName = opts.w.globals.labels[opts.dataPointIndex]

      return (
        '<div class="arrow_box p-2">' +
        '<div class="font-weight-bold mb-1">' +
        seriesName +
        ': ' +
        taskName +
        '</div>' +
        '<div>Start: ' +
        from +
        '</div>' +
        '<div>End: ' +
        to +
        '</div>' +
        '<div>Duration: ' +
        duration +
        ' days</div>' +
        '</div>'
      )
    },
  },
  legend: {
    position: 'top',
    horizontalAlign: 'left',
    fontSize: '14px',
    itemMargin: {
      horizontal: 10,
      vertical: 5,
    },
  },
})

import type {CarouselType, CommentType, ContactType, ProjectType, UserProfile} from '@/app/views/user-profile/types'

const avatar1 = '/assets/img/demo/avatars/avatar-g.png'
const avatar2 = '/assets/img/demo/avatars/avatar-h.png'
const avatar3 = '/assets/img/demo/avatars/avatar-b.png'
const avatar4 = '/assets/img/demo/avatars/avatar-c.png'
const avatar5 = '/assets/img/demo/avatars/avatar-d.png'
const avatar6 = '/assets/img/demo/avatars/avatar-e.png'
const avatar7 = '/assets/img/demo/avatars/avatar-f.png'

const project1 = '/assets/img/profile/project-1.png'
const project4 = '/assets/img/profile/project-4.png'
const project3 = '/assets/img/profile/project-3.png'

export const comments: CommentType[] = [
  {
    id: 1,
    comment: 'Job well done!',
    user: {
      name: 'Iftekhar Ahmed',
      avatar: avatar1,
      role: 'Marketing Professional',
    },
    time: '1 week ago',
    reply: [
      {
        id: 2,
        comment: 'This is a really great project, loved it also!',
        user: {
          name: 'SAFAYET DOZZA',
          avatar: avatar2,
          role: 'Merchandising Strategist ',
        },
        time: '1 week ago',
      },
    ],
  },
]

export const profileVisitors: UserProfile[] = [
  {
    name: 'Emily Chen',
    avatar: avatar4,
    role: 'Senior UX Designer',
  },
  {
    name: 'Michael Smith',
    avatar: avatar3,
    role: 'Tech Lead at Google',
  },
  {
    name: 'Lisa Wong',
    avatar: avatar5,
    role: 'Product Manager',
  },
]

export const suggestedUsers: UserProfile[] = [
  {
    name: 'David Kim',
    avatar: avatar6,
    role: 'Frontend Developer at Meta',
  },
  {
    name: 'Rachel Green',
    avatar: avatar7,
    role: 'UI Designer at Apple',
  },
  {
    name: 'Tom Wilson',
    avatar: avatar1,
    role: 'Backend Developer at Amazon',
  },
]

export const carouselItems: CarouselType[] = [
  {
    title: 'E-Commerce Platform',
    description: 'A modern shopping experience built with React and Node.js',
    image: project3,
  },
  {
    title: 'Task Management App',
    description: 'Streamline your workflow with our intuitive task manager',
    image: project1,
  },
  {
    title: 'Social Media Dashboard',
    description: 'Analytics and management tools for social media professionals',
    image: project4,
  },
]

export const projects: ProjectType[] = [
  {
    title: 'E-Commerce Platform',
    tech: 'React • Node.js • MongoDB',
    description: 'A full-featured e-commerce platform with real-time inventory management and analytics.',
    bgColor: '#b19e97',
    gpColor: '#6d5c53',
  },
  {
    title: 'Task Management App',
    tech: 'Vue.js • Express • PostgreSQL',
    description: 'Intuitive task management application with team collaboration features.',
    bgColor: '#262a33',
    gpColor: '#a3a5ad',
  },
  {
    title: 'Social Media Dashboard',
    tech: 'Angular • Firebase • Chart.js',
    description: 'Comprehensive social media analytics and management dashboard.',
    bgColor: '#18a2c2',
    gpColor: '#624492',
  }
];

export const contacts: ContactType[] = [
  {
    name: 'Sarah Johnson',
    role: 'Senior UX Designer at Adobe',
    avatar: avatar5,
  },
  {
    name: 'Michael Smith',
    role: 'Tech Lead at Google',
    avatar: avatar6,
  },
  {
    name: 'Emily Chen',
    role: 'Product Manager at Microsoft',
    avatar: avatar7,
  },
]

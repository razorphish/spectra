const avatarA = '/assets/img/demo/avatars/avatar-a.png'
const avatarB = '/assets/img/demo/avatars/avatar-b.png'
const avatarC = '/assets/img/demo/avatars/avatar-c.png'
const avatarE = '/assets/img/demo/avatars/avatar-e.png'
const avatarH = '/assets/img/demo/avatars/avatar-h.png'
const avatarJ = '/assets/img/demo/avatars/avatar-j.png'
const avatarM = '/assets/img/demo/avatars/avatar-m.png'

export type NotificationType = {
  avatar: string
  name: string
  description: string
  time: string
  unread?: boolean
  statusVariant?: string
}

export const notifications: NotificationType[] = [

  {
    avatar: avatarA,
    name: 'Adison Lee',
    description: 'Msed quia non numquam eius',
    time: '2 minutes ago',
    unread: true,
  },
  {
    avatar: avatarB,
    name: 'Oliver Kopyuv',
    description: 'Msed quia non numquam eius',
    time: '3 days ago',
    statusVariant: 'success',
  },
  {
    avatar: avatarE,
    name: 'Dr. John Cook PhD',
    description: 'Msed quia non numquam eius',
    time: '2 weeks ago',
    statusVariant: 'warning',
  },
  {
    avatar: avatarH,
    name: 'Sarah McBrook',
    description: 'Msed quia non numquam eius',
    time: '3 weeks ago',
    statusVariant: 'success',
  },
  {
    avatar: avatarM,
    name: 'Anothony Bezyeth',
    description: 'Msed quia non numquam eius',
    time: 'one month ago',
    statusVariant: 'success',
  },
  {
    avatar: avatarJ,
    name: 'Lisa Hatchensen',
    description: 'Msed quia non numquam eius',
    time: 'one year ago',
    statusVariant: 'danger',
  },
]

import {Component, OnInit} from '@angular/core';
import {CalendarOptions} from '@fullcalendar/core';
import interactionPlugin from '@fullcalendar/interaction';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list'
import {FullCalendarModule} from '@fullcalendar/angular';

@Component({
  selector: 'app-calendar',
  imports: [
    FullCalendarModule
  ],
  template: `
    <div id="panel-3" class="panel panel-icon">
      <div class="panel-container">
        <div class="panel-content">
          <full-calendar #calendar [options]="calendarOptions"></full-calendar>
        </div>
      </div>
    </div>
  `,
  styles: ``
})
export class Calendar implements OnInit {
  calendarOptions!: CalendarOptions;

  defaultEvents = [
    {
      id: '1',
      title: 'Team Meeting',
      start: new Date(new Date().setHours(10, 0)),
      end: new Date(new Date().setHours(11, 30)),
      backgroundColor: 'var(--primary-500)',
      borderColor: 'var(--primary-600)',
      description: 'Weekly team status meeting',
      location: 'Conference Room A',
    },
    {
      id: '2',
      title: 'Client Call',
      start: new Date(new Date().setDate(new Date().getDate() + 1)),
      allDay: true,
      backgroundColor: 'var(--success-500)',
      borderColor: 'var(--success-600)',
      description: 'Quarterly review with major client',
      location: 'Zoom Meeting',
    },
    {
      id: '3',
      title: 'Product Launch',
      start: new Date(new Date().setDate(new Date().getDate() + 3)),
      end: new Date(new Date().setDate(new Date().getDate() + 3)).setHours(15, 0),
      backgroundColor: 'var(--danger-500)',
      borderColor: 'var(--danger-600)',
      description: 'New product launch event',
      location: 'Main Auditorium',
    },
    {
      id: '4',
      title: 'Deadline: Q3 Report',
      start: new Date(new Date().setDate(new Date().getDate() + 5)),
      allDay: true,
      backgroundColor: 'var(--warning-500)',
      borderColor: 'var(--warning-600)',
      description: 'Submit quarterly financial reports',
      location: 'Finance Department',
    },
    {
      id: '5',
      title: 'Training Session',
      start: new Date(new Date().setDate(new Date().getDate() - 2)),
      end: new Date(new Date().setDate(new Date().getDate() - 2)).setHours(16, 0),
      backgroundColor: 'var(--info-500)',
      borderColor: 'var(--info-600)',
      description: 'New software training for all employees',
      location: 'Training Room B',
    },
    {
      id: '6',
      title: 'Board Meeting',
      start: new Date(new Date().setDate(new Date().getDate() + 7)),
      allDay: true,
      backgroundColor: 'var(--danger-500)',
      borderColor: 'var(--danger-700)',
      description: 'Annual board meeting with stakeholders',
      location: 'Executive Boardroom',
    },
    {
      id: '7',
      title: 'Website Maintenance',
      start: new Date(new Date().setDate(new Date().getDate() - 1)).setHours(23, 0),
      end: new Date(new Date().setDate(new Date().getDate())).setHours(5, 0),
      backgroundColor: 'var(--info-500)',
      borderColor: 'var(--info-600)',
      description: 'Scheduled website maintenance window',
      location: 'IT Department',
    },
    {
      id: '8',
      title: 'Team Building',
      start: new Date(new Date().setDate(new Date().getDate() + 12)),
      end: new Date(new Date().setDate(new Date().getDate() + 12)).setHours(16, 0),
      backgroundColor: 'var(--primary-300)',
      borderColor: 'var(--primary-400)',
      description: 'Annual team building activities',
      location: 'City Park',
    },
    {
      id: '9',
      title: 'Client Dinner',
      start: new Date(new Date().setDate(new Date().getDate() + 4)).setHours(19, 0),
      end: new Date(new Date().setDate(new Date().getDate() + 4)).setHours(21, 0),
      backgroundColor: 'var(--success-300)',
      borderColor: 'var(--success-400)',
      description: 'Dinner with potential investors',
      location: 'Downtown Restaurant',
    },
    {
      id: '10',
      title: 'Vacation',
      start: new Date(new Date().setDate(new Date().getDate() + 14)),
      end: new Date(new Date().setDate(new Date().getDate() + 21)),
      backgroundColor: 'var(--bs-teal)',
      borderColor: 'var(--bs-teal)',
      description: 'Annual vacation time',
      location: 'Beach Resort',
    },
    {
      id: '11',
      title: 'Marketing Campaign',
      start: new Date(new Date().setDate(new Date().getDate() + 2)),
      end: new Date(new Date().setDate(new Date().getDate() + 2)).setHours(17, 0),
      backgroundColor: 'var(--bs-purple)',
      borderColor: 'var(--bs-purple)',
      description: 'Launch new product marketing campaign',
      location: 'Marketing Department',
      category: 'marketing',
    },
    {
      id: '12',
      title: 'Sales Meeting',
      start: new Date(new Date().setDate(new Date().getDate() + 3)).setHours(9, 0),
      end: new Date(new Date().setDate(new Date().getDate() + 3)).setHours(10, 30),
      backgroundColor: 'var(--success-600)',
      borderColor: 'var(--success-700)',
      description: 'Monthly sales team catchup',
      location: 'Conference Room B',
      category: 'sales',
    },
    {
      id: '13',
      title: 'Development Sprint Review',
      start: new Date(new Date().setDate(new Date().getDate() + 6)).setHours(14, 0),
      end: new Date(new Date().setDate(new Date().getDate() + 6)).setHours(16, 0),
      backgroundColor: 'var(--bs-indigo)',
      borderColor: 'var(--bs-indigo)',
      description: 'End of sprint review with stakeholders',
      location: 'Dev Team Area',
      category: 'development',
    },
    {
      id: '14',
      title: 'Tech Conference',
      start: new Date(new Date().setDate(new Date().getDate() + 8)),
      end: new Date(new Date().setDate(new Date().getDate() + 10)),
      backgroundColor: 'var(--bs-indigo)',
      borderColor: 'var(--bs-indigo)',
      description: 'Annual tech conference for industry professionals',
      location: 'Convention Center',
      category: 'conference',
    },
    {
      id: '15',
      title: 'Dentist Appointment',
      start: new Date(new Date().setDate(new Date().getDate() + 2)).setHours(14, 0),
      end: new Date(new Date().setDate(new Date().getDate() + 2)).setHours(15, 0),
      backgroundColor: 'var(--warning-500)',
      borderColor: 'var(--warning-600)',
      description: 'Routine dental checkup',
      location: 'Downtown Clinic',
      category: 'personal',
    },
    {
      id: '16',
      title: 'Project Milestone: Beta Release',
      start: new Date(new Date().setDate(new Date().getDate() + 15)),
      allDay: true,
      backgroundColor: 'var(--success-500)',
      borderColor: 'var(--success-600)',
      description: 'Beta release of the new app',
      location: 'Development Team',
      category: 'development',
    },
    {
      id: '17',
      title: 'Company Announcement',
      start: new Date(new Date().setDate(new Date().getDate() + 1)).setHours(11, 0),
      end: new Date(new Date().setDate(new Date().getDate() + 1)).setHours(11, 30),
      backgroundColor: 'var(--primary-500)',
      borderColor: 'var(--primary-600)',
      description: 'Announcement of new company policies',
      location: 'Main Hall',
      category: 'announcement',
    },
    {
      id: '18',
      title: 'Weekly Team Sync',
      start: new Date(new Date().setDate(new Date().getDate() + 4)).setHours(9, 0),
      end: new Date(new Date().setDate(new Date().getDate() + 4)).setHours(9, 30),
      backgroundColor: 'var(--primary-400)',
      borderColor: 'var(--primary-500)',
      description: 'Recurring weekly sync for project updates',
      location: 'Meeting Room C',
      category: 'team',
      extendedProps: {recurrence: 'weekly'},
    },
  ]

  ngOnInit(): void {
    this.calendarOptions = {
      plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin],
      initialView: 'dayGridMonth',
      themeSystem: 'bootstrap',
      headerToolbar:{
      right: 'today prev,next',
        left: 'title',
    },
      buttonText: {
        today: 'Today',
        month: 'Month',
        week: 'Week',
        day: 'Day',
        list: 'List',
        prev: 'Prev',
        next: 'Next',
      },
      footerToolbar: {
        left: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
      },
      slotDuration: '00:30:00',
      slotMinTime: '07:00:00',
      slotMaxTime: '19:00:00',

      height: window.innerHeight - 240,
      editable: false,
      droppable: false,
      selectable: false,
      events: this.defaultEvents,

    };
  }
}

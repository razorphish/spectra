import {TableState, TableStyle, UserRow} from '@/app/types/table';

export const DEFAULT_STATE: TableState = {
  tableTheme: '',
  tableStyles: ['table-responsive'],
  tableSize: '',
  tableAccent: '',
  headerAccent: '',
  captionPosition: '',
  showRowClasses: false,
  columnsDisplay: 'expandColumnsBtn'
};


export const TABLE_THEMES: { label: string; value: string }[] = [
  {label: 'Default', value: ''},
  {label: 'Dark', value: 'table-dark'},
  {label: 'Light', value: 'table-light'},
]

export const TABLE_STYLES: { label: string; value: TableStyle; id: string }[] = [
  {label: 'Striped rows', value: 'table-striped', id: 'styleStriped'},
  {label: 'Hover effect', value: 'table-hover', id: 'styleHover'},
  {label: 'Bordered', value: 'table-bordered', id: 'styleBordered'},
  {label: 'Borderless', value: 'table-borderless', id: 'styleBorderless'},
  {label: 'Responsive', value: 'table-responsive', id: 'styleResponsive'},
]

export const TABLE_SIZES: { label: string; value: string }[] = [
  {label: 'Default', value: ''},
  {label: 'Small', value: 'table-sm'},
  {label: 'Nano', value: 'table-nano'},
]

export const ACCENT_OPTIONS: { label: string; value: string }[] = [
  {label: 'None', value: ''},
  {label: 'Primary', value: 'table-primary'},
  {label: 'Secondary', value: 'table-secondary'},
  {label: 'Success', value: 'table-success'},
  {label: 'Danger', value: 'table-danger'},
  {label: 'Warning', value: 'table-warning'},
  {label: 'Info', value: 'table-info'},
]

export const HEADER_ACCENTS: { label: string; value: string }[] = [
  {label: 'None', value: ''},
  {label: 'Primary', value: 'table-primary'},
  {label: 'Secondary', value: 'table-secondary'},
  {label: 'Success', value: 'table-success'},
  {label: 'Danger', value: 'table-danger'},
  {label: 'Warning', value: 'table-warning'},
  {label: 'Info', value: 'table-info'},
  {label: 'Dark', value: 'table-dark'},
  {label: 'Light', value: 'table-light'},
]

export const CAPTION_POSITIONS: { label: string; value: string }[] = [
  {label: 'Default', value: ''},
  {label: 'Top', value: 'caption-top'},
  {label: 'Bottom', value: 'caption-bottom'},
]

export const COLUMN_LAYOUTS: { label: string; id: string }[] = [
  {label: 'Fewer Columns', id: 'collapseColumnsBtn'},
  {label: 'More Columns', id: 'expandColumnsBtn'},
]

export const ROW_EXAMPLES: UserRow[] = [
  {
    id: 1,
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '123-456-7890',
    address: '123 Main St',
    city: 'Anytown',
    state: 'CA',
    country: 'USA',
    rowClass: 'table-primary',
  },
  {
    id: 2,
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    phone: '987-654-3210',
    address: '456 Park Ave',
    city: 'Somecity',
    state: 'NY',
    country: 'USA',
    rowClass: 'table-secondary',
  },
  {
    id: 3,
    name: 'Bob Johnson',
    email: 'bob.johnson@example.com',
    phone: '555-123-4567',
    address: '789 Oak Dr',
    city: 'Otherville',
    state: 'TX',
    country: 'USA',
    rowClass: 'table-success',
  },
  {
    id: 4,
    name: 'Alice Brown',
    email: 'alice.brown@example.com',
    phone: '896-456-7890',
    address: '321 Maple St',
    city: 'Newtown',
    state: 'FL',
    country: 'USA',
    rowClass: 'table-warning',
  },
  {
    id: 5,
    name: 'Charlie Wilson',
    email: 'charlie.wilson@example.com',
    phone: '234-456-7890',
    address: '654 Pine Ln',
    city: 'Lastcity',
    state: 'WA',
    country: 'USA',
    rowClass: 'table-danger',
  },
]

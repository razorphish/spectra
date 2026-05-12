export type TableTheme = '' | 'table-dark' | 'table-light'

export type TableStyle = 'table-striped' | 'table-hover' | 'table-bordered' | 'table-borderless' | 'table-responsive'

export type TableSize = '' | 'table-sm' | 'table-nano'

export type UserRow = {
  id: number
  name: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  country: string
  rowClass?: string
}

export type TableAccent = '' | 'table-primary' | 'table-secondary' | 'table-success' | 'table-danger' | 'table-warning' | 'table-info'

export type HeaderAccent =
  | ''
  | 'table-primary'
  | 'table-secondary'
  | 'table-success'
  | 'table-danger'
  | 'table-warning'
  | 'table-info'
  | 'table-dark'
  | 'table-light'

export type CaptionPosition = '' | 'caption-top' | 'caption-bottom'

export type ColumnDisplay = 'collapseColumnsBtn' | 'expandColumnsBtn'

export type TableState = {
  tableTheme: TableTheme
  tableStyles: TableStyle[]
  tableSize: TableSize
  tableAccent: TableAccent
  headerAccent: HeaderAccent
  captionPosition: CaptionPosition
  showRowClasses: boolean
  columnsDisplay: ColumnDisplay
}

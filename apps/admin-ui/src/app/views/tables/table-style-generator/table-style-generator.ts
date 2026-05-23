import {Component} from '@angular/core';
import {TableState, UserRow} from '@/app/types/table';
import {COLUMN_LAYOUTS, DEFAULT_STATE, ROW_EXAMPLES} from '@/app/views/tables/table-style-generator/data';
import {TableSettingPanel} from '@/app/views/tables/table-style-generator/components/table-setting-panel';
import {FormsModule} from '@angular/forms';
import {PageBreadcrumb} from '@app/components/page-breadcrumb';
import {ContentWithRightPenal} from '@layouts/content-with-right-penal/content-with-right-penal';

@Component({
  selector: 'app-table-style-generator',
  imports: [
    TableSettingPanel,
    FormsModule,
    PageBreadcrumb,
    ContentWithRightPenal
  ],
  templateUrl: './table-style-generator.html',
  styles: ``
})
export class TableStyleGenerator {
  state: TableState = { ...DEFAULT_STATE };

  getGeneratedClasses(): string {
    const classList = ['table'];
    if (this.state.tableTheme) classList.push(this.state.tableTheme);
    if (this.state.tableSize) classList.push(this.state.tableSize);
    if (this.state.tableAccent && !this.state.tableTheme) classList.push(this.state.tableAccent);
    classList.push(...this.state.tableStyles);
    return classList.join(' ');
  }

  buildCodeSnippet(): string {
    const tableClasses = this.getGeneratedClasses();
    const captionTag = `<caption${this.state.captionPosition ? ` class="${this.state.captionPosition}"` : ''}>List of users and their details</caption>`;
    const theadClass = this.state.headerAccent ? ` class="${this.state.headerAccent}"` : '';
    return `
<table class="${tableClasses}">
    ${captionTag}
    <thead${theadClass}>
        <tr>
            <th scope="col">#</th>
            <th scope="col">Name</th>
            <th scope="col">Email</th>
            <!-- more columns -->
        </tr>
    </thead>
    <tbody>
        <tr>
            <th scope="row">1</th>
            <td>John Doe</td>
            <td>john.doe@example.com</td>
            <!-- more cells -->
        </tr>
        <!-- more rows -->
    </tbody>
</table>`;
  }

  get rows(): UserRow[] {
    return this.state.showRowClasses ? ROW_EXAMPLES : ROW_EXAMPLES.map(r => ({ ...r, rowClass: '' }));
  }

  get columns() {
    const base = [
      { label: '#', dataKey: 'id' },
      { label: 'Name', dataKey: 'name' },
      { label: 'Email', dataKey: 'email' },
      { label: 'Phone', dataKey: 'phone' }
    ];
    if (this.state.columnsDisplay === 'expandColumnsBtn') {
      base.push(
        { label: 'Address', dataKey: 'address' },
        { label: 'City', dataKey: 'city' },
        { label: 'State', dataKey: 'state' },
        { label: 'Country', dataKey: 'country' }
      );
    }
    base.push({ label: 'Action', dataKey: 'action' });
    return base;
  }

  COLUMN_LAYOUTS = COLUMN_LAYOUTS;
}

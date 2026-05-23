import {Component, OnInit} from '@angular/core';
import {smartAdminBaseIcons, smartAdminIcons} from '@/app/views/icons/data';
import {ToastrService} from 'ngx-toastr';
import {FormsModule} from '@angular/forms';
import {PageBreadcrumb} from '@app/components/page-breadcrumb';

@Component({
  selector: 'app-smart-admin',
  imports: [FormsModule, PageBreadcrumb],
  templateUrl: './smart-admin.html',
  styles: ``
})
export class SmartAdmin implements OnInit {
  search = '';
  iconSet: 'smart-admin' | 'sa-base' = 'smart-admin';
  smartAdminIcons = smartAdminIcons;
  smartAdminBaseIcons = smartAdminBaseIcons;
  filteredIcons: string[] = [];

  constructor(
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.filterIcons();
  }

  get currentIconList(): string[] {
    return this.iconSet === 'smart-admin' ? this.smartAdminIcons : this.smartAdminBaseIcons;
  }

  filterIcons() {
    this.filteredIcons = this.currentIconList.filter(icon =>
      icon.toLowerCase().includes(this.search.toLowerCase())
    );
  }

  handleCopy(icon: string) {
    const classAttribute = `sa sa-${icon}`;

    navigator.clipboard.writeText(classAttribute).then(() => {
      const toastHtml = `
        <div class="d-flex align-items-center gap-2">
          <i class="display-1 m-0 me-2 text-primary ${classAttribute}"></i>
          <span class="fw-bold">
            <span class="disabled">'${icon}'</span> ✔ copied
          </span>
        </div>
      `;


      this.toastr.success(toastHtml.toString(), '', {
        enableHtml: true,
        timeOut: 1500,
        toastClass: `ngx-toastr bg-dark bg-opacity-75`,
        positionClass: 'toast-top-right'
      });
    });
  }
}

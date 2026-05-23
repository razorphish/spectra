import {Component, OnInit} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {ToastrService} from 'ngx-toastr';
import {LayoutService} from '@core/services/layout-store.service';
import {systemIcons} from '@/app/views/icons/data';
import {PageBreadcrumb} from '@app/components/page-breadcrumb';
import {NgClass} from '@angular/common';
import {LayoutState, LayoutThemeType} from '@/app/types/layout';

@Component({
  selector: 'app-system',
  imports: [
    ReactiveFormsModule,
    PageBreadcrumb,
    FormsModule,
    NgClass
  ],
  templateUrl: './system.html',
  styles: ``
})
export class System implements OnInit {
  search = '';
  weight = 'sa-thin';
  noFill = false;

  filteredIcons: string[] = [];

  constructor(private toastr: ToastrService, public layoutStore: LayoutService) {
  }

  theme: LayoutThemeType = 'light';

  ngOnInit(): void {
    this.layoutStore.state$.subscribe((theme: any) => {
      this.theme = theme;
    });
    this.filteredIcons = systemIcons;
  }

  onSearchChange(value: string) {
    this.search = value;
    this.filterIcons();
  }

  onWeightChange(value: string) {
    this.weight = value;
  }

  onNoFillChange(checked: boolean) {
    this.noFill = checked;
  }

  filterIcons() {
    this.filteredIcons = systemIcons.filter(icon =>
      icon.toLowerCase().includes(this.search.toLowerCase())
    );
  }

  handleCopy(icon: string) {
    const classAttr = `sa-icon ${this.weight} ${this.noFill ? ' sa-nofill' : ''}`;
    const svg = `<svg class="${classAttr}"><use href="/assets/icons/sprite.svg#${icon}"></use></svg>`;

    const toastHtml = `
      <div class="d-flex align-items-center gap-2 smart-icon-copied">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
               class="${classAttr}" style="height:60px;width:60px;stroke:#0d6efd;fill:rgba(172,203,211,0.3);">
            <use href="/assets/icons/sprite.svg#${icon}" />
          </svg>
          <span class="fw-bold ms-2">
            <span class="disabled">#${icon}</span> ✔ copied
          </span>
        </div>`

    navigator.clipboard.writeText(svg).then(() => {
      this.toastr.success(toastHtml.toString(),
        '',
        {
          enableHtml: true,
          closeButton: false,
          timeOut: 1500,
          toastClass: `ngx-toastr bg-dark bg-opacity-75 ${this.theme}`,
          positionClass: 'toast-top-right'
        }
      );
    });
  }

  protected readonly systemIcons = systemIcons;
}

import {Component, OnInit} from '@angular/core';
import {ToastrService} from 'ngx-toastr';
import * as FaBrandsIcons from '@ng-icons/font-awesome/brands';
import * as FaSolidIcons from '@ng-icons/font-awesome/solid';
import * as FaRegularIcons from '@ng-icons/font-awesome/regular';
import {FormsModule} from '@angular/forms';
import {NgIcon} from '@ng-icons/core';
import {PageBreadcrumb} from '@app/components/page-breadcrumb';

const FaIcons = {
  ...FaBrandsIcons,
  ...FaSolidIcons,
  ...FaRegularIcons,
};

@Component({
  selector: 'app-font-awesome',
  imports: [FormsModule, NgIcon, PageBreadcrumb],
  templateUrl: './font-awesome.html',
  styles: ``
})
export class FontAwesome implements OnInit {
  search = '';
  iconSet: 'fa-regular' | 'fa-solid' | 'fa-brands' = 'fa-solid';


  allIcons: { name: string; prefix: string; component: any }[] = [];
  filteredIcons: { name: string; prefix: string; component: any }[] = [];

  constructor(
    private toastr: ToastrService,
  ) {
  }

  ngOnInit(): void {
    this.allIcons = Object.entries(FaIcons).map(([name, component]) => {
        let prefix: 'fa-regular' | 'fa-solid' | 'fa-brands' = 'fa-solid';

        if (name.toLowerCase().includes('solid')) {
          prefix = 'fa-solid';
        }  else if (name.toLowerCase().includes('brand')) {
          prefix = 'fa-brands';
        } else if (name.toLowerCase().includes('fa')) {
          prefix = 'fa-regular';
        }

        return {name, prefix, component};
      }
    )
    ;

    this.filterIcons();
  }

  filterIcons() {
    this.filteredIcons = this.allIcons
      .filter(icon => icon.prefix === this.iconSet)
      .filter(icon => icon.name.toLowerCase().includes(this.search.toLowerCase()));
  }

  handleCopy(iconName
             :
             string
  ) {
    const codeSnippet = `<ng-icon name="${iconName}" />`;
    navigator.clipboard.writeText(codeSnippet).then(() => {
      const toastHtml = `
        <div class="d-flex align-items-center gap-2">
          <span class="ng-icon text-primary" style="font-size: 40px;">
            <ng-icon name="${iconName}"></ng-icon>
          </span>
          <span class="fw-bold">
            <span class="disabled">'${iconName}'</span> ✔ copied
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

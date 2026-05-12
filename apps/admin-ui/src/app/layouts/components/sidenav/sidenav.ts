import {Component, ViewChild} from '@angular/core';
import {AppLogo} from '@app/components/app-logo';
import {AppMenuComponent} from '@layouts/components/sidenav/components/app-menu/app-menu';
import {SimplebarAngularModule} from 'simplebar-angular';
import {menuItems} from '@layouts/components/data';
import {MenuItemType} from '@/app/types/layout';

@Component({
  selector: 'app-sidenav',
  imports: [
    AppLogo,
    AppMenuComponent,
    SimplebarAngularModule
  ],
  templateUrl: './sidenav.html',
  styles: ``
})
export class Sidenav {
  @ViewChild(AppMenuComponent) menuComp!: AppMenuComponent;
  protected filterText = '';
  protected showNoResults = false;

  protected readonly menuItems = menuItems;

  get filteredMenuItems() {
    if (!this.filterText.trim()) return this.menuItems;

    const search = this.filterText.trim().toLowerCase();

    function deepFilter(items: MenuItemType[], includeAll = false): MenuItemType[] {
      return items
        .map((item) => {
          const selfMatch = (item.label || '').toLowerCase().includes(search);

          // If parent matched OR an ancestor already matched, keep full subtree untouched
          if (selfMatch || includeAll) {
            return {
              ...item,
              // keep original children (not filtered) when locked open
              children: item.children ? [...item.children] : undefined,
            };
          }

          // Otherwise, filter children recursively
          if (item.children && item.children.length) {
            const filteredChildren = deepFilter(item.children, false);
            if (filteredChildren.length) {
              return { ...item, children: filteredChildren };
            }
          }

          // Titles are kept only if they match or have matching descendants
          if (item.isTitle) return null;

          // Leaf: keep only if it matches
          return selfMatch ? item : null;
        })
        .filter((x): x is MenuItemType => x !== null);
    }

    return deepFilter(this.menuItems);
  }


  updateFilterText(e: Event) {
    const target = e.target as HTMLInputElement;
    this.filterText = target.value;
    this.showNoResults = !this.filteredMenuItems.length;
    this.menuComp.expandFilteredPaths(this.filteredMenuItems);
  }

}

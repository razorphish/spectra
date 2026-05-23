import { Component, ViewChild, computed, inject, signal } from '@angular/core';
import { AppLogo } from '@app/components/app-logo';
import { AppMenuComponent } from '@layouts/components/sidenav/components/app-menu/app-menu';
import { SimplebarAngularModule } from 'simplebar-angular';
import { menuItems } from '@layouts/components/data';
import { MenuItemType } from '@/app/types/layout';
import { SidebarNavVisibilityService } from '@core/services/sidebar-nav-visibility.service';

function deepCloneMenu(items: MenuItemType[]): MenuItemType[] {
  return items.map((item) => ({
    ...item,
    children: item.children ? deepCloneMenu(item.children) : undefined,
  }));
}

/** Drops items whose `menuKey` is in `hidden`; drops empty section titles and empty parents without URL. */
function filterMenuByHiddenKeys(items: MenuItemType[], hidden: ReadonlySet<string>): MenuItemType[] {
  const out: MenuItemType[] = [];
  for (const item of items) {
    if (item.menuKey && hidden.has(item.menuKey)) {
      continue;
    }
    if (item.children && item.children.length > 0) {
      const nextChildren = filterMenuByHiddenKeys(item.children, hidden);
      if (item.isTitle) {
        if (nextChildren.length === 0) {
          continue;
        }
        out.push({ ...item, children: nextChildren });
      } else {
        if (nextChildren.length === 0 && !item.url) {
          continue;
        }
        out.push({ ...item, children: nextChildren });
      }
    } else {
      out.push({ ...item });
    }
  }
  return out;
}

function deepFilterSearch(items: MenuItemType[], search: string, includeAll = false): MenuItemType[] {
  return items
    .map((item) => {
      const selfMatch = (item.label || '').toLowerCase().includes(search);

      if (selfMatch || includeAll) {
        return {
          ...item,
          children: item.children ? [...item.children] : undefined,
        };
      }

      if (item.children && item.children.length) {
        const filteredChildren = deepFilterSearch(item.children, search, false);
        if (filteredChildren.length) {
          return { ...item, children: filteredChildren };
        }
      }

      if (item.isTitle) {
        return null;
      }

      return selfMatch ? item : null;
    })
    .filter((x): x is MenuItemType => x !== null);
}

@Component({
  selector: 'app-sidenav',
  imports: [AppLogo, AppMenuComponent, SimplebarAngularModule],
  templateUrl: './sidenav.html',
  styles: ``,
})
export class Sidenav {
  @ViewChild(AppMenuComponent) menuComp!: AppMenuComponent;
  private readonly navVis = inject(SidebarNavVisibilityService);

  /** Menu filter text — a signal so the derived menu list is stable between unrelated CD cycles. */
  protected readonly filterText = signal('');

  protected showNoResults = false;

  protected readonly menuItems = menuItems;

  /**
   * Clone + filter only when visibility or search changes — not on every change detection.
   * Otherwise `ngbCollapse` / `isCollapsed` on parents (e.g. Settings) reset every tick and
   * children never stay visible.
   */
  protected readonly displayMenuItems = computed(() => {
    const cloned = deepCloneMenu(this.menuItems);
    const visibilityApplied = this.navVis.bootstrapLoading()
      ? cloned
      : filterMenuByHiddenKeys(cloned, this.navVis.hiddenKeys());

    const ft = this.filterText().trim();
    if (!ft) {
      return visibilityApplied;
    }
    return deepFilterSearch(visibilityApplied, ft.toLowerCase());
  });

  updateFilterText(e: Event) {
    const target = e.target as HTMLInputElement;
    this.filterText.set(target.value);
    const items = this.displayMenuItems();
    this.showNoResults = !items.length;
    this.menuComp.expandFilteredPaths(items);
  }
}

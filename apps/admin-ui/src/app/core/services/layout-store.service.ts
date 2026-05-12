import {Injectable, signal} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {LayoutSkinType, LayoutState, LayoutThemeType} from '@/app/types/layout';
import {NgbOffcanvas} from '@ng-bootstrap/ng-bootstrap';
import {Customizer} from '@layouts/components/customizer/customizer';

const STORAGE_KEY = '__SMART_ADMIN_ANGULAR_CONFIG__';

const INIT_STATE: LayoutState = {
  theme: 'light',
  headerFixed: false,
  navFull: false,
  navFixed: false,
  navCollapsed: false,
  navMinified: false,
  darkNavigation: true,
  colorblindMode: false,
  highContrastMode: false,
  selectedTheme: 'default',
};

@Injectable({ providedIn: 'root' })
export class LayoutService {
  private html = document.documentElement;

  /** Reactive state + BehaviorSubject for subscription */
  state = signal<LayoutState>(this.loadInitialState());
  private _state$ = new BehaviorSubject<LayoutState>(this.state());
  state$ = this._state$.asObservable();

  /** Map boolean keys → CSS classes */
  private readonly settingClassMap: Record<keyof LayoutState, string> = {
    theme: '',
    headerFixed: 'set-header-fixed',
    navFull: 'set-nav-full',
    navFixed: 'set-nav-fixed',
    navCollapsed: 'set-nav-collapsed',
    navMinified: 'set-nav-minified',
    darkNavigation: 'set-nav-dark',
    colorblindMode: 'set-colorblind-mode',
    highContrastMode: 'set-high-contrast-mode',
    selectedTheme: '',
  };

  /** Customizer open state */
  customizer = signal({ isOpen: false });

  constructor(private offcanvas: NgbOffcanvas) {
    this.applyAttributesFromState();
  }

  /** -------- Persistence Helpers -------- */
  private loadInitialState(): LayoutState {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : INIT_STATE;
    } catch {
      return INIT_STATE;
    }
  }

  private persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state()));
    this._state$.next(this.state());
  }

  private updateState(partial: Partial<LayoutState>, persist = true) {
    this.state.update(prev => ({ ...prev, ...partial }));
    if (persist) this.persist();
  }


  get skin() {
    return this.state().selectedTheme;
  }

  get navMinified() {
    return this.state().navMinified;
  }

  get theme() {
    return this.state().theme;
  }

  /** -------- Settings -------- */
  toggleSetting(key: keyof LayoutState, value: boolean, persist = true) {
    const className = this.settingClassMap[key];
    if (className) {
      this.html.classList.toggle(className, value);
    }
    this.updateState({ [key]: value } as Partial<LayoutState>, persist);
  }

  changeTheme(theme: LayoutThemeType, persist = true) {
    this.toggleAttribute('data-bs-theme', theme);
    this.updateState({ theme }, persist);
  }

  changeThemeStyle(themeId: LayoutSkinType, persist = true) {
    const themeStyleEl = document.getElementById('app-theme') as HTMLLinkElement | null;
    if (themeId === 'default') {
      if (themeStyleEl) themeStyleEl.href = '';
    } else {
      if (themeStyleEl) themeStyleEl.href = `/assets/css/${themeId}.css`;
    }
    this.updateState({ selectedTheme: themeId }, persist);
  }

  /** -------- Reset -------- */
  reset() {
    const classesToRemove = Object.values(this.settingClassMap).filter(Boolean);
    classesToRemove.forEach(cls => this.html.classList.remove(cls));
    const themeStyleEl = document.getElementById('app-theme') as HTMLLinkElement | null;
    if (themeStyleEl) themeStyleEl.href = '';
    this.state.set(INIT_STATE);
    this.persist();
    localStorage.removeItem('panelStates');
    this.applyAttributesFromState();
  }

  /** -------- Backdrop -------- */
  showBackdrop() {
    const backdrop = document.createElement('div');
    backdrop.id = 'custom-backdrop';
    backdrop.className = 'offcanvas-backdrop sidenav-backdrop fade show';
    document.body.appendChild(backdrop);
    document.body.style.overflow = 'hidden';
    if (window.innerWidth > 767) document.body.style.paddingRight = '15px';
    backdrop.addEventListener('click', () => {
      document.documentElement.classList.remove('app-mobile-menu-open');
      this.hideBackdrop();
    });
  }

  hideBackdrop() {
    const backdrop = document.getElementById('custom-backdrop');
    if (backdrop) {
      document.body.removeChild(backdrop);
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
  }

  /** -------- Customizer -------- */
  toggleCustomizer() {
    this.offcanvas.open(Customizer, { position: 'end', backdrop: true, scroll: true,panelClass:'app-drawer' })
  }

  /** -------- Apply on Init -------- */
  private applyAttributesFromState() {
    const s = this.state();
    this.toggleAttribute('data-bs-theme', s.theme);

    const themeStyleEl = document.getElementById('app-theme') as HTMLLinkElement | null;
    if (themeStyleEl) {
      themeStyleEl.href =
        s.selectedTheme === 'default' ? '' : `/assets/css/${s.selectedTheme}.css`;
    }

    (Object.entries(s) as [keyof LayoutState, any][]).forEach(([key, val]) => {
      if (typeof val === 'boolean') {
        const className = this.settingClassMap[key];
        if (className) this.html.classList.toggle(className, val);
      }
    });
  }

  private toggleAttribute(attr: string, value: string) {
    this.html.setAttribute(attr, value);
  }
}

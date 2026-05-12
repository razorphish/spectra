import {Component, inject} from '@angular/core';
import {LayoutService} from '@core/services/layout-store.service';
import {LayoutSkinType, LayoutState} from '@/app/types/layout';
import {TitleCasePipe} from '@angular/common';
import {NgbActiveOffcanvas} from '@ng-bootstrap/ng-bootstrap';
import {SimplebarAngularModule} from 'simplebar-angular';

@Component({
  selector: 'app-customizer',
  imports: [
    TitleCasePipe,
    SimplebarAngularModule
  ],
  templateUrl: './customizer.html',
  styles: ``
})
export class Customizer {
  private offcanvas = inject(NgbActiveOffcanvas)

  close() {
    this.offcanvas.dismiss()
  }
  constructor(public layout: LayoutService) {
  }

  toggle(key: keyof LayoutState, e: Event) {
    const val = (e.target as HTMLInputElement).checked;
    this.layout.toggleSetting(key, val);
    if (key === 'navCollapsed' && val && !this.layout.state().navFull) {
      this.layout.toggleSetting('navFull', true);
    }
  }

  skins: LayoutSkinType[] = ['default', 'nebula', 'olive', 'solar', 'lunar', 'night', 'aurora', 'earth', 'flare', 'storm']

  setThemeStyle(theme: LayoutSkinType) {
    this.layout.changeThemeStyle(theme);
  }

  resetAll() {
    this.layout.reset();
  }

  // resetPanelOnly() {
  //   this.layout.resetPanelState();
  // }

  getSkinGradient(skin: LayoutSkinType) {
    const gradients: Record<LayoutSkinType, string> = {
      default: 'linear-gradient(135deg, #FF6A00, #F6A2D5, #4C91BF, #7A8B92, #AB7C9A)',
      nebula: 'linear-gradient(135deg, #2a7dbf, #2a9d8f, #766cbc, #f4a261, #e76f51)',
      olive: 'linear-gradient(135deg, #556B2F, #6B8E23, #8B9A3D, #A9B83E, #BDB76B)',
      solar: 'linear-gradient(135deg, #FF8C00, #FFD700, #FF4500, #F1C40F, #F39C12)',
      lunar: 'linear-gradient(135deg, #2C3E50, #34495E, #5F6368, #AAB7B8, #E6E6FA, #F1F3F4)',
      night: 'linear-gradient(135deg, #1e2a47, #2b3654, #363d6c, #4f5d79, #717b91, #b6c4d1)',
      aurora: 'linear-gradient(135deg, #337e7e, #527a4a, #63279b, #7FFF00, #87CEFA, #B0E0E6)',
      earth: 'linear-gradient(135deg, #2198f3, #3173a5, #3f6888, #618d48, #52bf11)',
      flare: 'linear-gradient(135deg, #FF4500, #FF6347, #F44336, #D32F2F, #B71C1C)',
      storm: 'linear-gradient(135deg, #2F4F4F, #3B5360, #4B6A6E, #5A7980, #A9A9A9, #FFD700)'
    };
    return gradients[skin];
  }

}

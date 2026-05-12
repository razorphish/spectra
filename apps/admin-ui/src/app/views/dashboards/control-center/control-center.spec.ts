import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ControlCenter } from './control-center';

describe('ControlCenter', () => {
  let component: ControlCenter;
  let fixture: ComponentFixture<ControlCenter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlCenter]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ControlCenter);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

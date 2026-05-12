import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlankPage } from './blank-page';

describe('BlankPage', () => {
  let component: BlankPage;
  let fixture: ComponentFixture<BlankPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlankPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BlankPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

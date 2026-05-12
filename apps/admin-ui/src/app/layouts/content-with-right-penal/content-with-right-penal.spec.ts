import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContentWithRightPenal } from './content-with-right-penal';

describe('TwoColumnLayout', () => {
  let component: ContentWithRightPenal;
  let fixture: ComponentFixture<ContentWithRightPenal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContentWithRightPenal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContentWithRightPenal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

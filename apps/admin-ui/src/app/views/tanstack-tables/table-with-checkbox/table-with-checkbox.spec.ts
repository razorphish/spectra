import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableWithCheckbox } from './table-with-checkbox';

describe('TableWithCheckbox', () => {
  let component: TableWithCheckbox;
  let fixture: ComponentFixture<TableWithCheckbox>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableWithCheckbox]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableWithCheckbox);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

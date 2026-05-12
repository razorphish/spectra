import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableWithFilters } from './table-with-filters';

describe('TableWithFilters', () => {
  let component: TableWithFilters;
  let fixture: ComponentFixture<TableWithFilters>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableWithFilters]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableWithFilters);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

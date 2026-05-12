import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableWithPagination } from './table-with-pagination';

describe('TableWithPagination', () => {
  let component: TableWithPagination;
  let fixture: ComponentFixture<TableWithPagination>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableWithPagination]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableWithPagination);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

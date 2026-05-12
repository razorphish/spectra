import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableWithSorting } from './table-with-sorting';

describe('TableWithSorting', () => {
  let component: TableWithSorting;
  let fixture: ComponentFixture<TableWithSorting>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableWithSorting]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableWithSorting);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

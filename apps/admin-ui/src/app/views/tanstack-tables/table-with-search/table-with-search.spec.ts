import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableWithSearch } from './table-with-search';

describe('TableWithSearch', () => {
  let component: TableWithSearch;
  let fixture: ComponentFixture<TableWithSearch>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableWithSearch]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableWithSearch);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

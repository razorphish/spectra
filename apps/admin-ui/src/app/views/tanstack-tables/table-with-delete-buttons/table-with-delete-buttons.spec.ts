import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableWithDeleteButtons } from './table-with-delete-buttons';

describe('TableWithDeleteButtons', () => {
  let component: TableWithDeleteButtons;
  let fixture: ComponentFixture<TableWithDeleteButtons>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableWithDeleteButtons]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableWithDeleteButtons);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { TestBed } from '@angular/core/testing';
import { HomeComponent } from './pages/home.component';

describe('sandbox-ui shell', () => {
  it('should render home heading', async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(HomeComponent);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain(
      'Developer portal',
    );
  });
});

import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { of } from 'rxjs';
import { LandingPageComponent } from './pages/landing.page';

describe('sandbox-ui landing', () => {
  it('should render landing heading', async () => {
    await TestBed.configureTestingModule({
      imports: [LandingPageComponent],
      providers: [
        provideRouter([]),
        // BffAuthService (injected by LandingPage) needs HttpClient even in Auth0 mode.
        provideHttpClient(),
        {
          provide: AuthService,
          useValue: {
            isAuthenticated$: of(false),
            loginWithRedirect: () => of(undefined),
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(LandingPageComponent);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Spectra developer sandbox');
  });
});

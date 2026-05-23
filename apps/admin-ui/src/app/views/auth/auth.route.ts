import { Routes } from '@angular/router';
import { AuthCallback } from '@/app/views/auth/auth-callback';
import { Login } from '@/app/views/auth/login';
import { Register } from '@/app/views/auth/register';
import {LockScreen} from '@/app/views/auth/lock-screen';
import {TwoFactor} from '@/app/views/auth/two-factor';
import {ForgotPassword} from '@/app/views/auth/forgot-password';
import {PrivacyPolicy} from '@/app/views/auth/privacy-policy';
import {TermsOfService} from '@/app/views/auth/terms-of-service';

export const AUTH_ROUTES: Routes = [
  {
    path: 'callback',
    component: AuthCallback,
    data: { title: 'Auth callback' },
  },
  {
    path: 'login',
    component: Login,
    data: { title: 'Login' },
  },
  {
    path: 'register',
    component: Register,
    data: {title: "Register"},
  },
  {
    path: 'lockscreen',
    component: LockScreen,
    data: {title: "Lockscreen"},
  },
  {
    path: 'two-factor',
    component: TwoFactor,
    data: {title: "Two Factor"},
  },
  {
    path: 'forgot-password',
    component: ForgotPassword,
    data: {title: "Forgot Password"},
  },
  {
    path: 'terms-of-service',
    component: TermsOfService,
    data: {title: 'Terms of Service'},
  },
  {
    path: 'privacy-policy',
    component: PrivacyPolicy,
    data: {title: 'Privacy Policy'},
  },

];

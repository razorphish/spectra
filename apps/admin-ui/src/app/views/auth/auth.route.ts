import {Routes} from '@angular/router';
import {Login} from '@/app/views/auth/login';
import {Register} from '@/app/views/auth/register';
import {LockScreen} from '@/app/views/auth/lock-screen';
import {TwoFactor} from '@/app/views/auth/two-factor';
import {ForgotPassword} from '@/app/views/auth/forgot-password';



export const AUTH_ROUTES: Routes = [
  {
    path: 'auth/login',
    component: Login,
    data: {title: "Login"},
  },
  {
    path: 'auth/register',
    component: Register,
    data: {title: "Register"},
  },
  {
    path: 'auth/lockscreen',
    component: LockScreen,
    data: {title: "Lockscreen"},
  },
  {
    path: 'auth/two-factor',
    component: TwoFactor,
    data: {title: "Two Factor"},
  },
  {
    path: 'auth/forgot-password',
    component: ForgotPassword,
    data: {title: "Forgot Password"},
  },

];

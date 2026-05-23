import { Component } from '@angular/core';
import {Header} from '@/app/views/landing/components/header';
import {Hero} from '@/app/views/landing/components/hero';
import {Features} from '@/app/views/landing/components/features';
import {Demo} from '@/app/views/landing/components/demo';
import {Journey} from '@/app/views/landing/components/journey';
import {Testimonial} from '@/app/views/landing/components/testimonial';
import {Newsletter} from '@/app/views/landing/components/newsletter';
import {Faqs} from '@/app/views/landing/components/faqs';
import {Contact} from '@/app/views/landing/components/contact';
import {Footer} from '@/app/views/landing/components/footer';

@Component({
  selector: 'app-landing',
  imports: [
    Header,
    Hero,
    Features,
    Demo,
    Journey,
    Testimonial,
    Newsletter,
    Faqs,
    Contact,
    Footer,
  ],
  templateUrl: './landing.html',
  styles: ``
})
export class Landing {

}

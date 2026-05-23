import {Component} from '@angular/core';
import {NgbAccordionModule} from '@ng-bootstrap/ng-bootstrap';

type FAQType = {
  question: string;
  answer: string;
}

@Component({
  selector: 'app-faqs',
  imports: [NgbAccordionModule],
  template: `
    <section class="faq-section">
      <div class="container">
        <div class="text-center mb-5">
          <h2 class="display-6 fw-700 mb-3">Frequently Asked Questions</h2>
          <p class="lead text-muted">Find answers to common questions about SmartAdmin</p>
        </div>

        <div class="row justify-content-center">
          <div class="col-lg-8">
            <div ngbAccordion [closeOthers]="true">
              @for (faq of faqData; track $index) {
              <div ngbAccordionItem class="border-0 mb-3">
                <h3 ngbAccordionHeader>
                  <button ngbAccordionButton type="button">
                    {{ faq.question }}
                  </button>
                </h3>
                <div ngbAccordionCollapse>
                  <div class="text-muted" ngbAccordionBody>
                    {{faq.answer}}
                  </div>
                </div>
              </div>
              }
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: ``
})

export class Faqs {
  faqData: FAQType[] = [
    {
      question: 'What is SmartAdmin?',
      answer:
        'SmartAdmin is a powerful web app designed to simplify your workflow and enhance productivity. It offers a wide range of features to streamline your administrative tasks and improve team collaboration.',
    },
    {
      question: 'Is it user friendly?',
      answer:
        "Yes! SmartAdmin features an intuitive interface that's easy to navigate. We've designed it with user experience in mind, making it accessible for both beginners and advanced users.",
    },
    {
      question: 'Can I customize it?',
      answer:
        'Absolutely! SmartAdmin offers extensive customization options to match your brand and workflow preferences. You can modify layouts, themes, and functionality to suit your needs.',
    },
    {
      question: 'Is there a trial?',
      answer:
        'Yes, we offer a free trial period so you can explore all features before making a commitment. Sign up today to start your trial!',
    },
  ];
}

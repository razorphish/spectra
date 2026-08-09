import { Component } from '@angular/core';
import { currentYear } from '../../../constants';

@Component({
    selector: 'app-footer',
    imports: [],
    templateUrl: './footer.html',
    styles: ``
})
export class Footer {
    protected readonly currentYear = currentYear;
}

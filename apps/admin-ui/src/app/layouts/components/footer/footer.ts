import { ViewportScroller } from '@angular/common';
import { Component } from '@angular/core';
import { appName, currentYear } from "../../../constants";

@Component({
    selector: 'app-footer',
    imports: [],
    templateUrl: './footer.html',
    styles: ``
})
export class Footer {


    protected readonly currentYear = currentYear;
    protected readonly appName = appName;
}

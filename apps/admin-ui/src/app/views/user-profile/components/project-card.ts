import {Component, Input} from '@angular/core';
import {ProjectType} from '@/app/views/user-profile/types';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-project-card',
  imports: [
    RouterLink
  ],
  template: `
    <div class="panel h-100">
      <div class="panel-container">
        <div class="panel-content p-0">
          <div class="position-relative">
            <div
              class="w-100 height-sm bg-placeholder rounded-top overflow-hidden"
              [style.--body-bg]="project.bgColor"
              [style.--gp-color-1]="project.gpColor"
            ></div>
            <div class="position-absolute bottom-0 start-0 w-100 p-3 text-white">
              <h5 class="mb-1">{{ project.title }}</h5>
              <p class="mb-0 small">{{ project.tech }}</p>
            </div>
          </div>
          <div class="p-3">
            <p class="mb-3">{{ project.description }}</p>
            <a [routerLink]="[]" class="btn btn-default btn-sm">View Project</a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: ``
})
export class ProjectCard {
@Input({required: true}) project!: ProjectType
}

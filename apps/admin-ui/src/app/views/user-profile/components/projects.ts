import { Component } from '@angular/core';
import {FeaturedProjects} from '@/app/views/user-profile/components/featured-projects';
import {projects} from '@/app/views/user-profile/data';
import {ProjectCard} from '@/app/views/user-profile/components/project-card';

@Component({
  selector: 'app-projects',
  imports: [
    FeaturedProjects,
    ProjectCard
  ],
  template: `
    <div class="row">
      <div class="col-12 mb-4">
        <app-featured-projects/>
      </div>

      @for (project of projects; track $index) {
        <div class="col-md-6 col-xl-4 mb-4">
          <app-project-card [project]="project"/>
        </div>
      }
    </div>

  `,
  styles: ``
})
export class Projects {

  protected readonly projects = projects;
}

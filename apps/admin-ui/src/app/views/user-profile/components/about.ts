import { Component } from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';

@Component({
  selector: 'app-about',
  imports: [
    FormsModule,
    ReactiveFormsModule
  ],
  template: `
    <div class="row">
      <div class="col-lg-8">
        <div class="panel mb-4">
          <div class="panel-hdr">
            <h2>About Me</h2>
          </div>
          <div class="panel-container">
            <div class="panel-content">
              <div class="profile-view-mode">
                <p class="mb-4">Experienced Software Engineer with a demonstrated history of working in the
                  computer software industry. Skilled in JavaScript, React.js, Node.js, and UI/UX Design. Strong
                  engineering professional with a Bachelor's degree focused in Computer Science.</p>

                <h5 class="mb-3">Contact Information</h5>
                <div class="d-flex flex-column gap-2">
                  <div class="d-flex align-items-center">
                    <svg class="sa-icon me-2">
                      <use href="/assets/icons/sprite.svg#mail"></use>
                    </svg>
                    john.doe&commat;example.com
                  </div>
                  <div class="d-flex align-items-center">
                    <svg class="sa-icon me-2">
                      <use href="/assets/icons/sprite.svg#phone"></use>
                    </svg>
                    +1 (555) 123-4567
                  </div>
                  <div class="d-flex align-items-center">
                    <svg class="sa-icon me-2">
                      <use href="/assets/icons/sprite.svg#map-pin"></use>
                    </svg>
                    San Francisco, CA
                  </div>
                </div>
              </div>

              <div class="profile-edit-mode d-none">
                <form>
                  <div class="mb-3">
                    <label class="form-label">About Me</label>
                    <textarea class="form-control" rows="4">Experienced Software Engineer with a demonstrated history of working in the computer software industry. Skilled in JavaScript, React.js, Node.js, and UI/UX Design. Strong engineering professional with a Bachelor's degree focused in Computer Science.</textarea>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Email</label>
                    <input type="email" class="form-control" value="john.doe@example.com">
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Phone</label>
                    <input type="tel" class="form-control" value="+1 (555) 123-4567">
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Location</label>
                    <input type="text" class="form-control" value="San Francisco, CA">
                  </div>
                  <div class="d-flex gap-2">
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                    <button type="button" class="btn btn-default" data-action="toggle"
                            data-class="profile-edit-mode">Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        <div class="panel mb-4">
          <div class="panel-hdr">
            <h2>Experience</h2>
          </div>
          <div class="panel-container">
            <div class="panel-content">
              <div class="timeline">
                <div class="timeline-item">
                  <div class="timeline-marker bg-primary-500"></div>
                  <div class="timeline-content">
                    <h5 class="mb-2">Senior Software Engineer</h5>
                    <p class="text-muted mb-2">TechCorp • 2020 - Present</p>
                    <p>Lead developer for enterprise web applications using React and Node.js.</p>
                  </div>
                </div>
                <div class="timeline-item">
                  <div class="timeline-marker bg-success-500"></div>
                  <div class="timeline-content">
                    <h5 class="mb-2">Software Engineer</h5>
                    <p class="text-muted mb-2">InnovateTech • 2018 - 2020</p>
                    <p>Developed and maintained multiple client-facing applications.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-4">
        <div class="panel mb-4">
          <div class="panel-hdr">
            <h2>Skills</h2>
          </div>
          <div class="panel-container">
            <div class="panel-content">
              <div class="d-flex flex-wrap gap-2">
                <span class="badge bg-primary">JavaScript</span>
                <span class="badge bg-primary">React.js</span>
                <span class="badge bg-primary">Node.js</span>
                <span class="badge bg-primary">TypeScript</span>
                <span class="badge bg-primary">HTML5</span>
                <span class="badge bg-primary">CSS3</span>
                <span class="badge bg-primary">Git</span>
                <span class="badge bg-primary">AWS</span>
              </div>
            </div>
          </div>
        </div>

        <div class="panel mb-4">
          <div class="panel-hdr">
            <h2>Education</h2>
          </div>
          <div class="panel-container">
            <div class="panel-content">
              <div class="timeline">
                <div class="timeline-item">
                  <div class="timeline-marker bg-fusion-500"></div>
                  <div class="timeline-content">
                    <h5 class="mb-2">BS in Computer Science</h5>
                    <p class="text-muted mb-2">University of Technology • 2014 - 2018</p>
                    <p>Major in Software Engineering</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: ``
})
export class About {

}

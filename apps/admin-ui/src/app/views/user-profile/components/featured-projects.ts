import {Component, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {NgbCarouselModule, NgbModal} from '@ng-bootstrap/ng-bootstrap';
import {carouselItems} from '@/app/views/user-profile/data';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';

interface Project {
  img: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-featured-projects',
  standalone: true,
  imports: [CommonModule, NgbCarouselModule, ReactiveFormsModule],
  template: `
    <div class="panel">
      <div class="panel-hdr d-flex justify-content-between align-items-center pe-3">
        <h2>Featured Projects</h2>
        <button type="button" class="btn btn-outline-default btn-xs px-2"
                (click)="openAddProjectModal(addProjectModal)">
          Add Project
        </button>
      </div>
      <div class="panel-container">
        <div class="panel-content">
          <ngb-carousel [interval]="0" [pauseOnHover]="true">
            @for (project of carouselItems; track $index) {
              <ng-template ngbSlide>
                <div class="picsum-img-wrapper">
                  <img [src]="project.image" class="d-block w-100" [alt]="project.title">
                </div>
                <div class="carousel-caption">
                  <h5>{{ project.title }}</h5>
                  <p>{{ project.description }}</p>
                </div>
              </ng-template>
            }

          </ngb-carousel>
        </div>
      </div>
    </div>

    <ng-template #addProjectModal let-modal>
      <div class="modal-header">
        <h5 class="modal-title">Add New Project</h5>
        <button type="button" class="btn-close" aria-label="Close" (click)="modal.dismiss()"></button>
      </div>
      <form [formGroup]="projectForm" (ngSubmit)="onSubmit(modal)">
        <div class="modal-body">
          <div class="mb-3">
            <label class="form-label">Project Title <span class="text-danger">*</span></label>
            <input type="text" class="form-control" formControlName="title"
                   [ngClass]="{
                  'is-invalid': projectForm.get('title')?.invalid && (projectForm.get('title')?.dirty || projectForm.get('title')?.touched),
                  'is-valid': projectForm.get('title')?.valid && (projectForm.get('title')?.dirty || projectForm.get('title')?.touched)
                }"/>
            <div class="text-danger small invalid-feedback">
              Please provide a project title.
            </div>
          </div>

          <div class="row">
            <div class="col-md-6 mb-3">
              <label class="form-label">Project Type *</label>
              <select class="form-select" formControlName="type"
                      [ngClass]="{
                      'is-invalid': projectForm.get('type')?.invalid && (projectForm.get('type')?.dirty || projectForm.get('type')?.touched),
                      'is-valid': projectForm.get('type')?.valid && (projectForm.get('type')?.dirty || projectForm.get('type')?.touched)
                    }">
                <option value="">Select type</option>
                <option value="website">Website</option>
                <option value="mobile">Mobile App</option>
                <option value="desktop">Desktop App</option>
                <option value="library">Library/Framework</option>
                <option value="other">Other</option>
              </select>
              <div class="text-danger small invalid-feedback">
                Please select a project type.
              </div>
            </div>

            <div class="col-md-6 mb-3">
              <label class="form-label">Status *</label>
              <select class="form-select" formControlName="status" [ngClass]="{
                  'is-invalid': projectForm.get('status')?.invalid && (projectForm.get('status')?.dirty || projectForm.get('status')?.touched),
                  'is-valid': projectForm.get('status')?.valid && (projectForm.get('status')?.dirty || projectForm.get('status')?.touched)
                }">
                <option value="">Select status</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="planned">Planned</option>
              </select>
              <div class="text-danger small invalid-feedback">
                Please select a project status.
              </div>
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label">Description *</label>
            <textarea class="form-control" formControlName="description" rows="3"
                      [ngClass]="{
                'is-invalid': projectForm.get('description')?.invalid && (projectForm.get('description')?.dirty || projectForm.get('description')?.touched),
                'is-valid': projectForm.get('description')?.valid && (projectForm.get('description')?.dirty || projectForm.get('description')?.touched)
              }"></textarea>
            <div class="text-danger small invalid-feedback">
              Please provide a project description.
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label">Technologies Used *</label>
            <input type="text" class="form-control" formControlName="technologies" placeholder="E.g., React, Node.js"
                   [ngClass]="{
                  'is-invalid': projectForm.get('technologies')?.invalid && (projectForm.get('technologies')?.dirty || projectForm.get('technologies')?.touched),
                  'is-valid': projectForm.get('technologies')?.valid && (projectForm.get('technologies')?.dirty || projectForm.get('technologies')?.touched)
                }"/>
            <div class="text-danger small invalid-feedback">
              Please list the technologies used.
            </div>
          </div>

          <div class="mb-3">
            <label for="projectImage" class="form-label">Featured Image</label>
            <input type="file" class="form-control" id="projectImage" accept="image/*" formControlName="image"
                   [class.is-invalid]="projectForm.get('image')?.invalid && projectForm.get('image')?.touched">
            <div class="text-danger small invalid-feedback">
              Please select a project image.
            </div>
            <div class="form-text">Recommended image size: 1200x630 pixels</div>
          </div>

          <div class="row">
            <div class="col-md-6 mb-3">
              <label class="form-label">Project URL</label>
              <input type="url" class="form-control" placeholder="https://example.com" formControlName="link"
                     [class.is-valid]="projectForm.get('link')?.valid"/>
            </div>
            <div class="col-md-6 mb-3">
              <label class="form-label">Repository URL</label>
              <input type="url" class="form-control" formControlName="repo"
                     [class.is-valid]="projectForm.get('repo')?.valid"/>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-default" (click)="modal.dismiss()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Project</button>
        </div>
      </form>
    </ng-template>
  `,
})
export class FeaturedProjects implements OnInit{

  protected readonly carouselItems = carouselItems;

  projectForm!: FormGroup;

  constructor(
    private modalService: NgbModal,
    private fb: FormBuilder
  ) {
  }

  ngOnInit() {
    this.projectForm = this.fb.group({
      title: ['', Validators.required],
      type: ['', Validators.required],
      status: ['', Validators.required],
      description: ['', Validators.required],
      technologies: ['', Validators.required],
      image: [''],
      link: [''],
      repo: ['']
    });
  }

  openAddProjectModal(content: any) {
    this.modalService.open(content, {size: 'lg', backdrop: 'static'});
  }

  onSubmit(modalRef: any) {
    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      return;
    }

    // For now we push to carouselItems array
    this.carouselItems.push({
      image: this.projectForm.value.image || 'img/profile/default.png',
      title: this.projectForm.value.title,
      description: this.projectForm.value.description
    });

    modalRef.close();
    this.projectForm.reset();
  }
}

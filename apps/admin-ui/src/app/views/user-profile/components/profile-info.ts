import {Component} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {NgbModal, NgbModalModule} from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-profile-info',
  imports: [ReactiveFormsModule, NgbModalModule],
  template: `
    <div class="d-flex flex-column flex-md-row align-items-center position-relative p-4">
      <div class="profile-page-header-avatar mb-3 mb-md-0">
        <div class="position-relative">
          <img src="/assets/img/demo/avatars/avatar-admin-xl.png"
               class="rounded-circle border border-3 border-white shadow-2" alt="John Doe" width="160" height="160">
          <button class="btn btn-icon position-absolute bottom-0 end-0 bg-white rounded-circle shadow-2"
                  type="button" title="Edit Profile">
            <svg class="sa-icon">
              <use href="/assets/icons/sprite.svg#camera"></use>
            </svg>
          </button>
        </div>
      </div>

      <div class="profile-page-header-info ms-md-4 text-center text-md-start">
        <h1 class="fs-xxl fw-700 mb-2">John Doe</h1>
        <p class="text-muted mb-2">Senior Software Engineer at TechCorp</p>
        <div class="d-flex flex-wrap gap-2 justify-content-center justify-content-md-start">
          <span class="badge bg-primary-100 text-primary">JavaScript</span>
          <span class="badge bg-primary-100 text-primary">React</span>
          <span class="badge bg-primary-100 text-primary">Node.js</span>
          <span class="badge bg-primary-100 text-primary">UI/UX</span>
        </div>
      </div>

      <div class="profile-page-header-actions ms-md-auto mt-3 mt-md-0 d-flex">
        <button class="btn btn-outline-default waves-effect me-2 d-flex" (click)="openModal(editProfileModal)">
          <svg class="sa-icon me-2 inline-text">
            <use href="/assets/icons/sprite.svg#edit-3"></use>
          </svg>
          Edit Profile
        </button>
        <a href="javascript:void(0)" class="btn btn-outline-default d-flex waves-effect" >
          <svg class="sa-icon me-2 inline-block">
            <use href="/assets/icons/sprite.svg#share-2"></use>
          </svg>
          Share
        </a>
      </div>
    </div>

    <ng-template #editProfileModal let-modal>
      <div class="modal-header">
        <h5 class="modal-title">Edit Profile</h5>
        <button type="button" class="btn-close" aria-label="Close" (click)="modal.dismiss()"></button>
      </div>

      <form [formGroup]="profileForm" (ngSubmit)="onSubmit(modal)" class="needs-validation" novalidate>
        <div class="modal-body">
          <div class="row mb-g">
            <div class="col-md-12">
              <h6 class="mb-3 text-muted">Personal Information</h6>


              <div class="mb-3">
                <label class="form-label">Full Name <span class="text-danger">*</span></label>
                <input type="text" class="form-control" formControlName="fullName"
                       [class.is-invalid]="isInvalid('fullName')" [class.is-valid]="isValid('fullName')">
                <div class="invalid-feedback">Please provide your full name.</div>
              </div>

              <div class="mb-3">
                <label class="form-label">Profession <span class="text-danger">*</span></label>
                <input type="text" class="form-control" formControlName="profession"
                       [class.is-invalid]="isInvalid('profession')" [class.is-valid]="isValid('profession')">
                <div class="invalid-feedback">Please provide your profession.</div>
              </div>

              <div class="mb-3">
                <label class="form-label">Skills (comma separated) <span class="text-danger">*</span></label>
                <input type="text" class="form-control" formControlName="skills"
                       [class.is-invalid]="isInvalid('skills')" [class.is-valid]="isValid('skills')">
                <div class="invalid-feedback">Please provide at least one skill.</div>
              </div>
            </div>
          </div>

          <h6 class="mb-3 text-muted">Contact Information</h6>
          <div class="row">
            <div class="col-md-6 mb-3">
              <label class="form-label">Email <span class="text-danger">*</span></label>
              <input type="email" class="form-control" formControlName="email"
                     [class.is-invalid]="isInvalid('email')" [class.is-valid]="isValid('email')">
              <div class="invalid-feedback">Please provide a valid email address.</div>
            </div>
            <div class="col-md-6 mb-3">
              <label class="form-label">Phone <span class="text-danger">*</span></label>
              <input type="tel" class="form-control" formControlName="phone"
                     [class.is-invalid]="isInvalid('phone')" [class.is-valid]="isValid('phone')">
              <div class="invalid-feedback">Please provide a phone number.</div>
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label">Location <span class="text-danger">*</span></label>
            <input type="text" class="form-control" formControlName="location"
                   [class.is-invalid]="isInvalid('location')" [class.is-valid]="isValid('location')">
            <div class="invalid-feedback">Please provide your location.</div>
          </div>

          <h6 class="mb-3 text-muted">About Me</h6>
          <div class="mb-3">
            <label class="form-label">Bio <span class="text-danger">*</span></label>
            <textarea class="form-control" rows="4" formControlName="aboutMe"
                      [class.is-invalid]="isInvalid('aboutMe')" [class.is-valid]="isValid('aboutMe')"></textarea>
            <div class="invalid-feedback">Please provide a bio.</div>
          </div>


          <h6 class="mb-3 text-muted">Social Media</h6>
          <div class="row">
            <div class="col-md-4 mb-3">
              <label class="form-label">LinkedIn</label>
              <input type="url" class="form-control" formControlName="linkedin"
                     [class.is-valid]="isValid('linkedin')">
            </div>
            <div class="col-md-4 mb-3">
              <label class="form-label">GitHub</label>
              <input type="url" class="form-control" formControlName="github"
                     [class.is-valid]="isValid('github')">
            </div>
            <div class="col-md-4 mb-3">
              <label class="form-label">Twitter</label>
              <input type="url" class="form-control" formControlName="twitter"
                     [class.is-valid]="isValid('twitter')">
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-default" (click)="modal.dismiss()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Changes</button>
        </div>
      </form>
    </ng-template>
  `,
  styles: ``
})
export class ProfileInfo {
  profileForm: FormGroup;

  constructor(private fb: FormBuilder, private modalService: NgbModal) {
    this.profileForm = this.fb.group({
      fullName: ['John Doe', Validators.required],
      profession: ['Senior Software Engineer at TechCorp', Validators.required],
      skills: ['JavaScript, React, Node.js, UI/UX', Validators.required],
      email: ['john.doe@example.com', [Validators.required, Validators.email]],
      phone: ['+1 (555) 123-4567', Validators.required],
      location: ['San Francisco, CA', Validators.required],
      aboutMe: [
        `Experienced Software Engineer with a demonstrated history of working in the computer software industry. Skilled in JavaScript, React.js, Node.js, and UI/UX Design. Strong engineering professional with a Bachelor's degree focused in Computer Science.`,
        Validators.required
      ],
      linkedin: [''],
      github: [''],
      twitter: ['']
    });
  }

  isInvalid(controlName: string): boolean {
    const control = this.profileForm.get(controlName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  isValid(controlName: string): boolean {
    const control = this.profileForm.get(controlName);
    return !!(control && control.valid && (control.dirty || control.touched));
  }

  openModal(content: any) {
    this.modalService.open(content, { size: 'lg' });
  }

  onSubmit(modal: any) {
    if (this.profileForm.valid) {
      console.log(this.profileForm.value);
      modal.close();
    } else {
      this.profileForm.markAllAsTouched();
    }
  }
}

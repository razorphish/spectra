import {Component, EventEmitter, Output, TemplateRef} from '@angular/core';
import {CommentThread} from '@/app/views/user-profile/components/comment-thread';
import {comments, profileVisitors, suggestedUsers} from '@/app/views/user-profile/data';
import {NgbActiveModal, NgbDropdownModule, NgbModal, NgbModalModule} from '@ng-bootstrap/ng-bootstrap';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';

@Component({
  selector: 'app-news',
  imports: [
    CommentThread,
    NgbDropdownModule,
    NgbModalModule,
    FormsModule,
    ReactiveFormsModule
  ],
  template: `
    <div class="row">
      <div class="col-lg-8">
        <div class="panel mb-4">
          <div class="panel-hdr d-flex justify-content-between align-items-center pe-3">
            <h2>Latest Updates</h2>
            <button class="btn btn-outline-default btn-xs px-2" type="button" (click)="openModal(content)">
              Add News
            </button>
          </div>
          <div class="panel-container">
            <div class="panel-content">
              <div class="d-flex flex-column gap-4">
                <div class="border-bottom pb-4">
                  <div class="d-flex align-items-center mb-3">
                    <img src="/assets/img/demo/avatars/avatar-admin.png"
                         class="profile-image profile-image-md rounded-circle me-2" alt="John Doe">
                    <div>
                      <h6 class="mb-0">John Doe</h6>
                      <small class="text-muted">Posted 2 days ago</small>
                    </div>
                  </div>
                  <p class="mb-3">Excited to announce that our latest project has been successfully launched!
                    🚀</p>
                  <img src="/assets/img/demo/peace-full.jpg" class="img-fluid rounded mb-3" alt="Project Launch">
                  <div class="d-flex gap-2 mb-3">
                    <button type="button" class="btn btn-icon btn-default waves-effect rounded-circle">
                      <svg class="sa-icon">
                        <use href="/assets/icons/sprite.svg#heart"></use>
                      </svg>
                    </button>
                    <button type="button" class="btn btn-icon btn-default waves-effect rounded-circle">
                      <svg class="sa-icon">
                        <use href="/assets/icons/sprite.svg#message-square"></use>
                      </svg>
                    </button>
                    <button type="button" class="btn btn-icon btn-default waves-effect rounded-circle">
                      <svg class="sa-icon">
                        <use href="/assets/icons/sprite.svg#share-2"></use>
                      </svg>
                    </button>
                  </div>
                  <div class="comments-section mt-3">
                    <div class="d-flex gap-2 mb-4 align-items-center">
                      <img src="/assets/img/demo/avatars/avatar-admin.png"
                           class="profile-image profile-image-md rounded-circle me-2" alt="John Doe">
                      <div class="flex-grow-1">
                        <div class="comment-input-wrapper position-relative">
                          <input type="text" class="form-control rounded-pill" placeholder="Add a comment...">
                          <div
                            class="comment-actions position-absolute end-0 top-50 translate-middle-y me-2 d-none">
                            <button type="button" class="btn btn-icon btn-sm">
                              <svg class="sa-icon">
                                <use href="/assets/icons/sprite.svg#image"></use>
                              </svg>
                            </button>
                            <button type="button" class="btn btn-primary btn-sm rounded-pill px-3">Post</button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div ngbDropdown class="mb-3">
                      <button class="btn btn-link p-0 text-muted" type="button"
                              ngbDropdownToggle> Most relevant
                      </button>
                      <ul ngbDropdownMenu>
                        <li><a ngbDropdownItem class="active" href="javaScript:void(0);">Most relevant</a></li>
                        <li><a ngbDropdownItem href="javaScript:void(0);">Most recent</a></li>
                      </ul>
                    </div>
                    <app-comment-thread [comments]="comments"/>
                  </div>
                </div>
                <div class="border-bottom pb-4">
                  <div class="d-flex align-items-center mb-3">
                    <img src="/assets/img/demo/avatars/avatar-admin.png"
                         class="profile-image profile-image-md rounded-circle me-2" alt="John Doe">
                    <div>
                      <h6 class="mb-0">John Doe</h6>
                      <small class="text-muted">Posted 1 week ago</small>
                    </div>
                  </div>
                  <p class="mb-3">Just completed a certification in Advanced React Development! 📚</p>
                  <div class="d-flex gap-2 mb-3">
                    <button type="button" class="btn btn-icon btn-default rounded-circle waves-effect">
                      <svg class="sa-icon">
                        <use href="/assets/icons/sprite.svg#heart"></use>
                      </svg>
                    </button>
                    <button type="button" class="btn btn-icon btn-default rounded-circle waves-effect">
                      <svg class="sa-icon">
                        <use href="/assets/icons/sprite.svg#message-square"></use>
                      </svg>
                    </button>
                    <button type="button" class="btn btn-icon btn-default rounded-circle waves-effect">
                      <svg class="sa-icon">
                        <use href="/assets/icons/sprite.svg#share-2"></use>
                      </svg>
                    </button>
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
            <h2>Profile Views</h2>
          </div>
          <div class="panel-container">
            <div class="panel-content">
              <div class="d-flex flex-column gap-3">
                @for (visitor of profileVisitors; track $index) {
                  <div class="d-flex align-items-center">
                    <img [src]="visitor.avatar" class="rounded-circle me-3" width="48" height="48"
                         alt="Emily Chen">
                    <div>
                      <h6 class="mb-0">{{ visitor.name }}</h6>
                      <small class="text-muted">{{ visitor.role }}</small>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
        <div class="panel mb-4">
          <div class="panel-hdr">
            <h2>People You Might Know</h2>
          </div>
          <div class="panel-container">
            <div class="panel-content">
              <div class="d-flex flex-column gap-3">
                @for (user of suggestedUsers; track $index) {
                  <div class="d-flex align-items-center">
                    <img [src]="user.avatar" class="rounded-circle me-3" width="48" height="48"
                         alt="David Kim">
                    <div class="flex-grow-1">
                      <h6 class="mb-0">{{ user.name }}</h6>
                      <small class="text-muted">{{ user.role }}</small>
                    </div>
                    <button type="button" class="btn btn-xs btn-primary d-flex waves-effect"> Connect</button>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ng-template #content let-modal>
      <div class="modal-header">
        <h5 class="modal-title">Create News Update</h5>
        <button type="button" class="btn-close" (click)="modal.dismiss()"></button>
      </div>

      <div class="modal-body">
        <form [formGroup]="newsForm" novalidate>
          <div class="mb-3">
            <label for="newsTitle" class="form-label">
              Title <span class="text-danger">*</span>
            </label>
            <input
              type="text"
              class="form-control"
              id="newsTitle"
              placeholder="Add a title for your news"
              formControlName="title"
              [class.is-invalid]="newsForm.get('title')?.invalid && newsForm.get('title')?.touched"
            />
            <div class="invalid-feedback">
              Please provide a title for your news update.
            </div>
          </div>

          <div class="mb-3">
            <label for="newsContent" class="form-label">
              Content <span class="text-danger">*</span>
            </label>
            <textarea
              class="form-control"
              id="newsContent"
              rows="4"
              placeholder="Write your news update..."
              formControlName="content"
              [class.is-invalid]="newsForm.get('content')?.invalid && newsForm.get('content')?.touched"
            ></textarea>
            <div class="invalid-feedback">
              Please provide content for your news update.
            </div>
          </div>

          <div class="mb-3">
            <label for="newsImage" class="form-label">Image (Optional)</label>
            <input
              type="file"
              class="form-control"
              id="newsImage"
              accept="image/*"
              (change)="onFileChange($event)"
            />
            <div class="form-text">
              Recommended image size: 1200x630 pixels
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label">
              Visibility <span class="text-danger">*</span>
            </label>
            <div class="form-check">
              <input
                class="form-check-input"
                type="radio"
                id="newsPublic"
                formControlName="visibility"
                value="public"
              />
              <label class="form-check-label" for="newsPublic">
                Public - Anyone can see this news update
              </label>
            </div>
            <div class="form-check">
              <input
                class="form-check-input"
                type="radio"
                id="newsConnections"
                formControlName="visibility"
                value="connections"
              />
              <label class="form-check-label" for="newsConnections">
                Connections only - Only your connections can see this news update
              </label>
            </div>
          </div>
        </form>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-default" (click)="modal.close()">Cancel</button>
        <button type="button" class="btn btn-primary" (click)="submitForm()">Post Update</button>
      </div>
    </ng-template>
  `,
  styles: ``
})
export class News {

  protected readonly comments = comments;
  protected readonly profileVisitors = profileVisitors;
  protected readonly suggestedUsers = suggestedUsers;


  newsForm: FormGroup;

  openModal(content: TemplateRef<any>) {
    this.modalService.open(content, { size: 'lg' });
  }

  constructor(private fb: FormBuilder, public modalService: NgbModal) {
    this.newsForm = this.fb.group({
      title: ['', Validators.required],
      content: ['', Validators.required],
      image: [null],
      visibility: ['public', Validators.required]
    });
  }

  // Handle file selection
  onFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.newsForm.patchValue({ image: file });
    }
  }

  submitForm() {
    if (this.newsForm.invalid) {
      this.newsForm.markAllAsTouched();
      return;
    }
    const formData = new FormData();
    formData.append('title', this.newsForm.value.title);
    formData.append('content', this.newsForm.value.content);
    formData.append('visibility', this.newsForm.value.visibility);
    if (this.newsForm.value.image) {
      formData.append('image', this.newsForm.value.image);
    }
    this.modalService.dismissAll();
  }
}

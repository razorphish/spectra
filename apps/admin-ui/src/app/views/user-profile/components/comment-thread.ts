import {Component, Input} from '@angular/core';
import {CommentType} from '@/app/views/user-profile/types';
import {NgbDropdownModule} from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-comment-thread',
  imports: [NgbDropdownModule],
  template: `
    <div class="comments-list">
      @for (comment of comments; track $index;let i = $index) {
      <div class="comment-thread mb-4">
        <div class="d-flex gap-2">
          <img
            [src]="comment.user.avatar"
            class="profile-image profile-image-md rounded-circle me-2 mt-3"
            width="40"
            height="40"
            [alt]="comment.user.name"
          />

          <div class="flex-grow-1">
            <div class="comment-content body-bg rounded-3 p-3 ps-0">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <h6 class="mb-0 fw-bold">{{ comment.user.name }}</h6>

                <div ngbDropdown>
                  <a
                    class="btn btn-icon btn-sm waves-effect no-arrow"
                    ngbDropdownToggle
                    role="button"
                  >
                    <svg class="sa-icon">
                      <use href="/assets/icons/sprite.svg#more-horizontal"></use>
                    </svg>
                  </a>
                  <ul ngbDropdownMenu>
                    <li><a ngbDropdownItem>Edit</a></li>
                    <li><a ngbDropdownItem>Delete</a></li>
                    <li><a ngbDropdownItem>Report</a></li>
                  </ul>
                </div>
              </div>

              <p class="text-muted small mb-2">{{ comment.user.role }} • 3rd+</p>
              <p class="mb-2">{{ comment.comment }}</p>

              <div class="d-flex align-items-center gap-2">
                <button type="button" class="btn btn-icon btn-default waves-effect rounded-circle">
                  <svg class="sa-icon">
                    <use href="/assets/icons/sprite.svg#thumbs-up"></use>
                  </svg>
                </button>
                <button type="button" class="btn btn-icon btn-default waves-effect rounded-circle">
                  <svg class="sa-icon">
                    <use href="/assets/icons/sprite.svg#message-square"></use>
                  </svg>
                </button>
                <span class="text-muted small">{{ comment.time }}</span>
              </div>
            </div>

            @if (comment.reply?.length){
            <div  class="comment-thread mt-3">
              @for (reply of comment.reply; track $index;) {
              <div class="d-flex gap-2" >
                <img
                  [src]="reply.user.avatar"
                  class="profile-image profile-image-md rounded-circle me-2 mt-3"
                  width="40"
                  height="40"
                  [alt]="reply.user.name"
                />

                <div class="flex-grow-1">
                  <div class="comment-content body-bg rounded-3 p-3 ps-0">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                      <h6 class="mb-0 fw-bold">{{ reply.user.name }}</h6>

                      <div ngbDropdown>
                        <a
                          class="btn btn-icon btn-sm waves-effect no-arrow"
                          ngbDropdownToggle
                          role="button"
                        >
                          <svg class="sa-icon">
                            <use href="/assets/icons/sprite.svg#more-horizontal"></use>
                          </svg>
                        </a>
                        <ul ngbDropdownMenu>
                          <li><a ngbDropdownItem>Edit</a></li>
                          <li><a ngbDropdownItem>Delete</a></li>
                          <li><a ngbDropdownItem>Report</a></li>
                        </ul>
                      </div>
                    </div>

                    <p class="text-muted small mb-2">{{ reply.user.role }} • 3rd+</p>
                    <p class="mb-2">{{ reply.comment }}</p>

                    <div class="d-flex align-items-center gap-2">
                      <button type="button" class="btn btn-icon btn-default waves-effect rounded-circle">
                        <svg class="sa-icon">
                          <use href="/assets/icons/sprite.svg#thumbs-up"></use>
                        </svg>
                      </button>
                      <button type="button" class="btn btn-icon btn-default waves-effect rounded-circle">
                        <svg class="sa-icon">
                          <use href="/assets/icons/sprite.svg#message-square"></use>
                        </svg>
                      </button>
                      <span class="text-muted small">{{ reply.time }}</span>
                    </div>
                  </div>
                </div>
              </div>
              }

              <button type="button" class="btn btn-link text-muted mt-2 p-0">
                Load more replies
              </button>
            </div>
            }
          </div>
        </div>
      </div>
      }

      <button type="button" class="btn btn-light rounded-pill w-100">
        Load more comments
      </button>
    </div>

  `,
  styles: ``
})
export class CommentThread {
  @Input({required: true}) comments: CommentType[] = [];
}

import { Component } from '@angular/core';
import {CommonModule} from '@angular/common';
import {SimplebarAngularModule} from 'simplebar-angular';
import {RouterLink} from '@angular/router';
import {NgbDropdownModule} from '@ng-bootstrap/ng-bootstrap';
import {SoundwaveComponent} from '@app/components/soundwave';

@Component({
  selector: 'app-group-chat',
  imports: [CommonModule, SimplebarAngularModule, RouterLink, NgbDropdownModule, SoundwaveComponent],
  template: `
    <div id="panel-2" class="panel panel-icon">
      <div class="panel-container">
        <div class="d-flex flex-grow-1 p-0 w-100 h-100">
          <div class="d-flex flex-column flex-grow-1 overflow-x-auto h-100" style="min-height: 599px">

            <div
              class="d-flex align-items-center p-0 border-faded border-top-0 border-start-0 border-end-0 flex-shrink-0">
              <div class="d-flex align-items-center w-100 ps-3 px-lg-3 py-2 position-relative">
                <div class="d-flex flex-row align-items-center mt-1 mb-1">
                  <div class="me-2 d-inline-block">
                <span class="d-block position-relative">
                  <img [src]="groupChatThumb" alt="" class="rounded profile-image profile-image-md"/>
                </span>
                  </div>
                  <div class="info-card-text">
                    <div class="text-truncate text-truncate-lg">Group Chat</div>
                    <small class="text-muted text-truncate text-truncate-md">7 online</small>
                  </div>
                </div>
                <div class="d-flex flex-row gap-2 ms-auto">
                  <a routerLink="" class="btn btn-icon rounded-circle waves-effect" aria-label="Phone">
                    <svg class="sa-icon sa-icon-2x sa-bold sa-icon-subtlelight">
                      <use href="/assets/icons/sprite.svg#phone"></use>
                    </svg>
                  </a>
                  <a routerLink="" class="btn btn-icon rounded-circle waves-effect" aria-label="Video">
                    <svg class="sa-icon sa-icon-2x sa-bold sa-icon-subtlelight sa-nofill">
                      <use href="/assets/icons/sprite.svg#video"></use>
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            <div class="flex-wrap align-items-center flex-grow-1 position-relative bg-gray-50">
              <div class="msgr position-absolute top-0 bottom-0 w-100 overflow-hidden d-flex flex-column">

                <ngx-simplebar id="chat_container" class="w-100 p-4 px-lg-3 bg-subtlelight-fade flex-grow-1"
                               style="height: calc(100% - 150px)">

                  <div class="chat-segment chat-segment-sent">
                    <div class="chat-message px-2 py-2 fs-sm">
                      <p><strong>&commat;OliverKopyov</strong>, can you please check the files? Make sure to analyze the
                        solution<br/>and create a report.</p>
                    </div>
                    <div class="text-end fw-300 text-muted mt-1 fs-xs">3:00 pm</div>
                  </div>

                  <div class="chat-segment chat-segment-get position-relative">
                <span class="rounded-circle profile-image profile-image-sm d-block position-absolute me-2 mt-1"
                      [ngStyle]="{'background-image': 'url(' + avatarB + ')', 'background-size': 'cover', left: '0'}"></span>
                    <div class="chat-message bg-warning bg-opacity-10 px-2 py-2 fs-sm ms-5">
                      <p><span class="d-block fw-600 fs-xs mb-2">Oliver Kopyov</span>Hi, Sorry... I analyzed the
                        solution. It will require some resource, which I could not manage.</p>
                    </div>
                    <div class="fw-300 text-muted mt-1 fs-xs ms-5">3:24 pm</div>
                  </div>

                  <div class="chat-segment chat-segment-sent chat-start">
                    <div class="chat-message px-2 py-2 fs-sm">
                      <p>Okay</p>
                    </div>
                  </div>

                  <div class="chat-segment chat-segment-sent chat-end">
                    <div class="chat-message px-2 py-2 fs-sm">
                      <p>&commat;GeraldChait, can you please help &commat;OliverKopyov with the report?</p>
                    </div>
                    <div class="text-end fw-300 text-muted mt-1 fs-xs">3:26 pm</div>
                  </div>

                  <div class="chat-segment chat-segment-get chat-start position-relative">
                <span class="rounded-circle profile-image profile-image-sm d-block position-absolute me-2 mt-1"
                      [ngStyle]="{'background-image': 'url(' + avatarC + ')', 'background-size': 'cover', left: '0'}"></span>
                    <div class="chat-message bg-info bg-opacity-10 px-2 py-2 fs-sm ms-5">
                      <p><span class="d-block fw-600 fs-xs mb-2">Melissa Emma Ayre</span>I can help you out<br/>Can you
                        send the related files?</p>
                    </div>
                  </div>

                  <div class="chat-segment chat-segment-get mb-3 chat-end">
                    <div class="chat-message bg-info bg-opacity-10 px-2 py-2 fs-sm ms-5">
                      <button type="button" aria-label="Play sound"
                              class="btn btn-sm btn-outline-secondary p-1 position-absolute translate-middle top-50 start-0 ms-4">
                        <svg class="sa-icon">
                          <use href="/assets/icons/sprite.svg#play"></use>
                        </svg>
                      </button>
                      <div class="sound-image ms-5">
                        <app-soundwave/>
                      </div>
                    </div>
                    <div class="fw-300 text-muted mt-1 fs-xs ms-5">3:29 pm</div>
                  </div>

                  <div class="chat-segment chat-segment-get chat-start position-relative">
                    <span class="rounded-circle profile-image profile-image-sm d-block position-absolute me-2 mt-1"
                          [ngStyle]="{'background-image': 'url(' + avatarB + ')', 'background-size': 'cover', left: '0'}"></span>
                    <div class="chat-message bg-warning bg-opacity-10 px-2 py-2 fs-sm ms-5">
                      <p>
                        <span class="d-block fw-600 fs-xs mb-2">Oliver Kopyov</span>
                      </p>
                      <div class="position-relative">
                        <button type="button" aria-label="Play sound"
                                class="btn btn-sm btn-outline-secondary p-1 position-absolute translate-middle top-50 start-0 ms-3"
                                data-action="playsound" data-soundpath="media/sound/" data-soundfile="demo-bryan.mp3">
                          <svg class="sa-icon">
                            <use href="/assets/icons/sprite.svg#play"></use>
                          </svg>
                        </button>
                        <div class="sound-image ms-5">
                          <app-soundwave/>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="chat-segment chat-segment-get chat-end mb-3">
                    <div class="chat-message bg-warning bg-opacity-10 px-2 py-2 fs-sm ms-5">
                      <div class="d-flex flex-wrap align-items-center gap-2 py-0">
                        <div class="alert m-0 p-0 badge bg-primary-50 border-primary ps-2">
                          security_codes.pdf
                          <button type="button" aria-label="Download"
                                  class="btn btn-icon btn-xs ms-1 rounded-0 border border-primary border-top-0 border-bottom-0 border-end-0">
                            <i class="sa sa-arrow-down"></i>
                          </button>
                        </div>
                        <div class="alert m-0 p-0 badge bg-primary-50 border-primary ps-2">
                          agreement.pdf
                          <button type="button" aria-label="Download"
                                  class="btn btn-icon btn-xs ms-1 rounded-0 border border-primary border-top-0 border-bottom-0 border-end-0">
                            <i class="sa sa-arrow-down"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                    <div class="fw-300 text-muted mt-1 fs-xs ms-5">3:33 pm</div>
                  </div>

                  <div class="chat-segment chat-segment-get position-relative">
                <span class="rounded-circle profile-image profile-image-sm d-block position-absolute me-2 mt-1"
                      [ngStyle]="{'background-image': 'url(' + avatarC + ')', 'background-size': 'cover', left: '0'}"></span>
                    <div class="chat-message bg-info bg-opacity-10 px-2 py-2 fs-sm ms-5 pb-0">
                      <span class="d-block fw-600 fs-xs mb-2">Melissa Emma Ayre</span>
                      <div class="emoji emoji--like">
                        <div class="emoji__hand">
                          <div class="emoji__thumb"></div>
                        </div>
                      </div>
                    </div>
                    <div class="fw-300 text-muted mt-1 fs-xs ms-5">Just now</div>
                  </div>

                  <div class="chat-segment chat-segment-sent chat-start">
                    <div class="chat-message px-2 py-2 fs-sm">
                      <p>Thanks Melissa!</p>
                    </div>
                  </div>
                </ngx-simplebar>

                <div class="panel-content border-faded border-start-0 border-end-0 border-bottom-0 bg-faded">
                  <textarea rows="2" class="form-control px-2 rounded-top border-bottom-0"
                            placeholder="write a reply..."></textarea>
                  <div class="d-flex align-items-center py-1 px-2 border border-top-0 rounded-bottom">
                    <div class="d-flex gap-1 flex-row align-items-center flex-wrap flex-shrink-0">

                      <div ngbDropdown>
                        <button ngbDropdownToggle class="btn btn-icon fs-xl waves-effect no-arrow" aria-label="Emoji">
                          <svg class="sa-icon sa-bold sa-icon-subtlelight">
                            <use href="/assets/icons/sprite.svg#smile"></use>
                          </svg>
                        </button>
                        <div ngbDropdownMenu class="text-center rounded-pill overflow-hidden">
                          <div class="d-flex align-items-center px-2 py-0 gap-1">
                            <a href="" class="emoji emoji--like" ngbTooltip="Like">
                              <div class="emoji__hand">
                                <div class="emoji__thumb"></div>
                              </div>
                            </a>
                            <a href="" class="emoji emoji--love" ngbTooltip="Love">
                              <div class="emoji__heart"></div>
                            </a>
                            <a href="" class="emoji emoji--haha" ngbTooltip="Haha">
                              <div class="emoji__face">
                                <div class="emoji__eyes"></div>
                                <div class="emoji__mouth">
                                  <div class="emoji__tongue"></div>
                                </div>
                              </div>
                            </a>
                            <a href="" class="emoji emoji--yay" ngbTooltip="Yay">
                              <div class="emoji__face">
                                <div class="emoji__eyebrows"></div>
                                <div class="emoji__mouth"></div>
                              </div>
                            </a>
                            <a href="" class="emoji emoji--wow" ngbTooltip="Wow">
                              <div class="emoji__face">
                                <div class="emoji__eyebrows"></div>
                                <div class="emoji__eyes"></div>
                                <div class="emoji__mouth"></div>
                              </div>
                            </a>
                            <a href="" class="emoji emoji--sad" ngbTooltip="Sad">
                              <div class="emoji__face">
                                <div class="emoji__eyebrows"></div>
                                <div class="emoji__eyes"></div>
                                <div class="emoji__mouth"></div>
                              </div>
                            </a>
                            <a href="" class="emoji emoji--angry" ngbTooltip="Angry">
                              <div class="emoji__face">
                                <div class="emoji__eyebrows"></div>
                                <div class="emoji__eyes"></div>
                                <div class="emoji__mouth"></div>
                              </div>
                            </a>
                          </div>
                        </div>
                      </div>

                      <button class="btn btn-icon fs-xl waves-effect" ngbTooltip="Attach Files or Photos">
                        <svg class="sa-icon sa-bold sa-icon-subtlelight">
                          <use href="/assets/icons/sprite.svg#file"></use>
                        </svg>
                      </button>

                      <button class="btn btn-icon fs-xl width-1 waves-effect" ngbTooltip="Voice">
                        <svg class="sa-icon sa-bold sa-icon-subtlelight">
                          <use href="/assets/icons/sprite.svg#mic"></use>
                        </svg>
                      </button>
                    </div>

                    <button class="btn btn-primary btn-xs ms-auto waves-effect" aria-label="Reply">Reply</button>
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
export class GroupChat {
  groupChatThumb = `/assets/img/thumbs/pic-4.png`;
  avatarB = `/assets/img/demo/avatars/avatar-b.png`;
  avatarC = `/assets/img/demo/avatars/avatar-c.png`;
}

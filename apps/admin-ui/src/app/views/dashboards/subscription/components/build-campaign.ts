import {Component, inject, OnInit} from '@angular/core';
import {FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {NgbModal, NgbModalModule} from '@ng-bootstrap/ng-bootstrap';
import {ToastrModule, ToastrService} from 'ngx-toastr';
import {NgClass} from '@angular/common';
import {toPascalCase} from '@/app/helpers/casing';
import {NgIcon} from '@ng-icons/core';

@Component({
  selector: 'app-build-campaign',
  imports: [FormsModule, ReactiveFormsModule, NgbModalModule, ToastrModule, NgClass, NgIcon],
  template: `
    <button type="button" class="btn btn-outline-success" (click)="openModal(buildCampaignModal)">
      Build Campaign
    </button>

    <ng-template #buildCampaignModal let-modal>
      <form [formGroup]="campaignForm" (ngSubmit)="onSubmit(modal)">
        <div class="modal-header bg-primary text-white">
          <h5 class="modal-title">Build New Subscription Campaign</h5>
          <button type="button" class="btn btn-system btn-system-light ms-auto" (click)="modal.dismiss()">
            <svg class="sa-icon sa-icon-2x">
              <use href="/assets/icons/sprite.svg#x"></use>
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <div class="card mb-4">
            <div class="card-header">
              <h6 class="mb-0">Campaign Basics</h6>
            </div>
            <div class="card-body">
              <div class="row mb-3">
                <div class="col-md-6">
                  <div class="mb-3">
                    <label for="campaignName" class="form-label">Campaign Name *</label>
                    <input
                      type="text"
                      id="campaignName"
                      class="form-control form-control-lg"
                      formControlName="campaignName"
                      [ngClass]="{'is-invalid': isInvalid('campaignName')}"/>
                    <div class="invalid-feedback">{{ getError('campaignName') }}</div>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="mb-3">
                    <label for="campaignType" class="form-label">Campaign Type *</label>
                    <select
                      id="campaignType"
                      class="form-select form-select-lg"
                      formControlName="campaignType"
                      [ngClass]="{'is-invalid': isInvalid('campaignType')}">
                      <option value="">Select type...</option>
                      <option value="acquisition">New Customer Acquisition</option>
                      <option value="retention">Customer Retention</option>
                      <option value="winback">Win-back Campaign</option>
                      <option value="upgrade">Subscription Upgrade</option>
                    </select>
                    <div class="invalid-feedback">{{ getError('campaignType') }}</div>
                  </div>
                </div>
              </div>

              <div class="row mb-3">
                <div class="col-md-6">
                  <div class="mb-3">
                    <label for="startDate" class="form-label">Start Date *</label>
                    <input
                      type="date"
                      id="startDate"
                      class="form-control form-control-lg"
                      formControlName="startDate"
                      [ngClass]="{'is-invalid': isInvalid('startDate')}"/>
                    <div class="invalid-feedback">{{ getError('startDate') }}</div>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="mb-3">
                    <label for="endDate" class="form-label">End Date</label>
                    <input type="date" id="endDate" class="form-control form-control-lg" formControlName="endDate"/>
                  </div>
                </div>
              </div>

              <div class="mb-3">
                <label for="campaignDescription" class="form-label">Description</label>
                <textarea id="campaignDescription" rows="2" class="form-control"
                          formControlName="campaignDescription"></textarea>
              </div>
            </div>
          </div>

          <div class="card mb-4">
            <div class="card-header">
              <h6 class="mb-0">Audience & Offer</h6>
            </div>
            <div class="card-body">
              <div class="mb-4">
                <label class="form-label">Target Audience *</label>
                <select
                  class="form-select form-select-lg"
                  formControlName="targetAudience"
                  [ngClass]="{'is-invalid': isInvalid('targetAudience')}">
                  <option value="">Select audience...</option>
                  <option value="all">All Subscribers</option>
                  <option value="active">Active Subscribers</option>
                  <option value="inactive">Inactive Subscribers</option>
                  <option value="expired">Recently Expired</option>
                  <option value="custom">Custom Segment</option>
                </select>
                <div class="invalid-feedback">{{ getError('targetAudience') }}</div>
              </div>

              <div class="mb-4">
                <label class="form-label">
                  Offer Type <span class="text-danger">*</span>
                </label>
                <div class="row">
                  @for (offer of offerOptions; track $index) {
                    <div class="col-md-6 mb-3">
                      <div class="form-check card p-3 offer-card">
                        <input
                          class="form-check-input"
                          type="radio"
                          [defaultChecked]="offer.id =='offerDiscount'"
                          formControlName="offerType"
                          [id]="offer.id"
                          [value]="offer.value"
                          [ngClass]="{'is-invalid': isInvalid('offerType')}"/>
                        <label class="form-check-label" [for]="offer.id">
                          <i [class]="offer.icon + ' ' + offer.iconClass + ' me-2'"></i>
                          <strong>{{ offer.title }}</strong>
                          <p class="text-muted small mb-0">{{ offer.desc }}</p>
                        </label>
                      </div>
                    </div>
                  }
                </div>
                @if (isInvalid('offerType')) {
                  <div class="invalid-feedback d-block">{{ getError('offerType') }}</div>
                }
              </div>



              @if (campaignForm.get('offerType')?.value === 'discount') {
                <div class="mb-3">
                  <label class="form-label">Discount Amount</label>
                  <div class="d-flex align-items-center gap-1">
                    <input type="range" min="5" max="50" step="5" value="0" class="form-range"
                           formControlName="discountAmount"/>
                    <span class="badge bg-primary fs-6"
                          id="discountAmountValue">  {{ campaignForm.get('discountAmount')?.value || 0 }}%</span>
                  </div>
                </div>
              }
            </div>
          </div>

          <div class="card mb-4">
            <div class="card-header">
              <h6 class="mb-0">Channels & Budget</h6>
            </div>
            <div class="card-body">
              <label class="form-label">Campaign Channels *</label>
              <div class="row">
                @for (channel of channels; track $index) {
                  <div class="col-md-3">
                    <div class="form-check">
                      <input
                        type="checkbox"
                        class="form-check-input"
                        [id]="'channel-' + channel"
                        [value]="channel"
                        (change)="onChannelChange($event)"
                        [checked]="campaignChannels.includes(channel)"/>
                      <label class="form-check-label" [for]="'channel-' + channel">{{ channel }}</label>
                    </div>
                  </div>
                }
              </div>
              @if (channelError) {
                <div class="invalid-feedback d-block">{{ channelError }}</div>
              }

              <div class="row mt-4">
                <div class="col-md-6 mb-3">
                  <label class="form-label">Budget Allocation</label>
                  <div class="input-group">
                    <span class="input-group-text">$</span>
                    <input type="number" class="form-control form-control-lg" formControlName="campaignBudget"/>
                  </div>
                </div>
                <div class="col-md-6 mb-3">
                  <label class="form-label">Priority</label>
                  <select class="form-select form-select-lg" formControlName="priority">
                    <option value="low">Low</option>
                    <option value="medium" selected>Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div class="card mb-4">
            <div class="card-header">
              <h6 class="mb-0">Performance Goals</h6>
            </div>
            <div class="card-body">
              <div class="row">
                <div class="col-md-4 mb-3">
                  <label class="form-label">Conversion Target</label>
                  <div class="input-group">
                    <input type="number" class="form-control" formControlName="kpiConversions"/>
                    <span class="input-group-text">subscribers</span>
                  </div>
                </div>
                <div class="col-md-4 mb-3">
                  <label class="form-label">Revenue Target</label>
                  <div class="input-group">
                    <span class="input-group-text">$</span>
                    <input type="number" class="form-control" formControlName="kpiRevenue"/>
                  </div>
                </div>
                <div class="col-md-4 mb-3">
                  <label class="form-label">ROI Target</label>
                  <div class="input-group">
                    <input type="number" class="form-control" formControlName="kpiROI"/>
                    <span class="input-group-text">%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-outline-secondary" type="button" (click)="modal.dismiss()">
            <ng-icon name="bi-x-lg" class="bi bi-x-lg"></ng-icon> Cancel
          </button>
          <button class="btn btn-outline-primary" type="button" (click)="saveDraft()">
            <i class="bi bi-file-earmark me-1"></i> Save Draft
          </button>
          <button class="btn btn-success" type="submit">
            <i class="bi bi-rocket-takeoff me-1"></i> Launch Campaign
          </button>
        </div>
      </form>
    </ng-template>
  `,
  styles: ``
})
export class BuildCampaign {
  private toastr = inject(ToastrService)
  channels = ['email', 'sms', 'push', 'inapp'];
  campaignChannels: string[] = [];
  channelError = '';

  campaignForm: FormGroup;

  constructor(private fb: FormBuilder, private modalService: NgbModal) {
    this.campaignForm = this.fb.group({
      campaignName: ['', Validators.required],
      campaignType: ['', Validators.required],
      startDate: ['', Validators.required],
      endDate: [''],
      campaignDescription: [''],
      targetAudience: ['', Validators.required],
      offerType: ['discount', Validators.required],
      discountAmount: [null],
      campaignBudget: [null],
      priority: ['medium'],
      kpiConversions: [null],
      kpiRevenue: [null],
      kpiROI: [null]
    });
  }

  openModal(content: any) {
    this.modalService.open(content, {size: 'lg', backdrop: true});
  }

  onChannelChange(event: any) {
    const value = event.target.value;
    if (event.target.checked) {
      this.campaignChannels.push(value);
    } else {
      this.campaignChannels = this.campaignChannels.filter(c => c !== value);
    }
  }

  saveDraft() {
    const name = this.campaignForm.get('campaignName')?.value?.trim();
    if (!name) {
      this.toastr.error('Please fill in the campaign name')
    } else {
      this.toastr.success('Draft Saved!')
    }

  }

  onSubmit(modal: any) {
    if (this.campaignChannels.length === 0) {
      this.channelError = 'Select at least one channel.';
      this.toastr.error('please fill required fields')
      return;
    } else {
      this.channelError = '';
    }

    if (this.campaignForm.valid) {
      this.toastr.success('campaign launched successfully!')
      modal.close();
    } else {
      this.toastr.error('please fill required fields')
      this.campaignForm.markAllAsTouched();

    }
  }

  isInvalid(controlName: string) {
    const control = this.campaignForm.get(controlName);
    return control?.invalid && (control.dirty || control.touched);
  }

  getError(controlName: string) {
    const control = this.campaignForm.get(controlName);
    if (control?.errors?.['required']) {
      return `${toPascalCase(controlName)} is required.`;
    }
    return '';
  }

  offerOptions = [
    {
      id: 'offerDiscount',
      value: 'discount',
      icon: 'bi bi-percent',
      iconClass: 'text-primary',
      title: 'Discount',
      desc: 'Percentage or fixed amount discount'
    },
    {
      id: 'offerFreeTrial',
      value: 'freeTrial',
      icon: 'bi bi-clock-history',
      iconClass: 'text-success',
      title: 'Free Trial',
      desc: 'Temporary free access period'
    },
    {
      id: 'offerUpgrade',
      value: 'upgrade',
      icon: 'bi bi-arrow-up-circle',
      iconClass: 'text-warning',
      title: 'Upgrade Promotion',
      desc: 'Special pricing for upgrades'
    },
    {
      id: 'offerBundle',
      value: 'bundle',
      icon: 'bi bi-box-seam',
      iconClass: 'text-info',
      title: 'Bundle Offer',
      desc: 'Combined products/services'
    }
  ];

}

import { Component } from '@angular/core';
import {NgbModal, NgbModalModule, NgbNavModule, NgbNavOutlet} from '@ng-bootstrap/ng-bootstrap';
import {FormsModule, NgForm} from '@angular/forms';
import {About} from '@/app/views/user-profile/components/about';
import {News} from '@/app/views/user-profile/components/news';
import {Projects} from '@/app/views/user-profile/components/projects';
import {Contact} from '@/app/views/user-profile/components/contact';
import {ProfileInfo} from '@/app/views/user-profile/components/profile-info';

@Component({
  selector: 'app-user-profile',
  imports: [NgbModalModule, NgbNavOutlet, FormsModule, NgbNavModule, About, News, Projects, Contact, ProfileInfo],
  templateUrl: './user-profile.html',
  styles: ``
})
export class UserProfile {
  admin = '/assets/img/demo/avatars/avatar-admin-xl.png';
activeId='about';
  // Form Model
  profileForm = {
    fullName: 'John Doe',
    profession: 'Senior Software Engineer at TechCorp',
    skills: 'JavaScript, React, Node.js, UI/UX',
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    location: 'San Francisco, CA',
    aboutMe:
      "Experienced Software Engineer with a demonstrated history of working in the computer software industry. Skilled in JavaScript, React.js, Node.js, and UI/UX Design. Strong engineering professional with a Bachelor's degree focused in Computer Science.",
    linkedin: '',
    github: '',
    twitter: ''
  };

  constructor(private modalService: NgbModal) {}

  openModal(content: any) {
    this.modalService.open(content, { size: 'lg' });
  }

  onSubmit(form: NgForm, modal: any) {
    if (form.valid) {
      console.log('Profile Data:', this.profileForm);
      modal.close();
    }
  }
}

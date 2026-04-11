// email.service.ts
import { Injectable } from '@angular/core';
import emailjs from '@emailjs/browser';

@Injectable({
  providedIn: 'root'
})
export class EmailService {

  private serviceID = 'service_29bio6n';
  private templateID = 'template_m1821n1';
  private publicKey = '7fQJRj_sIR7_jTdMU';

  sendEmail(params: {
    to_email: string;
    student_name: string;
    tutor_name: string;
    subject: string;
    date: string;
    time: string;
  }) {
    return emailjs.send(this.serviceID, this.templateID, params, this.publicKey);
  }
}
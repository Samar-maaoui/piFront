import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

declare global {
  interface Window {
    PusherPushNotifications?: any;
  }
}

@Injectable({ providedIn: 'root' })
export class PusherBeamsService {
  private instanceId = 'de0b5920-5b65-4a1f-8e2f-49038d5f5918';
  private publishUrl = `https://${this.instanceId}.pushnotifications.pusher.com/publish_api/v1/instances/${this.instanceId}/publishes`;
  private authToken = '9748C3AF6BA3FBAE9CE215FED3FB69A4C4EB53386A62D0C3E2446E0275BA1393';
  private client: any;

  constructor(private http: HttpClient) {}

  /** Initialize Beams with a generic interest (e.g. 'hello') */
  init(interest = 'hello'): Promise<void> {
    return this.initWithInterest(interest);
  }

  /** Initialize Beams and subscribe to a tutor-specific interest */
  initForTutor(tutorId: number | string): Promise<void> {
    return this.initWithInterest(`tutor-${tutorId}`);
  }

  /** Initialize Beams and subscribe to a student-specific interest */
  initForStudent(studentId: number | string): Promise<void> {
    return this.initWithInterest(`student-${studentId}`);
  }

  private initWithInterest(interest: string): Promise<void> {
    this.log(`Initializing Pusher Beams for interest '${interest}'...`);

    if (!('serviceWorker' in navigator)) {
      return Promise.reject(new Error('Service workers not supported in this browser'));
    }
    if (!window.PusherPushNotifications) {
      const err = new Error('PusherPushNotifications SDK not loaded');
      this.logError(err);
      return Promise.reject(err);
    }

    // Register the service worker manually first, then pass it to Pusher Beams.
    // This avoids the SDK trying to fetch /service-worker.js itself (which fails
    // when Angular SSR intercepts the request).
    return navigator.serviceWorker
      .register('/service-worker.js')
      .then(registration => {
        this.log('Service worker registered:', registration.scope);
        this.client = new window.PusherPushNotifications.Client({
          instanceId: this.instanceId,
          serviceWorkerRegistration: registration
        });
        return this.client.start();
      })
      .then(() => this.client.addDeviceInterest(interest))
      .then(() => {
        this.log(`Pusher Beams started and subscribed to interest '${interest}'`);
      })
      .catch((error: any) => {
        this.logError(error);
        return Promise.reject(error);
      });
  }

  async publishNotification(interest: string, title: string, body: string): Promise<any> {
    const payload = {
      interests: [interest],
      web: {
        notification: { title, body }
      }
    };

    this.log(`Publishing Pusher notification to interest '${interest}': ${title}`);

    try {
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.authToken}`
      });
      const result = await firstValueFrom(this.http.post(this.publishUrl, payload, { headers }));
      this.log('Publish result:', result);
      return result;
    } catch (error: any) {
      this.logError(error);
      throw error;
    }
  }

  private log(...args: unknown[]): void {
    console.log('[PusherBeamsService]', ...args);
  }

  private logError(error: unknown): void {
    console.error('[PusherBeamsService]', error);
  }
}

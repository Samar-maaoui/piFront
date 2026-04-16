import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventDashboardFrontComponent } from './event-dashboard-front.component';

describe('EventDashboardFrontComponent', () => {
  let component: EventDashboardFrontComponent;
  let fixture: ComponentFixture<EventDashboardFrontComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventDashboardFrontComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EventDashboardFrontComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

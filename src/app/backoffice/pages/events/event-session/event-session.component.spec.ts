import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventSessionComponent } from './event-session.component';

describe('EventSessionComponent', () => {
  let component: EventSessionComponent;
  let fixture: ComponentFixture<EventSessionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventSessionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventSessionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

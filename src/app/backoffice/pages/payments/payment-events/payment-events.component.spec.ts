import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentEventsComponent } from './payment-events.component';

describe('PaymentEventsComponent', () => {
  let component: PaymentEventsComponent;
  let fixture: ComponentFixture<PaymentEventsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentEventsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentEventsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

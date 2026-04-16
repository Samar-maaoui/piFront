import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentCoursComponent } from './payment-cours.component';

describe('PaymentCoursComponent', () => {
  let component: PaymentCoursComponent;
  let fixture: ComponentFixture<PaymentCoursComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentCoursComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentCoursComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

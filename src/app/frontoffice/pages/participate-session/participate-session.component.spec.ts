import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParticipateSessionComponent } from './participate-session.component';

describe('ParticipateSessionComponent', () => {
  let component: ParticipateSessionComponent;
  let fixture: ComponentFixture<ParticipateSessionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ParticipateSessionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ParticipateSessionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

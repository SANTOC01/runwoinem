import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventsModal } from './events-modal';

describe('EventsModal', () => {
  let component: EventsModal;
  let fixture: ComponentFixture<EventsModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventsModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventsModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

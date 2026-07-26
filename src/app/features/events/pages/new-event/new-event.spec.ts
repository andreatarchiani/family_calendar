import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewEvent } from './new-event';

describe('NewEvent', () => {
  let component: NewEvent;
  let fixture: ComponentFixture<NewEvent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewEvent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewEvent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

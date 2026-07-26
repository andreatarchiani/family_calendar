import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Calendar } from './calendar';

describe('Calendar', () => {
  let component: Calendar;
  let fixture: ComponentFixture<Calendar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Calendar]
    })
      .compileComponents();

    fixture = TestBed.createComponent(Calendar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render a create-event action in the calendar view', () => {
    component.selectedDay = new Date(2026, 6, 20);
    fixture.detectChanges();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button'));
    const createButton = buttons.find(button =>
      button.textContent?.includes('Crea evento')
    );

    expect(createButton).toBeTruthy();
  });
});

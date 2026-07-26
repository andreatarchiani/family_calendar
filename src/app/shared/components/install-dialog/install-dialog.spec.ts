import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InstallDialog } from './install-dialog';

describe('InstallDialog', () => {
  let component: InstallDialog;
  let fixture: ComponentFixture<InstallDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InstallDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InstallDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

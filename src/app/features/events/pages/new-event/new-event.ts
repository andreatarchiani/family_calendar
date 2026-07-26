import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { Router, ActivatedRoute } from '@angular/router';

import { EventService } from '../../../../core/services/event.services';
import { CurrentUser } from '../../../../core/services/current-user';

@Component({
  selector: 'app-new-event',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule
  ],
  templateUrl: './new-event.html',
  styleUrl: './new-event.scss',
})
export class NewEvent {

  private fb = inject(FormBuilder);

  private eventService = inject(EventService);

  private currentUser = inject(CurrentUser);

  private snackBar = inject(MatSnackBar);

  private router = inject(Router);

  private route = inject(ActivatedRoute);


  isEditMode = false;

  private eventId?: string;



  eventForm = this.fb.group({

    title: [
      '',
      Validators.required
    ],

    date: [
      '',
      Validators.required
    ],

    startTime: [
      '',
    ],

    location: [
      ''
    ],

    notes: [
      ''
    ]

  });



  constructor() {

    const params = this.route.snapshot.queryParamMap;

    const eventId = params.get('id');


    if (eventId) {

      this.isEditMode = true;

      this.eventId = eventId;

      this.loadEvent(eventId);

    }
    else {

      const date = params.get('date');


      if (date) {

        this.eventForm.patchValue({
          date
        });

      }

    }

  }





  private loadEvent(id: string) {

    this.eventService.getEventById(id)
      .subscribe(event => {

        if (!event) {
          return;
        }


        this.eventForm.patchValue({

          title: event.title,

          date: event.date,

          startTime: event.startTime,

          location: event.location,

          notes: event.notes

        });

      });

  }





  async saveEvent() {


    if (this.eventForm.invalid) {

      return;

    }




    let user = this.currentUser.currentUser;



    while (!user) {

      await new Promise(resolve =>
        setTimeout(resolve, 100)
      );

      user = this.currentUser.currentUser;

    }




    if (!user) {

      console.error(
        'Current user not available'
      );

      return;

    }





    const event = {
      authorId: user.uid,

      title: this.eventForm.value.title!,

      date: this.eventForm.value.date!,

      startTime: this.eventForm.value.startTime ?? '',

      location: this.eventForm.value.location ?? '',

      notes: this.eventForm.value.notes ?? ''
    };





    if (this.isEditMode && this.eventId) {


      await this.eventService.update(

        this.eventId,

        event

      );


      this.showMessage(
        'Evento aggiornato'
      );


    }
    else {


      await this.eventService.create(event);


      this.showMessage(
        'Evento salvato'
      );


    }


    this.eventForm.reset();


  }






  private showMessage(message: string) {


    const snackBarRef = this.snackBar.open(

      message,

      'OK',

      {
        duration: 1000
      }

    );



    snackBarRef.afterDismissed().subscribe(() => {

      this.router.navigate(['/home']);

    });


  }


}
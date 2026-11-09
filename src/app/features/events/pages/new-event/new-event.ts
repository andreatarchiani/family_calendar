import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { Router, ActivatedRoute } from '@angular/router';

import { EventService } from '../../../../core/services/event.services';
import { CurrentUser } from '../../../../core/services/current-user';
import { FriendshipService } from '../../../../core/services/friendship';
import { UserService } from '../../../../core/services/user';

import { User } from '../../../../core/models/user';
import { EventVisibility } from '../../../../core/models/event.model';


@Component({
  selector: 'app-new-event',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatSelectModule,
    MatCheckboxModule
  ],
  templateUrl: './new-event.html',
  styleUrl: './new-event.scss',
})
export class NewEvent {


  private fb = inject(FormBuilder);

  private eventService = inject(EventService);

  private currentUser = inject(CurrentUser);

  private friendshipService = inject(FriendshipService);

  private userService = inject(UserService);

  private snackBar = inject(MatSnackBar);

  private router = inject(Router);

  private route = inject(ActivatedRoute);



  isEditMode = false;

  canEdit = false;

  private eventId?: string;


  friends: User[] = [];




  eventForm = this.fb.group({

    title: [
      '',
      Validators.required
    ],

    startDate: [
      '',
      Validators.required
    ],

    endDate: [
      '',
      Validators.required
    ],

    startTime: [
      ''
    ],

    location: [
      ''
    ],

    notes: [
      ''
    ],

    visibility: [
      'all' as EventVisibility,
      Validators.required
    ],

    visibleTo: [
      [] as string[]
    ]

  });






  constructor() {


    this.loadFriends();



    const params =
      this.route.snapshot.queryParamMap;



    const eventId =
      params.get('id');

    if (eventId) {

      this.loadEvent(eventId);

    }
    else {


      const date =
        params.get('date');


      if (date) {

        this.eventForm.patchValue({
          startDate: date,
          endDate: date
        });

      }


      // nuovo evento
      this.canEdit = true;


    }


  }








  private async loadFriends() {


    let user =
      this.currentUser.currentUser;



    while (!user) {

      await new Promise(resolve =>
        setTimeout(resolve, 100)
      );


      user =
        this.currentUser.currentUser;

    }




    const friendIds =
      await this.friendshipService.getFriends(
        user.uid
      );




    const resolvedFriends =
      await Promise.all(

        friendIds.map(uid =>
          this.userService.getUserById(uid)
        )

      );




    this.friends =
      resolvedFriends.filter(
        (friend): friend is User =>
          !!friend
      );


  }









  toggleFriendVisibility(uid: string) {


    const current =
      this.eventForm.value.visibleTo ?? [];



    if (current.includes(uid)) {


      this.eventForm.patchValue({

        visibleTo:
          current.filter(
            id => id !== uid
          )

      });


    }
    else {


      this.eventForm.patchValue({

        visibleTo: [
          ...current,
          uid
        ]

      });


    }


  }









  isFriendSelected(uid: string): boolean {


    return (
      this.eventForm.value.visibleTo ?? []
    )
      .includes(uid);


  }








  private loadEvent(id: string) {

    this.eventService
      .getEventById(id)
      .subscribe(event => {


        if (!event) {
          return;
        }


        const currentUid =
          this.currentUser.currentUser?.uid;


        // evento di un amico: torno indietro
        if (event.authorId !== currentUid) {

          this.router.navigate(['/calendar']);

          return;

        }


        this.isEditMode = true;
        this.canEdit = true;

        this.eventId = id;


        this.eventForm.patchValue({

          title: event.title,
          startDate: event.startDate ?? event.date,
          endDate: event.endDate ?? event.startDate ?? event.date,
          startTime: event.startTime,
          location: event.location,
          notes: event.notes,
          visibility: event.visibility ?? 'all',
          visibleTo: event.visibleTo ?? []

        });


      });

  }







  /** Quando cambia la data iniziale, propone la stessa data come fine. */
  onStartDateChange() {

    const startDate = this.eventForm.controls.startDate.value;

    this.eventForm.controls.endDate.setValue(startDate ?? '');

  }


  isDateRangeInvalid(): boolean {

    const startDate = this.eventForm.controls.startDate.value;
    const endDate = this.eventForm.controls.endDate.value;

    return !!startDate && !!endDate && endDate < startDate;

  }


  async saveEvent() {



    if (this.isEditMode && !this.canEdit) {


      this.showMessage(
        'Non puoi modificare questo evento'
      );


      return;

    }




    if (this.eventForm.invalid || this.isDateRangeInvalid()) {

      return;

    }






    let user =
      this.currentUser.currentUser;



    while (!user) {


      await new Promise(resolve =>
        setTimeout(resolve, 100)
      );


      user =
        this.currentUser.currentUser;


    }






    if (!user) {


      console.error(
        'Current user not available'
      );


      return;


    }







    const startDate = this.eventForm.value.startDate!;
    const endDate = this.eventForm.value.endDate!;

    const event = {


      authorId:
        user.uid,



      title:
        this.eventForm.value.title!,



      // 'date' resta valorizzato per compatibilità con le vecchie versioni.
      date: startDate,

      startDate,

      endDate,



      startTime:
        this.eventForm.value.startTime ?? '',



      location:
        this.eventForm.value.location ?? '',



      notes:
        this.eventForm.value.notes ?? '',



      visibility:
        this.eventForm.value.visibility as EventVisibility,



      visibleTo:
        this.eventForm.value.visibility === 'selected'
          ? (this.eventForm.value.visibleTo ?? [])
          : [],

      // Indice per query sicure: ogni destinatario ha un campo booleano interrogabile.
      visibleToMap:
        this.eventForm.value.visibility === 'selected'
          ? Object.fromEntries(
              (this.eventForm.value.visibleTo ?? []).map(uid => [uid, true])
            )
          : {}

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



      await this.eventService.create(
        event
      );



      this.showMessage(
        'Evento salvato'
      );


    }







  }









  private showMessage(message: string) {


    const snackBarRef =
      this.snackBar.open(

        message,

        'OK',

        {
          duration: 1000
        }

      );



    snackBarRef
      .afterDismissed()
      .subscribe(() => {


        this.router.navigate([
          '/home'
        ]);


      });


  }


}
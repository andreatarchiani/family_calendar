import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { EventService } from '../../core/services/event.services';
import { UserService } from '../../core/services/user';
import { FriendshipService } from '../../core/services/friendship';
import { FriendColorService } from '../../core/services/friend-color';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { from, map, switchMap, tap, catchError, shareReplay, firstValueFrom, filter } from 'rxjs';

import { Router } from '@angular/router';

import { APP_CONFIG } from '../../core/config/app-config';
import { CurrentUser } from '../../core/services/current-user';
import { MatSnackBar } from '@angular/material/snack-bar';

import { EventCardComponent } from '../../shared/components/event-card/event-card';



interface EventGroup {
  title: string;
  events: any[];
}

interface FriendPreferences {
  friendColors?: Record<string, string>;
  friendNames?: Record<string, string>;
}



@Component({
  selector: 'app-home',
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    EventCardComponent
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {


  private eventService = inject(EventService);

  private userService = inject(UserService);

  private friendshipService = inject(FriendshipService);

  private friendColorService = inject(FriendColorService);

  private router = inject(Router);

  currentUser = inject(CurrentUser);

  private snackBar = inject(MatSnackBar);



  showPastEvents = false;

  isLoading = true;


  appVersion = APP_CONFIG.version;





  isPastEvent(event: any): boolean {


    const now = new Date();


    const startDate = event.startDate ?? event.date;
    const endDate = event.endDate ?? startDate;

    if (!startDate || !endDate) return false;

    // Un evento su più giorni resta attivo fino alla fine dell'ultimo giorno.
    const eventDate = startDate !== endDate
      ? new Date(`${endDate}T23:59:59`)
      : new Date(`${startDate}T${event.startTime || '23:59:59'}`);

    return eventDate < now;

  }






  editEvent(eventId: string) {


    this.router.navigate(
      ['/events'],
      {
        queryParams: {
          id: eventId
        }
      }
    );


  }









  private eventsWithAuthor$ = this.currentUser.user$.pipe(
    // CurrentUser parte da null e viene valorizzato solo dopo il ripristino
    // della sessione Firebase: non trattare quel valore iniziale come lista vuota.
    filter((user): user is NonNullable<typeof user> => user !== null),
    switchMap(user => {
      this.isLoading = true;

      return from(this.friendshipService.getFriends(user.uid)).pipe(
        switchMap(friendIds => this.eventService.getVisibleEvents(user.uid, friendIds)),
        switchMap(async events => {
          console.log('[FC HOME] Avvio caricamento preferenze e profili', events.length);

          // Legge le preferenze una sola volta e chiude subito la sottoscrizione.
          const preferences = await firstValueFrom(
            this.friendColorService.getFriendColors(user.uid).pipe(
              catchError(error => {
                console.error('[FC HOME] ERRORE preferenze colori', error);
                return from([{}]);
              })
            )
          ) as FriendPreferences | undefined;

          const friendColors = preferences?.friendColors ?? {};
          const friendNames = preferences?.friendNames ?? {};

          // Un solo recupero profilo per autore, anche se ha più eventi.
          const authorIds = [...new Set(events.map(event => event.authorId).filter(Boolean))];
          const authorEntries = await Promise.all(authorIds.map(async authorId => {
            try {
              return [authorId, await this.userService.getUserById(authorId)] as const;
            } catch (error) {
              console.error('[FC HOME] ERRORE caricamento profilo autore', authorId, error);
              throw error;
            }
          }));
          const authors = new Map(authorEntries);

          const eventsWithUsers = events.map(event => {
            const author = authors.get(event.authorId) ?? null;
            return {
              ...event,
              author: author ? {
                ...author,
                name: friendNames[event.authorId] || author.name
              } : null,
              color: friendColors[event.authorId] || author?.color || '#ccc'
            };
          });

          return this.sortEvents(eventsWithUsers);
        })
      );
    }),
    tap(() => this.isLoading = false),
    catchError(error => {
      console.error('[FC HOME] ERRORE caricamento eventi', error);
      this.isLoading = false;
      return from([[]]);
    }),
    // Home usa lo stesso flusso in tre async pipe: condividi query e trasformazioni.
    shareReplay({ bufferSize: 1, refCount: true })
  );


  nextEvent$ =


    this.eventsWithAuthor$


      .pipe(


        map(events =>



          events.find(

            event =>

              !this.isPastEvent(event)


          )

          ??

          null


        )


      );










  futureEventGroups$ =


    this.eventsWithAuthor$


      .pipe(


        map(events =>

          this.groupFutureEvents(events)

        )


      );









  pastEvents$ =


    this.eventsWithAuthor$


      .pipe(


        map(events =>


          events.filter(

            event =>

              this.isPastEvent(event)

          )


        )


      );













  private sortEvents(events: any[]) {


    const today = new Date();




    return [...events].sort((a, b) => {



      const dateA =

        new Date(
          `${a.startDate ?? a.date}T${a.startTime || '00:00'}`
        );



      const dateB =

        new Date(
          `${b.startDate ?? b.date}T${b.startTime || '00:00'}`
        );





      const pastA = this.isPastEvent(a);


      const pastB = this.isPastEvent(b);





      if (pastA !== pastB) {

        return pastA ? 1 : -1;

      }





      if (!pastA) {


        return dateA.getTime()
          -
          dateB.getTime();


      }





      return dateB.getTime()
        -
        dateA.getTime();



    });


  }













  async deleteEvent(eventId: string) {



    const confirmed =

      window.confirm(
        'Sei sicuro di voler eliminare questo evento?'
      );



    if (!confirmed) {

      return;

    }




    await this.eventService.delete(
      eventId
    );




    this.snackBar.open(
      'Evento eliminato',
      'OK',
      {
        duration: 2000
      }
    );


  }









  togglePastEvents() {


    this.showPastEvents =

      !this.showPastEvents;


  }













  private groupFutureEvents(
    events: any[]
  ): EventGroup[] {



    const formatter =

      new Intl.DateTimeFormat(
        'it-IT',
        {
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        }
      );





    const groups =

      new Map<string, any[]>();





    const today =

      new Date();


    today.setHours(
      0, 0, 0, 0
    );





    const tomorrow =

      new Date(today);



    tomorrow.setDate(
      today.getDate() + 1
    );





    let firstFutureRemoved = false;







    for (const event of events) {



      if (this.isPastEvent(event)) {

        continue;

      }





      if (!firstFutureRemoved) {

        firstFutureRemoved = true;

        continue;

      }






      const eventStartDate = event.startDate ?? event.date;
      const eventEndDate = event.endDate ?? eventStartDate;
      const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const displayDate = eventStartDate < todayString && eventEndDate >= todayString
        ? todayString
        : eventStartDate;

      const date = new Date(`${displayDate}T12:00:00`);

      date.setHours(0, 0, 0, 0);






      let title: string;





      if (date.getTime() === today.getTime()) {


        title = 'Oggi';


      }

      else if (date.getTime() === tomorrow.getTime()) {


        title = 'Domani';


      }

      else {



        title =

          formatter.format(date);



        title =

          title.charAt(0)
            .toUpperCase()
          +
          title.slice(1);



      }







      if (!groups.has(title)) {


        groups.set(
          title,
          []
        );


      }






      groups.get(title)!.push(event);



    }






    return Array.from(
      groups.entries()
    )
      .map(([title, events]) => ({

        title,

        events

      }));


  }












  createEvent() {


    this.router.navigate(
      ['/events']
    );


  }



}
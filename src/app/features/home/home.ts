import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { EventService } from '../../core/services/event.services';
import { UserService } from '../../core/services/user';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { map, switchMap } from 'rxjs';

import { Router } from '@angular/router';
import { APP_CONFIG } from '../../core/config/app-config';
import { CurrentUser } from '../../core/services/current-user';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EventCardComponent } from '../../shared/components/event-card/event-card';
interface EventGroup {
  title: string;
  events: any[];
}

@Component({
  selector: 'app-home',
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    EventCardComponent
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {

  private eventService = inject(EventService);

  private userService = inject(UserService);

  private router = inject(Router);

  currentUser = inject(CurrentUser);

  private snackBar = inject(MatSnackBar);

  showPastEvents = false;

  isPastEvent(event: any): boolean {

    const now = new Date();

    const eventDate = new Date(
      `${event.date}T${event.startTime}`
    );

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

  private eventsWithAuthor$ = this.eventService.getEvents().pipe(

    switchMap(async events => {

      const eventsWithUsers = await Promise.all(

        events.map(async event => {

          const user = await this.userService.getUserById(event.authorId);

          return {
            ...event,
            author: user
          };

        })

      );

      return this.sortEvents(eventsWithUsers);

    })

  );

  nextEvent$ = this.eventsWithAuthor$.pipe(
    map(events =>
      events.find(event => !this.isPastEvent(event)) ?? null
    )
  );


  futureEventGroups$ = this.eventsWithAuthor$.pipe(
    map(events => this.groupFutureEvents(events))
  );

  pastEvents$ = this.eventsWithAuthor$.pipe(
    map(events => events.filter(event => this.isPastEvent(event)))
  );

  private sortEvents(events: any[]) {

    const today = new Date();

    return [...events].sort((a, b) => {

      const dateA = new Date(`${a.date}T${a.startTime}`);
      const dateB = new Date(`${b.date}T${b.startTime}`);

      const isPastA = dateA < today;
      const isPastB = dateB < today;

      // Gli eventi passati vanno in fondo
      if (isPastA !== isPastB) {
        return isPastA ? 1 : -1;
      }

      // Eventi di oggi e futuri
      if (!isPastA) {
        return dateA.getTime() - dateB.getTime();
      }

      // Eventi passati (dal più recente al più vecchio)
      return dateB.getTime() - dateA.getTime();

    });

  }

  async deleteEvent(eventId: string) {

    const confirmed = window.confirm(
      'Sei sicuro di voler eliminare questo evento?'
    );


    if (!confirmed) {
      return;
    }


    await this.eventService.delete(eventId);


    this.snackBar.open(
      'Evento eliminato',
      'OK',
      {
        duration: 2000
      }
    );

  }

  togglePastEvents() {

    this.showPastEvents = !this.showPastEvents;

  }

  private groupFutureEvents(events: any[]): EventGroup[] {

    const formatter = new Intl.DateTimeFormat('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });


    const groups = new Map<string, any[]>();


    const today = new Date();
    today.setHours(0, 0, 0, 0);


    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);


    let firstFutureEventRemoved = false;


    for (const event of events) {


      if (this.isPastEvent(event)) {
        continue;
      }


      // Rimuove il primo evento futuro perché già mostrato come "Prossimo evento"
      if (!firstFutureEventRemoved) {

        firstFutureEventRemoved = true;

        continue;

      }


      const date = new Date(event.date);

      date.setHours(0, 0, 0, 0);


      let title: string;


      if (date.getTime() === today.getTime()) {

        title = 'Oggi';


      } else if (date.getTime() === tomorrow.getTime()) {

        title = 'Domani';


      } else {


        title = formatter.format(date);


        title =
          title.charAt(0).toUpperCase() +
          title.slice(1);

      }


      if (!groups.has(title)) {

        groups.set(title, []);

      }


      groups.get(title)!.push(event);


    }


    return Array.from(groups.entries()).map(([title, events]) => ({
      title,
      events
    }));

  }

  createEvent() {

    this.router.navigate(
      ['/events']
    );

  }

  appVersion = APP_CONFIG.version;

}
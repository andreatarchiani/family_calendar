import {
  Component,
  inject,
  ElementRef,
  ViewChild
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { EventService } from '../../core/services/event.services';
import { UserService } from '../../core/services/user';
import { FriendshipService } from '../../core/services/friendship';
import { CurrentUser } from '../../core/services/current-user';
import { FriendColorService } from '../../core/services/friend-color';

import { switchMap, from, catchError, tap } from 'rxjs';

import { Router } from '@angular/router';

import { User } from '../../core/models/user';



@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './calendar.html',
  styleUrl: './calendar.scss'
})
export class Calendar {


  @ViewChild('selectedDaySection')
  selectedDaySection?: ElementRef;



  private eventService = inject(EventService);
  private userService = inject(UserService);
  private friendshipService = inject(FriendshipService);
  private currentUserService = inject(CurrentUser);
  private friendColorService = inject(FriendColorService);
  private router = inject(Router);



  events: any[] = [];

  users: User[] = [];

  selectedUsers: string[] = [];

  friendColors: Record<string, string> = {};

  friendNames: Record<string, string> = {};



  currentDate = new Date();

  days: (Date | null)[] = [];



  weekDays = [
    'Lun',
    'Mar',
    'Mer',
    'Gio',
    'Ven',
    'Sab',
    'Dom'
  ];



  viewMode: 'calendar' | 'agenda' = 'calendar';


  selectedDay: Date | null = null;




  constructor() {


    this.generateCalendar();



    this.currentUserService.user$

      .pipe(

        switchMap(user => {


          if (!user) {

            return from([[]]);

          }



          console.log('[FC DEBUG] Utente autenticato:', user.uid);
          console.log('[FC DEBUG] Avvio caricamento amici');

          return from(
            this.loadFriends(user.uid)
          )
            .pipe(
              tap(friendIds => console.log('[FC DEBUG] Amici caricati:', friendIds)),
              catchError(error => {
                console.error('[FC DEBUG] ERRORE caricamento amici:', error);
                throw error;
              }),

              switchMap(friendIds => {


                const visibleUsers = [
                  user.uid,
                  ...friendIds
                ];


                console.log(
                  'UTENTI VISIBILI',
                  visibleUsers
                );



                console.log('[FC DEBUG] Avvio getVisibleEvents');
                return this.eventService.getVisibleEvents(
                  user.uid,
                  visibleUsers
                ).pipe(
                  tap(events => console.log('[FC DEBUG] Eventi ricevuti da Firestore:', events)),
                  catchError(error => {
                    console.error('[FC DEBUG] ERRORE getVisibleEvents:', error);
                    throw error;
                  })
                );


              }),




              switchMap(async events => {


                console.log(
                  'EVENTI FIREBASE',
                  events
                );



                return Promise.all(

                  events.map(async event => {


                    const author =
                      await this.userService.getUserById(
                        event.authorId
                      );



                    return {

                      ...event,

                      author

                    };


                  })

                );


              })

            );


        })


      )


      .subscribe({
        next: events => {
          console.log('[FC DEBUG] EVENTI FINALI:', events);
          this.events = events;
        },
        error: error => {
          console.error('[FC DEBUG] ERRORE FATALE caricamento calendario:', error);
          this.events = [];
        }
      });


  }








  async loadFriends(uid: string) {



    const friendIds =
      await this.friendshipService.getFriends(uid);



    const friends =
      await Promise.all(

        friendIds.map(id =>
          this.userService.getUserById(id)
        )

      );



    const currentUser =
      await this.userService.getUserById(uid);



    this.users =
      [

        ...(currentUser ? [currentUser] : []),

        ...friends.filter(
          (u): u is User => !!u
        )

      ];




    this.selectedUsers =
      this.users.map(
        u => u.uid
      );




    this.friendColorService

      .getFriendColors(uid)

      .subscribe(data => {


        const prefs: any = data;



        this.friendColors =
          prefs?.friendColors ?? {};



        this.friendNames =
          prefs?.friendNames ?? {};




        this.users =
          this.users.map(user => ({


            ...user,


            name:
              this.friendNames[user.uid]
              ??
              user.name,



            color:
              this.friendColors[user.uid]
              ??
              user.color



          }));


      });



    return friendIds;


  }









  getEventColor(event: any) {


    return (

      this.friendColors[event.authorId]

      ??

      event.author?.color

      ??

      '#ccc'

    );


  }









  setView(
    mode: 'calendar' | 'agenda'
  ) {

    this.viewMode = mode;

  }









  private formatLocalDate(date: Date) {


    return (

      date.getFullYear()
      +
      '-'
      +
      String(
        date.getMonth() + 1
      ).padStart(2, '0')
      +
      '-'
      +
      String(
        date.getDate()
      ).padStart(2, '0')

    );


  }









  generateCalendar() {


    this.days = [];



    const year =
      this.currentDate.getFullYear();


    const month =
      this.currentDate.getMonth();



    const first =
      new Date(year, month, 1);



    const last =
      new Date(year, month + 1, 0);



    let start =
      first.getDay();



    start =
      start === 0
        ?
        6
        :
        start - 1;



    for (let i = 0; i < start; i++) {

      this.days.push(null);

    }




    for (
      let d = 1;
      d <= last.getDate();
      d++
    ) {

      this.days.push(
        new Date(year, month, d)
      );

    }


  }








  previousMonth() {

    this.currentDate =
      new Date(
        this.currentDate.getFullYear(),
        this.currentDate.getMonth() - 1,
        1
      );


    this.selectedDay = null;

    this.generateCalendar();

  }







  nextMonth() {

    this.currentDate =
      new Date(
        this.currentDate.getFullYear(),
        this.currentDate.getMonth() + 1,
        1
      );


    this.selectedDay = null;

    this.generateCalendar();

  }









  selectDay(day: Date) {


    this.selectedDay = day;



    setTimeout(() => {

      this.selectedDaySection
        ?.nativeElement
        .scrollIntoView({
          behavior: 'smooth'
        });


    }, 50);


  }









  getEventsForDay(day: Date | null) {


    if (!day) {

      return [];

    }


    const date =
      this.formatLocalDate(day);



    return this.events.filter(event => {
      const startDate = event.startDate ?? event.date;
      const endDate = event.endDate ?? startDate;

      // Confronto YYYY-MM-DD: include entrambi gli estremi dell'intervallo.
      return !!startDate && !!endDate && date >= startDate && date <= endDate;
    });


  }









  getEventDateLabel(event: any): string {

    const startDate = event.startDate ?? event.date;
    const endDate = event.endDate ?? startDate;

    if (!startDate) return '';

    const format = (value: string) => new Intl.DateTimeFormat('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date(`${value}T12:00:00`));

    return startDate === endDate
      ? format(startDate)
      : `${format(startDate)} – ${format(endDate)}`;

  }


  getAgendaEvents() {

    console.log(
      'EVENTI AGENDA:',
      this.events
    );


    return this.events

      .filter(event => {


        const authorId =
          event.authorId
          ??
          event.author?.uid;


        console.log(
          'CONTROLLO EVENTO',
          event.title,
          authorId,
          this.selectedUsers
        );


        return this.selectedUsers.includes(authorId);


      })

      .sort((a, b) => {


        const dateA = a.startDate ?? a.date;
        const dateB = b.startDate ?? b.date;

        return new Date(`${dateA}T${a.startTime || '00:00'}`).getTime()
          - new Date(`${dateB}T${b.startTime || '00:00'}`).getTime();


      });


  }





  toggleUser(uid: string) {


    if (this.selectedUsers.includes(uid)) {


      this.selectedUsers =
        this.selectedUsers.filter(
          id => id !== uid
        );


    }
    else {


      this.selectedUsers.push(uid);


    }


  }



  openEvent(event: any) {

    const currentUid =
      this.currentUserService.currentUser?.uid;


    if (!currentUid) {
      return;
    }


    // se NON è il proprietario non faccio niente
    if (event.authorId !== currentUid) {
      return;
    }


    // solo il proprietario entra nella modifica
    this.router.navigate(
      ['/events'],
      {
        queryParams: {
          id: event.id
        }
      }
    );

  }








  createEventFromSelectedDay() {


    const date =
      this.selectedDay
        ?
        this.formatLocalDate(
          this.selectedDay
        )
        :
        undefined;



    this.router.navigate(
      ['/events'],
      {
        queryParams: {
          date
        }
      }
    );


  }









  isToday(day: Date | null) {


    if (!day)
      return false;



    const t = new Date();



    return (

      day.getDate() === t.getDate()

      &&

      day.getMonth() === t.getMonth()

      &&

      day.getFullYear() === t.getFullYear()

    );


  }









  get monthName() {

    return this.currentDate.toLocaleString(
      'it-IT',
      {
        month: 'long',
        year: 'numeric'
      }
    );

  }








  get selectedDayTitle() {


    if (!this.selectedDay)
      return '';



    return this.selectedDay.toLocaleDateString(
      'it-IT',
      {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      }
    );


  }


}
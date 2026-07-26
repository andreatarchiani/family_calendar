import { Component, inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { EventService } from '../../core/services/event.services';
import { UserService } from '../../core/services/user';

import { switchMap } from 'rxjs';

import { Router } from '@angular/router';

import { User } from '../../core/models/user';


@Component({
  selector: 'app-calendar',
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './calendar.html',
  styleUrl: './calendar.scss',
})
export class Calendar {


  @ViewChild('selectedDaySection')
  selectedDaySection?: ElementRef;



  private eventService = inject(EventService);

  private userService = inject(UserService);

  private router = inject(Router);



  events: any[] = [];


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



  selectedUsers: string[] = [];

  selectedDay: Date | null = null;



  users: User[] = [

    {
      uid: '5CEMGED99sXU4CHCjorGiesOqcg2',
      name: 'Andrea',
      color: '#2196F3'
    },

    {
      uid: 'lG80W8KxByVMajAfVLb1Ra2Hy3j1',
      name: 'Lorenzo',
      color: '#FF9800'
    },

    {
      uid: 'AdVg0fjAStZRCBgT9sby15Wamvr2',
      name: 'Gianna',
      color: '#4CAF50'
    },

    {
      uid: 'x3MkLARKwRZHvWDFkIgwuT',
      name: 'Elisabetta',
      color: '#FFC107'
    }

  ];





  constructor() {


    this.generateCalendar();



    this.selectedUsers =
      this.users.map(
        user => user.uid
      );




    this.eventService.getEvents()

      .pipe(

        switchMap(async events => {


          return Promise.all(

            events.map(async event => {


              const firebaseUser =
                await this.userService.getUserById(
                  event.authorId
                );



              const user = firebaseUser
                ? {

                  uid: firebaseUser.uid,
                  name: firebaseUser.name,
                  color: firebaseUser.color

                }

                : undefined;



              return {

                ...event,

                author: user

              };


            })

          );


        })

      )

      .subscribe(events => {

        this.events = events;

      });



  }







  setView(
    mode: 'calendar' | 'agenda'
  ) {

    this.viewMode = mode;

  }







  get monthName(): string {


    return this.currentDate.toLocaleString(
      'it-IT',
      {
        month: 'long',
        year: 'numeric'
      }
    );


  }






  private formatLocalDate(date: Date): string {


    const year = date.getFullYear();


    const month =
      String(date.getMonth() + 1)
        .padStart(2, '0');


    const day =
      String(date.getDate())
        .padStart(2, '0');



    return `${year}-${month}-${day}`;

  }







  generateCalendar() {


    this.days = [];



    const year =
      this.currentDate.getFullYear();



    const month =
      this.currentDate.getMonth();




    const firstDay =
      new Date(
        year,
        month,
        1
      );



    const lastDay =
      new Date(
        year,
        month + 1,
        0
      );



    let startDay =
      firstDay.getDay();



    startDay =
      startDay === 0
        ? 6
        : startDay - 1;




    for (let i = 0; i < startDay; i++) {

      this.days.push(null);

    }




    for (
      let day = 1;
      day <= lastDay.getDate();
      day++
    ) {


      this.days.push(

        new Date(
          year,
          month,
          day
        )

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


      this.selectedDaySection?.nativeElement.scrollIntoView({

        behavior: 'smooth',

        block: 'start',

        inline: 'nearest'

      });


    }, 50);


  }







  getEventsForDay(day: Date | null) {

    if (!day) {

      return [];

    }



    const date =
      this.formatLocalDate(day);



    return this.events.filter(event =>

      event.date === date

    );

  }







  getVisibleEventsForDay(day: Date | null) {


    return this.getEventsForDay(day)
      .slice(0, 2);


  }







  getRemainingEventsCount(day: Date | null) {


    const total =
      this.getEventsForDay(day).length;



    return total > 2
      ? total - 2
      : 0;


  }








  getAgendaEvents() {


    const today =
      new Date();



    return this.events

      .filter(event => {


        const eventDate =
          new Date(
            `${event.date}T${event.startTime}`
          );


        return eventDate >= today;


      })

      .filter(event => {


        return this.selectedUsers.includes(
          event.author?.uid
        );


      })

      .sort((a, b) => {


        const dateA =
          new Date(
            `${a.date}T${a.startTime}`
          );


        const dateB =
          new Date(
            `${b.date}T${b.startTime}`
          );



        return dateA.getTime()
          -
          dateB.getTime();


      })

      .slice(0, 20);


  }







  openEvent(eventId: string) {


    this.router.navigate(

      ['/events'],

      {

        queryParams: {

          id: eventId

        }

      }

    );


  }







  createEmptyEvent() {


    this.router.navigate(
      ['/events']
    );


  }







  createEventFromSelectedDay() {


    if (!this.selectedDay) {

      this.createEmptyEvent();

      return;

    }



    const date =
      this.formatLocalDate(
        this.selectedDay
      );




    this.router.navigate(

      ['/events'],

      {

        queryParams: {

          date

        }

      }

    );


  }







  toggleUser(uid: string) {


    if (this.selectedUsers.includes(uid)) {


      this.selectedUsers =
        this.selectedUsers.filter(

          userUid => userUid !== uid

        );


    }
    else {


      this.selectedUsers = [

        ...this.selectedUsers,

        uid

      ];


    }


  }







  isToday(day: Date | null) {


    if (!day) {

      return false;

    }



    const today =
      new Date();




    return (

      day.getDate() === today.getDate()

      &&

      day.getMonth() === today.getMonth()

      &&

      day.getFullYear() === today.getFullYear()

    );


  }







  get selectedDayTitle() {


    if (!this.selectedDay) {

      return '';

    }




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
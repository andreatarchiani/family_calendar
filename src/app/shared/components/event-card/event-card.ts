import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-event-card',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './event-card.html',
  styleUrl: './event-card.scss'
})
export class EventCardComponent {

  @Input({ required: true })
  event!: any;

  @Input()
  currentUserId?: string;

  @Input()
  past = false;

  @Input()
  highlight = false;


  @Output()
  edit = new EventEmitter<string>();

  @Output()
  delete = new EventEmitter<string>();


  formatDate(date: string): string {

    const parsedDate = new Date(date);

    return new Intl.DateTimeFormat(
      'it-IT',
      {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }
    ).format(parsedDate);

  }


  isToday(): boolean {

    const today = new Date();

    today.setHours(0, 0, 0, 0);


    const eventDate = new Date(this.event.date);

    eventDate.setHours(0, 0, 0, 0);


    return today.getTime() === eventDate.getTime();

  }

  getDay(date: string): string {

    return new Date(date)
      .getDate()
      .toString();

  }


  getMonth(date: string): string {

    return new Intl.DateTimeFormat(
      'it-IT',
      {
        month: 'short'
      }
    )
      .format(new Date(date))
      .toUpperCase();

  }

}
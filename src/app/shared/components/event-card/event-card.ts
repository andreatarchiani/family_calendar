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





  getEventColor(): string {

    return this.event.color
      || this.event.author?.color
      || '#ccc';

  }






  formatDate(date: string): string {


    const parsedDate =
      new Date(date);


    return new Intl.DateTimeFormat(
      'it-IT',
      {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }
    )
      .format(parsedDate);


  }






  isToday(): boolean {


    const today =
      new Date();


    today.setHours(
      0, 0, 0, 0
    );



    const startDate = this.event.startDate ?? this.event.date;
    const endDate = this.event.endDate ?? startDate;

    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    return !!startDate && !!endDate && todayString >= startDate && todayString <= endDate;


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
      .format(
        new Date(date)
      )
      .toUpperCase();


  }


  getDateRangeLabel(): string | null {

    const startDate = this.event.startDate ?? this.event.date;
    const endDate = this.event.endDate ?? startDate;

    if (!startDate || !endDate || startDate === endDate) return null;

    const format = (value: string) => new Intl.DateTimeFormat('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date(`${value}T12:00:00`));

    return `${format(startDate)} – ${format(endDate)}`;

  }


  openEvent() {

    if (this.event.authorId !== this.currentUserId) {

      return;

    }


    this.edit.emit(this.event.id);

  }

}
import { Component, inject } from '@angular/core';
import { NewEvent } from './pages/new-event/new-event';
import { Router } from '@angular/router';

@Component({
  selector: 'app-events',
  imports: [
    NewEvent
  ],
  templateUrl: './events.html',
  styleUrl: './events.scss',
})
export class Events {
  private router = inject(Router);
}
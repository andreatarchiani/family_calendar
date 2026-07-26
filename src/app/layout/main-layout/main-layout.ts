import { Component, OnInit, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterOutlet } from '@angular/router';

import { CurrentUser } from '../../core/services/current-user';
import { BottomMenu } from '../bottom-menu/bottom-menu';
import { Header } from '../header/header';

@Component({
  selector: 'app-main-layout',
  imports: [
    AsyncPipe,
    Header,
    RouterOutlet,
    BottomMenu
  ],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss'
})
export class MainLayout implements OnInit {

  currentUser = inject(CurrentUser);

  ngOnInit() {
    this.currentUser.loadUser();
  }

}

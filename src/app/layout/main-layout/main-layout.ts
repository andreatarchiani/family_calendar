import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../header/header';
import { BottomMenu } from '../bottom-menu/bottom-menu';

@Component({
  selector: 'app-main-layout',
  imports: [
    RouterOutlet,
    Header,
    BottomMenu
  ],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss'
})
export class MainLayout {

}
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
@Component({
  selector: 'app-bottom-menu',
  imports: [
    RouterLink,
    RouterLinkActive,
    MatIconModule
  ],
  templateUrl: './bottom-menu.html',
  styleUrl: './bottom-menu.scss'
})
export class BottomMenu {

}
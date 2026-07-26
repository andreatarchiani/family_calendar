import { Component, inject, Input } from '@angular/core';

import { Auth } from '../../core/services/auth';
import { Router } from '@angular/router';
import { APP_CONFIG } from '../../core/config/app-config';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { User as FamilyUser } from '../../core/models/user';

@Component({
  selector: 'app-header',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header {

  @Input()
  user?: FamilyUser | null;

  private auth = inject(Auth);
  private router = inject(Router);

  appVersion = APP_CONFIG.version;

  async logout() {
    await this.auth.logout();
    this.router.navigate(['/login']);
  }

}

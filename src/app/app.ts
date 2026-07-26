import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PwaInstallService } from './core/services/pwa-install.service';
import { MatDialog } from '@angular/material/dialog';
import { InstallDialog } from './shared/components/install-dialog/install-dialog';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private pwaInstall = inject(PwaInstallService);

  private dialog = inject(MatDialog);

  constructor() {

    console.log('App avviata');

    window.addEventListener('beforeinstallprompt', (event: any) => {

      console.log('EVENTO beforeinstallprompt');

      this.pwaInstall.registerPrompt(event);

      if (this.pwaInstall.canShowInstallDialog()) {
        const dialogRef = this.dialog.open(InstallDialog);

        dialogRef.afterClosed().subscribe(async (wantInstall: boolean) => {
          if (wantInstall) {
            await this.pwaInstall.install();
          } else {
            this.pwaInstall.dismissForOneWeek();
          }
        });
      }


    });

  }
}
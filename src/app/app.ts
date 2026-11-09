import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PwaInstallService } from './core/services/pwa-install.service';
import { MatDialog } from '@angular/material/dialog';
import { InstallDialog } from './shared/components/install-dialog/install-dialog';
import { SwUpdate } from '@angular/service-worker';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private pwaInstall = inject(PwaInstallService);

  private dialog = inject(MatDialog);

  private swUpdate = inject(SwUpdate);

  private snackBar = inject(MatSnackBar);

  private updatePromptShown = false;

  constructor() {

    console.log('App avviata');
    this.setupAppUpdates();

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
  private setupAppUpdates(): void {
    if (!this.swUpdate.isEnabled) {
      return;
    }

    this.swUpdate.versionUpdates.subscribe(event => {
      if (event.type !== 'VERSION_READY' || this.updatePromptShown) {
        return;
      }

      this.updatePromptShown = true;
      const snackBarRef = this.snackBar.open(
        'È disponibile una nuova versione di Family Calendar.',
        'AGGIORNA',
        { duration: 0, horizontalPosition: 'center', verticalPosition: 'top' }
      );

      snackBarRef.onAction().subscribe(async () => {
        try {
          await this.swUpdate.activateUpdate();
          window.location.reload();
        } catch (error) {
          console.error('Impossibile attivare il nuovo aggiornamento:', error);
          window.location.reload();
        }
      });
    });

    const checkForUpdates = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      this.swUpdate.checkForUpdate().catch(error => {
        console.warn('Controllo aggiornamenti non riuscito:', error);
      });
    };

    // Primo controllo all'avvio e nuovi controlli quando l'app torna in primo piano.
    checkForUpdates();
    document.addEventListener('visibilitychange', checkForUpdates);
  }

}

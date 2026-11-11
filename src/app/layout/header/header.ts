import { Component, inject, Input } from '@angular/core';

import { Auth } from '../../core/services/auth';
import { Router } from '@angular/router';
import { CurrentUser } from '../../core/services/current-user';
import { PwaInstallService } from '../../core/services/pwa-install.service';

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
  private currentUser = inject(CurrentUser);
  private pwaInstall = inject(PwaInstallService);

  showLogoutConfirmation = false;
  isLoggingOut = false;
  showNameEditor = false;
  editedName = '';
  nameError = '';
  isSavingName = false;
  showInstallHelp = false;
  installHelpTitle = 'Installa Family Calendar';
  installHelpMessage = '';

  async installApp(): Promise<void> {
    if (this.pwaInstall.isAppInstalled()) {
      this.installHelpTitle = 'Family Calendar è già installata';
      this.installHelpMessage = 'Puoi aprire Family Calendar direttamente dall’icona presente nella schermata Home o nell’elenco delle applicazioni.';
      this.showInstallHelp = true;
      return;
    }

    if (this.pwaInstall.canInstallNatively()) {
      try {
        await this.pwaInstall.install();
      } catch (error) {
        console.error('Installazione PWA non riuscita:', error);
        this.showInstallInstructions();
      }
      return;
    }

    this.showInstallInstructions();
  }

  private showInstallInstructions(): void {
    this.installHelpTitle = 'Installa Family Calendar';
    this.installHelpMessage = this.pwaInstall.isIosDevice()
      ? 'Per installare Family Calendar su iPhone o iPad: apri questa pagina con Safari, tocca Condividi e seleziona “Aggiungi alla schermata Home”. Poi conferma con “Aggiungi”.'
      : 'Il browser non ha reso disponibile il pulsante di installazione automatica. Apri il menu del browser e scegli “Installa app” oppure “Aggiungi alla schermata Home”. Se l’opzione non compare, prova con Chrome e verifica di essere collegato a Internet.';
    this.showInstallHelp = true;
  }

  closeInstallHelp(): void {
    this.showInstallHelp = false;
  }

  openNameEditor() {
    this.editedName = this.user?.name || '';
    this.nameError = '';
    this.showNameEditor = true;
  }

  cancelNameEditor() {
    if (this.isSavingName) return;
    this.showNameEditor = false;
    this.nameError = '';
  }

  onNameInput(event: Event) {
    this.editedName = (event.target as HTMLInputElement).value;
    this.nameError = '';
  }

  async saveName() {
    const name = this.editedName.trim().replace(/\\s+/g, ' ');
    if (name.length < 2 || name.length > 40) {
      this.nameError = 'Inserisci un nome da 2 a 40 caratteri.';
      return;
    }
    if (!this.user || this.isSavingName) return;

    this.isSavingName = true;
    this.nameError = '';
    try {
      await this.currentUser.updateName(name);
      this.showNameEditor = false;
    } catch (error) {
      console.error('Errore durante il salvataggio del nome:', error);
      this.nameError = 'Non è stato possibile salvare il nome. Riprova.';
    } finally {
      this.isSavingName = false;
    }
  }

  logout() {
    this.showLogoutConfirmation = true;
  }

  cancelLogout() {
    this.showLogoutConfirmation = false;
  }

  async confirmLogout() {
    if (this.isLoggingOut) {
      return;
    }

    this.isLoggingOut = true;

    try {
      await this.auth.logout();
      this.showLogoutConfirmation = false;
      await this.router.navigate(['/login']);
    } finally {
      this.isLoggingOut = false;
    }
  }
}

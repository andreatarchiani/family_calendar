import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

import { Auth } from '../../../core/services/auth';
import { UserService } from '../../../core/services/user';
import { APP_CONFIG } from '../../../core/config/app-config';

@Component({
  selector: 'app-login',
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit {
  private authService = inject(Auth);
  private userService = inject(UserService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  mode: 'login' | 'register' = 'login';
  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  errorMessage = '';
  successMessage = '';
  isLoading = false;
  awaitingVerification = false;
  pendingEmail = '';

  appVersion = APP_CONFIG.version;

  ngOnInit(): void {
    const verified = this.route.snapshot.queryParamMap.get('verified');
    const pending = this.route.snapshot.queryParamMap.get('verify') === 'pending';
    const savedPendingEmail = sessionStorage.getItem('familyCalendar.pendingVerificationEmail');

    if (pending || savedPendingEmail) {
      this.awaitingVerification = true;
      this.pendingEmail = savedPendingEmail || '';
    }

    if (verified === '1') {
      void this.handleEmailVerificationReturn();
    }
  }

  private async handleEmailVerificationReturn(): Promise<void> {
    this.isLoading = true;
    try {
      const user = this.authService.currentUser;
      if (user) {
        await this.authService.refreshUser(user);
        if (user.emailVerified) {
          await this.userService.createUserIfNotExists(
            user.uid,
            user.displayName || user.email?.split('@')[0] || 'Utente',
            user.email || '',
            user.photoURL || undefined
          );
          sessionStorage.removeItem('familyCalendar.pendingVerificationEmail');
          this.awaitingVerification = false;
          this.navigateAfterLogin();
          return;
        }
      }
      this.awaitingVerification = false;
      sessionStorage.removeItem('familyCalendar.pendingVerificationEmail');
      this.successMessage = 'Email verificata. Per accedere automaticamente, apri il link nello stesso browser in cui hai creato l’account.';
    } catch (error) {
      console.error('Errore durante il completamento della verifica email', error);
      this.errorMessage = 'Email verificata. Accedi per continuare.';
    } finally {
      this.isLoading = false;
    }
  }

  private navigateAfterLogin(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    const destination = returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')
      ? returnUrl
      : '/home';
    void this.router.navigateByUrl(destination);
  }

  setMode(mode: 'login' | 'register'): void {
    this.mode = mode;
    this.errorMessage = '';
    this.successMessage = '';
    this.password = '';
    this.confirmPassword = '';
  }

  async login(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.email.trim() || !this.password) {
      this.errorMessage = 'Inserisci email e password.';
      return;
    }

    this.isLoading = true;
    try {
      const credential = await this.authService.login(this.email.trim(), this.password);
      if (!credential.user.emailVerified) {
        await this.authService.sendVerificationEmail(credential.user);
        this.successMessage = 'La tua email non è ancora verificata. Ti abbiamo inviato un nuovo link: controlla la posta.';
        return;
      }
      await this.userService.createUserIfNotExists(
        credential.user.uid,
        credential.user.displayName || this.email.trim().split('@')[0] || 'Utente',
        credential.user.email || this.email.trim(),
        credential.user.photoURL || undefined
      );
      this.navigateAfterLogin();
    } catch (error: any) {
      console.error('Errore accesso email', error);
      this.errorMessage = this.getAuthErrorMessage(error, 'login');
    } finally {
      this.isLoading = false;
    }
  }

  async register(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';

    const normalizedName = this.name.trim();
    const normalizedEmail = this.email.trim();

    if (!normalizedName || !normalizedEmail || !this.password || !this.confirmPassword) {
      this.errorMessage = 'Compila tutti i campi.';
      return;
    }
    if (normalizedName.length < 2) {
      this.errorMessage = 'Il nome deve contenere almeno 2 caratteri.';
      return;
    }
    if (this.password.length < 6) {
      this.errorMessage = 'La password è troppo semplice. Usa almeno 6 caratteri.';
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Le password non coincidono.';
      return;
    }

    this.isLoading = true;
    try {
      await this.authService.registerWithEmail(normalizedEmail, this.password, normalizedName);
      this.pendingEmail = normalizedEmail;
      this.awaitingVerification = true;
      sessionStorage.setItem('familyCalendar.pendingVerificationEmail', normalizedEmail);
      this.password = '';
      this.confirmPassword = '';
    } catch (error: any) {
      console.error('Errore registrazione', error);
      this.errorMessage = this.getAuthErrorMessage(error, 'register');
    } finally {
      this.isLoading = false;
    }
  }

  async loginGoogle(): Promise<void> {
    this.errorMessage = '';
    this.isLoading = true;
    try {
      const firebaseUser = await this.authService.loginWithGoogle();
      await this.finishSocialLogin(firebaseUser);
    } catch (error: any) {
      console.error('Errore login Google', error);
      this.errorMessage = this.getAuthErrorMessage(error, 'google');
    } finally {
      this.isLoading = false;
    }
  }

  private async finishSocialLogin(firebaseUser: any): Promise<void> {
    if (!firebaseUser.emailVerified) {
      this.errorMessage = 'Non è stato possibile verificare l’indirizzo email del tuo account.';
      await this.authService.logout();
      return;
    }
    await this.userService.createUserIfNotExists(
      firebaseUser.uid,
      firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Utente',
      firebaseUser.email || '',
      firebaseUser.photoURL || undefined
    );
    this.navigateAfterLogin();
  }

  private getAuthErrorMessage(error: any, action: 'login' | 'register' | 'google'): string {
    switch (error?.code) {
      case 'auth/invalid-email':
        return 'L’indirizzo email non è valido.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Email o password non corretti.';
      case 'auth/email-already-in-use':
        return 'Esiste già un account con questa email. Prova ad accedere.';
      case 'auth/weak-password':
        return 'La password è troppo semplice. Usa almeno 6 caratteri.';
      case 'auth/too-many-requests':
        return 'Troppi tentativi. Attendi qualche minuto e riprova.';
      case 'auth/network-request-failed':
        return 'Problema di connessione. Controlla Internet e riprova.';
      case 'auth/operation-not-allowed':
        return 'Questo metodo di accesso non è ancora attivo nelle impostazioni Firebase.';
      case 'auth/popup-closed-by-user':
        return 'Accesso annullato.';
      case 'auth/unauthorized-domain':
        return 'Questo dominio non è autorizzato per l’accesso Firebase.';
      case 'auth/account-exists-with-different-credential':
        return 'Esiste già un account con questa email. Accedi con il metodo già utilizzato.';
      default:
        return action === 'register'
          ? 'Non è stato possibile creare l’account. Riprova.'
          : action === 'google'
              ? 'Errore durante l’accesso con Google. Riprova.'
              : 'Non è stato possibile accedere. Riprova.';
    }
  }
}

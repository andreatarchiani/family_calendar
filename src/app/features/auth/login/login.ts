import { Component, inject, OnDestroy, OnInit } from '@angular/core';
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
export class Login implements OnInit, OnDestroy {
  private authService = inject(Auth);
  private userService = inject(UserService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  mode: 'login' | 'register' = 'login';
  showPasswordReset = false;
  modeTransition = false;
  private modeTransitionTimer: ReturnType<typeof setTimeout> | null = null;
  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  errorMessage = '';
  successMessage = '';
  isLoading = false;
  awaitingVerification = false;
  pendingEmail = '';
  private pendingPassword = '';
  private verificationPollId: ReturnType<typeof setInterval> | null = null;
  private verificationCheckRunning = false;

  appVersion = APP_CONFIG.version;

  ngOnDestroy(): void {
    if (this.modeTransitionTimer !== null) clearTimeout(this.modeTransitionTimer);
    this.stopVerificationPolling();
    this.pendingPassword = '';
  }

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

  async cancelVerification(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    try {
      sessionStorage.removeItem('familyCalendar.pendingVerificationEmail');
      this.stopVerificationPolling();
      this.pendingPassword = '';
      this.awaitingVerification = false;
      this.mode = 'register';
      this.password = '';
      this.confirmPassword = '';
      this.successMessage = 'Hai chiuso la verifica. L’account resta non verificato e il link ricevuto rimane valido.';
    } catch (error) {
      console.error('Errore durante la chiusura della verifica', error);
      this.errorMessage = 'Non è stato possibile chiudere la schermata. Riprova.';
    } finally {
      this.isLoading = false;
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
      this.email = sessionStorage.getItem('familyCalendar.pendingVerificationEmail') || this.email;
      sessionStorage.removeItem('familyCalendar.pendingVerificationEmail');
      this.mode = 'login';
      this.successMessage = 'Email verificata. Ora accedi con la tua email e password.';
    } catch (error) {
      console.error('Errore durante il completamento della verifica email', error);
      this.errorMessage = 'Email verificata. Accedi per continuare.';
    } finally {
      this.isLoading = false;
    }
  }

  private startVerificationPolling(): void {
    this.stopVerificationPolling();
    // Controlla periodicamente lo stato dell'account anche se la verifica viene fatta da un altro dispositivo.
    this.verificationPollId = setInterval(() => {
      void this.checkEmailVerificationFromOtherDevice();
    }, 15000);
  }

  private stopVerificationPolling(): void {
    if (this.verificationPollId !== null) {
      clearInterval(this.verificationPollId);
      this.verificationPollId = null;
    }
  }

  private async checkEmailVerificationFromOtherDevice(): Promise<void> {
    if (this.verificationCheckRunning || !this.pendingEmail || !this.pendingPassword) return;
    this.verificationCheckRunning = true;
    try {
      const credential = await this.authService.login(this.pendingEmail, this.pendingPassword);
      if (!credential.user.emailVerified) {
        await this.authService.logout();
        return;
      }

      await this.userService.createUserIfNotExists(
        credential.user.uid,
        credential.user.displayName || this.pendingEmail.split('@')[0] || 'Utente',
        credential.user.email || this.pendingEmail,
        credential.user.photoURL || undefined
      );
      this.stopVerificationPolling();
      this.pendingPassword = '';
      sessionStorage.removeItem('familyCalendar.pendingVerificationEmail');
      this.awaitingVerification = false;
      this.navigateAfterLogin();
    } catch (error) {
      // Errori temporanei di rete non devono interrompere il controllo automatico.
      console.warn('Controllo verifica email non riuscito, verrà riprovato.', error);
    } finally {
      this.verificationCheckRunning = false;
    }
  }

  private navigateAfterLogin(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    const destination = returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')
      ? returnUrl
      : '/home';
    void this.router.navigateByUrl(destination);
  }

  openPasswordReset(): void {
    this.showPasswordReset = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.password = '';
    this.confirmPassword = '';
  }

  backToLogin(): void {
    this.showPasswordReset = false;
    this.errorMessage = '';
    this.successMessage = '';
  }

  async resetPassword(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';
    const normalizedEmail = this.email.trim();
    if (!normalizedEmail) {
      this.errorMessage = 'Inserisci prima il tuo indirizzo email.';
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizedEmail)) {
      this.errorMessage = 'Inserisci un indirizzo email valido.';
      return;
    }

    this.isLoading = true;
    try {
      await this.authService.sendPasswordReset(normalizedEmail);
      this.successMessage = 'Se l’indirizzo è associato a un account, riceverai a breve un’email con il link per reimpostare la password. Controlla anche la cartella spam.';
    } catch (error: any) {
      console.error('Errore invio reset password', error);
      this.errorMessage = error?.code === 'auth/too-many-requests'
        ? 'Hai effettuato troppe richieste. Attendi qualche minuto e riprova.'
        : error?.code === 'auth/network-request-failed'
          ? 'Problema di connessione. Controlla Internet e riprova.'
          : 'Non è stato possibile inviare l’email. Controlla l’indirizzo e riprova.';
    } finally {
      this.isLoading = false;
    }
  }

  setMode(mode: 'login' | 'register'): void {
    if (this.mode === mode) return;
    this.modeTransition = false;
    if (this.modeTransitionTimer !== null) clearTimeout(this.modeTransitionTimer);
    this.mode = mode;
    this.showPasswordReset = false;
    requestAnimationFrame(() => {
      this.modeTransition = true;
      this.modeTransitionTimer = setTimeout(() => {
        this.modeTransition = false;
        this.modeTransitionTimer = null;
      }, 380);
    });
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
      this.pendingPassword = this.password;
      await this.authService.registerWithEmail(normalizedEmail, this.password, normalizedName);
      this.pendingEmail = normalizedEmail;
      this.awaitingVerification = true;
      sessionStorage.setItem('familyCalendar.pendingVerificationEmail', normalizedEmail);
      this.password = '';
      this.confirmPassword = '';
      this.startVerificationPolling();
    } catch (error: any) {
      this.pendingPassword = '';
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

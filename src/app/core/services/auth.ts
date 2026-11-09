import { Injectable, inject } from '@angular/core';
import {
  Auth as FirebaseAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signOut,
  authState,
  signInWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  applyActionCode,
  reload,
  User
} from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class Auth {
  private auth = inject(FirebaseAuth);
  private googleAuthProvider = new GoogleAuthProvider();

  constructor() {
    this.googleAuthProvider.setCustomParameters({ prompt: 'select_account' });
  }

  async loginWithGoogle() {
    const result = await signInWithPopup(this.auth, this.googleAuthProvider);
    return result.user;
  }


  async login(email: string, password: string) {
    const result = await signInWithEmailAndPassword(this.auth, email, password);
    await reload(result.user);
    return result;
  }

  async registerWithEmail(email: string, password: string, displayName: string) {
    const result = await createUserWithEmailAndPassword(this.auth, email, password);
    await updateProfile(result.user, { displayName });
    await this.sendVerificationEmail(result.user);
    // La creazione Firebase autentica automaticamente: chiudiamo subito la sessione.
    await signOut(this.auth);
    return result.user;
  }

  async sendVerificationEmail(user: User) {
    await sendEmailVerification(user, {
      url: 'https://family-calendar-1e385.web.app/login?verified=1',
      handleCodeInApp: false
    });
  }

  async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(this.auth, email, {
      url: 'https://family-calendar-1e385.web.app/login?passwordReset=1',
      handleCodeInApp: false
    });
  }

  applyEmailVerificationCode(code: string): Promise<void> {
    return applyActionCode(this.auth, code);
  }

  verifyPasswordResetCode(code: string): Promise<string> {
    return verifyPasswordResetCode(this.auth, code);
  }

  completePasswordReset(code: string, newPassword: string): Promise<void> {
    return confirmPasswordReset(this.auth, code, newPassword).then(() => undefined);
  }

  async refreshUser(user: User) {
    await reload(user);
    return user;
  }

  logout() {
    return signOut(this.auth);
  }

  get currentUser() {
    return this.auth.currentUser;
  }

  get authState() {
    return authState(this.auth);
  }
}

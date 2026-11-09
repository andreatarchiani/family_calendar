import { Injectable, inject } from '@angular/core';
import {
  Auth as FirebaseAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  OAuthProvider,
  signOut,
  authState,
  signInWithPopup,
  sendEmailVerification,
  reload,
  User
} from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class Auth {
  private auth = inject(FirebaseAuth);
  private googleAuthProvider = new GoogleAuthProvider();
  private appleAuthProvider = new OAuthProvider('apple.com');

  constructor() {
    this.googleAuthProvider.setCustomParameters({ prompt: 'select_account' });
    this.appleAuthProvider.addScope('email');
    this.appleAuthProvider.addScope('name');
  }

  async loginWithGoogle() {
    const result = await signInWithPopup(this.auth, this.googleAuthProvider);
    return result.user;
  }

  async loginWithApple() {
    const result = await signInWithPopup(this.auth, this.appleAuthProvider);
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
    return result.user;
  }

  async sendVerificationEmail(user: User) {
    await sendEmailVerification(user, {
      url: 'https://family-calendar-1e385.web.app/login?verified=1',
      handleCodeInApp: false
    });
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

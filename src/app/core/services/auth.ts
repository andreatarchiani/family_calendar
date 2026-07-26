import { Injectable, inject } from '@angular/core';
import {
  Auth as FirebaseAuth,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signOut,
  authState,
  signInWithPopup
} from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class Auth {

  private auth = inject(FirebaseAuth);

  private googleAuthProvider = new GoogleAuthProvider();

  constructor() {

    this.googleAuthProvider.setCustomParameters({
      prompt: 'select_account'
    });
  }

  async loginWithGoogle() {

    const result = await signInWithPopup(this.auth, this.googleAuthProvider);

    return result.user;

  }


  login(email: string, password: string) {

    return signInWithEmailAndPassword(
      this.auth,
      email,
      password
    );

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
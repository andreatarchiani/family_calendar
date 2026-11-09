import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { UserService } from './user';
import { User } from '../models/user';
import { Auth } from './auth';

@Injectable({
  providedIn: 'root'
})
export class CurrentUser {
  private userService = inject(UserService);
  private authService = inject(Auth);
  private userSubject = new BehaviorSubject<User | null>(null);
  private loadGeneration = 0;

  user$ = this.userSubject.asObservable();

  constructor() {
    // Carica il profilo quando Firebase completa l'accesso, incluso Google
    // popup e il ripristino automatico di una sessione esistente.
    this.authService.authState.subscribe(firebaseUser => {
      const generation = ++this.loadGeneration;

      if (!firebaseUser) {
        this.userSubject.next(null);
        return;
      }

      void this.userService.createUserIfNotExists(
        firebaseUser.uid,
        firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Utente',
        firebaseUser.email || '',
        firebaseUser.photoURL || undefined
      ).then(user => {
        if (generation === this.loadGeneration) {
          this.userSubject.next(user);
          console.log('Current user:', user);
        }
      }).catch(error => {
        console.error('Impossibile caricare il profilo utente:', error);
        if (generation === this.loadGeneration) {
          this.userSubject.next(null);
        }
      });
    });
  }

  async loadUser() {
    const firebaseUser = this.authService.currentUser;
    if (!firebaseUser) {
      this.userSubject.next(null);
      return;
    }

    const generation = ++this.loadGeneration;
    const user = await this.userService.createUserIfNotExists(
      firebaseUser.uid,
      firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Utente',
      firebaseUser.email || '',
      firebaseUser.photoURL || undefined
    );

    if (generation === this.loadGeneration) {
      this.userSubject.next(user);
    }
  }

  async updateName(name: string) {
    const user = this.userSubject.value;
    if (!user) throw new Error('Utente non autenticato.');

    await this.userService.updateName(user.uid, name);
    this.userSubject.next({ ...user, name });
  }

  get currentUser() {
    return this.userSubject.value;
  }
}

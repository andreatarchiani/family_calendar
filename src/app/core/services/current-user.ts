import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { UserService } from './user';
import { User } from '../models/user';


@Injectable({
  providedIn: 'root'
})
export class CurrentUser {


  private userService = inject(UserService);


  private userSubject =
    new BehaviorSubject<User | null>(null);


  user$ =
    this.userSubject.asObservable();



  async loadUser() {

    const user = await this.userService.getCurrentUser();

    this.userSubject.next(user);
    console.log('Current user:', user);
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
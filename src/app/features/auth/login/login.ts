import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

import { Auth } from '../../../core/services/auth';
import { UserService } from '../../../core/services/user';

import { APP_CONFIG } from '../../../core/config/app-config';

@Component({
  selector: 'app-login',
  imports: [
    FormsModule,
    CommonModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {



  private authService = inject(Auth);

  private userService = inject(UserService);

  private router = inject(Router);



  email = '';

  password = '';

  errorMessage = '';






  login() {


    this.errorMessage = '';



    this.authService

      .login(
        this.email,
        this.password
      )

      .then(() => {


        this.router.navigate([
          '/home'
        ]);


      })

      .catch(() => {


        this.errorMessage =
          'Email o password non corretti';


      });


  }









  async loginGoogle() {


    try {


      // login Google Firebase

      const firebaseUser =
        await this.authService.loginWithGoogle();





      // crea profilo famiglia se è il primo accesso

      await this.userService.createUserIfNotExists(

        firebaseUser.uid,

        firebaseUser.displayName || 'Utente',

        firebaseUser.email || '',

        firebaseUser.photoURL || undefined

      );






      // vai alla home

      this.router.navigate([

        '/home'

      ]);



    }

    catch (error) {


      console.error(
        'Errore login Google',
        error
      );


      this.errorMessage =
        'Errore durante accesso Google';


    }


  }

  appVersion = APP_CONFIG.version;

}
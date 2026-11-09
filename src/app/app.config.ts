import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';

import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { MAT_SNACK_BAR_DEFAULT_OPTIONS } from '@angular/material/snack-bar';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    {
      provide: MAT_SNACK_BAR_DEFAULT_OPTIONS,
      useValue: { duration: 2800, horizontalPosition: 'center', verticalPosition: 'top', panelClass: ['family-notification'] }
    },

    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    }),

    provideFirebaseApp(() =>
      initializeApp({
        projectId: "family-calendar-1e385",
        appId: "1:124934786488:web:d054e2b29b64161270534d",
        storageBucket: "family-calendar-1e385.firebasestorage.app",
        apiKey: "AIzaSyDTRmIGuyB3lUUpP1q9UMKg1B5gA1Ae4Jw",
        authDomain: "family-calendar-1e385.firebaseapp.com",
        messagingSenderId: "124934786488"
      })
    ),

    provideAuth(() => getAuth()),

    provideFirestore(() => getFirestore())
  ]
};
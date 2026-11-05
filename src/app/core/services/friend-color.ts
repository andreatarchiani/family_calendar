import { Injectable, inject } from '@angular/core';

import {
  Firestore,
  doc,
  docData,
  setDoc
} from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class FriendColorService {

  private firestore = inject(Firestore);

  /**
   * Preferenze personali dell'utente corrente.
   * Ogni utente ha il proprio documento userPreferences/{userId},
   * quindi colori e nomi personalizzati sono privati.
   */
  getFriendColors(userId: string) {
    const ref = doc(
      this.firestore,
      'userPreferences',
      userId
    );

    return docData(ref);
  }

  async setFriendColor(
    userId: string,
    friendId: string,
    color: string
  ): Promise<void> {
    const ref = doc(
      this.firestore,
      'userPreferences',
      userId
    );

    await setDoc(
      ref,
      {
        friendColors: {
          [friendId]: color
        }
      },
      { merge: true }
    );
  }

  async setFriendName(
    userId: string,
    friendId: string,
    name: string
  ): Promise<void> {
    const ref = doc(
      this.firestore,
      'userPreferences',
      userId
    );

    await setDoc(
      ref,
      {
        friendNames: {
          [friendId]: name
        }
      },
      { merge: true }
    );
  }
}

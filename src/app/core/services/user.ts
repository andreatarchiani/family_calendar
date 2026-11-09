import { inject, Injectable } from '@angular/core';
import {
  Firestore,
  doc,
  getDoc,
  updateDoc,
  writeBatch,
  runTransaction
} from '@angular/fire/firestore';
import { Auth as FirebaseAuth } from '@angular/fire/auth';

import { User as FamilyUser } from '../models/user';

export interface FriendCodeLookup {
  uid: string;
  name: string;
  photoURL?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private firestore = inject(Firestore);
  private auth = inject(FirebaseAuth);
  private userCache = new Map<string, FamilyUser>();

  async getCurrentUser(): Promise<FamilyUser | null> {
    const firebaseUser = this.auth.currentUser;
    if (!firebaseUser) return null;

    return this.createUserIfNotExists(
      firebaseUser.uid,
      firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Utente',
      firebaseUser.email || '',
      firebaseUser.photoURL || undefined
    );
  }

  async getUserById(uid: string): Promise<FamilyUser | null> {
    const cachedUser = this.userCache.get(uid);
    if (cachedUser) return cachedUser;

    const userSnapshot = await getDoc(
      doc(this.firestore, 'users', uid)
    );

    if (!userSnapshot.exists()) return null;

    const user: FamilyUser = {
      uid,
      ...(userSnapshot.data() as Omit<FamilyUser, 'uid'>)
    };

    this.userCache.set(uid, user);
    return user;
  }

  /**
   * Crea il profilo al primo accesso e assegna un codice numerico univoco.
   * La transazione riserva il documento friendCodes/{codice} e aggiorna
   * il profilo nello stesso commit, evitando assegnazioni duplicate.
   */
  async createUserIfNotExists(
    uid: string,
    name: string,
    email: string,
    photoURL?: string
  ): Promise<FamilyUser> {
    const userRef = doc(this.firestore, 'users', uid);

    const user = await runTransaction(this.firestore, async transaction => {
      const userSnapshot = await transaction.get(userRef);
      const existingData = userSnapshot.exists() ? userSnapshot.data() : {};

      const existingCode = existingData['friendCode'];

      if (typeof existingCode === 'string' && /^\d{6}$/.test(existingCode)) {
        const existingCodeRef = doc(this.firestore, 'friendCodes', existingCode);
        const codeSnapshot = await transaction.get(existingCodeRef);

        if (!codeSnapshot.exists()) {
          const profileName = existingData['name'] || name;
          const profilePhoto = existingData['photoURL'] || photoURL || null;

          transaction.set(existingCodeRef, {
            uid,
            name: profileName,
            photoURL: profilePhoto,
            createdAt: Date.now()
          });

          if (userSnapshot.exists()) {
            transaction.update(userRef, { friendCode: existingCode });
          }

          return {
            uid,
            ...(existingData as Omit<FamilyUser, 'uid'>),
            name: profileName,
            friendCode: existingCode
          } as FamilyUser;
        }

        if (codeSnapshot.data()['uid'] === uid) {
          return {
            uid,
            ...(existingData as Omit<FamilyUser, 'uid'>),
            friendCode: existingCode
          } as FamilyUser;
        }
      }

      // In caso di collisione, la transazione prova un altro codice.
      for (let attempt = 0; attempt < 30; attempt++) {
        const friendCode = String(
          Math.floor(100000 + Math.random() * 900000)
        );
        const codeRef = doc(this.firestore, 'friendCodes', friendCode);
        const codeSnapshot = await transaction.get(codeRef);

        if (codeSnapshot.exists()) continue;

        const profileName = existingData['name'] || name;
        const profileEmail = existingData['email'] || email;
        const profileColor = existingData['color'] || this.generateColor();
        const profilePhoto = existingData['photoURL'] || photoURL;

        const newUser: FamilyUser = {
          uid,
          name: profileName,
          email: profileEmail,
          color: profileColor,
          ...(Array.isArray(existingData['friends']) ? { friends: existingData['friends'] } : {}),
          friendCode,
          ...(profilePhoto ? { photoURL: profilePhoto } : {})
        };

        transaction.set(userRef, newUser, { merge: true });
        transaction.set(codeRef, {
          uid,
          name: profileName,
          photoURL: profilePhoto || null,
          createdAt: Date.now()
        });

        return newUser;
      }

      throw new Error('Impossibile generare un codice amico disponibile. Riprova.');
    });

    this.userCache.set(uid, user);
    return user;
  }

  async findUserByFriendCode(code: string): Promise<FriendCodeLookup | null> {
    const normalizedCode = code.trim();

    if (!/^\d{6}$/.test(normalizedCode)) {
      return null;
    }

    const snapshot = await getDoc(
      doc(this.firestore, 'friendCodes', normalizedCode)
    );

    if (!snapshot.exists()) return null;

    const data = snapshot.data();

    return {
      uid: data['uid'],
      name: data['name'] || 'Utente Family Calendar',
      ...(data['photoURL'] ? { photoURL: data['photoURL'] } : {})
    };
  }

  async updateName(uid: string, name: string): Promise<void> {
    const userRef = doc(this.firestore, 'users', uid);
    const cachedUser = this.userCache.get(uid);
    const friendCode = cachedUser?.friendCode;
    const batch = writeBatch(this.firestore);

    batch.update(userRef, { name });
    if (typeof friendCode === 'string' && /^\\d{6}$/.test(friendCode)) {
      batch.update(doc(this.firestore, 'friendCodes', friendCode), { name });
    }
    await batch.commit();

    if (cachedUser) {
      cachedUser.name = name;
      this.userCache.set(uid, cachedUser);
    }
  }

  async updateColor(uid: string, color: string): Promise<void> {
    await updateDoc(
      doc(this.firestore, 'users', uid),
      { color }
    );

    const cachedUser = this.userCache.get(uid);
    if (cachedUser) {
      cachedUser.color = color;
      this.userCache.set(uid, cachedUser);
    }
  }

  private generateColor(): string {
    const colors = [
      '#2196F3',
      '#4CAF50',
      '#FF9800',
      '#E91E63',
      '#9C27B0',
      '#009688'
    ];

    return colors[Math.floor(Math.random() * colors.length)];
  }
}

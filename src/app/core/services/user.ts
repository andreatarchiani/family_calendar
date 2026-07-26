import { inject, Injectable, EnvironmentInjector, runInInjectionContext } from '@angular/core';

import {
  Firestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs
} from '@angular/fire/firestore';

import { Auth as FirebaseAuth } from '@angular/fire/auth';

import { User as FamilyUser } from '../models/user';



@Injectable({
  providedIn: 'root'
})
export class UserService {


  private injector = inject(EnvironmentInjector);

  private firestore = inject(Firestore);

  private auth = inject(FirebaseAuth);



  private userCache = new Map<string, FamilyUser>();





  async getCurrentUser(): Promise<FamilyUser | null> {


    const firebaseUser = this.auth.currentUser;


    if (!firebaseUser) {

      return null;

    }


    return this.getUserById(
      firebaseUser.uid
    );

  }







  async getUserById(uid: string): Promise<FamilyUser | null> {


    // controllo cache

    const cachedUser = this.userCache.get(uid);


    if (cachedUser) {

      return cachedUser;

    }





    const userDoc = await runInInjectionContext(

      this.injector,

      () => getDoc(

        doc(
          this.firestore,
          'users',
          uid
        )

      )

    );





    if (!userDoc.exists()) {

      return null;

    }





    const user: FamilyUser = {

      uid,

      ...(userDoc.data() as Omit<FamilyUser, 'uid'>)

    };





    this.userCache.set(
      uid,
      user
    );

    return user;
  }


  async createUserIfNotExists(

    uid: string,

    name: string,

    email: string,

    photoURL?: string

  ): Promise<FamilyUser> {

    const userRef = doc(

      this.firestore,

      'users',

      uid

    );


    const snapshot = await runInInjectionContext(
      this.injector,
      () => getDoc(userRef)
    );


    // Utente già presente
    if (snapshot.exists()) {


      const data = snapshot.data();


      const existingUser: FamilyUser = {

        uid,

        name: data['name'],

        email: data['email'],

        color: data['color'],

        photoURL: data['photoURL'],

        friends: data['friends'] ?? []

      };


      this.userCache.set(
        uid,
        existingUser
      );


      return existingUser;

    }







    // Primo accesso Google

    const newUser: FamilyUser = {


      uid,


      name,


      email,


      photoURL,


      color: this.generateColor(),

      friends: []

    };





    await runInInjectionContext(
      this.injector,
      () => setDoc(userRef, newUser)
    );





    this.userCache.set(

      uid,

      newUser

    );






    return newUser;


  }









  async updateColor(

    uid: string,

    color: string

  ) {



    await updateDoc(

      doc(

        this.firestore,

        'users',

        uid

      ),

      {

        color

      }

    );





    // aggiorna anche la cache

    const cachedUser = this.userCache.get(uid);



    if (cachedUser) {


      cachedUser.color = color;



      this.userCache.set(

        uid,

        cachedUser

      );


    }


  }









  private generateColor(): string {


    const colors = [

      '#2196F3', // blu

      '#4CAF50', // verde

      '#FF9800', // arancio

      '#E91E63', // rosa

      '#9C27B0', // viola

      '#009688'  // verde acqua

    ];



    return colors[

      Math.floor(

        Math.random() * colors.length

      )

    ];


  }




  async searchUsers(term: string): Promise<FamilyUser[]> {
    const q = query(
      collection(this.firestore, 'users'),
      where('name', '>=', term),
      where('name', '<=', term + '\uf8ff')
    );

    const snapshot = await runInInjectionContext(
      this.injector,
      () => getDocs(q)
    );

    return snapshot.docs.map(docSnap => ({
      uid: docSnap.id,
      ...(docSnap.data() as Omit<FamilyUser, 'uid'>)
    }));

  }
}
import { inject, Injectable } from '@angular/core';

import {
  Firestore,
  collection,
  CollectionReference,
  collectionData,
  addDoc,
  serverTimestamp,
  doc,
  docData,
  updateDoc,
  deleteDoc
} from '@angular/fire/firestore';

import { Observable } from 'rxjs';

import { Event } from '../models/event.model';

@Injectable({
  providedIn: 'root'
})
export class EventService {

  private firestore = inject(Firestore);

  private eventsCollection: CollectionReference = collection(
    this.firestore,
    'events'
  );


  getEvents(): Observable<Event[]> {

    return collectionData(
      this.eventsCollection,
      {
        idField: 'id'
      }
    ) as Observable<Event[]>;

  }


  getEventById(id: string): Observable<Event | undefined> {

    const eventDoc = doc(
      this.firestore,
      `events/${id}`
    );

    return docData(
      eventDoc,
      {
        idField: 'id'
      }
    ) as Observable<Event | undefined>;

  }


  async create(
    event: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {

    const docRef = await addDoc(
      this.eventsCollection,
      {
        ...event,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    );

    return docRef.id;

  }


  async update(
    id: string,
    event: Partial<Event>
  ): Promise<void> {

    const eventDoc = doc(
      this.firestore,
      `events/${id}`
    );

    await updateDoc(
      eventDoc,
      {
        ...event,
        updatedAt: serverTimestamp()
      }
    );

  }

  async delete(id: string): Promise<void> {

    const eventDoc = doc(
      this.firestore,
      `events/${id}`
    );


    await deleteDoc(eventDoc);

  }

}
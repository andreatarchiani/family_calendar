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
  deleteDoc,
  query,
  where
} from '@angular/fire/firestore';

import { Observable, map } from 'rxjs';

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
      { idField: 'id' }
    ) as Observable<Event[]>;
  }

  /**
   * Restituisce gli eventi che l'utente può vedere:
   * - i propri eventi, sempre;
   * - gli eventi degli amici con visibility 'all';
   * - gli eventi degli amici con visibility 'selected' se il suo UID
   *   è presente in visibleTo.
   *
   * Gli eventi precedenti che non hanno il campo visibility vengono
   * considerati visibili a tutti gli amici, per compatibilità.
   */
  getVisibleEvents(currentUserId: string, friendIds: string[]): Observable<Event[]> {
    const authorIds = [currentUserId, ...friendIds];

    // Firestore consente al massimo 30 valori in una query "in".
    // È ampiamente sufficiente per il calendario familiare.
    const eventsQuery = query(
      this.eventsCollection,
      where('authorId', 'in', authorIds.slice(0, 30))
    );

    return collectionData(
      eventsQuery,
      { idField: 'id' }
    ).pipe(
      map(events =>
        (events as Event[]).filter(event => {
          if (event.authorId === currentUserId) {
            return true;
          }

          const visibility = event.visibility ?? 'all';

          if (visibility === 'all') {
            return true;
          }

          if (visibility === 'none') {
            return false;
          }

          return (event.visibleTo ?? []).includes(currentUserId);
        })
      )
    );
  }

  getEventById(id: string): Observable<Event | undefined> {
    const eventDoc = doc(
      this.firestore,
      `events/${id}`
    );

    return docData(
      eventDoc,
      { idField: 'id' }
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

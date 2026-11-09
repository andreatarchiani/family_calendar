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
  where,
  or,
  and,
  getDocs
} from '@angular/fire/firestore';

import { Observable, combineLatest, defer, from, map, switchMap, catchError } from 'rxjs';
import { Event } from '../models/event.model';

@Injectable({ providedIn: 'root' })
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
   * Prima converte gli eventi legacy dell'utente corrente (senza visibility)
   * in eventi visibility='all'. Poi ascolta query separate: propri eventi,
   * eventi degli amici condivisi con tutti o selezionati per l'utente.
   * In questo modo le query includono già i vincoli richiesti dalle regole.
   */
  getVisibleEvents(currentUserId: string, friendIds: string[]): Observable<Event[]> {
    return defer(() =>
      from(this.migrateLegacyEvents(currentUserId)).pipe(
        switchMap(() => {
          const ownQuery = query(
            this.eventsCollection,
            where('authorId', '==', currentUserId)
          );

          const streams: Observable<Event[]>[] = [
            (collectionData(ownQuery, { idField: 'id' }) as Observable<Event[]>).pipe(
              catchError(error => {
                console.error('[FC DEBUG] ERRORE query eventi personali', error);
                throw error;
              })
            )
          ];

          const uniqueFriendIds = [...new Set(friendIds)]
            .filter(uid => !!uid && uid !== currentUserId)
            .slice(0, 30);

          for (const friendId of uniqueFriendIds) {
            // Una query OR sostituisce i due listener separati (all/selected).
            // Manteniamo authorId uguale al singolo amico per consentire alle
            // Security Rules di verificare in modo preciso l'amicizia.
            const friendEventsQuery = query(
              this.eventsCollection,
              where('authorId', '==', friendId),
              or(
                where('visibility', '==', 'all'),
                and(
                  where('visibility', '==', 'selected'),
                  where(`visibleToMap.${currentUserId}`, '==', true)
                )
              )
            );

            streams.push(
              (collectionData(friendEventsQuery, { idField: 'id' }) as Observable<Event[]>).pipe(
                catchError(error => {
                  console.error('[FC DEBUG] ERRORE query eventi condivisi', friendId, error);
                  throw error;
                })
              )
            );
          }

          return combineLatest(streams).pipe(
            map(groups => {
              const byId = new Map<string, Event>();
              groups.flat().forEach(event => byId.set(event.id, event));
              return Array.from(byId.values());
            })
          );
        })
      )
    );
  }

  private async migrateLegacyEvents(userId: string): Promise<void> {
    // La migrazione viene verificata una volta per utente e browser. Gli eventi
    // creati dalle versioni attuali sono già normalizzati: non serve rileggere
    // tutta la collezione ad ogni apertura della Home.
    const migrationKey = `fc_legacy_migration_v2_${userId}`;
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem(migrationKey) === 'done') {
        return;
      }
    } catch {
      // Se lo storage non è disponibile, eseguiamo comunque il controllo sicuro.
    }

    console.log('[FC DEBUG] Migrazione legacy: lettura eventi personali', userId);
    let ownEvents;
    try {
      ownEvents = await getDocs(query(
        this.eventsCollection,
        where('authorId', '==', userId)
      ));
    } catch (error) {
      console.error('[FC DEBUG] ERRORE lettura eventi per migrazione legacy:', error);
      throw error;
    }

    const eventsToMigrate = ownEvents.docs.filter(snapshot => {
      const data = snapshot.data();
      return !data['visibility']
        || (
          data['visibility'] === 'selected'
          && !data['visibleToMap']
        );
    });

    console.log('[FC DEBUG] Migrazione eventi legacy/indice condivisione:', eventsToMigrate.length);
    try {
      await Promise.all(eventsToMigrate.map(snapshot => {
        const data = snapshot.data();
        const updates: Record<string, any> = {};

        if (!data['visibility']) {
          updates['visibility'] = 'all';
          updates['visibleTo'] = [];
        }

        if (data['visibility'] === 'selected' && !data['visibleToMap']) {
          const visibleTo = Array.isArray(data['visibleTo']) ? data['visibleTo'] : [];
          updates['visibleToMap'] = Object.fromEntries(
            visibleTo
              .filter((uid): uid is string => typeof uid === 'string' && !!uid)
              .map(uid => [uid, true])
          );
        }

        return updateDoc(snapshot.ref, updates);
      }));
    } catch (error) {
      console.error('[FC DEBUG] ERRORE aggiornamento eventi legacy:', error);
      throw error;
    }
    console.log('[FC DEBUG] Migrazione legacy completata');

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(migrationKey, 'done');
      }
    } catch {
      // Lo storage è solo un'ottimizzazione: la migrazione è già completata.
    }
  }

  getEventById(id: string): Observable<Event | undefined> {
    const eventDoc = doc(this.firestore, `events/${id}`);
    return docData(eventDoc, { idField: 'id' }) as Observable<Event | undefined>;
  }

  async create(
    event: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const docRef = await addDoc(this.eventsCollection, {
      ...event,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return docRef.id;
  }

  async update(id: string, event: Partial<Event>): Promise<void> {
    const eventDoc = doc(this.firestore, `events/${id}`);
    await updateDoc(eventDoc, {
      ...event,
      updatedAt: serverTimestamp()
    });
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(this.firestore, `events/${id}`));
  }
}

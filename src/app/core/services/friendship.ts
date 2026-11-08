import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  where,
  arrayUnion
} from '@angular/fire/firestore';

export interface Friendship {
  id?: string;
  requesterId: string;
  addresseeId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: number;
  requesterName?: string;
}

@Injectable({ providedIn: 'root' })
export class FriendshipService {
  private firestore = inject(Firestore);

  async sendRequest(requesterId: string, addresseeId: string, requesterName: string) {
    if (!requesterId || !addresseeId || requesterId === addresseeId) return null;

    const requestRef = doc(
      this.firestore,
      'friendships',
      `${requesterId}__${addresseeId}`
    );
    const reverseRef = doc(
      this.firestore,
      'friendships',
      `${addresseeId}__${requesterId}`
    );

    return runTransaction(this.firestore, async transaction => {
      const [requestSnapshot, reverseSnapshot] = await Promise.all([
        transaction.get(requestRef),
        transaction.get(reverseRef)
      ]);

      if (reverseSnapshot.exists()) {
        const reverseStatus = reverseSnapshot.data()['status'];
        if (reverseStatus === 'pending' || reverseStatus === 'accepted') {
          return null;
        }
      }

      if (requestSnapshot.exists()) {
        const status = requestSnapshot.data()['status'];
        if (status === 'pending' || status === 'accepted') return null;
      }

      transaction.set(requestRef, {
        requesterId,
        addresseeId,
        status: 'pending',
        requesterName,
        createdAt: Date.now()
      });

      return requestRef.id;
    });
  }

  async acceptRequest(requestId: string, currentUserId: string) {
    const requestRef = doc(this.firestore, 'friendships', requestId);

    await runTransaction(this.firestore, async transaction => {
      const snapshot = await transaction.get(requestRef);
      if (!snapshot.exists()) return;

      const data = snapshot.data() as Friendship;
      if (data.addresseeId !== currentUserId || data.status !== 'pending') {
        throw new Error('Richiesta non valida o non più disponibile.');
      }

      const requesterRef = doc(this.firestore, 'users', data.requesterId);

      transaction.update(requestRef, { status: 'accepted' });
      // Il profilo del richiedente viene aggiornato nella stessa transazione.
      // Il riferimento alla richiesta permette alle regole di verificare
      // anche le richieste legacy con ID non deterministici.
      transaction.update(requesterRef, {
        friends: arrayUnion(data.addresseeId),
        lastAcceptedFriendshipId: requestId
      });
    });
  }

  async declineRequest(requestId: string, currentUserId: string) {
    const ref = doc(this.firestore, 'friendships', requestId);
    await runTransaction(this.firestore, async transaction => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists()) return;

      const data = snapshot.data() as Friendship;
      if (data.addresseeId !== currentUserId || data.status !== 'pending') {
        throw new Error('Richiesta non valida o non più disponibile.');
      }

      transaction.update(ref, { status: 'declined' });
    });
  }

  async getIncomingRequests(userId: string): Promise<Friendship[]> {
    const q = query(
      collection(this.firestore, 'friendships'),
      where('addresseeId', '==', userId),
      where('status', '==', 'pending')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(item => ({
      id: item.id,
      ...(item.data() as Friendship)
    }));
  }

  async getFriends(userId: string): Promise<string[]> {
    const friendships = collection(this.firestore, 'friendships');

    console.log('[FC FRIENDS] Avvio query amicizie in uscita', userId);
    let sent;
    try {
      sent = await getDocs(query(
        friendships,
        where('requesterId', '==', userId),
        where('status', '==', 'accepted')
      ));
      console.log('[FC FRIENDS] Query uscita completata', sent.size);
    } catch (error) {
      console.error('[FC FRIENDS] ERRORE query amicizie in uscita', error);
      throw error;
    }

    console.log('[FC FRIENDS] Avvio query amicizie in entrata', userId);
    let received;
    try {
      received = await getDocs(query(
        friendships,
        where('addresseeId', '==', userId),
        where('status', '==', 'accepted')
      ));
      console.log('[FC FRIENDS] Query entrata completata', received.size);
    } catch (error) {
      console.error('[FC FRIENDS] ERRORE query amicizie in entrata', error);
      throw error;
    }

    const ids = new Set<string>();
    sent.docs.forEach(item => ids.add(item.data()['addresseeId']));
    received.docs.forEach(item => ids.add(item.data()['requesterId']));
    return Array.from(ids);
  }

  async getFriendshipStatus(userId: string, otherUserId: string) {
    const [outgoing, incoming] = await Promise.all([
      getDoc(doc(this.firestore, 'friendships', `${userId}__${otherUserId}`)),
      getDoc(doc(this.firestore, 'friendships', `${otherUserId}__${userId}`))
    ]);

    if (outgoing.exists()) return outgoing.data()['status'];
    if (incoming.exists()) return incoming.data()['status'];
    return null;
  }
}

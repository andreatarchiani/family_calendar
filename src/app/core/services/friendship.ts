import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  updateDoc,
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

  async createInvite(senderId: string, senderName: string): Promise<string> {
    if (!senderId) throw new Error('Utente non autenticato.');
    const token = crypto.randomUUID();
    await setDoc(doc(this.firestore, 'friendInvites', token), {
      senderId,
      senderName,
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    return token;
  }

  async acceptInvite(token: string, recipientId: string): Promise<'accepted' | 'already-friends'> {
    if (!token || !recipientId) throw new Error('Invito non valido.');
    const inviteRef = doc(this.firestore, 'friendInvites', token);
    const friendshipId = `invite_${token}`;
    const friendshipRef = doc(this.firestore, 'friendships', friendshipId);

    const result = await runTransaction(this.firestore, async transaction => {
      const inviteSnapshot = await transaction.get(inviteRef);
      if (!inviteSnapshot.exists()) throw new Error('Questo invito non esiste o non è più disponibile.');

      const invite = inviteSnapshot.data();
      if (invite['senderId'] === recipientId) throw new Error('Non puoi accettare un tuo invito.');
      if (invite['status'] === 'accepted') {
        if (invite['recipientId'] === recipientId) return 'already-friends';
        throw new Error('Questo invito è già stato utilizzato.');
      }
      if (invite['status'] !== 'pending' || invite['expiresAt']?.toMillis?.() <= Date.now()) {
        throw new Error('Questo invito è scaduto. Chiedi un nuovo link.');
      }

      const senderRef = doc(this.firestore, 'users', invite['senderId']);
      const recipientRef = doc(this.firestore, 'users', recipientId);
      const [friendshipSnapshot, senderSnapshot, recipientSnapshot] = await Promise.all([
        transaction.get(friendshipRef),
        transaction.get(senderRef),
        transaction.get(recipientRef)
      ]);
      if (!senderSnapshot.exists() || !recipientSnapshot.exists()) {
        throw new Error('Impossibile completare l’invito. Verifica il tuo account e riprova.');
      }
      if (friendshipSnapshot.exists()) return 'already-friends';

      const createdAt = Date.now();
      transaction.update(inviteRef, {
        status: 'accepted',
        recipientId,
        acceptedAt: createdAt
      });
      transaction.set(friendshipRef, {
        requesterId: invite['senderId'],
        addresseeId: recipientId,
        requesterName: invite['senderName'] || 'Utente',
        status: 'accepted',
        createdAt,
        inviteId: token
      });
      return 'accepted';
    });

    if (result === 'accepted' || result === 'already-friends') {
      const inviteSnapshot = await getDoc(inviteRef);
      const invite = inviteSnapshot.data();
      if (invite?.['status'] === 'accepted' && invite['recipientId'] === recipientId) {
        const senderId = invite['senderId'] as string;
        await updateDoc(doc(this.firestore, 'users', senderId), {
          friends: arrayUnion(recipientId),
          lastAcceptedFriendshipId: friendshipId
        });
      }
    }
    return result;
  }

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

  async removeFriend(userId: string, friendId: string): Promise<void> {
    if (!userId || !friendId || userId === friendId) {
      throw new Error('Amicizia non valida.');
    }

    const friendships = collection(this.firestore, 'friendships');
    const [outgoing, incoming] = await Promise.all([
      getDocs(query(
        friendships,
        where('requesterId', '==', userId),
        where('addresseeId', '==', friendId),
        where('status', '==', 'accepted')
      )),
      getDocs(query(
        friendships,
        where('requesterId', '==', friendId),
        where('addresseeId', '==', userId),
        where('status', '==', 'accepted')
      ))
    ]);

    const friendshipRefs = [...outgoing.docs, ...incoming.docs].map(item => item.ref);
    if (!friendshipRefs.length) {
      throw new Error('Amicizia non trovata.');
    }

    const userRef = doc(this.firestore, 'users', userId);
    const friendRef = doc(this.firestore, 'users', friendId);

    await runTransaction(this.firestore, async transaction => {
      const refs = [...friendshipRefs, userRef, friendRef];
      const snapshots = await Promise.all(refs.map(ref => transaction.get(ref)));
      const friendshipSnapshots = snapshots.slice(0, friendshipRefs.length);
      const userSnapshot = snapshots[friendshipRefs.length];
      const friendSnapshot = snapshots[friendshipRefs.length + 1];

      const validFriendships = friendshipSnapshots.filter(snapshot =>
        snapshot.exists()
        && snapshot.data()['status'] === 'accepted'
        && (
          (snapshot.data()['requesterId'] === userId && snapshot.data()['addresseeId'] === friendId)
          || (snapshot.data()['requesterId'] === friendId && snapshot.data()['addresseeId'] === userId)
        )
      );

      if (!validFriendships.length) {
        throw new Error('L’amicizia non è più disponibile.');
      }

      validFriendships.forEach(snapshot => transaction.delete(snapshot.ref));

      if (userSnapshot.exists()) {
        const friends = userSnapshot.data()['friends'];
        if (Array.isArray(friends) && friends.includes(friendId)) {
          transaction.update(userRef, { friends: friends.filter(id => id !== friendId) });
        }
      }

      if (friendSnapshot.exists()) {
        const friends = friendSnapshot.data()['friends'];
        if (Array.isArray(friends) && friends.includes(userId)) {
          transaction.update(friendRef, { friends: friends.filter(id => id !== userId) });
        }
      }
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

    console.log('[FC FRIENDS] Avvio caricamento amicizie', userId);
    let sent;
    let received;
    try {
      [sent, received] = await Promise.all([
        getDocs(query(
          friendships,
          where('requesterId', '==', userId),
          where('status', '==', 'accepted')
        )),
        getDocs(query(
          friendships,
          where('addresseeId', '==', userId),
          where('status', '==', 'accepted')
        ))
      ]);
      console.log('[FC FRIENDS] Amicizie caricate', { outgoing: sent.size, incoming: received.size });
    } catch (error) {
      console.error('[FC FRIENDS] ERRORE caricamento amicizie', error);
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

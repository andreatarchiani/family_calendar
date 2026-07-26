import { Injectable, inject } from '@angular/core';
import {
    Firestore,
    collection,
    addDoc,
    doc,
    getDoc,
    getDocs,
    query,
    updateDoc,
    where
} from '@angular/fire/firestore';
import { arrayUnion } from '@angular/fire/firestore';

export interface Friendship {
    id?: string;
    requesterId: string;
    addresseeId: string;
    status: 'pending' | 'accepted' | 'declined';
    createdAt: number;
}

@Injectable({
    providedIn: 'root'
})
export class FriendshipService {
    private firestore = inject(Firestore);

    async sendRequest(requesterId: string, addresseeId: string) {
        if (requesterId === addresseeId) {
            return null;
        }

        const q = query(
            collection(this.firestore, 'friendships'),
            where('requesterId', '==', requesterId),
            where('addresseeId', '==', addresseeId),
            where('status', '==', 'pending')
        );

        const existing = await getDocs(q);
        if (!existing.empty) {
            return null;
        }

        const ref = await addDoc(collection(this.firestore, 'friendships'), {
            requesterId,
            addresseeId,
            status: 'pending',
            createdAt: Date.now()
        });

        return ref.id;
    }

    async acceptRequest(requestId: string) {
        const ref = doc(this.firestore, 'friendships', requestId);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
            return;
        }

        const data = snap.data() as Friendship;

        await updateDoc(ref, { status: 'accepted' });

        await updateDoc(doc(this.firestore, 'users', data.requesterId), {
            friends: arrayUnion(data.addresseeId)
        });

        await updateDoc(doc(this.firestore, 'users', data.addresseeId), {
            friends: arrayUnion(data.requesterId)
        });
    }

    async declineRequest(requestId: string) {
        const ref = doc(this.firestore, 'friendships', requestId);
        await updateDoc(ref, { status: 'declined' });
    }

    async getIncomingRequests(userId: string): Promise<Friendship[]> {
        const q = query(
            collection(this.firestore, 'friendships'),
            where('addresseeId', '==', userId),
            where('status', '==', 'pending')
        );

        const snap = await getDocs(q);

        return snap.docs.map(docSnap => ({
            id: docSnap.id,
            ...(docSnap.data() as Friendship)
        }));
    }

    async getFriends(userId: string): Promise<string[]> {
        const snap = await getDoc(doc(this.firestore, 'users', userId));
        return (snap.data()?.['friends'] ?? []) as string[];
    }
}
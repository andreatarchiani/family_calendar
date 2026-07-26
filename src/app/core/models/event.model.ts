import { Timestamp } from '@angular/fire/firestore';

export interface Event {

    id: string;

    authorId: string;

    title: string;

    date: string;

    startTime?: string;

    location: string;

    notes: string;

    createdAt?: Timestamp;

    updatedAt?: Timestamp;

}
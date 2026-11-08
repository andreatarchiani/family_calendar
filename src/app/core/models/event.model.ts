import { Timestamp } from '@angular/fire/firestore';

export type EventVisibility = 'all' | 'none' | 'selected';

export interface Event {

    id: string;

    authorId: string;

    title: string;

    /** Data iniziale; date resta per compatibilità con i vecchi eventi. */
    date: string;

    /** Intervallo dell'evento (assente nei documenti Firestore più vecchi). */
    startDate?: string;

    endDate?: string;

    startTime?: string;

    location: string;

    notes: string;

    visibility: EventVisibility;

    visibleTo?: string[]; // usato solo se visibility === 'selected'

    /** Indice Firestore interrogabile per la condivisione selettiva. */
    visibleToMap?: Record<string, boolean>;

    createdAt?: Timestamp;

    updatedAt?: Timestamp;

}
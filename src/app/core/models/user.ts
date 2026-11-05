export interface User {
    uid: string;
    name: string;
    email?: string;
    color: string;
    photoURL?: string;
    friends?: string[];
    friendCode?: string;
    lastAcceptedFriendshipId?: string;
}

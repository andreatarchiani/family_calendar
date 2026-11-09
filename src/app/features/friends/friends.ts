import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { filter, take } from 'rxjs';

import { User } from '../../core/models/user';
import { CurrentUser } from '../../core/services/current-user';
import { Friendship, FriendshipService } from '../../core/services/friendship';
import { UserService, FriendCodeLookup } from '../../core/services/user';
import { FriendColorService } from '../../core/services/friend-color';

@Component({
  selector: 'app-friends',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './friends.html',
  styleUrl: './friends.scss'
})
export class Friends implements OnInit {
  private route = inject(ActivatedRoute);
  private currentUserService = inject(CurrentUser);
  private userService = inject(UserService);
  private friendshipService = inject(FriendshipService);
  private friendColorService = inject(FriendColorService);
  private snackBar = inject(MatSnackBar);

  currentUser: User | null = null;
  searchTerm = '';
  searchResult: FriendCodeLookup | null = null;
  incomingRequests: (Friendship & { requesterName?: string })[] = [];
  friends: User[] = [];
  loading = false;
  friendColors: Record<string, string> = {};
  friendNames: Record<string, string> = {};
  private pendingInviteCode = '';

  ngOnInit() {
    this.route.queryParamMap.subscribe(params => {
      const code = params.get('code') ?? '';
      if (/^\d{6}$/.test(code)) {
        this.pendingInviteCode = code;
        this.searchTerm = code;
      }
    });

    this.currentUserService.user$
      .pipe(filter((user): user is User => user !== null), take(1))
      .subscribe(user => {
        this.currentUser = user;
        this.loadFriendColors();
        void this.loadData();
        if (this.pendingInviteCode) {
          this.searchTerm = this.pendingInviteCode;
          void this.searchUsers();
        }
      });
  }

  get friendCode(): string {
    return this.currentUser?.friendCode ?? '';
  }

  async inviteFriend() {
    if (!this.friendCode) return;

    const inviteUrl = new URL('/friends', window.location.origin);
    inviteUrl.searchParams.set('code', this.friendCode);
    const inviteText = `Ti invito su Family Calendar! Aggiungimi ai tuoi amici per condividere gli eventi. Apri il link e invia la richiesta: ${inviteUrl.toString()}`;

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'Invito a Family Calendar',
          text: inviteText,
          url: inviteUrl.toString()
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('Errore condivisione invito', error);
        this.snackBar.open('Non è stato possibile aprire la condivisione', 'OK', { duration: 2500 });
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteText);
      this.snackBar.open('Invito copiato: puoi incollarlo dove vuoi', 'OK', { duration: 3000 });
    } catch {
      this.snackBar.open('Condivisione non supportata da questo browser', 'OK', { duration: 2500 });
    }
  }

  async copyFriendCode() {
    if (!this.friendCode) return;
    try {
      await navigator.clipboard.writeText(this.friendCode);
      this.snackBar.open('Codice copiato', 'OK', { duration: 2000 });
    } catch {
      this.snackBar.open('Impossibile copiare il codice', 'OK', { duration: 2500 });
    }
  }

  loadFriendColors() {
    if (!this.currentUser?.uid) return;
    this.friendColorService.getFriendColors(this.currentUser.uid).subscribe(data => {
      this.friendColors = (data as any)?.['friendColors'] ?? {};
      this.friendNames = (data as any)?.['friendNames'] ?? {};
    });
  }

  async changeColor(friendId: string, event: Event) {
    if (!this.currentUser?.uid) return;
    const color = (event.target as HTMLInputElement).value;
    this.friendColors[friendId] = color;
    await this.friendColorService.setFriendColor(this.currentUser.uid, friendId, color);
  }

  async changeFriendName(friendId: string, event: Event) {
    if (!this.currentUser?.uid) return;
    const name = (event.target as HTMLInputElement).value.trim();
    this.friendNames[friendId] = name;
    await this.friendColorService.setFriendName(this.currentUser.uid, friendId, name);
  }

  async searchUsers() {
    if (!this.currentUser?.uid) return;

    const code = this.searchTerm.trim();
    this.searchResult = null;

    if (!/^\d{6}$/.test(code)) {
      this.snackBar.open('Inserisci un codice di 6 cifre', 'OK', { duration: 2500 });
      return;
    }

    this.loading = true;
    try {
      const user = await this.userService.findUserByFriendCode(code);

      if (!user || user.uid === this.currentUser.uid) {
        this.snackBar.open('Nessun utente trovato con questo codice', 'OK', { duration: 2500 });
        return;
      }

      const status = await this.friendshipService.getFriendshipStatus(
        this.currentUser.uid,
        user.uid
      );

      if (status === 'accepted') {
        this.snackBar.open('Siete già amici', 'OK', { duration: 2500 });
        return;
      }

      if (status === 'pending') {
        this.snackBar.open('Richiesta già inviata', 'OK', { duration: 2500 });
        return;
      }

      this.searchResult = user;
    } catch (error) {
      console.error('Errore ricerca codice amico', error);
      this.snackBar.open('Errore durante la ricerca. Riprova.', 'OK', { duration: 2500 });
    } finally {
      this.loading = false;
    }
  }

  async loadData() {
    if (!this.currentUser?.uid) return;

    const [requests, friendIds] = await Promise.all([
      this.friendshipService.getIncomingRequests(this.currentUser.uid),
      this.friendshipService.getFriends(this.currentUser.uid)
    ]);

    this.incomingRequests = await Promise.all(requests.map(async request => {
      return { ...request, requesterName: request.requesterName || 'Utente' };
    }));

    const resolvedFriends = await Promise.all(
      friendIds.map(uid => this.userService.getUserById(uid))
    );

    this.friends = resolvedFriends.filter((user): user is User => !!user);
  }

  async sendRequest(targetUid: string) {
    if (!this.currentUser?.uid) return;

    try {
      const requestId = await this.friendshipService.sendRequest(
        this.currentUser.uid,
        targetUid,
        this.currentUser.name
      );

      if (!requestId) {
        this.snackBar.open('Esiste già una richiesta o siete già amici', 'OK', { duration: 2500 });
        return;
      }

      this.snackBar.open('Richiesta inviata', 'OK', { duration: 2000 });
      this.searchTerm = '';
      this.searchResult = null;
    } catch (error) {
      console.error('Errore invio richiesta', error);
      this.snackBar.open('Impossibile inviare la richiesta', 'OK', { duration: 2500 });
    }
  }

  async acceptRequest(requestId: string) {
    if (!this.currentUser?.uid) return;
    try {
      await this.friendshipService.acceptRequest(requestId, this.currentUser.uid);
      await this.loadData();
      this.snackBar.open('Richiesta accettata', 'OK', { duration: 2000 });
    } catch (error) {
      console.error('Errore accettazione richiesta', error);
      this.snackBar.open('Impossibile accettare la richiesta', 'OK', { duration: 2500 });
    }
  }

  async declineRequest(requestId: string) {
    if (!this.currentUser?.uid) return;
    try {
      await this.friendshipService.declineRequest(requestId, this.currentUser.uid);
      await this.loadData();
      this.snackBar.open('Richiesta rifiutata', 'OK', { duration: 2000 });
    } catch (error) {
      console.error('Errore rifiuto richiesta', error);
      this.snackBar.open('Impossibile rifiutare la richiesta', 'OK', { duration: 2500 });
    }
  }
}

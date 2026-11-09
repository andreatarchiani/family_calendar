import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { filter, firstValueFrom, take } from 'rxjs';
import { ConfirmationDialog } from '../../shared/components/confirmation-dialog/confirmation-dialog';

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
  private dialog = inject(MatDialog);

  currentUser: User | null = null;
  searchTerm = '';
  searchResult: FriendCodeLookup | null = null;
  incomingRequests: (Friendship & { requesterName?: string })[] = [];
  friends: User[] = [];
  loading = false;
  friendColors: Record<string, string> = {};
  friendNames: Record<string, string> = {};
  private pendingInviteCode = '';
  private pendingInviteToken = '';
  showQrCode = false;
  qrCodeUrl = '';

  ngOnInit() {
    this.route.queryParamMap.subscribe(params => {
      const token = params.get('invite') ?? '';
      if (/^[0-9a-f-]{36}$/i.test(token)) this.pendingInviteToken = token;
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
        if (this.pendingInviteToken) {
          void this.acceptSharedInvite(this.pendingInviteToken);
        }
        if (this.pendingInviteCode) {
          this.searchTerm = this.pendingInviteCode;
          void this.searchUsers();
        }
      });
  }

  get friendCode(): string {
    return this.currentUser?.friendCode ?? '';
  }

  async openQrCode() {
    if (!this.currentUser?.uid) return;
    try {
      const token = await this.friendshipService.createInvite(this.currentUser.uid, this.currentUser.name);
      const inviteUrl = new URL('/friends', window.location.origin);
      inviteUrl.searchParams.set('invite', token);
    const encodedUrl = encodeURIComponent(inviteUrl.toString());
    this.qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&format=png&ecc=H&data=${encodedUrl}`;
      this.showQrCode = true;
    } catch (error) {
      console.error('Errore creazione invito QR', error);
      this.snackBar.open('Impossibile creare il QR code. Riprova.', 'OK', { duration: 2500 });
    }
  }

  closeQrCode() {
    this.showQrCode = false;
  }

  async inviteFriend() {
    if (!this.currentUser?.uid) return;
    try {
      const token = await this.friendshipService.createInvite(this.currentUser.uid, this.currentUser.name);
      const inviteUrl = new URL('/friends', window.location.origin);
      inviteUrl.searchParams.set('invite', token);
      const inviteText = 'Ti invito su Family Calendar! Apri il link per diventare automaticamente amici.';

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
      await navigator.clipboard.writeText(`${inviteText} ${inviteUrl.toString()}`);
      this.snackBar.open('Invito copiato: puoi incollarlo dove vuoi', 'OK', { duration: 3000 });
    } catch {
      this.snackBar.open('Condivisione non supportata da questo browser', 'OK', { duration: 2500 });
      }
    } catch (error) {
      console.error('Errore creazione invito', error);
      this.snackBar.open('Impossibile creare l’invito. Riprova.', 'OK', { duration: 2500 });
    }
  }

  private async acceptSharedInvite(token: string) {
    if (!this.currentUser?.uid) return;
    try {
      const result = await this.friendshipService.acceptInvite(token, this.currentUser.uid);
      await this.loadData();
      this.snackBar.open(result === 'accepted' ? 'Invito accettato: ora siete amici!' : 'Siete già amici.', 'OK', { duration: 3500 });
    } catch (error) {
      console.error('Errore accettazione invito condiviso', error);
      this.snackBar.open(error instanceof Error ? error.message : 'Impossibile accettare l’invito.', 'OK', { duration: 3500 });
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

  async removeFriend(friend: User) {
    if (!this.currentUser?.uid) return;

    const displayName = this.friendNames[friend.uid] || friend.name || 'questo amico';
    const confirmed = await firstValueFrom(this.dialog.open(ConfirmationDialog, {
      data: {
        title: 'Eliminare questo amico?',
        message: `Vuoi davvero eliminare ${displayName} dai tuoi amici? Non vedrete più gli eventi condivisi tra i vostri profili.`,
        confirmText: 'Elimina amico',
        cancelText: 'Annulla',
        icon: 'person_remove',
        danger: true
      },
      panelClass: 'family-confirm-panel',
      maxWidth: 'calc(100vw - 32px)',
      autoFocus: false
    }).afterClosed());
    if (!confirmed) return;

    try {
      await this.friendshipService.removeFriend(this.currentUser.uid, friend.uid);
      this.friends = this.friends.filter(item => item.uid !== friend.uid);
      delete this.friendColors[friend.uid];
      delete this.friendNames[friend.uid];
      this.snackBar.open('Amico eliminato', 'OK', { duration: 2000 });
    } catch (error) {
      console.error('Errore eliminazione amico', error);
      this.snackBar.open('Impossibile eliminare l’amico. Riprova.', 'OK', { duration: 2500 });
    }
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

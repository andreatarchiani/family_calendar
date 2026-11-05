
import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { filter, take } from 'rxjs';

import { User } from '../../core/models/user';
import { CurrentUser } from '../../core/services/current-user';
import { FriendshipService } from '../../core/services/friendship';
import { UserService } from '../../core/services/user';
import { FriendColorService } from '../../core/services/friend-color';

@Component({
  selector: 'app-friends',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './friends.html',
  styleUrl: './friends.scss'
})
export class Friends implements OnInit {
  private currentUserService = inject(CurrentUser);
  private userService = inject(UserService);
  private friendshipService = inject(FriendshipService);
  private friendColorService = inject(FriendColorService);
  private snackBar = inject(MatSnackBar);

  currentUser: User | null = null;

  searchTerm = '';
  searchResults: User[] = [];
  incomingRequests: any[] = [];
  friends: User[] = [];

  loading = false;

  friendColors: Record<string, string> = {};
  friendNames: Record<string, string> = {};

  ngOnInit() {
    this.currentUserService.user$
      .pipe(
        filter((user): user is User => user !== null),
        take(1)
      )
      .subscribe(user => {
        this.currentUser = user;
        this.loadFriendColors();
        void this.loadData();
      });
  }

  loadFriendColors() {
    if (!this.currentUser?.uid) return;

    this.friendColorService
      .getFriendColors(this.currentUser.uid)
      .subscribe(data => {
        this.friendColors =
          (data as any)?.['friendColors'] ?? {};

        this.friendNames =
          (data as any)?.['friendNames'] ?? {};
      });
  }

  async changeColor(friendId: string, event: Event) {
    if (!this.currentUser?.uid) return;

    const color = (event.target as HTMLInputElement).value;

    this.friendColors[friendId] = color;

    await this.friendColorService.setFriendColor(
      this.currentUser.uid,
      friendId,
      color
    );
  }

  async changeFriendName(friendId: string, event: Event) {
    if (!this.currentUser?.uid) return;

    const name = (event.target as HTMLInputElement).value.trim();

    this.friendNames[friendId] = name;

    await this.friendColorService.setFriendName(
      this.currentUser.uid,
      friendId,
      name
    );
  }

  async searchUsers() {
    if (!this.searchTerm.trim() || !this.currentUser?.uid) {
      this.searchResults = [];
      return;
    }

    this.loading = true;

    try {
      const users = await this.userService.searchUsers(
        this.searchTerm.trim()
      );

      this.searchResults = users.filter(
        user =>
          user.uid !== this.currentUser?.uid &&
          !this.friends.some(friend => friend.uid === user.uid)
      );
    } finally {
      this.loading = false;
    }
  }

  async loadData() {
    if (!this.currentUser?.uid) return;

    const [requests, friendsIds] = await Promise.all([
      this.friendshipService.getIncomingRequests(this.currentUser.uid),
      this.friendshipService.getFriends(this.currentUser.uid)
    ]);

    console.log('DEBUG UID UTENTE:', this.currentUser.uid);
    console.log('DEBUG ID AMICI FIRESTORE:', friendsIds);
    console.log('DEBUG RICHIESTE:', requests);

    this.incomingRequests = requests;

    const resolvedFriends = await Promise.all(
      friendsIds.map(uid => this.userService.getUserById(uid))
    );

    console.log('DEBUG PROFILI RECUPERATI:', resolvedFriends);

    this.friends = resolvedFriends.filter(
      (user): user is User => !!user
    );
  }

  async sendRequest(targetUid: string) {
    if (!this.currentUser?.uid) return;

    await this.friendshipService.sendRequest(
      this.currentUser.uid,
      targetUid
    );

    this.snackBar.open('Richiesta inviata', 'OK', {
      duration: 2000
    });

    this.searchTerm = '';
    this.searchResults = [];
  }

  async acceptRequest(requestId: string) {
    await this.friendshipService.acceptRequest(requestId);
    await this.loadData();

    this.snackBar.open('Richiesta accettata', 'OK', {
      duration: 2000
    });
  }

  async declineRequest(requestId: string) {
    await this.friendshipService.declineRequest(requestId);
    await this.loadData();

    this.snackBar.open('Richiesta rifiutata', 'OK', {
      duration: 2000
    });
  }
}

import { Component, inject } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-install-dialog',
  standalone: true,
  imports: [MatButtonModule],
  templateUrl: './install-dialog.html',
  styleUrl: './install-dialog.scss',
})
export class InstallDialog {
  dialogRef = inject(MatDialogRef<InstallDialog>);

  install() {
    this.dialogRef.close(true);
  }

  later() {
    this.dialogRef.close(false);
  }
}

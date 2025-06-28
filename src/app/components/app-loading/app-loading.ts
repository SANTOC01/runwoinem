import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-loading.html',
  styleUrls: ['./app-loading.scss']
})
export class Loading {
  @Input() isLoading = false;
  @Input() useOverlay = true; // default: overlay
}

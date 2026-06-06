import { Component, input } from '@angular/core';
import { DocumentStatus, STATUS_CONFIG } from '../../../models/document.model';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `
    <span
      class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide transition-all"
      [class]="cfg().bgColor + ' ' + cfg().borderColor + ' ' + cfg().color"
    >
      @if (pulse()) {
        <span class="relative flex h-1.5 w-1.5">
          <span
            class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
            [class]="cfg().dotColor"
          ></span>
          <span class="relative inline-flex h-1.5 w-1.5 rounded-full" [class]="cfg().dotColor"></span>
        </span>
      } @else {
        <span class="h-1.5 w-1.5 rounded-full" [class]="cfg().dotColor"></span>
      }
      {{ cfg().label }}
    </span>
  `
})
export class StatusBadgeComponent {
  readonly status = input.required<DocumentStatus>();
  readonly pulse  = input(false);

  cfg() {
    return STATUS_CONFIG[this.status()];
  }
}

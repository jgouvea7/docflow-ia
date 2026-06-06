import { Component, input } from '@angular/core';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  template: `
    <div class="w-full">
      @if (showLabel()) {
        <div class="mb-2 flex items-center justify-between text-xs">
          <span class="text-slate-400">{{ label() }}</span>
          <span class="font-mono font-semibold text-brand-400">{{ progress() }}%</span>
        </div>
      }
      <div class="h-1.5 w-full overflow-hidden rounded-full bg-surface-600">
        <div
          class="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-400 transition-all duration-300 ease-out"
          [style.width.%]="progress()"
        ></div>
      </div>
    </div>
  `
})
export class ProgressBarComponent {
  readonly progress  = input(0);
  readonly label     = input('Progresso');
  readonly showLabel = input(true);
}

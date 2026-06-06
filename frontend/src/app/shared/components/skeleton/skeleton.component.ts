import { Component, input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  template: `
    <div
      class="animate-shimmer rounded-xl"
      [style.height]="height()"
      [style.width]="width()"
      [style.border-radius]="radius()"
    ></div>
  `
})
export class SkeletonComponent {
  readonly height = input('1rem');
  readonly width  = input('100%');
  readonly radius = input('0.75rem');
}

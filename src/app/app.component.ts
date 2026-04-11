import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`
})
export class AppComponent implements OnInit {
  title = 'PiFront';

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const root = document.querySelector('app-root');
      if (root) {
        root.removeAttribute('aria-hidden');
        new MutationObserver(() => {
          if (root.hasAttribute('aria-hidden')) {
            root.removeAttribute('aria-hidden');
          }
        }).observe(root, { attributes: true, attributeFilter: ['aria-hidden'] });
      }
    }
  }
}
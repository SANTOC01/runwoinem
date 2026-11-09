import { Directive, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';

/** Adds the `visible` class to the host the first time it scrolls into view. */
@Directive({ selector: '[appReveal]' })
export class RevealOnScroll implements OnInit, OnDestroy {
  private static observer: IntersectionObserver | null = null;
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  private static get shared(): IntersectionObserver | null {
    if (typeof IntersectionObserver === 'undefined') return null;
    return (RevealOnScroll.observer ??= new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('visible');
          RevealOnScroll.observer?.unobserve(entry.target);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' },
    ));
  }

  ngOnInit() {
    const observer = RevealOnScroll.shared;
    if (observer) observer.observe(this.el);
    else this.el.classList.add('visible');
  }

  ngOnDestroy() {
    RevealOnScroll.observer?.unobserve(this.el);
  }
}

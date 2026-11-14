import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Tip } from './tip';

@Component({
  imports: [Tip],
  template: `
    <span id="a" appTip="Erster Hinweis">⭐</span>
    <span id="b" appTip="Zweiter Hinweis">📈</span>
    <p id="outside">Text</p>
  `,
})
class Host {}

describe('Tip', () => {
  let fixture: ComponentFixture<Host>;
  const el = (id: string) => fixture.nativeElement.querySelector(`#${id}`) as HTMLElement;
  const bubbles = () => Array.from(document.querySelectorAll('.tip-bubble'));

  beforeEach(() => {
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('keeps the native title for mouse users and is reachable by keyboard', () => {
    expect(el('a').getAttribute('title')).toBe('Erster Hinweis');
    expect(el('a').getAttribute('tabindex')).toBe('0');
  });

  it('shows the hint on tap and hides it on a second tap', () => {
    el('a').click();
    expect(bubbles().map((b) => b.textContent)).toEqual(['Erster Hinweis']);
    el('a').click();
    expect(bubbles().length).toBe(0);
  });

  it('shows only one hint at a time', () => {
    el('a').click();
    el('b').click();
    expect(bubbles().map((b) => b.textContent)).toEqual(['Zweiter Hinweis']);
  });

  it('hides on a tap elsewhere and when the element goes away', () => {
    el('a').click();
    el('outside').dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(bubbles().length).toBe(0);

    el('b').click();
    fixture.destroy();
    expect(bubbles().length).toBe(0);
  });

  it('keeps the hint inside the screen', () => {
    el('a').click();
    const rect = bubbles()[0].getBoundingClientRect();
    expect(rect.left).toBeGreaterThanOrEqual(0);
    expect(rect.right).toBeLessThanOrEqual(window.innerWidth);
  });
});

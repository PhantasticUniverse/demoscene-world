import { DemoRunner } from '../core/DemoRunner';
import { demoRegistry, getDemosByEra, getDemoById } from '../core/registry';
import type { Demo, Era } from '../core/types';

export class Gallery {
  private runner: DemoRunner;
  private currentEra: Era = 'oldschool';
  private currentDemo: Demo | null = null;

  private eraTabs: NodeListOf<HTMLButtonElement>;
  private demoGrid: HTMLElement;
  private demoTitle: HTMLElement;
  private demoDescription: HTMLElement;
  private demoTags: HTMLElement;
  private btnPause: HTMLButtonElement;
  private btnFullscreen: HTMLButtonElement;

  constructor(canvas: HTMLCanvasElement) {
    this.runner = new DemoRunner(canvas);

    this.eraTabs = document.querySelectorAll('.era-tab');
    this.demoGrid = document.getElementById('demo-grid')!;
    this.demoTitle = document.getElementById('demo-title')!;
    this.demoDescription = document.getElementById('demo-description')!;
    this.demoTags = document.getElementById('demo-tags')!;
    this.btnPause = document.getElementById('btn-pause') as HTMLButtonElement;
    this.btnFullscreen = document.getElementById('btn-fullscreen') as HTMLButtonElement;

    this.setupEventListeners();
    this.renderDemoGrid();
  }

  private setupEventListeners(): void {
    // Era tabs
    this.eraTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const era = tab.dataset.era as Era;
        this.selectEra(era);
      });
    });

    // Pause button
    this.btnPause.addEventListener('click', () => {
      this.runner.togglePause();
      this.updatePauseButton();
    });

    // Fullscreen button
    this.btnFullscreen.addEventListener('click', () => {
      this.toggleFullscreen();
    });

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      this.handleKeyboard(e);
    });
  }

  private handleKeyboard(e: KeyboardEvent): void {
    // Ignore if typing in an input
    if (e.target instanceof HTMLInputElement) return;

    switch (e.key) {
      case ' ':
        e.preventDefault();
        this.runner.togglePause();
        this.updatePauseButton();
        break;
      case 'f':
      case 'F':
        this.toggleFullscreen();
        break;
      case 'r':
      case 'R':
        this.runner.restart();
        break;
      case 'ArrowLeft':
        this.navigateDemo(-1);
        break;
      case 'ArrowRight':
        this.navigateDemo(1);
        break;
      case '1':
        this.selectEra('oldschool');
        break;
      case '2':
        this.selectEra('golden');
        break;
      case '3':
        this.selectEra('modern');
        break;
      case 'Escape':
        if (document.body.classList.contains('fullscreen')) {
          this.toggleFullscreen();
        }
        break;
    }
  }

  private selectEra(era: Era): void {
    this.currentEra = era;

    // Update tab styles
    this.eraTabs.forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.era === era);
    });

    this.renderDemoGrid();
  }

  private renderDemoGrid(): void {
    const demos = getDemosByEra(this.currentEra);

    // Clear grid using safe DOM method
    while (this.demoGrid.firstChild) {
      this.demoGrid.removeChild(this.demoGrid.firstChild);
    }

    demos.forEach((demo) => {
      const card = document.createElement('button');
      card.className = 'demo-card';
      card.textContent = demo.metadata.name;
      card.dataset.demoId = demo.metadata.id;

      if (this.currentDemo?.metadata.id === demo.metadata.id) {
        card.classList.add('active');
      }

      card.addEventListener('click', () => {
        this.selectDemo(demo);
      });

      this.demoGrid.appendChild(card);
    });

    // Auto-select first demo if none selected in this era
    if (demos.length > 0 && !demos.find((d) => d === this.currentDemo)) {
      this.selectDemo(demos[0]);
    }
  }

  private selectDemo(demo: Demo): void {
    this.currentDemo = demo;

    // Update card styles
    this.demoGrid.querySelectorAll('.demo-card').forEach((card) => {
      card.classList.toggle(
        'active',
        (card as HTMLElement).dataset.demoId === demo.metadata.id
      );
    });

    // Update info panel
    this.demoTitle.textContent = `${demo.metadata.name}${demo.metadata.year ? ` (${demo.metadata.year})` : ''}`;
    this.demoDescription.textContent = demo.metadata.description;

    // Clear tags using safe DOM method
    while (this.demoTags.firstChild) {
      this.demoTags.removeChild(this.demoTags.firstChild);
    }

    demo.metadata.tags.forEach((tag) => {
      const tagEl = document.createElement('span');
      tagEl.className = 'tag';
      tagEl.textContent = tag;
      this.demoTags.appendChild(tagEl);
    });

    // Run the demo
    this.runner.runDemo(demo);
    this.updatePauseButton();
  }

  private navigateDemo(direction: number): void {
    const demos = getDemosByEra(this.currentEra);
    if (demos.length === 0) return;

    const currentIndex = demos.findIndex((d) => d === this.currentDemo);
    let newIndex = currentIndex + direction;

    if (newIndex < 0) newIndex = demos.length - 1;
    if (newIndex >= demos.length) newIndex = 0;

    this.selectDemo(demos[newIndex]);
  }

  private toggleFullscreen(): void {
    document.body.classList.toggle('fullscreen');
  }

  private updatePauseButton(): void {
    this.btnPause.textContent = this.runner.paused ? '>' : '||';
  }
}

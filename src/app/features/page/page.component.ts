import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-page',
  standalone: true,
  imports: [CommonModule],
  template: ` Just a random page `,
})
export class PageComponent {}

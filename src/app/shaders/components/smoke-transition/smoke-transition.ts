import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TransitionService } from '../../service/transition.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-smoke-transition',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './smoke-transition.html',
  styleUrls: ['./smoke-transition.scss']
})
export class SmokeTransition implements OnInit, OnDestroy {
  visible = false;
  show = false;
  private sub1?: Subscription;
  private sub2?: Subscription;

  constructor(private transitionService: TransitionService) {}

  ngOnInit() {
    this.sub1 = this.transitionService.smokeVisible$.subscribe(v => this.visible = v);
    this.sub2 = this.transitionService.smokeShow$.subscribe(s => this.show = s);
  }
  ngOnDestroy() {
    this.sub1?.unsubscribe();
    this.sub2?.unsubscribe();
  }
}
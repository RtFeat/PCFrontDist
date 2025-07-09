import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SmokeTransition } from './smoke-transition';

describe('SmokeTransition', () => {
  let component: SmokeTransition;
  let fixture: ComponentFixture<SmokeTransition>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SmokeTransition]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SmokeTransition);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

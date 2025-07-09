import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BackgroundCanvas } from './background-canvas';

describe('BackgroundCanvas', () => {
  let component: BackgroundCanvas;
  let fixture: ComponentFixture<BackgroundCanvas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BackgroundCanvas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BackgroundCanvas);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

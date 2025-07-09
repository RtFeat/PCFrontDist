import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Advertisers } from './advertisers';

describe('Advertisers', () => {
  let component: Advertisers;
  let fixture: ComponentFixture<Advertisers>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Advertisers]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Advertisers);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

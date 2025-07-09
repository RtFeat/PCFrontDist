import { TestBed } from '@angular/core/testing';

import { Scene } from './scene';

describe('Scene', () => {
  let service: Scene;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Scene);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

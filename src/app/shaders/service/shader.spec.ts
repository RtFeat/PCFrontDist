import { TestBed } from '@angular/core/testing';

import { Shader } from './shader';

describe('Shader', () => {
  let service: Shader;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Shader);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

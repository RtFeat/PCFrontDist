import { TestBed } from '@angular/core/testing';

import { AdvertisersService } from './advertisers-service';

describe('AdvertisersService', () => {
  let service: AdvertisersService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdvertisersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

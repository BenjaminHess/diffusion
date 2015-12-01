'use strict';

describe('Service: ApiInterface', function () {

  // load the service's module
  beforeEach(module('diffusionApp'));

  // instantiate service
  var ApiInterface;
  beforeEach(inject(function (_ApiInterface_) {
    ApiInterface = _ApiInterface_;
  }));

  it('should do something', function () {
    expect(!!ApiInterface).toBe(true);
  });

});

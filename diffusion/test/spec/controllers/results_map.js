'use strict';

describe('Controller: ResultsMapCtrl', function () {

  // load the controller's module
  beforeEach(module('diffusionApp'));

  var ResultsMapCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    ResultsMapCtrl = $controller('ResultsMapCtrl', {
      $scope: scope
    });
  }));

  it('should attach a list of awesomeThings to the scope', function () {
    expect(scope.awesomeThings.length).toBe(3);
  });
});

'use strict';

// declare app
angular.module('jobrApp', [
    // Angular Core Modules
    'ngRoute',
    'ngAnimate',
    'ngCookies',
    'ngResource',

    // Angular-ui modules
    'ui.utils',

    // Breeze modules
    'breeze.angular',
    'breeze.directives',

    // Custom Modules
    'jobrApp.filters',
    'jobrApp.services',
    'jobrApp.directives',
    'jobrApp.controllers'
]).
config(['$routeProvider', function ($routeProvider) {
    // Configure routing
    $routeProvider.when('/joblistings', { templateUrl: 'partials/results/results.html', controller: 'ResultsCtrl' });
    $routeProvider.when('/jobdetails/:id', { templateUrl: 'partials/jobdetails/jobdetails.html', controller: 'JobDetailsCtrl' });
    $routeProvider.when('/newjoblisting', { templateUrl: 'partials/newjoblisting/newjoblisting.html', controller: 'NewJobCtrl' });
    $routeProvider.otherwise({redirectTo: '/joblistings'});
}]);

'use strict';

/* Directives */

angular.module('jobrApp.directives', [])

    .directive('appVersion', ['version', function (version) {
        return function (scope, elm, attrs) {
            elm.text(version);
        };
    }])

    .directive('jobResult', function () {
        return {
            restrict: 'E',
            scope: {
                details: '='
            },
            templateUrl: 'js/directives/job-result.html'
        }
    });

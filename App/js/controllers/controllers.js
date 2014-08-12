'use strict';

/* Controllers */

angular.module('jobrApp.controllers', [])

    .controller('MainCtrl', ['$scope', '$rootScope', 'datacontext', 'navFilter', function ($scope, $rootScope, datacontext, navFilter) {

        console.log('MainCtrl Loaded');

        $scope.searchTerm = navFilter.currentFilter;
        clearDropdowns();
        getJobListings();

        // Listen if new job added
        $scope.$on("newJobAdded", function (event, args) {
            clearDropdowns();
            getJobListings();
        });

        function clearDropdowns() {
            $scope.jobListings = {};
            $scope.locations = [];
            $scope.positions = [];
            $scope.managers = [];
            $scope.levels = [];
        }

        function getJobListings() {
            datacontext.getJobListings()
            .then(function (data) {
                if (data) {
                    $scope.jobListings = data;
                    getUniqueValues();
                } else {
                    console.log('Error obtaining job listings data');
                }
            })
                .catch(function (error) {
                    console.log('Error obtaining job listings' + error);
                });
        }

        // TODO: Make more elegant 
        function getUniqueLocations() {
            var flags = [];
            for (var i = 0; i < $scope.jobListings.length; i++) {
                if (flags[$scope.jobListings[i].JobLocation]) continue;
                flags[$scope.jobListings[i].JobLocation] = true;
                $scope.locations.push($scope.jobListings[i].JobLocation);
            }
        }

        //Position = Title
        function getUniquePositions() {
            var flags = [];
            for (var i = 0; i < $scope.jobListings.length; i++) {
                if (flags[$scope.jobListings[i].Title]) continue;
                flags[$scope.jobListings[i].Title] = true;
                $scope.positions.push($scope.jobListings[i].Title);
            }
        }
        function getUniqueManagers() {
            var flags = [];
            for (var i = 0; i < $scope.jobListings.length; i++) {
                if (flags[$scope.jobListings[i].Manager]) continue;
                flags[$scope.jobListings[i].Manager] = true;
                $scope.managers.push($scope.jobListings[i].Manager);
            }
        }
        function getUniqueLevels() {
            var flags = [];
            for (var i = 0; i < $scope.jobListings.length; i++) {
                if (flags[$scope.jobListings[i].Level]) continue;
                flags[$scope.jobListings[i].Level] = true;
                $scope.levels.push($scope.jobListings[i].Level);
            }
        }
        function getUniqueValues() {
            getUniqueLocations();
            getUniquePositions();
            getUniqueManagers();
            getUniqueLevels();
        }

        $scope.setNavFilter = function (filterVal) {
            $scope.searchTerm = filterVal;
            navFilter.currentFilter = filterVal;
            console.log('NavFilter.currentFilter Val: ' + navFilter.currentFilter);
        }
        $scope.searchButtonClicked = function (searchText) {
            $scope.setNavFilter(searchText);
        }
    }])

    .controller('ResultsCtrl', ['$scope', '$location', '$window', 'spContext', 'datacontext', 'navFilter', function ($scope, $location, $window, spContext, datacontext, navFilter) {

        $scope.jobListings = {};
        getJobListings();

        function getJobListings() {
            datacontext.getJobListings()
            .then(function (data) {
                if (data) {
                    $scope.jobListings = data;
                } else {
                    console.log('error obtaining job listings data');
                }
            })
                .catch(function (error) {
                    console.log('error obtaining pins' + error);
                });
        }

        $scope.filterJobs = function (job) {
            var searchTerm = navFilter.currentFilter;
            // if there is search text, look for it in the description; else return true
            //If searching new properties, add them here
            return searchTerm ?
                ((-1 != job.Title.toLowerCase().indexOf(searchTerm.toLowerCase()))
                || (-1 != job.JobDescription.toLowerCase().indexOf(searchTerm.toLowerCase()))
                || (-1 != job.JobLocation.toLowerCase().indexOf(searchTerm.toLowerCase()))
                || (-1 != job.SkillsUsed.toLowerCase().indexOf(searchTerm.toLowerCase()))
                || (-1 != job.Level.toLowerCase().indexOf(searchTerm.toLowerCase()))
                || (-1 != job.Manager.toLowerCase().indexOf(searchTerm.toLowerCase()))
                ) : true;
        };

        $scope.goToJob = function (job) {
            $location.path('/jobdetails/' + job.Id);
        };

        $scope.goBack = function () {
            $window.history.back();
        }

    }])

    .controller('JobDetailsCtrl', ['$window', '$location', '$scope', '$routeParams', 'spContext', 'datacontext', function ($window, $location, $scope, $routeParams, spContext, datacontext) {

        var jobId = $routeParams.id;
        
        if (jobId && jobId > 0) {
            getJobListing(jobId);
        }

        function getJobListing(jobId) {
            datacontext.getJobListing(jobId)
            .then(function (data) {
                $scope.job = data;
            });
        }

        $scope.jobDetailUrl = $location.absUrl();
        console.log($location.absUrl());

    }])

    .controller('NewJobCtrl', ['$window', '$location', '$scope', '$routeParams', '$rootScope', 'spContext', 'datacontext', function ($window, $location, $scope, $routeParams, $rootScope, spContext, datacontext) {

        if (!$scope.newJobListing) {
            $scope.newJobListing = datacontext.createJobListing();
        }

        $scope.SaveJobListing = function () {
            console.log('Title Value: ' + $scope.newJobListing.Title);
            datacontext.saveChanges()
            .then(function () {
                console.log('Changes saved');
                $rootScope.$broadcast("newJobAdded", ""); //Event broadcasted in root scope for listener
                $window.history.back();
            });
        };

    }]);

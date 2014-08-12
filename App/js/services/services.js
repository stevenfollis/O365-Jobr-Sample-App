'use strict';

/* Services */

angular.module('jobrApp.services', []).
  value('version', '0.1')

.service('navFilter', function () {
    var currentFilter;
    return {
        currentFilter: currentFilter
    };
})

/*spContext Service*/
.service('spContext', ['$window', '$location', '$resource', '$cookieStore', '$timeout', function ($window, $location, $resource, $cookieStore, $timeout) {

    var service = this;
    var spWeb = {
        appWebUrl: '',
        url: '',
        title: '',
        logoUrl: ''
    };
    service.hostWeb = spWeb;

    // init the service
    init();

    // init... akin to class constructor
    function init() {
        console.log('spContext service loaded');

        // otherwise, creae the app context
        createSpAppContext();
        // fire off automatic refresh of security digest
        refreshSecurityValidation();

    }

    // create sharepoint app context by moving params on querystring to an app cookie
    function createSpAppContext() {
        console.log('writing spContext cookie');

        var appWebUrl = decodeURIComponent($.getQueryStringValue("SPAppWebUrl"));
        $cookieStore.put('SPAppWebUrl', appWebUrl);

        var url = decodeURIComponent($.getQueryStringValue("SPHostUrl"));
        $cookieStore.put('SPHostUrl', url);

        var title = decodeURIComponent($.getQueryStringValue("SPHostTitle"));
        $cookieStore.put('SPHostTitle', title);

        var logoUrl = decodeURIComponent($.getQueryStringValue("SPHostLogoUrl"));
        $cookieStore.put('SPHostLogoUrl', logoUrl);

    }

    // init the sharepoint app context by loding the app's cookie contents
    function loadSpAppContext() {
        console.log('loading spContext cookie');
        service.hostWeb.appWebUrl = $cookieStore.get('SPAppWebUrl');
        service.hostWeb.url = $cookieStore.get('SPHostUrl');
        service.hostWeb.title = $cookieStore.get('SPHostTitle');
        service.hostWeb.logoUrl = $cookieStore.get('SPHostLogoUrl');
    }

    // fire off automatic refresh of security digest
    function refreshSecurityValidation() {
        console.log("refreshing security validation" + service.securityValidation);

        var siteContextInfoResource = $resource('_api/contextinfo?$select=FormDigestValue', {}, {
            post: {
                method: 'POST',
                headers: {
                    'Accept': 'application/json;odata=verbose;',
                    'Content-Type': 'application/json;odata=verbose;'
                }
            }
        });

        // request validation
        siteContextInfoResource.post({}, function (data) {
            // obtain security digest timeout & value & store in service
            var validationRefreshTimeout = data.d.GetContextWebInformation.FormDigestTimeoutSeconds - 10;
            service.securityValidation = data.d.GetContextWebInformation.FormDigestValue;
            console.log("refreshed security validation" + service.securityValidation);
            console.log("next refresh of security validation: " + validationRefreshTimeout + " seconds");

            // repeat this in FormDigestTimeoutSeconds-10
            $timeout(function () {
                refreshSecurityValidation();
            }, validationRefreshTimeout * 1000);
        }, function (error) {
            console.log("error response from contextinfo" + error);
        });


    }

}])

/*breezeConfig factory*/
.factory('breezeConfig', ['breeze', 'spContext', function (breeze, spContext) {

    // init service
    init();

    // service public signature
    return {
        dataservice: getDataService()
    };

    // init service
    function init() {

        // configure breeze to use SharePoint OData service
        var dsAdapter = breeze.config.initializeAdapterInstance('dataService', 'SharePointOData', true);

        // when breeze needs the request digest for sharepoint, 
        // this is how it will get it, from our sharepoint context
        dsAdapter.getRequestDigest = function () {
            return spContext.securityValidation;
        };

        console.log("config breeze factory loaded");
    }

    function getDataService() {
        // set the data service endpoint
        // Create Service URL - TechReadyJobBoard = app name
        // TODO:  Enhance way of getting the app web url (without the angular routing) other than splitting the url
        var appWebUrl = decodeURIComponent($.getQueryStringValue("SPAppWebUrl"));
        var serviceUrlArr = appWebUrl.split("Jobr");
        var serviceUrl = serviceUrlArr[0] + 'Jobr';
        console.log('serviceUrl: ' + serviceUrl);
        return new breeze.DataService({

            // point to universal sharepoint rest endpoint for lists
            serviceName: serviceUrl + '/_api/web/lists/',
            // tell data service to NOT get the $metadata from sharepoint
            // we will set it ourselves
            hasServerMetadata: false

        });
    }
}])

/*breezeConfig entities*/
.factory('breezeEntities', [function () {
    var metadataStore = new breeze.MetadataStore();
    console.log('in breezeEntities');
    // init factory
    init();

    return {
        metadataStore: metadataStore
    };

    // init factory
    function init() {
        console.log('init metadataStore breezeEntities' + metadataStore);

        // create entities to map from sharepoint > breeze
        fillMetadataStore();
    }

    // define metadata for entities for breeze that we pull form sharepoint
    function fillMetadataStore() {
        // namespace of the corresponding classes on the server
        var namespace = '';

        // Breeze Labs: breeze.metadata.helper.js
        // https://github.com/IdeaBlade/Breeze/blob/master/Breeze.Client/Scripts/Labs/breeze.metadata-helper.js
        // The helper reduces data entry by applying common conventions
        // and converting common abbreviations (e.g., 'type' -> 'dataType')
        var helper = new breeze.config.MetadataHelper(namespace, breeze.AutoGeneratedKeyType.Identity);

        // addType - make it easy to add the type to the store using the helper
        var addType = function (typeDef) {
            var entityType = helper.addTypeToStore(metadataStore, typeDef);
            addDefaultSelect(entityType);
            return entityType;
        };

        addJobListingType();

        // add 'defaultSelect' custom metadata that selects for all mapped data properties
        // could be used by SharePoint dataservice adapter to exclude unwanted property data
        // in query payload
        function addDefaultSelect(type) {
            var custom = type.custom;
            // bail out if defined by hand already
            if (custom && custom.defaultSelect != null) { return; }

            var select = [];
            type.dataProperties.forEach(function (prop) {
                if (!prop.isUnmapped) { select.push(prop.name); }
            });
            if (select.length) {
                if (!custom) { type.custom = custom = {}; }
                custom.defaultSelect = select.join(',');
            }
            return type;
        }

        function addJobListingType() {
            addType({
                name: 'JobListing',
                defaultResourceName: 'getbytitle(\'JobListings\')/items',
                dataProperties: {
                    Id: { type: breeze.DataType.Int32 },
                    Title: {},
                    JobDescription: {},
                    SkillsUsed: {},
                    JobLocation: {},
                    PostedBy: {},
                    PostedDate: {},
                    ValidUntil: {},
                    Manager: {},
                    Level: {}
                }
            });
        }

    }

}])

/*datacontext factory*/
.factory('datacontext', ['$q', 'breezeConfig', 'breezeEntities', function ($q, breezeConfig, breezeEntities) {
    var metadataStore, jobListingType;
    var manager;

    console.log('in datacontext');
    // init factory
    init();

    // service public signature
    return {

        getJobListings: getJobListings,
        getJobListing: getJobListing,
        createJobListing: createJobListing,
        deleteJobListing: deleteJobListing,

        // shared
        saveChanges: saveChanges,
        revertChanges: revertChanges
    };

    // init service
    function init() {
        // get reference to the breeze metadata store
        metadataStore = breezeEntities.metadataStore;

        // get references to the two types
        jobListingType = metadataStore.getEntityType('JobListing');

        // define instance of the entity manager
        manager = new breeze.EntityManager({
            dataService: breezeConfig.dataservice,
            metadataStore: metadataStore
        });

        console.log("datacontext factory loaded");
    }
    
    function getJobListings() {
        return breeze.EntityQuery
        .from(jobListingType.defaultResourceName)
        .using(manager)
        .execute()
        .then(function (data) {
            return data.results;
        });
    }

    function getJobListing(id) {
        // first try to get the data from the local cache, but if not present, grab from server
        return manager.fetchEntityByKey('JobListing', id, true)
        .then(function (data) {
            console.log('Got JobListing from ' + (data.fromCache ? 'cache' : 'server') + data);
            return data.entity;
        });
    }

    function createJobListing(initialValues) {
        return manager.createEntity(jobListingType, initialValues);
    }

    function deleteJobListing(jobListing) {
        // could possibly have this also delete the children items related to this
        //  but you need to consider what happens with the local cache... if 
        //  sharepoint automatically deletes the children, your biz logic should handle it
        jobListing.entityAspect.setDeleted();
        return saveChanges();
    }

    // saves all changes
    function saveChanges() {
        // save changes
        return manager.saveChanges()
          .then(function (result) {
              if (result.entities.length == 0) {
                  console.log('Nothing saved.');
              } else {
                  console.log('Saved changes.');
              }
          })
          .catch(function (error) {
              $q.reject(error);
              console.log('Error saving changes ' + error);
              console.log('errormsgs: ' + getErrorMessages(error));
          });
    }

    // reverts all changes back to their original state
    function revertChanges() {
        return manager.rejectChanges();
    }

    function getErrorMessages(error) {
        function getValidationMessages(err) {
            try {
                return error.entityErrors.map(function (entityError) {
                    return entityError.errorMessage;
                }).join('; <br/>');
            } catch (e) {

            }
            return 'validation error';
        }
        var msg = error.message;
        if (msg.match(/validation error/i)) {
            return getValidationMessages(error);
        }
        return msg;
    }

}]);

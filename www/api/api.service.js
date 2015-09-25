angular.module('missionhub')
  .constant('config', {baseUrl: 'https://stage.missionhub.com/apis/v3/'})
  .factory('api', function($rootScope, $resource, $q, loginDetails, config, personCache, organizationCache, organizationListCache) {
    // put const here
    var that = this;

    function facebook_token() {
      return loginDetails.token();
    }

    function currentPerson() {
      return personCache.person(that.currentPersonId);
    }

    function currentOrg() {
      return organizationCache.organization(that.currentOrgId);
    }

    function setCurrentOrg(org) {
      var includes = ['admins', 'users', 'surveys', 'labels', 'questions', 'interaction_types'];
      return getOrganizations({id: org.id, include: includes.join(), organization_id: org.id}).then(function(data) {
        var org = data.organization;
        organizationCache.organization(org);
        that.currentOrgId = org.id;
        $rootScope.$broadcast('current-org-updated', org);
      }, function(error) {
        alert('Organization change failed because: ' + error.statusText);
      });
    }

    function mhResource(endpoint, options) {
      if(!loginDetails.token()) {
        var deferred = $q.defer();
        deferred.resolve({endpoint: []});
        return deferred.promise;
      } else {
        if (that.currentOrgId && endpoint !== 'organizations') {
          angular.extend(options, {'organization_id': that.currentOrgId});
        }
        return $resource(config.baseUrl + endpoint +'/:id', {id:'@id', facebook_token: facebook_token()}).get(options).$promise;
      }
    }

    //define methods
    function getMe() {
      var includes = ['all_organization_and_children', 'all_organizational_permissions', 'user', 'organizational_permission' ,'permission', 'organizational_labels', 'label', 'interactions', 'email_addresses', 'phone_numbers', 'addresses'];
      var mePromise = $q.defer();
      getPeople({id:'me', include: includes.join()})
      .then(function(data) {
        var me = data.person;
        that.currentPersonId = me.id;
        personCache.person(me);
        organizationListCache.list(me.all_organization_and_children);
        setCurrentOrg({id: me.user.primary_organization_id}).then(function() {
          mePromise.resolve(me);
        }, function(error) {
          mePromise.reject(error);
        });
      }, function(error) {
        alert('Requesting your data failed due to: ' + error);
          mePromise.reject(error);
      });
      return mePromise;
    }

    function getPeople(options) {
      var promise = mhResource('people', options);
      promise.then(function(data) {
        // save to cache now
        angular.forEach(data.people, function(person) {
          personCache.person(person);
        });
      });
      return promise;
    }

    function getInteractions(options) {
      return mhResource('interactions', options);
    }

    function getOrganizations(options) {
      return mhResource('organizations', options);
    }

    // return interface
    return {
      currentPerson: currentPerson,
      currentOrg: currentOrg,
      setCurrentOrg: setCurrentOrg,
      getMe: getMe,
      people: {
        get: getPeople
      },
      interactions: {
        get: getInteractions
      },
      organizations: {
        get: getOrganizations
      }
    }
  })

  .factory('loginDetails', function () {
    var tokenStorageKey = 'facebook_token';

    function token(value) {
      if(value !== undefined) {
        if(value) {
          localStorage.setItem(tokenStorageKey, value);
        }
        else {
          localStorage.removeItem(tokenStorageKey);
        }
      }
      else {
        return localStorage.getItem(tokenStorageKey);
      }
    }

    return {
      token: token
    };
  });

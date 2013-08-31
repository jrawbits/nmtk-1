/* Cross browser code to get a cookie, which we need to get the CSRF token
 * used for restangular requests...
 */
if (typeof String.prototype.trimLeft !== "function") {
    String.prototype.trimLeft = function() {
        return this.replace(/^\s+/, "");
    };
}
if (typeof String.prototype.trimRight !== "function") {
    String.prototype.trimRight = function() {
        return this.replace(/\s+$/, "");
    };
}
if (typeof Array.prototype.map !== "function") {
    Array.prototype.map = function(callback, thisArg) {
        for (var i=0, n=this.length, a=[]; i<n; i++) {
            if (i in this) a[i] = callback.call(thisArg, this[i]);
        }
        return a;
    };
}
function getCookies() {
    var c = document.cookie, v = 0, cookies = {};
    if (document.cookie.match(/^\s*\$Version=(?:"1"|1);\s*(.*)/)) {
        c = RegExp.$1;
        v = 1;
    }
    if (v === 0) {
        c.split(/[,;]/).map(function(cookie) {
            var parts = cookie.split(/=/, 2),
                name = decodeURIComponent(parts[0].trimLeft()),
                value = parts.length > 1 ? decodeURIComponent(parts[1].trimRight()) : null;
            cookies[name] = value;
        });
    } else {
        c.match(/(?:^|\s+)([!#$%&'*+\-.0-9A-Z^`a-z|~]+)=([!#$%&'*+\-.0-9A-Z^`a-z|~]*|"(?:[\x20-\x7E\x80\xFF]|\\[\x00-\x7F])*")(?=\s*[,;]|$)/g).map(function($0, $1) {
            var name = $0,
                value = $1.charAt(0) === '"'
                          ? $1.substr(1, -1).replace(/\\(.)/g, "$1")
                          : $1;
            cookies[name] = value;
        });
    }
    return cookies;
}
function getCookie(name) {
    return getCookies()[name];
}

$.ajaxSetup({
    headers: {'X-CSRFToken': getCookie('csrftoken') }
  });




/*  
 * Initialize our application
 */
angular.module('nmtk', ['ui.bootstrap', 'restangular', 'ngGrid', 
                        'leaflet-directive']).
        config(['RestangularProvider', '$routeProvider',
	function(RestangularProvider, $routeProvider) {
	  var api_path=CONFIG.api_path;
	  // Otherwise IE8 is broken...
	  if (/\//.test(CONFIG.api_path)) {
		  api_path=CONFIG.api_path.substring(0, CONFIG.api_path.length-1);
	  }
	  RestangularProvider.setBaseUrl(api_path);
	  RestangularProvider.setDefaultHeaders({'X-CSRFToken': getCookie('csrftoken') });
	  RestangularProvider.setDefaultRequestParams({format: 'json',
		                                           limit: 5});
	  // If the trailing slash isn't there, we redirect to the trailing slash url
	  // - but that breaks things since post requests
	  // get cancelled.  Ensure there's always a trailing slash...
	  RestangularProvider.setRequestSuffix('/');
	  RestangularProvider.setResponseExtractor(function(data, operation, what, url, response) {
	        var newResponse;
	        if (operation === "getList") {
	            newResponse = data.objects;
	            newResponse.metadata = data.meta;
	        } else if (operation == 'post') {
	        	var base_url=(location.protocol + '//' + location.hostname)
	        	var response_uri=response.headers().location;
	        	newResponse={'resource_uri': response_uri.replace(base_url,'')};
			} else {
	            newResponse = data;
	        }
	        return newResponse;
	  });
	  $routeProvider.
	  	  when('/results/:jobid/', {controller:ViewResultsCtrl,  
			     					templateUrl:CONFIG.template_path+'results.html'}).
		  when('/job', {controller:JobCtrl,  
			  			templateUrl:CONFIG.template_path+'job.html'}).
	      when('/files', {controller:FilesCtrl,
	    	  			  templateUrl:CONFIG.template_path+'files.html'}).
	      when('/job/:jobid/', {controller:ConfigureCtrl,
	    	  				    templateUrl:CONFIG.template_path+'configure.html'}).
	      when('/', {controller:IntroCtrl, 
	    		     templateUrl:CONFIG.template_path+'intro.html'}).
	      otherwise({redirectTo:'/'});
	}]).filter('page', [function() {
		  return function(input, metadata) {
			  if (metadata) {
			     var total = parseInt(metadata.total_count);
			     var step= parseInt(metadata.limit);
			     for (var i=0; i<total; i+=step)
			       input.push(i);
			  } 
			  return input;
		  }
	}]).directive('stopEvent', [function () {
		// Usage is (in a tag) stop-event='click' (or the event you wish to 
		// stop from propagating)  This prevents events from propagating...
        return {
            restrict: 'A',
            link: function (scope, element, attr) {
                element.bind(attr.stopEvent, function (e) {
                    e.stopPropagation();
                });
            }
        }
	}]);




/* 
 * This "base" controller provides some default scope components for all the
 * other controllers.  It also handles the auto-reloading of things like jobs 
 * in progress and uploads, etc. 
 */
function NMTKCtrl($scope, Restangular, $timeout, $dialog, $location,
				  $rootScope, $log) {	
	// A Function used to update data via a rest call to an API interface,
	// since it seems like we will refresh far more often than we don't, might
	// as well do this.

	$scope.csrftoken=getCookie('csrftoken');
	$scope.pager=CONFIG.template_path+'pager.html';
	$scope.browser_name=BrowserDetect.browser;
	$scope.browser_version=BrowserDetect.version;
	$scope.loaded=false;
	$log.info('Using', $scope.browser_name, $scope.browser_version);
	$scope.refreshItems=[];
	$scope.tabs={};
	$rootScope.rest={};
	$rootScope.restargs={};
	$rootScope.resources={};
	$scope.delete_candidate={};
	$scope.job_config=undefined;
	$scope.results_job=undefined;
	$scope.views={}
	$scope.switchView=function(view) {
		$scope.views[view]=!$scope.views[view];
	}
	
	$scope.toggleDiv=function(div) {
		if (_.indexOf($scope.preferences.divs, div) > -1) {
			$scope.preferences.divs=_.without($scope.preferences.divs, div);
		} else {
			$scope.preferences.divs.push(div);
		}
		
		var copy=Restangular.copy($scope.preferences);
		copy.divs=JSON.stringify($scope.preferences.divs);
		copy.put();
	}
	
	// Check to see if a div is enabled and return a true/false response.
	$scope.isDivEnabled=function(div) {
		// Preferences loaded yet?
		if (typeof $scope.preferences === 'undefined') {
			return true;
		}
		return _.indexOf($scope.preferences.divs, div) > -1;
	}
	
	$rootScope.refreshData=function (api, offset) {
		if (typeof $rootScope.restargs[api] === 'undefined') {
			$rootScope.restargs[api]={};
		}
		if (typeof offset !== 'undefined') {
			$rootScope.restargs[api]['offset']=offset;
		} 
		var rest=$rootScope.resources[api];
		$rootScope.rest[api]=rest.getList($rootScope.restargs[api]);
	};
	
	// When OK is pressed on the modal confirm dialog, delete the
	// requested data
	$scope.cancelDeleteData=function () {
		$scope.delete_candidate={};
	}
	
	$rootScope.deleteData=function (api, id) {
		var rest=$rootScope.resources[api];
		rest.one(id).remove().then(function (r) {
			$log.info('Refreshing data...');
			$rootScope.refreshData(api);
		});
	}
	
	// Set the delete_candidate, which un-hides the modal confirm dialog.	
	$rootScope.removeFile = function(api, id, name, type){
	    var title = 'Confirm delete of ' + type;
	    var msg = 'Are you sure you wish to delete ' + name +'?';
	    var btns = [{result:'cancel', label: 'Cancel'}, 
	                {result:'delete', label: 'Delete', cssClass: 'btn-primary'}];

	    $dialog.messageBox(title, msg, btns)
	      .open()
	      .then(function(result){
	        if (result == 'delete') {
	        	$scope.deleteData(api, id);
	        }
	        
	    });
	  };

	
	$scope.changeTab=function(newtab) {
		$log.info('Got request to change to', newtab);
		$scope.activeTab=newtab;
	}
	$scope.toggleTab=function(tabName){
		$scope.tabs[tabName]=!$scope.tabs[tabName];
	};
	
	// Enable the auto-refresh of API elements using a timer.
	$scope.enableRefresh=function (items) {
		$scope.refreshItems=items
//		_.each(items, function (item) {
//			if (_.indexOf($scope.refreshItems, item) == -1) {
//				$scope.refreshItems.push(item);
//			}
//		});
	}
	// Remove an item from the refresh list - since it probably isn't
	// anywhere where someone can see that item, or there are no fields
	// that require a refresh.
//	$scope.disableRefresh=function (item) {
//		var loc=_.indexOf($scope.refreshItems, item);
//		if (loc > -1) {
//			$scope.refreshItems.splice(loc);
//		}
//	}
	_.each(['datafile','tool','job'], function (item) {
		$rootScope.resources[item]=Restangular.all(item);
		$scope.refreshData(item);
	});
	$rootScope.resources['feedback']=Restangular.all('feedback');
	
	/* Load user preferences for the UI
	 * 
	 */
	$rootScope.resources['preference']=Restangular.all('preference');
	// The app ensures that all users have a preference record by default.
	$rootScope.resources['preference'].getList().then(function (data) {
		if (data.length) {
			/*
			 * The preference field divs has a list of divs that should
			 * be enabled in the UI.
			 */
			$scope.preferences=data[0];
			$scope.preferences.divs=JSON.parse($scope.preferences.divs);
		} 
	});
	
	$scope.updateData= function (model, offset) {
		$log.info('Updatedata arguments', model, offset);
		$scope.refreshData(model, offset);
	}
	$scope.timeout=15000;
	// Refresh the models in the refresh list every 30s.
	$scope.timedRefresh=function () {
		_.each($scope.refreshItems, function (item) { 
			$scope.refreshData(item);
		});
		$timeout($scope.timedRefresh, $scope.timeout);
	}
	$scope.timedRefresh();
//	Restangular.all('tool').getList().then(function (data) { $log.info(data);});
	
	window.uploadDone=function(){
		if ($scope.loaded) {
		  /* have access to $scope here*/
		    $log.info('Upload complete detected!');
		    $timeout(function () {$scope.refreshData('datafile');}, 1000)
		}
		$scope.loaded=true;
		$("#ie_uploadform").trigger('reset');
	}
	
	
	/*
	 * Define the options for the feedback modal dialog and also
	 * define the function to start the controller when someone clicks on
	 * the feedback button.
	 */
	$scope.feedback_options={backdrop: true,
			 				 keyboard: true,
			 				 backdropClick: true,
			 				 templateUrl:  CONFIG.template_path+'feedback.html',
			 				 controller: 'FeedbackCtrl'
	};
	
	$scope.feedback=function () {
		var rest=$rootScope.resources['feedback'];
		$rootScope.rest['feedback']=rest.getList({'uri': $location.path(),
			                                  'limit': 1}).then(function(result) {
			if (result.length) {
				$scope.feedback_options.record=result[0];
			} else {
				$scope.feedback_options.record={};
			}
			var d=$dialog.dialog($scope.feedback_options)			
			d.open().then(function (result) {
				if (result) {
					$log.info('Got a feedback response!', result);
					result.uri=$location.path();
					rest.post(result);
				}
			});
		});
	}
	
	$scope.setConfigureJob=function (working_job_id) {
		$scope.working_job_id=working_job_id;
	}
	
	$scope.configureJob=function (job) {
	    var switchconfig_options = {
				backdrop: true,
				keyboard: true,
				backdropClick: true,
				templateUrl:  'switchjob.html', // OR: templateUrl: 'path/to/view.html',
				controller: 'SwitchJobController'
		};
		$log.info('Got (configureJob)', job);
		if ($scope.working_job_id && $scope.working_job_id != job.job_id) {
			var d=$dialog.dialog(switchconfig_options);
			d.open().then(function (result) {
				if (result) {
					// Reset the job config if/when we change to configure a new job.
					$scope.job_config=undefined;
					$scope.errors=undefined;
					$scope.working_job_id=job.id;
					$location.path('/job/' + $scope.working_job_id + '/');
				}
			});
		} else {
			$scope.working_job_id=job.id;
			$location.path('/job/' + $scope.working_job_id + '/');
		}
	};
	
	$scope.downloadJob=function (job) {
		var options={backdrop: true,
					 keyboard: true,
					 backdropClick: true,
					 templateUrl:  CONFIG.template_path+'downloadjob.html', // OR: templateUrl: 'path/to/view.html',
					 controller: 'DownloadJobController',
					 job: job
		};
		var d=$dialog.dialog(options);
		d.open();
	}
	
}

function DownloadJobController($scope, $log, dialog) {
	$scope.job_id=dialog.options.job.job_id;
	var api_path=CONFIG.api_path;
	$scope.format_types={'Comma Separated Values': 'csv',
						 'GeoJSON': 'geojson',
						 'Microsoft Excel Format (xls)': 'xls'};
	if (/\//.test(CONFIG.api_path)) {
		  api_path=CONFIG.api_path.substring(0, CONFIG.api_path.length-1);
	}
	$scope.download_url=api_path + '/job/' + $scope.job_id + '/download/';
	$scope.close=function () {
		dialog.close();
	}
	$scope.getUrl=function(type) {
		return $scope.download_url + '?output=' + type;
	}
}

function SwitchJobController($scope, dialog) {
	$scope.switchjob=function () { dialog.close(true); };
	$scope.close=function () { dialog.close(false); };
}

function IntroCtrl($scope, $log) {
	$log.info('In IntroCtrl');
	$scope.enableRefresh(['tool']);
	$scope.changeTab('introduction');
}

/*
 * Note: This relies on leaflet being available...
 */
function getBounds(bbox) {
	var southWest = new L.LatLng(bbox[2], bbox[0]);
	var northEast = new L.LatLng(bbox[3], bbox[1]);	
	return {'southWest': southWest,
		    'northEast': northEast};
	// The Angular directive stuff doesn't use the leaflet bbox stuff
    // correctly, so we'll hackify it slightly to ensure compatibility with
	// both...
	var bbox=L.LatLngBounds(southWest, northEast);
	bbox.southWest=southWest;
	bbox.northEast=northEast;
	return bbox
}

/*
 * A variant of the ViewResults Controller that uses leaflet-directive 
 * rather than leaflet directly.
 */
function ViewResultsCtrl($scope, $routeParams, $location, $log, $http) {
	$scope.jobid=$routeParams.jobid;
	$scope.changeTab('results');
	$scope.gridOptions= {data: 'data',
	                     showColumnMenu: true };
	/* 
	 * The leaflet directive code is somewhat broke in that if 
	 * bounds is specified, but set to a variable set to null, it is then 
	 * totally ignored (the watch isn't setup.)  To mitigate this, set the
	 * bounds to some reasonable value to start with, then we can change it
	 * later since the $watch is there...
	 */
	$scope.bounds={southWest: { lat: 44.81773,
		                        lng: -93.499378},
		           northEast: { lat: 45.076137,
		                        lng: -93.16212 }
				  };

	
	
	$scope.leaflet={'defaults': { tileLayer: 'http://{s}.tile.cloudmade.com/{key}/{styleId}/256/{z}/{x}/{y}.png',
								  tileLayerOptions: { key: '0c9dbe8158f6482d84e3543b1a790dbb', styleId: 997 }
								},
					'bounds': $scope.bounds,
			        'baselayers': {
				        	cloudmade: {
				        		top: true,
				                name: 'Cloudmade (OSM Data)',
				                type: 'xyz',
				                url: 'http://{s}.tile.cloudmade.com/{key}/{styleId}/256/{z}/{x}/{y}.png',
				                layerParams: {
				                    key: '0c9dbe8158f6482d84e3543b1a790dbb',
				                    styleId: 997
				                },
				                layerOptions: {
				                    subdomains: ['a', 'b', 'c'],
				                    continuousWorld: false
				                }
				            }
			        	}
					};
	
	
	$scope.resources['job'].one($scope.jobid).get().then(function (job_data) {
		$scope.$parent.results_job=job_data;
		file_id=$scope.results_job.data_file.split('/').reverse()[1];
		$scope.input_data=$scope.resources['datafile'].one(file_id).get().then(function (input_data) {
			if (input_data.geom_type) {
				$scope.leaflet.bounds=getBounds(input_data.bbox);
			}
			$scope.input_data=input_data;
		});
		// Get the information about the input file - used to determine if this
		// job has a spatial component to it.
		$http.get(job_data.results).success(function(data, status) {
			$scope.leaflet.geojson={data: data,
									style: style,
									resetStyleOnMouseout: true,
									pointToLayer: function (feature, latlng) {
								        return L.circleMarker(latlng);
								    }
			};
			$scope.data=[];
			_.each(data.features, function (value) {
				$scope.data.push(value.properties);
			});
		});
		
	});
	
	style=function (feature) {
		geojsonMarkerOptions = {
				    radius: 8,
				    fillColor: "#ff7800",
				    color: "#000",
				    weight: 1,
				    opacity: 1,
				    fillOpacity: 0.8
				};
		return geojsonMarkerOptions;
	}
	
	// Handle the case when a user moves their mouse over the GeoJSON feature.
//	$scope.$on("leafletDirectiveMap.geojsonMouseover", function(ev, leafletEvent) {
//         $log.info(leafletEvent);
//         var feature_type='mouse';
//         var feature_id=leafletEvent.layer.feature.id;
//         var properties=leafletEvent.layer.feature.properties;
//         $scope.selected_feature={type: feature_type,
//        		               	  id: feature_id,
//        		               	  properties: properties};
//         
//     });

	// Handle the case when the user clicks on a GeoJSON feature.
    $scope.$on("leafletDirectiveMap.geojsonClick", function(ev, featureSelected, leafletEvent) {
         $log.info(featureSelected, leafletEvent);
         var feature_type='click';
         var feature_id=featureSelected.id;
         var properties=featureSelected.properties;
         $scope.selected_feature={type: feature_type,
        		                  id: feature_id,
        		                  properties: properties};
         $log.info(properties);
    });
     
	$scope.close=function () {
		$scope.$parent.results_job=undefined;
		$location.path('/job/');
	}
	
}
//
//function ViewResultsCtrl($scope, $routeParams, $location, $log, $http) {
//	$scope.jobid=$routeParams.jobid;
//	$scope.changeTab('results');
//	$scope.gridOptions = { data: 'results',
//						   showColumnMenu: true};
//	// If someone directly loads this page, we'll need to look up the
//	// job data, as well as the file information.  So do that here.  
//	// Just always do it, even if a parent job id is enabled...
//    
//    
//	$scope.displayPopup=function (feature, layer) {
//		layer.on('click', function (e) {
//			$scope.selected_feature=feature;
//		})
//	};
//	$scope.pointToLayer=function (feature, latlong) {
//		var geojsonMarkerOptions = {  radius: 8,
//				    				  fillColor: "#ff7800",
//				    				  color: "#000",
//				    				  weight: 1,
//				    				  opacity: 1,
//				    				  fillOpacity: 0.8 };
//		$log.info('Got Feature/latlong', feature, latlong);
//		return L.circleMarker(latlong, geojsonMarkerOptions);
//	};
//	
//	$scope.resources['job'].one($scope.jobid).get().then(function (job_data) {
//		$scope.$parent.results_job=job_data;
//		file_id=$scope.results_job.data_file.split('/').reverse()[1];
//		$scope.input_data=$scope.resources['datafile'].one(file_id).get().then(function (input_data) {
//			$scope.data=input_data;
//			if (input_data.geom_type) {
//				$scope.input_data=input_data;
//				$scope.map=L.map('map');
//				$scope.bounds=getBounds(input_data.bbox);
//				$scope.map.fitBounds($scope.bounds);
//				$scope.map._onResize()
//				L.tileLayer('http://{s}.tile.cloudmade.com/{key}/{styleId}/256/{z}/{x}/{y}.png', {
//			   	    key: '0c9dbe8158f6482d84e3543b1a790dbb',
//			   	    styleId: 997
//				}).addTo($scope.map);	
//				$log.info($scope.bounds)
//				$http.get(job_data.results).success(function (data, status) {
//					L.geoJson(data, { pointToLayer: $scope.pointToLayer,
//									  onEachFeature: function (feature, layer) { $scope.displayPopup(feature, layer) }
//									}).addTo($scope.map);
//					$scope.results=[];
//					$scope.data=data;
//					_.each(data.features, function (value) {
//						$scope.results.push(value.properties);
//					});
//					$log.debug($scope.results)
//				});
//			}	
//		});
//	});
//	
//
//	$scope.close=function () {
//		$scope.$parent.results_job=undefined;
//		$location.path('/job/');
//	}
//	
//}
 
function FilesCtrl($scope, $timeout, $route, $dialog, $log) {
	$log.info('In FilesCtrl');
	$scope.enableRefresh(['datafile']);
	$scope.changeTab('files');
	$scope.opts = {
		    backdrop: true,
		    keyboard: true,
		    backdropClick: true,
		    templateUrl:  'file_info.html', // OR: templateUrl: 'path/to/view.html',
		    controller: 'FileInfoUpdateController'
		  };
	$scope.initialload=false;
	$scope.fileupload='';
	$scope.upload_uri=CONFIG.api_path + 'datafile/';
	$('#fileUpload').fileupload();
	$('#fileUpload').fileupload('option', {
		   url: CONFIG.api_path + 'datafile/',
		   paramName: 'file',
		   progressall: function (e, data) {
			    $('#progress .bar').show();
		        var progress = parseInt(data.loaded / data.total * 100, 10);
		        $('#progress .bar').css(
		            'width',
		            progress + '%'
		         );
		   },
		   done: function () { 
			   $scope.refreshData('datafile'); 
			   $timeout(function () {
				   $('#progress .bar').hide();
			   	   $('#progress .bar').css('width', '0%');
			   }, 1000);
		   }	 
	});
	
	$scope.openDialog=function (record) {
		$scope.opts['record']=record;
		$scope.opts['thisscope']=$scope;
		var d=$dialog.dialog($scope.opts);
		$log.info('Edit data is', record)
		d.open().then(function(result) {
			$log.info('Result from dialog was ', result);
			$scope.refreshData('datafile');
		});
	}
	

	
}
 
function FileInfoUpdateController($scope, dialog, $filter, $log) {
	$scope.filedata=dialog.options.record; // Save the data we are editing in this scope.
	// Apply the filter to the data, since we need to display better in the template
	$scope.filedata.date_created=$filter('date')($scope.filedata.date_created, 'medium');
	// A list of lists, with the 5-set being field/attribute name
	// help-text, disabled true/false, and spatial true/false.
	
	$scope.filterSpatial= function(field) {
		if (field.hide_empty && !$scope.filedata[field.field]) {
			return false;
		} else if (field.spatial == true) {
			if (!$scope.filedata.geom_type) {
				return true;
			} 
		}
		return true;

	}
	$scope.fields=[{'display_name': 'File Name',
		            'field': 'name',
		            'description':'The name of the uploaded file', 
		            'disabled': true, 
		            'spatial': false },
		           {'display_name': 'Status Message',
			        'field': 'status_message',
			        'description':'The reason the file failed to properly import', 
			        'disabled': true, 
			        'hide_empty': true,
			        'spatial': false },
		           {'display_name': 'Description',
			        'field': 'description',
			        'description':'A description/metadata for this file', 
			        'disabled': false, 
			        'spatial': false },
			       {'display_name': 'Date Uploaded',
		            'field': 'date_created',
		            'description':'The date/time when the file was uploaded', 
		            'disabled': true, 
		            'hide_empty': true,
		            'spatial': false }, 
			       {'display_name': 'Feature Count',
		            'field': 'feature_count',
		            'description':'The number of features (rows) of data in this file', 
		            'disabled': true, 
		            'hide_empty': true,
		            'spatial': false },
		           {'display_name': 'Geometry Type',
			        'field': 'geom_type',
			        'description':'The type of geometry for this data', 
			        'disabled': true, 
			        'hide_empty': true,
			        'spatial': true },
			       {'display_name': 'Spatial Reference Identifier (SRID)',
		            'field': 'srid',
		            'description':'The detected SRID for the uploaded file', 
		            'disabled': true, 
		            'hide_empty': true,
		            'spatial': true }
		            
		           
			        
		            ]

	$scope.save=function () {
		$log.info('Data to save is', $scope.filedata);
		$scope.filedata.put().then(function (data) {
			dialog.close(true);
		});
	}
	$scope.close=function() {
		$log.info('Closed');
		dialog.close(false);
	}
}

/*
 * Output the form that is used to configure a job, and take the resulting 
 * data to send up to the server so the job configuration can be validated.
 * 
 * Once a response comes back, we'll have to check for errors and then set
 * the appropriate error messages in the template as well...
 */
function ConfigureCtrl($scope, $routeParams, $location, $dialog, $log) {
	var jobid=$routeParams.jobid;
	// Get Job, tool, and file information, then use them to generate the form
	// configuration.
	$scope.tool_config=[];
	var config_present=false;
	if (typeof $scope.$parent.job_config !== 'undefined') {
		config_present=true;
	} else {
		$scope.$parent.job_config={};
	}
	$log.info(config_present);
	$scope.sections={'properties': true,
					 'constants': false}
	$scope.toggleSection=function (type) {
		$scope.sections[type]=!$scope.sections[type];
	}
	$scope.resources['job'].one(jobid).get().then(function (job_data) {
		$scope.job_data=job_data;
		var tool_id=job_data.tool.split('/').reverse()[1];
		var file_id=job_data.data_file.split('/').reverse()[1];
		$scope.disabled=(job_data.status != 'Configuration Pending');
		$log.info('Setting is ', $scope.disabled);
		$scope.resources['tool'].one(tool_id).get().then(function (tool_data) {
			$scope.tool_name=tool_data.name;
			$scope.resources['datafile'].one(file_id).get().then(function (file_data) {
				// Compute a list of fields to select from for property selection
				// dialogs
				$scope.file_name=file_data.name;
				fields=[]
				_.each(JSON.parse(file_data.fields), function (v) {
					fields.push({'label': v,
						         'value': v});
				});
				_.each(tool_data.config.input.properties, function (property_data, name) {
					var config= {'display_name': property_data.display_name || name,
				        		'field': name,
				        		'required': property_data.required,
				        		'description': property_data.description,
				        		'type': property_data.type,
				        		'value': property_data['default']};
					
					if (property_data.type == 'property') {
						config.value=fields;
						if (! config_present) {
						  $scope.$parent.job_config[name]=name;
						}
					} else if (! config_present) {
						$scope.$parent.job_config[name]=property_data['default'];
					}
					$scope.tool_config.push(config);
				});
				
			});
		});
	});

	$scope.setConfigureJob(jobid);
	$scope.enableRefresh([]);
	$scope.changeTab('configurejob');
	$scope.closeConfig=function () {
		$log.info('Got close request?!?!');
		$scope.$parent.job_config=undefined;
		$scope.$parent.working_job_id=null;
		$location.path('/job');
	}
	$scope.submit_job=function () {
		$scope.resources['job'].getList({'job_id': $scope.job_data.id}).then(function (response) {
			var data=response[0];
			data.config=$scope.$parent.job_config;
			data.put().then(function (response) {
				$log.info(response);
				// Return them to the job window.
				$scope.closeConfig();
			}, function (response) {
				/* Function called when an error is returned */
				$scope.$parent.errors=response.data.job.config;
				var opts = {
					    backdrop: true,
					    keyboard: true,
					    backdropClick: true,
					    templateUrl:  'error.html', // OR: templateUrl: 'path/to/view.html',
					    controller: 'ErrorDialogCtrl'
					  };
				opts.errors=$scope.$parent.errors;
				var d=$dialog.dialog(opts);
				d.open();
			});
		});
	}
	var clone_opts = {
		    backdrop: true,
		    keyboard: true,
		    backdropClick: true,
		    templateUrl:  'cloneconfig.html', // OR: templateUrl: 'path/to/view.html',
		    controller: 'CloneConfigCtrl'
		  };
	
	$scope.cloneConfig=function () {
		var d=$dialog.dialog(clone_opts);
		d.open().then(function (job_config) {
			if (job_config) {
//			   $log.info('Selected to clone', job_config);
//			   $log.info('Current config',$scope.$parent.job_config);
			   $scope.$parent.job_config=JSON.parse(job_config);
			}
		});
	}
}

function ErrorDialogCtrl($scope, dialog) {
	$scope.messages=dialog.options.errors;
	$scope.close=function () {
		dialog.close();
	}
}

/*
 * This is the controller for Jobs - in particular viewing and controlling
 * a job.  Here we'll work with dialogs to create new jobs and then 
 * choose/set the parameters for them.
 */

function JobCtrl($scope, $routeParams, $dialog, $position, $location, $log) {
	$scope.enableRefresh(['job']);
	$scope.refreshData('job');
	//var jobid=$routeParams.jobid;
	$log.info('In JobCtrl');
	$scope.changeTab('viewjob');
	$scope.create_job_opts = {
		backdrop: true,
		keyboard: true,
		backdropClick: true,
		templateUrl:  'create_job.html', // OR: templateUrl: 'path/to/view.html',
		controller: 'CreateJobController'
	};
	$scope.view_job_opts = {
			backdrop: true,
			keyboard: true,
			backdropClick: true,
			templateUrl:  'view_job.html', // OR: templateUrl: 'path/to/view.html',
			controller: 'ViewJobController'
	};
	$scope.createJob=function () {
		var d=$dialog.dialog($scope.create_job_opts);
		d.open().then(function(result) {
			if (result) {
				$scope.refreshData(['job']);
				$scope.resources['job'].post(result).then(function (api_result) {
					$scope.refreshData('job');
					$location.path('/job/' +
							       api_result.resource_uri.split('/').reverse()[1] + '/');
				});				
			}
		});
		$log.info('Creating a new job!');
	};
	$scope.openDialog=function(job) {
		$log.info('Got (openDialog)', job);
		$scope.view_job_opts.resource=job;
		var d=$dialog.dialog($scope.view_job_opts);
		d.open().then(function(result) {
			if (result) {
				result.put().then(function () {
					$scope.refreshData('job');
				});
			}
		});
	};

	$scope.importResults=function (job) {
		$log.info('Got (importResults)', job);
	};
	
	$scope.viewResults=function (job) {
		$scope.$parent.results_job=job;
		$location.path('/results/' + job.id + '/');
	};
	
}

function ViewJobController($scope, dialog, $log) {
	$scope.jobdata=dialog.options.resource;
	$scope.fields=[{'display_name': 'Job Description',
					'field': 'description',
					'type': 'input',
			        'description':'Your description for this job', 
			        'disabled': false },
			       {'display_name': 'Tool Name',
					'field': 'tool_name',
					'type': 'input',
			        'description':'The tool used for this job', 
			        'disabled': true },
			       {'display_name': 'File Name',
					'field': 'file_name',
					'type': 'input',
			        'description':'The data file provided for this job', 
			        'disabled': true },
			       {'display_name': 'Job Status',
					'field': 'status',
					'type': 'input',
			        'description':'The current status of this job', 
			        'disabled': true }];
	$scope.close=function () {
		dialog.close(false);
	}
	$scope.save=function () {
		dialog.close($scope.jobdata)
	}
}


/*
 * This controller is used to manage the create job dialog - which is used to 
 * choose a tool and data file so that a user can create a new job and get a
 * job configuration form.
 */

function CreateJobController($scope, dialog, $log) {
	$scope.jobdata={};
	var tool_values=dialog.options;
	var file_values=dialog.options;
	$scope.getFileStr=function (o) {
		if (o.descripton) {
			return o.name + ': ' + o.description;
		} else {
			return o.name;
		}
	}
	$scope.close=function () {
		dialog.close(false);
	}
	$scope.save=function () {
		dialog.close($scope.jobdata);
	}
	$scope.fields=[{'display_name': 'Job Description',
			        'field': 'description',
			        'description':'A description for the new job',
			        'type': 'input'},
			       {'display_name': 'Tool',
			        'field': 'status_message',
			        'description': 'Select the tool to use for this job.',
			        'type': 'select',
			        'values': tool_values},
			       {'display_name': 'File',
			        'field': 'description',
			        'description':'Choose a file to use for this job.',
			        'type': 'select',
			        'values': file_values}];
	
}






function FeedbackCtrl($scope, $location, dialog, $log) {
	$log.info('In FeedbackCtrl');
	$log.info('Current location is ', $location.path());
	var values_list=['No Opinion', 'Works', 'Needs Help', 'No Way'];
	values=[];
	_.each(values_list, function (v) {
		values.push({'label': v,
			         'value': v});
	});
	$scope.feedback=dialog.options.record;
	
	$scope.fields=[{'display_name': 'Transparency',
		        	'field': 'transparency',
			        'help':'Can you figure out what this page is supposed to do?',
			        'type': 'select',
			        'values': values},
				   {'display_name': 'Functionality',
			        'field': 'functionality',
				    'help':'Does this page do what it is supposed to?',
				    'type': 'select',
				    'values': values },
				   {'display_name': 'Usability',
			    	'field': 'usability',
			    	'help':'Does this page work well enough to be useful?',
			    	'type': 'select',
			        'values': values },
		 	       {'display_name': 'Performance',
			    	'field': 'performance',
			    	'help':'Does the page seem overly slow, or broken?',
			    	'type': 'select',
			        'values': values },
			       {'display_name': 'Comments',
			        'field': 'comments',
			        'help':'Enter your detailed comments here, especially if you ranked anything as \'Needs Help\' or \'No Way\'',
			        'type': 'input' }];
	
	$scope.save=function () {
		dialog.close($scope.feedback);
	};
	
	$scope.close=function () {		
		dialog.close();
	};
}

function CloneConfigCtrl($scope, dialog) {
	$scope.selected=undefined;
	$scope.clone=function () {
		dialog.close($scope.selected);
	}
	$scope.close=function () {
		dialog.close();
	}
}
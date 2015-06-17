var API  = (function(API) {

//var host = "private-bd9e-rainmachine.apiary-mock.com";
//var host = "127.0.0.1";
var host = "192.168.12.157";

//var port = "443";
//var port = "18080";
var port = "8080";

var apiUrl = "https://" + host + ":" + port + "/api/4";
//var apiUrl = "http://" + host + ":" + port + "/api/4";

var async = false;

var token = null;

function rest(type, apiCall, data, callback)
{
	var url;

	if (token !== null)
		url = apiUrl + apiCall + "?access_token=" + token;
	else
		url = apiUrl + apiCall;

	console.log("Doing API call: %s", url);
	r = new XMLHttpRequest();
	r.open(type, url, async);

	if (type === "POST")
	{
		r.setRequestHeader("Content-type","text/plain");
		r.send(JSON.stringify(data));
	}
	else
	{
		r.send(null);
	}

	return JSON.parse(r.responseText);
}

function post(apiCall, data, callback) { return rest("POST", apiCall, data, callback); }
function get(apiCall, callback) { return rest("GET", apiCall, null, callback); }

/* ------------------------------------------ API ROOT PATHS ----------------------------------------------*/
API.URL = Object.freeze({
	auth			: "/auth",
	provision		: "/provision",
	dailystats		: "/dailystats",
	restrictions	: "/restrictions",
	program			: "/program",
	zone			: "/zone",
	watering		: "/watering",
	parser			: "/parser",
	mixer			: "/mixer",
	diag			: "/diag",
	machine			: "/machine",
	dev				: "/dev"
});

/* ------------------------------------------ API ERROR CODES ----------------------------------------------*/
API.ERROR = {
    Success                 : '{ "statusCode":  0,  "message": "OK"                         }',
    ExceptionOccurred       : '{ "statusCode":  1,  "message": "Exception occurred !"       }',
    NotAuthenticated        : '{ "statusCode":  2,  "message": "Not Authenticated !"        }',
    InvalidRequest          : '{ "statusCode":  3,  "message": "Invalid request !"          }',
    NotImplemented          : '{ "statusCode":  4,  "message": "Not implemented yet !"      }',
    NotFound                : '{ "statusCode":  5,  "message": "Not found !"                }',
    DBError                 : '{ "statusCode":  6,  "message": "DB Error !"                 }',
    ProvisionFailed         : '{ "statusCode":  7,  "message": "Cannot provision unit"      }',
    PasswordNotChanged      : '{ "statusCode":  8,  "message": "Cannot change password"     }',
    ProgramValidationFailed : '{ "statusCode":  9,  "message": "Invalid program constraints"}'
};


/* ------------------------------------------ VER API CALLS -----------------------------------------------*/

API.getApiVer = function()
{
	var url = "/apiVer";
	return get(url, null);
}

/* ------------------------------------------ AUTH API CALLS ----------------------------------------------*/

API.auth = function(password, remember)
{
	var url = API.URL.auth + "/login";
	
	var data = 
	{
		pwd: password,
		remember: remember
	};
	
	var reply = post(url, data, null); 
	token = reply.access_token;
	console.log(token);
}

/* ------------------------------------------ PROVISION API CALLS -----------------------------------------*/

API.getProvision = function()
{
	return get(API.URL.provision, null);
}

API.getProvisionWifi = function()
{
	var url = API.URL.provision + "/wifi";
	return get(url, null);
}

API.getProvisionCloud = function()
{
	var url = API.URL.provision + "/cloud";
	return get(url, null);
}

API.setProvision = function(systemObj, locationObj)
{
	var url = API.URL.provision;
	var data = {};

	if (systemObj !== undefined && systemObj !== null)
		data.system = systemObj;

	if (systemObj !== undefined && systemObj !== null)
    	data.location = locationObj;

    if (Object.keys(data).length == 0)
    	return API.ERROR.InvalidRequest;

    return post(url, data, null);
}

API.setProvisionName = function(name)
{
	var url = API.URL.provision +  "/name";
	var data = { netName: name };

	return post(url, data,  null);
}

API.setProvisionCloud = function(cloudObj)
{
	var url = API.URL.provision +  "/cloud";
	var data = cloudObj;

	return(url, data, null);
}

API.setProvisionCloudEnable = function(isEnabled)
{
	var url = API.URL.provision +  "/cloud/enable";
	var data = { enable: isEnabled };

	return post(url, data, null);
}

API.setProvisionCloudReset = function()
{
	var url = API.URL.provision +  "/cloud/reset";
	var data = { };

	return post(url, data, null);
}

API.setProvisionReset = function(withRestart)
{
	var url = API.URL.provision;
	var data = { restart: withRestart };

	return post(url, data, null);
}

/* ------------------------------------------ DAILY STATS API CALLS ---------------------------------------*/

API.getDailyStats = function(dayDate, withDetails)
{
	var url = API.URL.dailystats;

	if (dayDate !== undefined && dayDate !== null) // current API doesn't support daily stats details with specified day
	{
		url += "/" + dayDate;
		return get(url, null);
	}

	if (withDetails !== undefined && withDetails)
		url += "/details";

	return get(url, null);
}

/* ----------------------------------------- RESTRICTIONS API CALLS ---------------------------------------*/

API.getRestrictionsRainDelay = function()
{
	var url = API.URL.restrictions + "/raindelay";
	return get(url, null);
}

API.getRestrictionsGlobal = function()
{
	var url = API.URL.restrictions + "/global";
	return get(url, null);
}

API.getRestrictionsHourly = function()
{
	var url = API.URL.restrictions + "/hourly";
	return get(url, null);
}

API.setRestrictionsRainDelay = function(days)
{
	var url = API.URL.restrictions + "/raindelay";
	var data = { rainDelay: days };

	return post(url, data, null);
}

API.setRestrictionsGlobal = function(globalRestrictionObj)
{
	var url = API.URL.restrictions + "/global";
	var data = globalRestrictionObj;

	return post(url, data, null);
}

API.setRestrictionsHourly = function(hourlyRestrictionObj)
{
	var url = API.URL.restrictions + "/hourly";
	var data = hourlyRestrictionObj;

	return post(url, data, null);
}

API.deleteRestrictionsHourly = function(id)
{
    var url = API.URL.restrictions + id + "/delete";
    var data = {};

    return port(url, data, null);
}

/* ----------------------------------------- PROGRAMS API CALLS -------------------------------------------*/
API.getPrograms = function(id)
{
	var url = API.URL.program;

	if (id !== undefined)
		url += "/" + id;

	return get(url, null);
}

API.getProgramsNextRun = function()
{
	var url = API.URL.program + "/nextrun";

	return get(url, null);
}

API.setProgram = function(id, programProperties)
{
	var url = API.URL.program + "/" + id;
	var data = programProperties;

	return post(url, data, null);
}

API.newProgram = function(programProperties)
{
	var url = API.URL.program;
	var data = programProperties;

	return post(url, data, null);
}

API.deleteProgram = function(id)
{
	var url = API.URL.program + "/" + id + "/delete";
    var data = { pid: id };

    return post(url, data, null);
}

API.startProgram = function(id)
{
	var url = API.URL.program + "/" + id + "/start";
    var data = { pid: id };

    return post(url, data, null);
}

API.stopProgram = function(id)
{
	var url = API.URL.program + "/" + id + "/stop";
    var data = { pid: id };

    return post(url, data, null);
}

/* ------------------------------------------ ZONES API CALLS --------------------------------------------*/
API.getZones = function(id)
{
	var url = API.URL.zone;

	if (id !== undefined)
		url += "/" + id;

	return get(url, null);
}

API.startZone = function(id, duration)
{
	if (id === undefined || id === null)
		return API.ERROR.InvalidRequest;

	if (duration === undefined || duration === null)
		return API.ERROR.InvalidRequest;

	var url = API.URL.zone + "/" + id + "/start";
	var data = { time: duration };

	return post(url, data, null);
}

API.stopZone = function(id)
{
	if (id === undefined || id === null)
		return API.ERROR.InvalidRequest;

	var url = API.URL.zone + "/" + id + "/stop";

	var data = { zid : id };

	return post(url, data, null);
}

API.getZonesProperties = function(id)
{
	var url = API.URL.zone;

	if (id !== undefined)
		url += "/" + id;

	url += "/properties";

	return get(url, null);
}

API.setZonesProperties = function(id, properties, advancedProperties)
{
	var url = API.URL.zone;

	if (id === undefined)
		return API.ERROR.InvalidRequest;

	if (properties === undefined || properties === null)
		return API.ERROR.InvalidRequest;


	url += "/" + id + "/properties";

	var data = properties;

	if (advancedProperties !== undefined && advancedProperties !== null)
		data.advanced = advancedProperties;

	return post(url, data, null);
}

/* ----------------------------------------- WATERING API CALLS -------------------------------------------*/



/* ------------------------------------------ PARSER API CALLS --------------------------------------------*/



/* ------------------------------------------ MIXER API CALLS ---------------------------------------------*/
API.getMixer = function(startDate, days)
{
	var url = API.URL.mixer;

	if (startDate !== undefined)
		url += "/" + startDate;

	if (days !== undefined)
		url += "/" + days;

	return get(url, null);
}

/* ------------------------------------------ DIAG API CALLS ------------------------------------------------*/
API.getDiag = function()
{
	return get(API.URL.diag, null)
}
/* ------------------------------------------ MACHINE API CALLS ---------------------------------------------*/

/* ------------------------------------------ DEV API CALLS -------------------------------------------------*/


return API; } (API || {} ));
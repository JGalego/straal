/**
 * Wrapper for Xray's REST API
 *
 * @author João Galego
 * @copyright 2018
 * @license MIT
 */

/**
 * Module Dependencies
 */

var JiraClient = require('jira-connector');
var oauth = require('oauth');
var request = require('request');
var url = require('url');

/**
 * XrayApi
 */
var XrayApi = exports.XrayApi = function (protocol, host, port, username, password, apiVersion, verbose, strictSSL, oauth, base) {
    this.protocol = protocol;
    this.host = host;
    this.port = port;
    this.username = username;
    this.password = password;
    this.apiVersion = apiVersion;
    this.base = base;

    // Jira
    this.jira = new JiraClient({
        protocol: this.protocol,
        host: this.host,
        port: this.port,
        basic_auth: {
            username: this.username,
            password: this.password
        }
    });

    // SSL
    if (strictSSL == null) {
        strictSSL = true;
    }
    this.strictSSL = strictSSL;

    // makeUri
    this.makeUri = function (pathname, altBase, altApiVersion) {
        
        // Setup base path
        var basePath = 'rest/raven/';
        if (altBase != null) {
            basePath = altBase;
        }

        if (this.base) {
            basePath = this.base + '/' + basePath;
        }

        // Setup API version
        var apiVersion = this.apiVersion;
        if (altApiVersion != null) {
            apiVersion = altApiVersion;
        }

        // Format URL
        var uri = url.format({
            protocol: this.protocol,
            hostname: this.host,
            port: this.port,
            pathname: basePath + apiVersion + pathname
        });
        console.debug(uri);

        return decodeURIComponent(uri);
    };

    // doRequest
    this.doRequest = function (options, callback) {
        
        if (oauth && oauth.consumer_key && oauth.consumer_secret) {
            options.oauth = {
                consumer_key: oauth.consumer_key,
                consumer_secret: oauth.consumer_secret,
                token: oauth.access_token,
                token_secret: oauth.access_token_secret
            };
        } else if (this.username && this.password) {
            options.auth = {
                'user': this.username,
                'pass': this.password
            };
        }
        
        // Make the request
        request(options, callback);
    };

};

(function () {
    /**
     * Exports test execution results from JIRA
     *
     * @param  {String} testExecKey the test execution to export the test runs
     * @param  {Object} callback
     * 
     * @return {Object}
     */
    this.exportTestExecutionResults = function (testExecKey, callback) {

        var options = {
            rejectUnauthorized: this.strictSSL,
            uri: this.makeUri('/testruns?testExecKey=' + testExecKey),
            method: 'GET'
        };

        this.doRequest(options, function (error, response, body) {

            if (error) {
                callback(error, null);
                return;
            }

            if (response.statusCode === 400) {
                callback('Please check Jira log.');
                return;
            }

            if (response.statusCode === 401) {
                callback('The Xray license is not valid.');
                return;
            }

            if (response.statusCode === 500) {
                callback('An internal error occurred when generating the output file.');
                return;
            }

            if (response.statusCode !== 200) {
                callback(response.statusCode + ': Unable to connect to JIRA during exportTestExecutionResults.');
                return;
            }

            if (body === undefined) {
                callback('Response body was undefined.');
                return;
            }

            callback(null, JSON.parse(body));

        });
    };

    /**
     * Imports test execution results in JUnit's XML format to JIRA
     *
     * @param  {String} file a MultipartFormParam containing a XML file to import
     * @param  {String} projectKey key of the project where the test execution (if the testExecKey parameter wasn't provided) and the tests (if they aren't created yet) are going to be created
     * @param  {String} testPlanKey key of the Test Plan; if you specify the Test Plan, the Tests will be added automatically to the Test Plan if they're not part of it
     * @param  {String} fixVersion the Fix Version associated with the test execution (it supports only one value)
     * @param  {Object} callback
     * 
     * @return {Object}
     */
    this.importJunitXmlResults = function (file, projectKey, testPlanKey, callback) {

        var options = {
            rejectUnauthorized: this.strictSSL,
            uri: this.makeUri('/import/execution/junit?projectKey=' + projectKey + '&testPlanKey=' + testPlanKey),
            contentType: 'multipart/form-data',
            form: {'file': file},
            method: 'POST'
        };

        this.doRequest(options, function (error, response, body) {

            if (error) {
                callback(error, null);
                return;
            }

            if (response.statusCode === 400) {
                callback('Please check Jira log.');
                return;
            }

            if (response.statusCode === 401) {
                callback('The Xray license is not valid.');
                return;
            }

            if (response.statusCode === 500) {
                callback('An internal error occurred when importing execution results.');
                return;
            }

            if (response.statusCode !== 200) {
                callback(response.statusCode + ': Unable to connect to JIRA during importJunitXmlResults.');
                return;
            }

            if (body === undefined) {
                callback('Response body was undefined.');
                return;
            }

            callback(null, JSON.parse(body));

        });
    };

    /**
     * Get project info
     *
     * @param  {String} projectKey The project key.
     * @param  {Object} callback
     * 
     * @returns {Object}
     */
    this.getProjectInfo = function (projectKey, callback) {

        var options = {
            rejectUnauthorized: this.strictSSL,
            uri: this.makeUri('/project/' + projectKey, 'rest/api/', '2'),
            contentType: 'application/json',
            method: 'GET'
        };

        this.doRequest(options, function (error, response, body) {

            if (error) {
                callback(error, null);
                return;
            }

            if (response.statusCode !== 200) {
                callback(response.statusCode + ': Unable to connect to JIRA during getProjectInfo.');
                return;
            }

            if (body === undefined) {
                callback('Response body was undefined.');
                return;
            }

            callback(null, JSON.parse(body));
        });
    };

    /**
     * Creates a Test Plan issue
     *
     * @param  {Integer} projectId The project ID.
     * @param  {String} issueSummary The test plan summary
     * @param  {String} issueDescription The test plan description
     * @param  {Object} callback
     */
    this.createTestPlan = function (projectId, issueSummary, issueDescription, callback) {

        var testPlanIssue = {fields: {project: {id: projectId}, summary: issueSummary, description: issueDescription, issuetype: {name: 'Test Plan'}}};

        this.jira.issue.createIssue(testPlanIssue, callback);
    };

    /**
     * Creates a Test Set issue
     *
     * @param  {Integer} projectId The project ID.
     * @param  {String} issueSummary The test set summary
     * @param  {String} issueDescription The test set description
     * @param  {Object} callback
     */
    this.createTestSet = function (projectId, issueSummary, issueDescription, callback) {

        var testSetIssue = {fields: {project: {id: projectId}, summary: issueSummary, description: issueDescription, issuetype: {name: 'Test Set'}}};

        this.jira.issue.createIssue(testSetIssue, callback);
    };

    /**
     * Creates a Test Execution issue
     *
     * @param  {Integer} projectId The project ID.
     * @param  {String} issueSummary The test execution summary
     * @param  {String} issueDescription The test execution description
     * @param  {Object} callback
     */
    this.createTestExecution = function (projectId, issueSummary, issueDescription, callback) {

        var testExecutionIssue = {fields: {project: {id: projectId}, summary: issueSummary, description: issueDescription, issuetype: {name: 'Test Execution'}}};

        this.jira.issue.createIssue(testExecutionIssue, callback);
    };

    /**
     * Creates a Test issue
     *
     * @param  {Integer} projectId The project ID.
     * @param  {String} issueSummary The test summary
     * @param  {String} issueDescription The test description
     * @param  {Object} callback
     */
    this.createTest = function (projectId, issueSummary, issueDescription, callback) {

        var testIssue = {fields: {project: {id: projectId}, summary: issueSummary, description: issueDescription, issuetype: {name: 'Test'}}};

        this.jira.issue.createIssue(testIssue, callback);
    };

}).call(XrayApi.prototype);

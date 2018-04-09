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
        
        // debug
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
     * Imports test execution results in JSON format to JIRA
     *
     * @param  {String} filePath path to the JSON file
     * @param  {Object} callback
     * 
     * @return {Object}
     */
    this.importResults = function (filePath, callback) {

        var options = {
            rejectUnauthorized: this.strictSSL,
            body: fetch(filePath).then(response => response.json()),
            uri: this.makeUri('/import/execution'),
            json: true,
            contentType: 'application/json',
            method: 'POST'
        };

        this.doRequest(options, function (error, response, body) {

            if (error) {
                callback(error, null);
                return;
            }

            if (response.statusCode === 400) {
                callback('No execution results where provided.');
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
                callback(response.statusCode + ': Unable to connect to JIRA during importResults.');
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
     * Get issue information
     *
     * @param  {String} issueIdOrKey The issue ID or key.
     * @param  {Object} callback
     * 
     * @returns {Object}
     */
    this.getIssueInfo = function (issueIdOrKey, callback) {

        var options = {
            rejectUnauthorized: this.strictSSL,
            uri: this.makeUri('/issue/' + issueIdOrKey, 'rest/api/', '2'),
            contentType: 'application/json',
            method: 'GET'
        };

        this.doRequest(options, function (error, response, body) {

            if (error) {
                callback(error, null);
                return;
            }

            if (response.statusCode === 404) {
                callback(response.statusCode + ': Please check if the issue exists.');
                return;
            }

            if (response.statusCode !== 200) {
                callback(response.statusCode + ': Unable to connect to JIRA during getIssueInfo.');
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
     * Get test run
     *
     * @param  {String} testExecKey The test execution key.
     * @param  {String} testKey The test key.
     * @param  {Object} callback
     * 
     * @returns {Object}
     */
    this.getTestRun = function (testExecKey, testKey, callback) {

        var options = {
            rejectUnauthorized: this.strictSSL,
            uri: this.makeUri('/api/testrun?testExecIssueKey=' + testExecKey + '&testIssueKey=' + testKey),
            contentType: 'application/json',
            method: 'GET'
        };

        this.doRequest(options, function (error, response, body) {

            if (error) {
                callback(error, null);
                return;
            }

            if (response.statusCode === 401) {
                callback(response.statusCode + ': The Xray license is not valid.');
                return;
            }

            if (response.statusCode === 500) {
                callback(response.statusCode + ': An internal error occurred getting the test run.');
                return;
            }

            if (response.statusCode !== 200) {
                callback(response.statusCode + ': Unable to connect to JIRA during getTestRun.');
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

    /**
     * Save Test run
     * 
     * Note: Use <a href="https://js-joda.github.io/js-joda/>js-joda</a> to convert a javascript Date or moment into a LocalDateTime object.
     *
     * @param  {String} testExecutionKey The test execution key
     * @param  {String} testKey The test key
     * @param  {LocalDateTime} startDate The start date of the test run
     * @param  {LocalDateTime} finishDate The finish date of the test run
     * @param  {String} status The test run status e.g. PASS, FAIL
     * @param  {String} comment A string comment
     * @param  {Object} callback
     */
    this.saveTestRun = function (testExecutionKey, testKey, startDate, finishDate, status, comment, callback) {

        var mTestRunIssue = {testExecutionKey: testExecutionKey, tests: [{testKey: testKey, start: startDate, finish: finishDate, comment: comment, status: status}]};

        var options = {
            rejectUnauthorized: this.strictSSL,
            body: mTestRunIssue,
            uri: this.makeUri('/import/execution'),
            json: true,
            contentType: 'application/json',
            method: 'POST'
        };

        this.doRequest(options, function (error, response, body) {

            if (error) {
                callback(error, null);
                return;
            }

            if (response.statusCode === 400) {
                callback('No execution results where provided.');
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
                callback(response.statusCode + ': Unable to connect to JIRA during importResults.');
                return;
            }

            if (body === undefined) {
                callback('Response body was undefined.');
                return;
            }
            
            callback(null, JSON.parse(JSON.stringify(body)));
        });
    };

    /**
     * Add evidence to test run.
     *
     * @param  {String} testRunId The test run id.
     * @param  {String} data Base64 file enconding of the evidence data.
     * @param  {String} filename A filename for the evidence data e.g. evidence.jpg
     * @param  {String} contentType The content type of the evidence data e.g. image/jpeg
     * @param  {Object} callback
     */
    this.addEvidenceToTestRun = function (testRunId, data, filename, contentType, callback) {

        var attachment = {data: data, filename: filename, contentType: contentType};

        var options = {
            rejectUnauthorized: this.strictSSL,
            body: attachment,
            uri: this.makeUri('/api/testrun/' + testRunId + '/attachment'),
            json: true,
            contentType: 'application/json',
            method: 'POST'
        };

        this.doRequest(options, function (error, response, body) {

            if (error) {
                callback(error, null);
                return;
            }

            if (response.statusCode === 401) {
                callback('The Xray license is not valid.');
                return;
            }

            if (response.statusCode === 500) {
                callback('An internal error occurred when inserting the evidences.');
                return;
            }

            if (response.statusCode !== 200) {
                callback(response.statusCode + ': Unable to connect to JIRA during addEvidenceToTestRun.');
                return;
            }

            if (body === undefined) {
                callback('Response body was undefined.');
                return;
            }
            
            callback(null, JSON.parse(body));
        });
    };

}).call(XrayApi.prototype);

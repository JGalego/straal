# straal [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url]
> Wrapper for <a href="https://marketplace.atlassian.com/plugins/com.xpandit.plugins.xray/server/overview">Xray</a>&#39;s REST API

<img src="https://github.com/JGalego/straal/blob/master/radiation.png?raw=true" width="200"/>

## Installation

```sh
$ npm install --save straal
```

## Examples

### Create Xray Client ###

```js
    const XrayApi = require('straal').XrayApi;

    var xray = new XrayApi('http', host, port, user, password, '1.0');
```

### Get Issue Information ###

```js
    xray.getIssueInfo(issueIdOrKey, function(error, issue) {
        if(!error){
            console.log('Issue ID: ' + issue.id);
        }
    })
```

### Save Test Run ###

```js
    const ZonedDateTime = require('js-joda').ZonedDateTime;
    const ChronoUnit = require('js-joda').ChronoUnit;

    function now() {
        return ZonedDateTime.now().withFixedOffsetZone().truncatedTo(ChronoUnit.SECONDS).toString();
    }

    var startDate = now();

    // perform test steps

    var finishDate = now();

    xray.saveTestRun(testExecutionKey, testKey, startDate, finishDate, status, comment, function(error, issue) {
        if(!error) {
            console.log('Test Exec Issue: ' + issue.testExecIssue.self);
        }
    });
```

## Supported Actions

* Get Project Info
* Get Issue Info
* Get Test Run Info
* Create Test Execution
* Create Test Plan
* Create Test Set
* Create Test
* Save Test Run
* Add Evidence to Test Run
* Import Test Results to JIRA
    * JSON Format
    * JUnit XML
* Export test results from JIRA
* Run JQL queries

## References

* <a href="https://confluence.xpand-addons.com/display/XRAY/REST+API">Xray's REST API</a>
* <a href="https://developer.atlassian.com/server/jira/platform/rest-apis/">JIRA's REST API</a>

## License

MIT License © [João Galego]()

[npm-image]: https://badge.fury.io/js/straal.svg
[npm-url]: https://npmjs.org/package/straal
[travis-image]: https://travis-ci.org/JGalego/straal.svg?branch=master
[travis-url]: https://travis-ci.org/JGalego/straal
[daviddm-image]: https://david-dm.org/JGalego/straal.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/JGalego/straal
[coveralls-image]: https://coveralls.io/repos/JGalego/straal/badge.svg
[coveralls-url]: https://coveralls.io/r/JGalego/straal
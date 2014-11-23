var MSF = require("./MSF");
var fs = require('fs');
//API Credentials
var username = "eikonstudent33@thomsonreuters.com";
var password = "Secret123";

var msf = new MSF(true);

//Variables representing start & end dates for the financial mention query
var start = "2014-11-21T00:00:00";
var end = "2014-11-21T00:59:59";

//Variable to aggregate headline queries into
var newsArr = [];

//Variable representing response object (can make calls to this to display data)
var responseObject;

/*
 * Variable to keep track of the last story date 
 * (to work out when we have successfully downloaded all stories for a given period)
 */
var prevlastArticleTimestamp = "";

//Function to display data in browser (as opposed to returning to console)
function returnData(payload) {
    responseObject.simpleText(200, JSON.stringify(payload));
}

/* Recursively called function to aggregate blocks of 20 news articles
 * into a list representing all for the period (initially called by getHeadlineData() )
 */
function makeNewsRequest(){
    msf.getData(
        {
            "Entity": {
                "E": "NewsArticles",
                "W": {
                    "Codes":"A:1",
                    "HeadlineLang": "L:en",
                    "LastStoryDate": "0001-01-01T01:00:00",
                    "Order": "ToEnd",
                    "Repository": "reuters",
                    "HeadlinesOnly": false,
                    "StartTime": start,
                    "EndTime": end,
                    "BrokerResearch": false
                }
            }

        }, function (error, response) {
            if (!error) {

                //Find the timestamp of the last article in the group of 20 
                var lastArticleTimestamp = response.Headlines[response.Headlines.length - 1].LastUpdateDateTime;
                
                //Give some indication of progress on console
                console.log(lastArticleTimestamp);
                
                //Check whether we have re-downloaded the same articles as before
                if (lastArticleTimestamp != prevlastArticleTimestamp) {
                    
                    //Push each of the articles up into the newsArr array
                    for (var i = 0; i < response.Headlines.length; i++) {
                        newsArr.push(response.Headlines[i]);
                    }

                    end = lastArticleTimestamp;
                    prevlastArticleTimestamp = lastArticleTimestamp
                    makeNewsRequest();

                } else { //We have finished aggregating the news articles
                    //console.log(newsArr.length);
                    
                    //Import the mentionCounter module
                    var mentionCounter = require('./mentionCount.js');
                    
                    /*Create an array of 
                     * [{ "ticker":"GPRO.O", "mentions":2 },......]
                     * representing the number of times each ticker is found in the news article list
                     */
                    var mentionCount = mentionCounter.count(newsArr);
                    
                    //Filter out the noise of companies mentioned only once or twice
                    var mentionTop = mentionCount.filter(function (el) {
                        return el.mentions >= 3;
                    });
                    
                    // Extract the list of tickers from the more-often mentioned companies (>=3)
                    var tickers = mentionTop.map(function (node) { return node.ticker; });

                    returnData(tickers);
                }
            }
        }
        
    );
}


exports.getHeadlineData = function (func,respObject) {
    msf.login(username, password, function (error) {
        if (!error) {
            callbackFunc = func;
            responseObject = respObject;
            makeNewsRequest();
        }
    });
}

exports.getPriceData = function () {
    msf.login(username, password, function (error) {
        if (!error) {
            msf.getData({
                "Entity": {
                    "E": "TATimeSeries",
                    "W": {
                        "Tickers": [
                            "AAPL.O"
                        ],
                        "NoInfo": false,
                        "Interval": "Daily",
                        "IntervalMultiplier": 1,
                        "DateRangeMultiplier": 1,
                        "StartDate": "2014-11-10T00:00:00",
                        "EndDate": "2014-11-21T00:00:00",
                        "Analysis": [
                            "OHLCV"
                        ]
                    }
                }
            }, function (error, response) {
                if (!error) {
                    console.log(JSON.stringify(response, false, 2));
                } else {
                    console.log("Error retrieving data: " + error);
                }
            });
        } else {
            console.log("Login error: " + error);
        }
    });
}
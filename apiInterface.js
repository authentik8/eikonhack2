var MSF = require("./MSF");
var fs = require('fs');
var username = "eikonstudent33@thomsonreuters.com";
var password = "Secret123";

var msf = new MSF(true);

var start = "2014-11-21T00:00:00";
var end = "2014-11-21T00:59:59";
var newsArr = [];

var prevLastArticleDate = "";

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
                for (var i = 0; i < response.Headlines.length; i++) {
                    newsArr.push(response.Headlines[i]);
                }
                var lastArticleDate = response.Headlines[response.Headlines.length - 1].LastUpdateDateTime;
                console.log(lastArticleDate);
                if (lastArticleDate != prevLastArticleDate) {
                    end = lastArticleDate;
                    prevLastArticleDate = lastArticleDate
                    makeNewsRequest();
                } else {
                    //console.log(newsArr.length);
                    var mentionCounter = require('./mentionCount.js');

                    var mentionCount = mentionCounter.count(newsArr);

                    var mentionTop = mentionCount.filter(function (el) {
                        return el.mentions >= 3;
                    });

                    var tickers = mentionTop.map(function (node) { return node.ticker; });
                    
                    

                    console.log(tickers);
                }
            }
        }
        
    );
}


exports.getHeadlineData = function () {
    msf.login(username, password, function (error) {
        if (!error) {
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
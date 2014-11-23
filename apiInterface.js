var MSF = require("./MSF");
var fs = require('fs');
//API Credentials
var username = "eikonstudent33@thomsonreuters.com";
var password = "Secret123";

var msf = new MSF(true);

//Variables representing start & end dates for the financial mention query
var start = "2014-11-21T00:00:00";
var end = "2014-11-21T04:59:59";

//Variable to aggregate headline queries into
var newsArr = [];

//Global variables to capture information to be returned
var mentionTop = [];
var priceHistory = [];
var outstandingShs = [];

//Variables representing callback & response object (can make calls to this to display data)
var callbackFunc;
var responseObject = {};

//Variables to track when price history & outstanding shares queries have completed
var priceHistoryComplete = false;
var outstandingShsComplete = false;
var mentionsComplete = false;

/*
 * Variable to keep track of the last story date 
 * (to work out when we have successfully downloaded all stories for a given period)
 */
var prevlastArticleTimestamp = "";

//Function to display data in browser (as opposed to returning to console)


//Externally exposed function called by server.js to initiate download procedures
exports.getHeadlineData = function (respObject, callback) {
    msf.login(username, password, function (error) {
        if (!error) {
            callbackFunc = callback;
            responseObject = respObject;
            makeNewsRequest();
        }
    });
}

/* Recursively called function to aggregate blocks of 20 news articles
 * into a list representing all for the period (initially called by getHeadlineData() )
 */
function makeNewsRequest() {
    msf.getData(
        {
            "Entity": {
                "E": "NewsArticles",
                "W": {
                    "Codes": "A:1",
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

                } else {
                    //We have finished aggregating the news articles
                    
                    //Import the mentionCounter module
                    var mentionCounter = require('./mentionCount.js');
                    
                    /*Create an array of 
                     * [{ "ticker":"GPRO.O", "mentions":2 },......]
                     * representing the number of times each ticker is found in the news article list
                     */
                    var mentionCount = mentionCounter.count(newsArr);
                    
                    //Filter out the noise of companies mentioned only once or twice
                    mentionTop = (mentionCount.filter(function (el) {
                        return el.mentions >= 3;
                    }));
                    
                    // Extract the list of tickers from the more-often mentioned companies (>=3)
                    var tickers = mentionTop.map(function (node) { return node.ticker; });
                    
                    fs.writeFile('mentionTop.json', JSON.stringify(mentionTop));
                    
                    mentionsComplete = true;
                    
                    makePriceRequest(tickers);
                }
            }
        }
        
    );
}

//function makeSlicedPriceRequest(fullTickerList){

//    var splitArray = [];   

//    var i, j, chunk = 20;
//    for (i = 0, j = fullTickerList.length; i < j; i += chunk) {
//        splitArray.push(fullTickerList.slice(i, i + chunk));
//    }

//    var outstandingRequests = 0;

//    for (var k = 0; k < splitArray.length; k++) {
//        outstandingRequests++;
//        makePartialPriceRequest(splitArray[k], function () {
//            outstandingRequests--;
//        });
//    }

//    while (outstandingRequests != 0) {
//        process.nextTick();
//    }



//}

//function makePartialPriceRequest(tickerListSlice,callback) {
//    msf.getData({
//        "Entity": {
//            "E": "TATimeSeries",
//            "W": {
//                "Tickers": tickerListSlice,
//                "NoInfo": false,
//                "Interval": "Daily",
//                "IntervalMultiplier": 1,
//                "DateRangeMultiplier": 1,
//                "StartDate": start,
//                "EndDate": start,
//                "Analysis": [
//                    "OHLCV"
//                ]
//            }
//        }
//    }, function (error, response) {
//        if (!error) {
//            var hist = response.R.filter(function (filterNode) {
//                return (filterNode.Data.length != 0);
//            }).map(function (node) {
//                    var obj = {};
//                    obj.ticker = node.Ticker;
//                    var open = parseFloat(node.Data[0].Open);
//                    var close = parseFloat(node.Data[0].Close);
//                    obj.performance = (close - open) / open;
//                    obj.date = node.Data[0].Date;
//                    return obj;
//                });

//            for (var i = 0; i < hist.length; i++) {
//                priceHistory.push(hist[i]);
//            }

//            callback();
//        }
//    });
//}

function makePriceRequest(tickers) {
    msf.getData({
        "Entity": {
            "E": "TATimeSeries",
            "W": {
                "Tickers": tickers,
                "NoInfo": false,
                "Interval": "Daily",
                "IntervalMultiplier": 1,
                "DateRangeMultiplier": 1,
                "StartDate": start,
                "EndDate": start,
                "Analysis": [
                    "OHLCV"
                ]
            }
        }
    }, function (error, response) {
        if (!error) {
            console.log("Processing price request");
            var hist = response.R.filter(function (filterNode) {
                return (filterNode.Data.length != 0);
            }).map(function (node) {
                    var obj = {};
                    obj.ticker = node.Ticker;
                    var open = parseFloat(node.Data[0].Open);
                    obj.close = parseFloat(node.Data[0].Close);
                    obj.performance = (obj.close - open) / open;
                    obj.date = node.Data[0].Date;
                    return obj;
                });
            
            for (var i = 0; i < hist.length; i++) {
                priceHistory.push(hist[i]);
            }
            
            fs.writeFile('priceHistory.json', JSON.stringify(priceHistory));
            priceHistoryComplete = true;
            
            
            makeOutstandingSharesRequest(tickers);
        }
    });
}

function makeOutstandingSharesRequest(tickers) {
    msf.getData({
        "Entity": {
            "E": "Financials",
            "W": {
                "Symbols": tickers.slice(0, 20),
                "COACodes": [
                    "QTCO"
                ],
                "Type": "ABS",
                "NumberOfPeriods": 1,
                "ReportBasis": "A",
                "SymbolType": "RIC"
            }
        }
    }, function (error, response) {
        if (!error) {
            console.log("Processing outstanding request");
            outstandingShs = response[""].filter(function (em) {
                return (em.Error == undefined);
            }).map(function (node) {
                    return shareInfo = { "ticker": node.MsfId , "outstandingShares" : getOutstandingShares(node) };
                });
            tickers.forEach(function (ticker) {
                if (outstandingShs.map(function (item) { return item.ticker; }).indexOf(ticker) == -1) {
                    outstandingShs.push(shareInfo = { "ticker": ticker, "outstandingShares" : 0 });
                }
            });
            outstandingShs = outstandingShs.filter(function (node) {
                return (node.outstandingShares != 0);
            })
            
            fs.writeFile('outstandingShares.json', JSON.stringify(outstandingShs));
            outstandingShsComplete = true;
            
            zipArrays();
            
        }
    });
}

function getOutstandingShares(financialData) {
    var outstandingShares = 0;
    
    var units = financialData.StandardizedFinancials.FinancialInformation
                .FinancialStatements.Period[0].PeriodFilings.PeriodFiling[0].PeriodFilingHeader
                .Units.ConvertedTo;
    
    console.log(financialData.MsfId);
    
    var shares = 0;
    
    if (financialData.StandardizedFinancials.FinancialInformation.FinancialStatements.Period[0].PeriodFilings.PeriodFiling[0].Statements.Statement[0].FinancialValues.FV != undefined) {
        shares = financialData.StandardizedFinancials.FinancialInformation
                .FinancialStatements.Period[0].PeriodFilings.PeriodFiling[0].Statements
                .Statement[0].FinancialValues.FV[0].___MSFVALUE;
    }
    if (units == "M") {
        outstandingShares = shares * 1000000;
    } else if (units == "T") {
        outstandingShares = shares * 1000;
    }
    
    return outstandingShares;
}

function zipArrays() {
    var respJson = { "mentions": mentionTop, "performance": priceHistory, "outstandingShares": outstandingShs };
    
    var aggregate = [];
    
    respJson.mentions.forEach(function (node) {
        aggregate.push(node);
    });
    
    respJson.performance.forEach(function (node) {
        var tickerPos = aggregate.map(function (aggregateNode) {
            return aggregateNode.ticker;
        }).indexOf(node.ticker);
        if (tickerPos != -1) {
            aggregate[tickerPos].performance = node.performance;
            aggregate[tickerPos].date = node.date;
            aggregate[tickerPos].close = node.close;
        }
    });
    
    respJson.outstandingShares.forEach(function (node) {
        var tickerPos = aggregate.map(function (aggregateNode) {
            return aggregateNode.ticker;
        }).indexOf(node.ticker);
        if (tickerPos != -1) {
            aggregate[tickerPos].marketCap = aggregate[tickerPos].close * node.outstandingShares;
        }
    })
    callbackFunc(responseObject, aggregate.filter(function (node) {
            return node.marketCap != undefined;
        }));

}
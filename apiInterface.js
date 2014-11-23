var MSF = require("./MSF");
var fs = require('fs');
//API Credentials
var username = "eikonstudent33@thomsonreuters.com";
var password = "Secret123";

var msf = new MSF(true);

//Variables representing start & end dates for the financial mention query
var start = "2014-11-19T00:00:00";
var end = "2014-11-19T23:59:59";
var mentionVar = 3;

//Variable to aggregate headline queries into
var newsArr = [];

//Global variables to capture information to be returned
var mentionTop = [];
var priceHistory = [];
var outstandingShs = [];

//Variables representing callback & response object (can make calls to this to display data)
var callbackFunc;
//var responseObject = {};

//Variables to track when price history & outstanding shares queries have completed
var priceHistoryCount = 0;
var outstandingShsCount = 0;
var mentionsComplete = false;

/*
 * Variable to keep track of the last story date 
 * (to work out when we have successfully downloaded all stories for a given period)
 */
var prevlastArticleTimestamp = "";

/*
 * Variable to keep track of the current price history slice
 * (to work out when we have successfully downloaded all price histories for a given period)
 */
var tickerList = [];
var origTickerList = [];


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
                if (lastArticleTimestamp !== prevlastArticleTimestamp) {
                    
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
                        return el.mentions >= mentionVar;
                    }));
                    
                    // Extract the list of tickers from the more-often mentioned companies (>=3)
                    tickerList = mentionTop.map(function (node) { return node.ticker; });
                    for (var j = 0; j < tickerList.length; j++) {
                        origTickerList.push(tickerList[j]);
                        
                        mentionsComplete = true;
                        
                        //makePriceRequest(tickerList);
                        
                        makeSplicedPriceRequest();
                    
                    }
                }
            }
        
        });
}

function makeSplicedPriceRequest() {
    var thisSplice = tickerList.splice(0, 10);
    priceHistoryCount++;
    console.log(priceHistoryCount);
    msf.getData({
        "Entity": {
            "E": "TATimeSeries",
            "W": {
                "Tickers": thisSplice,
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
            makeOutstandingSharesRequest(thisSplice);
        }
    });
}

function makeOutstandingSharesRequest(tickers) {
    outstandingShsCount++;
    console.log(outstandingShsCount);
    
    msf.getData({
        "Entity": {
            "E": "Financials",
            "W": {
                "Symbols": tickers,
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
            if (tickerList.length != 0) {
                makeSplicedPriceRequest();
            } else {
                outstandingShs = outstandingShs.filter(function (node) {
                    return (node.outstandingShares !== 0);
                });
                
                zipArrays();
            }
            
        }
    });
}

function getOutstandingShares(financialData) {
    var outstandingShares = 0;
    
    var units = "O";
    try {
        console.log(financialData.MsfId);
    } catch (err) { }
    var shares = 0;
    
    try {
        if (financialData.StandardizedFinancials.FinancialInformation.FinancialStatements.Period != undefined) {
            if (financialData.StandardizedFinancials.FinancialInformation.FinancialStatements.Period[0].PeriodFilings.PeriodFiling != undefined) {
                units = financialData.StandardizedFinancials.FinancialInformation
                .FinancialStatements.Period[0].PeriodFilings.PeriodFiling[0].PeriodFilingHeader
                .Units.ConvertedTo;
            }
        }
        
        
        if (financialData.StandardizedFinancials.FinancialInformation.FinancialStatements.Period[0].PeriodFilings.PeriodFiling[0].Statements.Statement[0].FinancialValues.FV != undefined) {
            shares = financialData.StandardizedFinancials.FinancialInformation
                .FinancialStatements.Period[0].PeriodFilings.PeriodFiling[0].Statements
                .Statement[0].FinancialValues.FV[0].___MSFVALUE;
        }
    } catch (err) {
    }
    if (units == "M") {
        outstandingShares = shares * 1000000;
    } else if (units == "T") {
        outstandingShares = shares * 1000;
    } else if (units == "O") {
        outstandingShares = shares;
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
    });
    
    aggregate = aggregate.filter(function (node) {
        return (node.marketCap != undefined && node.marketCap != null);
    });
    
    fs.writeFile("aggregated-file-data-19-11.json", JSON.stringify(aggregate, false, 2));
    
    callbackFunc(aggregate);
}

//Externally exposed function called by server.js to initiate download procedures
exports.getHeadlineData = function (callback) {
    msf.login(username, password, function (error) {
        if (!error) {
            callbackFunc = callback;
            makeNewsRequest();
        }
    });
}
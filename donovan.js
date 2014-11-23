/* 
 {
    "array": [
        {
            "ticker": "TWTR",
            "mentions": "1515",
            "market-cap": "7000000000",
            "performance": "-0.0152"
        }
    ]
}
*/

//var tickersArray = []; 

var data; // response from API Call

var jsonArr = []; // JSON ouput
var dataSet =  data.Headlines;
var dataSetLength = dataSet.length;

for (var i = 0; i < dataSetLength; i++){
    
    var rics = data.Headlines[i].PrimaryRics;
    
    // Filter Articles without Ticker & Articles with Currency Ticker
    if (rics != undefined && rics.indexOf("=") == -1){
        
        // Split multiple Tickers
        if (rics.indexOf(" ") > -1){
            
            var result = rics.split(" ");
            for (var j = 0; j < result.length; j++){
                if (hasTicker(jsonArr, rics)){              
                    updateCount(jsonArr, rics); 
                } else {
                    addTicker(jsonArr, rics);
                }
            }

        } else {
            if (hasTicker(jsonArr, rics)){              
                updateCount(jsonArr, rics); 
            } else {
                addTicker(jsonArr, rics);
            }
        }
    }
}

function addTicker(data, ticker){
    data.push({
        ticker: ticker,
        mentions: 1
    });
    // tickersArray[tickersArray.length] = ticker;
}

function hasTicker(data, ticker) {
  return data.some(function (el) {
    return el.ticker === ticker;
  });
}

function updateCount(data, ticker) {
  for (var i=0; i < data.length; i++) {
    if (data[i].ticker === ticker) {
      data[i].mentions = data[i].mentions + 1;
      return;
    }
  }
}

function calculatePerformance(priceDataSet){
    var priceData =  priceDataSet.R[0].Data;
    // Last Day - Close Price 
    var closePrice = priceData[priceData.length-1].Close;
    // First Day - Open Price
    var openPrice = priceData[0].Open;
    var performance = (closePrice - openPrice) / openPrice;
    return performance;
}

function getoutstandingShares(financialData){
   
   var outstandingShares = 0;  
   
   var units = financialData[""][0].StandardizedFinancials.FinancialInformation
                .FinancialStatements.Period[0].PeriodFilings.PeriodFiling[0].PeriodFilingHeader
                .Units.ConvertedTo;
   
   var shares = financialData[""][0].StandardizedFinancials.FinancialInformation
                .FinancialStatements.Period[0].PeriodFilings.PeriodFiling[0].Statements
                .Statement[0].FinancialValues.FV[0].MSFVALUE;

   if (units == "M"){
       outstandingShares = shares * 1000000;
   } else if (units == "T"){
       outstandingShares = shares * 1000;
   }
   
   return outstandingShares;
}

// if end = "2014-11-21T23:59:59" & dayApart = 0
// return "2014-11-21T00:00:00"

var end = "2014-11-21T23:59:59";
function getStartDate(end, dayApart){
    var endDate = new Date(end);
    var temp = new Date(endDate);
    temp.setDate(temp.getDate() - dayApart);
    var startDate = new Date(temp);
    var dateString = (startDate.getYear()+1900) + "-" + (startDate.getMonth()+1) + "-" + startDate.getDate() + "T00:00:00";
    return dateString;
}


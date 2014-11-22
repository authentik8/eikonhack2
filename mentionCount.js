var data; // response from API Call

var jsonArr = []; // JSON ouput
var dataSet =  data.Headlines;
var dataSetLength = dataSet.length;

for (var i = 0; i < dataSetLength; i++){
    
    var rics = data.Headlines[i].PrimaryRics;
    
    // Filter Articles without Ticker & Articles with Currency Ticker
    if (rics != undefined && rics.indexOf("=") == -1){
        
        if (rics.indexOf(" ") > -1){
            
            var result = rics.split(" ");
            for (var j = 0; j < result.length; j++){
                 addTicker(jsonArr, result[j]);
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

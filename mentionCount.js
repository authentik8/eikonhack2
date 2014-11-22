exports.count = function (data)
{
 // response from API Call
    var array = [];
    var dataSet = data;
    var dataSetLength = data.length;
    
    for (var i = 0; i < dataSetLength; i++) {
        
        var rics = data[i].PrimaryRics;
        
        // Filter Articles without Ticker & Articles with Currency Ticker
        if (rics != null && rics != undefined && rics.indexOf("=") == -1) {
            
            if (rics.indexOf(" ") > -1) {
                
                var result = rics.split(" ");
                for (var j = 0; j < result.length; j++) {
                    if (hasTicker(array, result[j])) {
                        updateCount(array, result[j]);
                    } else {
                        addTicker(array, result[j]);
                    }
                }

            } else {
                if (hasTicker(array, rics)) {
                    updateCount(array, rics);
                } else {
                    addTicker(array, rics);
                }
            }
        }
    }
    return array;
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

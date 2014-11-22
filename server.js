var server = require('./node_modules/node-router/lib/node-router.js').getServer();

server.get("/", function (request, response) {
    
    function isBigEnough(element) {
        return element >= 10;
    }
   
    
    //var ret = mentionCounter.count(input);
    response.simpleText(200, "Hello World!");
});

server.get("/test", function (request, response) {
    response.simpleText(200, "Test response");
    var apiInterface = require('./apiInterface.js');
    apiInterface.getHeadlineData();
})

server.listen(8000, "localhost");
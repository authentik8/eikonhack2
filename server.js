var server = require('./node_modules/node-router/lib/node-router.js').getServer();

server.get("/", function (request, response){
    response.simpleText(200, "Hello World!");
});

server.get("/test", function (request, response) {
    //response.simpleText(200, "Test response");
    var apiInterface = require('./apiInterface.js');
    apiInterface.getHeadlineData(apiCallback);
})

server.listen(8000, "localhost");

function apiCallback(mentions, performance, outstandingShares){
    var respJson = { "mentions": mentions, "performance": performance, "outstandingShares": outstandingShares };
    response.simpleJSON(200, respJson);
}
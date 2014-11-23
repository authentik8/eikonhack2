var server = require('./node_modules/node-router/lib/node-router.js').getServer();

function apiCallback(respObject,respJson) {
        respObject.simpleJson(200, respJson);
}

server.get("/", function (request, response){
    response.simpleText(200, "Hello World!");
});

server.get("/test", function (request, response) {
    //response.simpleText(200, "Test response");
    var apiInterface = require('./apiInterface.js');
    apiInterface.getHeadlineData(response,apiCallback);
})

server.listen(8000, "localhost");


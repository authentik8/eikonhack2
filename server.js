var server = require('./node_modules/node-router/lib/node-router.js').getServer();
var globalResp = { "Error": "Data not prepared yet" }
function apiCallback(respJson) {
        globalResp = respJson;
}

var apiInterface = require('./apiInterface.js');
apiInterface.getHeadlineData(apiCallback);

server.get("/", function (request, response){
    response.simpleText(200, "Hello World!");
});

server.get("/test", function (request, response) {
    response.simpleJson(200,globalResp);
})

server.listen(8000, "localhost");


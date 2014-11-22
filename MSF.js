var https = require('https');

function MSF() {
}

MSF.prototype.MSF_URL = "amers1.msf2.cp.reutest.com";
MSF.prototype.LOGIN_PATH = "/msf/auth/login";
MSF.prototype.SERVICE_PATH = "/msf";

MSF.prototype._cookie = null;

MSF.prototype.login = function(username, password, callback) {
	var buffer = new Buffer(username+":"+password);
	var b64 = buffer.toString('base64');
	var authValue = "Basic "+b64;
	var headers = {
		"Authorization": authValue
	};
	var options = {
		hostname: this.MSF_URL,
		port: 443,
		path: this.LOGIN_PATH,
		method: 'POST',
		headers: headers
	};

	var req = https.request(options, function(res) {
		res.on('data', function(data) {
			//Ignore data here
		});
		if (res.statusCode == 200) {
			var cookie = res.headers['set-cookie'];
			this._cookie = cookie;
			callback(null);
		} else {
			callback("Unable to login - HTTP STATUS "+res.statusCode);
		}
	}.bind(this));
	req.on('error', function(e) {
		callback(e)
	}.bind(this));
	req.end();
}

MSF.prototype.getData = function(param, callback) {
	
	if (this._cookie == null) {
		callback(new Error("Error: Not login yet"));
		return;
	}

	var headers = {
		"Cookie": this._cookie,
		"Content-Type": "application/json"
	};
	var options = {
		hostname: this.MSF_URL,
		port: 443,
		path: this.SERVICE_PATH,
		method: 'POST',
		headers: headers
	};
	var req = https.request(options, function(res) {
		res.setEncoding('utf-8');
		var responseString = '';
		res.on('data', function(data) {
			responseString += data;
		});
		res.on('end', function() {
			var resultObject = JSON.parse(responseString);
			callback(null, resultObject);
		}.bind(this));
	}.bind(this));
	req.on('error', function(e) {
		callback(e)
	});
	req.write(JSON.stringify(param));
	req.end();
}

module.exports = MSF;

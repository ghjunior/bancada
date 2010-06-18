require.paths.unshift('lib/vendor/');

var http = require('http'), 
		url = require('url'),
		fs = require('fs'),
		io = require('Socket.IO-node/lib/socket.io'),
		sys = require('sys'),
		path = require('path'),
		paperboy = require('node-paperboy/lib/paperboy'),
		PORT = 8080,
		WEBROOT = "../client",

// --------------------------
// static http server stuff
// --------------------------
server = http.createServer(function(req, res) {
  var ip = req.connection.remoteAddress;
  paperboy
    .deliver(WEBROOT, req, res)
    .addHeader('Expires', 300)
    .addHeader('X-PaperRoute', 'Node')
    .before(function() {
      sys.log('Received Request')
    })
    .after(function(statCode) {
      log(statCode, req.url, ip);
    })
    .error(function(statCode,msg) {
      res.writeHead(statCode, {'Content-Type': 'text/plain'});
      res.write("Error: " + statCode);
      res.close();
      log(statCode, req.url, ip, msg);
    })
    .otherwise(function(err) {
      var statCode = 404;
      res.writeHead(statCode, {'Content-Type': 'text/plain'});
      log(statCode, req.url, ip, err);
    });
});

server.listen(PORT);

function log(statCode, url, ip,err) {
  var logStr = statCode + ' - ' + url + ' - ' + ip
  if (err)
    logStr += ' - ' + err;
  sys.log(logStr);
}

	
// --------------------------
// socket server stuff
// --------------------------
var json = JSON.stringify, totalClients = 0, bancada = [];

var socket = io.listen(server, {
	
	onClientConnect: function(client) {
		totalClients ++;
		
		client.send(json({type:'initBancada', data:bancada}));
		
		this.broadcast(json({type:'connect', data:totalClients}));
	},
	
	onClientDisconnect: function(client) {
		totalClients --;
		
		this.broadcast(json({type:'disconnect', data:totalClients}));
	},
	
	onClientMessage: function(message, client) {
		message = JSON.parse(message);
	
		sys.log("Received -> " + message + " = " + message.type);
		
		switch(message.type) {
			case 'create':
				create(message.data);
				break;
			case 'move':
				move(message.data, client);
				break;
			default:
				break;
		}
	}
	
});

function create(data) {
	var id = bancada.length;
	
	bancada[id] = {'id':'bancada-element-' + id, 'type':'img', 'url':data, 'x':0, 'y':0};
	
	socket.broadcast(json({type:"create", data:bancada[id]}));
}

function move(data, client) {
	var id = data.id.substr(data.id.lastIndexOf('-') + 1);

	var movedObj = bancada[id];
	movedObj.x = data.x;
	movedObj.y = data.y;
	
	client.broadcast(json({type:"move", data:bancada[id]}));
}

/*setInterval(
	function() {
		sys.log("Connected Clients = " + socket.clients.length);
		if (socket.clients.length > 0) sys.log("Clients = " + socket.clients);
	}, 5000);*/
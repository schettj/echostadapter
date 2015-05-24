/// <reference path="typings/node/node.d.ts"/>
module.exports.settings = { 'serviceport' : 8281 };

var settings = module.exports.settings;

var server;

var fs = require('fs');
var http = require('http');
var qs = require('querystring');
var urlparser = require('url');
var request = require('request');


var dgram = require('dgram');
//var state = require('./state');
var ip = require('ip').address()
var port = settings.serviceport;

// magic values
var AUTH =  "Bearer uuid"
var SMARTAPP = "https://graph.api.smartthings.com/api/smartapps/installations/yyyyyy"

// Credit to Sagen here - the UPnP M-SEARCH response
// taken from https://github.com/sagen/hue-upnp


exports.addRoutes = function(server) {
};

// credit to https://github.com/armzilla/amazon-echo-ha-bridge - respond to M-SEARCH as WeMo, then use HUE description.xml

exports.enableDiscovery = function() {

    var s = dgram.createSocket('udp4');
    s.bind(1900, undefined, function() {
        console.log('UPnP discovery started')
        s.addMembership('239.255.255.250');
        s.on('message', function(msg, rinfo) {
            var msgString = msg.toString();
            if (msgString.substr(0, 10) == 'M-SEARCH *') {
                console.log('M-SEARCH Message received')
                console.log(rinfo);
                var response = "HTTP/1.1 200 OK\r\n\
CACHE-CONTROL: max-age=100\r\n\
EXT:\r\n\
LOCATION: http://" + ip + ":" + port + "/description.xml\r\n\
SERVER: FreeRTOS/6.0.5, UPnP/1.0, IpBridge/0.1\r\n\
ST: urn:Belkin:device:**\r\n\
USN: uuid:Socket-1_0-221438K0100073::urn:Belkin:device:**\r\n\r\n"
                var responseBuffer = new Buffer(response);
                s.send(responseBuffer, 0, responseBuffer.length, rinfo.port, rinfo.address);
            }
        })
    });

    // this should be what Hue says, but it doesn't seem to work.
    //ST: upnp:rootdevice\r\n\
    //USN: uuid:2fa00080-d000-11e1-9b23-001f80007bbe::upnp:rootdevice\r\n\r\n";

    var Hapi = require('hapi');

    var server = new Hapi.Server();
    server.connection({address:'0.0.0.0', port: 1902});
    server.route( {
        method: 'GET'
        , path: '/description.xml'
        , handler: function(request) {
            request.reply(discoveryResponse)
                .header('Content-Type', 'text/xml');
        }});
    server.start();

};


var bridgejson = '{\
    "name": "Philips hue",\
    "zigbeechannel": 15,\
    "mac": "00:17:88:00:00:00",\
    "dhcp": true,\
    "ipaddress": "BASEIP",\
    "netmask": "255.255.255.0",\
    "gateway": "10.0.0.1",\
    "proxyaddress": "none",\
    "proxyport": 0,\
    "UTC": "2014-07-17T09:27:35",\
    "localtime": "2014-07-17T11:27:35",\
    "timezone": "Europe/Madrid",\
    "whitelist": {\
        "ffffffffe0341b1b376a2389376a2389": {\
            "last use date": "2014-07-17T07:21:38",\
            "create date": "2014-04-08T08:55:10",\
            "name": "PhilipsHueAndroidApp#TCT ALCATEL ONE TOU"\
        },\
        "pAtwdCV8NZId25Gk": {\
            "last use date": "2014-05-07T18:28:29",\
            "create date": "2014-04-09T17:29:16",\
            "name": "MyApplication"\
        },\
        "gDN3IaPYSYNPWa2H": {\
            "last use date": "2014-05-07T09:15:21",\
            "create date": "2014-05-07T09:14:38",\
            "name": "iPhone Web 1"\
        }\
    },\
    "swversion": "01012917",\
    "apiversion": "1.3.0",\
    "swupdate": {\
        "updatestate": 0,\
        "url": "",\
        "text": "",\
        "notify": false\
    },\
    "linkbutton": false,\
    "portalservices": false,\
    "portalconnection": "connected",\
    "portalstate": {\
        "signedon": true,\
        "incoming": false,\
        "outgoing": true,\
        "communication": "disconnected"\
    }\
}';


var bridgexml='<root xmlns="urn:schemas-upnp-org:device-1-0">\
   <specVersion>\
      <major>1</major>\
      <minor>0</minor>\
   </specVersion>\
   <URLBase>http://BASEIP:BASEPORT/</URLBase>\
   <device>\
      <deviceType>urn:schemas-upnp-org:device:Basic:1</deviceType>\
      <friendlyName>Philips hue (BASEIP)</friendlyName>\
      <manufacturer>Royal Philips Electronics</manufacturer>\
      <manufacturerURL>http://www.philips.com</manufacturerURL>\
      <modelDescription>Philips hue Personal Wireless Lighting</modelDescription>\
      <modelName>Philips hue bridge 2012</modelName>\
      <modelNumber>929000226503</modelNumber>\
      <modelURL>http://www.meethue.com</modelURL>\
<serialNumber>01189998819991197253</serialNumber>\
<UDN>uuid:88f6698f-2c83-4393-bd03-cd54a9f8595</UDN>\
<serviceList>\
<service>\
<serviceType>(null)</serviceType>\
<serviceId>(null)</serviceId>\
<controlURL>(null)</controlURL>\
<eventSubURL>(null)</eventSubURL>\
<SCPDURL>(null)</SCPDURL>\
</service>\
</serviceList>\
<presentationURL>index.html</presentationURL>\
      <iconList>\
         <icon>\
            <mimetype>image/png</mimetype>\
            <height>48</height>\
            <width>48</width>\
            <depth>24</depth>\
            <url>hue_logo_0.png</url>\
        </icon>\
        <icon>\
           <mimetype>image/png</mimetype>\
           <height>120</height>\
           <width>120</width>\
           <depth>24</depth>\
           <url>hue_logo_3.png</url>\
        </icon>\
      </iconList>\
   </device>\
</root>';


// my ST "lights" - just switchs

var lights;


function emptycb() {
    console.log("lights fetched");
}   

// get all light status 
fetchlights(emptycb);
makeserver();
exports.enableDiscovery();

// get map of light device id + name (order of lights will be HUE light #)
// assumes webapi installed and oath credentials below
function fetchlights(cb) {
	    var req = {"headers": {"Content-Type": "application/json", "Authorization": AUTH},
                 "uri": SMARTAPP + "/details/switch"};
        
        var sendreq = {};
        sendreq.headers = req.headers;
        sendreq.uri = req.uri;
        sendreq.method = "GET";
        sendreq.followRedirect = true;
		request(sendreq, function (err, res, body) {
            // console.log("SUCCESS: ", err);
            try {
                var jlights = JSON.parse(body);
                if (jlights.hasOwnProperty("devices")) {
                    lights = jlights.devices;
				}
			 } catch (e) {
                console.log(e);
                console.log(body);
            }
            cb()
        });
}

// set a light on/off/dim
function setLight(dev,staterec) {
	    var req = {"headers": {"Content-Type": "application/json", "Authorization": AUTH},
                 "uri": SMARTAPP + "/" + dev};
                
        var sendreq = {};
        var bodyStr = JSON.stringify({state: staterec},
                               undefined, 0);
        sendreq.body = bodyStr;

        sendreq.headers = req.headers;
        sendreq.uri = req.uri;
        sendreq.method = "PUT";
        sendreq.followRedirect = true;
		request(sendreq, function (err, res, body) {
            //console.log("SUCCESS PUT: ", err);
        });
    
}

function makeserver() {
    // create the server - callback called when requests come in
    
    var server = http.createServer(onRequest);
    
    // we're done - except for the callback - give access to the server
    module.exports.server = server;
    
    // listen on the port
    server.listen(settings.serviceport);
    
    // nested callback function called when requests come in
    function onRequest(request, response) {

        var parsedreq = urlparser.parse(request.url, true);
        console.log(request.url);
        var req = parsedreq.pathname.split("/");

        var requestBody = '';
        var action = req[1];
        var a2 = req[2];
        var a3 = req[3];
        var a4 = req[4];

        try {
            if (request.method == "GET") {
                // /api/<username>/config
                if (action == "description.xml") {
                    // return config
                    response.writeHead(200, { 'Content-Type': 'application/xml' });
                    //[{"success":{"username": "1234567890"}}]
                    bridgexml = bridgexml.replace("BASEIP", require('ip').address()).replace("BASEPORT", settings.serviceport);
                    response.end(bridgexml);
                } else
                    if ((action == "api") && (a3 == "config")) {
                        // return config
                        response.writeHead(200, { 'Content-Type': 'application/json' });
                        //[{"success":{"username": "1234567890"}}]
                        bridgejson = bridgejson.replace("BASEIP", require('ip').address()).replace("BASEPORT", settings.serviceport);
                        response.end(bridgejson);

                    }
                if ((action == "api") && (a3 == "lights")) {
                    // return "fresh" lights
                    fetchlights(function () {
                        response.writeHead(200, { 'Content-Type': 'application/json' });
                        response.write("{")
                        if (req.length == 4) {
                            // all lights
                            var i;
                            for (i = 0; i < lights.length; i++) {
                                if (i != 0) response.write(',');
                                response.write('"' + (i + 1) + '": { "state": {"on": ' + ((lights[i].state.switch == "on") ? "true" : "false") + ',"bri":' + Math.floor(255 * lights[i].state.level / 100) + ',"hue": 13088,"sat": 212, "xy": [0.5128,0.4147],"ct": 467,\
        "alert": "none","effect": "none","colormode": "xy", "reachable": true},"type": "Extended color light",\
        "name": "'+ lights[i].label + '", "modelid": "LCT001","swversion": "66009461", "pointsymbol": {\
            "1": "none", "2": "none", "3": "none","4": "none", "5": "none","6": "none","7": "none","8": "none" }}');
                            }
                        } else {
                            // one light
                            var i = parseInt(a4) - 1;
                            response.write('"state": {"on": ' + ((lights[i].state.switch == "on") ? "true" : "false") + ',"bri":' + Math.floor(255 * lights[i].state.level / 100) + ',"hue": 13088,"sat": 212, "xy": [0.5128,0.4147],"ct": 467,\
        "alert": "none","effect": "none","colormode": "xy", "reachable": true},"type": "Extended color light",\
        "name": "'+ lights[i].label + '", "modelid": "LCT001","swversion": "66009461", "pointsymbol": {\
            "1": "none", "2": "none", "3": "none","4": "none", "5": "none","6": "none","7": "none","8": "none" }');

                        }
                        response.end("}");
                    });
                }
            } else if (request.method == "PUT") {
                /*
                http://<bridge ip address>/api/newdeveloper/lights/1/state
                        Body 	{"on":true, "sat":255, "bri":255,"hue":10000}
                */
                request.on('data', function (data) {
                    requestBody += data;
                    if (requestBody.length > 1e7) {
                        response.writeHead(413, "Request Entity Too Large", { 'Content-Type': 'text/html' });
                        response.end('<html><head><title>413</title></head><body>413: Request Entity Too Large</body></html>');
                    }
                });
                request.on('end', processPut);

                function processPut() {
                    response.writeHead(200, { 'Content-Type': 'application/json' });
                    if ((action == "api") && (a3 == "lights") && (req.length == 6)) {
                        var i = parseInt(a4) - 1;
                        var state = {};
                        var rec = JSON.parse(requestBody);
                        if (rec.hasOwnProperty("on")) { state["switch"] = rec.on ? "on" : "off"; }
                        if (rec.hasOwnProperty("bri")) { state["level"] = Math.floor((100 * rec.bri) / 255); }
                        console.log(state);
                        setLight(lights[i].id, state);

                    }
                    response.end("{}");
                }


            } else if (request.method == "POST") {
                request.on('data', function (data) {
                    requestBody += data;
                    if (requestBody.length > 1e7) {
                        response.writeHead(413, "Request Entity Too Large", { 'Content-Type': 'text/html' });
                        response.end('<html><head><title>413</title></head><body>413: Request Entity Too Large</body></html>');
                    }
                });
                request.on('end', processPOST);

                function processPOST() {
                        
                    // debugging
                    console.log("rl: " + req.length + " Data: " + requestBody);

                    var rec = JSON.parse(requestBody);

                    if ((action == "api") && (req.length == 2)) {

                        var user = rec.username;
                        // return user accepted
                        response.writeHead(200, { 'Content-Type': 'application/json' });
                        //[{"success":{"username": "1234567890"}}]
                        response.end(JSON.stringify([{ "success": { "username": user } }], undefined, 1));
                    }
                }


            }
        }
        catch (e) {
            console.log(e);
            console.log(e.stack);
            response.writeHead(400, request.method + " not supported", { 'Content-Type': 'text/html' });
            response.end('<html><head><title>400</title></head><body>400: OOPS!</body></html>');

        }


    }


}

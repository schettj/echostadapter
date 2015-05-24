# echostadapter

## basic integration for Amazon Echo to SmartThings.

Respond to UPNP as a Wemo Bridge. Return service descritpion as a Hue bridge. Interpret Echo queries for listing lights, return lights from ST. Interpret Echo setting a light on/off/dim, forward request to ST.

## leveraged several other sources

Some credited in code, google is my co-pilot.

### Here There Be Dragons

install the WebApi.groovy SmartApp, enable oAuth, and generate your bearer channel/endpoint uri - you'd use a process similar to that shown here http://community.smartthings.com/t/tutorial-creating-a-rest-smartapp-endpoint/4331 - review the docs here http://docs.smartthings.com/en/latest/smartapp-web-services-developers-guide/implementation.html 

Once you have your bearer code and endpoint uri, put them into echosmart.js on lines 21/23

Start the bridge on your local network 

node echosmart.js 




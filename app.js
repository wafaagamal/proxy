httpProxy = require('http-proxy');
const express = require('express')
const app = express()
var preRequest=require('./preRequest')
const requestIp = require('request-ip');

var proxy = httpProxy.createProxyServer({});
proxy.on('proxyRes', function(proxyRes, req, res){
    // console.log("IN RESPONSE");
    console.log("response=================",proxyRes.statusCode)
    if(proxyRes.statusCode==404){
        preRequest.limit404()
    }
   
   
});
proxy.on('proxyReq', function(proxyReq, req, res) {
    console.log('on proxy request')
    })

 
app.use(requestIp.mw())
app.use(preRequest.detectIP())
app.use(preRequest.geoLocation())
app.use(preRequest.rateLimit())
app.get('/user',function(req, res) {
       // console.log('res1')
     //   res.status('404').send()
});


app.get('*',function(req, res) {
        proxy.web(req, res, {
            target: 'http://localhost:8000'              
        })
      
});



 app.listen(3000);       

var geoip = require('geoip-lite');
const requestIp = require('request-ip');
var redis = require("redis")
client = redis.createClient();
var region =require('./blockedCity.json')
var config=require('./config/config')

var ip;
var geoLoc={};
let i=0

var setPunishment=function(ip){
    console.log("***************setPunishment********************");
    
    client.EXISTS('punished'+ip,function(err,reply){
        if(reply){
          console.log("reply",reply);
            
          client.HINCRBY('punished'+ip,'Count',1,function(err,cnt){
              if(err){
                console.log(err);
              }
              else{
             console.log(cnt);
             if(cnt>3){
                 cnt=3
                }     
             console.log('*******************',config.punishment[cnt-1]);
             
             client.expire('blocked'+ip,config.punishment[cnt-1]);
            }
          })
  
          
        }
        else{
            client.hmset('punished'+ip,'Count',1,function(err,reply){
                if(err){
                    console.log(err);
                    
                   
                }
                else{
                    console.log(err);
                    console.log('*******************',config.punishment[0]);
                    client.expire('blocked'+ip,config.punishment[0]);

              }
  
        })
      }
  
    })
  }


//add ip&locatin in block list 
var blockIP=function(ip,geolocation,mode){
    console.log("inside blocking.......");
    
    client.hmset('blocked'+ip,'ip',ip,'geo',geolocation,function(err,reply){
        if(err){
            console.log(err);         
        }
        else{
            console.log('ip blocked successfully........');
            if(mode=='limit'){
                client.expire('valid'+ip,1);
                setPunishment(ip)
            }
            
        }
    })
}

var setValidIP=function(ip){
    console.log('**************inside set ip **************8');
    console.log('********************* ip:',ip);
    
    client.hmset('valid'+ip,'IP',ip,'Count',config.requestPerHour,function(err,reply){
        if(err){
            console.log(err);
            
        }
        else{
        client.expire('valid'+ip,60*60);
        }
    })

}
var set404IP= function(ip){
    console.log('**************inside set404IP **************8');
    console.log('********************* ip:',ip);
    
    client.hmset('404'+ip,'IP',ip,'Count',config.response404,function(err,reply){
        if(err){
            console.log(err);
            
        }
        else{
       console.log("4000000000004",reply);
        }
    })
  }

// var setPunishList=function(ip){

//      console.log('**************inside setPunishList **************8');
//      console.log('********************* ip:',ip);
 
//     let arr=["punish1","punish2","blocked"]
//     let blokedArrIP=[]
//     client.hmset('punish'+ip,'IP',ip,'Stauts',arr[i],function(err,reply){
//         if(err){
//             console.log(err);
            
//         }
//         else{
//             if(i==0){
//                 client.expire('blocked'+ip,60*60*60);
//                 i++;
//             }else if(i==1){
//                 client.expire('blocked'+ip,60*60*60*60);
//                 i++;
//             }else if(i==2){
//                console.log("Blocked");
//                i=0;
//                blokedArrIP.push(ip)
//                console.log("ARAAAA",i);

               
//             }
       
//         }
//     })
//   }




//middleware for detect ip&check ip in checklist
var detectIP= function(){
 return function(req, res,  next) {
    ip = req.clientIp;
   console.log(ip);
   // blockIP(ip,'cairo');
   console.log('CHECKING IP......');
   client.hgetall('blocked'+ip,function(err,reply){
       if(reply){
       console.log('reply',reply);

       console.log(ip," :in block list");
       res.status(403).send("Not allowed");
       }
       else{
       console.log('-----------ALLOWED IP-----------');
       next();
       }

   });
 }
}

//middleware for detect geolocation

var geoLocation = function(){
    return function(req, res,  next) {
    
    geoLoc=geoip.lookup(ip);
    console.log(geoLoc);
    
    if(geoLoc!=null||geoLoc!=undefined){
        
    if(region.indexOf(geoLoc.region)==-1){

        next()
      }
      else{
          blockIP(ip,geoLoc.region,"geo");
          res.status(403).send('not allowed');
         
      } 
  }
  else{
      console.log('*********you cannot get your location***********');
      geoLoc=""
      next();
  }
 }
}

var rateLimit=function(){
    return function(req, res,  next) {
        console.log('**************inside rateLimit*****************');
        
        console.log("*****************>ip:",ip);
        
    client.hgetall('valid'+ip,function(err,reply){

        if(err){
            console.log(err);
            
        }
        else{
            if(reply){
                console.log('------------>reply:',reply);
                
                if(reply.Count>0){
                        client.HINCRBY('valid'+ip,'Count',-1,function(err,reply){
                        console.log("Count",reply);
                        res.status(200).send("success")
                        next();
                        })
                    }
                else{

                    blockIP(ip,geoLoc,'limit')
                    res.status(403).send("not allowed")
                    }   
                 }
            else{
                 setValidIP(ip);
                 next();
            }     
        }   


    }) 
 }
}
var limit404=function(){
   
        console.log("inside Limit===============");
        
        client.hgetall("404"+ip,function(err,reply){
            if(err)
            {
                console.log(err);
            }
            if(reply){
                console.log("REPLYCOUNT",reply.Count);
                client.HINCRBY("404"+ip,"Count",-1,function(err,reply){
                    console.log("REPLYCOUNTincr",reply);

                    if(reply<0){
                        client.expire('404'+ip,1);
                        blockIP(ip,geoLoc.region,'limit');
                    }
                })
               
            }else{
                set404IP(ip)
            }
        })
    

}
module.exports={
    rateLimit,
    geoLocation,
    detectIP,
    set404IP,
    limit404
}
var dateFormat = require('dateformat');
var now = new Date();
let res;
var expDate= dateFormat(now, "yyyymmdh");
str = expDate.replace(/,,\s*$/, "");
console.log(expDate)


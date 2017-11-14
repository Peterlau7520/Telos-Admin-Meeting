const dateFormat = require('dateformat');
const before = dateFormat('2017-10-20 21:00')
const now =  dateFormat(new Date());
console.log(before , now);

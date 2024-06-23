const moongose = require('mongoose')
const dbConnection = moongose.connect("mongodb://localhost:27017/EzpanoWhiff");

dbConnection
.then(()=>{

     console.log('Database connected')
})
.catch(()=>{
    console.log('Database connection error')
})
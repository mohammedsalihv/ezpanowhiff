const moongose = require('mongoose')
require("dotenv").config();

const dbConnection = moongose.connect(process.env.DATABASE_MONGODB);

dbConnection
.then(()=>{
     console.log('Database connected')
})
.catch(()=>{
    console.log('Database connection error')
})
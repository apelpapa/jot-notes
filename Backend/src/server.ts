import express from 'express'
import env from 'dotenv'

env.config()
const port = process.env.PORT
const app = express()

app.listen(port, ()=>{
    console.log(`Find Us At ${port}`)
})
import express from 'express'
import env from 'dotenv'
import pg from 'pg'
import bcrypt from 'bcryptjs'
import userRetrieval from './userRetrieval'

//base url for api
const apiURL = '/api'

//grab env
env.config()

//assign backend port
const port: number = parseInt(process.env.PORT || '3000')

//init express
const app = express()

//init pg database and connect

const db = new pg.Client
try {
    await db.connect()
}
catch (err) {
    console.error('PG Connection Error', err)
}

app.get(apiURL+'/', async (req, res) => {
    const saveData = await userRetrieval(db)
    res.send(saveData)
})

//Establish Port
app.listen(port, () => {
    console.log(`Find Us At ${port}`)
})
import express from 'express'
import env from 'dotenv'
import pg from 'pg'
import bcrypt from 'bcryptjs'

//grab env
env.config()

//assign backend port
const port: number = parseInt(process.env.PORT || '3000')

//init express
const app = express()

//init pg database and connect
try {
    const db = new pg.Client()
    await db.connect()
}
catch (err) {
    console.error('PG Connection Error', err)
}


app.listen(port, () => {
    console.log(`Find Us At ${port}`)
})
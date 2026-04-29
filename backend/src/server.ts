import express, { json, Request } from 'express'
import env from 'dotenv'
import pg from 'pg'
import bcrypt from 'bcryptjs'
import userRetrieval from './userRetrieval.js'
import { deleteNote, noteRetrieval, postNote } from './noteManager.js'

interface UserParams{
    userId: string
    noteId: string
}

//base url for api
const apiURL = '/api'

//grab env
env.config()

//assign backend port
const port: number = parseInt(process.env.PORT || '3000')

//init express
const app = express()
app.use(json())

//init pg database and connect
const db = new pg.Client
try {
    await db.connect()
}
catch (err) {
    console.error('PG Connection Error', err)
}

app.get(apiURL+'/users', async (req, res) => {
    const userData = await userRetrieval(db)
    res.send(userData)
})

app.get(apiURL+'/:userId/notes', async (req: Request<UserParams>, res)=>{
    const id = parseInt(req.params.userId)
    const noteData = await noteRetrieval(db, id)
    res.send(noteData)
})

app.post(apiURL+'/user', async (req, res) => {
    //console.log(req.body)
})

app.post(apiURL+'/:userId/notes', async (req: Request<UserParams>, res)=>{
    const id = parseInt(req.params.userId)
    const response = await postNote(db, id, req.body)
    res.send(response)
})

app.delete(apiURL+'/:userId/:noteId', async (req: Request<UserParams>, res)=>{
    const userId = parseInt(req.params.userId)
    const noteId = parseInt(req.params.noteId)
    const response = await deleteNote(db, userId, noteId)
    if(!response){
        return res.json(-1)
    } else {
        return res.json(response)
    }
})

//Establish Port
app.listen(port, () => {
    console.log(`Find Us At ${port}`)
})
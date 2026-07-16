import express, { json, Request, type ErrorRequestHandler, type Response } from 'express'
import env from 'dotenv'
import pg from 'pg'
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
app.disable('x-powered-by')
app.use(json())

// A pool replaces broken connections after a database restart or network interruption.
const db = new pg.Pool()
db.on('error', (err) => {
    console.error('Unexpected PG pool error', err)
})

try {
    await db.query('SELECT 1')
}
catch (err) {
    console.error('PG Connection Error', err)
}

const serviceUnavailable = (res: Response) => {
    return res.status(503).json({ error: 'Service temporarily unavailable' })
}

app.get(apiURL+'/users', async (req, res) => {
    try {
        const userData = await userRetrieval(db)
        return res.send(userData)
    } catch (err) {
        console.error('Could not retrieve user data', err)
        return serviceUnavailable(res)
    }
})

app.get(apiURL+'/:userId/notes', async (req: Request<UserParams>, res)=>{
    const id = parseInt(req.params.userId)
    if(Number.isNaN(id)){
        return res.status(400).json({ error: 'Invalid user id' })
    }
    try {
        const noteData = await noteRetrieval(db, id)
        return res.send(noteData)
    } catch (err) {
        console.error('Could not retrieve notes', err)
        return serviceUnavailable(res)
    }
})

app.post(apiURL+'/user', async (req, res) => {
    return res.status(501).json({ error: 'Not implemented' })
})

app.post(apiURL+'/:userId/notes', async (req: Request<UserParams>, res)=>{
    const id = parseInt(req.params.userId)
    if(Number.isNaN(id)){
        return res.status(400).json({ error: 'Invalid user id' })
    }
    const { title, content } = req.body ?? {}
    if(typeof title !== 'string' || title.trim() === ''){
        return res.status(400).json({ error: 'Title is required' })
    }
    if(content != null && typeof content !== 'string'){
        return res.status(400).json({ error: 'Content must be text' })
    }
    try {
        const response = await postNote(db, id, { title, content })
        return res.status(201).json(response)
    } catch (err) {
        console.error('Could not save note', err)
        return serviceUnavailable(res)
    }
})

app.delete(apiURL+'/:userId/:noteId', async (req: Request<UserParams>, res)=>{
    const userId = parseInt(req.params.userId)
    const noteId = parseInt(req.params.noteId)
    if(Number.isNaN(userId) || Number.isNaN(noteId)){
        return res.status(400).json({ error: 'Invalid user or note id' })
    }
    try {
        const response = await deleteNote(db, userId, noteId)
        if(response == null){
            return res.status(404).json({ error: 'Note not found' })
        }
        return res.json(response)
    } catch (err) {
        console.error('Could not delete note', err)
        return serviceUnavailable(res)
    }
})

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error('Unhandled request error', err)
    const status = typeof err === 'object' && err !== null && 'status' in err
        ? Number(err.status)
        : 500

    if(status === 400){
        res.status(400).json({ error: 'Invalid request' })
        return
    }
    res.status(500).json({ error: 'Internal server error' })
}

app.use(errorHandler)

//Establish Port
app.listen(port, '127.0.0.1', () => {
    console.log(`Jot Notes API listening on 127.0.0.1:${port}`)
})

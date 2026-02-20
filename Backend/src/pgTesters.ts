import { Client } from "pg";

async function checkUserTable(db: Client){
    try{
        await db.query("SELECT * FROM users")
        await db.query("SELECT * FROM notes")
    } catch (err){
        throw err
    }
    
}

const pgTesters = {
    checkUserTable,

}

export default pgTesters
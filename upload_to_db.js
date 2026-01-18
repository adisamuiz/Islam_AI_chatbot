import "dotenv/config"
import mongoose from "mongoose"
import fs from "node:fs/promises"
import Verse from "./db_schema.js"


const mongoDBUrl = process.env.MONGO_DB_URL
const fileName = "hadith_muslim.json"

async function uploadQuranToDB(){
    console.log("Connecting to mongoDB...")
    try{
        await mongoose.connect(mongoDBUrl)
        console.log("Connected ✅")

        console.log("Collecting json file...")
        const rawQuran = await fs.readFile(fileName, "utf8")
        const verses = JSON.parse(rawQuran)
        
        console.log("Clearing old data...")
        await Verse.deleteMany({})

        console.log("uploading quran to DB...")
        await Verse.insertMany(verses)
    }
    catch (error) {
        console.error("❌ Error:", error.message)
    } finally {
        mongoose.connection.close()
        console.log("🔌 Connection closed.")
    }
}
uploadQuranToDB()

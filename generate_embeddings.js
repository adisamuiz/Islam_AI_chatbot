import "dotenv/config"
import { GoogleGenAI } from "@google/genai"
import mongoose from "mongoose"
import Verse from "./db_schema.js"

const apiKey = process.env.GEMINI_API_KEY
const mongoDBUrl = process.env.MONGO_DB_URL

async function createEmbedding() {
    const ai = new GoogleGenAI({apiKey})
    await mongoose.connect(mongoDBUrl)
    console.log("MongoDB connected!")

    let processedCount = 2000
    while(true){
        const verses = await Verse.find({ quran_en_embeddings: { $size: 0 } })
        .select("en_translation") 
        .limit(100)
        .lean()

        if (verses.length === 0) return console.log("All verses already embedded.")
        console.log(verses.length, "verses found!")

        const textArray = verses.map(verse => verse.en_translation)
        try{
            const response = await ai.models.embedContent({
                model: 'gemini-embedding-001',
                contents: textArray,
                taskType: 'RETRIEVAL_DOCUMENT',
                config: {
                    outputDimensionality: 768
                }        
            })
            const bulkOperation = verses.map((verse, index) => ({
                updateOne: {
                    filter: { _id: verse._id },
                    update: { $set: { quran_en_embeddings: response.embeddings[index].values } }
                }
            }))
            await Verse.bulkWrite(bulkOperation)
            console.log(`Successfully embedded ${verses.length} verses.`)

            processedCount += verses.length
            console.log(`✅ Processed ${processedCount} verses so far...`)

            await new Promise(resolve => setTimeout(resolve, 50000))

        }
        catch (error){
            console.error("Embedding failed:", error)

            if (error.message.includes("429")) {
                console.log("⏳ Quota exceeded. Sleeping for 30s...")
                await new Promise(resolve => setTimeout(resolve, 60000))
            } else {
                process.exit(1)
                }
        }
        // finally {
        //     mongoose.connection.close()
        //     console.log("🔌 Connection closed.")
        // }
    }
}
createEmbedding()
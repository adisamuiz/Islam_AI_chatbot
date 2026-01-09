import express from "express"
import "dotenv/config"
import { GoogleGenAI } from "@google/genai"
import mongoose from "mongoose"
import Verse from "./quran_db_schema.js"

const app = express()
const port = 3000
const apiKey = process.env.GEMINI_API_KEY_1
const mongoDBUrl = process.env.MONGO_DB_URL
const ai = new GoogleGenAI({apiKey})
app.use(express.json())

async function getQueryVecEmbedding(userInput){
    try{
        const response = await ai.models.embedContent({
            model: 'gemini-embedding-001',
            contents: userInput,
            taskType: 'RETRIEVAL_QUERY',
            config: {
                outputDimensionality: 768
            }        
        })
        return response.embeddings[0].values
    }
    catch (error){
        console.error("Embedding failed:", error)
    }
} 

async function findSimilarVerses(queryVector) {
    try{
        await mongoose.connect(mongoDBUrl)
        const results = await Verse.aggregate([
            {
                "$vectorSearch": {
                    "index": "quran_vector_index",
                    "path": "quran_en_embeddings",
                    "queryVector": queryVector,
                    "numCandidates": 100, 
                    "limit": 5
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "surah": "$metadata.surah",
                    "ayah": "$metadata.ayah",
                    "arabic_text": 1,
                    "en_translation": 1,
                    "similarity_score": { "$meta": "vectorSearchScore" }
                }
            }
        ])
        return results
    }
    catch (error){
        console.error("Agregation failed:", error)
    }
}

async function generateAnswer(userQuestion, retrievedVerses) {
    const contextBlock = retrievedVerses.map(v => 
        `Source: Surah ${v.surah}: Verse ${v.ayah}
         Text: "${v.en_translation}"`
    ).join("\n\n---\n\n")

    const systemInstructionText = `
    Role: Respectful Islamic educator & researcher. NOT a Mufti.
Constraints:
1. GROUNDING (STRICT): 
   - You are provided with specific Islamic texts (Quran/Hadith/Tafsir) as context.
   - Answer strictly based on this provided context.
   - If the answer is NOT in the context, state: "The provided database does not contain specific information on this." Do NOT use outside knowledge to fill gaps.
2. HIERARCHY: Prioritize provided proofs in order: 1. Quran -> 2. Sahih Hadith -> 3. Consensus.
3. DIVERSITY: Acknowledge Madhab differences (Hanafi, Shafi'i, etc.) if mentioned in context.
4. GUARDRAILS:
   - FATWA BAN: For personal rulings (e.g., divorce), state: "I am an AI, consult a local scholar."
   - SAFETY: For violence/harm, cite Quran 5:32.
5. FORMAT: 
   - CITATIONS: Mandatory. Use the exact Source/ID provided in the context.
   - STYLE: **Bold** terms. Lists for steps. Transliteration + English preferred over unverified Arabic.
    `

    const userPrompt = `
    CONTEXT VERSES:
    ${contextBlock}

    USER QUESTION:
    "${userQuestion}"
    `
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: userPrompt,
            config: {
                systemInstruction: systemInstructionText,
                temperature: 1,
            },
        })

        return response.text 
    } catch (error) {
        console.error("GenAI Error:", error)
        return "I encountered an error generating the response."
    }
}

app.post('/api/chat', async (req, res) => {
    try {
        const message = req.body.message
        console.log("message:", message)
        const vector = await getQueryVecEmbedding(message)
        const verses = await findSimilarVerses(vector)

        if (!verses || verses.length === 0) {
            return res.json({ reply: "I couldn't find relevant verses for that inquiry." })
        }
        const aiResponse = await generateAnswer(message, verses)
        res.json({ 
            reply: aiResponse,
            sources: verses
        })
    } 
    catch (error) {
        console.error(error)
        res.status(500).json({ error: "Internal Server Error" })
    }
})
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
})

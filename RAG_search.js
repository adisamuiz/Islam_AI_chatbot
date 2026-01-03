import "dotenv/config"
import { GoogleGenAI } from "@google/genai"
import mongoose from "mongoose"
import Verse from "./quran_db_schema.js"

const apiKey = process.env.GEMINI_API_KEY
const mongoDBUrl = process.env.MONGO_DB_URL

async function getQueryVecEmbedding(userInput){
    const ai = new GoogleGenAI({apiKey})
    try{
        const response = await ai.models.embedContent({
            model: 'gemini-embedding-001',
            contents: userInput,
            taskType: 'RETRIEVAL_QUERY',
            config: {
                outputDimensionality: 768
            }        
        })
        return response.embeddings.values
    }
    catch (error){
        console.error("Embedding failed:", error)
    }
} 

async function findSimilarVerses(queryVector) {
    try{
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
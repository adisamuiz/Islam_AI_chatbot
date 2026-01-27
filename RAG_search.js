import express from "express"
import cors from "cors"
import "dotenv/config"
import { GoogleGenAI } from "@google/genai"
import mongoose from "mongoose"
import Verse from "./quran_db_schema.js"
import hadithBukhari from "./hadith_bukhari_db_schema.js"
import hadithMuslim from "./hadith_muslim_db_schema.js"
import multer from "multer"

const app = express()
const port = 3000
const upload = multer({ storage: multer.memoryStorage() })
const apiKey = process.env.GEMINI_API_KEY_2
const mongoDBUrl = process.env.MONGO_DB_URL
const ai = new GoogleGenAI({apiKey})
app.use(express.json())
app.use(cors({
    //origin: 'https://islam-ai-frontend.vercel.app' // Your Vercel Frontend URL
}))

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

async function findSimilarHadithBukhari(queryVector) {
    try{
        await mongoose.connect(mongoDBUrl)
        const results = await hadithBukhari.aggregate([
            {
                "$vectorSearch": {
                    "index": "hadith_bukhari_vector_index",
                    "path": "hadith_bukhari_en_embeddings",
                    "queryVector": queryVector,
                    "numCandidates": 100, 
                    "limit": 5
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "book": "$metadata.book",
                    "hadith": "$metadata.hadith",
                    "source": "$metadata.source",
                    "book_title": "$metadata.book_title",
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

async function findSimilarHadithMuslim(queryVector) {
    try{
        await mongoose.connect(mongoDBUrl)
        const results = await hadithMuslim.aggregate([
            {
                "$vectorSearch": {
                    "index": "hadith_muslim_vector_index",
                    "path": "hadith_muslim_en_embeddings",
                    "queryVector": queryVector,
                    "numCandidates": 100, 
                    "limit": 5
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "book": "$metadata.book",
                    "hadith": "$metadata.hadith",
                    "source": "$metadata.source",
                    "book_title": "$metadata.book_title",
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

async function generateAnswer(userQuestion, retrievedVerses, retrievedHadith) {
    const quranContext = retrievedVerses.map(v => 
        `Source: Surah ${v.surah}: Verse ${v.ayah}
         Text: "${v.en_translation}"`
    ).join("\n\n---\n\n")
    const hadithContext = retrievedHadith.map(h => 
        `Source: ${h.source} - Book ${h.book}, Hadith ${h.hadith} (${h.book_title})
         Text: "${h.en_translation}"`
    ).join("\n\n---\n\n")

    const systemInstructionText = `
    Role: Respectful Islamic educator & researcher. NOT a Mufti.
Constraints:
    answer based on the provided context only.
 FORMAT: 
   - CITATIONS: Mandatory. Use the exact Source/ID provided in the context.
   - STYLE: **Bold** terms. Lists for steps. Transliteration + English preferred over unverified Arabic.
    `

    const userPrompt = `
    CONTEXT VERSES:
    ${quranContext}

    CONTEXT HADITHS:
    ${hadithContext}

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

app.post('/api/chat', upload.single('image'), async (req, res) => {
    try {
        const message = req.body.message || "what is this about"
        const imageFile = req.file
        let searchContext = message
        let imageAnalysis = ""
        console.log("message:", message)

        if (imageFile) {
            console.log("📸 Image Detected. Switching to Vision Mode.")
            const imageBase64 = imageFile.buffer.toString('base64')
            const visionResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [
                        { 
                            inlineData: {
                                mimeType: imageFile.mimetype,
                                data: imageBase64
                            },
                        },
                        { text: message }, // The user's question about the image
                    ],
            })
            console.log("👁️ Vision Response:", visionResponse)
            if (visionResponse.candidates && visionResponse.candidates.length > 0) {
                // Manually grab the text from the first candidate
                imageAnalysis = visionResponse.candidates[0].content.parts[0].text;
            } else {
                imageAnalysis = "No description available.";
            }            
            console.log("👁️ AI Saw:", imageAnalysis)
            searchContext = `${message} Context: ${imageAnalysis}`
        }

        const vector = await getQueryVecEmbedding(searchContext)
        const [verses, hadithBukharis, hadithMuslims] = await Promise.all([
            findSimilarVerses(vector),
            findSimilarHadithBukhari(vector),
            findSimilarHadithMuslim(vector)
        ])
        const hadiths = hadithBukharis.concat(hadithMuslims)
        console.log("verses:", verses)
        console.log("vector:", vector)

        if ((!verses || verses.length === 0) && (!hadiths || hadiths.length === 0)){
            return res.json({ reply: "I couldn't find relevant verses for that inquiry." })
        }

        const aiResponse = await generateAnswer(message, verses, hadiths)
        const getHadithUrl = (h) => {
            const collection = h.source.toLowerCase().includes('bukhari') ? 'bukhari' : 'muslim'
            return `https://sunnah.com/${collection}/${h.book}/${h.hadith}`
        };
        const verseSources = verses.map(v => ({
            type: 'quran',
            label: `Surah ${v.surah}:${v.ayah} - ${v.en_translation.substring(0, 50)}...`,
            url: `https://quran.com/${v.surah}/${v.ayah}`
        }));
        const hadithSources = hadiths.map(h => ({
            type: 'hadith',
            label: `${h.source} (Book ${h.book}, No. ${h.hadith}) - ${h.en_translation.substring(0, 50)}...`,
            url: getHadithUrl(h)
        }))
        res.json({ 
            reply: aiResponse,
            sources: [...verseSources, ...hadithSources]
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

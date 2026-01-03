import axios from "axios"
import fs from "fs"

const QURAN_BASE_URL = "https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions"
//const TAFSIR_BASE_URL = " https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir"

//const TAFSIR_EDITION = "en-tafisr-ibn-kathir" 
const TRANSLATION_EDITION = "eng-mustafakhattaba"
const ARABIC_EDITION = "ara-quranuthmanienc"

async function fetchAndMergeQuranData() {
    console.log("🚀 Starting Smart Download (Surah by Surah)...")    
    let allVerses = []
    for (let chapterNo = 1; chapterNo <= 114; chapterNo++) {
        try{
            console.log(`Downloading Surah ${chapterNo}/114...`)
            const [arabicRes, englishRes, tafsirRes] = await Promise.all([
                axios.get(`${QURAN_BASE_URL}/${ARABIC_EDITION}/${chapterNo}.json`),
                axios.get(`${QURAN_BASE_URL}/${TRANSLATION_EDITION}/${chapterNo}.json`)
                //axios.get(`${TAFSIR_BASE_URL}/${TAFSIR_EDITION}/${chapterNo}.json`)
            ])
            const arabicData = arabicRes.data.chapter
            const englishData = englishRes.data.chapter
            //const tafsirData = tafsirRes.data.ayahs

            console.log(`Downloaded Data! Merging...`)

            const mergedData = arabicData.map((arabicVerse, index) => {
                const englishVerse = englishData[index]
                //const tafsirVerse = tafsirData[index]

                // if (
                //     arabicVerse.chapter !== englishVerse.chapter || 
                //     arabicVerse.chapter !== tafsirVerse.surah ||
                //     arabicVerse.verse !== englishVerse.verse ||
                //     arabicVerse.verse !== tafsirVerse.ayah) {
                //     console.error(`Mismatch at index ${index}`)
                //     return null
                // }
                const verseKey = `${arabicVerse.chapter}:${arabicVerse.verse}`
                return {
                    _id: verseKey,
                    arabic_text: arabicVerse.text,
                    en_translation: englishVerse.text,
                    metadata: {
                        surah: arabicVerse.chapter,
                        ayah: arabicVerse.verse,
                    }
                }
            })
            allVerses.push(...mergedData)
        }
        catch (error) {
            console.error("Error fetching or merging Quran data:", error)
        }
    }
    const filename = "full_quran.json"
    fs.writeFileSync(filename, JSON.stringify(allVerses, null, 2))
    console.log(`✅ DONE! Saved to ${filename}`)
}
fetchAndMergeQuranData()
import axios from "axios"
import fs from "fs"

const TAFSIR_BASE_URL = "https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir"

const ENGLISH_EDITION = "en-tafisr-ibn-kathir"
//const ARABIC_EDITION = "ara-muslim1"
const NO_OF_CHAPTERS = 1
const NO_OF_AYAHS = 7

async function fetchAndMergeHadithData() {
    console.log("🚀 Starting Download...")    
    let allVerses = []
    const seenIds = new Set()
    for (let surahNo = 1; surahNo <= NO_OF_CHAPTERS; surahNo++) {
        for (let ayah = 1; ayah <= NO_OF_AYAHS; ayah++) {
            try{
                console.log(`Downloading Hadith book ${surahNo}/${NO_OF_CHAPTERS}...`)
                const [engTafsirRes] = await Promise.all([
                    axios.get(`${TAFSIR_BASE_URL}/${ENGLISH_EDITION}/${surahNo}/${ayah}.json`)
                ])
                const tafsirVerse = engTafsirRes.data

                console.log(`Downloaded Data! Merging...`)

                // const mergedData = tafsirData.map((tafsirVerse, index) => {
                    const verseKey = `${tafsirVerse.surah}:${tafsirVerse.ayah}`
                    // if (!seenIds.has(verseKey)&&
                    //     tafsirVerse.text && tafsirVerse.text.trim().length > 0)
                    //     {
                    //         seenIds.add(verseKey)
                            const mergedData = {
                            _id: verseKey,
                            // arabic_text: arabicHadith.text,
                            en_translation: tafsirVerse.text,
                            metadata: {
                                surah: tafsirVerse.surah,
                                ayah: tafsirVerse.ayah,
                                source: "Tafsir Ibn Kathir",
                            }
                        }
                    // }
                    
                // })/*.filter(Boolean)*/
                allVerses.push(mergedData)
            }
            catch (error) {
                console.error("Error fetching or merging Hadith data:", error)
            }
        }
    }
    const filename = "tafsir.json"
    fs.writeFileSync(filename, JSON.stringify(allVerses, null, 2))
    console.log(`✅ DONE! Saved to ${filename}`)
}
fetchAndMergeHadithData()
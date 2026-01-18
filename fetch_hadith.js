import axios from "axios"
import fs from "fs"

const HADITH_BASE_URL = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions"

const ENGLISH_EDITION = "eng-muslim"
const ARABIC_EDITION = "ara-muslim1"
const NO_OF_BOOKS = 56

async function fetchAndMergeHadithData() {
    console.log("🚀 Starting Download...")    
    let allVerses = []
    const seenIds = new Set()
    for (let sectionNo = 1; sectionNo <= NO_OF_BOOKS; sectionNo++) {
        try{
            console.log(`Downloading Hadith book ${sectionNo}/${NO_OF_BOOKS}...`)
            const [arabicRes, englishRes] = await Promise.all([
                axios.get(`${HADITH_BASE_URL}/${ARABIC_EDITION}/sections/${sectionNo}.json`),
                axios.get(`${HADITH_BASE_URL}/${ENGLISH_EDITION}/sections/${sectionNo}.json`)
            ])
            const arabicData = arabicRes.data.hadiths
            const englishData = englishRes.data.hadiths

            console.log(`Downloaded Data! Merging...`)

            const mergedData = arabicData.map((arabicHadith, index) => {
                const englishHadith = englishData[index]
                const verseKey = `${arabicHadith.reference.book}:${arabicHadith.reference.hadith}`

                if (!seenIds.has(verseKey)&&
                    arabicHadith.text && arabicHadith.text.trim().length > 0 && 
                    englishHadith.text && englishHadith.text.trim().length > 0)
                    {
                        seenIds.add(verseKey)
                        return {
                        _id: verseKey,
                        arabic_text: arabicHadith.text,
                        en_translation: englishHadith.text,
                        metadata: {
                            book: arabicHadith.reference.book,
                            hadith: arabicHadith.reference.hadith,
                            source: "Sahih Muslim",
                            book_title: arabicRes.data.metadata.section[sectionNo],
                        }
                    }
                }
                
            }).filter(Boolean)
            allVerses.push(...mergedData)
        }
        catch (error) {
            console.error("Error fetching or merging Hadith data:", error)
        }
    }
    const filename = "hadith_muslim.json"
    fs.writeFileSync(filename, JSON.stringify(allVerses, null, 2))
    console.log(`✅ DONE! Saved to ${filename}`)
}
fetchAndMergeHadithData()
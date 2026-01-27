// import mongoose from "mongoose"

// const modelName = "hadith_muslim"
// const verseSchema = new mongoose.Schema({
//     _id: String,
//     arabic_text: { type: String, required: true },
//     en_translation: { type: String, required: true },
//     hadith_muslim_en_embeddings: {type: [Number], default: []},
//     metadata: {
//         book: Number,
//         hadith: Number,
//         source: String,
//         book_title: String
//     }
// })

// const Verse = mongoose.model(modelName, verseSchema)
// export default Verse

import mongoose from "mongoose"

const modelName = "verses"
const verseSchema = new mongoose.Schema({
    _id: String,
    arabic_text: { type: String, required: true },
    en_translation: { type: String, required: true },
    quran_en_embeddings: {type: [Number], default: []},
    metadata: {
        surah: Number,
        ayah: Number
    }
})

const Verse = mongoose.model(modelName, verseSchema)
export default Verse

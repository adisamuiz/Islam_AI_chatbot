import mongoose from "mongoose"

const verseSchema = new mongoose.Schema({
    _id: String,
    arabic_text: { type: String, required: true },
    en_translation: { type: String, required: true },
    quran_en_embeddings: {type: [Number], default: []},
    metadata: {
        surah: Number,
        ayah: Number,
    }
})

const Verse = mongoose.model("Verse", verseSchema)
export default Verse

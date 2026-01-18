import fs from 'fs';

const filename = 'hadith_muslim.json';

try {
    console.log(`Reading ${filename}...`);
    const rawData = fs.readFileSync(filename, 'utf8');
    const data = JSON.parse(rawData);

    console.log(`Scanning ${data.length} Hadiths for errors...`);

    let nullCount = 0;

    const badEntries = data.filter((item, index) => {
        // 1. CATCH NULLS FIRST
        if (!item) {
            console.log(`❌ Found NULL/Empty entry at index ${index}`);
            nullCount++;
            return true;
        }

        // 2. Check for missing text
        const isArabicMissing = !item.arabic_text || item.arabic_text.trim() === "";
        const isEnglishMissing = !item.en_translation || item.en_translation.trim() === "";

        if (isArabicMissing || isEnglishMissing) {
            console.log(`⚠️ Invalid Text at Index ${index} (ID: ${item._id})`);
            return true;
        }
        return false;
    });

    console.log("\n--- REPORT ---");
    console.log(`Total Nulls (Ghosts): ${nullCount}`);
    console.log(`Total Invalid Text:   ${badEntries.length - nullCount}`);
    
    if (badEntries.length > 0) {
        console.log("\n💡 SOLUTION: You need to re-generate your JSON file properly.");
    } else {
        console.log("\n✅ File is clean!");
    }

} catch (err) {
    console.error("Critical Error:", err.message);
}
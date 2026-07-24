export async function searchKnowledgeBase(vectorStore, query) {
    if (!vectorStore) {
        throw new Error("Vector store not initialized.");
    }

    const docsWithScores = await vectorStore.similaritySearchWithScore(query, 3);

    console.log("\n========================================");
    console.log("🔍 User Query:", query);
    console.log("========================================\n");

    docsWithScores.forEach(([doc, score], index) => {
        console.log(`📄 RESULT ${index + 1}`);
        console.log(`⭐ Score      : ${score}`);
        console.log("📝 Chunk:");
        console.log(doc.pageContent);
        console.log("\n----------------------------------------\n");
    });

    return docsWithScores
        .map(([doc]) => doc.pageContent)
        .join("\n\n");
}
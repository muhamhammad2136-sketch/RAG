export async function searchKnowledgeBase(vectorStore, query) {
  if (!vectorStore) {
    throw new Error("Vector store not initialized.");
  }

  const docsWithScores = await vectorStore.similaritySearchWithScore(query, 5);

  docsWithScores.forEach(([doc, score], index) => {
    console.log(`========== Chunk ${index + 1} (score: ${score.toFixed(4)}) ==========`);
    console.log(doc.pageContent.slice(0, 150));
    console.log("----------------------------------------");
  });

  return docsWithScores.map(([doc]) => doc.pageContent).join("\n\n");
}
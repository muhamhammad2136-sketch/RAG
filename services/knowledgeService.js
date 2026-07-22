export async function searchKnowledgeBase(vectorStore, query) {
  if (!vectorStore) {
    throw new Error("Vector store not initialized.");
  }

  const docs = await vectorStore.similaritySearch(query, 5);

  docs.forEach((doc, index) => {
    console.log(`========== Chunk ${index + 1} ==========`);
    console.log(doc.pageContent);
    console.log("Metadata:", doc.metadata);
    console.log("----------------------------------------");
  });

  return docs.map(doc => doc.pageContent).join("\n\n");
}
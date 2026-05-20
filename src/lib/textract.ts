import { TextractClient, DetectDocumentTextCommand } from "@aws-sdk/client-textract";

const client = new TextractClient({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export async function extractTextFromBuffer(buffer: Buffer): Promise<string> {
  const command = new DetectDocumentTextCommand({
    Document: {
      Bytes: buffer,
    },
  });

  try {
    const response = await client.send(command);
    if (!response.Blocks) return "";

    return response.Blocks
      .filter(block => block.BlockType === "LINE")
      .map(block => block.Text)
      .join("\n");
  } catch (error) {
    console.error("Textract Error:", error);
    throw new Error("Failed to extract text from document.");
  }
}

export default client;

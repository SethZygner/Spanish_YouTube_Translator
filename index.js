const fs = require("fs");
const { YoutubeTranscript } = require("youtube-transcript");
const translate = require("google-translate-api-x");
const args = process.argv.slice(2);

const translateText = async (entry) => {
  try {
    const result = await translate(entry, { to: "es" });
    return result.text;
  } catch (error) {
    console.log("ISSUE: ", error);
    return null;
  }
};

const fetchAndTranslateTranscript = async () => {
  try {
    const script = await YoutubeTranscript.fetchTranscript(args[0]);
    // Join all entries into a single block of text
    let fullText = script
      .map((entry) =>
        entry.text
          .replace(/&amp;#39;/g, "'")
          .replace(/&amp;quot;/g, '"')
          .replace(/\s+/g, " ")
          .trim()
      )
      .join(" ");

    // Split the full text into sentences
    let sentences = fullText.match(/[^.!?]+[.!?]/g) || [];
    sentences = sentences.map((sentence) => sentence.trim());

    // Translate each sentence and create an object for each
    let translatedSentences = await Promise.all(
      sentences.map(async (sentence, index) => {
        const translatedText = await translateText(sentence);
        if (translatedText) {
          return {
            originalText: sentence,
            translatedText: translatedText,
          };
        }
        console.warn(`Skipping sentence ${index} due to error`);
        return null;
      })
    );

    // Remove null entries from translatedSentences
    translatedSentences = translatedSentences.filter(Boolean);

    // Save translated sentences to a local file in the desired format
    const outputFilePath = "translated_transcript.txt";
    let outputData = translatedSentences
      .map((entry) => `${entry.originalText}\n${entry.translatedText}\n`)
      .join("\n");
    fs.writeFileSync(outputFilePath, outputData);
    console.log(`Translated transcript saved to ${outputFilePath}`);
  } catch (error) {
    console.error("Error in processing transcript:", error);
  }
};

fetchAndTranslateTranscript();

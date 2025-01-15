const fs = require("fs");
const { YoutubeTranscript } = require("youtube-transcript");
const translate = require("google-translate-api-x");
const args = process.argv.slice(2);

// Function to translate text to Spanish using the Google Translate API
const translateText = async (entry) => {
  try {
    const { text } = await translate(entry, { to: args[1] });
    return text;
  } catch (error) {
    console.log("ISSUE: ", error);
    return null;
  }
};

// Function to fetch the YouTube transcript and translate it
const fetchAndTranslateTranscript = async () => {
  try {
    // Fetch the transcript using the first command-line argument as the YouTube video ID
    const script = await YoutubeTranscript.fetchTranscript(args[0]);

    // Join all entries into a single block of text
    let fullText = script
      .map(
        (entry) =>
          entry.text
            .replace(/&amp;#39;/g, "'") // Replace HTML entity for apostrophe
            .replace(/&amp;quot;/g, '"') // Replace HTML entity for quotation mark
            .replace(/\s+/g, " ") // Replace multiple spaces with a single space
            .trim() // Remove leading and trailing spaces
      )
      .join(" ");

    // Split the full text into sentences using regular expression
    let sentences = fullText.match(/["“]?[^.!?]+[.!?]["”]?/g) || [];
    const maxWordCount = 15;

    // Further split sentences that exceed maxWordCount
    sentences = sentences
      .reduce((acc, sentence) => {
        let words = sentence.trim().split(/\s+/);
        while (words.length > maxWordCount) {
          acc.push(words.splice(0, maxWordCount).join(" ") + "...");
        }
        acc.push(words.join(" "));
        return acc;
      }, [])
      .map((sentence) => sentence.trim());

    // Translate each sentence and create an object for each
    let translatedSentences = await Promise.all(
      sentences.map(async (sentence, index) => {
        const translatedText = await translateText(sentence);
        if (translatedText) {
          return {
            originalText: sentence,
            translatedText,
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
    const outputData = translatedSentences
      .map((entry) => `${entry.originalText}\n${entry.translatedText}\n`)
      .join("\n");

    fs.writeFileSync(outputFilePath, outputData);
    console.log(`Translated transcript saved to ${outputFilePath}`);
  } catch (error) {
    console.error("Error in processing transcript:", error);
  }
};

// Run the main function to fetch and translate the transcript
fetchAndTranslateTranscript();

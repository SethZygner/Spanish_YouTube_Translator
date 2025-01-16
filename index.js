const fs = require("fs");
const { YoutubeTranscript } = require("youtube-transcript");
const translate = require("google-translate-api-x");
const deepl = require('deepl-node');

let deeplError = false;

// Function to translate text to the target language
const translateText = async (entry, targetLang, deeplAPIKey = null) => {
  // Attempt to use DeepL if the API key is provided and no previous DeepL error
  if (deeplAPIKey && !deeplError) {
    try {
      const translator = new deepl.Translator(deeplAPIKey);
      const { text } = await translator.translateText(entry, null, targetLang);
      return text;
    } catch (err) {
      console.error('DeepL translation error:', err);
      deeplError = true; // Set the error flag to skip DeepL for future translations
    }
  }

  // Use Google Translate as a fallback if DeepL is not used or fails
  try {
    const { text } = await translate(entry, { to: targetLang });
    return text;
  } catch (err) {
    console.error('Google Translate error:', err);
    return null;
  }
};

// Function to fetch the YouTube transcript and translate it
const fetchAndTranslateTranscript = async (videoId, targetLang, deeplAPIKey = null) => {
  try {
    // Fetch the transcript using the provided YouTube video ID
    const script = await YoutubeTranscript.fetchTranscript(videoId);

    // Join all entries into a single block of text and clean it up
    const fullText = script
      .map(entry => entry.text.replace(/&amp;#39;/g, "'").replace(/&amp;quot;/g, '"').replace(/\s+/g, " ").trim())
      .join(" ");

    // Split the full text into sentences
    let sentences = fullText.match(/["“]?[^.!?]+[.!?]["”]?/g) || [fullText];

    // Further split sentences that exceed maxWordCount
    const maxWordCount = 15;
    sentences = sentences.reduce((acc, sentence) => {
      let words = sentence.trim().split(/\s+/);
      while (words.length > maxWordCount) {
        acc.push(words.splice(0, maxWordCount).join(" ") + "...");
      }
      acc.push(words.join(" "));
      return acc;
    }, []).map(sentence => sentence.trim());

    // Translate each sentence
    const translatedSentences = (await Promise.all(
      sentences.map(async (sentence, index) => {
        const translatedText = await translateText(sentence, targetLang, deeplAPIKey);
        if (translatedText) {
          return `${sentence}\n${translatedText}\n`;
        } else {
          console.warn(`Skipping sentence ${index} due to error`);
          return null;
        }
      })
    )).filter(Boolean).join("\n");

    // Save the translated sentences to a local file
    const outputFilePath = "translated_transcript.txt";
    fs.writeFileSync(outputFilePath, translatedSentences);
    console.log(`Translated transcript saved to ${outputFilePath}`);
  } catch (error) {
    console.error("Error in processing transcript:", error);
  }
};

// Run the main function to fetch and translate the transcript
const args = process.argv.slice(2);
fetchAndTranslateTranscript(args[0], args[1], args[2]);

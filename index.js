require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const logger = require("./logger");

const {
  sendPleaseWaitMessage,
  sendSentimentReply,
} = require("./handlers/slack.js");
const { connectToMindsDB, analyzeSentiment } = require("./handlers/mindsdb.js");

const app = express();
const port = process.env.PORT || 80;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Object to store the number of replies for each thread
const replyCounter = {};
let waitReplies = {};
let sentimentReplies = {};

app.post("/events", async (req, res) => {
  try {
    if (req.body.type === "event_callback") {
      logger.info("Received Slack event:", req.body);

      const { text, user, channel, ts } = req.body.event;

      logger.info("Message:", text);
      logger.info("User ID:", user);
      logger.info("Channel ID:", channel);

      // Check if the message mentions the bot and hasn't replied before
      if (
        text.includes(`<@${process.env.SLACK_BOT_ID}>`) &&
        !replyCounter[ts]
      ) {
        logger.info("Message mentions bot");

        // Remove bot mention from the text
        const message = text
          .replace(`<@${process.env.SLACK_BOT_ID}>`, "")
          .trim();

        logger.info("Message to analyze:", message);

        try {
          // Connect to MindsDB Cloud
          await connectToMindsDB();

          // Analyze sentiment using MindsDB Cloud API
          const sentimentResponse = await analyzeSentiment(message);

          logger.info("MindsDB response:", sentimentResponse);

          const sentiment = sentimentResponse.rows[0].sentiment;

          logger.info("Sentiment:", sentiment);

          // Send sentiment back to the channel as a reply in a thread
          await sendSentimentReply(
            channel,
            user,
            ts,
            sentiment,
            sentimentReplies
          );

          // Increase the reply counter for this thread
          replyCounter[ts] = true;

          // Remove the key from the replyCounter object after 5 minutes (300000 milliseconds)
          setTimeout(() => {
            delete replyCounter[ts];
          }, 300000);

          // Stop executing all functions after successfully replying to the sentiment of a text
          return res.sendStatus(200);
        } catch (error) {
          logger.error("Error analyzing sentiment:", error);

          // Send a "Please Wait" message to the channel in a thread
          if (!replyCounter[ts]) {
            await sendPleaseWaitMessage(channel, user, ts, waitReplies);

            // Increase the reply counter for this thread
            replyCounter[ts] = true;

            // Remove the key from the replyCounter object after 5 minutes (300000 milliseconds)
            setTimeout(() => {
              delete replyCounter[ts];
            }, 300000);
          }
        }
      } else if (req.body.type === "url_verification") {
        res.send(req.body.challenge);
      }
    }
  } catch (error) {
    logger.error("Error processing request:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Start the server
app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});

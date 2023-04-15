const axios = require("axios");
const logger = require("../logger");

async function sendPleaseWaitMessage(channel, user, ts, waitReplies) {
  // Check if the "Please Wait" message was sent before for this thread
  const threadWaitSent = waitReplies[ts];
  if (!threadWaitSent) {
    // Send a "Please Wait" message to the channel in a thread
    await postMessage(
      channel,
      `<@${user}> Please Wait, Analyzing Sentiment.`,
      ts
    );
    logger.info("Analyzing sentiment message sent");
    // Set the flag indicating that the "Please Wait" message has been sent for this thread
    waitReplies[ts] = true;
  }
}

async function sendSentimentReply(
  channel,
  user,
  ts,
  sentiment,
  sentimentReplies
) {
  // Check if sentiment has already been sent for this thread
  const threadSentimentSent = sentimentReplies[ts];
  if (!threadSentimentSent) {
    await postMessage(
      channel,
      `<@${user}> The sentiment of your message is ${sentiment}`,
      ts
    );
    logger.info("Sentiment reply sent");
    // Set the flag indicating that the sentiment has been sent for this thread
    sentimentReplies[ts] = true;
  }
}

async function postMessage(channel, text, thread_ts = null) {
  const payload = {
    channel: channel,
    text: text,
    thread_ts: thread_ts,
  };

  const config = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
    },
  };

  const response = await axios.post(
    "https://slack.com/api/chat.postMessage",
    payload,
    config
  );

  return response.data;
}

module.exports = { sendPleaseWaitMessage, sendSentimentReply };

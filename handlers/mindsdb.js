const MindsDB = require("mindsdb-js-sdk").default;
const modelName = process.env.MINDSDB_MODEL_NAME;
const logger = require("../logger");

async function connectToMindsDB() {
  try {
    await MindsDB.connect({
      user: process.env.MINDSDB_USERNAME,
      password: process.env.MINDSDB_PASSWORD,
    });
    logger.info("Connected to MindsDB Cloud");
  } catch (error) {
    logger.error("Error connecting to MindsDB Cloud:", error);
    throw error;
  }
}

async function analyzeSentiment(message) {
  let retries = 3; // Maximum number of retries

  while (retries > 0) {
    try {
      const text = `SELECT text, sentiment FROM ${modelName} WHERE text='${message}'`;
      const sentimentResponse = await MindsDB.SQL.runQuery(text);
      if (!sentimentResponse.rows) {
        throw new Error("Invalid response from MindsDB");
      }
      return sentimentResponse;
    } catch (error) {
      logger.error("Error analyzing sentiment:", error);
      retries--;
      if (retries === 0) {
        throw new Error("Maximum number of retries reached");
      }
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for 1 second before retrying
    }
  }
}

module.exports = { connectToMindsDB, analyzeSentiment };

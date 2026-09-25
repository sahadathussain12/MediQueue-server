const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { MongoClient } = require("mongodb");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URI);

async function connectToMongoDB() {
  try {
    await client.connect();
    const db = client.db('mediqueuedb');
    // const mediQueueCollection = db.collection('studentBooking');
    const tutorCollection = db.collection('tutorData');


    console.log("You successfully connected to MongoDB!");
  } catch (err) {
    console.error("MongoDB connection failed:", err);
  }
}

app.get("/", (req, res) => {
  res.send("Hello World!");
});

connectToMongoDB();

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
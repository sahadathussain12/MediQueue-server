const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);


const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { MongoClient, ObjectId } = require("mongodb");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URI);

let tutorCollection;

async function connectToMongoDB() {
  try {
    await client.connect();

    const db = client.db("mediqueuedb");

    tutorCollection = db.collection("tutorData");

    console.log("You successfully connected to MongoDB!");
  } catch (err) {
    console.error("MongoDB connection failed:", err);
  }
}

// Home route
app.get("/", (req, res) => {
  res.send("MediQueue server is running!");
});

// Add tutor
app.post("/tutors", async (req, res) => {
  try {
    const tutorData = req.body;

    const result = await tutorCollection.insertOne(tutorData);

    res.status(201).send({
      success: true,
      message: "Tutor added successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("Tutor insert error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to add tutor",
    });
  }
});

//Available tutor page

app.get("/tutors",async (req,res)=>{
  const availableTutor =await tutorCollection.find().limit(6).toArray();
  res.send(availableTutor)
})

app.get("/alltutors",async (req,res)=>{
  const availableTutor =await tutorCollection.find().toArray();
  res.send(availableTutor)
})

app.get("/alltutors/:id", async (req, res) => {
  const id = req.params.id;

  const query = {
    _id: new ObjectId(id),
  };

  const tutor = await tutorCollection.findOne(query);

  res.send(tutor);
});

connectToMongoDB();

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
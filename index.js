const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { MongoClient, ObjectId } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");

dotenv.config();

const app = express();
const port = process.env.PORT || 5005;

app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URI);


 const JWKS = createRemoteJWKSet(
      new URL('http://localhost:3000/api/auth/jwks')
    )

const varifiToken =async (req, res , next)=> {
const  authHeader = req?.headers?.authorization;

if (!authHeader) {
    return res.status(401).json({
      message: "unauthorize",
    });
  }

const token = authHeader.split(" ")[1]
if (!token) {
    return res.status(401).json({
      message: "unauthorize",
    });
  }

 
  try {
    const { payload } = await jwtVerify(token, JWKS);

    console.log(payload, "payload");

    next();
  } catch (error) {
    return res.status(403).json({
      message: "forbiten",
    });
  }


}

async function connectToMongoDB() {
  try {
    await client.connect();

    const db = client.db("mediqueuedb");

    const bookingCollection = db.collection("studentBooking");

    const tutorCollection = db.collection("tutorData");

    app.post("/tutors", async (req, res) => {
      const tutorData = req.body;

      const result = await tutorCollection.insertOne(tutorData);

      res.send(result);
    });

    app.get("/tutors", async (req, res) => {
      const availableTutor = await tutorCollection.find().limit(6).toArray();
      res.send(availableTutor);
    });

    app.get("/alltutors", async (req, res) => {
      const availableTutor = await tutorCollection.find().toArray();
      res.send(availableTutor);
    });

    app.get( "/alltutors/:id", varifiToken,async (req, res) => {
        const id = req.params.id;

        const query = {
          _id: new ObjectId(id),
        };

        const tutor = await tutorCollection.findOne(query);

        res.send(tutor);
      },
    );
    app.get("/", (req, res) => {
      res.send("MediQueue server is running!");
    });

    console.log("You successfully connected to MongoDB!");
  } catch (err) {
    console.error("MongoDB connection failed:", err);
  }
}

connectToMongoDB();

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

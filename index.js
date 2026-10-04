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

const JWKS = createRemoteJWKSet(new URL("http://localhost:3000/api/auth/jwks"));

const varifiToken = async (req, res, next) => {
  const authHeader = req?.headers?.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: "unauthorize",
    });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({
      message: "unauthorize",
    });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);
    req.user = payload;

    console.log(payload, "payload");

    next();
  } catch (error) {
    return res.status(403).json({
      message: "forbiten",
    });
  }
};

async function connectToMongoDB() {
  try {
    await client.connect();

    const db = client.db("mediqueuedb");

    const bookingCollection = db.collection("studentBooking");

    const tutorCollection = db.collection("tutorData");

    app.get("/my-bookings", varifiToken, async (req, res) => {
      const email = req.user.email;

      const bookings = await bookingCollection
        .find({ studentEmail: email })
        .toArray();

      res.send(bookings);
    });

    app.post("/bookings", varifiToken, async (req, res) => {
      try {
        const bookingData = req.body;

        const tutor = await tutorCollection.findOne({
          _id: new ObjectId(bookingData.tutorId),
        });

        if (!tutor) {
          return res.status(404).send({
            success: false,
            message: "Tutor not found",
          });
        }

        if (tutor.totalSlot <= 0) {
          return res.status(400).send({
            success: false,
            message: "No available slots left.",
          });
        }

        const today = new Date().toISOString().split("T")[0];

        if (today > tutor.sessionStartDate) {
          return res.status(400).send({
            success: false,
            message: "Booking is not available for this tutor",
          });
        }

        bookingData.bookStatus = "Confirmed";

        // Create booking
        const result = await bookingCollection.insertOne(bookingData);

        // Decrease slot
        await tutorCollection.updateOne(
          {
            _id: new ObjectId(bookingData.tutorId),
          },
          {
            $inc: {
              totalSlot: -1,
            },
          },
        );

        res.send({
          success: true,
          message: "Booking confirmed",
          bookingId: result.insertedId,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    app.patch("/cancel-booking/:id", varifiToken, async (req, res) => {
      const { id } = req.params;
      const userid = req.user.email;

      const booking = await bookingCollection.updateOne(
        { _id: new ObjectId(id), studentEmail: userid },
        {
          $set: { bookStatus: "Cancelled" },
        },
      );
      res.send(booking);
    });

    app.post("/tutors", varifiToken, async (req, res) => {
      const tutorData = req.body;
      tutorData.totalSlot = Number(tutorData.totalSlot);
      tutorData.hourlyFee = Number(tutorData.hourlyFee);

      const result = await tutorCollection.insertOne(tutorData);

      res.send(result);
    });
    app.get("/my-tutors", varifiToken, async (req, res) => {
      const userId = req.user.id;
      console.log(userId);

      const result = await tutorCollection.find({ userId }).toArray();

      res.send(result);
    });

    app.delete("/delete-tutors/:id", varifiToken, async (req, res) => {
      const { id } = req.params;
      const userId = req.user.id;
      const result = await tutorCollection.deleteOne({
        _id: new ObjectId(id),
        userId: userId,
      });

      res.send(result);
    });
    app.patch("/update-tutors/:id", varifiToken, async (req, res) => {
      const { id } = req.params;
      const userId = req.user.id;
      const updateData = req.body;

      const result = await tutorCollection.updateOne(
        {
          _id: new ObjectId(id),
          userId: userId,
        },
        {
          $set: updateData,
        },
      );

      res.send(result);
    });

    app.get("/tutors", async (req, res) => {
      const result = await tutorCollection.find().limit(6).toArray();
      res.send(result);
    });

    app.get("/alltutors", async (req, res) => {
      const { search, startDate, endDate } = req.query;

      const query = {};

      if (search) {
        query.tutorName = { $regex: search, $options: "i" };
      }

      if (startDate || endDate) {
        query.sessionStartDate = {};

        if (startDate) {
          query.sessionStartDate.$gte = startDate;
        }

        if (endDate) {
          query.sessionStartDate.$lte = `${endDate}T23:59:59.999Z`;
        }
      }

      const result = await tutorCollection.find(query).toArray();

      res.send(result);
    });
    app.get("/alltutors/:id", varifiToken, async (req, res) => {
      const id = req.params.id;

      const query = {
        _id: new ObjectId(id),
      };

      const tutor = await tutorCollection.findOne(query);

      res.send(tutor);
    });

    app.get("/tutor-metadata/:id", async (req, res) => {
      const tutor = await tutorCollection.findOne(
        { _id: new ObjectId(req.params.id) },
        { projection: { tutorName: 1 } },
      );

      res.send(tutor);
    });
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

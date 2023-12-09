const express = require("express");
const app = express();
const port = 3000;
require("dotenv").config();
const cors = require("cors");
var jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const userName = process.env.USERNAME;
const password = process.env.PASSWORD;

// middleware
app.use(express.json());
// app.use(
//   cors({
//     origin: [
//       "http://localhost:5174",
//       "https://assignment-11-front-end.netlify.app",
//     ],
//     credentials: true,
//   })
// );
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(cookieParser());

const verifyToken = async (req, res, next) => {
  const { authorization } = req.headers;

  if (!authorization) {
    return res.status(401).json({ message: "Authentication token required" });
  }

  const token = authorization.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Authentication token required" });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err);
      return res.status(403).send("Forbidden");
    }
    console.log("value in the token", decoded);
    req.user = decoded;
    next();
  });
};

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${userName}:${password}@cluster0.vpubwbo.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const assignmentDB = client.db("assignmentDB");
const assignmentCollection = assignmentDB.collection("assignmentCollection");
const submitCollection = assignmentDB.collection("submitCollection");

async function run() {
  try {
    // Auth API
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "30d",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          path: "/",
        })
        .send(token);
    });

    // Service realted api
    // post single assignment
    app.post("/assignment", async (req, res) => {
      const assignment = req.body;
      const result = await assignmentCollection.insertOne(assignment);
      res.send(`A document was inserted with the _id: ${result.insertedId}`);
    });

    // get all assignments
    app.get("/assignments/:difficulty", async (req, res) => {
      const page = parseInt(req.query.page || 1);
      const difficulty = req.params.difficulty;
      const itemsPerPage = 6;
      const skip = (page - 1) * itemsPerPage;
      const assignments = await assignmentCollection
        .find({ dificulty: difficulty })
        .skip(skip)
        .limit(itemsPerPage)
        .toArray();
      res.send(assignments);
    });

    // get assignments by difficulty
    // app.get("/assignments/:difficulty", async (req, res) => {
    //   const difficulty = req.params.difficulty;
    //   const assignments = await assignmentCollection
    //     .find({ dificulty: difficulty })
    //     .toArray();
    //   res.send(assignments);
    // });

    // get single assignment
    app.get("/assignment/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const assignment = await assignmentCollection.findOne({
        _id: new ObjectId(id),
      });
      if (assignment) {
        res.send(assignment);
      } else {
        res.status(404).send(`Assignment with id ${id} not found`);
      }
    });

    // update assignment
    app.put("/assignment/:id", async (req, res) => {
      const id = req.params.id;
      const updatedAssignment = req.body;
      const result = await assignmentCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedAssignment }
      );
      if (result.modifiedCount === 1) {
        res.send(`Assignment with id ${id} updated successfully`);
      } else {
        res.status(404).send(`Assignment with id ${id} not found`);
      }
    });

    // Delete a single assignment
    app.delete("/assignment/:id", async (req, res) => {
      const id = req.params.id;
      const result = await assignmentCollection.deleteOne({
        _id: new ObjectId(id),
      });
      if (result.deletedCount === 1) {
        res.send(`Assignment with id ${id} deleted successfully`);
      } else {
        res.status(404).send(`Assignment with id ${id} not found`);
      }
    });

    // Submit an assignment
    app.post("/submit-assignment", async (req, res) => {
      const assignment = req.body;
      const result = await submitCollection.insertOne(assignment);
      res.send(
        `Assignment submitted successfully with the _id: ${result.insertedId}`
      );
    });

    // update submitted assignment
    app.put("/submitted-assignment/:id", async (req, res) => {
      const id = req.params.id;
      const updatedAssignment = req.body;
      const result = await submitCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedAssignment }
      );
      if (result.modifiedCount === 1) {
        res.send(`Submitted assignment with id ${id} updated successfully`);
      } else {
        res.status(404).send(`Submitted assignment with id ${id} not found`);
      }
    });

    // get all submitted assignments
    app.get(
      "/submitted-assignments/:pending",
      verifyToken,
      async (req, res) => {
        const pending = req.params.pending;
        const submittedAssignments = await submitCollection
          .find({ status: pending })
          .toArray();
        res.send(submittedAssignments);
      }
    );

    // get all submitted assignments by filtering
    app.get("/my-assignments/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { userEmail: email };
      const submittedAssignments = await submitCollection.find(query).toArray();
      res.send(submittedAssignments);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.listen(port, () => {
  console.log(`Example app listening on port http://localhost:${port}`);
});

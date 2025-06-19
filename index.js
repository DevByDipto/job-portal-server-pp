const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.port || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

app.use(cors()); // aivabe e keno likhsi
app.use(express.json()); // error kheye buja j aita use korte hobe .ar aitar docta khuje ber kora

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nc8opzq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    const jobsCollection = await client.db("careerCode").collection("jobs");
    const applicationsCollection = await client
      .db("careerCode")
      .collection("applications");

    app.get("/jobs", async (req, res) => {
      const result = await jobsCollection.find().toArray();
      res.send(result);
    });

    app.get("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.findOne(query);
      res.send(result);
    });

    // job applications related api

    app.get("/applications", async (req, res) => {
      const email = req.query.email;
      const query = {
        applicant: email,
      };
      const result = await applicationsCollection.find(query).toArray();

      // bad way way to agreegate data
      for (const application of result) {
        const jobQuery = { _id: new ObjectId(application.jobId) };
        const appliedjob = await jobsCollection.findOne(jobQuery);
        application.company = appliedjob.company;
        application.title = appliedjob.title;
        application.company_logo = appliedjob.company_logo;
      }
      res.send(result);
    });

    app.post("/applications", async (req, res) => {
      const application = req.body;
      const result = await applicationsCollection.insertOne(application);
      res.send(result);
    });

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
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

//user:career_db_admin
//pass: 5JF2B43SlohXAvxg

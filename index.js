const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const cors = require("cors");
require("dotenv").config();
const port = process.env.port || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// midleweare
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
); // aivabe e keno likhsi
app.use(express.json()); // error kheye buja j aita use korte hobe .ar aitar docta khuje ber kora
app.use(cookieParser());

var admin = require("firebase-admin");

var serviceAccount = require("./firebaseAdminkey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  console.log("the cookies: ", token);
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  // verify
  jwt.verify(token, process.env.JWT_ACCESS_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.decoded = decoded;
  });
  next();
};

const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req?.headers?.authorization;
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).send({ message: "unauthorize access" });
  }
  const userInfo = await admin.auth().verifyIdToken(token);
  req.tokenEmail = userInfo.email;
  // console.log("fb token", userInfo);

  next();
};

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

    //jwt token related api
    app.post("/jwt", (req, res) => {
      const userData = req.body;
      const token = jwt.sign(userData, process.env.JWT_ACCESS_SECRET, {
        expiresIn: "1d",
      });

      //set token in the cookies
      res.cookie("token", token, {
        httpOnly: true,
        secure: false,
      });

      res.send({ success: true });
    });

    // job related api

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

    app.get("/applications", verifyFirebaseToken, async (req, res) => {
      const email = req.query.email;
      // console.log(req.cookies);
      // if(email !== req.decoded.email){
      //   return res.status(403).send({message: "forbidden access"})
      // }

      if (req.tokenEmail != email) {
        return res.status(403).send({ message: "forbidden access" });
      }
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

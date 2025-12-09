require("dotenv").config();
const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const port = process.env.PORT || 3000;

const app = express();

const uri = process.env.MONGODB_KEY;
// middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
    optionSuccessStatus: 200,
  })
);
app.use(express.json());
app.use(cookieParser());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// JWT Token

const verifyJWT = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  // verify jwt
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.token_email = decoded.email;
  });
  next();
};
async function run() {
  try {
    const db = client.db("LocalChefBazaar");
    const usersCollection = db.collection("Users");

    // create JWT TOKEN :

    app.post("/getToken", (req, res) => {
      const user = req.body;

      const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "1d" });
      res.cookie("token", token, {
        httpOnly: true,
      });
      res.send({ success: true });
    });

    // Clear Cookies when User LogOut
    app.post("/logout", (req, res) => {
      res.clearCookie("token", {
        httpOnly: true,
      });
      res.send({ success: true });
    });

    app.post("/user", async (req, res) => {
      const userData = req.body;
      userData.role = "Customer";
      const result = await usersCollection.insertOne(userData);
      res.send(result);
    });

    app.get("/xyz", verifyJWT, (req, res) => {
      const tokenEmail = req.token_email;
      res.send({ message: "done", email: tokenEmail });
    });
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello from Server..");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

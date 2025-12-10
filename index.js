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

// middleware section
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
    const mealsCollection = db.collection("Meals");

    // Check role is Chef or Not in middleware
    const verifyChef = async (req, res, next) => {
      const email = req.token_email;

      const user = await usersCollection.findOne({email});

      if (user?.role !== "Chef")
        return res
          .status(403)
          .send({ message: "Chef only Actions!", role: user?.role });
      next();
    };

    // Verify Admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.token_email;
      const user = await usersCollection.findOne({ email });
      if (user?.role !== "admin")
        return res
          .status(403)
          .send({ message: "Admin only Actions!", role: user?.role });

      next();
    };
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
      userData.created_at = new Date().toISOString();
      userData.last_loggedIn = new Date().toISOString();
      userData.status = "Active";
      const query = {
        email: userData.email,
      };

      const alreadyExists = await usersCollection.findOne(query);
      if (alreadyExists) {
        const result = await usersCollection.updateOne(query, {
          $set: {
            last_loggedIn: new Date().toISOString(),
          },
        });
        return res.send(result);
      }

      const result = await usersCollection.insertOne(userData);
      res.send(result);
    });

    // get user data;
    app.get("/user", verifyJWT, async (req, res) => {
      const result = await usersCollection.findOne({ email: req.token_email });
      res.send(result);
    });
    // Role get api
    app.get("/user/role", verifyJWT, async (req, res) => {
      const result = await usersCollection.findOne({ email: req.token_email });
      res.send({ role: result?.role });
    });

    // Create Meals
    app.post("/createMeals", verifyJWT, async (req, res) => {
      const mealData = req.body;
      mealData.created_at = new Date().toLocaleString();
      if (mealData.chefEmail !== req.token_email) {
        return res.status(403).send({ message: "Access Forbidden" });
      }

      const result = await mealsCollection.insertOne(mealData);
      res.send(result);
    });

    // Get Meals data

    app.get("/meals/:email", verifyJWT, verifyChef, async (req, res) => {
      const email = req.params.email;
      const query={}
      if(email)
        query.chefEmail=email
      const result = await mealsCollection.find(query).toArray();
      res.send(result);
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

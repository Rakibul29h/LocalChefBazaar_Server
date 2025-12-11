require("dotenv").config();
const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const stripe = require('stripe')(process.env.STPIPE_KEY)

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
    const changeRoleRequestCollection = db.collection("Role Changing Request");
    const ordersCollection=db.collection("Orders")
    // generate random ChefId
    async function generateUniqueChefId() {
      let chefId;
      let exists = true;

      while (exists) {
        // Generate random 6-digit ID
        chefId = "CHEF-" + Math.floor(1000 + Math.random() * 9000);

        // Check if this ID already exists
        const found = await usersCollection.findOne({ chefID: chefId });
        if (!found) {
          exists = false;
        }
      }

      return chefId;
    }

    // Check role is Chef or Not in middleware
    const verifyChef = async (req, res, next) => {
      const email = req.token_email;

      const user = await usersCollection.findOne({ email });

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
      if (user?.role !== "Admin")
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
        secure: true,
  sameSite: "none"
      });
      res.send({ success: true });
    });

    // Clear Cookies when User LogOut
    app.post("/logout", (req, res) => {
      res.clearCookie("token", {
        httpOnly: true,
        sameSite: "none",
        secure: true,
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

    app.get("/request", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await changeRoleRequestCollection
        .find({})
        .sort({ requestTime: -1 })
        .toArray();
      res.send(result);
    });

    // approve as a admin

    app.patch("/approve", verifyJWT, verifyAdmin, async (req, res) => {
      const { requestId, userId, type } = req.query;
      const requestQuery = {
        _id: new ObjectId(requestId),
      };
      const userQuery = {
        _id: new ObjectId(userId),
      };
      const update = {
        $set: {
          requestStatus: "Approved",
        },
      };

      const requestResult = await changeRoleRequestCollection.updateOne(
        requestQuery,
        update,
        {}
      );

      if (type === "chef") {
        const chefId = await generateUniqueChefId();
        const result = await usersCollection.updateOne(
          userQuery,
          {
            $set: {
              role: "Chef",
              chefID: chefId,
            },
          },
          {}
        );
        return res.send(result);
      } else {
        const result1 = await usersCollection.updateOne(
          userQuery,
          {
            $set: {
              role: "Admin",
            },
          },
          {}
        );
        return res.send(result1);
      }
    });

    app.patch("/reject", verifyJWT, verifyAdmin, async (req, res) => {
      const { requestId } = req.query;
      const query = {
        _id: new ObjectId(requestId),
      };
      const update = {
        $set: {
          requestStatus: "Rejected",
        },
      };
      const result = await changeRoleRequestCollection.updateOne(
        query,
        update,
        {}
      );
      res.send(result);
    });

    // Make Fraude:

    app.patch("/user/makeFraud", verifyJWT, verifyAdmin, async (req, res) => {
      const { id } = req.query;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          status: "Fraud",
        },
      };
      const options = {};
      const result = await usersCollection.updateOne(query, update, options);
      res.send(result);
    });
    // get user data;
    app.get("/user", verifyJWT, async (req, res) => {
      const result = await usersCollection.findOne({ email: req.token_email });
      res.send(result);
    });
    // get all user
    app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
      const cursor = usersCollection.find({});
      const result = await cursor.toArray();
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

    // get single Meal

    app.get("/singleMeal/:id",verifyJWT,async(req,res)=>{
      const {id}=req.params;
      const query={
        _id:new ObjectId(id)
      }
      const result = await mealsCollection.findOne(query);
      res.send(result)
    })
    // Get All meals


    app.get("/allMeals",async(req,res)=>{

      const {sort} =req.query; 
        let sortOption = {};
      if (sort === "des") {
    sortOption = { price: -1 };   
  } else if (sort === "asc") {
    sortOption = { price: 1 };    
  }
      const cursor = mealsCollection.find({}).sort(sortOption);
      const result = await cursor.toArray();
      res.send(result);
    })
    // Get My Meals data

    app.get("/meals/:email", verifyJWT, verifyChef, async (req, res) => {
      const email = req.params.email;
      const query = {chefEmail:email};
      const result = await mealsCollection.find(query).toArray();
      res.send(result);
    });

    // meals Delete:

    app.delete("/meals/:id", verifyJWT, verifyChef, async (req, res) => {
      const id = req.params.id;
      const result = await mealsCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });
    app.patch("/meals/:id", verifyJWT, verifyChef, async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      data.updatedAt = new Date();
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          ...data,
        },
      };
      const option = {};
      const result = await mealsCollection.updateOne(query, update, option);
      res.send(result);
    });

    // request for role changing
    app.post("/beAdminOrChef", verifyJWT, async (req, res) => { 
      const userData = req.body;
      if (userData.email !== req.token_email) {
        return res.status(403).send({ message: "Access Forbiden" });
      }
      const query = {
        id: userData.id,
        requestType: userData.requestType,
      };
      const isExists = await changeRoleRequestCollection.findOne(query);
      if (isExists) {
        return res.send({ message: "already sent" });
      }
      userData.requestStatus = "pending";

      const result = await changeRoleRequestCollection.insertOne(userData);

      res.send(result);
    });

    // Add Order to Database

    app.post("/orders",verifyJWT,async (req,res)=>{
      const ordersInfo=req.body;
      ordersInfo.orderStatus="pending";
      const result = await ordersCollection.insertOne(ordersInfo);
      res.send(result);
    })
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

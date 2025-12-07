 require('dotenv').config()
const express = require('express')
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors')
const port = process.env.PORT || 3000

const app = express()

const uri=process.env.MONGODB_KEY
// middleware
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      
    ],
    credentials: true,
    optionSuccessStatus: 200,
  })
)
app.use(express.json())


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const db=client.db("LocalChefBazaar")
    const usersCollection=db.collection("Users");

    app.post("/user",async(req,res)=>{

      const userData=req.body;
      userData.role="Customer";
      const result = await usersCollection.insertOne(userData);
      res.send(result);
    })

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Hello from Server..')
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
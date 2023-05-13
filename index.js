const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express')
var jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000;

// middleware
app.use(cors())
app.use(express.json())




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.b0yctrm.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const verifyJWT = (req, res, next) => {
    console.log('hitting verify JWT');
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'Unauthorize access' })
    }
    const token = authorization.split(' ')[1]
    console.log(token);
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
            return res.status(403).send({ error: true, message: 'unauthorize access' })
        }
        req.decoded = decoded;
        next()
    })
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const serviceCollection = client.db('carDoctor').collection('services');
        const ordersCollection = client.db('carDoctor').collection('orders');


        //jwt
        app.post('/jwt', (req, res) => {
            const user = req.body;
            console.log(user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ token })
        })


        // services
        app.get('/services', async (req, res) => {
            const cursor = serviceCollection.find()
            const result = await cursor.toArray()
            res.send(result)
        })

        app.get('/service/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const options = {
                // Include only the `title` and `imdb` fields in the returned document
                projection: { img: 1, title: 1, description: 1, facility: 1, price: 1 },
            };
            const result = await serviceCollection.findOne(query, options)
            res.send(result)
        })

        // set query
        app.get('/all-orders', verifyJWT, async (req, res) => {
            const decoded = req.decoded;
            console.log('came back after verify', decoded);

            if (decoded.email !== req.query.email) {
                return res.status(403).send({ error: 1, message: 'forbidden access' })
            }

            console.log(req.headers.authorization);
            let query = {}
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const cursor = ordersCollection.find(query)
            const result = await cursor.toArray()
            res.send(result)
        })

        app.post('/checkout-information', async (req, res) => {
            const checkoutInfo = req.body;
            const result = await ordersCollection.insertOne(checkoutInfo)
            res.send(result)
        })

        app.patch('/all-orders/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updateInfo = req.body;
            const updatedDoc = {
                $set: {
                    status: updateInfo.status
                }
            }
            const result = await ordersCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        app.delete('/all-orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await ordersCollection.deleteOne(query)
            res.send(result);
            console.log(result);
        })




        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('Doctor car Running!')
})

app.listen(port, () => {
    console.log(`Car Doctor is Running on PORT ${port}`)
})
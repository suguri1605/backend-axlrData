const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const port = 3001;
app.use(express.json());
app.use(cors());

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  console.log(token);
  if (token == null) {
    return res.sendStatus(401);
  }
  jwt.verify(token, 'secret-key', (err, user) => {
    if (err) {
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
};

mongoose.set(`strictQuery`, true);
mongoose.connect('mongodb://localhost:27017/axlrData-Assign', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const productsSchema = new mongoose.Schema({
  title: { type: String},
  description: { type: String},
  price: { type: Number},
  discountPercentage: { type: Number},
  rating: { type: Number},
  stock: { type: Number },
  brand: { type: String  },
  category: { type: String  },
  thumbnail: { type: String },
  images: { type: Array },
});

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productsSchema);

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect password' });
    }

    const token = jwt.sign({ email: user.email }, 'secret-key');
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

app.post('/api/signup', async (req, res) => {
  const { name, location, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new User({ name, location, email, password: passwordHash });
    await newUser.save();

    const token = jwt.sign({ email: newUser.email }, 'secret-key');
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({ message: 'This API is protected' });
});

app.post('/api/products/search', (req, res) => {
  const query = req.body.q;
  console.log(query);
  let red = '(?i)[a,z]{0,}';
  for(let i = 0; i < query.length; i++){
    red += query[i]+'[a-z]{0,}';
  }
  console.log(red);
  // Use the MongoDB aggregation pipeline to search for products matching the query
  Product.find({
      $or: [{"title" : {$regex: red }},{"description" : {$regex: red}},{"category" : {$regex: red }}]
  }
    ).limit(10).exec((err, result) => {
    if (err) {
      res.status(500).send({ message: 'Error searching products' });
    } else {
      console.log(result);
      res.send(result);
    }
  });
});

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});

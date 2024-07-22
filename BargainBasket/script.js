const express = require("express");
const app = express();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require('path');
const session = require('express-session');
const crypto = require('crypto');

const secretKey = crypto.randomBytes(32).toString('hex');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'Pages', 'views'));

app.use(bodyParser.urlencoded({extended: true}));

app.use(express.static(__dirname + '/Pages'));

app.use(session({
  secret: secretKey,
  resave: false,
  saveUninitialized: true,
}));

mongoose.connect("mongodb+srv://bargainbasket:bargainbasket123@bargainbasketcluster.gq7cemq.mongodb.net/BargainBasketDB")

const usersSchema = {
    email: String,
    username: String,
    password: String
}

const productsSchema = {
  Name: String,
  Category: String,
  Price: Number,
  ShopID: Number,
  imageURL: String,
}

const grocerySchema = {
  userID: String,
  Name: String, 
  Price: Number,
  Quantity: Number,
  imageURL: String,
}

const Grocery = mongoose.model('Grocery', grocerySchema);
const Product = mongoose.model('Product', productsSchema);
const User = mongoose.model("User", usersSchema);

app.get("/", function(req, res){
    res.sendFile(__dirname + "/Pages/LandingPage.html");
})

app.post("/login", async function (req, res) {
  const username = req.body.username;
  const password = req.body.password;

  try {
    const user = await User.findOne({ username: username, password: password });

    if (user) {
      
      req.session.userID = user._id;

      res.redirect("/HomePage.html");
    } else {
      res.redirect("/?error=authFailed");
    }
  } catch (err) {
    console.error(err);
    res.redirect("/LogInPage.html");
  }
});

app.post("/register", function(req, res){
    let newUser = new User ({
        email:  req.body.email,
        username: req.body.username,
        password: req.body.password
    });
    newUser.save();
    res.redirect("/HomePage.html");
});

app.post('/payments', async function(req, res){
  res.redirect('Payment.html');
});

app.post("/groceryList", function(req, res){

  if (req.session.userID) {
    
    const LoggedUserID = req.session.userID;

    let newGrocery = new Grocery ({
      userID: LoggedUserID,
      Name: req.body.productName,
      Price: req.body.productPrice,
      Quantity: req.body.productQuantity,
      imageURL: req.body.productImage
    });
    newGrocery.save();
    res.redirect('Mylist');
  } else {
    res.redirect('/LandingPage.html');
  }
  
});

app.get('/Mylist', async( req, res ) =>{

  const groceries = await Grocery.find({ userID: req.session.userID });
  let totalPrice = 0;
  groceries.forEach(grocery => {
    totalPrice += grocery.Price;
  });

  try {
    const savingsByProduct = {};

    for (const grocery of groceries) {
      const productName = grocery.Name;

      if (!savingsByProduct[productName]) {
        savingsByProduct[productName] =0;
      }

      const productPrices = await Product.find({ Name: productName }, "Price");

      const referencePrice = grocery.Price;

      const savings = productPrices.map(product => {
        if (product.Price > referencePrice) {
          return product.Price - referencePrice;
        } else {
          return 0;
        }
      });

      const productTotalSavings = savings.reduce((total, saving) => total + saving, 0);

      savingsByProduct[productName] += productTotalSavings;
    }

    const totalSavings = Object.values(savingsByProduct).reduce((total, saving) => total + saving, 0);

  res.render('Mylist', {
    groceriesList: groceries,
    totalPrice: totalPrice,
    totalSavings: totalSavings
  });
}catch(error){
  console.error(error);
    res.status(500).send("Internal Server Error");
}
});


app.get('/products', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const productsPerPage = 12;

  const skip = (page - 1) * productsPerPage;
  const products = await Product.find({}).skip(skip).limit(productsPerPage);

  const totalProducts = await Product.countDocuments();
  const hasNextPage = skip + products.length < totalProducts;

  res.render('ProductsPage', {
      productsList: products,
      currentPage: page,
      hasNextPage: hasNextPage
  });
});

app.listen(3000, function(){
    console.log("server is running on 3000");
})




  
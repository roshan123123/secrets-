// incorporating todo list on local server using mongodb database using ongoose

require('dotenv').config();
const express=require("express");
const app=express();
const mongoose=require("mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const  session = require('express-session');
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
const bodyParser=require("body-parser");
app.use(bodyParser.urlencoded({extended:true}));//to use body parser
// const date=require(__dirname+"/module.js");//this will go in that module and run all the code inside it
const _=require("lodash");
const findOrCreate = require('mongoose-findorcreate');//for google function to work
app.set('view engine', 'ejs');//for ejs to work
app.use(express.static("public"));//this will let other static files like css and images all to render
//alwyas place these codes in same order
//initialisation of cookie session
app.use(session({//javascript object style
  secret: process.env.ENCRYPT_STRING,
  resave: false,
  saveUninitialized: true

}));
//now we initialize passport and use it to set our sessions
app.use(passport.initialize());//initialise passport
app.use(passport.session());//creting session using passport



mongoose.connect("mongodb://localhost:27017/secretsDB") ;//toDoDB is the name of database when connecting locally

const secretSchema=new mongoose.Schema(
  {
    username:String,
    pass:String,
    googleId:String,//so that no id is generatrd again nad again basically find function will work before creating
    secret:String
  }
);
secretSchema.plugin(passportLocalMongoose);//hash and salt our password and to save user to mongo db database
secretSchema.plugin(findOrCreate);

const Secret=mongoose.model("Secret",secretSchema);
// CHANGE: USE "createStrategy" INSTEAD OF "authenticate"
passport.use(Secret.createStrategy());
//serialize and deserailise local as well as non local strtegy
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  Secret.findById(id, function(err, user) {
    done(err, user);
  });
});


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    Secret.findOrCreate({ googleId: profile.id }, function (err, user) {//findorcreatewas just apsudo telling if it is there create it or alredy then find
//console log the profile and u will see what are the things we get from google
      // but mongoose-findorcreate is also a package we install and require it
      return cb(err, user);
    });
  }
));


app.get("/",function(req,res)
{
  res.render("home");
});


app.get("/login",function(req,res)
{
  res.render("login");
});

app.get("/register",function(req,res)
{
  res.render("register");
});

app.get('/auth/google',//for rendering that signup from google page
  passport.authenticate('google', { scope: ['profile'] }));
//this get method is called when user has entered the correct result
app.get('/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

  app.get("/submit",function(req,res)
  {
      if(req.isAuthenticated())//cheks from cookie that any cookie for this user autherisation  exist or not
      {
        res.render("submit");
      }
      else{
        res.redirect("/login");
      }
  });


  app.post("/submit",function(req,res)
{
  const nsecret=req.body.secret;
  //req contains the info of user also we can check that via loggong it in console
    console.log(req.user.id)  ;//user here is keyword this has ocuured due to sessions
   Secret.findById(req.user.id,function(err,founduser)
 {
   if(err)
   {
     console.log(err);
   }
   else{
     if(founduser)
     {
       founduser.secret=nsecret;
       founduser.save(function()
     {
        res.redirect("/secrets");
     });

     }
   }
 });

});


// simple authentication explaination
// app.get("/secrets",function(req,res)///inn earlier method we did not make this as this
// //should be reachable only when called login so herer before showing secrets we will tell
// //passport.login authenticate to check if authenticated then render else do not render
// //it will check from seesion details whether we are logged in or not
// {
//     if(req.isAuthenticated())//cheks from cookie that any cookie for this user aut exist or not
//     {
//       res.render("secrets");
//     }
//     else{
//       res.redirect("/login");
//     }
// });



app.get("/secrets",function(req,res)
{

  Secret.find({"secret":{$ne:null}},function(err,foundusers)
{
  if (err)
  {
    console.log(err);
  }
  else
  {
    if(foundusers)
    {
        res.render("secrets",{usersarray:foundusers});
    }
  }
});

});


app.get("/logout",function(req,res)
{
  req.logout();//function from passport destryos cookie as well
  res.redirect("/");
});
app.post("/register",function(req,res)
{
  Secret.register({username:req.body.username},req.body.password,function(err,secret)
{
  if(err)
  {
    console.log(err);
    res.redirect("/register");

  }
  else{
    passport.authenticate("local")(req,res,function()//authenticate creates a cookie and when redirected to secret that cookie
    //is deserailise and used against is authenticated function to see whether authenticated or not
  {
    //here entered means is authenticated
    res.redirect("/secrets");
  });


  }
});




});

app.post("/login",function(req,res)
{
  const nuser=new Secret({
    username:req.body.username,
    pass:req.body.password
  });
  req.login(nuser,function(err)
{
  if(err)
  {
    console.log(err);
    res.redirect("/login");
  }
  else{
    passport.authenticate("local")(req,res,function()
  {
    //yaha tk aaya mtlb authenticate hua shi h aur wo cookie bna __dirname
    res.redirect("/secrets");
  });
  }
});

});
app
app.listen(process.env.PORT|| 3000,function()
{
  console.log("server working");
});

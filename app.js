require("dotenv").config();
const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const User = require("./models/User");

const app = express();
const TMDB_BEARER = process.env.TMDB_BEARER;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static("public"));

app.use(bodyParser.urlencoded({ extended: true }));
console.log("TMDB:", process.env.TMDB_BEARER ? "LOADED" : "MISSING");

mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("Mongo Connected"))
.catch(err=>console.log(err));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
       mongoUrl: process.env.MONGO_URI
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 30
    }
}));

// Fetch movies
async function getMovies(url) {
    const headers = {
        accept: "application/json",
        Authorization: `Bearer ${TMDB_BEARER}`
    };

    const response = await axios.get(url, { headers });

    const movies = response.data.results.map(movie => ({
        rating: movie.vote_average.toFixed(2),
        date: movie.release_date?.slice(0, 4) || "",
        id: movie.id,
        title: movie.title,
        poster: movie.poster_path
            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
            : ""
    }));

    return movies;
}

// Active Session
function requireLogin(req, res, next) {
    if (!req.session.user) {
        return res.redirect("/signin");
    }
    next();
}

// User accessible to ejs
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// Home
app.get("/", async (req, res) => {
    const url = "https://api.themoviedb.org/3/trending/movie/week?language=en-US";
    const movies = await getMovies(url);
    res.render("index", { movies });
});

// Search
app.post("/search", async (req, res) => {
    const query = req.body.query;
    const url = `https://api.themoviedb.org/3/search/movie?query=${query}&include_adult=false&language=en-US&page=1`;
    const movies = await getMovies(url);
    res.render("search", { movies, query });
});

// Movie
app.post("/movie", async (req, res) => {

    const { moviename, movieid, player } = req.body;
    let playerurl = "";

    if (player === "vidlink") {
        playerurl = `https://www.vidlink.pro/movie/${movieid}/?primaryColor=6f6fff&secondaryColor=9b9bce&iconColor=6f6fff&icons=default&player=default&title=true&poster=true&autoplay=true`;
    } else if (player === "jw") {
        playerurl = `https://www.vidlink.pro/movie/${movieid}/?primaryColor=6f6fff&secondaryColor=9b9bce&iconColor=6f6fff&icons=default&player=jw&title=true&poster=true&autoplay=true`;
    } else if (player === "vidking") {
        playerurl = `https://www.vidking.net/embed/movie/${movieid}?color=6f6fff&autoPlay=true`;
    }

    if (req.session.user) {

        const user = await User.findById(req.session.user.id);

        if (user) {

            // remove duplicate if already present
            user.history = user.history.filter(
                m => m.movieId != movieid
            );

            // newest goes first
            user.history.unshift({
                movieId: movieid,
                movieName: moviename
            });

            // keep only latest 10
            user.history = user.history.slice(0, 10);

            await user.save();
        }
    }

    res.render("movie", { playerurl, movieid, moviename });

});

// Signin
app.get("/signin",(req,res)=>{
    res.render("signin",{error:null});
});

app.post("/signin", async(req,res)=>{

    const {username,password}=req.body;

    const user=await User.findOne({username});

    if(!user){
        return res.render("signin",{error:"Invalid username or password"});
    }

    const ok=await bcrypt.compare(password,user.password);

    if(!ok){
        return res.render("signin",{error:"Invalid username or password"});
    }

    req.session.user={
        id:user._id,
        username:user.username
    };

    res.redirect("/account");
});

// Signup
app.get("/signup",(req,res)=>{
    res.render("signup",{error:null});
});

app.post("/signup", async(req,res)=>{

    const {username,password}=req.body;

    const exists=await User.findOne({username});

    if(exists){
        return res.render("signup",{error:"Username already exists"});
    }

    const hash=await bcrypt.hash(password,10);

    await User.create({
        username,
        password:hash
    });

    res.redirect("/signin");
});

// Account
app.get("/account", requireLogin, async (req, res) => {

    const user = await User.findById(req.session.user.id);

    res.render("account", {
        username: user.username,
        history: user.history
    });

});

// Logout
app.post("/logout", (req, res) => {

    req.session.destroy(() => {
        res.redirect("/");
    });

});

module.exports = app;
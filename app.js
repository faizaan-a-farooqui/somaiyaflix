const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const path = require("path");
require("dotenv").config();

const app = express();
const TMDB_BEARER = process.env.TMDB_BEARER;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(bodyParser.urlencoded({ extended: true }));

async function getMovies(url) {
    const headers = {
        accept: "application/json",
        Authorization: 'Bearer ${TMDB_BEARER}'
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
app.post("/movie", (req, res) => {
    const { movieid, player } = req.body;
    let playerurl = "";

    if (player === "vidlink") {
        playerurl = `https://www.vidlink.pro/movie/${movieid}/?primaryColor=6f6fff&secondaryColor=9b9bce&iconColor=6f6fff&icons=default&player=default&title=true&poster=true&autoplay=true`;
    } else if (player === "jw") {
        playerurl = `https://www.vidlink.pro/movie/${movieid}/?primaryColor=6f6fff&secondaryColor=9b9bce&iconColor=6f6fff&icons=default&player=jw&title=true&poster=true&autoplay=true`;
    } else if (player === "vidking") {
        playerurl = `https://www.vidking.net/embed/movie/${movieid}?color=6f6fff&autoPlay=true`;
    }

    res.render("movie", { playerurl, movieid });
});

module.exports = app;
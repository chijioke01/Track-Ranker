const express = require('express');
const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

mongoose.connect("mongodb://localhost:27017/trackDB", { useNewUrlParser: true });


const eventSchema = new mongoose.Schema({
    _id: { type: Number },
    name: { type:String, unique: true },
    year: String,
    school: String,
    performance: String,
});


const app = express();
app.use(bodyParser.urlencoded({ extended: true }))

async function scrape(url) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);

    const grabInfo = await page.evaluate(() => {
       // const event = document.querySelector(".col-lg-12 .font-weight-500").innerText.trim();
        let amt_of_athletes = document.querySelectorAll(".col-lg-12 ");
 
        var array = [];

        for (let i = 0; i < amt_of_athletes.length; ++i) {
            try {
                var size = amt_of_athletes[i].querySelectorAll('.body .allRows').length;
                let event = amt_of_athletes[i].querySelector('.font-weight-500').innerText.trim();
                event = `Event_${event}`;
                event = event.split(' ').join('')

                if (!event.includes("Relay")) {

                    for (let j = 0; j < size; j++) {
                
                        let name = amt_of_athletes[i].querySelectorAll('.body .allRows #col1')[j].innerText.trim();
                        let year = amt_of_athletes[i].querySelectorAll('.body .allRows #col2')[j].innerText.trim();
                        let school = amt_of_athletes[i].querySelectorAll('.body .allRows #col3')[j].innerText.trim();
                        let performance = amt_of_athletes[i].querySelectorAll('.body .allRows #col4')[j].innerText.trim();
                        if (performance.lastIndexOf('m') === performance.length -1) {
                            performance = performance.substring(0,performance.length-1)
                        } 
                        if (performance.includes('.')) { // changes format of times to 00:00.00
                            if (performance.length === 7) { performance = "0" + performance; }
                            if (performance.length === 5) { performance = "00:" + performance; }
                        }

                        array.push({ name, year, school, event, performance })
                    }
                } 
            } catch {  }
        }
        return array;
    });

    for (let i of grabInfo) {
        var start = 1;
        const Event = mongoose.model(i.event, eventSchema);
            
        Event.find({ name: i.name, year: i.year, school: i.school, performance: i.performance}, (err, data) => {
            if (err) { console.log(err); }
            else {
                if (data.length == 0) {
                const athlete = new Event({
                    _id: start,
                    name: i.name,
                    year: i.year,
                    school: i.school,
                    performance: i.performance
                });
                    start++;
                    athlete.save();
                }
            }
        });
    }
    // console.log(grabInfo)
    await browser.close();
    console.log("Database Insertion Complete")
} 

// website with track&feild infomation
scrape("https://www.tfrrs.org/lists/3453.html?limit=%3C%3D500&event_type=all&year=&gender=x");

app.get("/", (req, res) => {

    res.sendFile(__dirname + "/home.html")

});

app.post("/", (req, res) => {
    var event = req.body.myselect;
    var metric = req.body.metric;
    var numOfAthletesSlower;
    var numOfAthletesFaster;
    var numOfAthletes;
    var athleteBetter;
    var athleteWorse; 
    var rank = 0;
    const Event = mongoose.model(event, eventSchema);


    if (event.includes('0')) {
        Event.find({ event }, async (err, data) => { // slower than u 
            numOfAthletes = data.length
        })

        Event.find({ performance : {$gt: metric } }, (err, data) => { // slower than u 
            numOfAthletesSlower = data.length
        });
        Event.find({ performance : {$lt: metric } }, (err, data) => { // faster than u 
            numOfAthletesFaster = data.length
            rank = numOfAthletesFaster + 1;
        });
        setTimeout(function () {
            event = event.replace('event_', ' ');
            event = event.replace('(', ' (');
            res.send(`<p>There are ${numOfAthletes} who competed in the ${event} </p> <p>With a time of ${metric} you would rank ${rank}th</p>
           `)
        }, 100)

    } else {
        Event.find({ event },  (err, data) => { // slower than u 
            numOfAthletes = data.length
        });

        Event.find({ performance : {$lt: metric } }, (err, data) => { // better than u 
            athleteBetter = data.length;
            rank = athleteBetter + 1;
        });
        Event.find({ performance : {$gt: metric } }, (err, data) => { // worse than u 
            athleteWorse = data.length
        });

        setTimeout(function () {
            event = event.replace('event_', ' ');
            event = event.replace('(', ' (');
            res.send(`<p>There are ${numOfAthletes} who competed in the ${event}</p> <p>With a perfomance of ${metric} you would rank ${rank}th</p>`)
        }, 100)
    }
});

let port = 5002;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});


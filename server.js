// Built-in Node.js modules
let path = require('path');

// NPM modules
let express = require('express');
let sqlite3 = require('sqlite3');


let app = express();
let port = 8000;

let public_dir = path.join(__dirname, 'public');
let template_dir = path.join(__dirname, 'templates');
let db_filename = path.join(__dirname, 'db', 'stpaul_crime.sqlite3');

// open stpaul_crime.sqlite3 database
// data source: https://information.stpaul.gov/Public-Safety/Crime-Incident-Report-Dataset/gppb-g9cg
let db = new sqlite3.Database(db_filename, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.log('Error opening ' + db_filename);
    }
    else {
        console.log('Now connected to ' + db_filename);
    }
});

app.use(express.static(public_dir));


// REST API: GET /codes
// Respond with list of codes and their corresponding incident type
app.get('/codes', (req, res) => {
    let url = new URL(req.protocol + '://' + req.get('host') + req.originalUrl);
    
    let sql = 'SELECT * from Codes';
    db.all(sql, (err, rows) => {
        var allCodes = [];
        for(let i = 0; i < rows.length; i++)
        {
            let code = {code: rows[i].code, type: rows[i].incident_type}
            allCodes.push(code);
        }
        res.status(200).type('json').send(allCodes);
    });
});

// REST API: GET /neighborhoods
// Respond with list of neighborhood ids and their corresponding neighborhood name
app.get('/neighborhoods', (req, res) => {
    let url = new URL(req.protocol + '://' + req.get('host') + req.originalUrl);

    let sql = 'SELECT * from Neighborhoods';
    db.all(sql, (err, rows) => {
        var allNeighborhoods = [];
        for(let i = 0; i < rows.length; i++)
        {
            let neighborhood = {id: rows[i].neighborhood_number, name: rows[i].neighborhood_name}
            allNeighborhoods.push(neighborhood);
        }
        res.status(200).type('json').send(allNeighborhoods);
    });
});

// REST API: GET/incidents
// Respond with list of crime incidents
app.get('/incidents', (req, res) => {
    let url = new URL(req.protocol + '://' + req.get('host') + req.originalUrl);

    let sql = 'SELECT * from Incidents';
    db.all(sql, (err, rows) => {
        var allIncidents = [];
        for(let i = 0; i < rows.length; i++)
        {
            let time = rows[i].date_time.split("T");
            let incident = {
                case_number: rows[i].case_number,
                date: time[0],
                time: time[1],
                code: rows[i].code,
                incident: rows[i].incident,
                police_grid: rows[i].police_grid,
                neighborhood_number: rows[i].neighborhood_number,
                block: rows[i].block
            };
            allIncidents.push(incident);
        }
        res.status(200).type('json').send(allIncidents);
    });
});

// REST API: PUT /new-incident
// Respond with 'success' or 'error'
app.put('/new-incident', (req, res) => {
    let url = new URL(req.protocol + '://' + req.get('host') + req.originalUrl);

    res.status(200).type('txt').send('success');
});


// Create Promise for SQLite3 database SELECT query 
function databaseSelect(query, params) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(rows);
            }
        })
    })
}

// Create Promise for SQLite3 database INSERT query
function databaseInsert(query, params) {
    return new Promise((resolve, reject) => {
        db.run(query, params, (err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    })
}


// Start server
app.listen(port, () => {
    console.log('Now listening on port ' + port);
});
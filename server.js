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
    let askCodes = url.searchParams.get('code');
    let sql = '';
    let params = '';
    if(askCodes == null)
    {
        sql = 'SELECT * from Codes';
        db.all(sql, (err, rows) => {
            var allCodes = [];
            for(let i = 0; i < rows.length; i++)
            {
                let code = {code: rows[i].code, type: rows[i].incident_type}
                allCodes.push(code);
            }
            res.status(200).type('json').send(allCodes);
        });
    }
    else
    {
        params = askCodes.split(",");
        sql = 'SELECT * from Codes WHERE code = ? ';
        console.log(params.length);
        for(let i = 1; i < params.length; i++)        
        {
            sql = sql + 'OR code = ?';
        }
        db.all(sql, params, (err, rows) => {
            var allCodes = [];
            for(let i = 0; i < rows.length; i++)
            {
                let code = {code: rows[i].code, type: rows[i].incident_type}
                allCodes.push(code);
            }
            res.status(200).type('json').send(allCodes);
        });
    }
    
});

// REST API: GET /neighborhoods
// Respond with list of neighborhood ids and their corresponding neighborhood name
app.get('/neighborhoods', (req, res) => {
    let url = new URL(req.protocol + '://' + req.get('host') + req.originalUrl);
    let askIds = url.searchParams.get('id');
    let sql = '';
    let params = '';
    if(askIds == null)
    {
        sql = 'SELECT * from Neighborhoods';
        db.all(sql, (err, rows) => {
            var allNeighborhoods = [];
            for(let i = 0; i < rows.length; i++)
            {
                let neighborhood = {id: rows[i].neighborhood_number, name: rows[i].neighborhood_name}
                allNeighborhoods.push(neighborhood);
            }
            res.status(200).type('json').send(allNeighborhoods);
        });
    }
    else
    {
        params = askIds.split(",");
        sql = 'SELECT * from Neighborhoods WHERE neighborhood_number = ?';

        for(let i = 1; i < params.length; i++)        
        {
            sql = sql + ' OR neighborhood_number = ?';
        }
        db.all(sql, params, (err, rows) => {
            var allNeighborhoods = [];
            for(let i = 0; i < rows.length; i++)
            {
                let neighborhood = {id: rows[i].neighborhood_number, name: rows[i].neighborhood_name}
                allNeighborhoods.push(neighborhood);
            }
            res.status(200).type('json').send(allNeighborhoods);
        });
    }
});

// REST API: GET/incidents
// Respond with list of crime incidents
app.get('/incidents', (req, res) => {
    let url = new URL(req.protocol + '://' + req.get('host') + req.originalUrl);

    let start = url.searchParams.get('start_date');
    let end = url.searchParams.get('end_date');
    let code = url.searchParams.get('code');
    let grid = url.searchParams.get('grid');
    let neighborhood = url.searchParams.get('neighborhood');
    let limit = parseInt(url.searchParams.get('limit'));
    
    var params = [];
    let search = false;

    let sql = 'SELECT * from Incidents WHERE (1=1';
    if(start != null)
    {
        sql = sql + ' AND (SUBSTR(date_time, 1, 10) >= ?)'
        params.push(start);
        search = true;
    }
    if(end != null)
    {
        sql = sql + ' AND (SUBSTR(date_time, 1, 10) <= ?)'
        params.push(end);
        search = true;
    }
    if(code != null)
    {
        let searchCodes = code.split(",");
        sql = sql + ' AND (code = ?'
        params.push(searchCodes[0]);
        for(let i = 1; i < searchCodes.length; i++)        
        {
            params.push(parseInt(searchCodes[i]));
            sql = sql + ' OR code = ?';
        }
        sql = sql + ')';
        search = true;
    }
    if(grid != null)
    {
        let searchGrids = grid.split(",");
        sql = sql + ' AND (police_grid = ?'
        params.push(searchGrids[0]);
        for(let i = 1; i < searchGrids.length; i++)        
        {
            params.push(parseInt(searchGrids[i]));
            sql = sql + ' OR police_grid = ?';
        }
        sql = sql + ')';
        search = true;

    }
    if(neighborhood != null)
    {
        let searchNeighbor = neighborhood.split(",");
        sql = sql + ' AND (neighborhood_number = ?'
        params.push(searchNeighbor[0]);
        for(let i = 1; i < searchNeighbor.length; i++)        
        {
            params.push(parseInt(searchNeighbor[i]));
            sql = sql + ' OR neighborhood_number = ?';
        }
        sql = sql + ')';
        search = true;

    }

    //console.log("Search params: " + params);
    console.log("Searching database")
    sql = sql + ') ORDER BY date_time DESC;';
    if (search)
    {
        db.all(sql, params, (err, rows) => {
            var allIncidents = [];
            if (Number.isNaN(limit))
            {
                if (rows.length > 1000)
                    limit = 1000;
                else
                    limit = rows.length;
            }
            for(let i = 0; i < limit; i++)
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
    }
    else
    {
        db.all(sql, (err, rows) => {
            
            var allIncidents = [];
            if (Number.isNaN(limit))
            {
                if (rows.length > 1000)
                    limit = 1000;
                else
                    limit = rows.length;
            }
            for(let i = 0; i < limit; i++)
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
    }
});

// REST API: PUT /new-incident
// Respond with 'success' or 'error'
app.put('/new-incident', (req, res) => {
    let url = new URL(req.protocol + '://' + req.get('host') + req.originalUrl);

    let caseNum = parseInt(url.searchParams.get('case_number'));
    let date = url.searchParams.get('date');
    let time = url.searchParams.get('time');
    let date_time = date + "T" + time;
    let code = url.searchParams.get('code');
    let incident = url.searchParams.get('incident');
    let police_grid = parseInt(url.searchParams.get('police_grid'));
    let neighborhood = parseInt(url.searchParams.get('neighborhood_number'));
    let block = url.searchParams.get('block');

    console.log(caseNum);
    let sql = 'SELECT * from Incidents WHERE case_number = ?';
    db.all(sql, caseNum, (err, rows) => {
        if(rows.length > 0)
            res.status(500).type('txt').send('ERROR: Incident # already exists');
    
        else
        {
            sql = 'INSERT INTO Incidents VALUES (?, ?, ?, ?, ?, ?, ?)';
            let param =  [caseNum, date_time, code, incident, police_grid, neighborhood, block];
            db.all(sql, param, (err) => {
                if(err)
                    res.status(404).type('txt').send('failure');
                else
                    res.status(200).type('txt').send('success');
            });
        }
        });
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

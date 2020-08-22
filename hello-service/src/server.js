const os = require('os');
const express = require('express');
const prometheus = require('prom-client');
const metrics = require('./metrics');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const Pool = require('pg').Pool;
const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT,
})

const collectDefaultMetrics = prometheus.collectDefaultMetrics;
collectDefaultMetrics({ prefix: 'hello_service:' });

// Runs before each requests
app.use((req, res, next) => {
  console.log("Before request..." + req.path);
  console.log("Received request from " + os.hostname() + ", ipaddr = " + req.connection.remoteAddress);
  
  if (req.path != '/metrics') {
      metrics.requests.labels(req.method, req.path, res.statusCode).inc();
      
      res.locals.startEpoch = Date.now();
      console.log("startEpoch = " +res.locals.startEpoch);
  }
  next();
})

app.get('/', function(request, response, next) {
    response.status(200).json({ info: 'Node.js, Express, and Postgres API' });
    next();
})

app.get('/metrics', function(request, response, next) {
    response.status(200).set('Content-Type', prometheus.register.contentType);
    response.end(prometheus.register.metrics());
})

app.get('/config', function(request, response, next) {
    
    var connectionInfo = {
        greeting : process.env.GREETING,
        url : process.env.DATABASE_URI,
        host : process.env.POSTGRES_HOST,
        port : process.env.POSTGRES_PORT,
        user : process.env.POSTGRES_USER,
        password : process.env.POSTGRES_PASSWORD,
        database : process.env.POSTGRES_DB
    }
    console.log(`Creating database connection pool using ${connectionInfo}`);
    response.status(200).json(connectionInfo);
    next();
})

app.get("/health", function(request, response, next) {
    response.status(200).json({ status: 'OK' });
    next();
});

app.get("/fast", function(request, response, next) {
    response.status(200).send('Fast Response');
    next();
});

app.get("/slow", function(request, response, next) {
    setTimeout(() => {
        response.status(200).send('Slow Response');
        next();
    }, 1000);
});

app.get("/error", function(request, response, next) {
    response.status(500).send('Internal Server Error');
    next();
});

app.get('/clients', (request, response, next) => {
  pool.query('SELECT * FROM client ORDER BY id ASC', (error, results) => {
    if (error) {
      return next(error)
    }
    response.status(200).json(results.rows);
    next();
  })
})

app.get('/clients/:id', (request, response, next) => {
  const id = parseInt(request.params.id)

  pool.query('SELECT * FROM client WHERE id = $1', [id], (error, results) => {
    if (error) {
      return next(error)
    }
    response.status(200).json(results.rows);
    next();
  })
});

app.post('/clients', (request, response, next) => {
  console.log(request.body);
  
  const { name } = request.body
  
  pool.query('INSERT INTO client ( name) VALUES ($1) RETURNING *', [name], (error, results) => {
    if (error) {
      return next(error)
    }
    
    console.log(results);
    response.status(201).json({ status: "Success", description: "Client added", userId: results.rows[0].id});
    next();
  })
});

app.put('/clients/:id', (request, response, next) => {
  console.log(request.body);
  
  const id = parseInt(request.params.id)
  const { name } = request.body

  pool.query(
    'UPDATE client SET name = $1 WHERE id = $2',
    [name, id],
    (error, results) => {
      if (error) {
        return next(error)
      }
      
      console.log(results);
      response.status(200).json({ status: "Success", description: `Client modified with ID: ${id}`});
      next();
    }
  )
});

app.delete('/clients/:id', (request, response, next) => {
  const id = parseInt(request.params.id)

  pool.query('DELETE FROM client WHERE id = $1', [id], (error, results) => {
    if (error) {
      return next(error)
    }
      
    console.log(results);
    response.status(200).json({ status: "Success", description: `Client deleted with ID: ${id}`});
    next();
  })
});

app.get('/users/me', (request, response, next) => {

    var userInfo = {
        id : request.header('X-UserId'),
        login : request.header('X-User'),
        email : request.header('X-Email'),
        first_name : request.header('X-First-Name'),
        last_name : request.header('X-Last-Name')
    }

    response.status(200).json(userInfo);
    next();
});

// Error handler
app.use((err, req, res, next) => {
  if(req.url != '/metrics') {
      res.status(500).json({ error: err.message });
      metrics.errors.labels(req.method, req.path, res.statusCode).inc();
  }
  next();
})

// Runs after each requests
app.use((req, res, next) => {
  console.log("After request..." + req.path + "; status" + res.statusCode);
  
  if(req.url != '/metrics') {
      console.log("startEpoch = " + res.locals.startEpoch);
      const responseTimeInMs = Date.now() - res.locals.startEpoch;
      console.log("responseTimeInMs = " + responseTimeInMs);
      
      metrics.latency.labels(req.method, req.path).observe(responseTimeInMs);
      if (res.statusCode > 400) {
         metrics.errors.labels(req.method, req.path, res.statusCode).inc();
      }
  }
  
  next();
})

const server = app.listen(8080, function() {
    console.log("Server listening on port 8080...");
})

// Graceful shutdown
process.on('SIGTERM', () => {
  clearInterval(collectDefaultMetrics)

  server.close((err) => {
    if (err) {
      console.error(err)
      process.exit(1)
    }

    process.exit(0)
  })
})
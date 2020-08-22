

const Pool = require('pg').Pool
const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT,
})

const getClients = (request, response, next) => {
  pool.query('SELECT * FROM client ORDER BY id ASC', (error, results) => {
    if (error) {
      throw error
    }
    response.status(200).json(results.rows)
  })
  
  next();
}

const getClientById = (request, response, next) => {
  const id = parseInt(request.params.id)

  pool.query('SELECT * FROM client WHERE id = $1', [id], (error, results) => {
    if (error) {
      throw error
    }
    response.status(200).json(results.rows)
  })
  
  next();
}

const createClient = (request, response, next) => {
  console.log(request.body);
  
  const { name } = request.body
  
  pool.query('INSERT INTO client ( name) VALUES ($1) RETURNING *', [name], (error, results) => {
    if (error) {
      throw error
    }
    
    console.log(results);
  response.status(201).json({ status: "Success", description: "Client added", userId: results.rows[0].id});
  })
  
  next();
}

const updateClient = (request, response, next) => {
  console.log(request.body);
  
  const id = parseInt(request.params.id)
  const { name } = request.body

  pool.query(
    'UPDATE client SET name = $1 WHERE id = $2',
    [name, id],
    (error, results) => {
      if (error) {
        throw error
      }
      
      console.log(results);
      response.status(200).json({ status: "Success", description: `Client modified with ID: ${id}`});
    }
  )
  
  next();
}

const deleteClient = (request, response, next) => {
  const id = parseInt(request.params.id)

  pool.query('DELETE FROM client WHERE id = $1', [id], (error, results) => {
    if (error) {
      throw error
    }
      
   console.log(results);
   response.status(200).json({ status: "Success", description: `Client deleted with ID: ${id}`});
  })
}

module.exports = {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient
}
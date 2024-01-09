const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');


// Cria uma instância do Express
const app = express();
const port = 3000;

// Configurações para se conectar ao banco de dados MySQL
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'acesso123',
    database: 'gamedan'
};

app.get('/descricao', (req, res) => {
    // Caminho completo até o arquivo index.html na pasta descricao
    const indexPath = path.join(__dirname, './descricao/index.html');
    
    // Envia o arquivo index.html como resposta
    res.sendFile(indexPath);
});

app.get('/api/jogos', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows, fields] = await connection.execute('SELECT * FROM games');
        await connection.end();
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar dados do banco de dados:', error);
        res.status(500).send('Erro interno do servidor');
    }
});

// Servir arquivos estáticos, incluindo a página index.html na pasta games
app.use(express.static(path.join(__dirname, 'jogos')));

app.listen(port, () => {
    console.log(`Servidor Express rodando em http://localhost:${port}`);
});

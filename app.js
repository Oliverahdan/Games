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


app.get('/descricao', async (req, res) => {
    try {
        const gameId = req.query.id;

        if (!gameId) {
            return res.status(400).send('ID do jogo não fornecido');
        }

        console.log('Recebido pedido para o jogo com ID:', gameId);

        const connection = await mysql.createConnection(dbConfig);
        const [rows, fields] = await connection.execute('SELECT * FROM games WHERE id = ?', [gameId]);
        await connection.end();

        if (rows.length === 0) {
            console.log('Jogo não encontrado no banco de dados');
            return res.status(404).send('Jogo não encontrado');
        }

        console.log('Dados do jogo encontrado:', rows[0]);

        // Renderiza a página descricao.html com os dados do jogo
        res.sendFile(path.join(__dirname, '/descricao/index.html'));
    } catch (error) {
        console.error('Erro na consulta ao banco de dados:', error);
        res.status(500).send('Erro interno no servidor');
    }
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

const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');

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

// Função para criar e retornar uma nova conexão
async function createConnection() {
    return await mysql.createConnection(dbConfig);
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/descricao', async (req, res) => {
    try {
        const gameId = req.query.id;

        if (!gameId) {
            return res.status(400).send('ID do jogo não fornecido');
        }

        console.log('Recebido pedido para o jogo com ID:', gameId);

        const connection = await createConnection();
        const [rows, fields] = await connection.execute('SELECT * FROM games WHERE id = ?', [gameId]);
        
        if (rows.length === 0) {
            console.log('Jogo não encontrado no banco de dados');
            return res.status(404).send('Jogo não encontrado');
        }

        console.log('Dados do jogo encontrado:', rows[0]);

        // Renderiza a página descricao.html com os dados do jogo
        res.sendFile(path.join(__dirname, '/descricao/index.html'));

        // Não fechamos a conexão aqui para que ela esteja disponível para outras rotas
    } catch (error) {
        console.error('Erro na consulta ao banco de dados:', error);
        res.status(500).send('Erro interno no servidor');
    }
});

// API endpoint for user login
app.post('/login', (req, res) => {
    const { nome, email } = req.body;
  
    // Retrieve user data from the 'users' table
    connection.query('SELECT * FROM users WHERE name = ? AND password = ?', [nome, email], (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Erro no servidor' });
      }
  
      if (results.length === 0) {
        return res.status(401).json({ message: 'Credenciais inválidas' });
      }

  
      // Redirecione o usuário para a página de grupo
      res.redirect('/jogos');
    });
  });

  app.get('/api/jogos', async (req, res) => {
    try {
        const searchTerm = req.query.name ? req.query.name.toLowerCase() : null;

        const connection = await createConnection();
        
        // Se houver um termo de pesquisa, realizar uma consulta filtrada
        if (searchTerm) {
            const [rows, fields] = await connection.execute('SELECT * FROM games WHERE LOWER(name) LIKE ?', [`%${searchTerm}%`]);
            res.json(rows);
        } else {
            // Caso contrário, obter todos os jogos
            const [rows, fields] = await connection.execute('SELECT * FROM games');
            res.json(rows);
        }

        await connection.end();
    } catch (error) {
        console.error('Erro ao buscar dados do banco de dados:', error);
        res.status(500).send('Erro interno do servidor');
    }
});

// Rota para salvar usuário host
app.post('/api/userhost', async (req, res) => {
    const { nome, email, senha } = req.body;

    try {
        const connection = await createConnection();

        // Inserir os dados do usuário na tabela 'userhost' com senha em texto simples
        const [results] = await connection.execute('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [nome, email, senha]);

        // Redirecionar para '/grupo' após inserção bem-sucedida
        res.redirect('/login');
    } catch (err) {
        console.error('Erro no servidor:', err);
        res.status(500).json({ message: 'Erro no servidor' });
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

app.get('/cadastro', async (req, res) => {
    res.sendFile(path.join(__dirname, '/cadastro/index.html'));
});

app.get('/login', async (req, res) => {
    res.sendFile(path.join(__dirname, '/login/index.html'));
});

app.get('/shop', async (req, res) => {
    res.sendFile(path.join(__dirname, '/shop/index.html'));
});

app.get('/jogos', async (req, res) => {
    res.sendFile(path.join(__dirname, '/jogos/index.html'));
});

app.get('/', async (req, res) => {
    res.sendFile(path.join(__dirname, '/jogos/index.html'));
});

app.listen(port, () => {
    console.log(`Servidor Express rodando em http://localhost:${port}`);
});

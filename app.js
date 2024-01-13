const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const app = express();
const port = 3000;

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'danisilva0304',
    database: 'gamedan'
};

// Função para criar e retornar uma nova conexão
async function createConnection() {
    return await mysql.createConnection(dbConfig);
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Middleware para garantir a criação de uma nova conexão antes de cada rota
app.use(async (req, res, next) => {
    req.locals = {}; // Criar um objeto locals para armazenar variáveis locais

    // Criar uma nova conexão e armazená-la em req.locals.connection
    req.locals.connection = await createConnection();
    next();
});

app.get('/descricao', async (req, res) => {
    try {
        const gameId = req.query.id;

        if (!gameId) {
            return res.status(400).send('ID do jogo não fornecido');
        }

        console.log('Recebido pedido para o jogo com ID:', gameId);

        const [rows, fields] = await req.locals.connection.execute('SELECT * FROM games WHERE id = ?', [gameId]);

        if (rows.length === 0) {
            console.log('Jogo não encontrado no banco de dados');
            return res.status(404).send('Jogo não encontrado');
        }

        console.log('Dados do jogo encontrado:', rows[0]);

        res.sendFile(path.join(__dirname, '/descricao/index.html'));
    } catch (error) {
        console.error('Erro na consulta ao banco de dados:', error);
        res.status(500).send('Erro interno no servidor');
    }
});

app.post('/login', async (req, res) => {
    const { email, senha } = req.body;

    try {
        const [results] = await req.locals.connection.execute('SELECT * FROM users WHERE email = ? AND password = ?', [email, senha]);

        if (results.length === 0) {
            res.status(401).json({ message: 'Credenciais inválidas' });
        } else {
            res.cookie('userId', results[0].id);
            res.redirect('/jogos');
        }
    } catch (error) {
        console.error('Erro no servidor:', error);
        res.status(500).json({ message: 'Erro no servidor' });
    }
});

// Rota para comprar
app.post('/comprar', async (req, res) => {
    const gameId = req.body.gameId;
    const userId = req.body.userId;

    const userCookie = req.cookies.userId;

    if (!userCookie || userCookie !== userId) {
        return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    try {
        const [results] = await req.locals.connection.execute('INSERT INTO shop (game, user) VALUES (?, ?)', [gameId, userId]);
        res.json({ message: 'Compra realizada com sucesso' });
    } catch (error) {
        console.error('Erro ao realizar a compra:', error);
        res.status(500).json({ message: 'Erro interno no servidor ao realizar a compra' });
    }
});

app.get('/api/user/:id', async (req, res) => {
    const userId = req.params.id;

    try {
        const connection = await createConnection();
        const [results] = await connection.execute('SELECT * FROM users WHERE id = ?', [userId]);

        if (results.length === 0) {
            res.status(404).json({ message: 'Usuário não encontrado' });
        } else {
            res.json(results[0]);
        }

        await connection.end();
    } catch (error) {
        console.error('Erro no servidor:', error);
        res.status(500).json({ message: 'Erro no servidor' });
    }
});

app.get('/compras', async (req, res) => {
    try {
        const userId = req.cookies.userId;

        if (!userId) {
            return res.status(401).json({ message: 'Usuário não autenticado' });
        }

        const [results] = await req.locals.connection.execute(`
            SELECT shop.game, shop.user, games.image, games.name, games.price
            FROM shop
            JOIN games ON shop.game = games.id
            WHERE shop.user = ?
        `, [userId]);

        res.json(results);
    } catch (error) {
        console.error('Erro ao buscar compras:', error);
        res.status(500).json({ message: 'Erro interno no servidor ao buscar compras' });
    }
});

app.delete('/excluir-compra/:game/:user', async (req, res) => {
    const gameID = req.params.game;
    const userID = req.params.user;

    console.log('UserID:', userID);
    console.log('GameID:', gameID);
    try {
        // Buscar detalhes do jogo associado à compra
        const [gameDetails] = await req.locals.connection.execute('SELECT * FROM games WHERE id = ?', [gameID]);

        if (gameDetails.length === 0) {
            res.status(404).json({ message: 'Detalhes do jogo não encontrados' });
            return;
        }

        // Agora você pode usar os detalhes do jogo conforme necessário

        // Exemplo: excluindo a compra associada ao usuário e jogo
        const [deleteResults] = await req.locals.connection.execute('DELETE FROM shop WHERE user = ? AND game = ?', [userID, gameID]);

        if (deleteResults.affectedRows === 0) {
            res.status(404).json({ message: 'Compra não encontrada para exclusão' });
        } else {
            res.json({ message: 'Compra excluída com sucesso', game: gameDetails[0] });
        }
    } catch (error) {
        console.error('Erro ao excluir a compra:', error);
        res.status(500).json({ message: 'Erro interno no servidor ao excluir a compra' });
    }
});

// Rota para obter a quantidade de estrelas
app.get('/api/estrelas', async (req, res) => {
    const gameId = parseInt(req.query.gameId);
    const userId = parseInt(req.query.userId);

    try {
        const [ratingResults] = await req.locals.connection.execute('SELECT qt FROM stars WHERE game = ? AND user = ?', [gameId, userId]);

        if (ratingResults.length > 0) {
            res.json({ qt: ratingResults[0].qt });
        } else {
            res.status(404).json({ error: 'Avaliação não encontrada' });
        }
    } catch (error) {
        console.error('Erro ao obter a avaliação do banco de dados:', error);
        res.status(500).json({ message: 'Erro interno no servidor' });
    }
});


/// Rota para salvar avaliação
app.post('/salvar-avaliacao', async (req, res) => {
    const gameId = req.body.gameId;
    const userId = req.body.userId;
    const qtEstrelas = req.body.qtEstrelas;

    const userCookie = req.cookies.userId;

    if (!userCookie || userCookie !== userId) {
        return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    try {
        // Verificar se o usuário já avaliou o jogo
        const [existingRating] = await req.locals.connection.execute('SELECT * FROM stars WHERE game = ? AND user = ?', [gameId, userId]);

        if (existingRating.length > 0) {
            // O usuário já avaliou o jogo; atualizar a avaliação existente
            const [updateResults] = await req.locals.connection.execute('UPDATE stars SET qt = ? WHERE game = ? AND user = ?', [qtEstrelas, gameId, userId]);

            if (updateResults.affectedRows === 0) {
                res.status(500).json({ message: 'Erro ao atualizar a avaliação' });
            } else {
                res.json({ message: 'Avaliação atualizada com sucesso' });
            }
        } else {
            // O usuário ainda não avaliou o jogo; inserir uma nova avaliação
            const [insertResults] = await req.locals.connection.execute('INSERT INTO stars (qt, game, user) VALUES (?, ?, ?)', [qtEstrelas, gameId, userId]);

            if (insertResults.affectedRows === 0) {
                res.status(500).json({ message: 'Erro ao salvar a avaliação' });
            } else {
                res.json({ message: 'Avaliação salva com sucesso' });
            }
        }
    } catch (error) {
        console.error('Erro ao salvar/atualizar a avaliação no banco de dados:', error);
        res.status(500).json({ message: 'Erro interno no servidor ao salvar/atualizar a avaliação' });
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
app.get('/conta', async (req, res) => {
    res.sendFile(path.join(__dirname, '/conta/index.html'));
});

app.get('/', async (req, res) => {
    res.sendFile(path.join(__dirname, '/jogos/index.html'));
});

// Rota para fechar a conexão ao final de cada requisição
app.use((req, res, next) => {
    if (req.locals.connection) {
        req.locals.connection.end();
    }
    next();
});

app.listen(port, () => {
    console.log(`Servidor Express rodando em http://localhost:${port}`);
});
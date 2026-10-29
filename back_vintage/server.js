
const express = require('express');
const cors = require('cors');
const path = require('path');

const db = require('./db');
const { autenticar, permitir } = require('./auth');
const criarCrud = require('./routes/crud');

const app = express();
const hostname = '127.0.0.1';
const port = 3000;

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '..', 'front_vintage')));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'front_vintage', 'index.html'));
});

app.get('/aluno/listar', async (req, res) => {
    try {
        const [alunos] = await db.query('SELECT * FROM alunos');
        res.json(alunos);
    } catch (erro) {
        console.error('Erro ao listar alunos:', erro.message);
        res.status(500).json({ erro: 'Erro ao buscar alunos.' });
    }
});

app.use('/api', require('./routes/login'));
app.use('/api/cadastro', require('./routes/cadastro'));

app.use('/api', autenticar);

app.use('/api/clientes', criarCrud('clientes', ['nome', 'email', 'telefone'], ['admin', 'vendedor']));
app.use('/api/produtos', criarCrud('produtos', ['nome', 'categoria', 'preco', 'estoque'], ['admin', 'estoquista']));
app.use('/api/lojas', criarCrud('lojas', ['nome', 'endereco', 'cidade'], ['admin', 'estoquista']));
app.use('/api/fornecedores', criarCrud('fornecedores', ['nome', 'cnpj', 'telefone', 'email'], ['admin', 'estoquista']));

app.use('/api/vendas', require('./routes/vendas'));
app.use('/api/pagamentos', permitir('admin', 'vendedor'), require('./routes/pagamentos'));
app.use('/api/usuarios', permitir('admin'), require('./routes/usuarios'));

app.use((req, res) => {
    res.status(404).json({ erro: 'Rota não encontrada.' });
});

app.use((err, req, res, next) => {
    console.error(err.message);

    const mensagens = {
        ER_ROW_IS_REFERENCED_2: [409, 'Não é possível excluir: o registro está em uso.'],
        ER_DUP_ENTRY: [409, 'Já existe um registro com esse valor.'],
        ER_BAD_NULL_ERROR: [400, 'Preencha todos os campos obrigatórios.'],
        ER_NO_REFERENCED_ROW_2: [400, 'Cliente, loja ou produto inexistente.'],
        ER_CHECK_CONSTRAINT_VIOLATED: [400, 'Valor inválido.'],
        ER_TRUNCATED_WRONG_VALUE_FOR_FIELD: [400, 'Valor inválido em algum campo.']
    };

    if (mensagens[err.code]) {
        return res.status(mensagens[err.code][0]).json({
            erro: mensagens[err.code][1]
        });
    }

    if (err.status) {
        return res.status(err.status).json({ erro: err.message });
    }

    res.status(500).json({ erro: 'Erro interno do servidor.' });
});

async function iniciarServidor() {
    try {
        await db.query('SELECT 1');
        console.log('Conectado ao MySQL com sucesso!');

        app.listen(port, hostname, () => {
            console.log(`Servidor rodando em http://${hostname}:${port}/`);
        });
    } catch (erro) {
        console.error('Erro ao conectar ao MySQL:', erro.message);
    }
}

iniciarServidor();

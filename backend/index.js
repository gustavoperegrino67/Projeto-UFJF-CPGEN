// /backend/index.js (Versão Mestre com Ordem de Rotas Corrigida)
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authMiddleware = require('./authMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET;
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'sistema_gestao',
    password: process.env.DB_PASSWORD,
    port: 5433,
});

// --- ROTAS PÚBLICAS (Acessíveis sem token) ---

app.get('/', (req, res) => res.send('<h1>Servidor do Sistema de Gestão está no ar!</h1>'));

app.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        if (!email || !senha) { return res.status(400).json({ error: 'Email e senha são obrigatórios.' }); }
        const userQuery = 'SELECT * FROM usuarios WHERE email = $1 AND ativo = TRUE';
        const result = await pool.query(userQuery, [email]);
        const user = result.rows[0];
        if (!user) { return res.status(401).json({ error: 'Credenciais inválidas ou usuário inativo.' }); }
        const senhaValida = await bcrypt.compare(senha, user.senha_hash);
        if (!senhaValida) { return res.status(401).json({ error: 'Credenciais inválidas.' }); }
        const tokenPayload = { id: user.id, email: user.email, papel: user.id_papel };
        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });
        res.status(200).json({ message: 'Login bem-sucedido!', token: token });
    } catch (err) {
        console.error('Erro no login:', err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});


// --- ROTAS PROTEGIDAS (Exigem token) ---
app.use('/api', authMiddleware);

// ## ROTAS DE CONFIGURAÇÕES E KANBAN (USUÁRIOS) ##

// A rota mais específica ("/meu-setor") deve vir ANTES da rota genérica ("/:id")
app.get('/api/usuarios/meu-setor', async (req, res) => {
    try {
        const setorResult = await pool.query('SELECT id_setor FROM usuarios WHERE id = $1', [req.user.id]);
        if (setorResult.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado.' });
        const id_setor = setorResult.rows[0].id_setor;
        const usersResult = await pool.query('SELECT id, nome_completo FROM usuarios WHERE id_setor = $1 AND ativo = TRUE ORDER BY nome_completo', [id_setor]);
        res.status(200).json(usersResult.rows);
    } catch (err) { 
        console.error('Erro ao buscar usuários do setor:', err); 
        res.status(500).json({ error: 'Erro interno do servidor.' }); 
    }
});

app.post('/api/usuarios', async (req, res) => {
    if (req.user.papel !== 1) { return res.status(403).json({ error: 'Acesso negado. Apenas gestores podem criar usuários.' }); }
    try {
        const { nome_completo, email, senha, id_papel } = req.body;
        if (!nome_completo || !email || !senha || !id_papel) { return res.status(400).json({ error: 'Todos os campos são obrigatórios.' }); }
        const gestorResult = await pool.query('SELECT id_setor FROM usuarios WHERE id = $1', [req.user.id]);
        const id_setor = gestorResult.rows[0].id_setor;
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt);
        const novoUsuarioQuery = `INSERT INTO usuarios (nome_completo, email, senha_hash, id_setor, id_papel) VALUES ($1, $2, $3, $4, $5) RETURNING id, nome_completo, email;`;
        const result = await pool.query(novoUsuarioQuery, [nome_completo, email, senhaHash, id_setor, id_papel]);
        res.status(201).json({ message: 'Usuário criado com sucesso!', usuario: result.rows[0] });
    } catch (err) {
        if (err.code === '23505') { return res.status(409).json({ error: 'Este e-mail já está cadastrado.' }); }
        console.error('Erro ao criar usuário:', err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.get('/api/usuarios', async (req, res) => {
    if (req.user.papel !== 1) { return res.status(403).json({ error: 'Acesso negado.' }); }
    try {
        const gestorResult = await pool.query('SELECT id_setor FROM usuarios WHERE id = $1', [req.user.id]);
        const id_setor = gestorResult.rows[0].id_setor;
        const query = `
            SELECT u.id, u.nome_completo, u.email, u.ativo, p.nome as nome_papel
            FROM usuarios u
            JOIN papeis p ON u.id_papel = p.id
            WHERE u.id_setor = $1 ORDER BY u.nome_completo;`;
        const result = await pool.query(query, [id_setor]);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Erro ao listar usuários do setor:', err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.patch('/api/usuarios/:id/status', async (req, res) => {
    if (req.user.papel !== 1) { return res.status(403).json({ error: 'Acesso negado.' }); }
    try {
        const { id: idUsuarioParaAlterar } = req.params;
        const { novoStatus } = req.body;
        if (typeof novoStatus !== 'boolean') { return res.status(400).json({ error: 'O novo status é inválido.' }); }
        const gestorResult = await pool.query('SELECT id_setor FROM usuarios WHERE id = $1', [req.user.id]);
        const id_setor_gestor = gestorResult.rows[0].id_setor;
        const usuarioResult = await pool.query('SELECT id_setor FROM usuarios WHERE id = $1', [idUsuarioParaAlterar]);
        if (usuarioResult.rows.length === 0) { return res.status(404).json({ error: 'Usuário não encontrado.' }); }
        if (usuarioResult.rows[0].id_setor !== id_setor_gestor) { return res.status(403).json({ error: 'Você não tem permissão para alterar este usuário.' }); }
        const query = `UPDATE usuarios SET ativo = $1 WHERE id = $2 RETURNING id, ativo;`;
        const result = await pool.query(query, [novoStatus, idUsuarioParaAlterar]);
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error('Erro ao alterar status do usuário:', err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.get('/api/usuarios/:id', async (req, res) => {
    if (req.user.papel !== 1) { return res.status(403).json({ error: 'Acesso negado.' }); }
    try {
        const { id } = req.params;
        const query = 'SELECT id, nome_completo, email, id_papel FROM usuarios WHERE id = $1';
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) { return res.status(404).json({ error: 'Usuário não encontrado.' }); }
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error('Erro ao buscar dados do usuário:', err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.put('/api/usuarios/:id', async (req, res) => {
    if (req.user.papel !== 1) { return res.status(403).json({ error: 'Acesso negado.' }); }
    try {
        const { id } = req.params;
        const { nome_completo, email, id_papel } = req.body;
        if (!nome_completo || !email || !id_papel) { return res.status(400).json({ error: 'Nome, email e papel são obrigatórios.' }); }
        const query = `UPDATE usuarios SET nome_completo = $1, email = $2, id_papel = $3 WHERE id = $4 RETURNING id;`;
        await pool.query(query, [nome_completo, email, id_papel, id]);
        res.status(200).json({ message: 'Dados do usuário atualizados com sucesso!' });
    } catch (err) {
        if (err.code === '23505') { return res.status(409).json({ error: 'Este e-mail já está em uso.' }); }
        console.error('Erro ao atualizar usuário:', err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.patch('/api/usuarios/:id/senha', async (req, res) => {
    if (req.user.papel !== 1) { return res.status(403).json({ error: 'Acesso negado.' }); }
    try {
        const { id: idUsuarioParaAlterar } = req.params;
        const { novaSenha } = req.body;
        if (!novaSenha || novaSenha.length < 6) { return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' }); }
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(novaSenha, salt);
        const query = 'UPDATE usuarios SET senha_hash = $1 WHERE id = $2';
        await pool.query(query, [senhaHash, idUsuarioParaAlterar]);
        res.status(200).json({ message: 'Senha atualizada com sucesso!' });
    } catch (err) {
        console.error('Erro ao atualizar senha:', err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

// ## ROTAS DE DASHBOARD E RELATÓRIOS ##
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const id_usuario = req.user.id;
        const statsQuery = `SELECT la.nome, COUNT(r.id) as total_relatorios FROM relatorios r JOIN locais_atendimento la ON r.id_local_atendimento = la.id WHERE r.id_usuario = $1 GROUP BY la.nome ORDER BY total_relatorios DESC;`;
        const result = await pool.query(statsQuery, [id_usuario]);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Erro ao buscar estatísticas:', err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.get('/api/locais-atendimento', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM locais_atendimento WHERE ativo = TRUE ORDER BY nome');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Erro ao buscar locais:', err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.post('/api/locais-atendimento', async (req, res) => {
    if (req.user.papel !== 1) { return res.status(403).json({ error: 'Acesso negado.' }); }
    try {
        const { nome } = req.body;
        if (!nome || nome.trim() === '') {
            return res.status(400).json({ error: 'O nome do local é obrigatório.' });
        }
        const query = 'INSERT INTO locais_atendimento (nome) VALUES ($1) RETURNING *';
        const result = await pool.query(query, [nome.trim()]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') { return res.status(409).json({ error: 'Este local de atendimento já existe.' }); }
        console.error('Erro ao criar local:', err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.post('/api/relatorios', async (req, res) => {
    try {
        const { id_local_atendimento, data_atendimento, descricao_trabalho } = req.body;
        const id_usuario = req.user.id;
        if (!id_local_atendimento || !data_atendimento || !descricao_trabalho) { return res.status(400).json({ error: 'Todos os campos são obrigatórios.' }); }
        const query = `INSERT INTO relatorios (id_usuario, id_local_atendimento, data_atendimento, descricao_trabalho) VALUES ($1, $2, $3, $4) RETURNING *;`;
        const result = await pool.query(query, [id_usuario, id_local_atendimento, data_atendimento, descricao_trabalho]);
        res.status(201).json({ message: 'Relatório enviado com sucesso!', relatorio: result.rows[0] });
    } catch (err) {
        console.error('Erro ao enviar relatório:', err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.get('/api/relatorios', async (req, res) => {
    try {
        const { id: id_usuario, papel: id_papel } = req.user;
        let query, queryParams;
        if (id_papel === 1) { // Gestor
            const setorResult = await pool.query('SELECT id_setor FROM usuarios WHERE id = $1', [id_usuario]);
            const id_setor = setorResult.rows[0].id_setor;
            query = `SELECT r.id, r.data_atendimento, r.descricao_trabalho, u.nome_completo, la.nome as local_nome FROM relatorios r JOIN usuarios u ON r.id_usuario = u.id JOIN locais_atendimento la ON r.id_local_atendimento = la.id WHERE u.id_setor = $1 ORDER BY r.data_atendimento DESC;`;
            queryParams = [id_setor];
        } else { // Usuário Comum
            query = `SELECT r.id, r.data_atendimento, r.descricao_trabalho, la.nome as local_nome FROM relatorios r JOIN locais_atendimento la ON r.id_local_atendimento = la.id WHERE r.id_usuario = $1 ORDER BY r.data_atendimento DESC;`;
            queryParams = [id_usuario];
        }
        const result = await pool.query(query, queryParams);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Erro ao buscar relatórios:', err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

// ## ROTAS DE SERVIÇOS (KANBAN) ##
app.get('/api/tarefas', async (req, res) => {
    try {
        const { id: id_usuario, papel: id_papel } = req.user;
        let query, queryParams;
        if (id_papel === 1) { // Gestor
            const setorResult = await pool.query('SELECT id_setor FROM usuarios WHERE id = $1', [id_usuario]);
            const id_setor = setorResult.rows[0].id_setor;
            query = `SELECT t.*, u.nome_completo as nome_responsavel FROM tarefas t JOIN usuarios u ON t.id_responsavel = u.id WHERE u.id_setor = $1 ORDER BY data_criacao DESC`;
            queryParams = [id_setor];
        } else { // Comum
            query = `SELECT * FROM tarefas WHERE id_responsavel = $1 ORDER BY data_criacao DESC`;
            queryParams = [id_usuario];
        }
        const result = await pool.query(query, queryParams);
        res.status(200).json(result.rows);
    } catch (err) { console.error('Erro ao buscar tarefas:', err); res.status(500).json({ error: 'Erro interno do servidor.' }); }
});

app.post('/api/tarefas', async (req, res) => {
    try {
        const { titulo, descricao, id_responsavel } = req.body;
        const id_criador = req.user.id;
        if (!titulo || !id_responsavel) { return res.status(400).json({ error: 'Título e responsável são obrigatórios.' }); }
        const query = `INSERT INTO tarefas (titulo, descricao, id_criador, id_responsavel) VALUES ($1, $2, $3, $4) RETURNING *;`;
        const result = await pool.query(query, [titulo, descricao, id_criador, id_responsavel]);
        res.status(201).json(result.rows[0]);
    } catch (err) { console.error('Erro ao criar tarefa:', err); res.status(500).json({ error: 'Erro interno do servidor.' }); }
});

app.patch('/api/tarefas/:id/status', async (req, res) => {
    try {
        const { id: id_tarefa } = req.params;
        const { novoStatus } = req.body;
        const id_usuario_logado = req.user.id;
        const validStatus = ['Recebida', 'Iniciada', 'Finalizada'];
        if (!novoStatus || !validStatus.includes(novoStatus)) { return res.status(400).json({ error: 'Status inválido.' }); }
        const tarefaResult = await pool.query('SELECT * FROM tarefas WHERE id = $1', [id_tarefa]);
        if (tarefaResult.rows.length === 0) { return res.status(404).json({ error: 'Tarefa não encontrada.' }); }
        const tarefa = tarefaResult.rows[0];
        if (tarefa.id_responsavel !== id_usuario_logado) { return res.status(403).json({ error: 'Você não tem permissão para alterar esta tarefa.' }); }
        const dataFinalizacao = novoStatus === 'Finalizada' ? new Date() : null;
        const query = `UPDATE tarefas SET status = $1, data_finalizacao = $2 WHERE id = $3 RETURNING *;`;
        const result = await pool.query(query, [novoStatus, dataFinalizacao, id_tarefa]);
        res.status(200).json(result.rows[0]);
    } catch (err) { console.error('Erro ao atualizar status da tarefa:', err); res.status(500).json({ error: 'Erro interno do servidor.' }); }
});


// --- INICIAR SERVIDOR ---
app.listen(PORT, '127.0.0.1', () => {
    console.log(`Servidor rodando em http://127.0.0.1:${PORT}`);
});
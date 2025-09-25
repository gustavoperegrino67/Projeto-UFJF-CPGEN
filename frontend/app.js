// /frontend/app.js (Versão corrigida e para depuração)
document.addEventListener('DOMContentLoaded', () => {
    // URL da sua API online
    const API_URL = 'https://gestao-api-aluno.onrender.com';
    
    const token = localStorage.getItem('token');
    
    // LINHA DE DEPURAÇÃO: VAMOS VER O QUE ELE ENCONTRA
    console.log("Token encontrado pelo app.js:", token);

    // Verificação de autenticação
    if (!token) {
        console.log("Nenhum token encontrado, a redirecionar para o login.");
        window.location.href = 'login.html';
        return; // Interrompe a execução do script se não houver token
    }
    
    // Se o token existe, decodifica para obter informações do usuário
    const payload = JSON.parse(atob(token.split('.')[1]));
    const isGestor = payload.papel === 1;

    // Elementos da UI principal
    const userInfo = document.getElementById('user-info');
    const logoutButton = document.getElementById('logout-button');
    const contentArea = document.getElementById('content-area');
    const navLinks = document.querySelectorAll('nav a[data-page]');

    // Preenche informações do usuário e configura o botão de logout
    userInfo.textContent = `Usuário: ${payload.email}`;
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    });
    
    // --- FUNÇÃO HELPER PARA CHAMADAS À API ---
    async function fetchAPI(endpoint, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };
        const response = await fetch(`${API_URL}/api${endpoint}`, { ...defaultOptions, ...options });
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Falha na comunicação com a API.');
        }
        return response.json();
    }

    // --- FUNÇÃO DE CARREGAMENTO DE PÁGINA (SPA) ---
    const loadPage = async (page) => {
        contentArea.innerHTML = '<h2>Carregando...</h2>';
        try {
            const pageResponse = await fetch(`pages/${page}.html`);
            if (!pageResponse.ok) throw new Error('Página não encontrada.');
            contentArea.innerHTML = await pageResponse.text();

            // Mapeia o nome da página para o nome da função de inicialização
            const pageInitFunctionName = `init${page.charAt(0).toUpperCase() + page.slice(1)}Page`;

            // Verifica se existe um script JS para a página
            const scriptPath = `pages/${page}.js`;
            const scriptExistsResponse = await fetch(scriptPath, { method: 'HEAD' });

            if (scriptExistsResponse.ok) {
                // Remove scripts antigos da mesma página para evitar duplicação de event listeners
                const oldScript = document.querySelector(`script[src^="${scriptPath}"]`);
                if(oldScript) oldScript.remove();

                const script = document.createElement('script');
                script.src = `${scriptPath}?v=${new Date().getTime()}`; // Evita cache
                
                script.onload = () => {
                    if (window[pageInitFunctionName] && typeof window[pageInitFunctionName] === 'function') {
                        console.log(`Executando a função de inicialização: ${pageInitFunctionName}`);
                        window[pageInitFunctionName]();
                    }
                };
                document.body.appendChild(script);
            }
        } catch (error) {
            console.error('Erro ao carregar a página:', error);
            contentArea.innerHTML = `<div class="card"><h2>Erro</h2><p>Não foi possível carregar o conteúdo.</p></div>`;
        }
    };
    
    // Adiciona os event listeners para os links de navegação
    navLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            loadPage(link.dataset.page);
        });
    });

    // --- LÓGICA DO MODAL (APENAS PARA GESTOR) ---
    if (isGestor) {
        // Mostra os elementos que são apenas para gestores
        document.querySelectorAll('.gestor-only').forEach(el => el.classList.remove('hidden'));

        // Seletores do modal
        const showModalButton = document.getElementById('show-task-modal-button');
        const modalBackdrop = document.getElementById('task-modal-backdrop');
        const closeModalButton = document.getElementById('close-modal-button');
        const taskForm = document.getElementById('create-task-form');
        const responsibleSelect = document.getElementById('task-responsible');

        // Função para abrir o modal e carregar os funcionários
        const openModal = async () => {
            taskForm.reset();
            responsibleSelect.innerHTML = '<option value="">Carregando...</option>';
            modalBackdrop.classList.add('active');
            try {
                const funcionarios = await fetchAPI('/usuarios/meu-setor');
                responsibleSelect.innerHTML = '<option value="">Selecione um funcionário</option>';
                funcionarios.forEach(func => {
                    if (func.id !== payload.id) {
                        const option = new Option(func.nome_completo, func.id);
                        responsibleSelect.appendChild(option);
                    }
                });
            } catch (error) {
                console.error('Erro ao carregar funcionários:', error);
                responsibleSelect.innerHTML = '<option value="">Erro ao carregar</option>';
            }
        };

        const closeModal = () => modalBackdrop.classList.remove('active');

        // Event listeners do modal
        showModalButton.addEventListener('click', (e) => {
            e.preventDefault();
            openModal();
        });
        closeModalButton.addEventListener('click', closeModal);
        modalBackdrop.addEventListener('click', (event) => {
            if (event.target === modalBackdrop) closeModal();
        });

        taskForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const novaTarefa = {
                titulo: document.getElementById('task-title').value,
                descricao: document.getElementById('task-desc').value,
                id_responsavel: responsibleSelect.value,
            };
            try {
                await fetchAPI('/tarefas', {
                    method: 'POST',
                    body: JSON.stringify(novaTarefa)
                });
                closeModal();
                window.dispatchEvent(new CustomEvent('tarefaCriada'));
            } catch (error) {
                console.error('Erro ao criar tarefa:', error);
                alert(error.message); // Mantendo o alerta que estava no código original
            }
        });
    }
    
    // Carrega a página inicial (dashboard)
    loadPage('dashboard');
});
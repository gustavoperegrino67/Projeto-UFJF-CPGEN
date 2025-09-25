// /frontend/app.js (Com inicialização explícita)
document.addEventListener('DOMContentLoaded', () => {
    // URL da sua API online
    const API_URL = 'https://gestao-api-aluno.onrender.com';

    // ... (todo o código inicial de pegar token, etc., continua o mesmo)
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = 'login.html'; return; }
    const payload = JSON.parse(atob(token.split('.')[1]));
    const isGestor = payload.papel === 1;
    const userInfo = document.getElementById('user-info');
    const logoutButton = document.getElementById('logout-button');
    const contentArea = document.getElementById('content-area');
    const navLinks = document.querySelectorAll('nav a[data-page]');
    userInfo.textContent = `Usuário: ${payload.email}`;
    logoutButton.addEventListener('click', () => { localStorage.removeItem('token'); window.location.href = 'login.html'; });

    // --- FUNÇÃO DE CARREGAMENTO DE PÁGINA (MODIFICADA) ---
    const loadPage = async (page) => {
        contentArea.innerHTML = '<h2>Carregando...</h2>';
        try {
            const response = await fetch(`pages/${page}.html`);
            if (!response.ok) throw new Error('Página não encontrada.');
            contentArea.innerHTML = await response.text();

            const pageInitFunctionName = `init${page.charAt(0).toUpperCase() + page.slice(1)}Page`;
            const scriptPath = `pages/${page}.js`;
            const scriptResponse = await fetch(scriptPath);
            if (scriptResponse.ok) {
                const script = document.createElement('script');
                script.src = `${scriptPath}?v=${new Date().getTime()}`;
                script.onload = () => {
                    if (window[pageInitFunctionName] && typeof window[pageInitFunctionName] === 'function') {
                        console.log(`Executando a função de inicialização: ${pageInitFunctionName}`);
                        window[pageInitFunctionName]();
                    }
                };
                document.body.appendChild(script).remove();
            } else {
                if (window[pageInitFunctionName] && typeof window[pageInitFunctionName] === 'function') {
                    window[pageInitFunctionName]();
                }
            }
        } catch (error) {
            console.error('Erro ao carregar a página:', error);
            contentArea.innerHTML = `<div class="card"><h2>Erro</h2><p>Não foi possível carregar o conteúdo.</p></div>`;
        }
    };
    
    navLinks.forEach(link => { link.addEventListener('click', (event) => { event.preventDefault(); loadPage(link.dataset.page); }); });
    loadPage('dashboard');
    
    // --- CÓPIAS DAS FUNÇÕES DO MODAL PARA GARANTIR ---
    if (isGestor) { 
        const showModalButton = document.getElementById('show-task-modal-button'); 
        const modalBackdrop = document.getElementById('task-modal-backdrop'); 
        const closeModalButton = document.getElementById('close-modal-button'); 
        const taskForm = document.getElementById('create-task-form'); 
        const responsibleSelect = document.getElementById('task-responsible'); 
        
        async function fetchAPI(endpoint, options = {}) { 
            const defaultOptions = { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } }; 
            const response = await fetch(`${API_URL}/api${endpoint}`, { ...defaultOptions, ...options }); // <-- ALTERADO AQUI
            if (!response.ok) { 
                const errData = await response.json(); 
                throw new Error(errData.error || 'Falha na comunicação com a API.'); 
            } 
            return response.json(); 
        } 
        
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
            } catch (error) { console.error('Erro ao carregar funcionários:', error); } 
        }; 
        
        const closeModal = () => modalBackdrop.classList.remove('active'); 
        showModalButton.addEventListener('click', (e) => { e.preventDefault(); openModal(); }); 
        closeModalButton.addEventListener('click', closeModal); 
        modalBackdrop.addEventListener('click', (event) => { if (event.target === modalBackdrop) closeModal(); }); 
        
        taskForm.addEventListener('submit', async (event) => { 
            event.preventDefault(); 
            const novaTarefa = { 
                titulo: document.getElementById('task-title').value, 
                descricao: document.getElementById('task-desc').value, 
                id_responsavel: responsibleSelect.value, 
            }; 
            try { 
                await fetchAPI('/tarefas', { method: 'POST', body: JSON.stringify(novaTarefa) }); 
                closeModal(); 
                window.dispatchEvent(new CustomEvent('tarefaCriada')); 
            } catch (error) { console.error('Erro ao criar tarefa:', error); alert(error.message); } 
        }); 
        
        document.querySelectorAll('.gestor-only').forEach(el => el.classList.remove('hidden')); 
    }
});
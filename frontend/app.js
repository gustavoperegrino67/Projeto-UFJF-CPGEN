// /frontend/app.js (Com inicialização explícita)
document.addEventListener('DOMContentLoaded', () => {
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

            // Mapeia o nome da página para o nome da função de inicialização
            const pageInitFunctionName = `init${page.charAt(0).toUpperCase() + page.slice(1)}Page`; // Ex: initDashboardPage

            const scriptPath = `pages/${page}.js`;
            const scriptResponse = await fetch(scriptPath);
            if (scriptResponse.ok) {
                const script = document.createElement('script');
                script.src = `${scriptPath}?v=${new Date().getTime()}`;
                // Quando o script terminar de carregar, chama a função de inicialização
                script.onload = () => {
                    if (window[pageInitFunctionName] && typeof window[pageInitFunctionName] === 'function') {
                        console.log(`Executando a função de inicialização: ${pageInitFunctionName}`);
                        window[pageInitFunctionName]();
                    }
                };
                document.body.appendChild(script).remove(); // Adiciona e remove o script para executá-lo
            } else {
                 // Se não houver script, verificamos se há uma função de init para páginas sem script
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

    // Lógica do Modal (continua a mesma)
    if (isGestor) { /* ...código do modal existente... */ }
    
    loadPage('dashboard');
    
    // --- CÓPIAS DAS FUNÇÕES DO MODAL PARA GARANTIR ---
    if (isGestor) { const showModalButton = document.getElementById('show-task-modal-button'); const modalBackdrop = document.getElementById('task-modal-backdrop'); const closeModalButton = document.getElementById('close-modal-button'); const taskForm = document.getElementById('create-task-form'); const responsibleSelect = document.getElementById('task-responsible'); async function fetchAPI(endpoint, options = {}) { const defaultOptions = { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } }; const response = await fetch(`http://127.0.0.1:3001/api${endpoint}`, { ...defaultOptions, ...options }); if (!response.ok) { const errData = await response.json(); throw new Error(errData.error || 'Falha na comunicação com a API.'); } return response.json(); } const openModal = async () => { taskForm.reset(); responsibleSelect.innerHTML = '<option value="">Carregando...</option>'; modalBackdrop.classList.add('active'); try { const funcionarios = await fetchAPI('/usuarios/meu-setor'); responsibleSelect.innerHTML = '<option value="">Selecione um funcionário</option>'; funcionarios.forEach(func => { if (func.id !== payload.id) { const option = new Option(func.nome_completo, func.id); responsibleSelect.appendChild(option); } }); } catch (error) { console.error('Erro ao carregar funcionários:', error); } }; const closeModal = () => modalBackdrop.classList.remove('active'); showModalButton.addEventListener('click', (e) => { e.preventDefault(); openModal(); }); closeModalButton.addEventListener('click', closeModal); modalBackdrop.addEventListener('click', (event) => { if (event.target === modalBackdrop) closeModal(); }); taskForm.addEventListener('submit', async (event) => { event.preventDefault(); const novaTarefa = { titulo: document.getElementById('task-title').value, descricao: document.getElementById('task-desc').value, id_responsavel: responsibleSelect.value, }; try { await fetchAPI('/tarefas', { method: 'POST', body: JSON.stringify(novaTarefa) }); closeModal(); window.dispatchEvent(new CustomEvent('tarefaCriada')); } catch (error) { console.error('Erro ao criar tarefa:', error); alert(error.message); } }); document.querySelectorAll('.gestor-only').forEach(el => el.classList.remove('hidden')); }
});
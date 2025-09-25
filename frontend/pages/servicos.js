// /frontend/pages/servicos.js (Versão Limpa)
(function() {
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = 'login.html'; return; }

    const payload = JSON.parse(atob(token.split('.')[1]));
    const isGestor = payload.papel === 1;

    async function fetchAPI(endpoint, options = {}) {
        const defaultOptions = { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } };
        const response = await fetch(`http://127.0.0.1:3001/api${endpoint}`, { ...defaultOptions, ...options });
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Falha na comunicação com a API.');
        }
        return response.json();
    }

    const columns = {
        recebida: document.querySelector('#col-recebida .tasks-wrapper'),
        iniciada: document.querySelector('#col-iniciada .tasks-wrapper'),
        finalizada: document.querySelector('#col-finalizada .tasks-wrapper'),
    };

    function createTaskCard(task) {
        const card = document.createElement('div');
        card.className = 'task-card';
        card.setAttribute('data-task-id', task.id);
        let actionsHTML = '';
        if (!isGestor) {
            switch (task.status) {
                case 'Recebida': actionsHTML = `<button data-action="iniciar">▶️ Iniciar</button>`; break;
                case 'Iniciada': actionsHTML = `<button data-action="finalizar">✅ Finalizar</button>`; break;
            }
            if (task.status !== 'Recebida') { actionsHTML += `<button data-action="resetar" style="background-color: #ffc107; color: black;">⏪ Resetar</button>`; }
        }
        card.innerHTML = `
            <p class="task-title">${task.titulo}</p>
            <p>${task.descricao || ''}</p>
            ${isGestor ? `<p><small>Responsável: ${task.nome_responsavel || 'N/A'}</small></p>` : ''}
            <div class="task-actions">${actionsHTML}</div>`;
        return card;
    }

    async function loadTasks() {
        Object.values(columns).forEach(col => col.innerHTML = '');
        try {
            const tasks = await fetchAPI('/tarefas');
            if (tasks.length === 0) {
                columns.recebida.innerHTML = '<p style="text-align: center; color: #888;">Nenhuma tarefa encontrada.</p>';
            } else {
                tasks.forEach(task => {
                    const card = createTaskCard(task);
                    const colKey = task.status.toLowerCase();
                    if (columns[colKey]) { columns[colKey].appendChild(card); }
                });
            }
        } catch (error) { console.error('Erro ao carregar tarefas:', error); }
    }

    async function updateTaskStatus(taskId, novoStatus) {
        try {
            await fetchAPI(`/tarefas/${taskId}/status`, { method: 'PATCH', body: JSON.stringify({ novoStatus }) });
            await loadTasks();
        } catch (error) { console.error(error); alert(error.message); }
    }

    document.getElementById('kanban-board').addEventListener('click', (event) => {
        if (event.target.tagName !== 'BUTTON') return;
        const button = event.target;
        const card = button.closest('.task-card');
        if (!card) return;
        const taskId = card.dataset.taskId;
        const action = button.dataset.action;
        if (action) updateTaskStatus(taskId, action === 'iniciar' ? 'Iniciada' : action === 'finalizar' ? 'Finalizada' : 'Recebida');
    });

    // "Escutador" que espera o aviso do app.js para recarregar as tarefas
    window.addEventListener('tarefaCriada', loadTasks);

    // Carrega as tarefas quando a página é aberta
    loadTasks();
})();
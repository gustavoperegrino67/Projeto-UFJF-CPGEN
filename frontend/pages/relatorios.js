function initRelatoriosPage() {
    // URL da sua API online
    const API_URL = 'https://gestao-api-aluno.onrender.com';

    const token = localStorage.getItem('token');
    if (!token) { window.location.href = 'login.html'; return; }

    const payload = JSON.parse(atob(token.split('.')[1]));
    const isGestor = payload.papel === 1;

    const form = document.getElementById('relatorio-form');
    const localSelect = document.getElementById('local-atendimento');
    const dataInput = document.getElementById('data-atendimento');
    const descricaoTextarea = document.getElementById('descricao');
    const successMessage = document.getElementById('success-message');
    const addLocalForm = document.getElementById('add-local-form');
    const localFeedbackMessage = document.getElementById('local-feedback-message');
    const loadHistoryButton = document.getElementById('load-history-button');
    const historyContainer = document.getElementById('history-container');

    async function fetchAPI(endpoint, options = {}) {
        const defaultOptions = { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } };
        const response = await fetch(`${API_URL}/api${endpoint}`, { ...defaultOptions, ...options }); // <-- ALTERADO AQUI
        const data = await response.json();
        if (!response.ok) { throw new Error(data.error || 'Falha na comunicação com a API.'); }
        return data;
    }

    async function carregarLocais() {
        try {
            const locais = await fetchAPI('/locais-atendimento');
            localSelect.innerHTML = '<option value="">Selecione um local</option>';
            locais.forEach(local => {
                const option = new Option(local.nome, local.id);
                localSelect.appendChild(option);
            });
        } catch (error) { console.error('Erro ao carregar locais:', error); }
    }

    if (isGestor) {
        const addLocalCard = document.querySelector('.card.gestor-only');
        if (addLocalCard) addLocalCard.classList.remove('hidden');

        addLocalForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const newLocalNameInput = document.getElementById('new-local-name');
            const nome = newLocalNameInput.value;
            localFeedbackMessage.textContent = '';
            
            try {
                await fetchAPI('/locais-atendimento', {
                    method: 'POST',
                    body: JSON.stringify({ nome })
                });
                localFeedbackMessage.style.color = 'green';
                localFeedbackMessage.textContent = 'Local adicionado com sucesso!';
                newLocalNameInput.value = '';
                await carregarLocais();
            } catch (error) {
                localFeedbackMessage.style.color = 'red';
                localFeedbackMessage.textContent = error.message;
            }
        });
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        successMessage.textContent = '';
        const relatorioData = {
            id_local_atendimento: localSelect.value,
            data_atendimento: dataInput.value,
            descricao_trabalho: descricaoTextarea.value,
        };
        try {
            await fetchAPI('/relatorios', {
                method: 'POST',
                body: JSON.stringify(relatorioData)
            });
            successMessage.textContent = 'Relatório enviado com sucesso!';
            form.reset();
        } catch (error) {
            alert(`Erro: ${error.message}`);
        }
    });

    loadHistoryButton.addEventListener('click', async () => {
        historyContainer.innerHTML = '<p>Carregando histórico...</p>';
        try {
            const relatorios = await fetchAPI('/relatorios');
            if (relatorios.length === 0) {
                historyContainer.innerHTML = '<p>Nenhum relatório encontrado.</p>';
                return;
            }
            const table = document.createElement('table');
            table.className = 'history-table';
            const thead = table.createTHead();
            const headerRow = thead.insertRow();
            const headers = ['Data', 'Local', 'Descrição'];
            if (isGestor) headers.push('Funcionário');
            headers.forEach(text => {
                const th = document.createElement('th');
                th.textContent = text;
                headerRow.appendChild(th);
            });
            const tbody = table.createTBody();
            relatorios.forEach(rel => {
                const row = tbody.insertRow();
                const dataFormatada = new Date(rel.data_atendimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'});
                row.insertCell().textContent = dataFormatada;
                row.insertCell().textContent = rel.local_nome;
                row.insertCell().textContent = rel.descricao_trabalho;
                if (isGestor) row.insertCell().textContent = rel.nome_completo;
            });
            historyContainer.innerHTML = '';
            historyContainer.appendChild(table);
        } catch (error) {
            historyContainer.innerHTML = `<p style="color: red;">${error.message}</p>`;
        }
    });
    
    carregarLocais();
}

window.initRelatoriosPage = initRelatoriosPage;
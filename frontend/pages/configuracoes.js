function initConfiguracoesPage() {
    // URL da sua API online
    const API_URL = 'https://gestao-api-aluno.onrender.com';

    const token = localStorage.getItem('token');
    if (!token) { window.location.href = 'login.html'; return; }

    const form = document.getElementById('create-user-form');
    const feedbackMessage = document.getElementById('feedback-message');
    const userListBody = document.getElementById('user-list-body');
    const editModalBackdrop = document.getElementById('edit-user-modal-backdrop');
    const editForm = document.getElementById('edit-user-form');
    const closeEditModalButton = document.getElementById('close-edit-modal-button');
    const editFeedbackMessage = document.getElementById('edit-feedback-message');

    async function fetchAPI(endpoint, options = {}) {
        const defaultOptions = { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } };
        const response = await fetch(`${API_URL}/api${endpoint}`, { ...defaultOptions, ...options }); // <-- ALTERADO AQUI
        const data = await response.json();
        if (!response.ok) { throw new Error(data.error || 'Falha na comunicação com a API.'); }
        return data;
    }

    async function loadUsers() {
        if (!userListBody) return;
        userListBody.innerHTML = '<tr><td colspan="5">Carregando...</td></tr>';
        try {
            const users = await fetchAPI('/usuarios');
            userListBody.innerHTML = '';
            if (users.length === 0) {
                userListBody.innerHTML = '<tr><td colspan="5">Nenhum usuário encontrado.</td></tr>';
                return;
            }
            users.forEach(user => {
                const row = userListBody.insertRow();
                row.innerHTML = `
                    <td>${user.nome_completo}</td>
                    <td>${user.email}</td>
                    <td>${user.nome_papel}</td>
                    <td><span class="status-${user.ativo ? 'ativo' : 'inativo'}">${user.ativo ? 'Ativo' : 'Inativo'}</span></td>
                    <td>
                        <button data-userid="${user.id}" class="edit-btn">Editar</button>
                        <button data-userid="${user.id}" data-status="${user.ativo}" class="status-btn">${user.ativo ? 'Desativar' : 'Ativar'}</button>
                    </td>
                `;
            });
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
            userListBody.innerHTML = `<tr><td colspan="5" style="color: red;">${error.message}</td></tr>`;
        }
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        feedbackMessage.textContent = '';
        const novoUsuario = {
            nome_completo: document.getElementById('nome').value,
            email: document.getElementById('email').value,
            senha: document.getElementById('senha').value,
            id_papel: parseInt(document.getElementById('papel').value)
        };
        try {
            const result = await fetchAPI('/usuarios', { method: 'POST', body: JSON.stringify(novoUsuario) });
            feedbackMessage.style.color = 'green';
            feedbackMessage.textContent = result.message;
            form.reset();
            loadUsers();
        } catch (error) {
            feedbackMessage.style.color = 'red';
            feedbackMessage.textContent = error.message;
        }
    });

    userListBody.addEventListener('click', async (event) => {
        const target = event.target;
        const userId = target.dataset.userid;
        if (!userId) return;

        if (target.classList.contains('status-btn')) {
            const statusAtual = target.dataset.status === 'true';
            const novoStatus = !statusAtual;
            const acao = novoStatus ? 'ativar' : 'desativar';
            if (confirm(`Tem certeza que deseja ${acao} este usuário?`)) {
                try {
                    await fetchAPI(`/usuarios/${userId}/status`, { method: 'PATCH', body: JSON.stringify({ novoStatus }) });
                    loadUsers();
                } catch (error) { alert(error.message); }
            }
        }

        if (target.classList.contains('edit-btn')) {
            try {
                const userData = await fetchAPI(`/usuarios/${userId}`);
                document.getElementById('edit-user-id').value = userData.id;
                document.getElementById('edit-nome').value = userData.nome_completo;
                document.getElementById('edit-email').value = userData.email;
                document.getElementById('edit-papel').value = userData.id_papel;
                openEditModal();
            } catch (error) { alert(error.message); }
        }
    });

    function openEditModal() {
        editForm.reset();
        editFeedbackMessage.textContent = '';
        editModalBackdrop.classList.add('active');
    }
    function closeEditModal() {
        editModalBackdrop.classList.remove('active');
    }
    closeEditModalButton.addEventListener('click', closeEditModal);
    editModalBackdrop.addEventListener('click', (event) => {
        if (event.target === editModalBackdrop) closeEditModal();
    });

    editForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const userId = document.getElementById('edit-user-id').value;
        const updatedData = {
            nome_completo: document.getElementById('edit-nome').value,
            email: document.getElementById('edit-email').value,
            id_papel: parseInt(document.getElementById('edit-papel').value)
        };
        const novaSenha = document.getElementById('edit-senha').value;
        try {
            editFeedbackMessage.textContent = 'Salvando...';
            editFeedbackMessage.style.color = 'gray';
            const promises = [];
            promises.push(fetchAPI(`/usuarios/${userId}`, { method: 'PUT', body: JSON.stringify(updatedData) }));
            if (novaSenha && novaSenha.trim() !== '' && novaSenha.length >= 6) {
                promises.push(fetchAPI(`/usuarios/${userId}/senha`, { method: 'PATCH', body: JSON.stringify({ novaSenha }) }));
            } else if (novaSenha && novaSenha.trim() !== '') {
                throw new Error("A nova senha deve ter pelo menos 6 caracteres.");
            }
            await Promise.all(promises);
            editFeedbackMessage.style.color = 'green';
            editFeedbackMessage.textContent = 'Usuário atualizado com sucesso!';
            loadUsers();
            setTimeout(closeEditModal, 2000);
        } catch (error) {
            editFeedbackMessage.style.color = 'red';
            editFeedbackMessage.textContent = error.message;
        }
    });

    loadUsers();
}
window.initConfiguracoesPage = initConfiguracoesPage;
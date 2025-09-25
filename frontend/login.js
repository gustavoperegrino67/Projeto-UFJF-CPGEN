const form = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('error-message');

const API_URL = 'https://gestao-api-aluno.onrender.com';

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorMessage.textContent = '';
    const email = emailInput.value;
    const password = passwordInput.value;
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, senha: password }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Erro ao fazer login.');
        }
        
        // A MÁGICA ACONTECE AQUI:
        // 1. Guardamos o token que a API nos enviou.
        localStorage.setItem('token', data.token);
        
        // 2. Redirecionamos para a página principal.
        // Desta vez, DEVE funcionar, porque já garantimos que o token foi guardado.
        window.location.href = 'index.html';

    } catch (error) {
        console.error('Falha no login:', error);
        errorMessage.textContent = error.message;
    }
});
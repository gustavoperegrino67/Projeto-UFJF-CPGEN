const form = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('error-message');

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorMessage.textContent = '';
    const email = emailInput.value;
    const password = passwordInput.value;
    try {
        const response = await fetch('http://127.0.0.1:3001/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, senha: password }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Erro ao fazer login.');
        }
        localStorage.setItem('token', data.token);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Falha no login:', error);
        errorMessage.textContent = error.message;
    }
});
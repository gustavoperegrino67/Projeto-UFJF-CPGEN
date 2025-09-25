(function() {
    // URL da sua API online
    const API_URL = 'https://gestao-api-aluno.onrender.com';

    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    async function renderChart() {
        try {
            const response = await fetch(`${API_URL}/api/dashboard/stats`, { // <-- ALTERADO AQUI
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const stats = await response.json();
            
            if (!response.ok) {
                throw new Error(stats.error || 'Não foi possível buscar os dados do gráfico.');
            }

            const labels = stats.map(item => item.nome);
            const data = stats.map(item => item.total_relatorios);

            const ctx = document.getElementById('reportsChart').getContext('2d');
            
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Total de Relatórios por Local',
                        data: data,
                        backgroundColor: 'rgba(0, 123, 255, 0.5)',
                        borderColor: 'rgba(0, 123, 255, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
                    responsive: true,
                    plugins: { legend: { position: 'top' }, title: { display: true, text: 'Atendimentos Realizados' } }
                }
            });

        } catch (error) {
            console.error('Erro ao renderizar o gráfico:', error);
            const chartArea = document.getElementById('reportsChart');
            if(chartArea) {
                chartArea.outerHTML = `<p style="color: red;">Não foi possível carregar o gráfico. Tente enviar alguns relatórios primeiro.</p>`;
            }
        }
    }

    renderChart();
})();
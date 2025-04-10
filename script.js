// Armazenamento de dados
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];

function saveTransactions() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

// Funções principais
// Função para adicionar renda rápida (simplificada)
function adicionarRendaRapida() {
    const valor = parseFloat(document.getElementById('valor-renda-rapida').value);

    if (valor && !isNaN(valor)) {
        const hoje = new Date().toISOString().split('T')[0];

        const transaction = {
            id: Date.now(),
            descricao: 'Renda',
            valor: Math.abs(valor), // Sempre positivo para rendas
            categoria: 'salario',
            data: hoje,
            tipo: 'receita'
        };

        transactions.push(transaction);
        saveTransactions();
        atualizarInterface();
        atualizarGraficos();

        // Limpar campo
        document.getElementById('valor-renda-rapida').value = '';

        // Feedback visual
        mostrarNotificacao('Renda adicionada com sucesso!', 'sucesso');

        // Efeito visual no campo e no botão
        const rendaInput = document.querySelector('.renda-input-group');
        const sendIcon = document.querySelector('.send-icon');

        rendaInput.classList.add('success-pulse');
        sendIcon.style.animation = 'sendAnimation 0.6s ease-in-out';

        setTimeout(() => {
            rendaInput.classList.remove('success-pulse');
            sendIcon.style.animation = '';
        }, 1000);
    } else {
        mostrarNotificacao('Por favor, informe um valor válido!', 'erro');
    }
}

// Função legada para adicionar receita (mantida para compatibilidade)
function adicionarReceita() {
    console.log('Função legada: use adicionarRendaRapida() em vez disso');
}

// Função para adicionar despesa
function adicionarDespesa() {
    const descricao = document.getElementById('descricao-despesa').value;
    const valor = parseFloat(document.getElementById('valor-despesa').value);
    const categoria = document.getElementById('categoria-despesa').value;
    const data = document.getElementById('data-despesa').value;

    if (descricao && valor && categoria && data) {
        const transaction = {
            id: Date.now(),
            descricao: descricao,
            valor: -Math.abs(valor), // Sempre negativo para despesas
            categoria: categoria,
            data: data,
            tipo: 'despesa'
        };

        transactions.push(transaction);
        saveTransactions();
        atualizarInterface();
        atualizarGraficos();

        // Limpar campos
        document.getElementById('descricao-despesa').value = '';
        document.getElementById('valor-despesa').value = '';
        document.getElementById('data-despesa').value = new Date().toISOString().split('T')[0];
        document.getElementById('categoria-despesa').value = 'outros';

        // Feedback visual
        mostrarNotificacao('Despesa adicionada com sucesso!', 'sucesso');
    } else {
        mostrarNotificacao('Por favor, preencha todos os campos!', 'erro');
    }
}

// Manter a função original para compatibilidade com código existente
function adicionarTransacao() {
    // Esta função é mantida para compatibilidade, mas não é mais usada diretamente
    console.log('Função legada: use adicionarReceita() ou adicionarDespesa() em vez disso');
}

function removerTransacao(id) {
    if (confirm('Tem certeza que deseja remover esta transação?')) {
        transactions = transactions.filter(t => t.id !== id);
        saveTransactions();
        atualizarInterface();
        atualizarGraficos();
        mostrarNotificacao('Transação removida com sucesso!');
    }
}

// Funções de interface
function atualizarInterface() {
    const listaTransacoes = document.getElementById('lista-transacoes');
    const totalReceitas = document.getElementById('total-receitas');
    const totalDespesas = document.getElementById('total-despesas');
    const saldoTotal = document.getElementById('saldo-total');

    listaTransacoes.innerHTML = '';

    let receitas = 0;
    let despesas = 0;

    const transacoesFiltradas = filtrarTransacoes();

    if (transacoesFiltradas.length === 0) {
        listaTransacoes.innerHTML = '<p class="mensagem-vazia">Nenhuma transação encontrada.</p>';
    } else {
        transacoesFiltradas.forEach(transaction => {
            if (transaction.valor > 0) {
                receitas += transaction.valor;
            } else {
                despesas += Math.abs(transaction.valor);
            }

            const div = document.createElement('div');
            div.className = 'transacao';
            div.innerHTML = `
                <div class="transacao-info">
                    <span><strong>${transaction.descricao}</strong></span>
                    <span class="transacao-data">${formatarData(transaction.data)}</span>
                    <span class="transacao-categoria">${formatarCategoria(transaction.categoria)}</span>
                </div>
                <span class="${transaction.valor > 0 ? 'receita' : 'despesa'}">
                    R$ ${Math.abs(transaction.valor).toFixed(2)}
                </span>
                <button onclick="removerTransacao(${transaction.id})">Remover</button>
            `;
            listaTransacoes.appendChild(div);
        });
    }

    totalReceitas.textContent = formatarMoeda(receitas);
    totalDespesas.textContent = formatarMoeda(despesas);
    saldoTotal.textContent = formatarMoeda(receitas - despesas);
}

function filtrarTransacoes() {
    const categoriaSelecionada = document.getElementById('filtro-categoria').value;
    const tipoSelecionado = document.getElementById('filtro-tipo').value;
    const mesSelecionado = document.getElementById('filtro-mes').value;

    return transactions.filter(transaction => {
        const categoriaMatch = categoriaSelecionada === 'todas' || transaction.categoria === categoriaSelecionada;
        const tipoMatch = tipoSelecionado === 'todos' ||
                         (tipoSelecionado === 'receita' && transaction.valor > 0) ||
                         (tipoSelecionado === 'despesa' && transaction.valor < 0);

        // Filtro por mês
        const data = new Date(transaction.data);
        const mesMatch = mesSelecionado === 'todos' || data.getMonth().toString() === mesSelecionado;

        return categoriaMatch && tipoMatch && mesMatch;
    });
}

// Funções de gráficos
function atualizarGraficos() {
    atualizarGraficoCategorias();
    atualizarGraficoBalanco();
}

function atualizarGraficoCategorias() {
    const ctx = document.getElementById('grafico-categorias').getContext('2d');

    // Filtrar apenas despesas
    const despesas = transactions.filter(t => t.valor < 0);

    // Agrupar por categoria
    const categorias = {};
    despesas.forEach(t => {
        if (!categorias[t.categoria]) {
            categorias[t.categoria] = 0;
        }
        categorias[t.categoria] += Math.abs(t.valor);
    });

    // Preparar dados para o gráfico
    const labels = Object.keys(categorias).map(cat => formatarCategoria(cat));
    const data = Object.values(categorias);
    const cores = gerarCores(labels.length);

    // Verificar o tema atual
    const temaAtual = localStorage.getItem('tema') || 'light';
    const corTexto = temaAtual === 'dark' ? '#f0f0f0' : '#333';

    // Destruir gráfico anterior se existir
    if (window.graficoCategoria) {
        window.graficoCategoria.destroy();
    }

    // Criar novo gráfico
    window.graficoCategoria = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: cores,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: corTexto
                    }
                }
            }
        }
    });
}

function atualizarGraficoBalanco() {
    const ctx = document.getElementById('grafico-balanco').getContext('2d');

    // Agrupar por mês
    const dadosPorMes = {};

    transactions.forEach(t => {
        const data = new Date(t.data);
        const mes = data.getMonth();
        const ano = data.getFullYear();
        const chave = `${ano}-${mes}`;

        if (!dadosPorMes[chave]) {
            dadosPorMes[chave] = { receitas: 0, despesas: 0 };
        }

        if (t.valor > 0) {
            dadosPorMes[chave].receitas += t.valor;
        } else {
            dadosPorMes[chave].despesas += Math.abs(t.valor);
        }
    });

    // Ordenar por data
    const chaves = Object.keys(dadosPorMes).sort();
    const labels = chaves.map(chave => {
        const [ano, mes] = chave.split('-');
        return `${getNomeMes(parseInt(mes))}/${ano}`;
    });

    const receitasData = chaves.map(chave => dadosPorMes[chave].receitas);
    const despesasData = chaves.map(chave => dadosPorMes[chave].despesas);

    // Verificar o tema atual
    const temaAtual = localStorage.getItem('tema') || 'light';
    const corTexto = temaAtual === 'dark' ? '#f0f0f0' : '#333';
    const corGrade = temaAtual === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

    // Destruir gráfico anterior se existir
    if (window.graficoBalanco) {
        window.graficoBalanco.destroy();
    }

    // Criar novo gráfico
    window.graficoBalanco = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Receitas',
                    data: receitasData,
                    backgroundColor: 'rgba(39, 174, 96, 0.7)',
                    borderColor: 'rgba(39, 174, 96, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Despesas',
                    data: despesasData,
                    backgroundColor: 'rgba(231, 76, 60, 0.7)',
                    borderColor: 'rgba(231, 76, 60, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: {
                        color: corTexto
                    }
                }
            },
            scales: {
                x: {
                    stacked: false,
                    grid: {
                        color: corGrade
                    },
                    ticks: {
                        color: corTexto
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: corGrade
                    },
                    ticks: {
                        color: corTexto
                    }
                }
            }
        }
    });
}

// Funções utilitárias
function formatarData(data) {
    return new Date(data).toLocaleDateString('pt-BR');
}

function formatarMoeda(valor) {
    return `R$ ${valor.toFixed(2)}`;
}

function formatarCategoria(categoria) {
    const categorias = {
        'alimentacao': 'Alimentação',
        'transporte': 'Transporte',
        'moradia': 'Moradia',
        'lazer': 'Lazer',
        'saude': 'Saúde',
        'educacao': 'Educação',
        'salario': 'Salário',
        'investimentos': 'Investimentos',
        'outros': 'Outros'
    };

    return categorias[categoria] || categoria;
}

function getNomeMes(mes) {
    const meses = [
        'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
        'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];
    return meses[mes];
}

function gerarCores(quantidade) {
    const cores = [
        '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
        '#1abc9c', '#d35400', '#34495e', '#7f8c8d', '#27ae60'
    ];

    // Se precisar de mais cores do que temos na lista
    if (quantidade > cores.length) {
        for (let i = cores.length; i < quantidade; i++) {
            const cor = `hsl(${Math.random() * 360}, 70%, 50%)`;
            cores.push(cor);
        }
    }

    return cores.slice(0, quantidade);
}

function mostrarNotificacao(mensagem, tipo = 'sucesso') {
    // Remover notificações anteriores
    const notificacoesAnteriores = document.querySelectorAll('.notificacao');
    notificacoesAnteriores.forEach(n => n.remove());

    // Criar nova notificação
    const notificacao = document.createElement('div');
    notificacao.className = `notificacao ${tipo}`;
    notificacao.textContent = mensagem;

    document.body.appendChild(notificacao);

    // Animar entrada
    setTimeout(() => {
        notificacao.style.transform = 'translateX(0)';
    }, 10);

    // Remover após alguns segundos
    setTimeout(() => {
        notificacao.style.transform = 'translateX(100%)';
        setTimeout(() => notificacao.remove(), 300);
    }, 3000);
}

// Exportação de dados
function exportarDados() {
    // Converter transações para CSV
    let csv = 'Data,Descrição,Categoria,Valor\n';

    transactions.forEach(t => {
        const data = formatarData(t.data);
        const valor = formatarMoeda(t.valor);
        csv += `${data},"${t.descricao}",${formatarCategoria(t.categoria)},${valor}\n`;
    });

    // Criar link para download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', 'financas_pessoais.csv');
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    mostrarNotificacao('Dados exportados com sucesso!');
}

// Gerenciamento de Tema e Cores
function gerenciarTemas() {
    const configToggle = document.getElementById('config-toggle');
    const configPanel = document.getElementById('config-panel');
    const configClose = document.getElementById('config-close');
    const themeOptions = document.querySelectorAll('.theme-option');
    const colorOptions = document.querySelectorAll('.color-option');

    // Abrir painel de configurações
    configToggle.addEventListener('click', () => {
        configPanel.classList.add('open');
    });

    // Fechar painel de configurações
    configClose.addEventListener('click', () => {
        configPanel.classList.remove('open');
    });

    // Aplicar configurações iniciais
    const temaInicial = localStorage.getItem('tema') || 'light';
    const corInicial = localStorage.getItem('cor') || 'blue';

    aplicarTema(temaInicial);
    aplicarCorTema(corInicial);

    // Marcar opções ativas
    document.querySelector(`.theme-option[data-theme="${temaInicial}"]`).classList.add('active');
    document.querySelector(`.color-option[data-color="${corInicial}"]`).classList.add('active');

    // Eventos para opções de tema
    themeOptions.forEach(option => {
        option.addEventListener('click', () => {
            const tema = option.getAttribute('data-theme');
            aplicarTema(tema);

            // Atualizar seleção visual
            themeOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
        });
    });

    // Eventos para opções de cor
    colorOptions.forEach(option => {
        option.addEventListener('click', () => {
            const cor = option.getAttribute('data-color');
            aplicarCorTema(cor);

            // Atualizar seleção visual
            colorOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
        });
    });
}

function aplicarTema(tema) {
    const body = document.body;
    const temaSwitch = document.getElementById('tema-switch');

    // Atualizar atributo no body
    if (tema === 'dark') {
        body.setAttribute('data-theme', 'dark');
        temaSwitch.querySelector('.icon').textContent = '☀️'; // ☀️ = ☀️ (sol)
        temaSwitch.querySelector('.text').textContent = 'Modo Claro';
    } else {
        body.removeAttribute('data-theme');
        temaSwitch.querySelector('.icon').textContent = '🌓'; // 🌓 = 🌓 (lua)
        temaSwitch.querySelector('.text').textContent = 'Modo Escuro';
    }

    // Salvar preferência
    localStorage.setItem('tema', tema);

    // Atualizar gráficos para o novo tema
    atualizarGraficos();
}

function aplicarCorTema(cor) {
    const body = document.body;

    // Remover tema de cor anterior
    ['blue', 'green', 'purple', 'orange', 'red'].forEach(c => {
        body.removeAttribute(`data-color-theme-${c}`);
    });

    // Aplicar novo tema de cor
    body.setAttribute('data-color-theme', cor);

    // Salvar preferência
    localStorage.setItem('cor', cor);

    // Atualizar gráficos
    atualizarGraficos();
}

// Manter o botão legado de alternar tema
function alternarTema() {
    const temaAtual = localStorage.getItem('tema') || 'light';
    const novoTema = temaAtual === 'light' ? 'dark' : 'light';

    aplicarTema(novoTema);

    // Atualizar seleção visual no painel de configurações
    document.querySelectorAll('.theme-option').forEach(opt => opt.classList.remove('active'));
    document.querySelector(`.theme-option[data-theme="${novoTema}"]`).classList.add('active');
}

// Inicialização
window.onload = function() {
    // Definir data atual como padrão nos inputs de data
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('data-despesa').value = hoje;

    // Focar no campo de renda rápida
    setTimeout(() => {
        document.getElementById('valor-renda-rapida').focus();
    }, 500);

    // Adicionar evento de tecla Enter para o campo de renda rápida
    document.getElementById('valor-renda-rapida').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            adicionarRendaRapida();
        }
    });

    // Definir mês atual como padrão no filtro de mês
    const mesAtual = new Date().getMonth().toString();
    document.getElementById('filtro-mes').value = mesAtual;

    // Adicionar estilos para notificações
    const style = document.createElement('style');
    style.textContent = `
        .notificacao {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: bold;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            z-index: 1000;
        }
        .notificacao.sucesso {
            background-color: var(--success-color);
        }
        .notificacao.erro {
            background-color: var(--danger-color);
        }
    `;
    document.head.appendChild(style);

    // Inicializar gerenciamento de temas
    gerenciarTemas();

    // Adicionar evento de clique ao botão de tema legado
    document.getElementById('tema-switch').addEventListener('click', alternarTema);

    // Inicializar interface
    atualizarInterface();
    atualizarGraficos();

    // Adicionar animação de entrada aos elementos
    animarElementos();
};

// Função para animar elementos na entrada
function animarElementos() {
    const containers = document.querySelectorAll('.container');
    const cards = document.querySelectorAll('.card');

    // Aplicar atraso escalonado para animação
    containers.forEach((container, index) => {
        container.style.animationDelay = `${index * 0.1}s`;
    });

    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });
}
// -----------------------------------------------------------------------------------------------------------------------------

// Formata a data atual
async function formatCurrentDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').textContent = new Date().toLocaleDateString('pt-BR', options);
}

// Funções auxiliares (mantidas as mesmas)
function formatDate(dateString) {
    const options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    };
    return new Date(dateString).toLocaleDateString('pt-BR', options).replace(',', ' -');
}

function formatAddress(cliente) {
    return `${cliente.address}, ${cliente.number} - ${cliente.bairro}, ${cliente.city}`;
}

function formatStatus(status) {
    const statusMap = {
        'pendente': 'Pendente',
        'andamento': 'Em Andamento',
        'concluido': 'Concluído'
    };
    return statusMap[status] || status;
}

function getStatusBadgeClass(status) {
    return {
        'pendente': 'badge-pendente',
        'andamento': 'badge-andamento',
        'concluido': 'badge-concluido'
    }[status] || '';
}

async function fetchAgendamentos() {
    try {
        if (!tecnico) {
            throw new Error('Nome do técnico não definido');
        }

        const url = `https://api.movidesk.com/public/v1/tickets?token=1a59394e-9992-48cc-b4f6-7d9bfe590785&$expand=clients&$select=id,protocol,serviceFull,slaSolutionDate,category&$filter=justification eq 'Novo Agendado' and category eq '${tecnico}'`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Erro na requisição');

        const data = await response.json();

        return data.map(item => ({
            id: item.id,
            protocol: item.protocol,
            clientes: {
                businessName: item.clients?.[0]?.businessName || "Cliente não informado",
                address: item.clients?.[0]?.address || 'Endereço não informado',
                number: item.clients?.[0]?.addressNumber || 'S/N',
                bairro: item.clients?.[0]?.neighborhood || 'Bairro não informado',
                city: `${item.clients?.[0]?.city || 'Cidade não informada'}/${item.clients?.[0]?.state || 'UF'}`
            },
            serviceFull: item.serviceFull || "Serviço não especificado",
            slaSolutionDate: item.slaSolutionDate,
            status: "pendente"
        }));

    } catch (error) {
        console.error("Erro ao buscar agendamentos:", error);
        throw error;
    }
}

// Carrega e exibe os agendamentos
async function loadAgendamentos() {
    const listaAgendamentos = document.getElementById('lista-agendamentos');

    // Mostra estado de carregamento
    listaAgendamentos.innerHTML = `
        <div class="col-12 text-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Carregando...</span>
            </div>
            <p>Carregando agendamentos...</p>
        </div>
    `;

    try {
        const agendamentos = await fetchAgendamentos();

        // Limpa a lista
        listaAgendamentos.innerHTML = '';

        if (agendamentos.length === 0) {
            listaAgendamentos.innerHTML = `
                <div class="col-12 text-center text-muted">
                    <p>Nenhum agendamento encontrado</p>
                </div>
            `;
            return;
        }

        // Adiciona os agendamentos à lista
        agendamentos.forEach(agendamento => {
            const card = createAgendamentoCard(agendamento);
            listaAgendamentos.appendChild(card);
        });

    } catch (error) {
        listaAgendamentos.innerHTML = `
            <div class="col-12 text-center text-danger">
                <p>Erro ao carregar agendamentos. Tente novamente mais tarde.</p>
                <button class="btn btn-sm btn-outline-primary" onclick="loadAgendamentos()">
                    Tentar novamente
                </button>
            </div>
        `;
    }
}

// Cria o card de agendamento
function createAgendamentoCard(agendamento) {
    const statusClass = `status-${agendamento.status}`;
    const badgeClass = getStatusBadgeClass(agendamento.status);

    const card = document.createElement('div');
    card.className = 'col-md-6 col-lg-4';
    card.innerHTML = `
        <div class="card card-agendamento ${statusClass}" data-id="${agendamento.id}">
            <div class="card-header">
                <div class="d-flex justify-content-between align-items-start">
                    <h5 class="client-name mb-0">${agendamento.clientes.businessName}</h5>
                    <span class="status-badge ${badgeClass}">${formatStatus(agendamento.status)}</span>
                </div>
            </div>
            <div class="card-body">
                <p class="client-address">
                    <i class="fas fa-map-marker-alt text-muted me-2"></i>
                    ${formatAddress(agendamento.clientes)}
                </p>
                
                <div class="service-info">
                    <p class="service-title mb-1">
                        <i class="fas fa-tools text-primary me-2"></i>
                        ${agendamento.serviceFull}
                    </p>
                </div>
                
                <div class="deadline">
                    <i class="fas fa-clock"></i>
                    <span>
                        <strong>Prazo:</strong> ${formatDate(agendamento.slaSolutionDate)}
                    </span>
                </div>
            </div>
        </div>
    `;

    card.addEventListener('click', () => abrirModal(agendamento));
    return card;
}

// Modal e envio de dados (mantido igual)
function abrirModal(agendamento) {
    document.getElementById('agendamentoId').value = agendamento.id;
    document.getElementById('modal-client-name').textContent = agendamento.clientes.businessName;
    document.getElementById('modal-client-address').textContent = formatAddress(agendamento.clientes);
    document.getElementById('modal-service-full').textContent = agendamento.serviceFull;
    document.getElementById('modal-sla-date').textContent = formatDate(agendamento.slaSolutionDate);

    const statusBadge = document.getElementById('modal-status-badge');
    statusBadge.className = `status-badge ${getStatusBadgeClass(agendamento.status)}`;
    statusBadge.textContent = formatStatus(agendamento.status);

    new bootstrap.Modal(document.getElementById('modalServico')).show();
}



// Inicialização
document.addEventListener('DOMContentLoaded', function () {
    formatCurrentDate();
    loadAgendamentos(); // Carrega os dados assincronamente
});

let tecnico = '';

/**
 * Obtém ou solicita o nome do técnico
 * @returns {Promise<string>} Nome do técnico
 */
async function getOrRequestTechnicianName() {
    // Verifica se já existe no localStorage
    const nomeDoTecnico = localStorage.getItem('nomedotecnico');

    // Se existir, retorna o valor
    if (nomeDoTecnico) {
        tecnico = nomeDoTecnico
        console.log(tecnico)
        return nomeDoTecnico;
    }

    // Se não existir, solicita ao usuário
    return new Promise((resolve) => {
        // Cria um modal de prompt personalizado
        const modalHTML = `
            <div class="modal fade" id="technicianNameModal" tabindex="-1" aria-labelledby="technicianNameModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="technicianNameModalLabel">Identificação do Técnico</h5>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label for="technicianNameInput" class="form-label">Por favor, informe seu nome:</label>
                                <input type="text" class="form-control" id="technicianNameInput" required>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary" id="saveTechnicianName">Salvar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Adiciona o modal ao DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Mostra o modal
        const modal = new bootstrap.Modal(document.getElementById('technicianNameModal'));
        modal.show();

        // Configura o evento de salvar
        document.getElementById('saveTechnicianName').addEventListener('click', () => {
            const inputName = document.getElementById('technicianNameInput').value.trim();

            if (inputName) {
                // Salva no localStorage
                localStorage.setItem('nomedotecnico', inputName);

                // Fecha o modal
                modal.hide();

                // Remove o modal do DOM após fechar
                document.getElementById('technicianNameModal').addEventListener('hidden.bs.modal', () => {
                    document.getElementById('technicianNameModal').remove();
                }, { once: true });

                // Resolve a Promise com o nome
                resolve(inputName);
            } else {
                // Mostra mensagem de erro se estiver vazio
                alert('Por favor, informe um nome válido!');
            }
        });
    });
}

// Como usar a função:
async function initializeApp() {
    try {
        // 1. Primeiro obtém o nome do técnico
        tecnico = await getOrRequestTechnicianName();
        console.log('Técnico:', tecnico);

        // 2. Atualiza a exibição do nome
        document.getElementById('nome-tecnico-display').textContent = tecnico;

        // 3. Formata a data
        await formatCurrentDate();

        // 4. Carrega os agendamentos (agora com o técnico definido)
        await loadAgendamentos();

    } catch (error) {
        console.error('Erro ao inicializar aplicação:', error);
        // Mostra mensagem de erro para o usuário
        document.getElementById('lista-agendamentos').innerHTML = `
            <div class="col-12 text-center text-danger">
                <p>Erro ao inicializar a aplicação. Recarregue a página.</p>
            </div>
        `;
    }
}

async function EnviaRelatorio() {
    let tempoOk = ''
    let id = document.getElementById('agendamentoId').value;
    let serviceOk = document.getElementById('servicoRealizado').value;
    let obsOk = document.getElementById('observacoes').value;
    let selectElement = document.getElementById('statusServico');

    let statusOk = selectElement.options[selectElement.selectedIndex].text;
    
    // let statusOk = document.getElementById('statusServico').textContent;



    let horaIn = document.getElementById('horaEntrada').value;
    let horaOut = document.getElementById('horaSaida').value;
   
    if (!serviceOk || !obsOk) {
        alert('Por favor, preencha todos os campos obrigatórios!');
        return;
    }

    if (!horaIn || !horaOut) {
        alert("Por favor, preencha ambos os horários");
        return;
    }

    const [hIn, mIn] = horaIn.split(':').map(Number);
    const [hOut, mOut] = horaOut.split(':').map(Number);
    const minutosIn = hIn * 60 + mIn;
    const minutosOut = hOut * 60 + mOut;
    let diffMinutos = minutosOut - minutosIn;
    if (diffMinutos < 0) {
        diffMinutos += 24 * 60; // Adiciona 24 horas
    }
    tempoOk = diffMinutos / 60;
    console.log("Tempo calculado:", tempoOk, "horas");


    console.log(id)
    console.log(serviceOk)
    console.log(obsOk)
    console.log(statusOk)
    console.log(horaIn)
    console.log(horaOut)
    console.log(tempoOk)

    let text = `
    Serviço Relalizado: ${serviceOk}.\n
    Observações: ${obsOk}.\n
    Status do Serviço : ${statusOk}.\n
    Tempo de serviço : ${tempoOk}. HORAS \n
    `
    console.log(text)

    let updateData = `
{    
"type": 2, 
"owner": {
    "id": "363930337",
    "personType": 1,
    "profileType": 3,
    "businessName": "Joaquim Carlos",
    "email": "joaquim@acsapps.com.br",
    "phone": "85 981908672"
    },
    "ownerTeam": "Suporte Fiscal",
    "actions": [
        {
            "type": 2,
            "origin": 2,
            "description": "${text}",
            "status": "Resolvido",
            "tags": [
                ]
                }
                ]
                }
                
                `

    console.log(updateData)

    await patchTickets(id, updateData)

    // Simulação de envio
    setTimeout(() => {

        alert('Relatório enviado com sucesso!');
        bootstrap.Modal.getInstance(document.getElementById('modalServico')).hide();

    }, 1000);


}

// document.getElementById('btnEnviarServico').addEventListener('click', function () {
   


// });


// Inicia a aplicação

async function patchTickets(ticketId, updateData) {
    const url = `https://api.movidesk.com/public/v1/tickets?token=1a59394e-9992-48cc-b4f6-7d9bfe590785&id=${ticketId}`;
    // console.log(url)
    
    const requestOptions = {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
    };
    
    try {
        const response = await fetch(url, requestOptions);
        // console.log(response)
        if (!response.ok) {
            throw new Error('Erro ao atualizar o ticket');
        }
        console.log('Ticket Resolvido', ticketId);
    } catch (error) {
        console.error('Erro na requisição PATCH:', error.message);
        throw error;
    }
}



document.addEventListener('DOMContentLoaded', initializeApp);
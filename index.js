const express = require('express');
const crypto = require('crypto');
const axios = require('axios');

const ASAAS_WEBHOOK_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN;
const FACEBOOK_PIXEL_ID = process.env.FACEBOOK_PIXEL_ID;
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

const app = express();
app.use(express.json());

app.post('/webhook', (req, res) => {

    const asaasToken = req.headers['asaas-access-token'];
    if (!ASAAS_WEBHOOK_TOKEN || asaasToken !== ASAAS_WEBHOOK_TOKEN) {
        console.warn('Acesso negado: Token do Asaas inválido.');
        return res.status(401).send('Acesso não autorizado');
    }

    const notification = req.body;
    
    if (notification.event === 'PAYMENT_RECEIVED' || notification.event === 'PAYMENT_CONFIRMED') {
        
        const payment = notification.payment;

        const descriptionForLog = payment.description || "N/A";
        console.log(`Pagamento ${payment.id} recebido. Verificando descrição: "${descriptionForLog}"`);


        const PALAVRAS_CHAVE_PERMITIDAS = [
            'raras 2026', 
            'RARAS'
            'RARAS 2026'
        ];

        const descricaoVenda = payment.description ? payment.description.toLowerCase() : '';
        const correspondeAUmEvento = PALAVRAS_CHAVE_PERMITIDAS.some(keyword => descricaoVenda.includes(keyword));

        if (correspondeAUmEvento) {
            
            console.log(`Descrição corresponde a um evento da lista. Enviando para o Facebook.`);

            const userData = {
                em: [hashValue(payment.customer.email ? payment.customer.email.toLowerCase().trim() : null)]
            };

            const customData = {
                value: payment.value,
                currency: 'BRL',
            };

            sendConversionToFacebook(userData, customData);

        } else {
            console.log(`Descrição não corresponde a nenhum evento da lista. Venda ignorada.`);
        }
    }
    
    res.status(200).send('Evento recebido.');
});

async function sendConversionToFacebook(userData, customData) {
    const eventTime = Math.floor(new Date().getTime() / 1000);
    const serverEvent = {
        event_name: 'Purchase',
        event_time: eventTime,
        user_data: userData,
        custom_data: customData,
        action_source: 'website', 
    };

    const url = `https://graph.facebook.com/v19.0/${FACEBOOK_PIXEL_ID}/events?access_token=${FACEBOOK_ACCESS_TOKEN}`;
    
    try {
        await axios.post(url, { data: [serverEvent] });
        console.log('Evento de "Purchase" enviado com sucesso para o Facebook!');
    } catch (error) {
        console.error('ERRO ao enviar evento para o Facebook:', error.response ? error.response.data.error.message : error.message);
    }
}

function hashValue(value) {
    if (!value) return null;
    return crypto.createHash('sha256').update(value).digest('hex');
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor ouvindo na porta ${PORT}`));

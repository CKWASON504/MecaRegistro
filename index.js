const { Client, GatewayIntentBits, Partials, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, SlashCommandBuilder, REST, Routes, InteractionType, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const fs = require('fs');
const { token, guildId } = require('./config.json');

const client = new Client({
    intents: [GatewayIntentBits.Guilds],
    partials: [Partials.Channel]
});

client.once('ready', async () => {
    console.log(`✅ Bot conectado como ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder()
            .setName('registrar')
            .setDescription('Registra un vehículo')
            .toJSON()
    ];

    const rest = new REST({ version: '10' }).setToken(token);
    try {
        await rest.put(
            Routes.applicationGuildCommands(client.user.id, guildId),
            { body: commands }
        );
        console.log('✅ Comando /registrar registrado.');
    } catch (error) {
        console.error('❌ Error al registrar comandos:', error);
    }
});

const registrosTemp = new Map();

client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand() && interaction.commandName === 'registrar') {
        const modal = new ModalBuilder()
            .setCustomId('modal_registro')
            .setTitle('Registro de Vehículo');

        const nombreCliente = new TextInputBuilder()
            .setCustomId('nombre_cliente')
            .setLabel('Nombre del Cliente')
            .setStyle(TextInputStyle.Short);

        const nombreVehiculo = new TextInputBuilder()
            .setCustomId('nombre_vehiculo')
            .setLabel('Nombre del Vehículo')
            .setStyle(TextInputStyle.Short);

        const matricula = new TextInputBuilder()
            .setCustomId('matricula')
            .setLabel('Matrícula')
            .setStyle(TextInputStyle.Short);

        const tuneo = new TextInputBuilder()
            .setCustomId('tuneo')
            .setLabel('Tuneo')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);

        const row1 = new ActionRowBuilder().addComponents(nombreCliente);
        const row2 = new ActionRowBuilder().addComponents(nombreVehiculo);
        const row3 = new ActionRowBuilder().addComponents(matricula);
        const row4 = new ActionRowBuilder().addComponents(tuneo);

        modal.addComponents(row1, row2, row3, row4);
        await interaction.showModal(modal);
    }

    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'modal_registro') {
        const nombre = interaction.fields.getTextInputValue('nombre_cliente');
        const vehiculo = interaction.fields.getTextInputValue('nombre_vehiculo');
        const matricula = interaction.fields.getTextInputValue('matricula');
        const tuneo = interaction.fields.getTextInputValue('tuneo');

        registrosTemp.set(interaction.user.id, {
            cliente: nombre,
            vehiculo: vehiculo,
            matricula: matricula,
            tuneo: tuneo,
            fecha: new Date().toISOString()
        });

        const tipoSelect = new StringSelectMenuBuilder()
            .setCustomId('seleccionar_tipo')
            .setPlaceholder('Selecciona el tipo del vehículo')
            .addOptions(
                { label: 'Facción', value: 'facción' },
                { label: 'Normal', value: 'normal' },
                { label: 'VIP', value: 'vip' }
            );

        const row = new ActionRowBuilder().addComponents(tipoSelect);

        await interaction.reply({
            content: 'Selecciona el tipo del vehículo:',
            components: [row],
            ephemeral: true
        });
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'seleccionar_tipo') {
        const tipo = interaction.values[0];
        const datos = registrosTemp.get(interaction.user.id);
        if (!datos) {
            await interaction.reply({ content: '❌ Error al recuperar los datos.', ephemeral: true });
            return;
        }

        datos.tipo = tipo;
        registrosTemp.delete(interaction.user.id);

        // Guardar en registros.json
        let registros = [];
        try {
            registros = JSON.parse(fs.readFileSync('./registros.json'));
        } catch (e) {
            console.error("Error leyendo registros.json:", e);
        }

        registros.push(datos);
        fs.writeFileSync('./registros.json', JSON.stringify(registros, null, 2));

        const canalDeRespuestas = '1358271826194858014';
        const canal = await client.channels.fetch(canalDeRespuestas);
        if (canal) {
            await canal.send({
                content: `📋 **Nuevo registro de vehículo**:
**Cliente**: ${datos.cliente}
**Vehículo**: ${datos.vehiculo}
**Matrícula**: ${datos.matricula}
**Tipo**: ${tipo}
**Tuneo**: ${datos.tuneo || 'Ninguno'}`
            });
        }

        await interaction.update({
            content: `✅ Vehículo registrado como tipo: **${tipo}**`,
            components: []
        });
    }
});

client.login(token);

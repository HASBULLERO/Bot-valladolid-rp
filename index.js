const { 
    Client, GatewayIntentBits, Partials, Collection, 
    SlashCommandBuilder, REST, Routes, PermissionFlagsBits,
    ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder 
} = require('discord.js');
const OpenAI = require("openai");
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

client.commands = new Collection();

// ------------------- COMANDOS ------------------- //
const commands = [

    // Moderación
    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Banea a un usuario')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario a banear').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Expulsa a un usuario')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario a expulsar').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Advierte a un usuario')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario a advertir').setRequired(true))
        .addStringOption(o => o.setName('razon').setDescription('Razón').setRequired(false)),

    new SlashCommandBuilder()
        .setName('unwarn')
        .setDescription('Quita advertencia a un usuario')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario a quitar advertencia').setRequired(true)),

    new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Silencia a un usuario')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario a mutear').setRequired(true)),

    new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Des-silencia a un usuario')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario a desmutear').setRequired(true)),

    // Diversión
    new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Lanza una moneda'),

    new SlashCommandBuilder()
        .setName('ship')
        .setDescription('Hace ship entre dos usuarios')
        .addUserOption(o => o.setName('user1').setDescription('Primer usuario').setRequired(true))
        .addUserOption(o => o.setName('user2').setDescription('Segundo usuario').setRequired(true)),

    new SlashCommandBuilder()
        .setName('confess')
        .setDescription('Envía una confesión anónima')
        .addStringOption(o => o.setName('mensaje').setDescription('Confesión').setRequired(true)),

    // IA
    new SlashCommandBuilder()
        .setName('ask')
        .setDescription('Pregunta algo a la IA')
        .addStringOption(o => o.setName('pregunta').setDescription('Lo que quieras preguntar').setRequired(true)),

    // Soporte
    new SlashCommandBuilder()
        .setName('soporte')
        .setDescription('Sistema de soporte básico'),

].map(cmd => cmd.toJSON());

// ------------------- REGISTRAR COMANDOS ------------------- //
client.once('ready', async () => {
    console.log(`✅ Bot conectado como ${client.user.tag}`);

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log("✅ Comandos cargados");
    } catch (err) {
        console.error(err);
    }
});

// ------------------- EVENTOS ------------------- //
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() && !interaction.isStringSelectMenu()) return;

    // ---------------- Moderación ----------------
    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;

        if (commandName === 'ban') {
            const user = interaction.options.getUser('usuario');
            const member = interaction.guild.members.cache.get(user.id);
            if (!member.bannable) return interaction.reply({ content: '❌ No puedo banear a este usuario.', ephemeral: true });
            await member.ban({ reason: `Baneado por ${interaction.user.tag}` });
            return interaction.reply(`🔨 ${user.tag} ha sido baneado.`);
        }

        if (commandName === 'kick') {
            const user = interaction.options.getUser('usuario');
            const member = interaction.guild.members.cache.get(user.id);
            if (!member.kickable) return interaction.reply({ content: '❌ No puedo expulsar a este usuario.', ephemeral: true });
            await member.kick(`Expulsado por ${interaction.user.tag}`);
            return interaction.reply(`👢 ${user.tag} ha sido expulsado.`);
        }

        if (commandName === 'warn') {
            const user = interaction.options.getUser('usuario');
            const reason = interaction.options.getString('razon') || "Sin razón";
            return interaction.reply(`⚠️ ${user.tag} ha sido advertido. Razón: ${reason}`);
        }

        if (commandName === 'unwarn') {
            const user = interaction.options.getUser('usuario');
            return interaction.reply(`✅ Se eliminó la advertencia de ${user.tag}.`);
        }

        if (commandName === 'mute') {
            const user = interaction.options.getUser('usuario');
            const member = interaction.guild.members.cache.get(user.id);
            await member.timeout(60 * 60 * 1000, "Muteado por comando"); // 1 hora
            return interaction.reply(`🔇 ${user.tag} ha sido muteado.`);
        }

        if (commandName === 'unmute') {
            const user = interaction.options.getUser('usuario');
            const member = interaction.guild.members.cache.get(user.id);
            await member.timeout(null);
            return interaction.reply(`🔊 ${user.tag} ha sido desmuteado.`);
        }

        // ---------------- Diversión ----------------
        if (commandName === 'coinflip') {
            const result = Math.random() < 0.5 ? "🪙 Cara" : "🪙 Cruz";
            return interaction.reply(result);
        }

        if (commandName === 'ship') {
            const user1 = interaction.options.getUser('user1');
            const user2 = interaction.options.getUser('user2');
            const porcentaje = Math.floor(Math.random() * 100);
            return interaction.reply(`💞 Ship entre **${user1.username}** y **${user2.username}**: ${porcentaje}%`);
        }

        if (commandName === 'confess') {
            const msg = interaction.options.getString('mensaje');
            await interaction.channel.send(`📢 Confesión anónima:\n>>> ${msg}`);
            return interaction.reply({ content: "✅ Tu confesión fue enviada anónimamente.", ephemeral: true });
        }

        // ---------------- IA ----------------
        if (commandName === 'ask') {
            const pregunta = interaction.options.getString('pregunta');
            await interaction.deferReply();

            try {
                const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

                const respuesta = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: "Responde como si fueras el usuario." },
                        { role: "user", content: pregunta }
                    ]
                });

                await interaction.editReply(respuesta.choices[0].message.content || "⚠️ No hubo respuesta.");
            } catch (err) {
                console.error("Error en /ask:", err);
                await interaction.editReply("❌ Error al obtener respuesta de la IA.");
            }
        }

        // ---------------- Soporte ----------------
        if (commandName === 'soporte') {
            const embed = new EmbedBuilder()
                .setColor("Purple")
                .setTitle("📌 Sistema de soporte")
                .setDescription("Selecciona tu duda en el menú de abajo 👇");

            const menu = new StringSelectMenuBuilder()
                .setCustomId("menu_soporte")
                .setPlaceholder("Selecciona tu duda")
                .addOptions([
                    { label: "❓ Cómo creo un ticket", description: "Aprende a crear un ticket de soporte", value: "ticket" },
                    { label: "🚨 Cómo hago un reporte", description: "Dónde y cómo reportar", value: "reporte" },
                    { label: "🎮 Cómo me uno al servidor RP", description: "Guía para entrar al roleplay", value: "rp" },
                    { label: "🛡️ Cómo me postulo a moderación", description: "Proceso para aplicar a staff", value: "mod" }
                ]);

            const row = new ActionRowBuilder().addComponents(menu);

            return interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });
        }
    }

    // --- Respuestas del menú de soporte ---
    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === "menu_soporte") {
            let respuesta = "";

            if (interaction.values[0] === "ticket") {
                respuesta = "📌 Para crear un ticket abre el canal <#1405607173362417746> y presiona el botón de crear ticket.";
            }
            if (interaction.values[0] === "reporte") {
                respuesta = "🚨 Para hacer un reporte utiliza el canal <#1405607173362417746> y sigue el formato de reporte.";
            }
            if (interaction.values[0] === "rp") {
                respuesta = "🎮 Para unirte al servidor RP revisa el canal <#1405672004870209566> donde publicamos el **status del servidor** y la IP de conexión.";
            }
            if (interaction.values[0] === "mod") {
                respuesta = "🛡️ Para postularte a moderación visita el canal <#1406954923631050954> y completa la postulación.";
            }

            await interaction.reply({ content: respuesta, ephemeral: true });
        }
    }
});

// ------------------- ANTI-RAID ------------------- //
client.on('guildMemberAdd', async member => {
    const accountAge = Date.now() - member.user.createdAt.getTime();
    if (accountAge < 1000 * 60 * 60 * 24 * 7) { // cuentas menores a 7 días
        try { await member.send("🚨 Has sido baneado automáticamente por el sistema anti-raid."); } catch {}
        await member.ban({ reason: "Anti-Raid: cuenta sospechosa" });
        const channel = member.guild.systemChannel;
        if (channel) channel.send(`🚨 ${member.user.tag} fue baneado automáticamente por el **anti-raid**.`);
    }
});

client.login(process.env.TOKEN);

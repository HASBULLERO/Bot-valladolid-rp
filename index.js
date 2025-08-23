const { 
    Client, GatewayIntentBits, Partials, Collection, 
    SlashCommandBuilder, REST, Routes, PermissionFlagsBits,
    ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder 
} = require('discord.js');
const OpenAI = require("openai");
require('dotenv').config();
const express = require("express"); // Para mantener activo en Render

// --- Servidor web mínimo para Render ---
const app = express();
app.get("/", (req, res) => res.send("Bot activo"));
app.listen(process.env.PORT || 3000, () => console.log("✅ Servidor web activo"));

// --- Cliente Discord ---
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
    // Aquí van todos tus SlashCommandBuilder como los tenías
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

    try {
        if (interaction.isChatInputCommand()) {
            const { commandName } = interaction;

            // --- Moderación ---
            if (['ban','kick','mute','unmute'].includes(commandName)) {
                const user = interaction.options.getUser('usuario');
                const member = await interaction.guild.members.fetch(user.id).catch(() => null);
                if (!member) return interaction.reply({ content: '❌ Usuario no encontrado.', ephemeral: true });

                if (commandName === 'ban') {
                    if (!member.bannable) return interaction.reply({ content: '❌ No puedo banear a este usuario.', ephemeral: true });
                    await member.ban({ reason: `Baneado por ${interaction.user.tag}` });
                    return interaction.reply(`🔨 ${user.tag} ha sido baneado.`);
                }

                if (commandName === 'kick') {
                    if (!member.kickable) return interaction.reply({ content: '❌ No puedo expulsar a este usuario.', ephemeral: true });
                    await member.kick(`Expulsado por ${interaction.user.tag}`);
                    return interaction.reply(`👢 ${user.tag} ha sido expulsado.`);
                }

                if (commandName === 'mute') {
                    await member.timeout(60 * 60 * 1000, "Muteado por comando");
                    return interaction.reply(`🔇 ${user.tag} ha sido muteado.`);
                }

                if (commandName === 'unmute') {
                    await member.timeout(null);
                    return interaction.reply(`🔊 ${user.tag} ha sido desmuteado.`);
                }
            }

            // --- Warn/Unwarn ---
            if (commandName === 'warn') {
                const user = interaction.options.getUser('usuario');
                const reason = interaction.options.getString('razon') || "Sin razón";
                return interaction.reply(`⚠️ ${user.tag} ha sido advertido. Razón: ${reason}`);
            }
            if (commandName === 'unwarn') {
                const user = interaction.options.getUser('usuario');
                return interaction.reply(`✅ Se eliminó la advertencia de ${user.tag}.`);
            }

            // --- Diversión ---
            if (commandName === 'coinflip') return interaction.reply(Math.random() < 0.5 ? "🪙 Cara" : "🪙 Cruz");

            if (commandName === 'ship') {
                const user1 = interaction.options.getUser('user1');
                const user2 = interaction.options.getUser('user2');
                return interaction.reply(`💞 Ship entre **${user1.username}** y **${user2.username}**: ${Math.floor(Math.random()*100)}%`);
            }

            if (commandName === 'confess') {
                const msg = interaction.options.getString('mensaje');
                await interaction.channel.send(`📢 Confesión anónima:\n>>> ${msg}`);
                return interaction.reply({ content: "✅ Tu confesión fue enviada anónimamente.", ephemeral: true });
            }

            // --- IA ---
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
                    await interaction.editReply(respuesta.choices[0]?.message?.content || "⚠️ No hubo respuesta.");
                } catch (err) {
                    console.error("Error en /ask:", err);
                    await interaction.editReply("❌ Error al obtener respuesta de la IA.");
                }
            }

            // --- Soporte ---
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

                return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
            }
        }

        // --- Menú de soporte ---
        if (interaction.isStringSelectMenu() && interaction.customId === "menu_soporte") {
            const respuestas = {
                ticket: "📌 Para crear un ticket abre el canal <#1405607173362417746> y presiona el botón de crear ticket.",
                reporte: "🚨 Para hacer un reporte utiliza el canal <#1405607173362417746> y sigue el formato de reporte.",
                rp: "🎮 Para unirte al servidor RP revisa el canal <#1405672004870209566> donde publicamos el **status del servidor** y la IP de conexión.",
                mod: "🛡️ Para postularte a moderación visita el canal <#1406954923631050954> y completa la postulación."
            };
            await interaction.reply({ content: respuestas[interaction.values[0]] || "❌ Opción no válida.", ephemeral: true });
        }
    } catch (err) {
        console.error("Error general en interactionCreate:", err);
        if (interaction.replied || interaction.deferred) {
            await interaction.editReply("❌ Ocurrió un error inesperado.");
        } else {
            await interaction.reply({ content: "❌ Ocurrió un error inesperado.", ephemeral: true });
        }
    }
});

// --- Anti-Raid ---
client.on('guildMemberAdd', async member => {
    const accountAge = Date.now() - member.user.createdAt.getTime();
    if (accountAge < 1000 * 60 * 60 * 24 * 7) {
        try { await member.send("🚨 Has sido baneado automáticamente por el sistema anti-raid."); } catch {}
        await member.ban({ reason: "Anti-Raid: cuenta sospechosa" });
        const channel = member.guild.systemChannel;
        if (channel) channel.send(`🚨 ${member.user.tag} fue baneado automáticamente por el **anti-raid**.`);
    }
});

client.login(process.env.TOKEN);

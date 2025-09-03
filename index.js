const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  PermissionsBitField, 
  SlashCommandBuilder 
} = require("discord.js");
require("dotenv").config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

// ======= CONFIG =======
let serverStatus = "open"; // Estado inicial del servidor
const autoRoleId = "ID_DEL_ROL_CIUDADANO"; // Cambia esto al ID del rol
const muteRoleId = "ID_DEL_ROL_MUTE"; // Rol que bloquea hablar (para anti-raid)
const warnLogsChannel = "ID_CANAL_LOGS"; // Canal donde se registran warns

// ======= EMBEDS =======
const embedAbierto = new EmbedBuilder()
  .setTitle("Servidor abierto <:ok:1408963791726579762>")
  .setDescription(
    "Nuestro servidor se encuentra activo\n" +
    "Disfruta nuestra sesión de roleplay\n" +
    "Recuerda ver <#1408918972681949224> para evitar ser sancionado\n" +
    "Disfruta :D\n\n" +
    "**Código de acceso:** `m8ix1eda`\n" +
    "[Unirme al servidor](https://www.roblox.com/games/start?placeId=7711635737&launchData=joinCode%3Dm8ix1eda)"
  )
  .setImage("https://cdn.discordapp.com/attachments/1408918829978882050/1409722038578446516/ChatGPT_Image_25_ago_2025_09_04_06_p.m..png")
  .setColor("Green");

const embedCerrado = new EmbedBuilder()
  .setTitle("Servidor cerrado <:error:1408963793278730260>")
  .setDescription("Nuestro servidor está cerrado\nNo te podrás unir de momento\n\nTe esperamos en nuestra próxima sesión")
  .setImage("https://cdn.discordapp.com/attachments/1408918829978882050/1409722038578446516/ChatGPT_Image_25_ago_2025_09_04_06_p.m..png")
  .setColor("Red");

// ======= EVENTOS =======

// Bot listo
client.once("ready", () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
});

// Auto rol al unirse
client.on("guildMemberAdd", (member) => {
  const role = member.guild.roles.cache.get(autoRoleId);
  if (role) {
    member.roles.add(role).catch(console.error);
  }
});

// Anti-raid simple (flood de mensajes repetidos)
const userMessages = new Map();
client.on("messageCreate", (message) => {
  if (message.author.bot) return;

  const { author, content, guild } = message;
  const now = Date.now();

  if (!userMessages.has(author.id)) {
    userMessages.set(author.id, { lastMsg: content, count: 1, time: now });
  } else {
    let data = userMessages.get(author.id);
    if (data.lastMsg === content && now - data.time < 5000) {
      data.count++;
      if (data.count >= 5) {
        // Aplica mute temporal
        const muteRole = guild.roles.cache.get(muteRoleId);
        if (muteRole) {
          message.member.roles.add(muteRole).catch(console.error);
          message.channel.send(`${author} ha sido muteado por spam.`);
        }
      }
    } else {
      userMessages.set(author.id, { lastMsg: content, count: 1, time: now });
    }
  }
});

// ======= COMANDOS =======
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const member = interaction.member;

  // --- STATUS ---
  if (interaction.commandName === "status") {
    if (member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      const nuevoEstado = interaction.options.getString("estado");
      if (nuevoEstado) serverStatus = nuevoEstado;

      await interaction.reply({
        embeds: [serverStatus === "open" ? embedAbierto : embedCerrado],
      });
    } else {
      await interaction.reply({
        embeds: [serverStatus === "open" ? embedAbierto : embedCerrado],
        ephemeral: true,
      });
    }
  }

  // --- BAN ---
  if (interaction.commandName === "ban") {
    if (!member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return interaction.reply({ content: "No tienes permisos para usar este comando.", ephemeral: true });
    }
    const target = interaction.options.getUser("usuario");
    const reason = interaction.options.getString("razón") || "Sin especificar";

    const guildMember = interaction.guild.members.cache.get(target.id);
    if (guildMember) {
      await target.send(`Has sido baneado de **${interaction.guild.name}**. Razón: ${reason}`).catch(() => {});
      await guildMember.ban({ reason });
      await interaction.reply(`✅ ${target.tag} ha sido baneado. Razón: ${reason}`);
    }
  }

  // --- KICK ---
  if (interaction.commandName === "kick") {
    if (!member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
      return interaction.reply({ content: "No tienes permisos para usar este comando.", ephemeral: true });
    }
    const target = interaction.options.getUser("usuario");
    const reason = interaction.options.getString("razón") || "Sin especificar";

    const guildMember = interaction.guild.members.cache.get(target.id);
    if (guildMember) {
      await target.send(`Has sido expulsado de **${interaction.guild.name}**. Razón: ${reason}`).catch(() => {});
      await guildMember.kick(reason);
      await interaction.reply(`✅ ${target.tag} ha sido expulsado. Razón: ${reason}`);
    }
  }

  // --- WARN ---
  if (interaction.commandName === "warn") {
    if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return interaction.reply({ content: "No tienes permisos para usar este comando.", ephemeral: true });
    }
    const target = interaction.options.getUser("usuario");
    const reason = interaction.options.getString("razón") || "Sin especificar";

    await target.send(`⚠️ Has recibido una advertencia en **${interaction.guild.name}**. Razón: ${reason}`).catch(() => {});
    await interaction.reply(`⚠️ ${target.tag} ha sido advertido. Razón: ${reason}`);

    const logsChannel = interaction.guild.channels.cache.get(warnLogsChannel);
    if (logsChannel) logsChannel.send(`⚠️ ${target.tag} fue advertido por ${member.user.tag}. Razón: ${reason}`);
  }
});

// ======= REGISTRO DE COMANDOS =======
client.on("ready", async () => {
  const data = [
    new SlashCommandBuilder()
      .setName("status")
      .setDescription("Muestra o cambia el estado del servidor")
      .addStringOption(option =>
        option.setName("estado")
          .setDescription("Nuevo estado (solo Staff)")
          .setRequired(false)
          .addChoices(
            { name: "Abierto", value: "open" },
            { name: "Cerrado", value: "closed" }
          )
      ),
    new SlashCommandBuilder()
      .setName("ban")
      .setDescription("Banea a un usuario")
      .addUserOption(opt => opt.setName("usuario").setDescription("Usuario a banear").setRequired(true))
      .addStringOption(opt => opt.setName("razón").setDescription("Razón del baneo")),
    new SlashCommandBuilder()
      .setName("kick")
      .setDescription("Expulsa a un usuario")
      .addUserOption(opt => opt.setName("usuario").setDescription("Usuario a expulsar").setRequired(true))
      .addStringOption(opt => opt.setName("razón").setDescription("Razón de la expulsión")),
    new SlashCommandBuilder()
      .setName("warn")
      .setDescription("Advierte a un usuario")
      .addUserOption(opt => opt.setName("usuario").setDescription("Usuario a advertir").setRequired(true))
      .addStringOption(opt => opt.setName("razón").setDescription("Razón de la advertencia"))
  ].map(cmd => cmd.toJSON());

  await client.application.commands.set(data);
  console.log("✅ Comandos registrados: /status, /ban, /kick, /warn");
});

client.login(process.env.TOKEN);

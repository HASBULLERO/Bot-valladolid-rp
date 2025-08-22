
const { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
require('dotenv').config();
const express = require('express');

// ----------------- Servidor web para 24/7 -----------------
const app = express();
app.get("/", (req, res) => res.send("Bot encendido"));
app.listen(3000, '0.0.0.0', () => console.log("Servidor web activo en puerto 3000"));
// ---------------------------------------------------------

const client = net Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

client.once(Events.ClientReady, () => {
  console.log(`Logged in como ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ping') {
    await interaction.reply('Pong!');
  }

  if (interaction.commandName === 'say') {
    const mensaje = interaction.options.getString('mensaje');
    await interaction.deferReply({ ephemeral: true });
    setTimeout(() => {
      interaction.deleteReply().catch(() => {});
    }, 100);
    await interaction.channel.send(mensaje);
  }

  if (interaction.commandName === 'ban') {
    const user = interaction.options.getUser('usuario');
    const reason = interaction.options.getString('razon');
    const member = await interaction.guild.members.fetch(user.id);

    if (!member.bannable) return interaction.reply({ content: 'No puedo banear a este usuario.', ephemeral: true });

    await member.ban({ reason });
    await interaction.reply(`🚫 ${user.tag} fue baneado. Razón: ${reason}`);
  }

  if (interaction.commandName === 'kick') {
    const user = interaction.options.getUser('usuario');
    const reason = interaction.options.getString('razon');
    const member = await interaction.guild.members.fetch(user.id);

    if (!member.kickable) return interaction.reply({ content: 'No puedo expulsar a este usuario.', ephemeral: true });

    await member.kick(reason);
    await interaction.reply(`💢 ${user.tag} fue expulsado. Razón: ${reason}`);
  }

  if (interaction.commandName === 'mute') {
    const user = interaction.options.getUser('usuario');
    const reason = interaction.options.getString('razon');
    const member = await interaction.guild.members.fetch(user.id);

    await member.timeout(60 * 60 * 1000, reason); // 1 hora mute
    await interaction.reply(`🔇 ${user.tag} fue muteado 1h. Razón: ${reason}`);
  }

  if (interaction.commandName === 'unmute') {
    const user = interaction.options.getUser('usuario');
    const member = await interaction.guild.members.fetch(user.id);

    await member.timeout(null);
    await interaction.reply(`🔊 ${user.tag} fue desmuteado.`);
  }

  if (interaction.commandName === 'coinflip') {
    const result = Math.random() < 0.5 ? '🪙 Cara' : '🪙 Cruz';
    await interaction.reply(`El resultado es: **${result}**`);
  }

  if (interaction.commandName === 'help') {
    await interaction.reply({
      embeds: [{
        color: 0x5865F2,
        title: '📖 Lista de comandos',
        description: `
        **/ping** → responde Pong!  
        **/say** → el bot repite tu mensaje  
        **/ban** → banear usuario con razón  
        **/kick** → expulsar usuario con razón  
        **/mute** → silenciar usuario 1h  
        **/unmute** → quitar mute  
        **/coinflip** → lanza moneda  
        **/help** → muestra este mensaje  
        `
      }]
    });
  }
});

// Register slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Responde con Pong!'),
  new SlashCommandBuilder()
    .setName('say')
    .setDescription('El bot dice el mensaje que escribas')
    .addStringOption(option =>
      option.setName('mensaje')
        .setDescription('El mensaje que dirá el bot')
        .setRequired(true)),
  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Banear a un usuario')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('El usuario a banear')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('razon')
        .setDescription('Razón del baneo')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulsar a un usuario')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('El usuario a expulsar')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('razon')
        .setDescription('Razón de la expulsión')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Silenciar a un usuario por 1h')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('El usuario a silenciar')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('razon')
        .setDescription('Razón del muteo')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers),
  new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Quitar mute a un usuario')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('El usuario a desmutear')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers),
  new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Lanza una moneda al aire'),
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Muestra todos los comandos')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('Slash commands registrados!');
  } catch (error) {
    console.error(error);
  }
})();

// Login del bot
client.login(process.env.TOKEN);

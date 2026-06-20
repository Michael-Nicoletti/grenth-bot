require('dotenv').config();				//Set up the env commands
const { REST, Routes, SlashCommandBuilder } = require ('discord.js');	//And now make sure we are grabbing the libraries from discord that we need

const commands = [
	new SlashCommandBuilder()
	.setName("form")
	.setDescription("Start forming an 8-person UWSC Terraway run now")
].map(command => command.toJSON());

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
	try {
		console.log('Registering slash commands');
		await rest.put(
			Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands }
		);		
		console.log('Slash commands registered successfully');
	} catch (error) {
		console.error(error);
	}
})();
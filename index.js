require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, Partials, MessageFlags } = require('discord.js');
const config = require('./config');
const { buildFormEmbed } = require('./embedBuilder');
const { findGroupAssignment } = require('./group-matcher');

let activeForm = null;

const client = new Client({
  intents: [
	GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildMembers,
	GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});


async function refreshForMessage(reactionMessage) {
	if(!activeForm) return;

	const assignment = findGroupAssignment(config.requiredRoles, activeForm.members);
	const embed = buildFormEmbed(activeForm, assignment);

	await reactionMessage.edit({ embeds: [embed] });

	if(assignment) {
		console.log("Group formed", assignment);
		activeForm.status = 'locked';
		activeForm.expireForm.clearTimeout();

		await reactionMessage.reactions.removeAll().catch(err => 
			console.log('Could not remove reactions: ',err)
		);

		activeForm=null;
	}
}

async function expireForm(message) {
	if(!activeForm || activeForm.status !== 'open') { return; }	//We are already closed for some reason. You can drop the timer.

	activeForm.status = 'expired';

	const embed = buildFormEmbed(activeForm, null)
		.setDescription('Form expired, role requirements not met');

	await message.edit({ embeds: [embed] });
	await message.reactions.removeAll().catch(err => 
		console.error('Could not remove reactions', err)
	);

	activeForm = null;
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});


client.on('interactionCreate', async interaction => {
	console.log('interaction seen');
	if(!interaction.isChatInputCommand()) return;
	if(interaction.commandName === 'form') {

		if(activeForm) { await interaction.reply({content: 'A form is already active. Either join that or wait until it closes to start a new one', flags: MessageFlags.Ephemeral }); return;}
		
		console.log('form sent');
		const embed = new EmbedBuilder()
			.setTitle("UWSC Form")
			.setDescription("Tick up to join the run, the form will auto-expire in 30 minutes if roles are not filled")
			.setColor(0x5865F2)
			.setFooter({text: 'Started by '+interaction.user.username});

		const reply = await interaction.reply({embeds: [embed], fetchReply: true});
		await reply.react('✅');

		activeForm = {
			messageId: reply.id,
			channelId: reply.channelId,
			members: new Map(),
			status: 'open', //locked, or closed when full, expired if it times out
			expireTimer: null,
		};

		activeForm.expireTimer = setTimeout( () => expireForm(reply), 30*60*1000);
	}
});

client.on('messageReactionAdd', async (reaction, user) => {
	if(reaction.partial) {
		try{
			console.log('waiting');
			await reaction.fetch();
		} catch(error) {
			console.error('Failed to fetch reaction ',error);
			return;
		}
	}

	if(user.bot) return;
	if(!activeForm || reaction.message.id !== activeForm.messageId) return;
	if(reaction.emoji.name !== '✅') return;
	if(activeForm.status !== 'open') return;			//No joining a closed form
	

	const guild = reaction.message.guild;
	const member = await guild.members.fetch(user.id);

	const relevantRoles = member.roles.cache
		.map(role => role.name)
		.filter(roleName => config.requiredRoles.includes(roleName));

	activeForm.members.set(user.id, {
		username: user.username,
		roles: relevantRoles
	});

	console.log(`${user.username} joined with roles: ${relevantRoles.join(', ') || 'none'}`);
	
	await refreshForMessage(reaction.message);
});

client.on('messageReactionRemove', async (reaction, user) => {
	if(user.bot) return;
	if(!activeForm || reaction.message.id !== activeForm.messageId) return;
	if(reaction.emoji.name !== '✅') return;

	activeForm.members.delete(user.id);
	console.log(`${user.username} left the form`);

	await refreshForMessage(reaction.message);
});

client.login(process.env.DISCORD_TOKEN);
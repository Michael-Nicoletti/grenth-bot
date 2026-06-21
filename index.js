require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('./config');
const { buildFormEmbed } = require('./embedBuilder');
const { findGroupAssignment } = require('./group-matcher');
const { buildJoinButton } = require('./button-handler');

let activeForm = null;

const client = new Client({
  intents: [
	GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildMembers,
  ]
});

async function refreshFormMessage(reactionMessage) {
	if(!activeForm) return;

	const assignment = findGroupAssignment(config.requiredRoles, activeForm.members);
	const embed = buildFormEmbed(activeForm, assignment);

	await reactionMessage.edit({ embeds: [embed] });

	if(assignment) {
		console.log("Group formed", assignment);
		activeForm.status = 'locked';
		clearTimeout(activeForm.expireTimer);

		await reactionMessage.edit({ embeds: [embed], components: [] });

		const mentions = Object.values(assignment)
			.map(member => `<@${member.id}>`)
			.join(' ');
		
		await reactionMessage.channel.send(`A group has been formed ${mentions}`);

		activeForm=null;
	} else {
		await reactionMessage.edit({ embeds: [embed], components: [buildJoinButton() ]});
	}
}

async function expireForm(message) {
	if(!activeForm || activeForm.status !== 'open') { return; }	//We are already closed for some reason. You can drop the timer.

	activeForm.status = 'expired';

	const embed = buildFormEmbed(activeForm, null)
		.setDescription('Form expired, role requirements not met');

	await message.edit({ embeds: [embed], components: [] });

	activeForm = null;
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});


client.on('interactionCreate', async interaction => {
	console.log('interaction seen');
	if(interaction.isChatInputCommand() && interaction.commandName === 'form') {

		if(activeForm) { await interaction.reply({content: 'A form is already active. Either join that or wait until it closes to start a new one', flags: MessageFlags.Ephemeral }); return;}
		
		console.log('form sent');

		activeForm = {
			messageId: null,
			channelId: interaction.channelId,
			creatorId: interaction.user.id,
			members: new Map(),
			status: 'open', //locked, or closed when full, expired if it times out
			expireTimer: null,
		};

		const embed = buildFormEmbed(activeForm, null);
		const row = buildJoinButton();

		const reply = await interaction.reply({ content: '<@ UW> Forming runs when a team can be filled!', embeds: [embed], components: [row], fetchReply: true});
		activeForm.messageId = reply.id;

		activeForm.expireTimer = setTimeout( () => expireForm(reply), 45*60*1000);

		return;
	}

	if(interaction.isButton()) {
		if(!activeForm || interaction.message.id !== activeForm.messageId) {
			await interaction.reply({content: 'This form is no longer active.', flags: MessageFlags.Ephemeral });
			return;
		}

		if(activeForm.status !== 'open') {
			await interaction.reply({content: 'This form is closed', flags: MessageFlags.Ephemeral });
			return;
		}

		if(interaction.customId === "toggle_join") {
			const userId = interaction.user.id;
			if(activeForm.members.has(userId)) {
				activeForm.members.delete(userId);
				await interaction.deferUpdate();
			} else {
				const member = await interaction.guild.members.fetch(userId);
				const relevantRoles = member.roles.cache
					.map(role => role.name)
					.filter(roleName => config.requiredRoles.includes(roleName));

				activeForm.members.set(userId, {
					id: userId,
					username: member.displayName,
					roles: relevantRoles,
				});
				await interaction.deferUpdate();
			}
			await refreshFormMessage(interaction.message);
		} else if (interaction.customId === "cancel_form") {
			if(interaction.user.id !== activeForm.creatorId) {
				await interaction.reply({ content: 'Only the person that started the form can cancel it', flags: MessageFlags.Ephemeral });
				return;
			}
			clearTimeout(activeForm.expireTimer);				//Clear the timeout so that we are done with that
			activeForm.status = 'cancelled';
			
			const embed = buildFormEmbed(activeForm, null)
				.setDescription(`Form cancelled`);

			await interaction.message.edit({content: '~~<@ UW> Forming runs when a team can be filled!~~', embeds: [embed], components: [] });

			activeForm = null;
		}
	}
});

client.login(process.env.DISCORD_TOKEN);
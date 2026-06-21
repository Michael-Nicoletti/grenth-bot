const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function buildJoinButton() {
	return new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId('toggle_join')
			.setLabel('Join / Leave')
			.setStyle(ButtonStyle.Primary),
		new ButtonBuilder()
			.setCustomId('cancel_form')
			.setLabel('Cancel')
			.setStyle(ButtonStyle.Danger)
	);
}

module.exports = { buildJoinButton }


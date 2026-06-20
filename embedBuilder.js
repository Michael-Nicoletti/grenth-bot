const {EmbedBuilder} = require('discord.js');

function buildFormEmbed(activeForm, assignment = null) {
	const embed = new EmbedBuilder()
		.setTitle("UWSC Form")
		.setColor(assignment ? 0x57F287 : 0x5865F2);

	if(assignment) {
		embed.setDescription('Group Filled. Meet in Embark AE1');
	} else {
		embed.setDescription('Tick up to join the run');
	}

	if(activeForm.members.size === 0) {
		embed.addFields({name: 'Signed up', value: 'None'});
	} else {
		const memberLines = [...activeForm.members.values()].map(m => {
			const roleText = m.roles.length > 0 ? m.roles.join(', ') : 'no relevant roles.. How are you here?';
			return `**${m.username}** - ${roleText}`;
		});
		embed.addFields({name: `Signed up (${activeForm.members.size})`, value: memberLines.join('\n')});
	}

	if(assignment) {
		const assignmentLines = Object.entries(assignment).map(
			([role, member]) => `**${role}**: ${member.username}`
		);
		embed.addFields({name: 'Suggested Team Layout', value: assignmentLines.join('\n')});
	}
	return embed;
}

module.exports = { buildFormEmbed };
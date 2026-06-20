const { requiredRoles } = require("./config");

function findGroupAssignment(requiredRoles, members) {
	const memberList = [...members.values()];

	const matchedRole = new Array(memberList.length).fill(-1);

	function tryAssign(roleIndex, visited) {
		const role = requiredRoles[roleIndex];
		for(let i = 0; i < memberList.length; i++) {
			if(!memberList[i].roles.includes(role) || visited[i]) continue;
			visited[i] = true;

			if(matchedRole[i] === -1 || tryAssign(matchedRole[i], visited)) {
				matchedRole[i] = roleIndex;
				return true;
			}
		}
		return false;
	}

	for(let r = 0; r < requiredRoles.length; r++) {
		const visited = new Array(memberList.length).fill(false);
		if(!tryAssign(r, visited)) {
			return null;
		}
	}

	const assignment = {};
	memberList.forEach((member, i) => {
		if(matchedRole[i] !== -1) {
			assignment[requiredRoles[matchedRole[i]]] = member;
		}
	});

	return assignment;
}

module.exports = { findGroupAssignment };
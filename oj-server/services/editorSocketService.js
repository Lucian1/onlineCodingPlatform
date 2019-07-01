var redisClient = require('../modules/redisClient');
const TIMEOUT_IN_SECONDS = 3600;

module.exports = function(io) {
	var collaborations = {};
	var socketIdToSessionId = {};

	var sessionPath = '/temp_sessions/';

	io.on('connection', (socket) => {
		//console.log(socket);
		var sessionId = socket.handshake.query['sessionId'];
		console.log(sessionId);
		
		socketIdToSessionId[socket.id] = sessionId;

		// if (!(sessionId in collaborations)) {
		// 	collaborations[sessionId] = {
		// 		'participants': []
		// 	};
		// }

		// collaborations[sessionId]['participants'].push(socket.id);

		if (sessionId in collaborations) {
			collaborations[sessionId]['participants'].push(socket.id);

			let participants = collaborations[sessionId]['participants'];
			for (i = 0; i < participants.length; i++) {
				io.to(participants[i]).emit("userChange", participants);
			}
		} else {
			redisClient.get(sessionPath + sessionId, function(data) {
				if (data) {
					console.log("session terminated previously, pulling back from redis");
					collaborations[sessionId] = {
						'cachedInstructions': JSON.parse(data),
						'participants': []
					};
				} else {
					console.log("creating new session");
					collaborations[sessionId] = {
						'cachedInstructions': [],
						'participants': []
					};
				}

				collaborations[sessionId]['participants'].push(socket.id);
				console.log(collaborations[sessionId]['participants']);

				io.to(socket.id).emit("userChange", socket.id);
			});
		}

		socket.on('change', delta => {
			console.log('change ' + socketIdToSessionId[socket.id] + ' ' + delta);
			let sessionId = socketIdToSessionId[socket.id];
			if (sessionId in collaborations) {
				collaborations[sessionId]['cachedInstructions'].push(
					["change", delta, Date.now()]);

				let participants = collaborations[sessionId]['participants'];
				for (let i = 0; i < participants.length; i++) {
					if (socket.id != participants[i]) {
						io.to(participants[i]).emit('change', delta);
					}
				}
			} else {
				console.log('warning: could not find socket id');
			}
		});

		socket.on("restoreBuffer", () => {
			let sessionId = socketIdToSessionId[socket.id];
			console.log("restore buffer for sesion: " + sessionId + ", socket: " +
				socket.id);

			if (sessionId in collaborations) {
				let instructions = collaborations[sessionId]['cachedInstructions'];

				for (let i = 0; i < instructions.length; i++) {
					socket.emit(instructions[i][0], instructions[i][1]);
				}
			} else {
				console.log("warning: could not find socket id in collaborations");
			}
		});

		socket.on('disconnect', () => {
			let sessionId = socketIdToSessionId[socket.id];
			console.log("socket " + socket.id + " disconnected from session " + 
				sessionId);
			console.log(collaborations[sessionId]['participants']);

			let foundAndRemoved = false;
			
			if (sessionId in collaborations) {
				let participants = collaborations[sessionId]['participants'];
				let index = participants.indexOf(socket.id);

				if (index >= 0) {
					participants.splice(index, 1);
					foundAndRemoved = true;

					if (participants.length == 0) {
						console.log("last participant in collaborations, committing to redis");

						let key = sessionPath + sessionId;
						let value = JSON.stringify
							(collaborations[sessionId]['cachedInstructions']);

						redisClient.set(key, value, redisClient.redisPrint);

						redisClient.expire(key, TIMEOUT_IN_SECONDS);
						delete collaborations[sessionId];
					}
				}

				for (let i = 0; i < participants.length; i++) {
					io.to(participants[i]).emit("userChange", participants);
				}
			}

			if (!foundAndRemoved) {
				console.log("warning: could not find socket id in collaborations");
			}

			console.log(collaborations);
		});
	});
}
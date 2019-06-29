/**
 * mqtt-node-benchmark
 * 
 * @author Jiri Hybek <jiri@hybek.cz>
 * @license MIT
 * @copyright 2019 Jiri Hybek
 */

const mqtt = require("mqtt");

/**
 * Publish message (Promise wrapper)
 *
 * @param {*} client 
 * @param {string} topic 
 * @param {Buffer} message 
 * @param {number} qos
 */
async function publish(client, topic, message, qos) {

	return new Promise((resolve, reject) => {

		client.publish(topic, message, {
			qos: qos
		}, (err) => {

			if (err)
				reject(err);
			else
				resolve();

		});

	});

}

/**
 * Waits for a specified time (ms)
 *
 * @param {number} timeout 
 */
async function wait(timeout) {

	return new Promise((resolve, _reject) => {

		setTimeout(resolve, timeout);

	});

}

/**
 * Starts new connection and runs a benchmark
 *
 * @param {*} params Params
 * @param {function} scriptHandler Script handler function 
 * @param {number} index Connection index
 */
async function startConnection(params, scriptHandler, index) {

	return new Promise((resolve, reject) => {

		console.log("Opening connection #%s:%d", params.threadId, index);

		const server = scriptHandler && scriptHandler.getServer ? scriptHandler.getServer(params) : params.server;

		if (!server)
			return reject(new Error("Server must be specified as a parameter or via custom script #getServer() function."));

		const client = mqtt.connect(server, {
			protocolVersion: 3
		});

		let msgSent = 0;
		let msgReceived = 0;
		let errors = 0;
		let reconnects = 0;
		let running = true;
		let wasConnected = false;
		let wasSubscribed = false;
		let start = Date.now();

		client.on("connect", async () => {
	
			console.log("Connected #%s:%d.", params.threadId, index);

			// Prevent double init
			if (wasConnected) return;

			wasConnected = true;

			client.on("error", () => {

				errors++;

			});

			client.on("reconnect", () => {

				reconnects++;

			});

			// Publish
			if (params.action === "publish") {

				while (running) {

					if (!client.connected) {
						await wait(10);
						continue;
					}

					try {
						
						const msg = scriptHandler && scriptHandler.getMessage ? scriptHandler.getMessage(params) : {
							topic: params.topic,
							payload: params.msg,
							qos: params.qos
						};

						if (!msg || !msg.topic || !msg.payload )
							throw new Error("Topic and payload must be specified as a parameter or via custom script #getMessage() function.");
						
						//console.log(String(msg));
						await publish(client, msg.topic, msg.payload instanceof Buffer ? msg.payload : new Buffer(String(msg.payload)), msg.qos || 0);

						msgSent++;
						
					} catch (err) {
				
						errors++;

						console.log(err);

					}

				}

			// Subscribe
			} else if (params.action === "subscribe") {

				const topic = scriptHandler && scriptHandler.getSubscriptionTopic ? scriptHandler.getSubscriptionTopic(params) : {
					topic: params.topic,
					qos: params.qos
				};

				if (!topic || !topic.topic)
					throw new Error("Topic and qos must be specified as a parameter or via custom script #getSubscriptionTopic() function.");

				// Subscribe to topic
				client.subscribe(topic.topic, {
					qos: topic.qos
				}, (err) => {
				
					console.log("Subscribed #%s:%d.", params.threadId, index);

					if (err)
						errors++;
					else
						wasSubscribed = true;

				})

				// Handle message event
				client.on("message", () => {

					msgReceived++;

				});

			}

			console.log("Finished #%s:%d.", params.threadId, index);
	
		});

		// Collect results after duration and close connection
		setTimeout(() => {

			running = false;

			console.log("Collecting #%s:%d", params.threadId, index);

			client.end(true, () => {

				resolve({
					msgSent: msgSent,
					msgReceived: msgReceived,
					errors: errors,
					reconnects: reconnects,
					wasConnected: wasConnected,
					wasSubscribed: wasSubscribed,
					duration: (Date.now() - start) / 1000
				});

			});

		}, params.duration * 1000)

	});

}

process.on('message', async (params) => {

	const scriptHandler = params.script ? require(params.script) : null;
	const conns = [];

	console.log("Starting thread #%s with %d connections...", params.threadId, params.connections);

	// Create connections
	for (let i = 0; i < params.connections; i++)
		conns.push( startConnection(params, scriptHandler, i) );

	// Collect results
	const results = await Promise.all(conns);

	// Aggregate results
	let msgSent = 0;
	let msgReceived = 0;
	let errors = 0;
	let reconnects = 0;
	let wasConnected = 0;
	let wasSubscribed = 0;
	let minDuration = null;
	let sumDuration = 0;
	let maxDuration = null;

	for (let i = 0; i < results.length; i++) {

		msgSent += results[i].msgSent;
		msgReceived += results[i].msgReceived
		errors += results[i].errors;
		reconnects += results[i].reconnects;
		wasConnected += results[i].wasConnected ? 1 : 0;
		wasSubscribed += results[i].wasSubscribed ? 1 : 0;
		sumDuration += results[i].duration
		minDuration = Math.min(minDuration, results[i].duration);
		maxDuration = Math.max(maxDuration, results[i].duration);

	}

	// Return results
	process.send({
		msgSent: msgSent,
		msgReceived: msgReceived,
		errors: errors,
		reconnects: reconnects,
		wasConnected: wasConnected,
		wasSubscribed: wasSubscribed,
		minDuration: minDuration,
		avgDuration: sumDuration / params.connections,
		maxDuration: maxDuration
	});

});